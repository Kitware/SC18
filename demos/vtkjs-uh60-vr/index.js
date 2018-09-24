import 'vtk.js/Sources/favicon';
import macro from 'vtk.js/Sources/macro';

import HttpDataAccessHelper from 'vtk.js/Sources/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
// import vtkURLExtract from 'vtk.js/Sources/Common/Core/URLExtract';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkTexture from 'vtk.js/Sources/Rendering/Core/Texture';
import vtkXMLPolyDataReader from 'vtk.js/Sources/IO/XML/XMLPolyDataReader';

import scene from './scene.js';

const BASE_PATH = './data/uh60/'

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
  background: [0, 0, 0],
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const camera = renderer.getActiveCamera();

// Global settings
camera.set(scene.settings.camera);
renderer.setBackground(scene.settings.background);

// Load objects
for (let i = 0; i < scene.objects.length; i++) {
  addPipelineElement(scene.objects[i]);
}

// ----------------------------------------------------------------------------

function getURL(fileName) {
  return `./data/uh60/${fileName}`;
}

// ----------------------------------------------------------------------------

function addPipelineElement(description) {
  const actor = vtkActor.newInstance();
  const mapper = vtkMapper.newInstance();
  const source = vtkXMLPolyDataReader.newInstance();

  // Setup pipeline
  actor.setMapper(mapper);
  mapper.setInputConnection(source.getOutputPort());

  // Load dataset
  source.setUrl(getURL(description.file)).then(() => {

  });

  // Apply settings
  if (description.transform) {
    actor.set(description.transform);
  }
  if (description.opacity) {
    actor.getProperty().setOpacity(description.opacity);
  }
  if (description.color) {
    actor.getProperty().setColor(description.color);
  }
  if (description.colorBy) {
    // actor.set(description.transform);
  }

  // Handle textures
  if (description.texture) {
    const image = new Image();
    image.src = getURL(description.texture.file);
    const texture = vtkTexture.newInstance({ interpolate: true });
    texture.setImage(image);
    actor.addTexture(texture);
  }
}
