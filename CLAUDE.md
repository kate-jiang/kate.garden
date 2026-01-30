# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

A Three.js interactive 3D portfolio website featuring a procedurally generated grass field with floating 3D text and clickable links. Renders 100,000 instanced grass blades using custom shaders, with animated sky, day/night transitions, background music playlist, wind particles, and interactive elements.

## Development Commands

```bash
npm run dev      # Start dev server on port 5173
npm run build    # Build for production (outputs to dist/)
npm run preview  # Preview production build
```

## Architecture

```
src/
├── index.js          # Main entry point - rendering, interaction, animation loop
├── config.js         # Configuration objects, quality presets, device detection
├── nightMode.js      # Day/night transition system
├── utils.js          # Utility functions (lerp helpers)
├── scene/
│   ├── index.js      # Re-exports all scene modules
│   ├── background.js # Sky shader scene
│   ├── ground.js     # Terrain mesh with height displacement
│   ├── grass.js      # Instanced grass geometry and material
│   └── particles.js  # Wind particle system
└── shaders/
    ├── index.js      # Re-exports all shaders
    ├── shared.js     # Shared GLSL functions (noise sampling)
    ├── sky.glsl.js   # Procedural sky with clouds and stars
    ├── grass.glsl.js # Grass vertex animation and lighting
    └── ground.glsl.js # Ground vertex displacement
```

### Dual-Scene Rendering

The renderer uses two scenes composited together:
- **Main scene**: Grass, ground, 3D text, particles, lighting
- **Background scene**: Procedural sky shader (full-screen quad)

Renderer config: ACES Filmic tone mapping, PCF soft shadows, manual clearing (`autoClear: false`).

## Module Reference

### config.js

Exports configuration objects:
- `config` - Core parameters (grass, terrain, camera, text, particles, responsive)
- `dayConfig` - Day mode colors, lighting intensities
- `nightConfig` - Night mode colors, lighting intensities
- `linkData` - Array of link labels, URLs, and actions
- `qualityPresets` - Device-tier quality settings (high/medium/low)
- `getDeviceTier()` - Detects device capability from UA/GPU

### nightMode.js

- `updateNightMode(dt, state, refs, dayConfig, nightConfig)` - Animates transition each frame
- `applyInitialNightMode(state, refs, dayConfig, nightConfig)` - Sets initial state from localStorage

Transition interpolates: sky colors, fog, clouds, sun position, star intensity, lighting, particles, text materials, grass brightness, tone mapping exposure. Clouds and particles accelerate dramatically mid-transition.

### scene/background.js

`createBackgroundScene(config, dayConfig, sunDirection, canvas)` - Returns `{ scene, material, mesh }`

Sky shader with raymarched FBM clouds, atmospheric fog, sun glow, and star field for night mode.

### scene/ground.js

`createGround(config, noiseTexture, delta, pos)` - Returns `{ mesh, material, getShader() }`

Patches MeshPhongMaterial via `onBeforeCompile` to add Perlin noise height displacement and spherical curvature.

### scene/grass.js

- `createGrassBaseGeometry(config)` - Curved blade geometry
- `createGrassInstances(config, grassBaseGeometry, qualityPreset)` - Instanced buffer with offsets, scales, rotations
- `createGrass(config, dayConfig, textures, camera, sunDirection, delta, pos, qualityPreset)` - Returns `{ mesh, material }`

RawShaderMaterial with wind animation, translucency, Phong lighting, ACES tone mapping.

### scene/particles.js

`createParticles(config, dayConfig, qualityPreset)` - Returns `{ mesh, material, velocities, geometry }`

Wind particles with additive blending, boundary wrapping, velocity-based movement.

## Key Systems

### Interaction (index.js)

- Raycaster with `clickableMeshes` array for hit testing
- Unified pointer events (mouse + touch) with drag threshold detection
- Hover animations with eased scaling (target 1.15, ease 0.15)
- Main text click triggers twirl/jump animation

### Audio System (index.js)

- Playlist with multiple tracks, lazy-loaded on first interaction
- Persisted autoplay preference in localStorage (`audioEnabled`)
- Music panel overlay with playback controls
- "Now playing" indicator

### 3D Text (index.js)

- FontLoader with TextGeometry for "kate" main text and link labels
- Invisible hitbox meshes for better click detection
- Text group faces camera with damped quaternion rotation
- Sine wave bobbing animation
- Text-specific lights (textLight, rimLight) follow text position

### Camera Controls (index.js)

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

## Common Modifications

**Grass density**: `config.instances` or `qualityPresets[tier].instances`

**Links**: Edit `linkData` array in `config.js`

**Lighting/colors**: Adjust `dayConfig`/`nightConfig` in `config.js`

**Sky appearance**: Modify uniforms in `sky.glsl.js` or `createBackgroundScene()`

**Text animation**: `config.textBobAmplitude`, `config.textBobSpeed`, `textJumpHeight`, `textTwirlRotations` in `index.js`

**Particle behavior**: `config.particleCount`, velocities in `particles.js`, `updateParticles()` in `index.js`
