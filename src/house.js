import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let doorMesh = null;
let interiorLight = null;
let lampLight = null;
let monitorLight = null;

export async function initHouse(scene) {
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync('/models/house.glb');
    const houseGroup = gltf.scene;

    // Rotate 180° so front door faces +Z (toward camera)
    houseGroup.rotation.y = Math.PI;
    // Lift slightly above terrain to prevent z-fighting on the floor
    houseGroup.position.y = 0.02;

    houseGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Prevent z-fighting on co-planar faces inside the model
        child.material = child.material.clone();
        child.material.polygonOffset = true;
        child.material.polygonOffsetFactor = 1;
        child.material.polygonOffsetUnits = 1;
      }
      if (child.name === 'Door') {
        doorMesh = child;
      }
    });

    scene.add(houseGroup);
    console.log('House loaded, door found:', !!doorMesh);
  } catch (err) {
    console.error('Failed to load house model:', err);
  }

  return { update };
}

export function update(progress) {
  // Door opens between progress 0.72 and 0.80 (right at the doorstep)
  if (doorMesh) {
    if (progress >= 0.72) {
      const doorProgress = Math.min((progress - 0.72) / 0.08, 1.0);
      doorMesh.rotation.y = (-Math.PI / 2) * doorProgress;
    } else {
      doorMesh.rotation.y = 0;
    }
  }
}
