# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

A Three.js interactive 3D portfolio website featuring a procedurally generated grass field with floating 3D text and clickable links. Renders 100,000 instanced grass blades using custom shaders, with animated sky, day/night transitions, background music playlist, wind particles, and interactive elements.

**Stack**: TypeScript, Three.js 0.182, Vite

## Development Commands

```bash
npm run dev       # Start dev server on port 5173
npm run build     # Type check + build for production (outputs to dist/)
npm run preview   # Preview production build
npm run typecheck # Run TypeScript type checking
```

## Architecture

```
src/
├── index.ts          # Main entry point - rendering, interaction, animation loop
├── config.ts         # Configuration objects, quality presets, device detection
├── nightMode.ts      # Day/night transition system
├── utils.ts          # Utility functions (lerp helpers)
├── vite-env.d.ts     # Vite environment type declarations
├── types/
│   ├── index.ts      # Re-exports all types
│   ├── config.ts     # Config, ModeConfig, LinkDataItem, QualityPreset, DeviceTier
│   ├── uniforms.ts   # SkyUniforms, GrassUniforms, GroundUniforms
│   ├── state.ts      # NightModeState, NightModeRefs, HoverState, Track
│   └── scene.ts      # BackgroundSceneResult, GroundResult, GrassResult, etc.
├── scene/
│   ├── index.ts      # Re-exports all scene modules
│   ├── background.ts # Sky shader scene
│   ├── ground.ts     # Terrain mesh with height displacement
│   ├── grass.ts      # Instanced grass geometry and material
│   └── particles.ts  # Wind particle system
└── shaders/
    ├── index.ts      # Re-exports all shaders
    ├── shared.ts     # Shared GLSL functions (noise sampling)
    ├── sky.glsl.ts   # Procedural sky with clouds and stars
    ├── grass.glsl.ts # Grass vertex animation and lighting
    └── ground.glsl.ts # Ground vertex displacement
```

### Dual-Scene Rendering

The renderer uses two scenes composited together:
- **Main scene**: Grass, ground, 3D text, particles, lighting
- **Background scene**: Procedural sky shader (full-screen quad)

Renderer config: ACES Filmic tone mapping, PCF soft shadows, manual clearing (`autoClear: false`).

## Module Reference

### config.ts

Exports typed configuration objects:
- `config: Config` - Core parameters (grass, terrain, camera, text, particles, responsive)
- `dayConfig: ModeConfig` - Day mode colors, lighting intensities
- `nightConfig: ModeConfig` - Night mode colors, lighting intensities
- `linkData: LinkDataItem[]` - Array of link labels, URLs, and actions
- `qualityPresets: QualityPresets` - Device-tier quality settings (high/medium/low)

### nightMode.ts

- `updateNightMode(dt, state, refs, dayConfig, nightConfig): void` - Animates transition each frame
- `applyInitialNightMode(state, refs, dayConfig, nightConfig): void` - Sets initial state from localStorage

Transition interpolates: sky colors, fog, clouds, sun position, star intensity, lighting, particles, text materials, grass brightness, tone mapping exposure. Clouds and particles accelerate dramatically mid-transition.

### scene/background.ts

`createBackgroundScene(config, dayConfig, sunDirection, canvas): BackgroundSceneResult`

Sky shader with raymarched FBM clouds, atmospheric fog, sun glow, and star field for night mode.

### scene/ground.ts

`createGround(config, noiseTexture, delta, pos): GroundResult`

Patches MeshPhongMaterial via `onBeforeCompile` to add Perlin noise height displacement and spherical curvature.

### scene/grass.ts

- `createGrassBaseGeometry(config): PlaneGeometry` - Curved blade geometry
- `createGrassInstances(config, grassBaseGeometry, qualityPreset): InstancedBufferGeometry` - Instanced buffer with offsets, scales, rotations
- `createGrass(config, dayConfig, textures, camera, sunDirection, delta, pos, qualityPreset): GrassResult`

RawShaderMaterial with wind animation, translucency, Phong lighting, ACES tone mapping. Note: RawShaderMaterial handles gamma correction manually in the shader, so textures should not have explicit colorSpace set.

### scene/particles.ts

`createParticles(config, dayConfig, qualityPreset): ParticlesResult`

Wind particles with additive blending, boundary wrapping, velocity-based movement.

## Key Systems

### Interaction (index.ts)

- Raycaster with `clickableMeshes` array for hit testing
- Unified pointer events (mouse + touch) with drag threshold detection
- Hover animations with eased scaling (target 1.15, ease 0.15)
- Main text click triggers twirl/jump animation

### Audio System (index.ts)

- Playlist with multiple tracks, lazy-loaded on first interaction
- Persisted autoplay preference in localStorage (`audioEnabled`)
- Music panel overlay with playback controls
- "Now playing" indicator

### 3D Text (index.ts)

- FontLoader with TextGeometry for "kate" main text and link labels
- TextGeometry uses `depth` parameter (not `height` - renamed in Three.js r162)
- Invisible hitbox meshes for better click detection
- Text group faces camera with damped quaternion rotation
- Sine wave bobbing animation
- Text-specific lights (textLight, rimLight) follow text position

### Camera Controls (index.ts)

OrbitControls: auto-rotation (-0.06 speed), distance locked at 50, polar angle 1.66-1.70, pan disabled.

## Asset Dependencies

Required in `/public`:
- `/fonts/helvetiker_regular.typeface.json` - Text geometry font
- `/textures/blade_diffuse.jpg` - Grass color
- `/textures/blade_alpha.jpg` - Grass transparency
- `/textures/perlinFbm.jpg` - Terrain noise
- `/music/*.mp3` - Background music playlist

## HTML Structure

Key elements in `index.html`:
- `#webgl` - Main Three.js canvas
- `#loading-overlay` - Loading screen
- `#audio-container` - Audio toggle and "now playing"
- `#night-mode-container` - Day/night toggle
- `#content-overlay` - Modal for about/music panels

Entry point: `<script type="module" src="./src/index.ts">`

## Common Modifications

**Grass density**: `config.instances` or `qualityPresets[tier].instances`

**Links**: Edit `linkData` array in `config.ts`

**Lighting/colors**: Adjust `dayConfig`/`nightConfig` in `config.ts`

**Sky appearance**: Modify uniforms in `sky.glsl.ts` or `createBackgroundScene()`

**Text animation**: `config.textBobAmplitude`, `config.textBobSpeed`, `textJumpHeight`, `textTwirlRotations` in `index.ts`

**Particle behavior**: `config.particleCount`, velocities in `particles.ts`, `updateParticles()` in `index.ts`
