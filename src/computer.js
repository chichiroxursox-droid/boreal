import * as THREE from 'three';
import gsap from 'gsap';


// ── Canvas dimensions (16:9) ──
const CANVAS_W = 1024;
const CANVAS_H = 576;

// ── Module state ──
let scene = null;
let camera = null;
let renderer = null;
let screenMesh = null;
let offCanvas = null;
let ctx = null;
let canvasTexture = null;
let active = false;
let screenPhase = 'off'; // 'off' | 'booting' | 'desktop'

// ── Monitor world position ──
const MONITOR_POS = new THREE.Vector3(-1.8, 1.1, -1.5);
// Camera ends directly in front, close enough to fill the viewport
const CAMERA_ZOOM_POS = new THREE.Vector3(-1.8, 1.1, -1.27);

// ── Folder layout (canvas pixel coordinates) ──
const FOLDER_W = 110;
const FOLDER_H = 100;
const FOLDERS = [
  { name: 'Websites', cx: 370, cy: 220, color: '#4A9EE8' },
  { name: 'Apps',     cx: 654, cy: 220, color: '#E84A8A' },
];

// ── Raycaster for screen clicks ──
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let onClickBound = null;
let onPointerMoveBound = null;

// ────────────────────────────────────────────
// Drawing helpers
// ────────────────────────────────────────────

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.arcTo(x + w, y, x + w, y + r, r);
  context.lineTo(x + w, y + h - r);
  context.arcTo(x + w, y + h, x + w - r, y + h, r);
  context.lineTo(x + r, y + h);
  context.arcTo(x, y + h, x, y + h - r, r);
  context.lineTo(x, y + r);
  context.arcTo(x, y, x + r, y, r);
  context.closePath();
}

// ── Boot screen ──

function drawBootScreen(progress) {
  ctx.fillStyle = '#080818';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Logo text — fades in quickly
  const textAlpha = Math.min(progress * 4, 1);
  ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
  ctx.font = '600 32px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ETHAN OS', CANVAS_W / 2, CANVAS_H / 2 - 30);

  // Loading bar background
  const barW = 260;
  const barH = 4;
  const barX = (CANVAS_W - barW) / 2;
  const barY = CANVAS_H / 2 + 10;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, barX, barY, barW, barH, 2);
  ctx.fill();

  // Loading bar fill — gradient
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, '#4A9EE8');
  fillGrad.addColorStop(1, '#9B59B6');
  ctx.fillStyle = fillGrad;
  roundRect(ctx, barX, barY, barW * progress, barH, 2);
  ctx.fill();

  // Status text
  if (progress > 0.3) {
    const statusAlpha = Math.min((progress - 0.3) * 2, 0.5);
    ctx.fillStyle = `rgba(255, 255, 255, ${statusAlpha})`;
    ctx.font = '300 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('loading desktop...', CANVAS_W / 2, CANVAS_H / 2 + 40);
  }

  canvasTexture.needsUpdate = true;
}

// ── Desktop ──

function drawDesktopBg() {
  const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  grad.addColorStop(0, '#1a1a3e');
  grad.addColorStop(0.5, '#2d1b4e');
  grad.addColorStop(1, '#1a2a4e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle dot grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let gx = 20; gx < CANVAS_W; gx += 40) {
    for (let gy = 20; gy < CANVAS_H - 40; gy += 40) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTaskbar() {
  const barY = CANVAS_H - 56;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, barY, CANVAS_W, 36);

  // Top separator
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, barY, CANVAS_W, 1);

  // Clock
  const now = new Date();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '300 13px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    CANVAS_W - 16,
    barY + 18,
  );

  // Start label
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('Ethan Desktop', 16, barY + 18);
}

function drawFolderIcon(folder, highlighted) {
  const x = folder.cx - FOLDER_W / 2;
  const y = folder.cy - FOLDER_H / 2;
  const iconW = 64;
  const iconH = 50;
  const iconX = folder.cx - iconW / 2;
  const iconY = y + 5;

  // Selection highlight behind folder
  if (highlighted) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, x, y, FOLDER_W, FOLDER_H, 8);
    ctx.fill();
  }

  // Folder tab
  ctx.fillStyle = folder.color;
  ctx.beginPath();
  ctx.moveTo(iconX + 4, iconY + 14);
  ctx.lineTo(iconX + 4, iconY + 4);
  ctx.quadraticCurveTo(iconX + 4, iconY, iconX + 8, iconY);
  ctx.lineTo(iconX + 24, iconY);
  ctx.lineTo(iconX + 28, iconY + 8);
  ctx.lineTo(iconX + 28, iconY + 14);
  ctx.closePath();
  ctx.fill();

  // Folder body
  ctx.fillStyle = folder.color;
  roundRect(ctx, iconX, iconY + 14, iconW, iconH - 14, 5);
  ctx.fill();

  // Highlight stripe at top of body
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(iconX + 4, iconY + 16, iconW - 8, 2);

  // Label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '400 13px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(folder.name, folder.cx, y + FOLDER_H - 18);
}

function drawDesktop(highlightedFolder) {
  drawDesktopBg();
  drawTaskbar();
  for (const folder of FOLDERS) {
    drawFolderIcon(folder, folder === highlightedFolder);
  }
  canvasTexture.needsUpdate = true;
}

// ────────────────────────────────────────────
// Screen interaction (raycaster → UV → canvas hit test)
// ────────────────────────────────────────────

function screenUV(event) {
  if (!screenMesh) return null;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(screenMesh);

  if (intersects.length > 0 && intersects[0].uv) {
    const uv = intersects[0].uv;
    return { x: uv.x * CANVAS_W, y: (1 - uv.y) * CANVAS_H };
  }
  return null;
}

function hitTestFolders(cx, cy) {
  for (const folder of FOLDERS) {
    const fx = folder.cx - FOLDER_W / 2;
    const fy = folder.cy - FOLDER_H / 2;
    if (cx >= fx && cx <= fx + FOLDER_W && cy >= fy && cy <= fy + FOLDER_H) {
      return folder;
    }
  }
  return null;
}

function onScreenClick(event) {
  if (!active || screenPhase !== 'desktop') return;

  const hit = screenUV(event);
  if (!hit) return;

  const folder = hitTestFolders(hit.x, hit.y);
  if (folder) {
    // Brief highlight feedback
    drawDesktop(folder);
    setTimeout(() => drawDesktop(), 400);
    console.log(`Folder clicked: ${folder.name}`);
  }
}

function onScreenPointerMove(event) {
  if (!active || screenPhase !== 'desktop') return;

  const hit = screenUV(event);
  if (hit) {
    const folder = hitTestFolders(hit.x, hit.y);
    renderer.domElement.style.cursor = folder ? 'pointer' : 'default';
  } else {
    renderer.domElement.style.cursor = 'default';
  }
}

// ────────────────────────────────────────────
// Boot sequence
// ────────────────────────────────────────────

function startBoot() {
  screenPhase = 'booting';

  const proxy = { p: 0 };
  gsap.to(proxy, {
    p: 1,
    duration: 1.8,
    ease: 'power1.in',
    onUpdate: () => drawBootScreen(proxy.p),
    onComplete: () => {
      // Brief white flash then desktop
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      canvasTexture.needsUpdate = true;

      setTimeout(() => {
        screenPhase = 'desktop';
        drawDesktop();
      }, 120);
    },
  });
}

// ────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────

export function initComputer(sceneRef, cameraRef, rendererRef) {
  scene = sceneRef;
  camera = cameraRef;
  renderer = rendererRef;

  // Find MonitorScreen mesh
  scene.traverse((child) => {
    if (child.isMesh && child.name === 'MonitorScreen') {
      screenMesh = child;
    }
  });

  if (!screenMesh) {
    console.warn('MonitorScreen mesh not found');
    return;
  }

  // Replace box geometry with a plane for clean 0-1 UVs
  screenMesh.geometry.computeBoundingBox();
  const origBB = screenMesh.geometry.boundingBox;
  const origCenter = new THREE.Vector3();
  origBB.getCenter(origCenter);
  const screenFrontZ = origBB.min.z - 0.002;

  screenMesh.geometry.dispose();
  const plane = new THREE.PlaneGeometry(0.46, 0.26);
  plane.rotateY(Math.PI);
  plane.translate(origCenter.x, origCenter.y, screenFrontZ);
  screenMesh.geometry = plane;

  // Offscreen canvas + texture
  offCanvas = document.createElement('canvas');
  offCanvas.width = CANVAS_W;
  offCanvas.height = CANVAS_H;
  ctx = offCanvas.getContext('2d');

  canvasTexture = new THREE.CanvasTexture(offCanvas);
  canvasTexture.colorSpace = THREE.SRGBColorSpace;

  screenMesh.material = new THREE.MeshBasicMaterial({ map: canvasTexture });

  // Initial: screen off (dark)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  canvasTexture.needsUpdate = true;

  // Bind handlers
  onClickBound = onScreenClick;
  onPointerMoveBound = onScreenPointerMove;

  console.log('Computer module initialized');
}

export function enterComputer(cam) {
  active = true;

  // Activate screen interaction
  renderer.domElement.addEventListener('click', onClickBound);
  renderer.domElement.addEventListener('pointermove', onPointerMoveBound);

  const tl = gsap.timeline();

  // Phase 1: Camera zooms into the monitor
  tl.to(cam.position, {
    x: CAMERA_ZOOM_POS.x,
    y: CAMERA_ZOOM_POS.y,
    z: CAMERA_ZOOM_POS.z,
    duration: 1.2,
    ease: 'power2.inOut',
    onUpdate: () => cam.lookAt(MONITOR_POS),
  });

  // Phase 2: Boot animation after camera settles
  tl.call(() => startBoot(), null, '+=0.1');

  return tl;
}

export function exitComputer(cam, targetPos, targetLook) {
  active = false;
  screenPhase = 'off';

  // Remove interaction
  renderer.domElement.removeEventListener('click', onClickBound);
  renderer.domElement.removeEventListener('pointermove', onPointerMoveBound);
  renderer.domElement.style.cursor = 'default';

  // Screen off
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  canvasTexture.needsUpdate = true;

  // Camera return
  const tl = gsap.timeline();
  const lookProxy = { x: MONITOR_POS.x, y: MONITOR_POS.y, z: MONITOR_POS.z };

  tl.to(cam.position, {
    x: targetPos.x, y: targetPos.y, z: targetPos.z,
    duration: 1.5, ease: 'power2.inOut',
    onUpdate: () => cam.lookAt(lookProxy.x, lookProxy.y, lookProxy.z),
  }, 0);

  tl.to(lookProxy, {
    x: targetLook.x, y: targetLook.y, z: targetLook.z,
    duration: 1.5, ease: 'power2.inOut',
  }, 0);

  return tl;
}
