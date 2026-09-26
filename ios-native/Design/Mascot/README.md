# Slimsy's raccoon companion

An original warm-gray plush raccoon with a plum neckerchief and embroidered leaf,
created for Slimsy's porcelain, plum, and blush interface.

Generated with **`gpt-image-2.5-sunburst`**, using the imagegen skill's bundled
**fallback CLI / OpenAI Image API**, at 1024×1024, high quality, transparent PNG.
The development credential was loaded into the generation process only. The app
uses bundled images and makes no image-generation requests.

## Artwork and source

- Approved generation: [`../../../output/imagegen/slimsy-raccoon.png`](../../../output/imagegen/slimsy-raccoon.png).
- Exact generation and edit prompts: [`prompts/`](prompts/).
- Original generated layers: `output/imagegen/raccoon-{body,tail,left-arm,right-arm,blink}.png` at the repository root.
- Bundled images: [`../../Slimsy/Resources/Assets.xcassets/Mascot/`](../../Slimsy/Resources/Assets.xcassets/Mascot/).
- Layer overview: [`raccoon-layers.jpg`](raccoon-layers.jpg).
- Idle, greeting, and celebration poses: [`raccoon-poses.jpg`](raccoon-poses.jpg).

The head is cut from the approved original. A masked edit supplies the closed
eyelids; only those pixels are blended back, preserving the face between frames.
The torso and tail edits fill the areas originally hidden by other parts. Rounded
shoulder caps allow the separate arms to rotate without exposed cut edges.

Every layer uses the same 1024×1024 registration canvas. `RaccoonStill` is assembled
from those layers, so the accessible still and the animated character match.
The image processing script clears invisible RGB, removes stray alpha noise,
registers the extracted limbs, and creates the Xcode image sets:

```sh
python3 ios-native/Scripts/prepare-mascot.py
```

This requires Pillow and the six original generated PNGs. The masks and alignment
are calibrated for this approved character; review them before using a redesigned
source image.

## Native animation

[`RaccoonMascot.swift`](../../Slimsy/Design/RaccoonMascot.swift) contains the puppet,
the welcome illustration, and the Today companion card.

```swift
RaccoonMascot(size: 160)                          // breathing, blinking, tail swish
RaccoonMascot(size: 268, mood: .greeting)          // one greeting, then idle
RaccoonMascot(size: 155, mood: .celebrating,
              interactive: false)               // a short celebration
RaccoonMascot(celebration: completedEntryCount)   // react whenever the token changes
```

Interactive mascots wave on tap and provide a light haptic. The welcome badge and
Today card also respond with text, including when motion is reduced. The Today
profile button keeps its existing navigation behavior.

The animation samples a single 30 fps SwiftUI timeline. Gestures settle back to
idle, can be interrupted by another tap, and do not create timers or tasks. Motion
pauses when the view disappears, the scene becomes inactive, or `active` is false.
The Today views pause while another tab or a sheet is active. The system's Reduce
Motion setting switches to `RaccoonStill` and pauses the timeline.

| Part | Pivot on the registration canvas |
| --- | --- |
| Head | (471, 517) |
| Viewer-left arm | (346, 570) |
| Viewer-right arm | (617, 570) |
| Tail | (640, 819) |
| Body / breathing | (471, 985) |

Debug-only `--mascot-reduce-motion` allows deterministic accessibility snapshots
without changing the simulator's system settings. Release builds use the system
setting exclusively.

## Generation recipe

With `OPENAI_API_KEY` configured locally, use the bundled skill CLI:

```sh
SLIMSY_IMAGE_CLI="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/image_gen.py"
python3 "$SLIMSY_IMAGE_CLI" generate \
  --model gpt-image-2.5-sunburst \
  --prompt-file ios-native/Design/Mascot/prompts/raccoon.txt --no-augment \
  --size 1024x1024 --quality high --background transparent --output-format png \
  --out output/imagegen/slimsy-raccoon.png
```

The five layer edits use the same model/options with `edit`, the matching prompt
file, and `--image output/imagegen/slimsy-raccoon.png`. The blink edit additionally
used `--mask ios-native/Design/Mascot/prompts/blink-mask.png`, with transparent
elliptical regions (308, 280, 425, 409) and (548, 312, 655, 422). Keep source images
and generation prompts together.

[OpenAI Image API reference](https://developers.openai.com/api/docs/guides/image-generation)
documents the model and native transparent output.
