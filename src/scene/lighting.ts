import * as THREE from "three";
import { disposeObject } from "./resources";

export function createLighting() {
  const group = new THREE.Group();
  const textToCamera = new THREE.Vector3();
  const textPerpendicular = new THREE.Vector3();
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  group.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
  group.add(hemisphereLight);

  const pointLight = new THREE.PointLight(0xffffff, 1.5, 50);
  pointLight.position.set(0, 8, 10);
  pointLight.castShadow = true;
  pointLight.shadow.radius = 4;
  pointLight.shadow.bias = -0.001;
  group.add(pointLight);

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
  group.add(dirLight);
  group.add(dirLight.target);

  const textLight = new THREE.PointLight(0xffffff, 2, 30);
  textLight.position.set(0, 8, 15);
  group.add(textLight);

  const rimLight = new THREE.PointLight(0xffffff, 1.5, 30);
  rimLight.position.set(0, 5, 5);
  group.add(rimLight);

  const textFillLight = new THREE.PointLight(0xaabbff, 0, 25);
  textFillLight.position.set(0, 6, 30);
  group.add(textFillLight);

  function update(position: THREE.Vector3, direction: THREE.Vector3) {
    // Position all text-affecting lights relative to camera for consistent illumination
    textToCamera.copy(direction);
    textPerpendicular.set(-textToCamera.z, 0, textToCamera.x); // perpendicular on XZ plane

    // Main front light - between camera and text
    textLight.position.set(
      position.x + textToCamera.x * 8,
      position.y + 3,
      position.z + textToCamera.z * 8
    );

    // Point light - slightly offset to the side for depth
    pointLight.position.set(
      position.x + textToCamera.x * 6 + textPerpendicular.x * 3,
      position.y + 3,
      position.z + textToCamera.z * 6 + textPerpendicular.z * 3
    );

    // Directional light - from above and front
    dirLight.position.set(
      position.x + textToCamera.x * 5,
      position.y + 8,
      position.z + textToCamera.z * 5
    );
    dirLight.target.position.copy(position);

    // Rim light - behind text for edge highlights
    rimLight.position.set(
      position.x - textToCamera.x * 5,
      position.y + 2,
      position.z - textToCamera.z * 5
    );
  }
  return {
    group,
    ambientLight,
    dirLight,
    pointLight,
    textLight,
    rimLight,
    update,
    dispose: () => disposeObject(group),
  };
}
