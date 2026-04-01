/* ============================================================
   BOREAL — app.js
   Lenis + GSAP + ScrollTrigger + Dual Frame Canvas + HUD
   ============================================================ */

/* ---- Scramble Glyphs ---- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/* ---- Config ---- */
const AURORA_FRAME_COUNT = 121;
const SOLAR_FRAME_COUNT  = 61;
const IMAGE_SCALE        = 0.92;
const FRAME_EXT          = 'jpg';
const FRAME_PAD          = 4;

// Scroll % where solar footage begins/ends
const SOLAR_START = 0.66;
const SOLAR_END   = 0.90;

/* ---- State ---- */
let auroraFrames  = new Array(AURORA_FRAME_COUNT).fill(null);
let solarFrames   = new Array(SOLAR_FRAME_COUNT).fill(null);
let loadedCount   = 0;
const totalFrames = AURORA_FRAME_COUNT + SOLAR_FRAME_COUNT;
let currentFrame  = 0;
let currentClip   = 'aurora'; // 'aurora' | 'solar'
let bgColor       = '#020a06';
let appReady      = false;
let soundEnabled  = false;

/* ---- Elements ---- */
const loader         = document.getElementById('loader');
const loaderBar      = document.getElementById('loader-bar');
const loaderPct      = document.getElementById('loader-percent');
const canvasWrap     = document.getElementById('canvas-wrap');
const canvas         = document.getElementById('canvas');
const ctx            = canvas.getContext('2d');
const scrollContainer = document.getElementById('scroll-container');
const heroSection    = document.getElementById('hero');
const marqueeWrap    = document.getElementById('marquee');
const darkOverlay    = document.getElementById('dark-overlay');
const hud            = document.getElementById('hud');
const ambientAudio   = document.getElementById('ambient-audio');
const soundToggle    = document.getElementById('sound-toggle');

/* ============================================================
   1. CANVAS SETUP
   ============================================================ */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  drawFrame(currentFrame, currentClip);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ============================================================
   2. FRAME LOADER
   ============================================================ */
function padNum(n, len) {
  return String(n).padStart(len, '0');
}

function sampleBgColor(img) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 4; tempCanvas.height = 1;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(img, 0, 0, 4, 1);
  const px = tempCtx.getImageData(0, 0, 4, 1).data;
  const r = (px[0] + px[4] + px[8] + px[12]) / 4;
  const g = (px[1] + px[5] + px[9] + px[13]) / 4;
  const b = (px[2] + px[6] + px[10] + px[14]) / 4;
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function loadFrameFromSet(clip, index) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (clip === 'aurora') {
        auroraFrames[index] = img;
      } else {
        solarFrames[index] = img;
      }
      loadedCount++;
      const pct = Math.round((loadedCount / totalFrames) * 100);
      loaderBar.style.width = pct + '%';
      loaderPct.textContent = pct + '%';
      if (index % 20 === 0 && img.complete) {
        bgColor = sampleBgColor(img);
      }
      resolve();
    };
    img.onerror = () => { loadedCount++; resolve(); };
    img.src = clip === 'aurora'
      ? `frames-aurora/frame_${padNum(index + 1, FRAME_PAD)}.${FRAME_EXT}`
      : `frames-solar/frame_${padNum(index + 1, FRAME_PAD)}.${FRAME_EXT}`;
  });
}

async function preloadFrames() {
  // Phase 1: Load first 10 aurora frames immediately
  const firstBatch = Array.from({ length: 10 }, (_, i) => loadFrameFromSet('aurora', i));
  await Promise.all(firstBatch);

  drawFrame(0, 'aurora');
  initHeroAnimations();

  // Phase 2: Load all remaining frames in background
  const remainingAurora = Array.from(
    { length: AURORA_FRAME_COUNT - 10 },
    (_, i) => loadFrameFromSet('aurora', i + 10)
  );
  const allSolar = Array.from(
    { length: SOLAR_FRAME_COUNT },
    (_, i) => loadFrameFromSet('solar', i)
  );

  await Promise.all([...remainingAurora, ...allSolar]);

  loader.classList.add('hidden');
  appReady = true;
  initScrollSystem();
}

/* ============================================================
   3. CANVAS RENDERER — Padded Cover Mode
   ============================================================ */
function drawFrame(index, clip) {
  const frames = clip === 'solar' ? solarFrames : auroraFrames;
  const img = frames[index];
  if (!img) return;

  const cw = canvas.width  / (window.devicePixelRatio || 1);
  const ch = canvas.height / (window.devicePixelRatio || 1);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ============================================================
   4. HERO ENTRANCE ANIMATIONS
   ============================================================ */
function initHeroAnimations() {
  const tl = gsap.timeline({ delay: 0.3 });

  tl.to('.hero-meta', {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
  })
  .to('.hero-heading', {
    opacity: 1,
    y: 0,
    duration: 1.2,
    ease: 'power4.out',
  }, '-=0.4')
  .to('.hero-tagline', {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
  }, '-=0.5')
  .to('.hero-status', {
    opacity: 1,
    x: 0,
    duration: 0.8,
    ease: 'power3.out',
  }, '-=0.4')
  .to('.scroll-indicator', {
    opacity: 1,
    duration: 0.8,
    ease: 'power2.out',
  }, '-=0.3');
}

/* ============================================================
   5. SCROLL SYSTEM
   ============================================================ */
function initScrollSystem() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.refresh();

  /* --- Dual Frame Scrubbing --- */
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      if (p >= SOLAR_START && p <= SOLAR_END) {
        // Solar section
        const solarProgress = (p - SOLAR_START) / (SOLAR_END - SOLAR_START);
        const index = Math.min(
          Math.floor(solarProgress * SOLAR_FRAME_COUNT),
          SOLAR_FRAME_COUNT - 1
        );
        if (currentClip !== 'solar' || index !== currentFrame) {
          currentClip = 'solar';
          currentFrame = index;
          // Warm bg tint for solar section
          bgColor = '#100600';
          requestAnimationFrame(() => drawFrame(currentFrame, 'solar'));
        }
      } else {
        // Aurora section (0–SOLAR_START, and SOLAR_END–1.0)
        let auroraProgress;
        if (p < SOLAR_START) {
          // Map 0–66% of scroll to aurora frames 0–100%
          auroraProgress = p / SOLAR_START;
        } else {
          // After solar, hold on last aurora frame
          auroraProgress = 1.0;
        }
        const index = Math.min(
          Math.floor(auroraProgress * AURORA_FRAME_COUNT),
          AURORA_FRAME_COUNT - 1
        );
        if (currentClip !== 'aurora' || index !== currentFrame) {
          currentClip = 'aurora';
          currentFrame = index;
          bgColor = '#020a06';
          requestAnimationFrame(() => drawFrame(currentFrame, 'aurora'));
        }
      }
    },
  });

  initHeroTransition();
  initMarquee();
  initDarkOverlay(0.36, 0.54);   // Chapter 3: The Spectrum
  positionSections();
  document.querySelectorAll('.scroll-section').forEach(setupSectionAnimation);
  initCounters();
  initHUD();
  initChapterIndicator();
  initSoundToggle();

  // Expose particles scroll hook
  if (typeof window.onBorealScroll === 'function') {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => window.onBorealScroll(self.progress),
    });
  }
}

/* ============================================================
   6. HERO → CANVAS TRANSITION (Circle-Wipe)
   ============================================================ */
function initHeroTransition() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      const heroOpacity = Math.max(0, 1 - p * 18);
      heroSection.style.opacity = heroOpacity;

      const wipeProgress = Math.min(1, Math.max(0, (p - 0.005) / 0.07));
      const radius = wipeProgress * 150;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;

      // HUD visibility
      const hudVisible = p > 0.05 && p < 0.97;
      hud.classList.toggle('visible', hudVisible);
    },
  });
}

/* ============================================================
   7. POSITION SECTIONS ABSOLUTELY
   ============================================================ */
function positionSections() {
  // Use viewport-based height calculation — scrollContainer.offsetHeight can be
  // incorrect at call time if fonts/layout haven't fully resolved yet.
  const isMobile = window.innerWidth <= 768;
  const containerHeight = window.innerHeight * (isMobile ? 5.5 : 7);

  document.querySelectorAll('.scroll-section').forEach((section) => {
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    const mid   = (enter + leave) / 2;
    const top   = mid * containerHeight;

    section.style.top    = top + 'px';
    section.style.transform = 'translateY(-50%)';
    section.style.position  = 'absolute';
  });
}

/* ============================================================
   8. SECTION ANIMATION SYSTEM
   ============================================================ */
function setupSectionAnimation(section) {
  const type    = section.dataset.animation;
  const persist = section.dataset.persist === 'true';
  const enter   = parseFloat(section.dataset.enter) / 100;
  const leave   = parseFloat(section.dataset.leave) / 100;

  const children = section.querySelectorAll(
    '.section-label, .section-heading, .section-body, .cta-button, .stat, .source-stats'
  );

  const tl = gsap.timeline({ paused: true });

  switch (type) {
    case 'fade-up':
      tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
      break;
    case 'slide-left':
      tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
      break;
    case 'slide-right':
      tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
      break;
    case 'scale-up':
      tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
      break;
    case 'stagger-up':
      tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' });
      break;
    case 'clip-reveal':
      tl.from(children, {
        clipPath: 'inset(100% 0 0 0)',
        opacity: 0,
        stagger: 0.15,
        duration: 1.2,
        ease: 'power4.inOut',
      });
      break;
    default:
      tl.from(children, { opacity: 0, duration: 0.8, ease: 'power2.out' });
  }

  let hasPlayed = false;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: false,
    onUpdate: (self) => {
      const p = self.progress;
      const inRange  = p >= enter && p <= leave;
      const pastRange = persist && p > leave;

      if (inRange || pastRange) {
        if (section.style.opacity !== '1') {
          section.style.opacity = '1';
          section.style.pointerEvents = persist ? 'all' : 'none';
        }
        if (!hasPlayed) {
          hasPlayed = true;
          tl.restart();
          section.querySelectorAll('.section-heading').forEach((h) => scrambleText(h, 900));
        }
      } else {
        if (section.style.opacity !== '0') {
          section.style.opacity = '0';
          if (!persist) hasPlayed = false;
        } else if (!persist) {
          hasPlayed = false;
        }
      }
    },
  });
}

/* ============================================================
   9. COUNTER ANIMATIONS (Chapter 3 — Wavelength stats)
   ============================================================ */
function initCounters() {
  document.querySelectorAll('.stat-number').forEach((el) => {
    const raw      = el.dataset.value;
    const decimals = parseInt(el.dataset.decimals || '0');
    const target   = parseFloat(raw);

    gsap.fromTo(
      el,
      { textContent: 0 },
      {
        textContent: target,
        duration: 2.2,
        ease: 'power1.out',
        snap: { textContent: decimals === 0 ? 1 : Math.pow(10, -decimals) },
        onUpdate() {
          el.textContent = parseFloat(el.textContent).toFixed(decimals);
        },
        scrollTrigger: {
          trigger: el.closest('.scroll-section'),
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  });
}

/* ============================================================
   10. HORIZONTAL MARQUEE
   ============================================================ */
function initMarquee() {
  gsap.to(marqueeWrap.querySelector('.marquee-text'), {
    xPercent: -30,
    ease: 'none',
    scrollTrigger: {
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
    },
  });

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      if      (p >= 0.18 && p < 0.28) opacity = (p - 0.18) / 0.10;
      else if (p >= 0.28 && p < 0.55) opacity = 1;
      else if (p >= 0.55 && p < 0.65) opacity = 1 - (p - 0.55) / 0.10;
      marqueeWrap.style.opacity = opacity;
    },
  });
}

/* ============================================================
   11. DARK OVERLAY (Chapter 3 — The Spectrum)
   ============================================================ */
function initDarkOverlay(enter, leave) {
  const fadeRange = 0.04;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;

      if (p >= enter - fadeRange && p < enter) {
        opacity = (p - (enter - fadeRange)) / fadeRange;
      } else if (p >= enter && p < leave) {
        opacity = 0.88;
      } else if (p >= leave && p <= leave + fadeRange) {
        opacity = 0.88 * (1 - (p - leave) / fadeRange);
      }

      darkOverlay.style.opacity = opacity;
    },
  });
}

/* ============================================================
   12. LIVE HUD
   ============================================================ */
const HUD_CHAPTERS = [
  { enter: 0.00, leave: 0.18, altitude: '0 km',         kp: '0.0',  wind: '0 km/s',    lat: '68.2°N', wave: '—',       temp: '243 K'  },
  { enter: 0.18, leave: 0.36, altitude: '112 km',        kp: '4.2',  wind: '450 km/s',  lat: '68.2°N', wave: '557.7 nm', temp: '1,200 K' },
  { enter: 0.36, leave: 0.54, altitude: '150 km',        kp: '5.8',  wind: '520 km/s',  lat: '68.2°N', wave: '557.7 nm', temp: '1,800 K' },
  { enter: 0.54, leave: 0.66, altitude: '3,500 km',      kp: '7.4',  wind: '580 km/s',  lat: '68.2°N', wave: '557.7 nm', temp: '2,800 K' },
  { enter: 0.66, leave: 0.88, altitude: '150,000,000 km', kp: '9.0', wind: '1,000 km/s', lat: '0.0°',   wave: '—',       temp: '5,778 K' },
  { enter: 0.88, leave: 1.00, altitude: '112 km',        kp: '7.4',  wind: '580 km/s',  lat: '68.2°N', wave: '557.7 nm', temp: '1,200 K' },
];

function setHudValues(chapter) {
  document.getElementById('hud-altitude').textContent = chapter.altitude;
  document.getElementById('hud-kp').textContent       = chapter.kp;
  document.getElementById('hud-wind').textContent     = chapter.wind;
  document.getElementById('hud-lat').textContent      = chapter.lat;
  document.getElementById('hud-wave').textContent     = chapter.wave;
  document.getElementById('hud-temp').textContent     = chapter.temp;
}

function initHUD() {
  // Set initial values
  setHudValues(HUD_CHAPTERS[0]);

  let currentHudChapter = null;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      let active = null;
      for (const ch of HUD_CHAPTERS) {
        if (p >= ch.enter && p < ch.leave) {
          active = ch;
          break;
        }
      }
      if (!active) active = HUD_CHAPTERS[HUD_CHAPTERS.length - 1];

      if (active !== currentHudChapter) {
        currentHudChapter = active;
        // Flash update
        gsap.to('#hud .hud-value', {
          opacity: 0,
          duration: 0.15,
          ease: 'power1.in',
          onComplete: () => {
            setHudValues(active);
            gsap.to('#hud .hud-value', { opacity: 1, duration: 0.25, ease: 'power1.out' });
          },
        });
      }
    },
  });
}

/* ============================================================
   13. TEXT SCRAMBLE
   ============================================================ */
function scrambleText(el, duration) {
  duration = duration || 900;
  const originalHTML = el.innerHTML;
  const finalText    = el.innerText;
  const chars        = finalText.split('');

  const letterPositions = [];
  chars.forEach((ch, i) => { if (/[a-zA-Z]/.test(ch)) letterPositions.push(i); });
  const totalLetters = letterPositions.length;
  if (totalLetters === 0) return;

  const startTime = performance.now();

  function tick(now) {
    const elapsed       = now - startTime;
    const progress      = Math.min(elapsed / duration, 1);
    const resolvedCount = Math.floor(progress * totalLetters);
    const resolvedSet   = new Set(letterPositions.slice(0, resolvedCount));

    const result = chars.map((ch, i) => {
      if (ch === '\n')           return '<br>';
      if (!/[a-zA-Z]/.test(ch)) return ch;
      if (resolvedSet.has(i))   return ch;
      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    });

    el.innerHTML = result.join('');
    if (progress < 1) requestAnimationFrame(tick);
    else el.innerHTML = originalHTML;
  }

  requestAnimationFrame(tick);
}

/* ============================================================
   14. CHAPTER INDICATOR
   ============================================================ */
function initChapterIndicator() {
  const indicator = document.getElementById('chapter-indicator');
  const numEl     = document.getElementById('chapter-num');
  const nameEl    = document.getElementById('chapter-name');

  const chapters = [];
  document.querySelectorAll('.scroll-section').forEach((section) => {
    const enter   = parseFloat(section.dataset.enter) / 100;
    const leave   = parseFloat(section.dataset.leave) / 100;
    const labelEl = section.querySelector('.section-label');
    if (!labelEl) return;
    // Parse "001 · STILLNESS" format
    const parts = labelEl.textContent.split('·');
    chapters.push({
      enter,
      leave,
      num:  parts[0].trim(),
      name: parts[1] ? parts[1].trim() : '',
    });
  });

  let currentChapter = null;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      const visible = p > 0.04 && p < 0.995;
      indicator.style.opacity = visible ? '1' : '0';

      let active = null;
      for (const ch of chapters) {
        if (p >= ch.enter - 0.005 && p <= ch.leave + 0.005) {
          active = ch;
          break;
        }
      }

      if (active && active !== currentChapter) {
        currentChapter = active;
        gsap.to([numEl, nameEl], {
          opacity: 0,
          y: -6,
          duration: 0.18,
          ease: 'power2.in',
          onComplete: () => {
            numEl.textContent  = active.num;
            nameEl.textContent = active.name;
            gsap.to([numEl, nameEl], { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' });
          },
        });
      }
    },
  });
}

/* ============================================================
   15. SOUND TOGGLE
   ============================================================ */
function initSoundToggle() {
  if (!soundToggle || !ambientAudio) return;

  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      ambientAudio.volume = 0.18;
      ambientAudio.play().catch(() => { soundEnabled = false; });
    } else {
      ambientAudio.pause();
    }
    soundToggle.querySelector('.icon-sound-on').style.display  = soundEnabled ? 'block' : 'none';
    soundToggle.querySelector('.icon-sound-off').style.display = soundEnabled ? 'none'  : 'block';
  });
}

/* ============================================================
   INIT
   ============================================================ */
preloadFrames();
