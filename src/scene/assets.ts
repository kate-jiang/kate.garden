import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

export async function loadAssets(signal: AbortSignal, timeoutMs = 15000) {
  const textures = new Set<THREE.Texture>();
  const loader = new THREE.TextureLoader();
  let disposed = false;
  function dispose() {
    disposed = true;
    textures.forEach(texture => texture.dispose());
    textures.clear();
  }
  async function loadTexture(url: string) {
    const texture = await loader.loadAsync(url);
    if (disposed) texture.dispose();
    else textures.add(texture);
    return texture;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  try {
    signal.throwIfAborted();
    const [font, grassTexture, alphaMap, noiseTexture] = await Promise.race([
      Promise.all([
        new FontLoader().loadAsync("/helvetiker.json"),
        loadTexture("/textures/blade_diffuse.jpg"),
        loadTexture("/textures/blade_alpha.jpg"),
        loadTexture("/textures/perlinFbm.jpg"),
      ]),
      new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        timer = setTimeout(() => reject(new Error("Garden assets timed out")), timeoutMs);
      }),
    ]);
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    return { font, textures: { grassTexture, alphaMap, noiseTexture }, dispose };
  } catch (error) {
    dispose();
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
