import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── Interactive object definitions ──
const INTERACTIVE = {
  // Existing room objects (rewritten in Ethan's voice)
  'Basketball': "Co-captain, baby. Tore my MCL junior year and still came back. Basketball taught me more about who I am than any class ever did.",
  'Bookshelf': "Half sci-fi, half self-improvement. I'll finish a book on AI ethics and then pick up Dune for the third time. No shame.",
  'Desk': "CULTIVaITE, ClassBot, PromptCraft, The Lamppost — all started right here. This desk has seen a lot of late nights and a lot of breakthroughs.",
  'FloorLamp': "This thing's been on at 2am more times than I can count. Debugging hits different when the whole house is quiet.",
  'CoffeeTable': "Covered in sketchbooks and snack wrappers. Half my best ideas started as doodles on this table.",

  // New room objects
  'Piano': "Been playing since I was a kid. When code isn't working and my brain's fried, I sit down and play. Clears everything out.",
  'DogBed': "Honey. My pit bull mix. She's usually right here sleeping while I work. Best coding partner I've ever had.",
  'Cross': "My faith keeps me grounded. Everything I do — the coding, the mentoring, the basketball — it all comes back to something bigger than me.",
  'Microphone': "This is a Humanium microphone — made from melted-down illegal guns. I co-lead the Reforge Project. Check it out → reforgeproject.org",
  'Controller': "Video games are my reset button. After a long day of school and practice, sometimes you just gotta zone out for a bit.",
};

// ── Module state ──
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let enabled = false;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// ── Hover glow ──
let hoveredObject = null;
let originalEmissive = null;
let originalEmissiveIntensity = 0;

// ── Tooltip ──
let tooltipTimer = null;
const tooltipEl = () => document.getElementById('tooltip');

// ── Bound handlers (for clean removal) ──
let onPointerMoveBound = null;
let onClickBound = null;

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function findInteractiveName(object) {
  let current = object;
  while (current) {
    if (current.name && current.name in INTERACTIVE) {
      return current.name;
    }
    current = current.parent;
  }
  return null;
}

let meshCache = [];

function rebuildMeshCache() {
  meshCache = [];
  scene.traverse((child) => {
    if (child.isMesh) {
      meshCache.push(child);
    }
  });
}

// ────────────────────────────────────────
// Hover glow
// ────────────────────────────────────────

function clearHover() {
  if (hoveredObject && hoveredObject.material) {
    hoveredObject.material.emissive.copy(originalEmissive);
    hoveredObject.material.emissiveIntensity = originalEmissiveIntensity;
  }
  hoveredObject = null;
  originalEmissive = null;
  originalEmissiveIntensity = 0;
  renderer.domElement.style.cursor = 'default';
}

function applyHover(mesh) {
  if (mesh === hoveredObject) return;
  clearHover();

  hoveredObject = mesh;
  if (mesh.material && mesh.material.emissive) {
    originalEmissive = mesh.material.emissive.clone();
    originalEmissiveIntensity = mesh.material.emissiveIntensity;
    mesh.material.emissive.set(0x666666);
    mesh.material.emissiveIntensity = 0.6;
  }
  renderer.domElement.style.cursor = 'pointer';
}

// ────────────────────────────────────────
// Tooltip
// ────────────────────────────────────────

function showTooltip(text, clientX, clientY) {
  const tip = tooltipEl();
  if (!tip) return;

  tip.textContent = text;
  tip.style.display = 'block';

  const offsetX = 16;
  const offsetY = -8;
  let x = clientX + offsetX;
  let y = clientY + offsetY;

  const maxX = window.innerWidth - 270;
  const maxY = window.innerHeight - 60;
  if (x > maxX) x = clientX - 270;
  if (y > maxY) y = maxY;
  if (y < 10) y = 10;

  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;

  if (tooltipTimer) clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(() => hideTooltip(), 3000);
}

function hideTooltip() {
  const tip = tooltipEl();
  if (tip) tip.style.display = 'none';
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
}

// ────────────────────────────────────────
// Event handlers
// ────────────────────────────────────────

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(meshCache, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const name = findInteractiveName(hit);
    if (name) {
      applyHover(hit);
      return;
    }
  }

  clearHover();
}

function onClick(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(meshCache, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const name = findInteractiveName(hit);
    if (name) {
      showTooltip(INTERACTIVE[name], event.clientX, event.clientY);
      return;
    }
  }

  hideTooltip();
}

// ────────────────────────────────────────
// Public API
// ────────────────────────────────────────

export function initExplore(sceneRef, cameraRef, rendererRef) {
  scene = sceneRef;
  camera = cameraRef;
  renderer = rendererRef;

  onPointerMoveBound = onPointerMove.bind(null);
  onClickBound = onClick.bind(null);

  // Create OrbitControls but keep disabled until explore mode
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;

  // Room-appropriate constraints
  controls.target.set(-0.5, 1.0, -1.2);  // center of room
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.5;
  controls.enableZoom = true;
  controls.minDistance = 0.5;
  controls.maxDistance = 3.5;
  controls.enablePan = false;           // no panning — just rotate and zoom
  controls.minPolarAngle = Math.PI * 0.3;   // don't go below floor
  controls.maxPolarAngle = Math.PI * 0.6;   // don't go above ceiling
  controls.minAzimuthAngle = -Math.PI * 0.6; // limit left rotation
  controls.maxAzimuthAngle = Math.PI * 0.6;  // limit right rotation — stay inside room
  controls.autoRotate = false;
}

export function enableExplore() {
  if (!controls) return;

  enabled = true;
  controls.enabled = true;

  // Reset target to room center
  controls.target.set(-0.5, 1.0, -1.2);
  controls.update();

  rebuildMeshCache();

  renderer.domElement.addEventListener('pointermove', onPointerMoveBound);
  renderer.domElement.addEventListener('click', onClickBound);
}

export function disableExplore() {
  if (!controls) return;

  enabled = false;
  controls.enabled = false;

  renderer.domElement.removeEventListener('pointermove', onPointerMoveBound);
  renderer.domElement.removeEventListener('click', onClickBound);

  clearHover();
  hideTooltip();
  meshCache = [];
}

export function updateExplore() {
  if (!enabled || !controls) return;
  controls.update();
}
