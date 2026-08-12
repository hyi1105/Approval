#!/usr/bin/env python3
"""把 LINE 對話文字＋媒體做成可離線開啟的 HTML 封存。"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".bmp"}
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}
AUDIO_EXTS = {".m4a", ".aac", ".mp3", ".wav", ".ogg"}

MEDIA_TOKEN = re.compile(
    r"^\[(照片|圖片|影片|視頻|語音|檔案)\s*[:：]\s*(.+?)\]\s*$",
    re.IGNORECASE,
)
# 時間\t發言者\t內容  或  時間 發言者 內容（兩個以上空白）
LINE_RE = re.compile(
    r"^(?P<time>\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{1,2}:\d{2}(?::\d{2})?)"
    r"(?:\t+| {2,})"
    r"(?P<sender>[^\t]+?)"
    r"(?:\t+| {2,})"
    r"(?P<body>.*)$"
)


@dataclass
class Message:
    time: str
    sender: str
    text: str
    media: str | None = None
    media_kind: str | None = None  # image | video | audio | file


def kind_for_path(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in IMAGE_EXTS:
        return "image"
    if ext in VIDEO_EXTS:
        return "video"
    if ext in AUDIO_EXTS:
        return "audio"
    return "file"


def parse_messages(text: str) -> list[Message]:
    messages: list[Message] = []
    for raw in text.splitlines():
        line = raw.strip("\n")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        # 表頭
        if line.replace("\t", " ").startswith("時間") and "發言者" in line:
            continue
        m = LINE_RE.match(line)
        if not m:
            # 接續上一則的多行文字
            if messages:
                messages[-1].text = (messages[-1].text + "\n" + line).strip()
            continue
        time_s = m.group("time").replace("/", "-")
        sender = m.group("sender").strip()
        body = m.group("body").strip()
        media_name = None
        media_kind = None
        token = MEDIA_TOKEN.match(body)
        if token:
            label, name = token.group(1), token.group(2).strip()
            media_name = name
            if label in ("照片", "圖片"):
                media_kind = "image"
            elif label in ("影片", "視頻"):
                media_kind = "video"
            elif label == "語音":
                media_kind = "audio"
            else:
                media_kind = "file"
            body = ""
        messages.append(
            Message(time=time_s, sender=sender, text=body, media=media_name, media_kind=media_kind)
        )
    return messages


def messages_from_media_only(media_dir: Path) -> list[Message]:
    files = sorted(
        [p for p in media_dir.iterdir() if p.is_file() and not p.name.startswith(".")],
        key=lambda p: p.name.lower(),
    )
    out: list[Message] = []
    for i, path in enumerate(files, start=1):
        kind = kind_for_path(path)
        out.append(
            Message(
                time=f"檔案順序 {i:04d}",
                sender="媒體",
                text="",
                media=path.name,
                media_kind=kind,
            )
        )
    return out


def copy_media(messages: list[Message], media_src: Path | None, media_dst: Path) -> None:
    media_dst.mkdir(parents=True, exist_ok=True)
    if media_src is None or not media_src.is_dir():
        return
    wanted = {m.media for m in messages if m.media}
    # 也複製未被引用、但放在 media 的檔（避免漏存）
    for path in media_src.iterdir():
        if not path.is_file() or path.name.startswith("."):
            continue
        if wanted and path.name not in wanted:
            # 仍複製：使用者常整夾丟進來
            pass
        shutil.copy2(path, media_dst / path.name)


def resolve_media_kinds(messages: list[Message], media_dir: Path) -> None:
    for m in messages:
        if not m.media:
            continue
        path = media_dir / m.media
        if path.exists():
            m.media_kind = kind_for_path(path)
        elif m.media_kind is None:
            m.media_kind = "file"


def render_html(title: str, messages: list[Message], generated_at: str) -> str:
    bubbles = []
    for m in messages:
        sender_esc = html.escape(m.sender)
        time_esc = html.escape(m.time)
        body_parts = []
        if m.text:
            body_parts.append(f'<div class="text">{html.escape(m.text).replace(chr(10), "<br>")}</div>')
        if m.media:
            name = html.escape(m.media)
            src = html.escape(f"media/{m.media}")
            kind = m.media_kind or "file"
            if kind == "image":
                body_parts.append(
                    f'<a class="media" href="{src}" target="_blank" rel="noopener">'
                    f'<img src="{src}" alt="{name}" loading="lazy"></a>'
                )
            elif kind == "video":
                body_parts.append(
                    f'<video class="media" controls preload="metadata" src="{src}"></video>'
                    f'<div class="caption">{name}</div>'
                )
            elif kind == "audio":
                body_parts.append(
                    f'<audio class="media" controls preload="metadata" src="{src}"></audio>'
                    f'<div class="caption">{name}</div>'
                )
            else:
                body_parts.append(f'<a class="file" href="{src}" download>{name}</a>')
        if not body_parts:
            body_parts.append('<div class="text muted">（空白）</div>')
        body_html = "\n".join(body_parts)
        bubbles.append(
            f"""
<article class="bubble">
  <header><span class="sender">{sender_esc}</span><time>{time_esc}</time></header>
  {body_html}
</article>"""
        )

    count = len(messages)
    media_count = sum(1 for m in messages if m.media)
    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)} — LINE 封存</title>
  <style>
    :root {{
      --bg: #e8f3ee;
      --panel: #f7fbf9;
      --ink: #17302a;
      --muted: #5b726b;
      --line: #c5d9d1;
      --accent: #06c755;
      --bubble: #ffffff;
      --shadow: 0 10px 30px rgba(23, 48, 42, 0.08);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(1200px 600px at 10% -10%, #d7f0e3 0%, transparent 55%),
        radial-gradient(900px 500px at 100% 0%, #cfe6ff 0%, transparent 45%),
        var(--bg);
      min-height: 100vh;
    }}
    .wrap {{
      max-width: 720px;
      margin: 0 auto;
      padding: 28px 16px 64px;
    }}
    .hero {{
      background: linear-gradient(160deg, #12352c, #1d5c45 55%, #0f7a45);
      color: #f4fff8;
      border-radius: 28px;
      padding: 28px 24px;
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
    }}
    .hero::after {{
      content: "";
      position: absolute;
      inset: auto -20% -40% 40%;
      height: 180px;
      background: radial-gradient(circle, rgba(6,199,85,.35), transparent 70%);
      pointer-events: none;
    }}
    .brand {{
      font-size: 0.85rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      opacity: 0.8;
      margin: 0 0 10px;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      line-height: 1.2;
      font-weight: 700;
    }}
    .sub {{ margin: 0; opacity: 0.9; max-width: 36em; }}
    .meta {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
      margin-top: 18px;
      font-size: 0.92rem;
      opacity: 0.92;
    }}
    .warn {{
      margin: 18px 0 0;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      font-size: 0.9rem;
    }}
    .toolbar {{
      display: flex;
      gap: 10px;
      margin: 18px 0 8px;
      position: sticky;
      top: 0;
      z-index: 2;
      backdrop-filter: blur(8px);
      background: color-mix(in srgb, var(--bg) 80%, transparent);
      padding: 10px 0;
    }}
    input[type="search"] {{
      flex: 1;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 12px 16px;
      font: inherit;
      background: var(--panel);
      color: var(--ink);
    }}
    .thread {{
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }}
    .bubble {{
      background: var(--bubble);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 12px 14px;
      box-shadow: var(--shadow);
      animation: rise 0.45s ease both;
    }}
    .bubble:nth-child(odd) {{ animation-delay: 0.02s; }}
    .bubble header {{
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 0.86rem;
    }}
    .sender {{ font-weight: 700; color: #0f7a45; }}
    time {{ color: var(--muted); white-space: nowrap; }}
    .text {{ white-space: pre-wrap; word-break: break-word; line-height: 1.55; }}
    .muted {{ color: var(--muted); }}
    .media img, .media video {{
      display: block;
      width: 100%;
      max-height: 420px;
      object-fit: contain;
      background: #0b1f19;
      border-radius: 12px;
    }}
    audio.media {{ width: 100%; }}
    .caption, .file {{ margin-top: 6px; font-size: 0.9rem; color: var(--muted); }}
    .file {{ color: #0f7a45; }}
    footer.note {{
      margin-top: 28px;
      color: var(--muted);
      font-size: 0.85rem;
      line-height: 1.5;
    }}
    @keyframes rise {{
      from {{ opacity: 0; transform: translateY(8px); }}
      to {{ opacity: 1; transform: none; }}
    }}
    @media (prefers-reduced-motion: reduce) {{
      .bubble {{ animation: none; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <p class="brand">LINE ARCHIVE</p>
      <h1>{html.escape(title)}</h1>
      <p class="sub">本機離線封存：文字與媒體留在這一包資料夾裡，不需登入 LINE。</p>
      <div class="meta">
        <span>訊息 {count} 則</span>
        <span>媒體 {media_count} 件</span>
        <span>產生於 {html.escape(generated_at)}</span>
      </div>
      <p class="warn">這不是官方備份格式，也無法把內容還原進手機 LINE App。刪聊天前記得先確認這裡能正常開啟。</p>
    </section>

    <div class="toolbar">
      <input type="search" id="q" placeholder="搜尋發言者或文字…" autocomplete="off">
    </div>

    <section class="thread" id="thread">
      {"".join(bubbles)}
    </section>

    <footer class="note">
      封存工具僅整理你提供的文字與檔案，不會讀取 LINE App 內部資料。
      請自行保管好這整個資料夾（含 media/）。
    </footer>
  </div>
  <script>
    const q = document.getElementById("q");
    const items = [...document.querySelectorAll(".bubble")];
    q.addEventListener("input", () => {{
      const needle = q.value.trim().toLowerCase();
      for (const el of items) {{
        el.hidden = needle && !el.textContent.toLowerCase().includes(needle);
      }}
    }});
  </script>
</body>
</html>
"""


def write_readme(out_dir: Path, title: str) -> None:
    (out_dir / "README.txt").write_text(
        f"""{title} — LINE 對話封存
========================
用瀏覽器開啟同資料夾的 index.html 即可回看。

注意：
- 這是電腦本機封存，不是 LINE 官方備份。
- 無法把此資料夾還原回手機 LINE。
- 請整夾備份（含 media/ 與 messages.json）。

產生時間：{datetime.now().isoformat(timespec="seconds")}
""",
        encoding="utf-8",
    )


def build(title: str, input_path: Path | None, media_path: Path | None, out_dir: Path) -> None:
    if input_path and input_path.is_file():
        messages = parse_messages(input_path.read_text(encoding="utf-8"))
    elif media_path and media_path.is_dir():
        messages = messages_from_media_only(media_path)
    else:
        raise SystemExit("請提供 --input 文字檔，或至少提供 --media 資料夾。")

    out_dir.mkdir(parents=True, exist_ok=True)
    media_dst = out_dir / "media"
    copy_media(messages, media_path, media_dst)
    resolve_media_kinds(messages, media_dst)

    missing = [m.media for m in messages if m.media and not (media_dst / m.media).exists()]
    if missing:
        print("警告：下列媒體在 media 資料夾找不到：", file=sys.stderr)
        for name in missing:
            print(f"  - {name}", file=sys.stderr)

    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    (out_dir / "index.html").write_text(
        render_html(title, messages, generated_at), encoding="utf-8"
    )
    (out_dir / "messages.json").write_text(
        json.dumps([asdict(m) for m in messages], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_readme(out_dir, title)
    print(f"完成：{out_dir / 'index.html'}")
    print(f"訊息 {len(messages)} 則；請用瀏覽器開啟 index.html。")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="LINE 對話本機封存（HTML＋媒體）")
    parser.add_argument("--title", default="LINE 對話封存", help="封存標題")
    parser.add_argument("--input", type=Path, help="messages.txt 路徑")
    parser.add_argument("--media", type=Path, help="媒體資料夾")
    parser.add_argument("--out", type=Path, required=True, help="輸出資料夾")
    args = parser.parse_args(argv)
    build(args.title, args.input, args.media, args.out)


if __name__ == "__main__":
    main()
