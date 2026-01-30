// =============================================================================
// EARLY DEVICE CHECK & REDIRECT
// =============================================================================
// This runs before Three.js imports to avoid loading heavy assets on slow devices

import { getGPUTier } from "detect-gpu";

async function getDeviceTier(): Promise<DeviceTier> {
  try {
    const gpuTier = await getGPUTier({
      desktopTiers: [0, 15, 30, 60],
      mobileTiers: [0, 15, 30, 60],
    });

    if (gpuTier.tier >= 3) return "high";
    return "low";
  } catch {
    // Fallback: android low
    return /Android/i.test(navigator.userAgent) ? "low" : "high";
  }
}

const deviceTier = await getDeviceTier();
if (deviceTier !== "high") {
  window.location.replace("/lite.html");
  throw new Error("Redirecting to lite version");
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { config, dayConfig, nightConfig, linkData } from "@/config";
import { createBackgroundScene } from "@/scene/background";
import { createGround } from "@/scene/ground";
import { createGrass } from "@/scene/grass";
import { createParticles } from "@/scene/particles";
import { updateNightMode, applyInitialNightMode } from "@/nightMode";
import type {
  HoverState,
  NightModeState,
  NightModeRefs,
  Track,
  LinkDataItem,
  GrassTextures,
  DeviceTier,
} from "@/types";

// =============================================================================
// DERIVED VALUES & STATE
// =============================================================================

// Device tier already checked at top - only "high" reaches here

// // Show lite version button for medium/low device tiers
// if (deviceTier !== "high") {
//   const liteVersionBtn = document.getElementById("lite-version");
//   if (liteVersionBtn) {
//     liteVersionBtn.classList.remove("hidden");
//     // Fade in after a short delay
//     setTimeout(() => liteVersionBtn.classList.add("visible"), 600);
//   }
// }

let textGroupRef: THREE.Group | null = null;
let textMaterialRef: THREE.MeshPhongMaterial | null = null;

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
const clickableMeshes: THREE.Mesh[] = [];
const hoverState = new Map<string, HoverState>();
const meshByUuid = new Map<string, THREE.Mesh>();

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

function applyResponsiveSettings(): void {
  const isMobile = window.innerWidth <= config.responsive.mobileBreakpoint;
  if (textGroupRef) {
    const scale = isMobile ? config.responsive.mobileTextScale : 1.0;
    textGroupRef.scale.setScalar(scale);
  }
}

// =============================================================================
// RENDERER SETUP
// =============================================================================

const canvas = document.getElementById("webgl") as HTMLCanvasElement;
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

function updateMouseFromEvent(event: PointerEvent | MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function getIntersectedMeshes(): THREE.Intersection[] {
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(clickableMeshes);
}

function updateHoverStates(intersects: THREE.Intersection[]): void {
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

function resetAllHoverStates(): void {
  hoverState.forEach(state => {
    state.target = 1;
  });
}

function updateCursor(intersects: THREE.Intersection[]): void {
  const hasClickable = intersects.some(
    i => i.object.userData.url || i.object.userData.action || i.object.name === "floatingText"
  );
  document.body.style.cursor = hasClickable ? "pointer" : "default";
}

function triggerTextClickAnimation(): void {
  if (!textClickAnimating) {
    textClickAnimating = true;
    textClickAnimationTime = 0;
  }
}

function handleClick(intersects: THREE.Intersection[]): void {
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

const contentOverlay = document.getElementById("content-overlay") as HTMLElement;
const contentClose = document.getElementById("content-close") as HTMLElement;
const aboutContent = document.getElementById("about-content") as HTMLElement;
const musicContent = document.getElementById("music-content") as HTMLElement;

function showOverlay(contentType: "about" | "music"): void {
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

function hideOverlay(): void {
  contentOverlay.classList.remove("visible");
  contentOverlay.addEventListener("transitionend", function handler() {
    if (!contentOverlay.classList.contains("visible")) {
      contentOverlay.classList.add("hidden");
    }
    contentOverlay.removeEventListener("transitionend", handler);
  });
  controls.autoRotate = true;
}

function showAboutPanel(): void {
  showOverlay("about");
}

function showMusicPanel(): void {
  showOverlay("music");
}

contentClose.addEventListener("click", e => {
  e.preventDefault();
  hideOverlay();
});
contentOverlay.addEventListener("click", e => {
  if (e.target === contentOverlay) {
    e.preventDefault();
    hideOverlay();
  }
});

function registerClickableMesh(mesh: THREE.Mesh): void {
  clickableMeshes.push(mesh);
  meshByUuid.set(mesh.uuid, mesh);
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

canvas.addEventListener("pointerdown", e => {
  e.preventDefault();
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
  e.preventDefault();
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
  e.preventDefault();
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
window.addEventListener("pointerup", e => {
  e.preventDefault();
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

const audioToggle = document.getElementById("audio-toggle") as HTMLElement;
const audioIconOn = document.getElementById("audio-icon-on") as HTMLElement;
const audioIconOff = document.getElementById("audio-icon-off") as HTMLElement;
const nowPlaying = document.getElementById("now-playing") as HTMLElement;

const audioPlayer = document.getElementById("audio-player") as HTMLAudioElement;
const playPauseBtn = document.querySelector(".play-pause-btn") as HTMLElement;
const playIcon = document.querySelector(".play-icon") as HTMLElement;
const pauseIcon = document.querySelector(".pause-icon") as HTMLElement;
const prevBtn = document.querySelector(".prev-btn") as HTMLElement;
const nextBtn = document.querySelector(".next-btn") as HTMLElement;
const progressBar = document.querySelector(".progress-bar") as HTMLInputElement;
const timeCurrent = document.querySelector(".time-current") as HTMLElement;
const timeDuration = document.querySelector(".time-duration") as HTMLElement;
const trackTitle = document.querySelector(".track-title") as HTMLElement;
const trackArtist = document.querySelector(".track-artist") as HTMLElement;
const playlistItems = document.querySelector(".playlist-items") as HTMLElement;

let isAudioPlaying = false;
let hasAutoPlayed = false;
let currentTrackIndex = 0;
let isUpdatingProgress = false;
let isPlayerLoaded = false;

// Autoplay preference
const AUDIO_PREFERENCE_KEY = "audioEnabled";
let userAudioPreference: string | null = localStorage.getItem(AUDIO_PREFERENCE_KEY);
if (userAudioPreference === null) {
  userAudioPreference = "true";
}

const playlist: Track[] = [
  {
    title: "promises",
    artist: "kate",
    src: "/music/promises.mp3",
    duration: "4:07",
  },
  {
    title: "Arabesque No. 1",
    artist: "Claude Debussy, kate",
    src: "/music/arabesque.mp3",
    duration: "5:02",
  },
  {
    title: "offsets",
    artist: "kate",
    src: "/music/offset.mp3",
    duration: "3:58",
  },
  {
    title: "Intermezzo, Op. 118 No. 2",
    artist: "Johannes Brahms, kate",
    src: "/music/intermezzo.mp3",
    duration: "5:38",
  },
  {
    title: "Daydreaming",
    artist: "Radiohead, kate",
    src: "/music/daydreaming.mp3",
    duration: "2:19",
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
    duration: "2:38",
  },
];

// Initialize player (lazy - doesn't load audio yet)
function initPlayer(): void {
  loadTrack(currentTrackIndex);
  updateTrackInfo(currentTrackIndex);
  updatePlaylistUI();
}

function lazyLoadPlayer(): void {
  if (isPlayerLoaded) return;
  isPlayerLoaded = true;
  loadTrack(currentTrackIndex);
}

function updateNowPlayingText(track: Track): void {
  const titleSpan = nowPlaying.querySelector(".now-playing-title");
  const artistSpan = nowPlaying.querySelector(".now-playing-artist");

  if (titleSpan) {
    titleSpan.textContent = track.title;
  }
  if (artistSpan) {
    if (track.title.length < 12) {
      const displayArtist = track.artist.length > 10 ? track.artist.split(",")[0] : track.artist;
      artistSpan.textContent = "by " + displayArtist;
    } else {
      artistSpan.textContent = "";
    }
  }
}

function updateTrackInfo(index: number): void {
  const track = playlist[index];
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  updateNowPlayingText(track);
}

function loadTrack(index: number): void {
  const track = playlist[index];
  audioPlayer.src = track.src;
  audioPlayer.currentTime = 0;
  timeCurrent.textContent = "0:00";
  timeDuration.textContent = track.duration;
  progressBar.value = "0";
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  updateNowPlayingText(track);
  updatePlaylistUI();
}

function updatePlaylistUI(): void {
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
    item.addEventListener("click", e => {
      e.preventDefault();
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

function playAudio(): void {
  lazyLoadPlayer();
  audioPlayer.play().catch(error => {
    console.log("Audio playback failed:", error);
    setTimeout(() => audioPlayer.play(), 300);
  });
  localStorage.setItem(AUDIO_PREFERENCE_KEY, "true");
  userAudioPreference = "true";
}

function pauseAudio(): void {
  audioPlayer.pause();
  localStorage.setItem(AUDIO_PREFERENCE_KEY, "false");
  userAudioPreference = "false";
}

function togglePlayPause(): void {
  if (isAudioPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function nextTrack(): void {
  lazyLoadPlayer();
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
  loadTrack(currentTrackIndex);
  setTimeout(playAudio, 300);
}

function prevTrack(): void {
  lazyLoadPlayer();
  currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrackIndex);
  setTimeout(playAudio, 300);
}

function formatTime(seconds: number): string {
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
    progressBar.value = String(progress || 0);
    timeCurrent.textContent = formatTime(audioPlayer.currentTime);
  }
});

audioPlayer.addEventListener("loadedmetadata", () => {
  timeDuration.textContent = formatTime(audioPlayer.duration);
  progressBar.value = "0";
});

audioPlayer.addEventListener("ended", () => {
  nextTrack();
});

audioPlayer.addEventListener("error", () => {
  console.log("Audio loading failed:", audioPlayer.error);
});

// Control button listeners
playPauseBtn.addEventListener("click", e => {
  e.preventDefault();
  togglePlayPause();
});
nextBtn.addEventListener("click", e => {
  e.preventDefault();
  nextTrack();
});
prevBtn.addEventListener("click", e => {
  e.preventDefault();
  prevTrack();
});

// Progress bar
progressBar.addEventListener("mousedown", () => {
  isUpdatingProgress = true;
});

progressBar.addEventListener("input", () => {
  const seekTime = (parseFloat(progressBar.value) / 100) * audioPlayer.duration;
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
audioToggle.addEventListener("click", e => {
  e.preventDefault();
  togglePlayPause();
});

// Now playing click
nowPlaying.addEventListener("click", e => {
  e.preventDefault();
  showMusicPanel();
});
nowPlaying.style.cursor = "pointer";

// Initialize
initPlayer();

// =============================================================================
// NIGHT MODE CONTROL
// =============================================================================

const nightModeToggle = document.getElementById("night-mode-toggle") as HTMLElement;
const sunIcon = document.getElementById("sun-icon") as HTMLElement;
const moonIcon = document.getElementById("moon-icon") as HTMLElement;

// Initialize UI from saved preference
if (isNightMode) {
  sunIcon.style.display = "none";
  moonIcon.style.display = "block";
  document.body.classList.add("night-mode");
}

nightModeToggle.addEventListener("click", e => {
  e.preventDefault();
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

const loadingOverlay = document.getElementById("loading-overlay") as HTMLElement;
const loadingManager = new THREE.LoadingManager();

loadingManager.onLoad = () => {
  requestAnimationFrame(() => {
    loadingOverlay.classList.add("fade-out");
    fetchViewCount();
  });
};

async function fetchViewCount(): Promise<void> {
  try {
    const res = await fetch("/api/views");
    if (res.ok) {
      const data = await res.json();
      const viewCountEl = document.getElementById("view-count");
      const viewCounterEl = document.getElementById("view-counter");
      if (viewCountEl && viewCounterEl && data.count) {
        viewCountEl.textContent = data.count.toLocaleString();
        viewCounterEl.classList.add("loaded");
      }
    }
  } catch (e) {
    console.log("View counter unavailable");
  }
}

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
// BACKGROUND SCENE (SKY)
// =============================================================================

const { scene: backgroundScene, material: backgroundMaterial } = createBackgroundScene(
  config,
  dayConfig,
  sunDirection,
  canvas
);

// =============================================================================
// GROUND
// =============================================================================

const groundResult = createGround(config, noiseTexture, delta, pos);
scene.add(groundResult.mesh);
// The shader is captured async via onBeforeCompile, access via groundResult.getShader()

// =============================================================================
// GRASS
// =============================================================================

const textures: GrassTextures = { grassTexture, alphaMap, noiseTexture };
const { mesh: grass, material: grassMaterial } = createGrass(
  config,
  dayConfig,
  textures,
  camera,
  sunDirection,
  delta,
  pos
);
scene.add(grass);

// =============================================================================
// WIND PARTICLES
// =============================================================================

const {
  mesh: particles,
  material: particleMaterial,
  velocities: particleVelocities,
  geometry: particleGeometry,
} = createParticles(config, dayConfig);
scene.add(particles);

// =============================================================================
// FLOATING TEXT
// =============================================================================

const fontLoader = new FontLoader(loadingManager);

function createTextMaterial(): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: "rgb(221, 97, 192))",
    specular: 0xffffff,
    shininess: 60,
    emissive: "rgb(160, 172, 96)",
    emissiveIntensity: 0.25,
  });
}

function createLinkMeshes(
  font: Font,
  textMesh: THREE.Group,
  textMaterial: THREE.MeshPhongMaterial
): void {
  let maxDescender = 0;

  // First pass: create geometries, compute widths, find max descender
  linkData.forEach((item: LinkDataItem) => {
    const geometry = new TextGeometry(item.label, {
      font: font,
      size: config.linkTextSize,
      depth: 0.67,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.05,
      bevelOffset: -0.015,
      bevelSegments: 6,
    });

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const width = bbox.max.x - bbox.min.x;
    if (bbox.min.y < maxDescender) {
      maxDescender = bbox.min.y;
    }
    item.geometry = geometry;
    item.width = width;
  });

  // Compute total row width: sum of all link widths + gaps between them
  const totalWidth =
    linkData.reduce((sum, item) => sum + (item.width ?? 0), 0) +
    (linkData.length - 1) * config.linkGap;

  // Second pass: create meshes and hitboxes with accumulated positioning
  // currentX tracks the left edge of each link
  let currentX = -totalWidth / 2;

  linkData.forEach((item: LinkDataItem) => {
    const geometry = item.geometry!;
    const width = item.width!;
    const bbox = geometry.boundingBox!;

    // Center geometry so it scales from center
    const centerX = -width / 2;
    geometry.translate(centerX - bbox.min.x, -maxDescender, 1);

    const linkMesh = new THREE.Mesh(geometry, textMaterial);
    linkMesh.castShadow = true;
    linkMesh.receiveShadow = true;
    linkMesh.name = item.label;
    linkMesh.userData.url = item.url;
    linkMesh.userData.action = item.action;
    linkMesh.position.set(currentX + width / 2, -2.5, 1);

    const linkLight = new THREE.PointLight(0xffddaa, 3, 8);
    linkLight.position.set(0.3, 0.5, 7);
    linkMesh.add(linkLight);
    item.light = linkLight;

    textMesh.add(linkMesh);
    registerClickableMesh(linkMesh);

    const linkBox = geometry.boundingBox!;
    const linkW = linkBox.max.x - linkBox.min.x;
    const linkH = linkBox.max.y - linkBox.min.y;
    const linkHitbox = new THREE.Mesh(
      new THREE.PlaneGeometry(linkW + 1, linkH + 0.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    // Center hitbox on the link
    linkHitbox.position.set(currentX + width / 2, -2.5, 0.5);
    linkHitbox.name = item.label;
    linkHitbox.userData.url = item.url;
    linkHitbox.userData.action = item.action;
    textMesh.add(linkHitbox);
    registerClickableMesh(linkHitbox);

    // Advance position for next link
    currentX += width + config.linkGap;
  });
}

fontLoader.load("/fonts/helvetiker_regular.typeface.json", function (font: Font) {
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
    size: config.mainTextSize,
    depth: 2,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.15,
    bevelSegments: 8,
  });

  textGeometry.computeBoundingBox();
  const bbox = textGeometry.boundingBox!;
  const xOffset = -0.5 * (bbox.max.x - bbox.min.x);
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
  const textBox = textGeometry.boundingBox!;
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

// Create state and refs objects for night mode system
const nightModeState: NightModeState = {
  isNightMode,
  nightTransition,
  nightTransitionTarget,
  particleSpeedMultiplier,
  particleSpeedBoost,
  cloudTimeOffset,
  sunDirection,
};

const nightModeRefs: NightModeRefs = {
  backgroundMaterial,
  grassMaterial,
  particleMaterial,
  textMaterialRef: null, // Will be set when text loads
  ambientLight,
  dirLight,
  pointLight,
  textLight,
  rimLight,
  renderer,
};

function updateParticles(dt: number): void {
  const positions = particleGeometry.attributes.position.array as Float32Array;
  const totalSpeedMultiplier =
    nightModeState.particleSpeedMultiplier + nightModeState.particleSpeedBoost;

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

function updateHoverAnimations(): void {
  hoverState.forEach((state, uuid) => {
    const mesh = meshByUuid.get(uuid);
    if (mesh) {
      state.current += (state.target - state.current) * config.hoverEase;
      mesh.scale.setScalar(state.current);
    }
  });
}

function updateFloatingText(dt: number): void {
  const textGroup = scene.getObjectByName("textGroup") as THREE.Group | undefined;
  const textMesh = scene.getObjectByName("floatingText") as THREE.Mesh | undefined;
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

// Sync local state with nightModeState for night mode toggle
function syncNightModeState(): void {
  nightModeState.isNightMode = isNightMode;
  nightModeState.nightTransition = nightTransition;
  nightModeState.nightTransitionTarget = nightTransitionTarget;
  nightModeRefs.textMaterialRef = textMaterialRef;
}

// Sync back from nightModeState to local variables
function syncFromNightModeState(): void {
  nightTransition = nightModeState.nightTransition;
  nightTransitionTarget = nightModeState.nightTransitionTarget;
  particleSpeedMultiplier = nightModeState.particleSpeedMultiplier;
  particleSpeedBoost = nightModeState.particleSpeedBoost;
  cloudTimeOffset = nightModeState.cloudTimeOffset;
}

function animate(): void {
  const now = performance.now();
  let dt = (now - lastFrame) / 1000;
  dt = Math.min(dt, 0.1);
  lastFrame = now;
  time += dt;

  // Update uniforms
  grassMaterial.uniforms.time.value = time;
  backgroundMaterial.uniforms.time.value = time + nightModeState.cloudTimeOffset;

  // Sync state before night mode update
  syncNightModeState();

  // Update night mode transition
  updateNightMode(dt, nightModeState, nightModeRefs, dayConfig, nightConfig);

  // Sync back after night mode update
  syncFromNightModeState();

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

let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  e => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 500) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  },
  false
);

// Apply initial night mode
syncNightModeState();
applyInitialNightMode(nightModeState, nightModeRefs, dayConfig, nightConfig);
syncFromNightModeState();

animate();
