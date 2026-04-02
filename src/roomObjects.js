import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const OBJECTS = [
  {
    name: 'Piano',
    path: '/models/piano.glb',
    position: [1.2, 0.0, -2.0],
    scale: [0.7, 0.7, 0.7],
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    name: 'DogBed',
    path: '/models/dogbed.glb',
    position: [0.5, 0.0, -0.5],
    scale: [0.6, 0.6, 0.6],
    rotation: [0, 0.3, 0],
  },
  {
    name: 'Cross',
    path: '/models/cross.glb',
    position: [-1.0, 1.8, -2.5],
    scale: [1.5, 1.5, 1.5],
    rotation: [0, 0, 0],
  },
  {
    name: 'Microphone',
    path: '/models/microphone.glb',
    position: [-1.5, 1.15, -0.8],
    scale: [0.8, 0.8, 0.8],
    rotation: [0, 0.5, 0],
  },
  {
    name: 'Controller',
    path: '/models/controller.glb',
    position: [-0.8, 0.45, -0.9],
    scale: [1.0, 1.0, 1.0],
    rotation: [0, 0.8, 0],
  },
];

export async function addRoomObjects(scene) {
  const loader = new GLTFLoader();

  const promises = OBJECTS.map(async (obj) => {
    try {
      const gltf = await loader.loadAsync(obj.path);
      const group = gltf.scene;

      group.name = obj.name;
      group.position.set(...obj.position);
      group.scale.set(...obj.scale);
      group.rotation.set(...obj.rotation);

      group.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(group);
      console.log(`Loaded room object: ${obj.name}`);
    } catch (err) {
      console.error(`Failed to load ${obj.name}:`, err);
    }
  });

  await Promise.all(promises);
}
