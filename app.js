import * as THREE from "./vendor/three.module.js";

const projects = [
  { slug: "afterlight", title: "Afterlight", year: "2026", type: "Motion identity", role: "Direction / Motion", copy: "A luminous identity built from refracted color, slow orbital movement and a pulse that changes with every encounter." },
  { slug: "soft-static", title: "Soft Static", year: "2026", type: "Title sequence", role: "Design / Type / Motion", copy: "An opening sequence where broadcast noise behaves like fabric: stretching, folding and briefly revealing the title beneath." },
  { slug: "glass-house", title: "Glass House", year: "2025", type: "Digital campaign", role: "Art direction / CGI", copy: "A study in transparent architecture and impossible reflections, made for a series of looping digital installations." },
  { slug: "signal-zero", title: "Signal Zero", year: "2025", type: "Visual system", role: "Direction / Generative design", copy: "A modular image system that translates live data into bands of color, interruption and accelerating light." },
  { slug: "still-moving", title: "Still Moving", year: "2025", type: "Film titles", role: "Creative direction / Motion", copy: "A quiet set of titles suspended between a still photograph and a moving memory, paced around tiny shifts in light." },
  { slug: "parallel-bloom", title: "Parallel Bloom", year: "2024", type: "Experimental film", role: "Concept / Direction", copy: "Synthetic flowers grow in parallel simulations, sharing color and rhythm while never repeating the same form." },
  { slug: "open-circuit", title: "Open Circuit", year: "2024", type: "Brand film", role: "Design / Animation", copy: "A kinetic portrait of creative exchange, assembled from charged lines, collisions and sudden moments of calm." },
  { slug: "echo-field", title: "Echo Field", year: "2024", type: "Spatial graphics", role: "Art direction / Motion", copy: "A responsive field of soft volumes that absorbs sound and returns it as slow, tactile movement." },
  { slug: "low-tide", title: "Low Tide", year: "2023", type: "Installation film", role: "Direction / Edit", copy: "A slow study of a shoreline where each frame arrives with the rhythm of an incoming tide." },
  { slug: "chromatic-air", title: "Chromatic Air", year: "2023", type: "Brand world", role: "Design / Motion", copy: "A breathing palette for a brand world built from color, space and small changes in pressure." },
];

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const imageRevision = Date.now();
const imageCandidates = projects.map((_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return ["jpg", "png", "webp", "jpeg"].map((extension) => `./assets/${number}.${extension}?v=${imageRevision}`);
});
const videoCandidates = projects.map((_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return ["mp4", "webm", "mov"].map((extension) => `./assets/${number}_演示视频.${extension}?v=${imageRevision}`);
});
const helixProjects = [...projects, ...projects];
const spiralView = document.querySelector("#spiral-view");
const canvas = document.querySelector("#spiral-canvas");
const listView = document.querySelector("#list-view");
const detailView = document.querySelector("#detail-view");
const detailImage = document.querySelector("#detail-image");
const detailMedia = document.querySelector("#detail-media");
const detailVideo = document.querySelector("#detail-video");
const detailMediaName = document.querySelector("#detail-media-name");
const menuPanel = document.querySelector("#menu-panel");
const menuToggle = document.querySelector("#menu-toggle");
const aboutView = document.querySelector("#about-view");
const liveRegion = document.querySelector("#live-region");
const soundToggle = document.querySelector("#sound-toggle");
const AUDIO_MASTER_LEVEL = 0.32;
const MUSIC_LEVEL = 0.22;

const audioState = {
  context: null,
  master: null,
  delay: null,
  delaySend: null,
  ambientBus: null,
  noiseBuffer: null,
  musicElement: null,
  musicSource: null,
  musicGain: null,
  pulseTimer: null,
  pulseStep: 0,
  enabled: false,
  started: false,
  starting: false,
  suspendedForDetail: false,
  resumeAfterDetail: false,
  pauseTimer: null,
};
let lastHoverSoundAt = 0;
let lastSpiralSoundAt = 0;

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * 0.6;
  }
  return buffer;
}

function routeVoice(node, delayAmount = 0.08) {
  node.connect(audioState.master);
  if (audioState.delay && delayAmount > 0) {
    const send = audioState.context.createGain();
    send.gain.value = delayAmount;
    node.connect(send);
    send.connect(audioState.delay);
  }
}

function playTone(frequency, duration = 0.2, volume = 0.025, type = "sine", glideTo = null) {
  if (!audioState.enabled || !audioState.context) return;
  const context = audioState.context;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, now + duration);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.025, duration * 0.2));
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(envelope);
  routeVoice(envelope, 0.12);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.04);
}

function playNoise(duration = 0.16, volume = 0.012, frequency = 760) {
  if (!audioState.enabled || !audioState.context || !audioState.noiseBuffer) return;
  const context = audioState.context;
  const now = context.currentTime;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = audioState.noiseBuffer;
  source.loop = true;
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 1.1;
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(envelope);
  routeVoice(envelope, 0.16);
  source.start(now);
  source.stop(now + duration + 0.04);
}

function playAmbientPulse() {
  const notes = [55, 65.41, 73.42, 82.41, 98];
  const note = notes[audioState.pulseStep % notes.length];
  playTone(note, 1.15, 0.008, "sine", note * 1.006);
  playTone(note * 2, 0.42, 0.003, "triangle", note * 2.01);
  audioState.pulseStep += 1;
}

function playHoverSound() {
  playTone(330, 0.1, 0.018, "sine", 390);
}

function playClickSound() {
  playTone(185, 0.18, 0.028, "triangle", 245);
  playNoise(0.09, 0.007, 1100);
}

function playSwitchSound() {
  playTone(220, 0.13, 0.022, "sine", 300);
  playTone(440, 0.1, 0.011, "sine", 520);
}

function playCloseSound() {
  playTone(290, 0.18, 0.023, "sine", 170);
}

function playSpiralSound(direction = 1) {
  const now = performance.now();
  if (now - lastSpiralSoundAt < 85) return;
  lastSpiralSoundAt = now;
  playTone(direction > 0 ? 120 : 180, 0.16, 0.012, "triangle", direction > 0 ? 92 : 138);
}

function updateSoundButton() {
  if (!soundToggle) return;
  const label = audioState.enabled ? "Mute sound" : "Enable sound";
  soundToggle.classList.toggle("is-on", audioState.enabled);
  soundToggle.setAttribute("aria-label", label);
  soundToggle.setAttribute("aria-pressed", String(audioState.enabled));
  soundToggle.title = label;
  soundToggle.querySelector("span").textContent = audioState.enabled ? "\u266a" : "\u266b";
}

async function startProceduralAudio({ cue = true } = {}) {
  if (audioState.starting) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    liveRegion.textContent = "Sound is not available in this browser";
    return;
  }

  try {
    audioState.starting = true;
    if (!audioState.context) {
      const context = new AudioContextClass();
      const master = context.createGain();
      const ambientBus = context.createGain();
      const ambientFilter = context.createBiquadFilter();
      const delay = context.createDelay(1);
      const feedback = context.createGain();
      const droneGain = context.createGain();
      const musicGain = context.createGain();
      const musicElement = new Audio("./assets/una-mattina.mp3?v=20261007");

      master.gain.value = 0.0001;
      master.connect(context.destination);
      musicElement.loop = true;
      musicElement.preload = "auto";
      musicElement.volume = 1;
      musicGain.gain.value = MUSIC_LEVEL;
      musicElement.crossOrigin = "anonymous";
      const musicSource = context.createMediaElementSource(musicElement);
      musicSource.connect(musicGain);
      musicGain.connect(master);

      ambientBus.gain.value = 0.045;
      ambientFilter.type = "lowpass";
      ambientFilter.frequency.value = 840;
      ambientFilter.Q.value = 0.55;
      ambientBus.connect(ambientFilter);
      ambientFilter.connect(master);

      delay.delayTime.value = 0.22;
      feedback.gain.value = 0.24;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(master);

      const droneOne = context.createOscillator();
      const droneTwo = context.createOscillator();
      droneOne.type = "sine";
      droneTwo.type = "triangle";
      droneOne.frequency.value = 55;
      droneTwo.frequency.value = 82.41;
      droneTwo.detune.value = -5;
      droneGain.gain.value = 0.08;
      droneOne.connect(droneGain);
      droneTwo.connect(droneGain);
      droneGain.connect(ambientBus);
      droneOne.start();
      droneTwo.start();

      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 0.065;
      lfoGain.gain.value = 0.1;
      lfo.connect(lfoGain);
      lfoGain.connect(droneGain.gain);
      lfo.start();

      const noiseSource = context.createBufferSource();
      const noiseFilter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      noiseSource.buffer = createNoiseBuffer(context);
      noiseSource.loop = true;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 420;
      noiseFilter.Q.value = 0.45;
      noiseGain.gain.value = 0.003;
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ambientBus);
      noiseSource.start();

      audioState.context = context;
      audioState.master = master;
      audioState.delay = delay;
      audioState.delaySend = delay;
      audioState.ambientBus = ambientBus;
      audioState.noiseBuffer = noiseSource.buffer;
      audioState.musicElement = musicElement;
      audioState.musicSource = musicSource;
      audioState.musicGain = musicGain;
      audioState.started = true;
    }

    if (audioState.pauseTimer) {
      window.clearTimeout(audioState.pauseTimer);
      audioState.pauseTimer = null;
    }
    const musicPlay = audioState.musicElement.play();
    await audioState.context.resume();
    await musicPlay;
    if (audioState.suspendedForDetail) {
      audioState.musicElement.pause();
      audioState.starting = false;
      return;
    }
    const now = audioState.context.currentTime;
    audioState.master.gain.cancelScheduledValues(now);
    audioState.master.gain.setValueAtTime(Math.max(audioState.master.gain.value, 0.0001), now);
    audioState.master.gain.linearRampToValueAtTime(AUDIO_MASTER_LEVEL, now + 0.2);
    audioState.enabled = true;
    audioState.starting = false;
    if (audioState.pulseTimer) window.clearInterval(audioState.pulseTimer);
    audioState.pulseTimer = null;
    updateSoundButton();
    if (cue) {
      playTone(523.25, 0.28, 0.03, "sine", 783.99);
      playTone(659.25, 0.36, 0.014, "triangle", 987.77);
    }
    liveRegion.textContent = "Sound enabled";
  } catch (error) {
    audioState.starting = false;
    audioState.enabled = false;
    updateSoundButton();
    liveRegion.textContent = "Sound could not be enabled";
    console.warn("Procedural sound unavailable", error);
  }
}

function stopProceduralAudio() {
  if (!audioState.context || !audioState.master) return;
  if (audioState.pauseTimer) {
    window.clearTimeout(audioState.pauseTimer);
    audioState.pauseTimer = null;
  }
  const now = audioState.context.currentTime;
  audioState.master.gain.cancelScheduledValues(now);
  audioState.master.gain.setValueAtTime(Math.max(audioState.master.gain.value, 0.0001), now);
  audioState.master.gain.linearRampToValueAtTime(0.0001, now + 0.35);
  if (audioState.musicElement) audioState.musicElement.pause();
  if (audioState.pulseTimer) {
    window.clearInterval(audioState.pulseTimer);
    audioState.pulseTimer = null;
  }
  audioState.enabled = false;
  audioState.suspendedForDetail = false;
  audioState.resumeAfterDetail = false;
  updateSoundButton();
  liveRegion.textContent = "Sound muted";
}

function pauseAudioForDetail() {
  if (audioState.suspendedForDetail) return;
  audioState.resumeAfterDetail = audioState.enabled || audioState.starting;
  audioState.suspendedForDetail = true;
  if (!audioState.context || !audioState.master || !audioState.enabled) return;

  const now = audioState.context.currentTime;
  audioState.master.gain.cancelScheduledValues(now);
  audioState.master.gain.setValueAtTime(Math.max(audioState.master.gain.value, 0.0001), now);
  audioState.master.gain.linearRampToValueAtTime(0.0001, now + 0.24);
  audioState.enabled = false;
  updateSoundButton();
  liveRegion.textContent = "Sound paused for project";
  audioState.pauseTimer = window.setTimeout(() => {
    if (audioState.suspendedForDetail && audioState.musicElement) audioState.musicElement.pause();
    audioState.pauseTimer = null;
  }, 260);
}

function resumeAudioAfterDetail() {
  const shouldResume = audioState.resumeAfterDetail;
  audioState.suspendedForDetail = false;
  audioState.resumeAfterDetail = false;
  if (shouldResume) startProceduralAudio({ cue: false });
}

function toggleProceduralAudio() {
  if (audioState.enabled) stopProceduralAudio();
  else startProceduralAudio();
}

function startAudioFromGesture(event) {
  if (audioState.enabled || audioState.starting || audioState.suspendedForDetail || soundToggle.contains(event.target)) return;
  startProceduralAudio();
}

updateSoundButton();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(window.innerWidth < 900 ? 45 : 35, 1, 0.1, 100);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x0e0e0e, 0);

const CARD_WIDTH = 1.7;
const CARD_HEIGHT = 1;
const CYLINDER_RADIUS = 2;
const VERTICAL_SPACING = 0.5;
const ANGLE_STEP = 0.85;
const SPIRAL_DIRECTION = -1;
const centerIndex = Math.floor(helixProjects.length / 2);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();
const cardMeshes = [];
const placeholderImages = [];
let activeIndex = 0;
let hoveredMesh = null;
let pressedMesh = null;
let pointerDownX = 0;
let pointerDownY = 0;
let wheelDeltaY = 0;
let targetWheelDeltaY = 0;
let wheelDirection = 1;
let scrollOffset = 0;
let touchStartX = 0;
let lastTouchX = 0;
let touchVelocityX = 0;
let touchMoved = false;
let currentProject = null;
let videoRequestId = 0;

function placeholderCanvas(index) {
  const art = document.createElement("canvas");
  art.width = 960;
  art.height = 540;
  const ctx = art.getContext("2d");
  ctx.fillStyle = "#45484d";
  ctx.fillRect(0, 0, art.width, art.height);
  ctx.strokeStyle = "#aeb2b8";
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, art.width - 6, art.height - 6);
  ctx.fillStyle = "#f5f6f7";
  ctx.font = "700 72px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${String(index + 1).padStart(2, "0")}.jpg`, art.width / 2, art.height / 2);
  return art;
}

function setProjectImage(image, index, candidateIndex = 0) {
  const candidates = imageCandidates[index];
  if (candidateIndex >= candidates.length) {
    image.onerror = null;
    image.src = placeholderImages[index];
    return;
  }
  image.onerror = () => setProjectImage(image, index, candidateIndex + 1);
  image.src = candidates[candidateIndex];
}

async function setProjectVideo(index, candidateIndex = 0) {
  const candidates = videoCandidates[index];
  if (!detailVideo || !detailMedia || candidateIndex >= candidates.length) {
    if (detailVideo) {
      detailVideo.onerror = null;
      detailVideo.removeAttribute("src");
      detailVideo.load();
    }
    if (detailMedia) detailMedia.hidden = true;
    if (detailMediaName) detailMediaName.textContent = "";
    return;
  }

  const requestId = ++videoRequestId;
  detailMedia.hidden = true;
  detailMediaName.textContent = "";
  detailVideo.onerror = null;
  detailVideo.removeAttribute("src");
  detailVideo.load();

  for (let candidate = candidateIndex; candidate < candidates.length; candidate += 1) {
    try {
      const response = await fetch(candidates[candidate], { method: "HEAD", cache: "no-store" });
      if (requestId !== videoRequestId) return;
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.toLowerCase().startsWith("video/")) continue;
      detailMedia.hidden = false;
      detailMediaName.textContent = candidates[candidate].split("?")[0].split("/").pop();
      detailVideo.onerror = () => setProjectVideo(index, candidate + 1);
      detailVideo.src = candidates[candidate];
      detailVideo.load();
      return;
    } catch {
      // Try the next supported filename when a hosting provider rejects HEAD.
    }
  }

  if (requestId === videoRequestId) {
    detailMedia.hidden = true;
    detailMediaName.textContent = "";
  }
}

function loadProjectTexture(project, index, candidateIndex = 0) {
  const candidates = imageCandidates[index];
  if (candidateIndex >= candidates.length) return;
  textureLoader.load(candidates[candidateIndex], (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.minFilter = THREE.LinearFilter;
    loaded.magFilter = THREE.LinearFilter;
    // Keep fast-loading textures so cards created a moment later still receive them.
    projectTextures[index] = loaded;
    cardMeshes.filter((item) => item.userData.project === project).forEach((mesh) => {
      mesh.material.uniforms.uTexture.value = loaded;
      mesh.material.uniforms.uImageSizes.value.set(loaded.image.naturalWidth || loaded.image.width, loaded.image.naturalHeight || loaded.image.height);
    });
  }, undefined, () => loadProjectTexture(project, index, candidateIndex + 1));
}

function makeTexture(project, index) {
  const art = placeholderCanvas(index);
  placeholderImages[index] = art.toDataURL("image/jpeg", 0.88);
  const texture = new THREE.CanvasTexture(art);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  loadProjectTexture(project, index);
  return texture;
}

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  #define PI 3.14159265359

  uniform float uScrollSpeed;

  void main() {
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 curvedPosition = position;
    curvedPosition.z = sin(uv.x * PI) * 0.2;

    vec4 modelPosition = modelMatrix * vec4(curvedPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    viewPosition.x += pow(worldPosition.y, 2.0) * 0.1;
    viewPosition.x += sin(uv.y * PI) * uScrollSpeed * 2.0;

    gl_Position = projectionMatrix * viewPosition;
    vUv = uv;
    vWorldPosition = worldPosition;
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uZoom;
  uniform vec2 uPlaneSizes;
  uniform vec2 uImageSizes;
  uniform float uRevealProgress;
  varying vec2 vUv;

  float roundedRectSDF(vec2 uv, vec2 size, float radius) {
    vec2 d = abs(uv - 0.5) - size * 0.5 + radius;
    return length(max(d, 0.0)) - radius;
  }

  void main() {
    vec2 ratio = vec2(
      min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
      min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
    );
    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
    vec2 zoomedUv = (uv - 0.5) / uZoom + 0.5;
    vec4 color;

    if (gl_FrontFacing) {
      color = texture2D(uTexture, zoomedUv);
    } else {
      float offset = 40.0 / 1024.0;
      color = texture2D(uTexture, uv + vec2(-offset, -offset));
      color += texture2D(uTexture, uv + vec2(0.0, -offset)) * 2.0;
      color += texture2D(uTexture, uv + vec2(offset, -offset));
      color += texture2D(uTexture, uv + vec2(-offset, 0.0)) * 2.0;
      color += texture2D(uTexture, uv) * 4.0;
      color += texture2D(uTexture, uv + vec2(offset, 0.0)) * 2.0;
      color += texture2D(uTexture, uv + vec2(-offset, offset));
      color += texture2D(uTexture, uv + vec2(0.0, offset)) * 2.0;
      color += texture2D(uTexture, uv + vec2(offset, offset));
      color /= 16.0;
    }

    float reveal = clamp(uRevealProgress, 0.0, 1.0);
    float radius = 0.05 * reveal;
    float sdf = roundedRectSDF(vUv, vec2(reveal), radius);
    float alpha = 1.0 - smoothstep(0.0, 0.002, sdf);
    alpha *= smoothstep(0.1, 1.0, reveal);
    // Lift only the display shadows in the spiral; source pixels remain untouched.
    // Brighten the display output without rewriting or filtering the source image.
    color.rgb = pow(max(color.rgb, vec3(0.0)), vec3(0.5));
    color.rgb = clamp(color.rgb * 1.12 + vec3(0.025), 0.0, 1.0);
    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;

const projectTextures = projects.map(makeTexture);
const panelGeometry = new THREE.PlaneGeometry(1, 1, 8, 8);
helixProjects.forEach((project, index) => {
  const projectIndex = index % projects.length;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: projectTextures[projectIndex] },
      uZoom: { value: 1 },
      uPlaneSizes: { value: new THREE.Vector2(CARD_WIDTH, CARD_HEIGHT) },
      uImageSizes: { value: new THREE.Vector2(960, 540) },
      uRevealProgress: { value: 1 },
      uScrollSpeed: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const mesh = new THREE.Mesh(panelGeometry, material);
  mesh.scale.set(CARD_WIDTH, CARD_HEIGHT, 1);
  mesh.frustumCulled = false;
  mesh.userData = { project, index, hoverProgress: 0 };
  scene.add(mesh);
  cardMeshes.push(mesh);
});

projects.forEach((project, index) => {
  const button = document.createElement("button");
  button.className = "list-card";
  button.type = "button";
  button.dataset.project = project.slug;
  button.innerHTML = `<img alt="" /><span><strong>${project.title}</strong><small>${String(index + 1).padStart(2, "0")} / ${project.year}</small></span>`;
  setProjectImage(button.querySelector("img"), index);
  button.addEventListener("click", () => openProject(project, null));
  listView.append(button);
});

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.fov = width < 900 ? 45 : 35;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function syncPanels() {
  let bestScore = -Infinity;
  let bestIndex = 0;
  cardMeshes.forEach((mesh, index) => {
    let normalizedIndex = index - scrollOffset;
    normalizedIndex = ((normalizedIndex % helixProjects.length) + helixProjects.length) % helixProjects.length;
    const offset = normalizedIndex - centerIndex;
    const y = SPIRAL_DIRECTION * offset * VERTICAL_SPACING - 0.8;
    const angle = SPIRAL_DIRECTION * offset * ANGLE_STEP;
    const x = Math.cos(angle) * CYLINDER_RADIUS;
    const z = Math.sin(angle) * CYLINDER_RADIUS;

    mesh.position.set(x, y, z);
    mesh.rotation.set(0, -angle + Math.PI / 2, 0);
    mesh.scale.set(CARD_WIDTH, CARD_HEIGHT, 1);

    const hoverTarget = mesh === hoveredMesh ? 1 : 0;
    mesh.userData.hoverProgress += (hoverTarget - mesh.userData.hoverProgress) * 0.1;
    mesh.material.uniforms.uZoom.value = 1 + 0.05 * mesh.userData.hoverProgress;
    mesh.material.uniforms.uRevealProgress.value = 1 - 0.05 * mesh.userData.hoverProgress;
    mesh.material.uniforms.uScrollSpeed.value = wheelDeltaY;

    const facing = (Math.sin(angle) + 1) / 2;
    const score = facing * 1.15 - Math.abs(y) * 0.08;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  if (bestIndex !== activeIndex) {
    activeIndex = bestIndex % projects.length;
    document.querySelector("#current-number").textContent = String(activeIndex + 1).padStart(2, "0");
    document.querySelector("#current-year").textContent = projects[activeIndex].year;
  }
}

function getHit(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(cardMeshes, false);
  for (const intersection of intersections) {
    if (!intersection.face) continue;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
    const worldNormal = intersection.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    if (worldNormal.dot(raycaster.ray.direction) < 0) return intersection.object;
  }
  return null;
}

function updateHover(clientX, clientY) {
  const hit = getHit(clientX, clientY);
  const previousHit = hoveredMesh;
  hoveredMesh = hit;
  canvas.style.cursor = hit ? "pointer" : "default";
  if (hit) {
    liveRegion.textContent = `View ${hit.userData.project.title}`;
    if (hit !== previousHit && performance.now() - lastHoverSoundAt > 90) {
      lastHoverSoundAt = performance.now();
      playHoverSound();
    }
  }
}

function projectedRect(mesh) {
  const point = mesh.position.clone();
  mesh.parent.localToWorld(point);
  point.project(camera);
  const x = (point.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-point.y * 0.5 + 0.5) * window.innerHeight;
  const width = Math.min(420, window.innerWidth * 0.23);
  const height = width * (CARD_HEIGHT / CARD_WIDTH);
  return { left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2 };
}

function setDetailContent(project) {
  const index = projects.indexOf(project);
  document.querySelector("#detail-title").textContent = project.title;
  document.querySelector("#detail-project-name").textContent = project.title;
  document.querySelector("#detail-type").textContent = project.type;
  document.querySelector("#detail-description").textContent = project.copy;
  document.querySelector("#detail-year").textContent = project.year;
  document.querySelector("#detail-role").textContent = project.role;
  document.querySelector("#detail-count").textContent = `${String(index + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
  setProjectImage(detailImage, index);
  detailImage.alt = project.title;
  detailImage.hidden = false;
  setProjectVideo(index);
  document.title = `${project.title} - Polyphase`;
}

function openProject(project, sourceMesh, updateHistory = true) {
  playClickSound();
  pauseAudioForDetail();
  closeMenu();
  document.body.classList.add("detail-open");
  currentProject = project;
  setDetailContent(project);
  const rect = sourceMesh ? projectedRect(sourceMesh) : { left: window.innerWidth * 0.3, right: window.innerWidth * 0.7, top: window.innerHeight * 0.35, bottom: window.innerHeight * 0.65 };
  detailView.style.setProperty("--from-top", `${Math.max(0, rect.top)}px`);
  detailView.style.setProperty("--from-right", `${Math.max(0, window.innerWidth - rect.right)}px`);
  detailView.style.setProperty("--from-bottom", `${Math.max(0, window.innerHeight - rect.bottom)}px`);
  detailView.style.setProperty("--from-left", `${Math.max(0, rect.left)}px`);
  detailView.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => detailView.classList.add("is-open"));
  if (updateHistory) history.pushState({ project: project.slug }, "", `?project=${project.slug}`);
  window.setTimeout(() => document.querySelector("#detail-close").focus(), prefersReducedMotion ? 0 : 800);
}

function closeProject(updateHistory = true) {
  if (!detailView.classList.contains("is-open")) return;
  playCloseSound();
  if (updateHistory && history.state?.project) {
    history.back();
    return;
  }
  detailView.classList.remove("is-open");
  detailView.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
  document.title = "Polyphase - Motion Studio";
  if (updateHistory) history.replaceState({}, "", location.pathname);
  currentProject = null;
  resumeAudioAfterDetail();
}

function openAbout(updateHistory = true) {
  playClickSound();
  closeMenu();
  aboutView.classList.add("is-open");
  aboutView.setAttribute("aria-hidden", "false");
  if (updateHistory) history.pushState({ view: "about" }, "", "?view=about");
  window.setTimeout(() => document.querySelector("#about-close").focus(), prefersReducedMotion ? 0 : 720);
}

function closeAbout(updateHistory = true) {
  playCloseSound();
  if (updateHistory && history.state?.view === "about") {
    history.back();
    return;
  }
  aboutView.classList.remove("is-open");
  aboutView.setAttribute("aria-hidden", "true");
  if (updateHistory) history.replaceState({}, "", location.pathname);
}

function setView(view) {
  if (document.body.dataset.view !== view) playSwitchSound();
  document.body.dataset.view = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
}

function closeMenu() {
  menuPanel.classList.remove("is-open");
  menuPanel.setAttribute("aria-hidden", "true");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
}

function toggleMenu() {
  const open = menuPanel.classList.toggle("is-open");
  playSwitchSound();
  menuPanel.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function render() {
  wheelDeltaY += (targetWheelDeltaY - wheelDeltaY) * (prefersReducedMotion ? 0.22 : 0.1);
  scrollOffset += wheelDeltaY;
  if (Math.abs(targetWheelDeltaY) < 0.002) targetWheelDeltaY = wheelDirection * 0.002;
  targetWheelDeltaY *= 0.9;
  syncPanels();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

spiralView.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  targetWheelDeltaY += delta * 0.00015;
  targetWheelDeltaY = THREE.MathUtils.clamp(targetWheelDeltaY, -2, 2);
  wheelDirection = delta > 0 ? 1 : -1;
  playSpiralSound(wheelDirection);
}, { passive: false });

spiralView.addEventListener("pointermove", (event) => {
  updateHover(event.clientX, event.clientY);
});

spiralView.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") return;
  pressedMesh = getHit(event.clientX, event.clientY);
  pointerDownX = event.clientX;
  pointerDownY = event.clientY;
});

spiralView.addEventListener("pointerup", (event) => {
  if (event.pointerType === "touch") return;
  const moved = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY) > 5;
  const releasedMesh = getHit(event.clientX, event.clientY);
  if (pressedMesh && pressedMesh === releasedMesh && !moved) openProject(pressedMesh.userData.project, pressedMesh);
  pressedMesh = null;
});

spiralView.addEventListener("pointerleave", () => {
  hoveredMesh = null;
  pressedMesh = null;
  canvas.style.cursor = "default";
});

spiralView.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  touchStartX = event.touches[0].clientX;
  lastTouchX = touchStartX;
  touchVelocityX = 0;
  touchMoved = false;
}, { passive: true });

spiralView.addEventListener("touchmove", (event) => {
  if (event.touches.length !== 1) return;
  const clientX = event.touches[0].clientX;
  if (Math.abs(clientX - touchStartX) > 8) touchMoved = true;
  if (!touchMoved) return;
  event.preventDefault();
  const movement = -(clientX - lastTouchX) * 0.5;
  touchVelocityX = clientX - lastTouchX;
  targetWheelDeltaY -= movement * 0.003;
  targetWheelDeltaY = THREE.MathUtils.clamp(targetWheelDeltaY, -2, 2);
  wheelDirection = targetWheelDeltaY >= 0 ? 1 : -1;
  lastTouchX = clientX;
}, { passive: false });

spiralView.addEventListener("touchend", (event) => {
  if (touchMoved) {
    targetWheelDeltaY -= touchVelocityX * 0.002;
    targetWheelDeltaY = THREE.MathUtils.clamp(targetWheelDeltaY, -2, 2);
    playSpiralSound(touchVelocityX < 0 ? 1 : -1);
    return;
  }
  const touch = event.changedTouches[0];
  const hit = touch ? getHit(touch.clientX, touch.clientY) : null;
  if (hit) openProject(hit.userData.project, hit);
}, { passive: true });

spiralView.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowRight") { targetWheelDeltaY += 0.08; wheelDirection = 1; playSpiralSound(1); event.preventDefault(); }
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") { targetWheelDeltaY -= 0.08; wheelDirection = -1; playSpiralSound(-1); event.preventDefault(); }
  if (event.key === "Enter") openProject(projects[activeIndex], cardMeshes[activeIndex]);
});

document.querySelector("#menu-toggle").addEventListener("click", toggleMenu);
soundToggle.addEventListener("click", toggleProceduralAudio);
window.addEventListener("pointerdown", startAudioFromGesture, { passive: true });
window.addEventListener("touchstart", startAudioFromGesture, { passive: true });
window.addEventListener("wheel", startAudioFromGesture, { passive: true });
window.addEventListener("keydown", startAudioFromGesture, { passive: true });
document.querySelector("#detail-close").addEventListener("click", () => closeProject());
document.querySelector("#about-close").addEventListener("click", () => closeAbout());
document.querySelector("#home-button").addEventListener("click", () => {
  closeMenu(); closeAbout(false); closeProject(false); history.pushState({}, "", location.pathname);
});
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelector('[data-nav="works"]').addEventListener("click", () => {
  closeMenu(); closeAbout(false); closeProject(false); history.pushState({}, "", location.pathname);
});
document.querySelector('[data-nav="about"]').addEventListener("click", () => openAbout());
document.querySelector("#next-project").addEventListener("click", () => {
  const next = projects[(projects.indexOf(currentProject) + 1) % projects.length];
  detailView.classList.remove("is-open");
  window.setTimeout(() => openProject(next, null), prefersReducedMotion ? 0 : 500);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (menuPanel.classList.contains("is-open")) closeMenu();
  else if (aboutView.classList.contains("is-open")) closeAbout();
  else if (detailView.classList.contains("is-open")) closeProject();
});

window.addEventListener("resize", resize);
window.addEventListener("popstate", () => {
  const params = new URLSearchParams(location.search);
  const project = projects.find((item) => item.slug === params.get("project"));
  if (project) openProject(project, null, false);
  else {
    closeProject(false);
    if (params.get("view") === "about") openAbout(false); else closeAbout(false);
  }
});

resize();
setView("spiral");
syncPanels();
requestAnimationFrame(render);

const initialParams = new URLSearchParams(location.search);
const initialProject = projects.find((item) => item.slug === initialParams.get("project"));
const initialView = initialParams.get("view");
if (initialProject) openProject(initialProject, null, false);
if (initialView === "about") openAbout(false);
if (initialView === "list") setView("list");
