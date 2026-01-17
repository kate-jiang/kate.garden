# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Three.js-based interactive 3D portfolio website featuring a procedurally generated grass field with floating 3D text and clickable links. The project renders 100,000 instanced grass blades using custom shaders, with an animated sky, dynamic lighting, day/night mode transitions, background music, wind particles, and interactive elements.

## Development Commands

```bash
# Start development server on port 5173
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build
npm run preview
```

## Architecture

### Core Rendering System

The application uses a dual-scene approach:
- **Main scene** (`scene`): Contains the grass, ground, 3D text, particles, and lighting
- **Background scene** (`backgroundScene`): Renders the procedural sky with a custom shader

The renderer (`renderer`) is configured with:
- ACES Filmic tone mapping (dynamic exposure: 1.3 day / 0.7 night)
- PCF soft shadow maps
- Manual clearing (`autoClear: false`) to composite both scenes

### Configuration System

Three configuration objects control rendering (src/script.js:10-125):
- **`config`**: Core parameters (grass, terrain, camera, text, particles, responsive)
- **`dayConfig`**: Day mode colors, lighting intensities, and visual settings
- **`nightConfig`**: Night mode colors, lighting intensities, and visual settings

### Shader Architecture

**Ground Shader** (src/script.js:798-890)
- Dynamically patches THREE.MeshPhongMaterial via `onBeforeCompile`
- Uses Perlin noise texture (`/textures/perlinFbm.jpg`) for terrain height
- Places geometry on virtual sphere for curved ground effect
- Shader reference stored in `groundShader` variable

**Grass Shader** (src/script.js:896-1064)
- Custom `RawShaderMaterial` with vertex/fragment shaders
- Uses instanced rendering for 100,000 grass blades
- Vertex shader handles:
  - Quaternion-based rotation for blade orientation
  - Time-based wind animation with per-blade variation
  - Noise-based procedural placement
- Fragment shader implements:
  - Translucency effects for subsurface scattering
  - Phong lighting with specular highlights
  - ACES tone mapping for color grading
  - `grassBrightness` uniform for day/night dimming

**Sky Shader** (src/script.js:610-762)
- Full-screen quad shader with raymarching
- Implements procedural clouds using fractal Brownian motion (FBM)
- Multi-layer cloud system with parallax
- Atmospheric fog calculation based on camera position
- Star field rendering for night mode (controlled by `starIntensity` uniform)

### Instance Buffer System

Grass blades use THREE.InstancedBufferGeometry with custom attributes (src/script.js:1134-1170):
- `offset`: World position offset for each blade
- `scale`: Individual blade height variation
- `halfRootAngle`: Quaternion for random rotation
- `index`: Normalized index for color variation

### Night Mode System

Full day/night transition system (src/script.js:494-523, 1552-1741):
- Toggle via UI button, persisted to localStorage (`nightMode` key)
- Smooth animated transition using cubic ease-in-out
- Interpolates: sky colors, fog, clouds, sun position, star intensity, lighting, particles, text materials, grass brightness, tone mapping exposure
- `updateNightMode(dt)` runs each frame during transitions
- `applyInitialNightMode()` sets state on page load

### Audio System

Background music with user preference (src/script.js:430-492):
- Lazy-loads audio file (`/arabesque.mp3`) on first interaction
- Auto-plays on first canvas interaction if preference enabled
- Toggle button updates localStorage (`audioEnabled` key)
- "Now playing" indicator shows when music is active

### About Panel

Modal overlay for about content (src/script.js:307-345, index.html:54-75):
- Opens via "about" link action
- Closes via X button or clicking outside
- Pauses camera auto-rotation when open
- CSS transition for smooth fade in/out

### Wind Particles

Atmospheric particle system (src/script.js:1209-1256):
- 1,400 particles with additive blending
- Circular gradient texture generated via canvas
- Velocity-based movement with wind strength variation
- Boundary wrapping for infinite effect
- Color and speed changes between day/night modes

### Interaction System

**Raycasting** (src/script.js:240-305)
- Uses THREE.Raycaster with mouse/touch coordinates
- Maintains `clickableMeshes` array for hit testing
- `hoverState` Map tracks per-mesh hover animations with easing

**Pointer Events** (src/script.js:351-428)
- Unified pointer event handling (mouse + touch)
- Drag threshold detection (5px) to distinguish clicks from drags
- Frame-throttled hover updates to reduce raycasting overhead
- Touch-specific: hover on tap, clear on release

**Hover Animation**
- Target scale: 1.15 on hover (1.1 for main text), 1.0 default
- Smoothed with ease factor: 0.15
- Updated every frame in `updateHoverAnimations()` (src/script.js:1454-1462)

**Click Handling**
- Opens URLs from `mesh.userData.url` property
- Triggers actions from `mesh.userData.action` property (e.g., "showAbout")
- Main text click triggers twirl/jump animation

### Text Click Animation

Celebratory animation on main text click (src/script.js:173-178, 1484-1505):
- Jump: parabolic arc up and down (1.5 unit height)
- Twirl: full 360° rotation
- Duration: 0.8 seconds with ease-out
- Only affects main "kate" text mesh, not links

### 3D Text System

Text rendering uses FontLoader with TextGeometry (src/script.js:1258-1406):
- Main text: "kate" with beveled geometry, castShadow enabled
- Links: "about", "github", "insta", "twitter" with individual meshes
- Each link has invisible hitbox mesh for better click detection
- Text group faces camera with damped quaternion rotation
- Text position animated with sine wave bobbing
- Text-specific lights (textLight, rimLight, textFillLight) follow text position

### Camera Controls

OrbitControls configuration (src/script.js:224-235):
- Auto-rotation enabled (speed: -0.06)
- Distance constrained: 40-50 units
- Polar angle limited: 1.61-1.70 radians
- Pan disabled, rotation enabled
- Damping enabled for smooth movement

### Responsive System

Mobile breakpoint handling (src/script.js:183-196):
- Breakpoint: 480px width
- Text scale: 0.75x on mobile
- Applied on load and window resize

### Loading System

Loading overlay with fade-out (src/script.js:570-582):
- THREE.LoadingManager tracks asset loading
- Fade-out CSS transition on `onLoad` callback

## Key Configuration

The `config` object (src/script.js:10-69) controls:
- Grass: joints, blade dimensions, instance count
- Terrain: width, resolution, radius
- Lighting: elevation, azimuth, fog, ambient/diffuse/specular strengths
- Camera: FOV, position, target, orbit constraints
- Interaction: hover scale and easing
- Particles: count, color, size
- Text: sizes, gaps, positions, animation parameters
- Responsive: mobile breakpoint and scales

The `dayConfig` and `nightConfig` objects (src/script.js:71-118) control mode-specific:
- Sky, fog, and cloud colors
- Sun elevation and azimuth
- Light intensities (ambient, directional, point, text lights)
- Particle opacity, color, and speed
- Tone mapping exposure
- Text color and emissive properties
- Grass brightness

## Link Data

Links are defined in `linkData` array (src/script.js:120-125):
```javascript
{ label: "about", action: "showAbout" }
{ label: "github", url: "https://github.com/kate-jiang" }
{ label: "insta", url: "https://instagram.com/katejiang__" }
{ label: "twitter", url: "https://twitter.com/chinesefoid" }
```

## Asset Dependencies

Required assets in `/public`:
- `/fonts/helvetiker_regular.typeface.json` - Three.js font for text geometry
- `/textures/blade_diffuse.jpg` - Grass blade color texture
- `/textures/blade_alpha.jpg` - Grass blade transparency mask
- `/textures/perlinFbm.jpg` - Noise texture for terrain generation
- `/arabesque.mp3` - Background music (piano)
- `/Kate_Resume.pdf` - Resume document linked from about panel

## HTML Structure

Key elements in index.html:
- `#webgl` - Main canvas for Three.js rendering
- `#loading-overlay` - Full-screen loading indicator
- `#audio-container` - Audio toggle button and "now playing" text
- `#night-mode-container` - Day/night toggle button
- `#about-overlay` - Modal overlay with about content

## Performance Considerations

- Grass uses instanced rendering to handle 100,000 blades efficiently
- Shadow maps enabled but optimized with appropriate camera bounds
- Textures use wrapping modes for tiling (RepeatWrapping)
- Delta time clamping prevents simulation instability (max 0.1s)
- Hover raycasting throttled to animation frame
- Audio lazy-loaded on first interaction
- Window resize handler updates camera aspect and renderer size

## Common Modifications

**Adjusting grass density**: Change `config.instances` (currently 100000)

**Modifying link data**: Edit `linkData` array (src/script.js:120-125)

**Changing lighting**: Adjust `dayConfig`/`nightConfig` intensity values

**Sky appearance**: Modify sky shader uniforms or cloud layer parameters in `getCloudLayer()`

**Night mode colors**: Edit `nightConfig` object properties

**Text animation**: Adjust `textJumpHeight`, `textTwirlRotations`, `textClickAnimationDuration`

**Particle behavior**: Modify `config.particleCount`, particle velocities in init loop, or `updateParticles()` function
