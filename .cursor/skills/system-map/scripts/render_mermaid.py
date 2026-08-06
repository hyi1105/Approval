#!/usr/bin/env python3
"""Emit Mermaid snippets from a system-map JSON (stdout)."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def esc(text: str) -> str:
    return (text or "").replace('"', "'").replace("\n", " ")


def main(argv: list[str]) -> None:
    if len(argv) != 2:
        print("用法：python render_mermaid.py <system-map.json>", file=sys.stderr)
        raise SystemExit(2)
    data = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
    system = data["system"]
    stores = ", ".join(s["label"] for s in system.get("stores", []))
    tables = "＋".join(t["label"] for t in data["tables"])
    steps = "→".join(s["label"] for s in data["story"]["steps"])

    print("## 一眼圖")
    print("```mermaid")
    print("flowchart TB")
    print(f'  S1["1 觸發：{esc(data["story"]["trigger"])}"]')
    print(f'  S2["2 角色流程：{esc(steps)}"]')
    print(f'  S3["3 資料家：{esc(tables)}（{esc(stores)}）"]')
    print('  S4["4 權限瀑布：見欄位 step_matrix"]')
    print('  S5["5 變更衝擊：追 source.from 與 consumed_by"]')
    print("  S1 --> S2 --> S3 --> S4 --> S5")
    print("```")
    print()
    print("## 故事流程")
    print("```mermaid")
    print("flowchart LR")
    step_nodes = data["story"]["steps"]
    for i, step in enumerate(step_nodes):
        print(f'  {step["id"]}["{esc(step["label"])}"]')
        if i:
            prev = step_nodes[i - 1]["id"]
            print(f"  {prev} --> {step['id']}")
    print("```")
    print()
    print("## 資料血緣")
    print("```mermaid")
    print("flowchart LR")
    for t in data["tables"]:
        for f in t["fields"]:
            src = f.get("source") or {}
            kind = src.get("kind")
            node = f"{t['id']}_{f['id']}"
            print(f'  {node}["{esc(t["label"])}.{esc(f["label"])}\\n({kind})"]')
            frm = src.get("from")
            if frm:
                safe = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in frm)
                print(f'  src_{safe}["{esc(frm)}"] --> {node}')
    print("```")


if __name__ == "__main__":
    main(sys.argv)
