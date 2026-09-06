# Repository guidance

Read [README.md](README.md) for commands, module ownership, asset paths, and local Pages/D1 testing.

- Keep content and shared UI independent of Three.js. Only the garden's dynamic import may bring scene code into the main entry. The lite bundle must contain no Three.js modules.
- Entry points wire modules together. Scene code reports typed actions through callbacks; it must not query dialog or audio elements.
- Keep geometry and interaction targets local to the text factory. Do not mutate navigation or playlist data.
- Each stateful factory owns its listeners and cleanup. Shared textures belong to the asset loader; particle textures belong to the particle factory.
- Use the theme controller's single state/application path for startup and transitions. Media events report playback state; user commands own playback intent.
- Preserve the two pages' content and preference differences unless a task changes them explicitly.
- Preserve the shader math and background/main render order during structural changes. Raw grass shaders handle gamma themselves. Ground shader patches need a browser check when upgrading Three.js.
- Run `npm run check` after changes. Run `npm run test:browser` for UI, audio, loading, or scene changes. Add focused regression cases for changed behavior.
