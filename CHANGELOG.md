# Changelog

All notable changes to this almanac are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `examples/live/` (also at the short address `/live/`): four finished Vietnamese live wallpapers in the island
  film's manner, drawn by the almanac alone -- Ha Long at dawn (karsts behind a low sun, bat-wing junks, mist at the
  waterline), flooded rice terraces (mirrored water let down fall by fall, cloud shadows, a farmer and a buffalo on
  a bund), Hoi An at night (a street of mustard houses graded into darkness with the lanterns holding their pools
  of light, flower lanterns on the river, the town reflected), and a bamboo forest in afternoon rain (fronts that
  build and ease, clumped culms swaying, an egret in the shallows). Each scene is a seamless 60-second loop and a
  pure `frame(f)` from a seed -- the same words grow a different layout in each scene -- in a player with a scene
  picker, seed, speed, a wallpaper mode and a clock, all of it addressable by URL for wallpaper engines and kiosks.
  No visitor input is drawn: the four scenes are the whole menu. `live.mjs --check` holds every loop to a seam of
  0 pixels and reports 5-10 ms a frame at 480x270; a scene reports 31-36 techniques used.

- `examples/storybook/`: the side view is dressed the way the island film's world is grown, and the technique
  count is kept honestly. Hills now shade by their smoothed slope with a darkening foot, a speckle of far trees
  and a broken treeline on the nearer ridges; the meadow is read in world cells of four tones with a worn path
  under the cast's feet and tufts, flowers and pebbles in the near grass; shores have wet sand, coming-and-going
  foam and reeds. Everything that stands casts the ground's shade (a flyer's stays under it), houses have
  chimneys and smoke, cloud shadows cross the land (the sky keeps its colour), birds cross by day in a vee, and
  where a script hung no clouds the engine hangs its own. A script stages only what its story needs, so the
  engine now plants the rest from the same seed -- a hazed tree line on the horizon, bushes and rocks in the
  foreground, palms and trees on an island view's bare land -- keeping clear of the script's props and paths;
  the same script and seed grow the same dressing. Trees branch into three-billowed crowns, coats carry spots, a
  saddle or a pale belly. Every call into the almanac now goes through one counting wrapper, so `used`/`report()`
  include the figure and prop builders (a story now reports 41-46 techniques, not 21-26). The player page is
  restyled to match the island page -- paper, ink borders, the called-so-far technique chips -- keeping the
  timeline, story picker, seed and size controls, the paste-a-script box and the wallpaper mode. The script
  format is unchanged: existing stories and AI-written scripts run as written, drawn in a fuller world.

- `examples/storybook/`: a second way to see a story, `view: "island"` -- the same scene looked down on as a map of
  tiles, its land terraced up out of the water, `invert` for a lake ringed by its shore, people and things placed by
  tile and drawn far to near, the camera panning and zooming over the map. Three more props, `turtle`, `sword` and
  `islet` (a mound with a stone tower); the story `stories/su-tich-ho-guom.json`, the legend of the Lake of the
  Returned Sword in six scenes -- the jade lake at dawn, the blade in the net, the crowd on the shore, the boats at
  dusk, the golden turtle rising, and the lake at night with the tower lit.

- `examples/storybook/`: the hour's colour grade is applied (it was handed a buffer where it wanted the frame's
  pixels, so dusk, dawn and night were drawn plain). Older stories keep their day frames pixel for pixel; their dawn,
  dusk and night scenes now darken and warm as the palette says.

- `examples/storybook/`: two more kinds of character, `dragon` (a serpentine body that ripples through the air, horned
  head, whisker, ridge of spines, four clawed legs) and `fairy` (a long dress, long hair, butterfly wings that beat, a
  glow); three more props, `palm`, `boat` and `nest` (a bowl of straw with `eggs` in it); two more effects, `bubbles` and
  `sparks`; and actors that can fly (`layer`, `hover`, `glow`) or come in a crowd (`crowd`, `spread`, `coats`). The
  story: `stories/lac-long-quan-au-co.json`, Lac Long Quan and Au Co in eight scenes -- the dragon of the sea, the fairy
  of the mountains, the hundred eggs, and the fifty children who go with each.

- `examples/storybook/`: a story written as one JSON file -- a cast of animals with their genes, a list of scenes, a
  line of narration and a time of day for each -- drawn as a pixel film by the almanac alone. `storybook(script, o)`
  gives a seekable `frame(f)` (the same picture whether played, scrubbed or filmed), `validate(script)` answers a bad
  script with the line and the key that is wrong, and the player (`index.html`) runs a story as a live wallpaper, with a
  box to paste one written by a model. Two stories in Vietnamese (`ba-chu-heo`, `vit-con-tim-me`), the format
  (`format.md`) and a Node photographer (`film.mjs --check --still --sheet`). 3.9-11.6 ms a frame at 480-1280 wide.

- `projection`: `obliqueShear`, `obliqueToScreen`, `obliqueToGround`; `relief` (new): `terraceLevel`, `wallShade`,
  `leafShade`, `crownRows`, `silhouetteNormals`, `crownClumps`, the depth view of OpenWorldBuilder's top worlds (the
  same pixels in Chromium: 0 different).

- `roofs` (new): `roofPlan`, `slopeShade`, `roofTexel`, the roofs of OpenWorldBuilder's code-drawn buildings (the
  same pixels: 0 different).

- `paths` (new): `gridAStar`, `nearestFreeCell`, `segmentClear`, `straightenPath`, `floodFill`, `untilSettled`, the ways
  round buildings, the reachable land and the reachable items of OpenGameBuilder's games (the same paths, the same games won).

- The top view's land, weather and life as entries, each giving the numbers of the code it came from (0 pixels different):
  `weather` (new): `cloudShadows`, `fogBanks`, `frontStrength`, `lightningFlash`; `light`: `hourLight`, `hourTables`,
  `gradeFrame`; `motion`: `fleeVector`, `formationSlot`; `land`: `chamferDistance` (established), `wobbledRing`,
  `mountainRise`, `windingRiver`, `plotGrid`.

- `bodies` (new): a creature's techniques from OpenWorldBuilder's top view: `followJoint` (a spine that follows its head), `dampedSpring`, `footSwing` and `footReady` (planted feet that step), `floatHeight`, `waterlineCut` and `depthUnderCut` (a body in the water), `despeckle`, `staggeredScales`, `topEdgeShine`, `furTufts`, `rimDetail` (a sprite's finishing passes), `smoothCurve`, `bodySpots`, `bodyPattern`, `coatColours`, `resampleList`, `blendRecords` (a genome made and mixed). `limbs`: `twoBoneLimb3d`. The top view draws the same pixels with them.

- `raster` (new): `ellipseRows`, `fillEllipse`, `capsuleSteps`, `lineCells`, `polygonRows`, `ditherEllipse`, `shadeEllipse`, `blitSprite`, `blitSway`, `outlinePass`, `cutSprite`, `drawnBounds` (drawing in whole pixels into a buffer of packed colours); `pixels`: `scalePacked`
- `sprites` (new): `outlineSprite`, `spriteFromRows`, `layTemplate`, `fillBetweenEdges`, `gridPixels`, `packSheet` (sprites from letters and templates), `leafCrown`, `barkTrunk` (the parts of a plant)

- The top-down pixel world of OpenWorldBuilder's top view (vendored from 綴 Tsuzuri's 言の葉), its techniques as entries,
  each giving the same numbers as the code it came from (the top view draws the same pixels with them, 0 different):
  - `pixels` (new): `packRgb`, `mixPacked`, `packedHsl`, `packedToHsl` (colours as an ImageData's 32-bit pixels),
    `hueShiftTone` (a pixel artist's hue-shifted shade), `bayerThreshold` (ordered dithering), `ditheredBorder`;
  - `water` (new): `waterTime`, `waterPixel` (water seen from above: foam, swells, ripples, glints, shallows, weed);
  - `land`: `levelCut` (the height a share of the land lies below), `heightWater` (lower is water, higher is ground),
    `wanderingHeading` (a path that wanders by itself);
  - `noise`: `noiseTile` (value noise that tiles); `random`: `latticeHash`, `linearCongruential`; `numbers`:
    `angleDiff`.
- Six references, each checked at its source: ordered dithering, the probit, linear congruential generators,
  ImageData, endianness, and Slynyrd's colour palettes (hue shift along a ramp).

- `crossGenomes`: a child's genes from two parents of one kind (each number mixed between theirs, each choice one
  parent's, a rare mutation that never leaves the kind); OpenGameBuilder's creatures breed with it.
- `tracePart`: a figure part's outline, for drawing over a part clipped to it (drawParts' markings hook; OpenWorldBuilder
  draws its creatures' bellies, spots and stripes with it).
- `drawList`: a display list, a drawing given as data (shapes in the canvas's own path commands, fills and strokes,
  groups that move, blend or shade them) and drawn by one function; OpenWorldBuilder's bodies are described this way.

## [0.2.0] - 2026-10-17

### Added

- 61 techniques ported from OpenWorldBuilder's engine, each giving the same numbers (and, for drawing, the same
  pixels) as the code it came from:
  - basics, noise and colour: `clamp`, `lerp`, `smoothstep`, `wrap`, `indexRandom`, `SeededRandom.sign`,
    `latticeRandom`, `valueNoise`, `fractalNoise`, `ridgedNoise`, `noiseLine`, `hexToRgb`, `rgbToHex`, `rgba`,
    `mixColour`, `shade`, `luma`, `rgbToHsl`, `hslToRgb`, `hueToward`, `gradeColour`;
  - light, land, scattering and projection: `dayCycle`, `aerialPerspective`, `twinkle`, `hillLine`, `islandHeight`,
    `scatterAlong`, `windowLit`, `blink`, `parallax`, `turnedProjection`, `turnedDepth`, `faceShade`;
  - motion and particles: `flockStep`, `gridWalk`, `pulseRise`, `particleField`, `fall`, `rise`, `hover`,
    `wrapAround`;
  - growth: `branchingTree`, `swayingChain`;
  - drawing: `setCanvasMaker`, `makeCanvas`, `stampCache`, `partPath`, `fillInArt`, `drawRecipe`, `grain`, `vignette`,
    `glowSprite`, `glowingDisc`, `lightRays`, `fogBands`, `mirrorBelow`, `puffCloud`, `inkedLine`, `tones`,
    `drawParts`;
  - readable seeds: `seedOf`, `seedWords`.
- 44 more references, each checked at its source; two gallery pictures (hills, growth).
- The checks in a file per module; the test run holds each check to its module's file and needs the catalog to know
  how every entry is called.

## [0.1.0] - 2026-10-17

### Added

- The first entries. Established: `hash32`, `fnv1a`, `hashString`, `SeededRandom`, `twoBoneLimb`, `gaitTiming`.
  Original: `footStep`, `strideRate`, `genomeFrom`.
- The catalog (`CATALOG.md`), the gallery (footfall diagrams of every gait; a leg stepping and walking), the
  bibliography in CSL-JSON, and the checks, each a sentence the catalog lists.
