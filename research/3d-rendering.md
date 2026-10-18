# Research: in-browser 3D molecule rendering

Ticket: #4 (map #1). Researched 2026-10-18. Vocabulary follows `GLOSSARY.md` (Scene, Step, Lesson).

## Question

Which approach should render interactive 3D molecules (ball-and-stick, space-filling at true radii, orbitals/isosurfaces, electrostatic potential (ESP) maps) in the browser, mobile-first? Candidates: 3Dmol.js, Mol\*, NGL, and custom three.js / react-three-fiber (R3F). Criteria: visual quality and styling range, mobile performance, orbital/isosurface support, animation control (bond forming/breaking), licence, and deterministic capture to video frames. Map #1 requires every Scene to render to video as well as run interactively.

## Comparison

| | 3Dmol.js | Mol\* | NGL | three.js + R3F (custom) |
|---|---|---|---|---|
| Licence | **BSD-3-Clause** (bundles GLmol code under MIT/LGPL3 dual licence, plus three.js and jQuery code) [1] | MIT [2] | MIT [2] | MIT (three.js and R3F) [2] |
| Current version / activity | 2.5.5, released 2026-05-22; last push 2026-09 [2][3] | 5.13.1 on npm; v6 restructure on `master`, pushed 2026-10-17 [2][3] | 2.5.0 on npm; last commit 2026-09-03 [2][3] | three r186 (2026-09-24), R3F 9.8.2 (2026-10-15) [2][3] |
| Minified bundle | `3Dmol-min.js` 525 KB [4] | `build/viewer/molstar.js` 5,145 KB (full viewer app) [4] | `dist/ngl.js` 1,262 KB [4] | Tree-shaken. Only the parts we use ship (not measured here) |
| Ball-and-stick / spacefill | Yes. `sphere.scale` scales vdW radii; per-selection `radius` [5] | Yes (ball-and-stick, spacefill). Reads SDF, MOL, MOL2, XYZ [6] | Yes (`BallAndStickRepresentation`, `SpacefillRepresentation`). Reads SDF, MOL2 [7] | Built by us. Exact radii come from our own cited table |
| Isosurfaces (orbitals) | `addVolumetricData(data,'cube',{isoval,…})`, `addIsosurface` [5] | Volumes: CUBE, CCP4/MRC, DX [6]. The `alpha-orbitals` extension computes MO grids on the GPU from a Gaussian basis [8] | CUBE, DX, CCP4 and others. `SurfaceRepresentation` with `isolevel` and `smooth` [7][9] | Not built in. Mesh offline, or port marching cubes. three's `MarchingCubes` addon is a metaball object, not a cube-grid mesher [4] |
| ESP map on surface | `addSurface(…, {voldata, volscheme})` [5] | `external-volume` colour theme colours any surface by a volume [8] | `VolumeColormaker` plus an official `volume-esp.js` example [9] | Custom shader or per-vertex colours from a precomputed grid |
| Styling range | Moderate: colour schemes, outline view style, fog, ortho/perspective [5] | High-end look built in: SSAO, shadows, outline, DOF, bloom, SMAA [10] | Moderate: quality presets, impostors [9] | **Unlimited**: our own materials and shaders, matched to the design system |
| Animation / bond forming and breaking | Discrete frames: `addModelsAsFrames`, `animate({interval,loop,…})`, `setFrame(n)` [5]. Bonds do not morph | Trajectory and state-snapshot interpolation built in [8]. Bonds come from each model's data, so no continuous bond morph (our reading of the code) | Trajectory player. Same discrete-bond limit | **Full control.** Bond length, order, opacity and partial bonds are all tweenable parameters |
| Deterministic frame capture | Manual. `setFrame(n)` then `pngURI()`. `animate()` is interval-driven, so not deterministic [5] | **Built in.** `encodeVideoAnimation` stops the loop, resets time to 0 and steps `N = ceil(duration·fps)` frames. There is also a headless Node `saveAnimation` [11] | Manual. Set state, then `makeImage()` [9] | **Easy.** R3F `frameloop="never"` plus `advance(timestamp)` steps the clock exactly [12]. `preserveDrawingBuffer` allows readback [13] |
| Mobile fit | Light bundle. Small organic molecules are cheap | Heavy bundle and a protein-oriented UI. Post-processing costs GPU on phones | Has a mobile quality path (`quality: 'auto'/'low'`, impostor toggle) [9] | We control the DPR (`dpr` default `[1,2]` [12]), effects and level of detail |

No published head-to-head mobile benchmark of these four libraries was found. Molecules in an Orgo I/II course have fewer than ~100 atoms, so all four render them easily. The real mobile costs are **bundle size** and **post-processing passes**, not atom count.

## Recommendation

**Build Scenes on three.js + React-Three-Fiber, with offline-computed volumetric data. Mol\* is the reference and fallback for orbital and ESP pipelines. 3Dmol.js is an optional lazy-loaded free-explore viewer.**

Reasons:

1. **Video is a standing requirement.** R3F's `frameloop="never"` with `advance(t)` [12] makes each Scene a pure function of time. The same code then runs live at 60 fps and is stepped frame by frame for export, with PNG readback or WebCodecs encoding in headless Chromium. Of the libraries, only Mol\* comes close (its video-export extension [11]), and its animations are limited to its own snapshot and trajectory model.
2. **Mechanisms need continuous bond forming and breaking.** Examples are partial bonds in an SN2 transition state, and a π bond fading out while a σ bond forms. The libraries only swap discrete frames with recomputed bonds. In a custom scene graph, bond order, length and opacity are ordinary animatable values.
3. **True radii and the cited-sources rule.** The map forbids hand-tuned numbers. With a custom renderer, every radius and coordinate comes from our cited data (PubChem 3D SDF; Bondi/Alvarez radius tables) and none of it is hidden inside a library default table.
4. **Design-system fit and accessibility.** Colour-blind-safe CPK-alternative palettes, a reduced-motion mode (jump to the end state), and keyboard orbit and focus are all simpler when we own the render loop and materials.
5. **Licence.** three.js and R3F are MIT, matching our code licence. (3Dmol's BSD-3 would also be compatible, but it adds a notice obligation.)
6. **Mobile.** Only what we use ships. We set DPR caps and effects per device ourselves.

**What it costs and how to contain it.** Isosurfaces are the one feature the libraries hand us for free. Proposed pipeline:

- Compute orbitals and ESP grids **offline** (an electronic-structure code writes `.cube` files).
- Mesh them offline into glTF with per-vertex ESP colours.
- Ship static meshes, and record the source and method in each Scene's visible source note.

This keeps the client small and output deterministic, and it fits the $0 static hosting. The meshing step can reuse Mol\*'s MIT-licensed marching-cubes and alpha-orbital code [8] as a reference.

**Video encoding note.** WebCodecs `VideoEncoder` is *not* Baseline, as MDN marks it "Limited availability" [14]. Do the video export in a controlled headless Chromium, or export a PNG sequence and encode it with ffmpeg, rather than in Students' browsers. Mediabunny, the default encoder in Mol\*'s v6 video export, is MPL-2.0 [4]. That is fine as an unmodified dependency, but it is not MIT.

## Open questions for later tickets

- Electronic-structure method and level of theory for the precomputed orbitals and ESP: a chemistry decision for the owner.
- Whether a free-explore "any molecule" viewer is in v1 scope. If it is, 3Dmol.js (525 KB, lazy-loaded) is the light option.
- Prototype check: an R3F ball-and-stick Scene with an animated bond break and frame-stepped PNG export, measured on a mid-range phone.

## Sources

1. 3Dmol.js `LICENSE`: https://github.com/3dmol/3Dmol.js/blob/master/LICENSE
2. GitHub API repo metadata (licence SPDX, push dates, latest release) for 3dmol/3Dmol.js, molstar/molstar, nglviewer/ngl, mrdoob/three.js, pmndrs/react-three-fiber, fetched 2026-10-18.
3. npm registry (`npm view <pkg> version license`): 3dmol 2.5.5 BSD-3-Clause; molstar 5.13.1 MIT; ngl 2.5.0 MIT; three 0.186.1 MIT; @react-three/fiber 9.8.2 MIT.
4. jsDelivr package file listings (https://data.jsdelivr.com/v1/packages/npm/<pkg>@<ver>?structure=flat), plus `npm view mediabunny license` (MPL-2.0) and `npm view h264-mp4-encoder license` (MIT).
5. 3Dmol.js GLViewer API: https://3dmol.csb.pitt.edu/doc/GLViewer.html and SphereStyleSpec: https://3dmol.csb.pitt.edu/doc/SphereStyleSpec.html
6. Mol\* supported file formats: https://molstar.org/docs/v5/plugin/file-formats/
7. NGL API index and manual: https://nglviewer.org/ngl/api/
8. Mol\* source at tag v5.13.0: `src/extensions/alpha-orbitals/` (Gaussian basis, MO grid computation), `src/mol-theme/color/external-volume.ts`, `src/mol-plugin-state/animation/built-in/` (state-interpolation, state-snapshots, model-index): https://github.com/molstar/molstar/tree/v5.13.0/src/extensions
9. NGL source: `src/representation/surface-representation.ts` (isolevel, smooth), `src/color/volume-colormaker.ts`, `examples/scripts/color/volume-esp.js`, `src/stage/stage.ts` (`makeImage`, quality/impostor, mobile defaults): https://github.com/nglviewer/ngl
10. Mol\* `src/mol-canvas3d/passes/postprocessing.ts` at v5.13.0 (occlusion, shadow, outline, dof, antialiasing smaa, bloom).
11. Mol\* `extensions/video-export/src/encoder.ts` and `headless.ts` on `master` (v6-dev), and `src/extensions/mp4-export/` at v5.13.0 (h264-mp4-encoder): https://github.com/molstar/molstar/tree/master/extensions/video-export
12. R3F Canvas docs (`frameloop`: always/demand/never; `dpr` default `[1, 2]`): https://r3f.docs.pmnd.rs/api/canvas, and hooks docs (`advance`: "Advance one tick, given that `frameloop === 'never'`"): https://r3f.docs.pmnd.rs/api/hooks
13. three.js `src/renderers/WebGLRenderer.js` JSDoc: `preserveDrawingBuffer=false` "Whether to preserve the buffer until manually cleared or overwritten"; `antialias=false`.
14. MDN VideoEncoder ("Limited availability … not Baseline"; secure context): https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder
