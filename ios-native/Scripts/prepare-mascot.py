#!/usr/bin/env python3
"""Prepare the approved GPT Image 2.5 artwork as registered SwiftUI puppet layers.

Run from any directory after generating the six source PNGs in output/imagegen.
Requires Pillow. This script only processes existing images; it makes no API calls.
"""

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "output/imagegen"
ASSETS = ROOT / "ios-native/Slimsy/Resources/Assets.xcassets/Mascot"
REVIEW = ROOT / "ios-native/Design/Mascot"
SIZE = (1024, 1024)


def read(name):
    image = Image.open(SOURCE / name).convert("RGBA")
    if image.size != SIZE or image.getchannel("A").getextrema()[0] != 0:
        raise ValueError(f"{name} must be a transparent 1024×1024 PNG")
    return image


def polygon(points, feather=0.7):
    mask = Image.new("L", SIZE)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather))


def cut(image, mask):
    result = image.copy()
    result.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
    return result


def register(image, bounds):
    """Fit an extracted arm back to its approved pose, retaining its soft edge."""
    x0, y0, x1, y1 = image.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()
    sprite = image.crop((x0 - 3, y0 - 3, x1 + 3, y1 + 3))
    x, y, right, bottom = bounds
    sprite = sprite.resize((right - x, bottom - y), Image.Resampling.LANCZOS)
    registered = Image.new("RGBA", SIZE)
    registered.alpha_composite(sprite, (x, y))
    return registered


def clean(image):
    # Remove imperceptible model-generated alpha noise and clear invisible RGB.
    alpha = image.getchannel("A").point(lambda a: 0 if a < 4 else min(255, round(a * 255 / 253)))
    visible = alpha.point(lambda a: 255 if a else 0)
    result = Image.composite(image, Image.new("RGBA", SIZE), visible)
    result.putalpha(alpha)
    return result


def export(name, image):
    directory = ASSETS / f"{name}.imageset"
    directory.mkdir(parents=True, exist_ok=True)
    clean(image).save(directory / f"{name}.png", optimize=True)
    (directory / "Contents.json").write_text(json.dumps({
        "images": [{"filename": f"{name}.png", "idiom": "universal"}],
        "info": {"author": "xcode", "version": 1},
        "properties": {"template-rendering-intent": "original"},
    }, indent=2) + "\n")


original = read("slimsy-raccoon.png")
body = Image.new("RGBA", SIZE)
# The body-only edit preserved scale but moved 24 px right; restore registration.
body.alpha_composite(read("raccoon-body.png"), (-24, 0))
tail = read("raccoon-tail.png")

head_mask = polygon([
    (0, 0), (1024, 0), (1024, 501), (670, 501), (619, 513),
    (570, 520), (500, 524), (443, 523), (389, 516), (334, 506), (0, 494),
])

blink_mask = Image.new("L", SIZE)
eyes = ImageDraw.Draw(blink_mask)
eyes.ellipse((307, 280, 431, 412), fill=255)
eyes.ellipse((545, 307, 660, 428), fill=255)
blink_mask = blink_mask.filter(ImageFilter.GaussianBlur(5))
# Preserve the approved face everywhere except the eyelids to prevent a blink
# from changing the silhouette, nose, scarf, or fur between frames.
closed = Image.composite(read("raccoon-blink.png"), original, blink_mask)
closed.putalpha(original.getchannel("A"))

layers = {
    "RaccoonTail": tail,
    "RaccoonLeftArm": register(read("raccoon-left-arm.png"), (185, 523, 384, 778)),
    "RaccoonRightArm": register(read("raccoon-right-arm.png"), (580, 526, 749, 782)),
    "RaccoonBody": body,
    "RaccoonHead": cut(original, head_mask),
    "RaccoonBlink": cut(closed, head_mask),
}
still = Image.new("RGBA", SIZE)
for name, layer in layers.items():
    if name != "RaccoonBlink":
        still.alpha_composite(clean(layer))
layers["RaccoonStill"] = still

ASSETS.mkdir(parents=True, exist_ok=True)
(ASSETS / "Contents.json").write_text('{"info":{"author":"xcode","version":1}}\n')
for name, layer in layers.items():
    export(name, layer)

REVIEW.mkdir(parents=True, exist_ok=True)
sheet = Image.new("RGB", (1536, 1024), "#F8F3EF")
for index, (name, layer) in enumerate(layers.items()):
    if name == "RaccoonBlink":
        continue
    tile_index = index if index < 5 else 5
    tile = Image.new("RGBA", SIZE, "#F8F3EF")
    tile.alpha_composite(clean(layer))
    sheet.paste(tile.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS),
                ((tile_index % 3) * 512, (tile_index // 3) * 512))
sheet.save(REVIEW / "raccoon-layers.jpg", quality=92)
print(f"Prepared {len(layers)} transparent layers in {ASSETS}")
