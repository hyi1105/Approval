#!/usr/bin/env python3
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import archive


SAMPLE = """時間\t發言者\t內容
2024-05-01 10:00\t我\t你好
2024-05-01 10:01\t小美\t[照片: a.jpg]
接續上一行不算
2024-05-01 10:02\t我\t第二行開始
  這是延續
"""


class ParseTests(unittest.TestCase):
    def test_parse_basic(self) -> None:
        msgs = archive.parse_messages(SAMPLE)
        self.assertEqual(len(msgs), 3)
        self.assertEqual(msgs[0].sender, "我")
        self.assertEqual(msgs[1].media, "a.jpg")
        self.assertEqual(msgs[1].media_kind, "image")
        self.assertIn("這是延續", msgs[2].text)

    def test_build_html(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            media = root / "media"
            media.mkdir()
            (media / "a.jpg").write_bytes(b"not-a-real-jpeg")
            text = root / "messages.txt"
            text.write_text(
                "2024-01-01 12:00\t我\thello\n2024-01-01 12:01\t對方\t[照片: a.jpg]\n",
                encoding="utf-8",
            )
            out = root / "out"
            archive.build("測試", text, media, out)
            html = (out / "index.html").read_text(encoding="utf-8")
            self.assertIn("測試", html)
            self.assertIn("media/a.jpg", html)
            self.assertTrue((out / "media" / "a.jpg").exists())
            self.assertTrue((out / "messages.json").exists())


if __name__ == "__main__":
    unittest.main()
