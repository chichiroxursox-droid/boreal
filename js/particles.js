/* ============================================================
   BOREAL — particles.js
   Three.js overlay canvas — scroll-driven particle systems
   ============================================================ */

(function () {
  /* ---- Scene Setup ---- */
  const canvas   = document.getElementById('particles');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // transparent bg

  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -window.innerWidth  / 2,
     window.innerWidth  / 2,
     window.innerHeight / 2,
    -window.innerHeight / 2,
    -1000, 1000
  );
  camera.position.z = 1;

  /* ---- Resize ---- */
  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.left   = -window.innerWidth  / 2;
    camera.right  =  window.innerWidth  / 2;
    camera.top    =  window.innerHeight / 2;
    camera.bottom = -window.innerHeight / 2;
    camera.updateProjectionMatrix();

    // Rebuild particle positions to fill new viewport
    rebuildIceDust();
  }
  window.addEventListener('resize', onResize);

  /* ============================================================
     PARTICLE SYSTEM 1 — Ice Dust (Chapters 1–2, Stillness → Emergence)
     Slow, gently drifting particles. Always present at low opacity.
  ============================================================ */
  const ICE_COUNT  = 1800;
  const iceDustGeo = new THREE.BufferGeometry();
  let iceDustMat, iceDustPoints;
  let iceDustVelocities = [];
  let iceDustPositions;

  function rebuildIceDust() {
    iceDustPositions  = new Float32Array(ICE_COUNT * 3);
    iceDustVelocities = [];

    for (let i = 0; i < ICE_COUNT; i++) {
      iceDustPositions[i * 3]     = (Math.random() - 0.5) * window.innerWidth  * 1.4;
      iceDustPositions[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight * 1.4;
      iceDustPositions[i * 3 + 2] = 0;
      iceDustVelocities.push({
        x: (Math.random() - 0.5) * 0.12,
        y: (Math.random() - 0.5) * 0.12 - 0.04, // slight downward drift
      });
    }

    iceDustGeo.setAttribute('position', new THREE.BufferAttribute(iceDustPositions, 3));
  }

  rebuildIceDust();

  iceDustMat = new THREE.PointsMaterial({
    color: 0xaaffdd,
    size: 1.2,
    transparent: true,
    opacity: 0,
    sizeAttenuation: false,
    depthWrite: false,
  });

  iceDustPoints = new THREE.Points(iceDustGeo, iceDustMat);
  scene.add(iceDustPoints);

  /* ============================================================
     PARTICLE SYSTEM 2 — Aurora Ribbon Arcs (Chapter 2, Emergence)
     Glowing arc-shaped ribbon particles using tube segments.
  ============================================================ */
  const ribbonGroup = new THREE.Group();
  scene.add(ribbonGroup);

  function createRibbonArc(color, yOffset, arcHeight, opacity) {
    const points = [];
    const segments = 80;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (t - 0.5) * window.innerWidth * 1.3;
      const y = yOffset + Math.sin(t * Math.PI) * arcHeight + (Math.random() - 0.5) * 20;
      points.push(new THREE.Vector3(x, y, 0));
    }

    const curve   = new THREE.CatmullRomCurve3(points);
    const geo     = new THREE.TubeGeometry(curve, 80, 1.2, 4, false);
    const mat     = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    return new THREE.Mesh(geo, mat);
  }

  // Build 4 aurora ribbons of different colors and heights
  const ribbonMeshes = [];
  function buildRibbons() {
    ribbonGroup.clear();
    ribbonMeshes.length = 0;

    const ribbonDefs = [
      { color: 0x00ff9d, yOffset: window.innerHeight * 0.05,  arcHeight: 90,  opacity: 0 },
      { color: 0x66ffbb, yOffset: window.innerHeight * 0.15,  arcHeight: 120, opacity: 0 },
      { color: 0x8855ff, yOffset: -window.innerHeight * 0.10, arcHeight: 70,  opacity: 0 },
      { color: 0x44c8f0, yOffset: window.innerHeight * 0.25,  arcHeight: 100, opacity: 0 },
    ];

    ribbonDefs.forEach((def) => {
      const mesh = createRibbonArc(def.color, def.yOffset, def.arcHeight, def.opacity);
      ribbonGroup.add(mesh);
      ribbonMeshes.push(mesh);
    });
  }

  buildRibbons();

  /* ============================================================
     PARTICLE SYSTEM 3 — Magnetic Field Lines (Chapter 4, Ascent)
     Arcing lines in blue/violet suggesting Earth's magnetosphere.
  ============================================================ */
  const fieldGroup = new THREE.Group();
  scene.add(fieldGroup);

  function buildFieldLines() {
    fieldGroup.clear();

    const lineDefs = [
      { color: 0x44c8f0, width: 0.75, arcH: 240 },
      { color: 0x8855ff, width: 0.75, arcH: 320 },
      { color: 0x6699cc, width: 0.5,  arcH: 180 },
      { color: 0x44c8f0, width: 0.5,  arcH: 400 },
    ];

    lineDefs.forEach((def, i) => {
      const points = [];
      const segments = 60;
      const xSpread = window.innerWidth * 0.6;
      const xOffset = (i - 1.5) * xSpread * 0.3;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = xOffset + (t - 0.5) * window.innerWidth * 0.8;
        const y = Math.sin(t * Math.PI) * def.arcH - window.innerHeight * 0.2;
        points.push(new THREE.Vector3(x, y, 0));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const geo   = new THREE.TubeGeometry(curve, 60, def.width, 4, false);
      const mat   = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      fieldGroup.add(mesh);
    });
  }

  buildFieldLines();

  /* ============================================================
     PARTICLE SYSTEM 4 — Solar Wind Streaks (Chapter 5, The Source)
     Fast horizontal particle streaks, warm orange/gold.
  ============================================================ */
  const SOLAR_COUNT  = 600;
  const solarGeo     = new THREE.BufferGeometry();
  const solarMat     = new THREE.PointsMaterial({
    color: 0xff9944,
    size: 2.5,
    transparent: true,
    opacity: 0,
    sizeAttenuation: false,
    depthWrite: false,
  });
  const solarPoints  = new THREE.Points(solarGeo, solarMat);
  scene.add(solarPoints);

  const solarPos = new Float32Array(SOLAR_COUNT * 3);
  const solarVel = [];

  for (let i = 0; i < SOLAR_COUNT; i++) {
    solarPos[i * 3]     = (Math.random() - 0.5) * window.innerWidth  * 2;
    solarPos[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight;
    solarPos[i * 3 + 2] = 0;
    solarVel.push({ x: -(1.5 + Math.random() * 3.0), y: (Math.random() - 0.5) * 0.3 });
  }

  solarGeo.setAttribute('position', new THREE.BufferAttribute(solarPos, 3));

  /* ============================================================
     SCROLL-DRIVEN OPACITY CONTROLLER
     Called by app.js via window.onBorealScroll(progress)
  ============================================================ */
  let scrollProgress = 0;

  window.onBorealScroll = function (p) {
    scrollProgress = p;

    // --- Ice Dust: chapters 1–2 (0–36%)
    const icePeak = 0.18;
    let iceOpacity = 0;
    if      (p >= 0 && p < icePeak)    iceOpacity = p / icePeak * 0.7;
    else if (p >= icePeak && p < 0.36) iceOpacity = 0.7;
    else if (p >= 0.36 && p < 0.46)    iceOpacity = 0.7 * (1 - (p - 0.36) / 0.10);
    iceDustMat.opacity = iceOpacity;

    // --- Aurora Ribbons: chapter 2 (18–36%)
    let ribbonOpacity = 0;
    if      (p >= 0.20 && p < 0.30) ribbonOpacity = (p - 0.20) / 0.10;
    else if (p >= 0.30 && p < 0.36) ribbonOpacity = 1.0;
    else if (p >= 0.36 && p < 0.44) ribbonOpacity = 1 - (p - 0.36) / 0.08;
    ribbonMeshes.forEach((m, i) => {
      m.material.opacity = ribbonOpacity * (0.25 + i * 0.06);
    });

    // --- Field Lines: chapter 4 (54–66%)
    let fieldOpacity = 0;
    if      (p >= 0.56 && p < 0.62) fieldOpacity = (p - 0.56) / 0.06;
    else if (p >= 0.62 && p < 0.66) fieldOpacity = 1.0;
    else if (p >= 0.66 && p < 0.72) fieldOpacity = 1 - (p - 0.66) / 0.06;
    fieldGroup.children.forEach((m, i) => {
      m.material.opacity = fieldOpacity * (0.3 + i * 0.05);
    });

    // --- Solar Wind: chapter 5 (66–88%)
    let solarOpacity = 0;
    if      (p >= 0.68 && p < 0.74) solarOpacity = (p - 0.68) / 0.06;
    else if (p >= 0.74 && p < 0.86) solarOpacity = 1.0;
    else if (p >= 0.86 && p < 0.90) solarOpacity = 1 - (p - 0.86) / 0.04;
    solarMat.opacity = solarOpacity * 0.85;
  };

  /* ============================================================
     ANIMATION LOOP
  ============================================================ */
  let lastTime = 0;

  function animate(time) {
    requestAnimationFrame(animate);
    const dt = Math.min((time - lastTime) / 16.67, 3); // normalized delta, capped at 3x
    lastTime = time;

    /* Ice Dust — gentle drift + wrap */
    if (iceDustMat.opacity > 0.01) {
      const posAttr = iceDustGeo.attributes.position;
      for (let i = 0; i < ICE_COUNT; i++) {
        posAttr.array[i * 3]     += iceDustVelocities[i].x * dt;
        posAttr.array[i * 3 + 1] += iceDustVelocities[i].y * dt;

        // Wrap horizontally
        const hw = window.innerWidth  * 0.7;
        const hh = window.innerHeight * 0.7;
        if (posAttr.array[i * 3]     >  hw) posAttr.array[i * 3]     = -hw;
        if (posAttr.array[i * 3]     < -hw) posAttr.array[i * 3]     =  hw;
        if (posAttr.array[i * 3 + 1] >  hh) posAttr.array[i * 3 + 1] = -hh;
        if (posAttr.array[i * 3 + 1] < -hh) posAttr.array[i * 3 + 1] =  hh;
      }
      posAttr.needsUpdate = true;
    }

    /* Ribbon undulation — subtle wave motion */
    ribbonMeshes.forEach((mesh, idx) => {
      if (mesh.material.opacity > 0.01) {
        mesh.position.y = Math.sin(time * 0.0005 + idx * 0.8) * 12;
      }
    });

    /* Solar Wind — fast horizontal movement + wrap */
    if (solarMat.opacity > 0.01) {
      const posAttr = solarGeo.attributes.position;
      for (let i = 0; i < SOLAR_COUNT; i++) {
        posAttr.array[i * 3]     += solarVel[i].x * dt * 1.8;
        posAttr.array[i * 3 + 1] += solarVel[i].y * dt;

        // Wrap: when particle exits left edge, respawn on right
        if (posAttr.array[i * 3] < -window.innerWidth) {
          posAttr.array[i * 3]     = window.innerWidth;
          posAttr.array[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight;
        }
      }
      posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
