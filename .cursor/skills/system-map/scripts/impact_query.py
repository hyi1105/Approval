#!/usr/bin/env python3
"""Query blast radius when a table.field source changes or goes missing."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def field_key(table_id: str, field: str) -> str:
    return f"{table_id}.{field}"


def find_field(data: dict, table: str, field: str) -> dict | None:
    for t in data.get("tables", []):
        if t.get("id") != table:
            continue
        for f in t.get("fields", []):
            if f.get("id") == field:
                return {"table": t, "field": f}
    return None


def severity_for(field: dict) -> str:
    if field.get("required"):
        return "block"
    consumed = " ".join(field.get("consumed_by") or [])
    if any(k in consumed for k in ("路由", "step1", "step2", "帶入", "通知")):
        return "degrade"
    return "audit"


def impact(data: dict, table: str, field: str) -> list[dict]:
    target = field_key(table, field)
    found = find_field(data, table, field)
    hits: list[dict] = []

    if found:
        hits.append(
            {
                "ref": target,
                "label": found["field"].get("label"),
                "reason": "direct_source",
                "severity": "block" if found["field"].get("required") else "degrade",
                "consumed_by": found["field"].get("consumed_by") or [],
                "detail": found["field"].get("source", {}).get("notes")
                or found["field"].get("attributes")
                or "",
            }
        )

    for t in data.get("tables", []):
        for f in t.get("fields", []):
            src = f.get("source") or {}
            frm = (src.get("from") or "").strip()
            ref = field_key(t["id"], f["id"])
            if ref == target:
                continue
            if frm == target or (frm.endswith("." + field) and table in frm):
                hits.append(
                    {
                        "ref": ref,
                        "label": f.get("label"),
                        "reason": "lookup_from",
                        "severity": severity_for(f),
                        "consumed_by": f.get("consumed_by") or [],
                        "detail": src.get("condition") or src.get("notes") or "",
                    }
                )
            for c in f.get("consumed_by") or []:
                if target in str(c) or f"{table}.{field}" in str(c):
                    hits.append(
                        {
                            "ref": ref,
                            "label": f.get("label"),
                            "reason": "consumed_by_text",
                            "severity": "audit",
                            "consumed_by": f.get("consumed_by") or [],
                            "detail": str(c),
                        }
                    )

    for rel in data.get("relations") or []:
        if rel.get("to") == target or rel.get("from") == target:
            other = rel.get("from") if rel.get("to") == target else rel.get("to")
            hits.append(
                {
                    "ref": other,
                    "label": rel.get("label") or "relation",
                    "reason": "relation",
                    "severity": "block",
                    "consumed_by": [],
                    "detail": f"{rel.get('from')} → {rel.get('to')} via {rel.get('via')}",
                }
            )

    label = (found or {}).get("field", {}).get("label") if found else field
    for step in data.get("story", {}).get("steps") or []:
        blob = " ".join(str(step.get(k) or "") for k in ("label", "action", "notes"))
        if field in blob or (label and label in blob) or table in blob:
            hits.append(
                {
                    "ref": step.get("id"),
                    "label": step.get("label"),
                    "reason": "story_step",
                    "severity": "degrade",
                    "consumed_by": [step.get("actor")],
                    "detail": step.get("action") or "",
                }
            )

    seen: set[tuple[str, str]] = set()
    unique: list[dict] = []
    for h in hits:
        key = (str(h["ref"]), h["reason"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(h)
    return unique


def main() -> None:
    parser = argparse.ArgumentParser(description="System-map 變更衝擊查詢")
    parser.add_argument("json_path", type=Path)
    parser.add_argument("--table", required=True)
    parser.add_argument("--field", required=True)
    args = parser.parse_args()
    if not args.json_path.is_file():
        print(f"ERROR: 檔案不存在 {args.json_path}", file=sys.stderr)
        raise SystemExit(1)

    data = load(args.json_path)
    hits = impact(data, args.table, args.field)
    target = field_key(args.table, args.field)
    blocks = [h for h in hits if h["severity"] == "block"]
    print(f"目標：{target}")
    if blocks:
        print("結論：會擋主流程（存在 block 級衝擊）")
    elif hits:
        print("結論：不一定擋死，但有 degrade／audit 影響")
    else:
        print("結論：地圖上找不到直接依賴（可能資料不足）")
    print("---")
    for h in hits:
        cons = ", ".join(h["consumed_by"]) if h["consumed_by"] else "—"
        print(
            f"[{h['severity']}] {h['ref']}（{h['label']}）"
            f" ← {h['reason']}；下游：{cons}"
        )
        if h["detail"]:
            print(f"        {h['detail']}")


if __name__ == "__main__":
    main()
