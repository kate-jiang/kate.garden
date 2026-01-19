import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// =============================================================================
// CONFIG
// =============================================================================

const config = {
  // Grass
  joints: 4,
  bladeWidth: 0.067,
  bladeHeight: 0.5,
  instances: 100000,

  // Terrain
  width: 100,
  resolution: 64,
  radius: 240,

  // Lighting
  elevation: 0.2,
  azimuth: 0.4,
  fogFade: 0.008,
  ambientStrength: 0.7,
  translucencyStrength: 1.5,
  specularStrength: 0.5,
  diffuseStrength: 1.5,
  shininess: 256,
  sunColour: new THREE.Vector3(1.0, 1.0, 1.0),
  specularColour: new THREE.Vector3(1.0, 1.0, 1.0),

  // Camera
  fov: 45,
  cameraPosition: { x: -18, y: -1, z: 55 },
  cameraTarget: { x: 0, y: 5, z: 10 },
  minDistance: 50,
  maxDistance: 50,
  minPolarAngle: 1.66,
  maxPolarAngle: 1.7,
  autoRotateSpeed: -0.06,

  // Interaction
  hoverScale: 1.15,
  hoverEase: 0.15,

  // Particle
  particleCount: 5000,
  particleColor: 0xd4c5a0,
  particleSize: 0.1,

  // Text
  mainTextSize: 5,
  linkTextSize: 1.1,
  linkGap: 1,
  textYPosition: 4.6,
  textZPosition: 10,
  textBobAmplitude: 0.25,
  textBobSpeed: 1.5,
  textRotationDamping: 0.03,

  // Responsive
  responsive: {
    mobileBreakpoint: 480,
    mobileTextScale: 0.75,
  },
};

const dayConfig = {
  skyColour: new THREE.Vector3(0.012, 0.12, 0.54),
  fogColorA: new THREE.Vector3(0.35, 0.5, 0.9),
  fogColorB: new THREE.Vector3(1.0, 1.0, 0.75),
  cloudBase: new THREE.Vector3(1.0, 0.98, 0.95),
  cloudShadow: new THREE.Vector3(0.65, 0.7, 0.8),
  sunGlow: new THREE.Vector3(1.0, 1.0, 0.8),
  elevation: 0.2,
  azimuth: 0.4,
  ambientIntensity: 0.9,
  dirLightIntensity: 0.8,
  pointLightIntensity: 1.5,
  particleOpacity: 0.6,
  particleSpeedMultiplier: 1.3,
  toneMappingExposure: 1.3,
  textColor: 0xdd61c0,
  textEmissive: 0xa0ac60,
  textEmissiveIntensity: 0.25,
  grassBrightness: 1.0,
  textLightIntensity: 2.0,
  rimLightIntensity: 1.5,
};

const nightConfig = {
  skyColour: new THREE.Vector3(0.005, 0.012, 0.07),
  fogColorA: new THREE.Vector3(0.04, 0.04, 0.1),
  fogColorB: new THREE.Vector3(0.09, 0.06, 0.14),
  cloudBase: new THREE.Vector3(0.11, 0.09, 0.15),
  cloudShadow: new THREE.Vector3(0.04, 0.035, 0.07),
  sunGlow: new THREE.Vector3(0.95, 0.9, 0.7),
  elevation: -0.3,
  azimuth: 0.7,
  ambientIntensity: 0.3,
  dirLightIntensity: 0.2,
  pointLightIntensity: 0.5,
  particleColor: 0xff6d1c,
  particleOpacity: 1,
  particleSpeedMultiplier: 0.85,
  toneMappingExposure: 0.7,
  textColor: 0xffccaa,
  textEmissive: 0x4715bd,
  textEmissiveIntensity: 0.4,
  grassBrightness: 0.45,
  textLightIntensity: 3.0,
  rimLightIntensity: 2.0,
};

const linkData = [
  { label: "about", action: "showAbout" },
  { label: "music", action: "showMusic" },
  { label: "photo", url: "https://instagram.com/katejiang__" },
  { label: "code", url: "https://github.com/kate-jiang" },
];

// =============================================================================
// DERIVED VALUES & STATE
// =============================================================================

let groundShader = null;
let textGroupRef = null;
let textMaterialRef = null;

const delta = config.width / config.resolution;
const pos = new THREE.Vector2(0, 0);
const sunDirection = new THREE.Vector3(
  Math.sin(config.azimuth),
  Math.sin(config.elevation),
  -Math.cos(config.azimuth)
);

const NIGHT_MODE_KEY = "nightMode";
let isNightMode =
  localStorage.getItem(NIGHT_MODE_KEY) === "true" ||
  (localStorage.getItem(NIGHT_MODE_KEY) === null &&
    window.matchMedia("(prefers-color-scheme: dark)").matches);
let nightTransition = isNightMode ? 1 : 0;
let nightTransitionTarget = isNightMode ? 1 : 0;
let particleSpeedMultiplier = dayConfig.particleSpeedMultiplier;
let cloudTimeOffset = 0; // Accumulates extra time for cloud acceleration during transitions
let particleSpeedBoost = 0; // Additional speed multiplier during transitions

// Interaction state
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickableMeshes = [];
const hoverState = new Map();
const meshByUuid = new Map();

// Pointer tracking
let isPointerDown = false;
let pointerStartPos = { x: 0, y: 0 };
let pointerMoved = false;
let pendingHoverUpdate = false;
const DRAG_THRESHOLD_PX = 5;

// Text rotation state
const textTargetQuaternion = new THREE.Quaternion();
const textCurrentQuaternion = new THREE.Quaternion();
const textDirection = new THREE.Vector3();
const textTargetMatrix = new THREE.Matrix4();
const textToCamera = new THREE.Vector3();
const textPerpendicular = new THREE.Vector3();
const ORIGIN = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

// Text click animation state
let textClickAnimating = false;
let textClickAnimationTime = 0;
const textClickAnimationDuration = 0.8;
const textJumpHeight = 1.5;
const textTwirlRotations = 1;

// =============================================================================
// RESPONSIVE UTILITIES
// =============================================================================

function applyResponsiveSettings() {
  const isMobile = window.innerWidth <= config.responsive.mobileBreakpoint;
  if (textGroupRef) {
    const scale = isMobile ? config.responsive.mobileTextScale : 1.0;
    textGroupRef.scale.setScalar(scale);
  }
}

// =============================================================================
// RENDERER SETUP
// =============================================================================

const canvas = document.getElementById("webgl");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

// =============================================================================
// SCENE & CAMERA SETUP
// =============================================================================

const scene = new THREE.Scene();
const backgroundScene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(config.fov, window.innerWidth / window.innerHeight);
camera.position.set(config.cameraPosition.x, config.cameraPosition.y, config.cameraPosition.z);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.target.set(config.cameraTarget.x, config.cameraTarget.y, config.cameraTarget.z);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = false;
controls.enableRotate = true;
controls.autoRotate = true;
controls.minDistance = config.minDistance;
controls.maxDistance = config.maxDistance;
controls.autoRotateSpeed = config.autoRotateSpeed;
controls.minPolarAngle = config.minPolarAngle;
controls.maxPolarAngle = config.maxPolarAngle;
controls.update();

// =============================================================================
// INTERACTION HELPERS
// =============================================================================

function updateMouseFromEvent(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function getIntersectedMeshes() {
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(clickableMeshes);
}

function updateHoverStates(intersects) {
  const intersectedNames = new Set(intersects.map(i => i.object.name));

  clickableMeshes.forEach(mesh => {
    if (!mesh.name) return;

    const state = hoverState.get(mesh.uuid);
    const isHovered = intersectedNames.has(mesh.name);
    const targetScale = mesh.name === "floatingText" ? 1.1 : config.hoverScale;

    if (isHovered) {
      if (!state) {
        hoverState.set(mesh.uuid, { target: targetScale, current: mesh.scale.x });
      } else {
        state.target = targetScale;
      }
    } else if (state) {
      state.target = 1;
    }
  });
}

function resetAllHoverStates() {
  hoverState.forEach(state => {
    state.target = 1;
  });
}

function updateCursor(intersects) {
  const hasClickable = intersects.some(
    i => i.object.userData.url || i.object.userData.action || i.object.name === "floatingText"
  );
  document.body.style.cursor = hasClickable ? "pointer" : "default";
}

function triggerTextClickAnimation() {
  if (!textClickAnimating) {
    textClickAnimating = true;
    textClickAnimationTime = 0;
  }
}

function handleClick(intersects) {
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    const userData = clickedObject.userData;
    if (userData.url) {
      window.open(userData.url, "_blank");
    } else if (userData.action === "showAbout") {
      showAboutPanel();
    } else if (userData.action === "showMusic") {
      showMusicPanel();
    } else if (clickedObject.name === "floatingText") {
      triggerTextClickAnimation();
    }
  }
}

// =============================================================================
// CONTENT OVERLAY (ABOUT & MUSIC)
// =============================================================================

const contentOverlay = document.getElementById("content-overlay");
const contentClose = document.getElementById("content-close");
const aboutContent = document.getElementById("about-content");
const musicContent = document.getElementById("music-content");

function showOverlay(contentType) {
  // Hide all content sections
  aboutContent.style.display = "none";
  musicContent.style.display = "none";

  // Show the requested content and set data attribute
  if (contentType === "about") {
    aboutContent.style.display = "block";
  } else if (contentType === "music") {
    musicContent.style.display = "block";
    // Scroll to currently playing item when opening
    setTimeout(() => {
      const activeItem = playlistItems.querySelector(".playlist-item.active");
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }

  // Show overlay
  contentOverlay.classList.remove("hidden");
  // Trigger reflow before adding visible class for transition
  contentOverlay.offsetHeight;
  contentOverlay.classList.add("visible");
  controls.autoRotate = false;
  // Reset cursor since overlay is now on top
  document.body.style.cursor = "default";
}

function hideOverlay() {
  contentOverlay.classList.remove("visible");
  contentOverlay.addEventListener("transitionend", function handler() {
    if (!contentOverlay.classList.contains("visible")) {
      contentOverlay.classList.add("hidden");
    }
    contentOverlay.removeEventListener("transitionend", handler);
  });
  controls.autoRotate = true;
}

function showAboutPanel() {
  showOverlay("about");
}

function showMusicPanel() {
  showOverlay("music");
}

contentClose.addEventListener("click", hideOverlay);
contentOverlay.addEventListener("click", e => {
  if (e.target === contentOverlay) {
    hideOverlay();
  }
});

function registerClickableMesh(mesh) {
  clickableMeshes.push(mesh);
  meshByUuid.set(mesh.uuid, mesh);
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

canvas.addEventListener("pointerdown", e => {
  isPointerDown = true;
  pointerStartPos = { x: e.clientX, y: e.clientY };
  pointerMoved = false;

  // Capture pointer to prevent touch events leaking to overlay elements
  canvas.setPointerCapture(e.pointerId);

  // Auto-play audio on first interaction (only if user hasn't disabled it)
  if (!hasAutoPlayed && userAudioPreference === "true") {
    hasAutoPlayed = true;
    playAudio();
  }

  // Show hover state on touch tap
  if (e.pointerType === "touch") {
    updateMouseFromEvent(e);
    updateHoverStates(getIntersectedMeshes());
  }
});

canvas.addEventListener("pointermove", e => {
  if (isPointerDown) {
    // Check drag threshold using screen pixels
    const dx = e.clientX - pointerStartPos.x;
    const dy = e.clientY - pointerStartPos.y;
    if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
      pointerMoved = true;
      resetAllHoverStates();
    }
  } else if (e.pointerType !== "touch") {
    // Hover updates for mouse/pen only (not touch)
    // Throttle to animation frame to avoid excessive raycasting
    if (!pendingHoverUpdate) {
      pendingHoverUpdate = true;
      requestAnimationFrame(() => {
        pendingHoverUpdate = false;
        if (!isPointerDown) {
          updateMouseFromEvent(e);
          const intersects = getIntersectedMeshes();
          updateHoverStates(intersects);
          updateCursor(intersects);
        }
      });
    }
  }
});

canvas.addEventListener("pointerup", e => {
  if (!pointerMoved && isPointerDown) {
    updateMouseFromEvent(e);
    handleClick(getIntersectedMeshes());
  }
  isPointerDown = false;
  pointerMoved = false;

  // Clear hover on touch release
  if (e.pointerType === "touch") {
    resetAllHoverStates();
  }
});

// Handle pointer release outside canvas
window.addEventListener("pointerup", () => {
  isPointerDown = false;
  pointerMoved = false;
});

canvas.addEventListener("pointercancel", () => {
  isPointerDown = false;
  pointerMoved = false;
  resetAllHoverStates();
});

canvas.addEventListener("pointerleave", () => {
  // Only reset if not actively dragging
  if (!isPointerDown) {
    resetAllHoverStates();
    updateCursor([]);
  }
});

// =============================================================================
// AUDIO CONTROL
// =============================================================================

const audioToggle = document.getElementById("audio-toggle");
const audioIconOn = document.getElementById("audio-icon-on");
const audioIconOff = document.getElementById("audio-icon-off");
const nowPlaying = document.getElementById("now-playing");

const audioPlayer = document.getElementById("audio-player");
const playPauseBtn = document.querySelector(".play-pause-btn");
const playIcon = document.querySelector(".play-icon");
const pauseIcon = document.querySelector(".pause-icon");
const prevBtn = document.querySelector(".prev-btn");
const nextBtn = document.querySelector(".next-btn");
const progressBar = document.querySelector(".progress-bar");
const timeCurrent = document.querySelector(".time-current");
const timeDuration = document.querySelector(".time-duration");
const trackTitle = document.querySelector(".track-title");
const trackArtist = document.querySelector(".track-artist");
const playlistItems = document.querySelector(".playlist-items");

let isAudioPlaying = false;
let hasAutoPlayed = false;
let currentTrackIndex = 0;
let isUpdatingProgress = false;
let isPlayerLoaded = false;

// Autoplay preference
const AUDIO_PREFERENCE_KEY = "audioEnabled";
let userAudioPreference = localStorage.getItem(AUDIO_PREFERENCE_KEY);
if (userAudioPreference === null) {
  userAudioPreference = "true";
}

const playlist = [
  {
    title: "promises",
    artist: "kate",
    src: "/music/promises.mp3",
    duration: "4:05",
  },
  {
    title: "offset",
    artist: "kate",
    src: "/music/offset.mp3",
    duration: "3:53",
  },
  {
    title: "Arabesque No. 1",
    artist: "Claude Debussy, kate",
    src: "/music/arabesque.mp3",
    duration: "5:02",
  },
  {
    title: "Intermezzo, Op. 118 No. 2",
    artist: "Johannes Brahms, kate",
    src: "/music/intermezzo.mp3",
    duration: "5:39",
  },
  {
    title: "Daydreaming",
    artist: "Radiohead, kate",
    src: "/music/daydreaming.mp3",
    duration: "2:54",
  },
  {
    title: "august",
    artist: "kate, with orchestra",
    src: "/music/august.mp3",
    duration: "5:58",
  },
  {
    title: "a lot can change in a year",
    artist: "Johannes Brahms, kate",
    src: "/music/alot.mp3",
    duration: "3:44",
  },
  {
    title: "Children's Corner, L. 113: I",
    artist: "Claude Debussy, kate",
    src: "/music/childrens.mp3",
    duration: "2:36",
  },
];

// Initialize player (lazy - doesn't load audio yet)
function initPlayer() {
  loadTrack(currentTrackIndex);
  updateTrackInfo(currentTrackIndex);
  updatePlaylistUI();
}

function lazyLoadPlayer() {
  if (isPlayerLoaded) return;
  isPlayerLoaded = true;
  loadTrack(currentTrackIndex);
}

function updateNowPlayingText(track) {
  const titleSpan = nowPlaying.querySelector(".now-playing-title");
  const artistSpan = nowPlaying.querySelector(".now-playing-artist");

  if (titleSpan) {
    titleSpan.textContent = track.title;
  }
  if (artistSpan) {
    if (track.title.length < 11) {
      const displayArtist = track.artist.length > 10 ? track.artist.split(",")[0] : track.artist;
      artistSpan.textContent = "by " + displayArtist;
    } else {
      artistSpan.textContent = "";
    }
  }
}

function updateTrackInfo(index) {
  const track = playlist[index];
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  updateNowPlayingText(track);
}

function loadTrack(index) {
  const track = playlist[index];
  audioPlayer.src = track.src;
  audioPlayer.currentTime = 0;
  timeCurrent.textContent = "0:00";
  timeDuration.textContent = track.duration;
  progressBar.value = 0;
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  updateNowPlayingText(track);
  updatePlaylistUI();
}

function updatePlaylistUI() {
  playlistItems.innerHTML = "";
  playlist.forEach((track, index) => {
    const item = document.createElement("div");
    item.className = "playlist-item" + (index === currentTrackIndex ? " active" : "");
    item.innerHTML = `
      <div class="playlist-item-info">
        <div class="playlist-item-title">${track.title}</div>
        <div class="playlist-item-artist">${track.artist}</div>
      </div>
      <div class="playlist-item-duration">${track.duration}</div>
    `;
    item.addEventListener("click", () => {
      currentTrackIndex = index;
      loadTrack(index);
      setTimeout(playAudio, 300);
    });
    playlistItems.appendChild(item);

    // Auto-scroll to active item
    if (index === currentTrackIndex) {
      setTimeout(() => {
        item.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  });
}

function playAudio() {
  lazyLoadPlayer();
  audioPlayer.play().catch(error => {
    console.log("Audio playback failed:", error);
    setTimeout(() => audioPlayer.play(), 300);
  });
  localStorage.setItem(AUDIO_PREFERENCE_KEY, "true");
  userAudioPreference = "true";
}

function pauseAudio() {
  audioPlayer.pause();
  localStorage.setItem(AUDIO_PREFERENCE_KEY, "false");
  userAudioPreference = "false";
}

function togglePlayPause() {
  if (isAudioPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function nextTrack() {
  lazyLoadPlayer();
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
  loadTrack(currentTrackIndex);
  setTimeout(playAudio, 300);
  // playAudio();
}

function prevTrack() {
  lazyLoadPlayer();
  currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrackIndex);
  setTimeout(playAudio, 300);
  // playAudio();
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Audio player event listeners
audioPlayer.addEventListener("play", () => {
  isAudioPlaying = true;
  playIcon.style.display = "none";
  pauseIcon.style.display = "block";
  audioIconOn.style.display = "block";
  audioIconOff.style.display = "none";
  nowPlaying.classList.add("visible");
});

audioPlayer.addEventListener("pause", () => {
  isAudioPlaying = false;
  playIcon.style.display = "block";
  pauseIcon.style.display = "none";
  audioIconOn.style.display = "none";
  audioIconOff.style.display = "block";
  nowPlaying.classList.remove("visible");
});

audioPlayer.addEventListener("timeupdate", () => {
  if (!isUpdatingProgress) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBar.value = progress || 0;
    timeCurrent.textContent = formatTime(audioPlayer.currentTime);
  }
});

audioPlayer.addEventListener("loadedmetadata", () => {
  timeDuration.textContent = formatTime(audioPlayer.duration);
  progressBar.value = 0;
});

audioPlayer.addEventListener("ended", () => {
  nextTrack();
});

audioPlayer.addEventListener("error", () => {
  console.log("Audio loading failed:", audioPlayer.error);
});

// Control button listeners
playPauseBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", nextTrack);
prevBtn.addEventListener("click", prevTrack);

// Progress bar
progressBar.addEventListener("mousedown", () => {
  isUpdatingProgress = true;
});

progressBar.addEventListener("input", () => {
  const seekTime = (progressBar.value / 100) * audioPlayer.duration;
  audioPlayer.currentTime = seekTime;
  timeCurrent.textContent = formatTime(seekTime);
});

progressBar.addEventListener("mouseup", () => {
  isUpdatingProgress = false;
});

progressBar.addEventListener("touchstart", () => {
  isUpdatingProgress = true;
});

progressBar.addEventListener("touchend", () => {
  isUpdatingProgress = false;
});

progressBar.addEventListener("touchcancel", () => {
  isUpdatingProgress = false;
});

// Top-left toggle button
audioToggle.addEventListener("click", togglePlayPause);

// Now playing click
nowPlaying.addEventListener("click", showMusicPanel);
nowPlaying.style.cursor = "pointer";

// Initialize
initPlayer();

// =============================================================================
// NIGHT MODE CONTROL
// =============================================================================

const nightModeToggle = document.getElementById("night-mode-toggle");
const sunIcon = document.getElementById("sun-icon");
const moonIcon = document.getElementById("moon-icon");

// Initialize UI from saved preference
if (isNightMode) {
  sunIcon.style.display = "none";
  moonIcon.style.display = "block";
  document.body.classList.add("night-mode");
}

nightModeToggle.addEventListener("click", () => {
  if (nightTransition !== nightTransitionTarget) return;
  isNightMode = !isNightMode;
  nightTransitionTarget = isNightMode ? 1 : 0;
  document.body.classList.toggle("night-mode", isNightMode);

  // Auto-play audio on first interaction (only if user hasn't disabled it)
  if (!hasAutoPlayed && userAudioPreference === "true") {
    hasAutoPlayed = true;
    playAudio();
  }

  // Update icons
  if (isNightMode) {
    sunIcon.style.display = "none";
    moonIcon.style.display = "block";
  } else {
    sunIcon.style.display = "block";
    moonIcon.style.display = "none";
  }

  // Persist preference
  localStorage.setItem(NIGHT_MODE_KEY, isNightMode.toString());
});

// =============================================================================
// LIGHTING
// =============================================================================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
scene.add(hemisphereLight);

const pointLight = new THREE.PointLight(0xffffff, 1.5, 50);
pointLight.position.set(0, 8, 10);
pointLight.castShadow = true;
pointLight.shadow.radius = 4;
pointLight.shadow.bias = -0.001;
scene.add(pointLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
dirLight.shadow.radius = 3;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);
scene.add(dirLight.target);

const textLight = new THREE.PointLight(0xffffff, 2, 30);
textLight.position.set(0, 8, 15);
scene.add(textLight);

const rimLight = new THREE.PointLight(0xffffff, 1.5, 30);
rimLight.position.set(0, 5, 5);
scene.add(rimLight);

const textFillLight = new THREE.PointLight(0xaabbff, 0, 25);
textFillLight.position.set(0, 6, 30);
scene.add(textFillLight);

// =============================================================================
// LOADING MANAGER
// =============================================================================

const loadingOverlay = document.getElementById("loading-overlay");
const loadingManager = new THREE.LoadingManager();

loadingManager.onLoad = () => {
  // Small delay to ensure first frame renders completely
  requestAnimationFrame(() => {
    loadingOverlay.classList.add("fade-out");
  });
};

// =============================================================================
// TEXTURES
// =============================================================================

const loader = new THREE.TextureLoader(loadingManager);
const grassTexture = loader.load("/textures/blade_diffuse.jpg");
const alphaMap = loader.load("/textures/blade_alpha.jpg");
const noiseTexture = loader.load("/textures/perlinFbm.jpg");
noiseTexture.wrapS = THREE.RepeatWrapping;
noiseTexture.wrapT = THREE.RepeatWrapping;

// =============================================================================
// SHADERS - SHARED
// =============================================================================

const sharedPrefix = `
uniform sampler2D noiseTexture;
float getYPosition(vec2 p) {
return 8.0 * (2.0 * texture2D(noiseTexture, p / 800.0).r - 1.0);
}
`;

// =============================================================================
// SHADERS - SKY
// =============================================================================

const skyFragmentShader = `
varying vec2 vUv;
uniform vec2 resolution;
uniform vec3 sunDirection;
uniform float fogFade;
uniform float fov;
uniform float time;
uniform float cloudSpeed;

// Night mode uniforms
uniform vec3 skyColour;
uniform vec3 fogColorA;
uniform vec3 fogColorB;
uniform vec3 cloudBaseColor;
uniform vec3 cloudShadowColor;
uniform vec3 sunGlowColor;
uniform float starIntensity;

vec3 getSkyColour(vec3 rayDir) {
return mix(0.35 * skyColour, skyColour, pow(1.0 - rayDir.y, 4.0));
}

// Star field function for night sky
float stars(vec3 rayDir, float time) {
if (starIntensity < 0.01) return 0.0;
if (rayDir.y < 0.1) return 0.0; // No stars near horizon

vec3 p = rayDir * 300.0;
vec3 id = floor(p);
vec3 fp = fract(p) - 0.5;

float h = fract(sin(dot(id, vec3(127.1, 311.7, 74.7))) * 43758.5453);
float size = h * 0.5 + 0.5;
float brightness = step(0.965, h); // Only ~3% of cells have stars
float star = brightness * smoothstep(0.2 * size, 0.0, length(fp));

// Fade stars near horizon
float horizonFade = smoothstep(0.1, 0.3, rayDir.y);

return star * starIntensity * horizonFade;
}

vec3 applyFog(vec3 rgb, vec3 rayOri, vec3 rayDir, vec3 sunDir) {
float dist = 4000.0;
if (abs(rayDir.y) < 0.0001) rayDir.y = 0.0001;
float fogAmount = 1.0 * exp(-rayOri.y * fogFade) * (1.0 - exp(-dist * rayDir.y * fogFade)) / (rayDir.y * fogFade);
float sunAmount = max(dot(rayDir, sunDir), 0.0);
vec3 fogColor = mix(fogColorA, fogColorB, pow(sunAmount, 16.0));
return mix(rgb, fogColor, clamp(fogAmount, 0.0, 1.0));
}

vec3 ACESFilm(vec3 x) {
float a = 2.51;
float b = 0.03;
float c = 2.43;
float d = 0.59;
float e = 0.14;
return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
vec2 xy = fragCoord - resolution.xy / 2.0;
float z = (0.5 * resolution.y) / tan(radians(fieldOfView) / 2.0);
return normalize(vec3(xy, -z));
}

mat3 lookAt(vec3 camera, vec3 at, vec3 up) {
vec3 zaxis = normalize(at - camera);
vec3 xaxis = normalize(cross(zaxis, up));
vec3 yaxis = cross(xaxis, zaxis);
return mat3(xaxis, yaxis, -zaxis);
}

float getGlow(float dist, float radius, float intensity) {
dist = max(dist, 1e-6);
return pow(radius / dist, intensity);
}

float hash(vec2 p, float seed) {
return fract(sin(dot(p + seed * 13.5, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p, float seed) {
vec2 i = floor(p);
vec2 f = fract(p);
f = f * f * (3.0 - 2.0 * f);
float a = hash(i, seed);
float b = hash(i + vec2(1.0, 0.0), seed);
float c = hash(i + vec2(0.0, 1.0), seed);
float d = hash(i + vec2(1.0, 1.0), seed);
return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, float seed) {
float sum = 0.0;
float amp = 0.5;
float freq = 1.0;
for (int i = 0; i < 4; i++) {
  sum += noise(p * freq, seed + float(i) * 7.3) * amp;
  amp *= 0.5;
  freq *= 2.0;
}
return sum;
}

float cloudNoise(vec2 p, float time, float seed) {
  vec2 offset = vec2(time * cloudSpeed + seed, seed * 23.7);
  float n = fbm(p * 1.2 + offset, seed);
  n += fbm(p * 2.5 + offset * 1.2, seed + 100.0) * 0.35;
  return n;
}

float getCloudLayer(vec3 rayDir, float time, float seed, float height) {
if (rayDir.y < 0.15) return 0.0;
float heightFactor = smoothstep(0.15, height, rayDir.y) * (1.0 - smoothstep(height, 0.6, rayDir.y));
vec2 cloudPos = vec2(rayDir.x, rayDir.z) / rayDir.y * (height * 4.0);
float density = cloudNoise(cloudPos, time, seed);
density = smoothstep(0.6, 0.9, density);
return density * heightFactor;
}

float getCloudDensity(vec3 rayDir, float time) {
float layer1 = getCloudLayer(rayDir, time, 0.0, 0.25);
float layer2 = getCloudLayer(rayDir, time, 42.0, 0.4) * 0.5;
return min(layer1 + layer2, 1.0);
}

void main() {
vec3 target = vec3(0.0, 0.0, 0.0);
vec3 up = vec3(0.0, 1.0, 0.0);
vec3 rayDir = rayDirection(fov, gl_FragCoord.xy);
mat3 viewMatrix_ = lookAt(cameraPosition, target, up);
rayDir = viewMatrix_ * rayDir;
vec3 col = getSkyColour(rayDir);

col += vec3(stars(rayDir, time));

vec3 sunDir = normalize(sunDirection);
float mu = dot(sunDir, rayDir);

float cloudDensity = getCloudDensity(rayDir, time);
float sunAmount = max(mu, 0.0);
vec3 cloudColor = mix(cloudShadowColor, cloudBaseColor, 0.4 + sunAmount * 0.6);

float edgeFade = smoothstep(0.0, 0.3, rayDir.y);
col = mix(col, cloudColor, cloudDensity * 0.6 * edgeFade);

col += sunGlowColor * getGlow(1.0 - mu, 0.00005, 0.9);
col += applyFog(col, vec3(0, 1000, 0), rayDir, sunDir);
col = ACESFilm(col);
col = pow(col, vec3(0.4545));
gl_FragColor = vec4(col, 1.0);
}
`;

const backgroundMaterial = new THREE.ShaderMaterial({
  uniforms: {
    sunDirection: { value: sunDirection },
    resolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
    fogFade: { value: config.fogFade },
    fov: { value: config.fov },
    time: { value: 0 },
    cloudSpeed: { value: 0.12 },
    skyColour: { value: dayConfig.skyColour.clone() },
    fogColorA: { value: dayConfig.fogColorA.clone() },
    fogColorB: { value: dayConfig.fogColorB.clone() },
    cloudBaseColor: { value: dayConfig.cloudBase.clone() },
    cloudShadowColor: { value: dayConfig.cloudShadow.clone() },
    sunGlowColor: { value: dayConfig.sunGlow.clone() },
    starIntensity: { value: 0 },
  },
  vertexShader: `
  varying vec2 vUv;
  void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
  }
`,
  fragmentShader: skyFragmentShader,
});
backgroundMaterial.depthWrite = false;

const backgroundGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
backgroundScene.add(background);

// =============================================================================
// GROUND
// =============================================================================

const groundVertexPrefix =
  sharedPrefix +
  `
attribute vec3 basePosition;
uniform float delta;
uniform float posX;
uniform float posZ;
uniform float radius;
uniform float width;

float placeOnSphere(vec3 v) {
float theta = acos(clamp(v.z / radius, -1.0, 1.0));
float sinTheta = sin(theta);
if (abs(sinTheta) < 0.0001) {
  return v.y;
}
float phi = acos(clamp(v.x / (radius * sinTheta), -1.0, 1.0));
float sV = radius * sinTheta * sin(phi);
return sV;
}

vec3 getPosition(vec3 pos, float epsX, float epsZ) {
vec3 temp;
temp.x = pos.x + epsX;
temp.z = pos.z + epsZ;
temp.y = max(0.0, placeOnSphere(temp)) - radius;
temp.y += getYPosition(vec2(basePosition.x + epsX + delta * floor(posX), basePosition.z + epsZ + delta * floor(posZ)));
return temp;
}

vec3 getNormal(vec3 pos) {
float eps = 1e-1;
vec3 tempP = getPosition(pos, eps, 0.0);
vec3 tempN = getPosition(pos, -eps, 0.0);
vec3 slopeX = tempP - tempN;
tempP = getPosition(pos, 0.0, eps);
tempN = getPosition(pos, 0.0, -eps);
vec3 slopeZ = tempP - tempN;
vec3 norm = normalize(cross(slopeZ, slopeX));
return norm;
}
`;

const groundBaseGeometry = new THREE.PlaneGeometry(
  config.width,
  config.width,
  config.resolution,
  config.resolution
);
groundBaseGeometry.lookAt(new THREE.Vector3(0, 1, 0));

const groundGeometry = new THREE.PlaneGeometry(
  config.width,
  config.width,
  config.resolution,
  config.resolution
);
groundGeometry.setAttribute("basePosition", groundBaseGeometry.getAttribute("position"));
groundGeometry.lookAt(new THREE.Vector3(0, 1, 0));

const groundMaterial = new THREE.MeshPhongMaterial({
  color: new THREE.Color("rgb(10%, 25%, 2%)"),
  shininess: 10,
});

groundMaterial.onBeforeCompile = function (shader) {
  shader.uniforms.delta = { value: delta };
  shader.uniforms.posX = { value: pos.x };
  shader.uniforms.posZ = { value: pos.y };
  shader.uniforms.radius = { value: config.radius };
  shader.uniforms.width = { value: config.width };
  shader.uniforms.noiseTexture = { value: noiseTexture };
  shader.vertexShader = groundVertexPrefix + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    "#include <beginnormal_vertex>",
    `vec3 pos = vec3(0);
  pos.x = basePosition.x - mod(mod((delta * posX), delta) + delta, delta);
  pos.z = basePosition.z - mod(mod((delta * posZ), delta) + delta, delta);
  pos.y = max(0.0, placeOnSphere(pos)) - radius;
  pos.y += getYPosition(vec2(basePosition.x + delta * floor(posX), basePosition.z + delta * floor(posZ)));
  vec3 objectNormal = getNormal(pos);
  #ifdef USE_TANGENT
  vec3 objectTangent = vec3(tangent.xyz);
  #endif`
  );
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `vec3 transformed = vec3(pos);`
  );
  groundShader = shader;
};

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.receiveShadow = true;
ground.geometry.computeVertexNormals();
scene.add(ground);

// =============================================================================
// GRASS SHADERS
// =============================================================================

const grassVertexSource =
  sharedPrefix +
  `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
attribute vec3 offset;
attribute vec2 uv;
attribute vec2 halfRootAngle;
attribute float scale;
attribute float index;
uniform float time;

uniform float delta;
uniform float posX;
uniform float posZ;
uniform float radius;
uniform float width;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float frc;
varying float idx;

const float PI = 3.1415;
const float TWO_PI = 2.0 * PI;

vec3 rotateVectorByQuaternion(vec3 v, vec4 q) {
return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
}

float placeOnSphere(vec3 v) {
float theta = acos(clamp(v.z / radius, -1.0, 1.0));
float sinTheta = sin(theta);
if (abs(sinTheta) < 0.0001) {
  return v.y;
}
float phi = acos(clamp(v.x / (radius * sinTheta), -1.0, 1.0));
float sV = radius * sinTheta * sin(phi);
return sV;
}

void main() {
frc = position.y / float(${config.bladeHeight});
vec3 localPosition = position;
localPosition.y *= scale;
vNormal = normal;
vNormal.y /= scale;
vec4 direction = vec4(0.0, halfRootAngle.x, 0.0, halfRootAngle.y);
localPosition = rotateVectorByQuaternion(localPosition, direction);
vNormal = rotateVectorByQuaternion(vNormal, direction);
vUv = uv;

vec3 pos;
vec3 globalPos;
vec3 tile;

globalPos.x = offset.x - posX * delta;
globalPos.z = offset.z - posZ * delta;

tile.x = floor((globalPos.x + 0.5 * width) / width);
tile.z = floor((globalPos.z + 0.5 * width) / width);

pos.x = globalPos.x - tile.x * width;
pos.z = globalPos.z - tile.z * width;

pos.y = max(0.0, placeOnSphere(pos)) - radius;
pos.y += getYPosition(vec2(pos.x + delta * posX, pos.z + delta * posZ));

vec2 fractionalPos = 0.5 + offset.xz / width;
fractionalPos *= TWO_PI;

// Per-blade variation using index for phase offset and speed variation
float bladePhase = index * TWO_PI * 17.0; // pseudo-random phase per blade
float speedVar = 0.95 + 0.1 * fract(index * 127.1); // speed varies 0.95-1.05x

// Primary wind wave
float noise = 0.5 + 0.5 * sin(fractionalPos.x + time * 2.5 * speedVar + bladePhase);
float halfAngle = -noise * 0.1;

// Secondary wave at different frequency for complexity
noise = 0.5 + 0.5 * cos(fractionalPos.y + time * 2.5 * speedVar + bladePhase * 0.7);
halfAngle -= noise * 0.05;

direction = normalize(vec4(sin(halfAngle), 0.0, -sin(halfAngle), cos(halfAngle)));

localPosition = rotateVectorByQuaternion(localPosition, direction);
vNormal = rotateVectorByQuaternion(vNormal, direction);
localPosition += pos;

idx = index;
vPosition = localPosition;
gl_Position = projectionMatrix * modelViewMatrix * vec4(localPosition, 1.0);
}`;

const grassFragmentSource = `
precision mediump float;
uniform vec3 cameraPosition;
uniform float ambientStrength;
uniform float diffuseStrength;
uniform float specularStrength;
uniform float translucencyStrength;
uniform float shininess;
uniform vec3 lightColour;
uniform vec3 sunDirection;
uniform sampler2D map;
uniform sampler2D alphaMap;
uniform vec3 specularColour;
uniform float grassBrightness;

varying float frc;
varying float idx;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

vec3 ACESFilm(vec3 x) {
float a = 2.51;
float b = 0.03;
float c = 2.43;
float d = 0.59;
float e = 0.14;
return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
if (texture2D(alphaMap, vUv).r < 0.15) discard;

vec3 normal;
if (gl_FrontFacing) normal = normalize(vNormal);
else normal = normalize(-vNormal);

vec3 textureColour = pow(texture2D(map, vUv).rgb, vec3(2.2));
vec3 mixColour = idx > 0.75 ? vec3(0.2, 0.8, 0.06) : vec3(0.5, 0.8, 0.08);
textureColour = mix(0.1 * mixColour, textureColour, 0.75);

vec3 lightTimesTexture = lightColour * textureColour;
vec3 ambient = textureColour;
vec3 lightDir = normalize(sunDirection);

float dotNormalLight = dot(normal, lightDir);
float diff = max(dotNormalLight, 0.0);
vec3 diffuse = diff * lightTimesTexture;

float sky = max(dot(normal, vec3(0, 1, 0)), 0.0);
vec3 skyLight = sky * vec3(0.12, 0.29, 0.55);

vec3 viewDirection = normalize(cameraPosition - vPosition);
vec3 halfwayDir = normalize(lightDir + viewDirection);
float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
vec3 specular = spec * specularColour * lightColour;

vec3 diffuseTranslucency = vec3(0);
vec3 forwardTranslucency = vec3(0);
float dotViewLight = dot(-lightDir, viewDirection);
if (dotNormalLight <= 0.0) {
  diffuseTranslucency = lightTimesTexture * translucencyStrength * -dotNormalLight;
  if (dotViewLight > 0.0) {
  forwardTranslucency = lightTimesTexture * translucencyStrength * pow(dotViewLight, 16.0);
  }
}

vec3 col = 0.3 * skyLight * textureColour + ambientStrength * ambient + diffuseStrength * diffuse + specularStrength * specular + diffuseTranslucency + forwardTranslucency;
col = mix(0.35 * vec3(0.1, 0.25, 0.02), col, frc);
col *= grassBrightness;
col = ACESFilm(col);
col = pow(col, vec3(0.4545));
gl_FragColor = vec4(col, 1.0);
}`;

// =============================================================================
// GRASS GEOMETRY
// =============================================================================

const grassBaseGeometry = new THREE.PlaneGeometry(
  config.bladeWidth,
  config.bladeHeight,
  1,
  config.joints
);
grassBaseGeometry.translate(0, config.bladeHeight / 2, 0);

// Apply blade curvature
const vertex = new THREE.Vector3();
const quaternion0 = new THREE.Quaternion();
const quaternion1 = new THREE.Quaternion();
const quaternion2 = new THREE.Quaternion();

let angle = 0.05;
let sinAngle = Math.sin(angle / 2.0);
let rotationAxis = new THREE.Vector3(0, 1, 0);
quaternion0.set(
  rotationAxis.x * sinAngle,
  rotationAxis.y * sinAngle,
  rotationAxis.z * sinAngle,
  Math.cos(angle / 2.0)
);

angle = 0.3;
sinAngle = Math.sin(angle / 2.0);
rotationAxis.set(1, 0, 0);
quaternion1.set(
  rotationAxis.x * sinAngle,
  rotationAxis.y * sinAngle,
  rotationAxis.z * sinAngle,
  Math.cos(angle / 2.0)
);
quaternion0.multiply(quaternion1);

angle = 0.1;
sinAngle = Math.sin(angle / 2.0);
rotationAxis.set(0, 0, 1);
quaternion1.set(
  rotationAxis.x * sinAngle,
  rotationAxis.y * sinAngle,
  rotationAxis.z * sinAngle,
  Math.cos(angle / 2.0)
);
quaternion0.multiply(quaternion1);

for (let v = 0; v < grassBaseGeometry.attributes.position.array.length; v += 3) {
  quaternion2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  vertex.x = grassBaseGeometry.attributes.position.array[v];
  vertex.y = grassBaseGeometry.attributes.position.array[v + 1];
  vertex.z = grassBaseGeometry.attributes.position.array[v + 2];
  const frac = vertex.y / config.bladeHeight;
  quaternion2.slerp(quaternion0, frac);
  vertex.applyQuaternion(quaternion2);
  grassBaseGeometry.attributes.position.array[v] = vertex.x;
  grassBaseGeometry.attributes.position.array[v + 1] = vertex.y;
  grassBaseGeometry.attributes.position.array[v + 2] = vertex.z;
}
grassBaseGeometry.computeVertexNormals();

// =============================================================================
// GRASS INSTANCING
// =============================================================================

const instancedGeometry = new THREE.InstancedBufferGeometry();
instancedGeometry.index = grassBaseGeometry.index;
instancedGeometry.attributes.position = grassBaseGeometry.attributes.position;
instancedGeometry.attributes.uv = grassBaseGeometry.attributes.uv;
instancedGeometry.attributes.normal = grassBaseGeometry.attributes.normal;

const indices = [];
const offsets = [];
const scales = [];
const halfRootAngles = [];

for (let i = 0; i < config.instances; i++) {
  indices.push(i / config.instances);
  const x = Math.random() * config.width - config.width / 2;
  const z = Math.random() * config.width - config.width / 2;
  offsets.push(x, 0, z);
  const bladeAngle = Math.PI - Math.random() * (2 * Math.PI);
  halfRootAngles.push(Math.sin(0.5 * bladeAngle), Math.cos(0.5 * bladeAngle));
  scales.push(i % 3 !== 0 ? 2.0 + Math.random() * 1.25 : 2.0 + Math.random());
}

instancedGeometry.setAttribute(
  "offset",
  new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
);
instancedGeometry.setAttribute(
  "scale",
  new THREE.InstancedBufferAttribute(new Float32Array(scales), 1)
);
instancedGeometry.setAttribute(
  "halfRootAngle",
  new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngles), 2)
);
instancedGeometry.setAttribute(
  "index",
  new THREE.InstancedBufferAttribute(new Float32Array(indices), 1)
);

// =============================================================================
// GRASS MATERIAL & MESH
// =============================================================================

const grassMaterial = new THREE.RawShaderMaterial({
  uniforms: {
    time: { value: 0 },
    delta: { value: delta },
    posX: { value: pos.x },
    posZ: { value: pos.y },
    radius: { value: config.radius },
    width: { value: config.width },
    map: { value: grassTexture },
    alphaMap: { value: alphaMap },
    noiseTexture: { value: noiseTexture },
    sunDirection: { value: sunDirection },
    cameraPosition: { value: camera.position },
    ambientStrength: { value: config.ambientStrength },
    translucencyStrength: { value: config.translucencyStrength },
    diffuseStrength: { value: config.diffuseStrength },
    specularStrength: { value: config.specularStrength },
    shininess: { value: config.shininess },
    lightColour: { value: config.sunColour },
    specularColour: { value: config.specularColour },
    grassBrightness: { value: dayConfig.grassBrightness },
  },
  vertexShader: grassVertexSource,
  fragmentShader: grassFragmentSource,
  side: THREE.DoubleSide,
});

const grass = new THREE.Mesh(instancedGeometry, grassMaterial);
scene.add(grass);

// =============================================================================
// WIND PARTICLES
// =============================================================================

const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(config.particleCount * 3);
const particleVelocities = new Float32Array(config.particleCount * 3);
const particleSizes = new Float32Array(config.particleCount);

for (let i = 0; i < config.particleCount; i++) {
  const i3 = i * 3;
  particlePositions[i3] = Math.random() * 120 - 60;
  particlePositions[i3 + 1] = Math.random() * 15 - 3;
  particlePositions[i3 + 2] = Math.random() * 140 - 70;

  particleVelocities[i3] = Math.random() * 0.5 + 0.3;
  particleVelocities[i3 + 1] = Math.random() * 0.2 - 0.1;
  particleVelocities[i3 + 2] = Math.random() * 0.4 - 0.15;

  particleSizes[i] = Math.random() * 0.15 + 0.5;
}

particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
particleGeometry.setAttribute("size", new THREE.BufferAttribute(particleSizes, 1));

// Create circular particle texture
const particleCanvas = document.createElement("canvas");
particleCanvas.width = 32;
particleCanvas.height = 32;
const ctx = particleCanvas.getContext("2d");
const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 32, 32);
const particleTexture = new THREE.CanvasTexture(particleCanvas);

const particleMaterial = new THREE.PointsMaterial({
  color: config.particleColor,
  size: config.particleSize,
  map: particleTexture,
  transparent: true,
  opacity: dayConfig.particleOpacity,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
  depthWrite: false,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// =============================================================================
// FLOATING TEXT
// =============================================================================

const fontLoader = new FontLoader(loadingManager);

function createTextMaterial() {
  return new THREE.MeshPhongMaterial({
    color: "rgb(221, 97, 192))",
    specular: 0xffffff,
    shininess: 60,
    emissive: "rgb(160, 172, 96)",
    emissiveIntensity: 0.25,
  });
}

function createLinkMeshes(font, textMesh, textMaterial) {
  let maxDescender = 0;

  // First pass: create geometries, compute widths, find max descender
  linkData.forEach(item => {
    const geometry = new TextGeometry(item.label, {
      font: font,
      size: config.linkTextSize,
      height: 0.67,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.05,
      bevelOffset: -0.015,
      bevelSegments: 6,
    });

    geometry.computeBoundingBox();
    const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
    if (geometry.boundingBox.min.y < maxDescender) {
      maxDescender = geometry.boundingBox.min.y;
    }
    item.geometry = geometry;
    item.width = width;
  });

  // Compute total row width: sum of all link widths + gaps between them
  const totalWidth =
    linkData.reduce((sum, item) => sum + item.width, 0) + (linkData.length - 1) * config.linkGap;

  // Second pass: create meshes and hitboxes with accumulated positioning
  // currentX tracks the left edge of each link
  let currentX = -totalWidth / 2;

  linkData.forEach(item => {
    // Center geometry so it scales from center
    const centerX = -item.width / 2;
    item.geometry.translate(centerX - item.geometry.boundingBox.min.x, -maxDescender, 1);

    const linkMesh = new THREE.Mesh(item.geometry, textMaterial);
    linkMesh.castShadow = true;
    linkMesh.receiveShadow = true;
    linkMesh.name = item.label;
    linkMesh.userData.url = item.url;
    linkMesh.userData.action = item.action;
    linkMesh.position.set(currentX + item.width / 2, -2.5, 1);

    const linkLight = new THREE.PointLight(0xffddaa, 3, 8);
    linkLight.position.set(0.3, 0.5, 7);
    linkMesh.add(linkLight);
    item.light = linkLight;

    textMesh.add(linkMesh);
    registerClickableMesh(linkMesh);

    const linkBox = item.geometry.boundingBox;
    const linkW = linkBox.max.x - linkBox.min.x;
    const linkH = linkBox.max.y - linkBox.min.y;
    const linkHitbox = new THREE.Mesh(
      new THREE.PlaneGeometry(linkW + 1, linkH + 0.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    // Center hitbox on the link
    linkHitbox.position.set(currentX + item.width / 2, -2.5, 0.5);
    linkHitbox.name = item.label;
    linkHitbox.userData.url = item.url;
    linkHitbox.userData.action = item.action;
    textMesh.add(linkHitbox);
    registerClickableMesh(linkHitbox);

    // Advance position for next link
    currentX += item.width + config.linkGap;
  });
}

fontLoader.load("/fonts/helvetiker_regular.typeface.json", function (font) {
  // Create a group to hold everything - this handles position and camera-facing
  const textGroup = new THREE.Group();
  textGroup.position.set(0, config.textYPosition, config.textZPosition);
  textGroup.name = "textGroup";
  scene.add(textGroup);

  // Store reference and apply responsive settings for initial load
  textGroupRef = textGroup;
  applyResponsiveSettings();

  const textGeometry = new TextGeometry("kate", {
    font: font,
    depth: 100,
    size: config.mainTextSize,
    height: 2,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.15,
    bevelSegments: 8,
  });

  textGeometry.computeBoundingBox();
  const xOffset = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
  textGeometry.translate(xOffset, 0, 0);

  const textMaterial = createTextMaterial();
  textMaterialRef = textMaterial;

  // Apply night mode if already active (since font loads async)
  if (isNightMode) {
    textMaterial.color.set(nightConfig.textColor);
    textMaterial.emissive.set(nightConfig.textEmissive);
    textMaterial.emissiveIntensity = nightConfig.textEmissiveIntensity;
  }

  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.castShadow = true;
  textMesh.receiveShadow = true;
  textMesh.name = "floatingText";
  textMesh.userData.url = null;
  textGroup.add(textMesh);
  registerClickableMesh(textMesh);

  // Create hitbox for main text
  const textBox = textGeometry.boundingBox;
  const textWidth = textBox.max.x - textBox.min.x;
  const textHeight = textBox.max.y - textBox.min.y;
  const textHitbox = new THREE.Mesh(
    new THREE.PlaneGeometry(textWidth + 1, textHeight + 1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  // Position in local space: centered on text geometry
  textHitbox.position.set(0, textHeight / 2, 1.5);
  textHitbox.name = "floatingText";
  textHitbox.userData.url = null;
  textMesh.add(textHitbox);
  registerClickableMesh(textHitbox);

  // Underglow
  const underglowSpacing = textWidth / 2.5;

  for (let i = 0; i < 3; i++) {
    const underglowLight = new THREE.PointLight(0xff66cc, 2.5, 8);
    const xPos = -underglowSpacing + i * underglowSpacing;
    underglowLight.position.set(xPos, -1.7, 0.7);
    textGroup.add(underglowLight);
  }

  // Links are added to the group, not textMesh, so they don't twirl
  createLinkMeshes(font, textGroup, textMaterial);
});

// =============================================================================
// WINDOW RESIZE HANDLER
// =============================================================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  backgroundMaterial.uniforms.resolution.value.set(canvas.width, canvas.height);
  backgroundMaterial.uniforms.fov.value = config.fov;
  applyResponsiveSettings();
  controls.update();
});

// =============================================================================
// ANIMATION LOOP
// =============================================================================

let time = 0;
let lastFrame = performance.now();

function updateParticles(dt) {
  const positions = particleGeometry.attributes.position.array;
  const totalSpeedMultiplier = particleSpeedMultiplier + particleSpeedBoost;

  for (let i = 0; i < config.particleCount; i++) {
    const i3 = i * 3;

    const windStrength = (1.67 + 0.3 * Math.sin(time * 0.5 + i * 0.1)) * totalSpeedMultiplier;
    positions[i3] += particleVelocities[i3] * dt * windStrength;
    positions[i3 + 1] +=
      particleVelocities[i3 + 1] * dt * totalSpeedMultiplier +
      Math.sin(time * 2 + i * 0.5) * dt * 0.2;
    positions[i3 + 2] += particleVelocities[i3 + 2] * dt * totalSpeedMultiplier;

    // Wrap particles around boundaries
    if (positions[i3] > 60) positions[i3] = -60;
    if (positions[i3] < -60) positions[i3] = 60;
    if (positions[i3 + 1] > 20) positions[i3 + 1] = -2;
    if (positions[i3 + 1] < -3) positions[i3 + 1] = 16;
    if (positions[i3 + 2] > 80) positions[i3 + 2] = -80;
    if (positions[i3 + 2] < -80) positions[i3 + 2] = 80;
  }

  particleGeometry.attributes.position.needsUpdate = true;
}

function updateHoverAnimations() {
  hoverState.forEach((state, uuid) => {
    const mesh = meshByUuid.get(uuid);
    if (mesh) {
      state.current += (state.target - state.current) * config.hoverEase;
      mesh.scale.setScalar(state.current);
    }
  });
}

function updateFloatingText(dt) {
  const textGroup = scene.getObjectByName("textGroup");
  const textMesh = scene.getObjectByName("floatingText");
  if (!textGroup || !textMesh) return;

  // Base bobbing animation for the whole group
  const yOffset = Math.sin(time * config.textBobSpeed) * config.textBobAmplitude;
  textGroup.position.y = config.textYPosition + yOffset;

  // Calculate target rotation to face camera (Y-axis only) - applied to group
  textDirection.subVectors(camera.position, textGroup.position);
  textDirection.y = 0;
  textDirection.normalize();

  textTargetMatrix.lookAt(textDirection, ORIGIN, UP);
  textTargetQuaternion.setFromRotationMatrix(textTargetMatrix);

  textCurrentQuaternion.slerp(textTargetQuaternion, config.textRotationDamping);
  textGroup.quaternion.copy(textCurrentQuaternion);

  // Click animation: twirl and jump - applied only to main text mesh
  if (textClickAnimating) {
    textClickAnimationTime += dt;
    const progress = Math.min(textClickAnimationTime / textClickAnimationDuration, 1);

    const easeOut = 1 - Math.pow(1 - progress, 4);

    // Jump: parabolic arc (up and down)
    const jumpProgress = Math.sin(progress * Math.PI);
    textMesh.position.y = easeOut * jumpProgress * textJumpHeight;

    // Twirl: full rotation with ease-out
    textMesh.rotation.y = easeOut * Math.PI * 2 * textTwirlRotations;

    // End animation
    if (progress >= 1) {
      textClickAnimating = false;
      textClickAnimationTime = 0;
      textMesh.position.y = 0;
      textMesh.rotation.y = 0;
    }
  }

  // Position all text-affecting lights relative to camera for consistent illumination
  textToCamera.copy(textDirection);
  textPerpendicular.set(-textToCamera.z, 0, textToCamera.x); // perpendicular on XZ plane

  // Main front light - between camera and text
  textLight.position.set(
    textGroup.position.x + textToCamera.x * 8,
    textGroup.position.y + 3,
    textGroup.position.z + textToCamera.z * 8
  );

  // Point light - slightly offset to the side for depth
  pointLight.position.set(
    textGroup.position.x + textToCamera.x * 6 + textPerpendicular.x * 3,
    textGroup.position.y + 3,
    textGroup.position.z + textToCamera.z * 6 + textPerpendicular.z * 3
  );

  // Directional light - from above and front
  dirLight.position.set(
    textGroup.position.x + textToCamera.x * 5,
    textGroup.position.y + 8,
    textGroup.position.z + textToCamera.z * 5
  );
  dirLight.target.position.copy(textGroup.position);

  // Rim light - behind text for edge highlights
  rimLight.position.set(
    textGroup.position.x - textToCamera.x * 5,
    textGroup.position.y + 2,
    textGroup.position.z - textToCamera.z * 5
  );
}

// =============================================================================
// NIGHT MODE TRANSITION
// =============================================================================

function lerpValue(a, b, t) {
  return a + (b - a) * t;
}

function lerpVector3(target, a, b, t) {
  target.x = lerpValue(a.x, b.x, t);
  target.y = lerpValue(a.y, b.y, t);
  target.z = lerpValue(a.z, b.z, t);
}

function updateNightMode(dt) {
  // Check if transition is needed
  if (Math.abs(nightTransition - nightTransitionTarget) < 0.001) {
    nightTransition = nightTransitionTarget;
    particleSpeedBoost = 0;
    return;
  }

  // Animate transition
  const direction = nightTransitionTarget > nightTransition ? 1 : -1;
  nightTransition = Math.max(0, Math.min(1, nightTransition + direction * 0.6 * dt));

  // Ease in-out cubic for smooth feel
  const t = nightTransition;
  const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Dramatically accelerate clouds and particles during transition - peaks in the middle, eases at edges
  const speedCurve = Math.pow(Math.sin(t * Math.PI), 2); // gentler bell curve
  cloudTimeOffset += dt * 100 * speedCurve;
  particleSpeedBoost = 8 * speedCurve; // 8x speed boost at peak

  // Interpolate sun
  const elevation = lerpValue(dayConfig.elevation, nightConfig.elevation, easedT);
  const azimuth = lerpValue(dayConfig.azimuth, nightConfig.azimuth, easedT);
  sunDirection.set(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth));

  // Interpolate sky shader uniforms
  lerpVector3(
    backgroundMaterial.uniforms.skyColour.value,
    dayConfig.skyColour,
    nightConfig.skyColour,
    easedT
  );
  lerpVector3(
    backgroundMaterial.uniforms.fogColorA.value,
    dayConfig.fogColorA,
    nightConfig.fogColorA,
    easedT
  );
  lerpVector3(
    backgroundMaterial.uniforms.fogColorB.value,
    dayConfig.fogColorB,
    nightConfig.fogColorB,
    easedT
  );
  lerpVector3(
    backgroundMaterial.uniforms.cloudBaseColor.value,
    dayConfig.cloudBase,
    nightConfig.cloudBase,
    easedT
  );
  lerpVector3(
    backgroundMaterial.uniforms.cloudShadowColor.value,
    dayConfig.cloudShadow,
    nightConfig.cloudShadow,
    easedT
  );
  lerpVector3(
    backgroundMaterial.uniforms.sunGlowColor.value,
    dayConfig.sunGlow,
    nightConfig.sunGlow,
    easedT
  );
  backgroundMaterial.uniforms.starIntensity.value = easedT;

  // Interpolate lighting
  ambientLight.intensity = lerpValue(
    dayConfig.ambientIntensity,
    nightConfig.ambientIntensity,
    easedT
  );
  dirLight.intensity = lerpValue(
    dayConfig.dirLightIntensity,
    nightConfig.dirLightIntensity,
    easedT
  );
  pointLight.intensity = lerpValue(
    dayConfig.pointLightIntensity,
    nightConfig.pointLightIntensity,
    easedT
  );

  // Interpolate particle opacity, color, and speed (sweep away at night)
  particleMaterial.opacity = lerpValue(
    dayConfig.particleOpacity,
    nightConfig.particleOpacity,
    easedT
  );
  const dayParticleColor = new THREE.Color(dayConfig.particleColor);
  const nightParticleColor = new THREE.Color(nightConfig.particleColor);
  particleMaterial.color.lerpColors(dayParticleColor, nightParticleColor, easedT);
  particleSpeedMultiplier = lerpValue(
    dayConfig.particleSpeedMultiplier,
    nightConfig.particleSpeedMultiplier,
    easedT
  );

  // Interpolate tone mapping exposure
  renderer.toneMappingExposure = lerpValue(
    dayConfig.toneMappingExposure,
    nightConfig.toneMappingExposure,
    easedT
  );

  // Interpolate text material (warm glow at night)
  if (textMaterialRef) {
    const dayTextColor = new THREE.Color(dayConfig.textColor);
    const nightTextColor = new THREE.Color(nightConfig.textColor);
    textMaterialRef.color.lerpColors(dayTextColor, nightTextColor, easedT);

    const dayEmissive = new THREE.Color(dayConfig.textEmissive);
    const nightEmissive = new THREE.Color(nightConfig.textEmissive);
    textMaterialRef.emissive.lerpColors(dayEmissive, nightEmissive, easedT);

    textMaterialRef.emissiveIntensity = lerpValue(
      dayConfig.textEmissiveIntensity,
      nightConfig.textEmissiveIntensity,
      easedT
    );
  }

  // Interpolate grass brightness
  grassMaterial.uniforms.grassBrightness.value = lerpValue(
    dayConfig.grassBrightness,
    nightConfig.grassBrightness,
    easedT
  );

  // Interpolate text-specific lighting for night readability
  textLight.intensity = lerpValue(
    dayConfig.textLightIntensity,
    nightConfig.textLightIntensity,
    easedT
  );
  rimLight.intensity = lerpValue(
    dayConfig.rimLightIntensity,
    nightConfig.rimLightIntensity,
    easedT
  );
}

// Apply initial night mode state if loaded from localStorage
function applyInitialNightMode() {
  if (isNightMode) {
    sunDirection.set(
      Math.sin(nightConfig.azimuth),
      Math.sin(nightConfig.elevation),
      -Math.cos(nightConfig.azimuth)
    );

    backgroundMaterial.uniforms.skyColour.value.copy(nightConfig.skyColour);
    backgroundMaterial.uniforms.fogColorA.value.copy(nightConfig.fogColorA);
    backgroundMaterial.uniforms.fogColorB.value.copy(nightConfig.fogColorB);
    backgroundMaterial.uniforms.cloudBaseColor.value.copy(nightConfig.cloudBase);
    backgroundMaterial.uniforms.cloudShadowColor.value.copy(nightConfig.cloudShadow);
    backgroundMaterial.uniforms.sunGlowColor.value.copy(nightConfig.sunGlow);
    backgroundMaterial.uniforms.starIntensity.value = 1;

    ambientLight.intensity = nightConfig.ambientIntensity;
    dirLight.intensity = nightConfig.dirLightIntensity;
    pointLight.intensity = nightConfig.pointLightIntensity;

    particleMaterial.opacity = nightConfig.particleOpacity;
    particleMaterial.color.set(nightConfig.particleColor);
    particleSpeedMultiplier = nightConfig.particleSpeedMultiplier;
    renderer.toneMappingExposure = nightConfig.toneMappingExposure;
    grassMaterial.uniforms.grassBrightness.value = nightConfig.grassBrightness;

    // Set text material (if already loaded)
    if (textMaterialRef) {
      textMaterialRef.color.set(nightConfig.textColor);
      textMaterialRef.emissive.set(nightConfig.textEmissive);
      textMaterialRef.emissiveIntensity = nightConfig.textEmissiveIntensity;
    }

    // Set text-specific lighting for night readability
    textLight.intensity = nightConfig.textLightIntensity;
    rimLight.intensity = nightConfig.rimLightIntensity;
  }
}

function animate() {
  const now = performance.now();
  let dt = (now - lastFrame) / 1000;
  dt = Math.min(dt, 0.1);
  lastFrame = now;
  time += dt;

  // Update uniforms
  grassMaterial.uniforms.time.value = time;
  backgroundMaterial.uniforms.time.value = time + cloudTimeOffset;

  // Update night mode transition
  updateNightMode(dt);

  // Update animations
  updateHoverAnimations();
  updateFloatingText(dt);
  updateParticles(dt);

  // Update controls
  controls.update();

  // Render
  renderer.clear();
  renderer.render(backgroundScene, camera);
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

applyInitialNightMode();

animate();
