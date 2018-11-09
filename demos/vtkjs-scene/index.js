import 'vtk.js/Sources/favicon';

import HttpDataAccessHelper from 'vtk.js/Sources/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import macro from 'vtk.js/Sources/macro';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkTexture from 'vtk.js/Sources/Rendering/Core/Texture';
import vtkURLExtract from 'vtk.js/Sources/Common/Core/URLExtract';
import vtkXMLPolyDataReader from 'vtk.js/Sources/IO/XML/XMLPolyDataReader';

import vtkDeviceOrientationToCamera from 'vtk.js/Sources/Interaction/Misc/DeviceOrientationToCamera';
import vtkForwardPass from 'vtk.js/Sources/Rendering/OpenGL/ForwardPass';
import vtkRadialDistortionPass from 'vtk.js/Sources/Rendering/OpenGL/RadialDistortionPass';

import {
  ColorMode,
  ScalarMode,
} from 'vtk.js/Sources/Rendering/Core/Mapper/Constants';

// ----------------------------------------------------------------------------
// python -m SimpleHTTPServer 8000
// http://localhost:8000/website/vr-vtk-js/?data=/data/uh60
// ----------------------------------------------------------------------------

const userParams = vtkURLExtract.extractURLParameters();

// const cameraViewAngle = userParams.viewAngle || 100;
const enableVR = !!userParams.vr;
const eyeSpacing = userParams.eye || 0.0;
const disableTouchNext = userParams.disableTouch || false;
const distk1 = userParams.k1 || 0.2;
const distk2 = userParams.k2 || 0.0;
const cameraCenterY = userParams.centerY || 0.0;
const dataPath = userParams.data || '/SC18/uh60';
let cameraHandle = null;

const body = document.querySelector('body');
let fullScreenMetod = null;

['requestFullscreen', 'msRequestFullscreen', 'webkitRequestFullscreen'].forEach(
  (m) => {
    if (body[m] && !fullScreenMetod) {
      fullScreenMetod = m;
    }
  }
);

let objectToLoadCount = 0;
const actions = [];

// ----------------------------------------------------------------------------

function addPipelineElement(description, addActorToView, resetCamera, getURL) {
  console.log(description.file);
  const actor = vtkActor.newInstance();
  const mapper = vtkMapper.newInstance();
  const source = vtkXMLPolyDataReader.newInstance();

  // Setup pipeline
  actor.setMapper(mapper);
  mapper.setInputConnection(source.getOutputPort());

  // Load dataset
  source.setUrl(getURL(description.file)).then(() => {
    console.log('=> add data', description.file);
    addActorToView(actor);
    resetCamera();
    objectToLoadCount--;

    // Register all actions at once
    if (objectToLoadCount === 0) {
      while (actions.length) {
        setInterval(...actions.pop());
      }
    }
  });

  // Apply settings
  if (description.transform) {
    const { position, scale, rotation } = description.transform;
    if (position) {
      actor.setPosition(...position);
    }
    if (scale) {
      actor.setScale(...scale);
    }
    if (rotation) {
      actor.rotateX(rotation[0]);
      actor.rotateY(rotation[1]);
      actor.rotateZ(rotation[2]);
    }
  }
  if (description.opacity) {
    actor.getProperty().setOpacity(description.opacity);
  }
  if (description.color) {
    actor.getProperty().setColor(...description.color);
  }
  if (description.props) {
    actor.getProperty().set(description.props);
  }
  if (description.colorBy) {
    const scalarMode = ScalarMode.USE_POINT_FIELD_DATA;
    const colorMode = ColorMode.MAP_SCALARS;
    const colorByArrayName = description.colorBy.field;
    const lookupTable = vtkColorTransferFunction.newInstance();
    const preset = vtkColorMaps.getPresetByName(description.colorBy.palette);
    lookupTable.applyColorMap(preset);
    lookupTable.setMappingRange(...description.colorBy.range);
    lookupTable.updateRange();

    mapper.set({
      colorByArrayName,
      colorMode,
      interpolateScalarsBeforeMapping: true,
      lookupTable,
      scalarMode,
      scalarVisibility: true,
      useLookupTableScalarRange: true,
    });
  }

  // Handle textures
  if (description.texture) {
    const image = new Image();
    image.src = getURL(description.texture.file);
    const texture = vtkTexture.newInstance({ interpolate: true });
    texture.setImage(image);
    actor.addTexture(texture);
  }

  // Handle actions
  if (description.action && description.action.type === 'twirl') {
    const rot = description.action.rotation;
    actions.push([
      () => {
        actor.rotateX(rot[0]);
        actor.rotateY(rot[1]);
        actor.rotateZ(rot[2]);
      },
      description.action.rate,
    ]);
  }
}

// ----------------------------------------------------------------------------
let currentCameraPositionIndex = 0;
const displacementQueue = [];
const focalPointQueue = [];

function moveToNextPosition(nbSteps = 100) {
  currentCameraPositionIndex =
    (currentCameraPositionIndex + 1) % cameraHandle.cameraPositions.length;
  const previousPosition = cameraHandle.camera.getPosition();
  const nextPosition = cameraHandle.cameraPositions[currentCameraPositionIndex];
  console.log(currentCameraPositionIndex);
  const delta = [
    (nextPosition[0] - previousPosition[0]) / nbSteps,
    (nextPosition[1] - previousPosition[1]) / nbSteps,
    (nextPosition[2] - previousPosition[2]) / nbSteps,
  ];
  const previousFP = cameraHandle.camera.getFocalPoint();
  const nextFP = [
    nextPosition[0] +
      cameraHandle.cameraDirections[currentCameraPositionIndex][0],
    nextPosition[1] +
      cameraHandle.cameraDirections[currentCameraPositionIndex][1],
    nextPosition[2] +
      cameraHandle.cameraDirections[currentCameraPositionIndex][2],
  ];
  const deltaFp = [
    (nextFP[0] - previousFP[0]) / nbSteps,
    (nextFP[1] - previousFP[1]) / nbSteps,
    (nextFP[2] - previousFP[2]) / nbSteps,
  ];
  for (let i = 0; i < nbSteps; i++) {
    displacementQueue.push(delta);
    focalPointQueue.push(deltaFp);
  }
}

// ----------------------------------------------------------------------------

function animateCamera() {
  if (displacementQueue.length) {
    const delta = displacementQueue.shift();
    const deltaFp = focalPointQueue.shift();
    const focalPoint = cameraHandle.camera.getFocalPoint();
    const position = cameraHandle.camera.getPosition();
    cameraHandle.camera.setFocalPoint(
      focalPoint[0] + deltaFp[0],
      focalPoint[1] + deltaFp[1],
      focalPoint[2] + deltaFp[2]
    );
    cameraHandle.camera.setPosition(
      position[0] + delta[0],
      position[1] + delta[1],
      position[2] + delta[2]
    );
    cameraHandle.updateCameraCallBack();
  }
}

// ----------------------------------------------------------------------------
// Global settings
// ----------------------------------------------------------------------------

function loadScene(scene, basePath) {
  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    background: scene.settings.background,
  });
  const renderWindow = fullScreenRenderer.getRenderWindow();
  const interactor = renderWindow.getInteractor();
  const mainRenderer = fullScreenRenderer.getRenderer();
  let leftRenderer = null;
  let rightRenderer = null;

  // Initial value when only 1 renderer
  let camera = mainRenderer.getActiveCamera();
  let addActorToView = mainRenderer.addActor;
  let updateCameraCallBack = mainRenderer.resetCameraClippingRange;

  const cameraPositions = scene.cameraPositions;
  const cameraDirections = scene.cameraDirections;

  function resetCamera() {
    if (leftRenderer) {
      leftRenderer.resetCamera();
      rightRenderer.resetCamera();
    } else {
      mainRenderer.resetCamera();
    }
  }

  function getURL(fileName) {
    return `${basePath}/${fileName}`;
  }

  const cameraConfiguration = Object.assign(
    {
      physicalViewNorth: [
        scene.settings.camera.focalPoint[0] - scene.settings.camera.position[0],
        scene.settings.camera.focalPoint[1] - scene.settings.camera.position[1],
        scene.settings.camera.focalPoint[2] - scene.settings.camera.position[2],
      ],
      physicalViewUp: scene.settings.camera.viewUp,
    },
    scene.settings.camera
  );

  if (enableVR && vtkDeviceOrientationToCamera.isDeviceOrientationSupported()) {
    leftRenderer = vtkRenderer.newInstance({
      background: scene.settings.background,
    });
    rightRenderer = vtkRenderer.newInstance({
      background: scene.settings.background,
    });
    addActorToView = (a) => {
      console.log('add both actors');
      leftRenderer.addActor(a);
      const rActor = vtkActor.newInstance();
      rActor.setMapper(a.getMapper());
      rActor.setProperty(a.getProperty());
      rightRenderer.addActor(a);
    };

    // Configure left/right renderers
    leftRenderer.setViewport(0, 0, 0.5, 1);
    const leftCamera = leftRenderer.getActiveCamera();
    leftCamera.set(cameraConfiguration);
    leftCamera.setWindowCenter(-eyeSpacing, -cameraCenterY);

    rightRenderer.setViewport(0.5, 0, 1, 1);
    const rightCamera = rightRenderer.getActiveCamera();
    rightCamera.set(cameraConfiguration);
    rightCamera.setWindowCenter(eyeSpacing, -cameraCenterY);

    // Provide custom update callback + fake camera
    updateCameraCallBack = () => {
      leftRenderer.resetCameraClippingRange();
      rightRenderer.resetCameraClippingRange();
    };
    camera = {
      getPosition: leftCamera.getPosition,
      setPosition: macro.chain(leftCamera.setPosition, rightCamera.setPosition),
      getFocalPoint: leftCamera.getFocalPoint,
      setFocalPoint: macro.chain(
        leftCamera.setFocalPoint,
        rightCamera.setFocalPoint
      ),
      setDeviceAngles(alpha, beta, gamma, screen) {
        leftCamera.setDeviceAngles(alpha, beta, gamma, screen);
        rightCamera.setDeviceAngles(alpha, beta, gamma, screen);
      },
    };

    // Reconfigure render window
    renderWindow.addRenderer(leftRenderer);
    renderWindow.addRenderer(rightRenderer);
    renderWindow.removeRenderer(mainRenderer);

    const distPass = vtkRadialDistortionPass.newInstance();
    distPass.setK1(distk1);
    distPass.setK2(distk2);
    distPass.setCameraCenterY(cameraCenterY);
    distPass.setCameraCenterX1(-eyeSpacing);
    distPass.setCameraCenterX2(eyeSpacing);
    distPass.setDelegates([vtkForwardPass.newInstance()]);
    fullScreenRenderer.getOpenGLRenderWindow().setRenderPasses([distPass]);

    // Remove window interactions
    interactor.unbindEvents();

    // Attach touch control
    if (!disableTouchNext) {
      fullScreenRenderer
        .getRootContainer()
        .addEventListener('touchstart', () => moveToNextPosition(), true);
      if (fullScreenMetod) {
        fullScreenRenderer.getRootContainer().addEventListener(
          'touchend',
          (e) => {
            body[fullScreenMetod]();
          },
          true
        );
      }
    }

    // Warning if browser does not support fullscreen
    /* eslint-disable */
    if (navigator.userAgent.match('CriOS')) {
      alert(
        'Chrome on iOS does not support fullscreen. Please use Safari instead.'
      );
    }
    if (navigator.userAgent.match('FxiOS')) {
      alert(
        'Firefox on iOS does not support fullscreen. Please use Safari instead.'
      );
    }
    /* eslint-enable */
  } else {
    camera.set(cameraConfiguration);

    // add vr option button if supported
    fullScreenRenderer.getOpenGLRenderWindow().onHaveVRDisplay(() => {
      if (
        fullScreenRenderer.getOpenGLRenderWindow().getVrDisplay().capabilities
          .canPresent
      ) {
        const button = document.createElement('button');
        button.style.position = 'absolute';
        button.style.left = '10px';
        button.style.bottom = '10px';
        button.style.zIndex = 10000;
        button.textContent = 'Send To VR';
        document.querySelector('body').appendChild(button);
        button.addEventListener('click', () => {
          if (button.textContent === 'Send To VR') {
            fullScreenRenderer.getOpenGLRenderWindow().startVR();
            button.textContent = 'Return From VR';
          } else {
            fullScreenRenderer.getOpenGLRenderWindow().stopVR();
            button.textContent = 'Send To VR';
          }
        });
      }
    });
  }

  // Update camera control
  if (vtkDeviceOrientationToCamera.isDeviceOrientationSupported()) {
    vtkDeviceOrientationToCamera.addWindowListeners();
    vtkDeviceOrientationToCamera.addCameraToSynchronize(
      interactor,
      camera,
      updateCameraCallBack
    );
  }
  // --------------
  // Load objects
  // --------------

  objectToLoadCount = scene.objects.length;
  for (let i = 0; i < scene.objects.length; i++) {
    addPipelineElement(scene.objects[i], addActorToView, resetCamera, getURL);
  }

  const me = {};
  interactor.requestAnimation(me);

  if (cameraPositions.length) {
    setInterval(moveToNextPosition, 15000);
    setInterval(animateCamera, 30);
  }

  return { camera, cameraPositions, cameraDirections, updateCameraCallBack };
}

if (dataPath) {
  console.log(`${dataPath}/scene.json`);
  HttpDataAccessHelper.fetchJSON({}, `${dataPath}/scene.json`)
    .then((scene) => {
      console.log('scene', scene);
      cameraHandle = loadScene(scene, dataPath);
    })
    .catch(console.error);
} else {
  alert(
    'This application require a "?data=/url" argument so it can load it scene.json descriptor'
  );
}
