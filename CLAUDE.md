# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Three.js-based interactive 3D portfolio website featuring a procedurally generated grass field with floating 3D text and clickable links. The project renders 100,000 instanced grass blades using custom shaders, with an animated sky, dynamic lighting, and interactive elements.

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
- **Main scene** (`scene`): Contains the grass, ground, 3D text, and lighting
- **Background scene** (`backgroundScene`): Renders the procedural sky with a custom shader

The renderer (`renderer`) is configured with:
- ACES Filmic tone mapping (exposure: 1.3)
- PCF soft shadow maps
- Manual clearing (`autoClear: false`) to composite both scenes

### Shader Architecture

**Ground Shader** (src/script.js:390-460)
- Dynamically patches THREE.MeshPhongMaterial via `onBeforeCompile`
- Uses Perlin noise texture (`/textures/perlinFbm.jpg`) for terrain height
- Places geometry on virtual sphere for curved ground effect
- Shader reference stored in `groundShader` variable

**Grass Shader** (src/script.js:468-625)
- Custom `RawShaderMaterial` with vertex/fragment shaders
- Uses instanced rendering for 100,000 grass blades
- Vertex shader handles:
  - Quaternion-based rotation for blade orientation
  - Time-based wind animation
  - Noise-based procedural placement
- Fragment shader implements:
  - Translucency effects for subsurface scattering
  - Phong lighting with specular highlights
  - ACES tone mapping for color grading

**Sky Shader** (src/script.js:233-372)
- Full-screen quad shader with raymarching
- Implements procedural clouds using fractal Brownian motion (FBM)
- Multi-layer cloud system with parallax
- Atmospheric fog calculation based on camera position

### Instance Buffer System

Grass blades use THREE.InstancedBufferGeometry with custom attributes (src/script.js:666-696):
- `offset`: World position offset for each blade
- `scale`: Individual blade height variation
- `halfRootAngle`: Quaternion for random rotation
- `index`: Normalized index for color variation

### Interaction System

**Raycasting** (src/script.js:65-187)
- Uses THREE.Raycaster with mouse/touch coordinates
- Maintains `clickableMeshes` array for hit testing
- `hoverState` Map tracks per-mesh hover animations with easing

**Hover Animation**
- Target scale: 1.15 on hover, 1.0 default
- Smoothed with ease factor: 0.15
- Updated every frame in animation loop (src/script.js:857-863)

**Click Handling**
- Detects camera movement to distinguish drags from clicks
- Opens URLs from `mesh.userData.url` property
- Supports both mouse and touch events

### 3D Text System

Text rendering uses FontLoader with TextGeometry (src/script.js:728-831):
- Main text: "kate" with beveled geometry
- Links: "github", "resume", "twitter" with individual meshes
- Each link has invisible hitbox mesh for better click detection
- Text position animated with sine wave (src/script.js:868-870)

### Camera Controls

OrbitControls configuration (src/script.js:52-63):
- Auto-rotation enabled (speed: -0.05)
- Distance constrained: 35-50 units
- Polar angle limited: 1.0-1.70 radians
- Pan disabled, rotation enabled
- Damping enabled for smooth movement

## Key Configuration

The `config` object (src/script.js:6-24) controls all major rendering parameters:
- Grass instances, blade dimensions, terrain size
- Lighting parameters (ambient, diffuse, specular, translucency)
- Sun direction via elevation/azimuth angles
- Fog density and color blending

## Asset Dependencies

Required assets in `/public`:
- `/fonts/helvetiker_regular.typeface.json` - Three.js font for text geometry
- `/textures/blade_diffuse.jpg` - Grass blade color texture
- `/textures/blade_alpha.jpg` - Grass blade transparency mask
- `/textures/perlinFbm.jpg` - Noise texture for terrain generation
- `/Kate_Resume.pdf` - Resume document linked from 3D text

## Performance Considerations

- Grass uses instanced rendering to handle 100,000 blades efficiently
- Shadow maps enabled but optimized with appropriate camera bounds
- Textures use wrapping modes for tiling (RepeatWrapping)
- Delta time clamping prevents simulation instability (max 0.1s)
- Window resize handler updates camera aspect and renderer size

## Common Modifications

**Adjusting grass density**: Change `config.instances` (currently 100000)

**Modifying link data**: Edit `linkData` array in script.js:773-777

**Changing lighting**: Adjust `config` properties or modify light objects in script.js:189-222

**Sky appearance**: Modify fragment shader constants in script.js:256 or cloud layer parameters
