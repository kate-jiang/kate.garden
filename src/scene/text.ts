import * as THREE from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { config, dayConfig } from "./config";
import { links } from "@/content/site";
import type { InteractionTarget } from "./interaction";
import { disposeObject } from "./resources";

export function createText(font: Font) {
  const targets: InteractionTarget[] = [];
  const hoverStates = new Map<THREE.Mesh, { current: number; target: number }>();
  const textTargetQuaternion = new THREE.Quaternion();
  const textCurrentQuaternion = new THREE.Quaternion();
  const textDirection = new THREE.Vector3();
  const textTargetMatrix = new THREE.Matrix4();
  const ORIGIN = new THREE.Vector3(0, 0, 0);
  const UP = new THREE.Vector3(0, 1, 0);

  let textClickAnimating = false;
  let textClickAnimationTime = 0;
  const textClickAnimationDuration = 0.8;
  const textJumpHeight = 1.5;
  const textTwirlRotations = 1;

  function createLinkMeshes(
    font: Font,
    textMesh: THREE.Group,
    textMaterial: THREE.MeshPhongMaterial
  ): void {
    let maxDescender = 0;

    // First pass: create geometries, compute widths, find max descender
    const measuredLinks = links.map(item => {
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
      return { ...item, geometry, width };
    });

    // Compute total row width: sum of all link widths + gaps between them
    const totalWidth =
      measuredLinks.reduce((sum, item) => sum + item.width, 0) +
      (measuredLinks.length - 1) * config.linkGap;

    // Second pass: create meshes and hitboxes with accumulated positioning
    // currentX tracks the left edge of each link
    let currentX = -totalWidth / 2;

    measuredLinks.forEach(item => {
      const geometry = item.geometry;
      const width = item.width;
      const bbox = geometry.boundingBox!;

      // Center geometry so it scales from center
      const centerX = -width / 2;
      geometry.translate(centerX - bbox.min.x, -maxDescender, 1);
      geometry.computeBoundingBox(); // Update bounding box after translation

      const linkMesh = new THREE.Mesh(geometry, textMaterial);
      linkMesh.castShadow = true;
      linkMesh.receiveShadow = true;
      linkMesh.name = item.label;
      linkMesh.position.set(currentX + width / 2, -2.5, 1);

      const linkLight = new THREE.PointLight(0xffddaa, 3, 8);
      linkLight.position.set(0.3, 0.5, 7);
      linkMesh.add(linkLight);

      textMesh.add(linkMesh);

      const linkBox = geometry.boundingBox!;
      const linkW = linkBox.max.x - linkBox.min.x;
      const linkH = linkBox.max.y - linkBox.min.y;
      const linkHitbox = new THREE.Mesh(
        new THREE.PlaneGeometry(linkW + 1, linkH + 0.8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      // Center hitbox on the link (mesh y + geometry center)
      linkHitbox.position.set(currentX + width / 2, (linkBox.min.y + linkBox.max.y) / 2 - 2.5, 0.5);
      linkHitbox.name = item.label;
      textMesh.add(linkHitbox);
      targets.push({ hitbox: linkHitbox, visual: linkMesh, action: item.action });

      // Advance position for next link
      currentX += width + config.linkGap;
    });
  }

  // Create a group to hold everything - this handles position and camera-facing
  const textGroup = new THREE.Group();
  textGroup.position.set(0, config.textYPosition, config.textZPosition);
  textGroup.name = "textGroup";

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

  const textMaterial = new THREE.MeshPhongMaterial({
    color: dayConfig.textColor,
    specular: 0xffffff,
    shininess: 60,
    emissive: dayConfig.textEmissive,
    emissiveIntensity: dayConfig.textEmissiveIntensity,
  });

  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.castShadow = true;
  textMesh.receiveShadow = true;
  textMesh.name = "floatingText";
  textGroup.add(textMesh);

  // Create hitbox for main text
  const textBox = textGeometry.boundingBox!;
  const textWidth = textBox.max.x - textBox.min.x;
  const textHeight = textBox.max.y - textBox.min.y;
  const textHitbox = new THREE.Mesh(
    new THREE.PlaneGeometry(textWidth + 1, textHeight + 1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  // Position in local space: centered on text geometry's bounding box
  textHitbox.position.set(0, (textBox.min.y + textBox.max.y) / 2, 1.5);
  textHitbox.name = "floatingText";
  textMesh.add(textHitbox);
  targets.push({ hitbox: textHitbox, visual: textMesh, action: { type: "animate" } });

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

  function resize(width: number) {
    textGroup.scale.setScalar(
      width <= config.responsive.mobileBreakpoint ? config.responsive.mobileTextScale : 1
    );
  }
  function setHovered(hovered: Set<InteractionTarget>) {
    for (const target of targets) {
      const state = hoverStates.get(target.visual) ?? { current: target.visual.scale.x, target: 1 };
      state.target = hovered.has(target)
        ? target.action.type === "animate"
          ? 1.1
          : config.hoverScale
        : 1;
      hoverStates.set(target.visual, state);
    }
  }
  function update(dt: number, time: number, camera: THREE.Camera) {
    for (const [mesh, state] of hoverStates) {
      state.current += (state.target - state.current) * config.hoverEase;
      mesh.scale.setScalar(state.current);
    }
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
  }
  return {
    group: textGroup,
    material: textMaterial,
    targets,
    direction: textDirection,
    update,
    resize,
    setHovered,
    triggerAnimation() {
      if (!textClickAnimating) {
        textClickAnimating = true;
        textClickAnimationTime = 0;
      }
    },
    dispose: () => disposeObject(textGroup),
  };
}
