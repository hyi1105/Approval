#!/usr/bin/env python3
"""產生示範用小圖／短影片（無外部依賴）。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent


def write_minimal_jpeg(path: Path) -> None:
    # 1x1 綠色 JPEG
    data = bytes.fromhex(
        "ffd8ffe000104a46494600010100000100010000ffdb004300"
        "080606070605080707070909080a0c140d0c0b0b0c1912130f"
        "141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c3031"
        "343432183e44433c314c37323430ffdb0043010909090c0b0c"
        "180d0d1830211c213030303030303030303030303030303030"
        "30303030303030303030303030303030303030303030303030"
        "3030ffc00011080001000103011100021100031100ffc40014"
        "0001000000000000000000000000000000ffc4001410010000"
        "00000000000000000000000000ffda000c0301000210031000"
        "003f00bf80ffd9"
    )
    path.write_bytes(data)


def write_minimal_mp4(path: Path) -> None:
    # 最小可被多數瀏覽器忽略／或顯示失敗也無妨的 ftyp+mdat 佔位
    # 示範封存以「檔案存在」為主；真實使用請放真正影片。
    ftyp = (
        b"\x00\x00\x00\x18ftypmp42"
        b"\x00\x00\x00\x00mp42isom"
    )
    mdat = b"\x00\x00\x00\x08mdat"
    path.write_bytes(ftyp + mdat)


def main() -> None:
    media = ROOT / "media"
    media.mkdir(parents=True, exist_ok=True)
    write_minimal_jpeg(media / "picnic.jpg")
    write_minimal_mp4(media / "clip.mp4")
    print(f"已寫入 {media}")


if __name__ == "__main__":
    main()
