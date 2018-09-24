export default {
  settings: {
    background: [0.3, 0.4, 0.5],
    camera: {
      position: [-4.18382643356846, -0.0286697097775473, -3.31186570748925],
      focalPoint: [-87.2642231315141, -0.0158697432886937, 8.64262468406458],
      viewUp: [0.142391988513623, 0.022211802898924, 0.989561093323255],
    },
  },
  objects: [
    {
      file: 'UH60Pilots.vtp',
      type: 'polydata',
      frmt: 'vtp',
      transform: {
        translate: [-0.03, -0.02, -2.25],
        rotate: [0, 0, 90],
      },
      texture: {
        file: 'pilots.jpg',
        type: 'image',
        frmt: 'jpeg',
      },
    },
    {
      file: 'UH60Body.vtp',
      type: 'polydata',
      frmt: 'vtp',
      transform: {
        translate: [-0.03, -0.02, -2.25],
        rotate: [0, 0, 90],
      },
      texture: {
        file: 'fuselage.jpg',
        type: 'image',
        frmt: 'jpeg',
      },
    },
    {
      file: 'UH60Glass.vtp',
      type: 'polydata',
      frmt: 'vtp',
      transform: {
        translate: [-0.03, -0.02, -2.25],
        rotate: [0, 0, 90],
      },
      opacity: 0.25,
    },
    {
      file: 'UH60Inside.vtp',
      type: 'polydata',
      frmt: 'vtp',
      transform: {
        translate: [-0.03, -0.02, -2.25],
        rotate: [0, 0, 90],
      },
      texture: {
        file: 'pal.jpg',
        type: 'image',
        frmt: 'jpeg',
      },
    },
    {
      file: 'UH60Panel.vtp',
      type: 'polydata',
      frmt: 'vtp',
      transform: {
        translate: [-0.03, -0.02, -2.25],
        rotate: [0, 0, 90],
      },
      texture: {
        file: 'panel.jpg',
        type: 'image',
        frmt: 'jpeg',
      },
    },
    {
      file: 'rotor.vtp',
      type: 'polydata',
      frmt: 'vtp',
      transform: {
        scale: [0.5, 0.5, 0.5],
      },
      color: [0.34902, 0.32941, 0.27843],
      action: {
        type: 'twirl',
        rate: 0.25,
      },
    },
    {
      file: 'streamlines.vtp',
      type: 'polydata',
      frmt: 'vtp',
      transform: {
        scale: [0.5, 0.5, 0.5],
      },
      opacity: 0.5,
      colorBy: {
        place: 'points',
        field: 'velocity',
        range: [9.33e-3, 1.489e-1],
        palette: 'Brewer Sequential Blue-Green (9)',
      },
      action: {
        type: 'toggle',
      },
    },
  ],
};
