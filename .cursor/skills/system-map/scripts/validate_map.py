#!/usr/bin/env python3
"""Validate a system-map JSON against the schema (stdlib only)."""

from __future__ import annotations

import json
import sys
from pathlib import Path


SOURCE_KINDS = {
    "auto",
    "manual",
    "lookup",
    "api_sync",
    "computed",
    "derived_permission",
}


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        fail(f"無法讀取 JSON：{path}（{exc}）")


def validate(data: dict) -> list[str]:
    warnings: list[str] = []
    for key in ("map_version", "system", "tables", "roles", "story"):
        if key not in data:
            fail(f"缺少必要鍵：{key}")

    system = data["system"]
    if "id" not in system or "name" not in system:
        fail("system 需要 id 與 name")

    store_ids = {s.get("id") for s in system.get("stores", []) if isinstance(s, dict)}
    role_ids = {r.get("id") for r in data.get("roles", []) if isinstance(r, dict)}
    step_ids = {s.get("id") for s in data.get("story", {}).get("steps", []) if isinstance(s, dict)}
    table_ids: set[str] = set()
    field_ids: set[str] = set()

    if not data["story"].get("trigger"):
        fail("story.trigger 不可空白")
    if not data["story"].get("steps"):
        fail("story.steps 至少一步")

    for table in data["tables"]:
        tid = table.get("id")
        if not tid:
            fail("某張表缺少 id")
        table_ids.add(tid)
        store = table.get("store")
        if store_ids and store not in store_ids:
            fail(f"表 {tid} 的 store={store} 不在 system.stores")
        fields = table.get("fields")
        if not fields:
            fail(f"表 {tid} 沒有 fields")
        for field in fields:
            fid = field.get("id")
            if not fid:
                fail(f"表 {tid} 有欄位缺少 id")
            field_ids.add(f"{tid}.{fid}")
            for req in ("label", "type", "required", "source"):
                if req not in field:
                    fail(f"{tid}.{fid} 缺少 {req}")
            kind = field["source"].get("kind")
            if kind not in SOURCE_KINDS:
                fail(f"{tid}.{fid} source.kind 不合法：{kind}")
            if kind in ("lookup", "computed") and not field["source"].get("from") and not field["source"].get("formula"):
                warnings.append(f"{tid}.{fid} 建議補 source.from 或 formula")
            for role_list_key in ("filled_by", "visible_to", "editable_by"):
                for rid in field.get(role_list_key, []) or []:
                    if role_ids and rid not in role_ids:
                        warnings.append(f"{tid}.{fid}.{role_list_key} 角色未知：{rid}")
            for cell in field.get("step_matrix", []) or []:
                if cell.get("step") and step_ids and cell["step"] not in step_ids:
                    warnings.append(f"{tid}.{fid} step_matrix 步驟未知：{cell['step']}")
                if cell.get("role") and role_ids and cell["role"] not in role_ids:
                    warnings.append(f"{tid}.{fid} step_matrix 角色未知：{cell['role']}")

    for rel in data.get("relations", []) or []:
        for endpoint in ("from", "to"):
            ref = rel.get(endpoint, "")
            # allow table.field or bare table
            if "." in ref:
                if ref not in field_ids:
                    warnings.append(f"relations.{endpoint} 找不到欄位：{ref}")
            elif ref and ref not in table_ids:
                warnings.append(f"relations.{endpoint} 找不到表：{ref}")

    if not data.get("one_liner"):
        warnings.append("建議補 one_liner（給完全不懂的人的一句話）")

    return warnings


def main(argv: list[str]) -> None:
    if len(argv) != 2:
        print("用法：python validate_map.py <system-map.json>", file=sys.stderr)
        raise SystemExit(2)
    path = Path(argv[1])
    if not path.is_file():
        fail(f"檔案不存在：{path}")
    warnings = validate(load(path))
    print(f"OK：{path}")
    for w in warnings:
        print(f"WARN：{w}")


if __name__ == "__main__":
    main(sys.argv)
