import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SiteAction } from "@/content/site";
import { config, dayConfig } from "./config";
import { loadAssets } from "./assets";
import { createBackgroundScene } from "./background";
import { createGround } from "./ground";
import { createGrass } from "./grass";
import { createParticles } from "./particles";
import { createLighting } from "./lighting";
import { createText } from "./text";
import { createInteraction } from "./interaction";
import { createNightMode } from "./night";

export interface Garden {
  readonly transitioning: boolean;
  setNightMode(night: boolean): void;
  setPanelOpen(open: boolean): void;
  dispose(): void;
}

export async function createGarden(options: {
  canvas: HTMLCanvasElement;
  getNightMode(): boolean;
  signal: AbortSignal;
  onAction(action: SiteAction): void;
  onGesture(): void;
  onError(error: unknown): void;
}): Promise<Garden> {
  const { canvas, signal, onAction, onGesture, onError } = options;
  const cleanups: (() => void)[] = [];
  let disposed = false;
  let frame = 0;
  const events = new AbortController();
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    events.abort();
    signal.removeEventListener("abort", dispose);
    for (const cleanup of cleanups.reverse()) cleanup();
  }
  function own<T extends { dispose(): void }>(resource: T): T {
    cleanups.push(() => resource.dispose());
    return resource;
  }
  try {
    const assets = own(await loadAssets(signal));
    signal.throwIfAborted();
    signal.addEventListener("abort", dispose, { once: true });
    const renderer = own(new THREE.WebGLRenderer({ antialias: true, canvas }));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dayConfig.toneMappingExposure;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(config.fov);
    camera.position.set(config.cameraPosition.x, config.cameraPosition.y, config.cameraPosition.z);
    scene.add(camera);
    const controls = own(new OrbitControls(camera, canvas));
    controls.target.set(config.cameraTarget.x, config.cameraTarget.y, config.cameraTarget.z);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.minDistance = config.minDistance;
    controls.maxDistance = config.maxDistance;
    controls.autoRotateSpeed = config.autoRotateSpeed;
    controls.minPolarAngle = config.minPolarAngle;
    controls.maxPolarAngle = config.maxPolarAngle;
    controls.update();

    const sunDirection = new THREE.Vector3(
      Math.sin(config.azimuth),
      Math.sin(config.elevation),
      -Math.cos(config.azimuth)
    );
    const delta = config.width / config.resolution;
    const position = new THREE.Vector2();
    const background = own(createBackgroundScene(config, dayConfig, sunDirection, canvas));
    const ground = own(createGround(config, assets.textures.noiseTexture, delta, position));
    const grass = own(
      createGrass(config, dayConfig, assets.textures, camera, sunDirection, delta, position)
    );
    const particles = own(createParticles(config, dayConfig));
    const lighting = own(createLighting());
    const text = own(createText(assets.font));
    scene.add(ground.mesh, grass.mesh, particles.mesh, lighting.group, text.group);
    const theme = createNightMode(
      {
        backgroundMaterial: background.material,
        grassMaterial: grass.material,
        particleMaterial: particles.material,
        textMaterialRef: text.material,
        ...lighting,
        renderer,
      },
      sunDirection,
      options.getNightMode()
    );
    const interaction = own(
      createInteraction({
        canvas,
        camera,
        targets: text.targets,
        onGesture,
        onHover: text.setHovered,
        onAction(action) {
          if (action.type === "animate") text.triggerAnimation();
          else onAction(action);
        },
      })
    );
    function resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      background.material.uniforms.resolution.value.set(canvas.width, canvas.height);
      text.resize(window.innerWidth);
      controls.update();
    }
    window.addEventListener("resize", resize, { signal: events.signal });
    resize();
    let time = 0;
    let lastFrame = performance.now();
    function render() {
      const now = performance.now();
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      time += dt;
      theme.update(dt);
      grass.material.uniforms.time.value = time;
      background.material.uniforms.time.value = time + theme.cloudTimeOffset;
      text.update(dt, time, camera);
      lighting.update(text.group.position, text.direction);
      particles.update(dt, time, theme.particleSpeed);
      controls.update();
      renderer.clear();
      renderer.render(background.scene, camera);
      renderer.render(scene, camera);
    }
    function animate() {
      if (disposed) return;
      try {
        render();
        frame = requestAnimationFrame(animate);
      } catch (error) {
        dispose();
        onError(error);
      }
    }
    // Readiness includes the first frame, so startup failures reach the fallback.
    render();
    frame = requestAnimationFrame(animate);
    return {
      get transitioning() {
        return theme.transitioning;
      },
      setNightMode: theme.setNightMode,
      setPanelOpen(open) {
        controls.autoRotate = !open;
        controls.enabled = !open;
        interaction.setEnabled(!open);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
