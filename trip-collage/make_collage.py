#!/usr/bin/env python3
"""
環島行程拼貼產生器
用法：
  1. 把六張照片放進 photos/ ，命名為 01.jpg ~ 06.jpg（或改 config.json）
  2. 編輯 config.json 的標題與每格文字
  3. python make_collage.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent

# Prefer Chinese-capable fonts available on common systems
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "C:/Windows/Fonts/msjhbd.ttc",
    "C:/Windows/Fonts/msjh.ttc",
    "C:/Windows/Fonts/mingliu.ttc",
]


def find_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def cover_crop(img: Image.Image, width: int, height: int) -> Image.Image:
    """Scale image to cover the target box, then center-crop."""
    src_w, src_h = img.size
    scale = max(width / src_w, height / src_h)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - width) // 2
    top = (new_h - height) // 2
    return resized.crop((left, top, left + width, top + height))


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def fit_font(text: str, max_width: int, base_size: int, min_size: int = 16) -> ImageFont.ImageFont:
    """Shrink font until text fits within max_width."""
    size = base_size
    while size > min_size:
        font = find_font(size)
        # Use a temp draw measurement via font.getbbox when available
        try:
            box = font.getbbox(text)
            tw = box[2] - box[0]
        except Exception:
            tw = size * len(text)
        if tw + 32 <= max_width:
            return font
        size -= 2
    return find_font(min_size)


def draw_banner(
    draw: ImageDraw.ImageDraw,
    text: str,
    center_x: int,
    top_y: int,
    font: ImageFont.ImageFont,
    *,
    max_width: int | None = None,
    pad_x: int = 18,
    pad_y: int = 10,
    fill: tuple[int, int, int] = (255, 255, 255),
    outline: tuple[int, int, int] = (20, 20, 20),
    outline_width: int = 2,
) -> int:
    """Draw a white label banner. Returns bottom y of the banner."""
    if max_width is not None:
        # Derive base size from current font when possible
        base = getattr(font, "size", 28)
        font = fit_font(text, max_width, int(base))
    tw, th = text_size(draw, text, font)
    left = center_x - tw // 2 - pad_x
    right = center_x + tw // 2 + pad_x
    bottom = top_y + th + pad_y * 2
    rect = [left, top_y, right, bottom]
    draw.rectangle(rect, fill=fill, outline=outline, width=outline_width)
    draw.text((center_x - tw // 2, top_y + pad_y), text, fill=(0, 0, 0), font=font)
    return bottom


def draw_label_box(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    font: ImageFont.ImageFont,
) -> None:
    tw, th = text_size(draw, text, font)
    pad_x, pad_y = 8, 4
    rect = [x - tw // 2 - pad_x, y - th // 2 - pad_y, x + tw // 2 + pad_x, y + th // 2 + pad_y]
    draw.rectangle(rect, fill=(255, 255, 255), outline=(0, 0, 0), width=2)
    draw.text((x - tw // 2, y - th // 2), text, fill=(0, 0, 0), font=font)


def make_placeholder(path: Path, index: int, width: int, height: int) -> None:
    colors = [
        (70, 130, 180),
        (95, 158, 160),
        (60, 140, 110),
        (180, 140, 70),
        (90, 90, 140),
        (40, 40, 70),
    ]
    img = Image.new("RGB", (width, height), colors[index % len(colors)])
    draw = ImageDraw.Draw(img)
    font = find_font(64)
    label = f"照片 {index + 1:02d}"
    tw, th = text_size(draw, label, font)
    draw.text(((width - tw) // 2, (height - th) // 2), label, fill=(255, 255, 255), font=font)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=92)


def build_panel(
    photo_cfg: dict,
    width: int,
    height: int,
    body_font: ImageFont.ImageFont,
    label_font: ImageFont.ImageFont,
) -> Image.Image:
    path = ROOT / photo_cfg["file"]
    if path.exists():
        photo = Image.open(path).convert("RGB")
    else:
        print(f"[warn] missing {path}, using placeholder", file=sys.stderr)
        make_placeholder(path, 0, width, height)
        photo = Image.open(path).convert("RGB")

    panel = cover_crop(photo, width, height)
    draw = ImageDraw.Draw(panel)

    # Person name labels (optional, first photo etc.)
    for label in photo_cfg.get("labels") or []:
        lx = int(label["x"] * width)
        ly = int(label["y"] * height)
        draw_label_box(draw, label["text"], lx, ly, label_font)

    # Bottom itinerary banners
    lines = photo_cfg.get("lines") or []
    if lines:
        # Estimate stacked height and place near bottom with a little margin
        sample_h = text_size(draw, "測", body_font)[1]
        line_gap = 10
        banner_h = sample_h + 20
        block_h = len(lines) * banner_h + (len(lines) - 1) * line_gap
        y = height - block_h - 24
        cx = width // 2
        for line in lines:
            y = draw_banner(
                draw, line, cx, y, body_font, max_width=width - 24, pad_x=16, pad_y=8
            ) + line_gap

    return panel


def build_collage(cfg: dict) -> Image.Image:
    cell_w = int(cfg.get("cell_width", 900))
    cell_h = int(cfg.get("cell_height", 700))
    cols, rows = 2, 3
    canvas_w = cell_w * cols
    canvas_h = cell_h * rows

    canvas = Image.new("RGB", (canvas_w, canvas_h), (0, 0, 0))
    body_font = find_font(max(22, cell_w // 38))
    label_font = find_font(max(18, cell_w // 48))
    date_font = find_font(max(28, cell_w // 28))
    title_font = find_font(max(42, cell_w // 18))
    subtitle_font = find_font(max(24, cell_w // 32))

    photos = cfg["photos"]
    if len(photos) != 6:
        raise ValueError("config.photos 需要剛好 6 張")

    for i, photo_cfg in enumerate(photos):
        panel = build_panel(photo_cfg, cell_w, cell_h, body_font, label_font)
        col, row = i % cols, i // cols
        canvas.paste(panel, (col * cell_w, row * cell_h))

    # Header banners overlaid on the top of the collage
    draw = ImageDraw.Draw(canvas)
    cx = canvas_w // 2
    y = 28
    y = draw_banner(draw, cfg["date"], cx, y, date_font, max_width=canvas_w - 40, pad_x=22, pad_y=8) + 12
    y = draw_banner(draw, cfg["title"], cx, y, title_font, max_width=canvas_w - 40, pad_x=28, pad_y=14) + 12
    draw_banner(draw, cfg["subtitle"], cx, y, subtitle_font, max_width=canvas_w - 40, pad_x=22, pad_y=10)

    return canvas


def ensure_demo_photos(cfg: dict) -> None:
    cell_w = int(cfg.get("cell_width", 900))
    cell_h = int(cfg.get("cell_height", 700))
    for i, photo_cfg in enumerate(cfg["photos"]):
        path = ROOT / photo_cfg["file"]
        if not path.exists():
            make_placeholder(path, i, cell_w, cell_h)
            print(f"[demo] created placeholder {path.relative_to(ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate round-island trip collage")
    parser.add_argument(
        "--config",
        default=str(ROOT / "config.json"),
        help="path to config.json",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="create placeholder photos if missing, then render",
    )
    args = parser.parse_args()

    config_path = Path(args.config)
    with config_path.open(encoding="utf-8") as f:
        cfg = json.load(f)

    if args.demo:
        ensure_demo_photos(cfg)

    collage = build_collage(cfg)
    out = ROOT / cfg.get("output", "output/collage.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    collage.save(out, quality=95)
    print(f"saved: {out}")


if __name__ == "__main__":
    main()
