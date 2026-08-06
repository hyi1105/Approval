const KIND_LABEL = {
  auto: "自動產生",
  manual: "人工輸入",
  lookup: "參照帶入",
  api_sync: "API 同步",
  computed: "計算",
  derived_permission: "依權限決定",
};

const roleName = (data, id) =>
  data.roles.find((r) => r.id === id)?.label || id;

async function loadMap() {
  const res = await fetch("./resignation.example.json");
  if (!res.ok) throw new Error("無法載入 resignation.example.json");
  return res.json();
}

function renderHero(data) {
  document.getElementById("system-name").textContent = data.system.name;
  document.getElementById("one-liner").textContent =
    data.one_liner || data.system.summary || "";
  document.title = `System Map｜${data.system.name}`;
}

function renderStory(data) {
  document.getElementById("story-trigger").textContent = data.story.trigger;
  document.getElementById("story-bg").textContent = data.story.background || "";

  const steps = document.getElementById("steps");
  steps.innerHTML = "";
  for (const step of data.story.steps) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="who">${roleName(data, step.actor)}</span> — ${step.label}：${step.action}`;
    steps.appendChild(li);
  }

  const roles = document.getElementById("roles");
  roles.innerHTML = "";
  for (const role of data.roles) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${role.label}</strong>：${role.summary || ""}`;
    roles.appendChild(li);
  }
}

function renderStores(data) {
  const stores = (data.system.stores || [])
    .map((s) => `${s.label}${s.notes ? `（${s.notes}）` : ""}`)
    .join(" · ");
  document.getElementById("stores").textContent = stores
    ? `存放處：${stores}`
    : "";
}

function fieldSourceText(field) {
  const src = field.source || {};
  const kind = KIND_LABEL[src.kind] || src.kind;
  const bits = [kind];
  if (src.from) bits.push(`← ${src.from}`);
  if (src.condition) bits.push(src.condition);
  return bits.join(" · ");
}

function renderTables(data, onSourceClick) {
  const root = document.getElementById("tables");
  root.innerHTML = "";
  const storeLabel = Object.fromEntries(
    (data.system.stores || []).map((s) => [s.id, s.label])
  );

  for (const table of data.tables) {
    const panel = document.createElement("article");
    panel.className = "table-panel";
    panel.dataset.table = table.id;

    const h3 = document.createElement("h3");
    h3.textContent = table.label;
    panel.appendChild(h3);

    const where = document.createElement("p");
    where.className = "where";
    where.textContent = `存在：${storeLabel[table.store] || table.store}${
      table.notes ? ` · ${table.notes}` : ""
    }`;
    panel.appendChild(where);

    const ul = document.createElement("ul");
    ul.className = "fields";
    for (const field of table.fields) {
      const li = document.createElement("li");
      li.className = "field";
      li.dataset.ref = `${table.id}.${field.id}`;

      const title = document.createElement("div");
      title.innerHTML = `<strong>${field.label}</strong> <span class="meta">${field.type}${
        field.required ? " · 必填" : ""
      }</span>`;
      li.appendChild(title);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "source";
      btn.textContent = fieldSourceText(field);
      btn.addEventListener("click", () => onSourceClick(table.id, field.id));
      li.appendChild(btn);

      const meta = document.createElement("div");
      meta.className = "meta";
      const filled = (field.filled_by || []).map((id) => roleName(data, id)).join("、") || "—";
      const consumed = (field.consumed_by || []).join("、") || "—";
      meta.textContent = `誰填：${filled} · 後來誰用：${consumed}`;
      li.appendChild(meta);

      ul.appendChild(li);
    }
    panel.appendChild(ul);
    root.appendChild(panel);
  }
}

function matrixCell(data, field, step) {
  const rows = (field.step_matrix || []).filter((m) => m.step === step.id);
  if (!rows.length) return "—";
  return rows
    .map((m) => {
      const bits = [];
      if (m.visible) bits.push("可見");
      if (m.editable) bits.push("可編");
      if (m.must_fill) bits.push("必填");
      if (!bits.length) bits.push("—");
      const cls = m.editable ? "pill on-edit" : "pill on-view";
      return `<span class="${cls}">${roleName(data, m.role)} ${bits.join("/")}</span>`;
    })
    .join(" ");
}

function renderWaterfall(data) {
  const table = document.getElementById("waterfall");
  const headRow = table.querySelector("thead tr");
  // rebuild header: 欄位 | 來源 | each step
  headRow.innerHTML = "<th>欄位</th><th>來源</th>";
  for (const step of data.story.steps) {
    const th = document.createElement("th");
    th.textContent = step.label.replace(/^STEP\d+\s*/, "");
    headRow.appendChild(th);
  }

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  for (const t of data.tables) {
    for (const field of t.fields) {
      const tr = document.createElement("tr");
      tr.dataset.ref = `${t.id}.${field.id}`;
      const td0 = document.createElement("td");
      td0.textContent = `${t.label}.${field.label}`;
      tr.appendChild(td0);
      const td1 = document.createElement("td");
      td1.textContent = KIND_LABEL[field.source?.kind] || field.source?.kind || "";
      tr.appendChild(td1);
      for (const step of data.story.steps) {
        const td = document.createElement("td");
        td.innerHTML = `<div class="cell-matrix">${matrixCell(data, field, step)}</div>`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
}

function clearHits() {
  document.querySelectorAll(".field.hit-block, .field.hit-degrade").forEach((el) => {
    el.classList.remove("hit-block", "hit-degrade");
  });
}

function impactFrom(data, tableId, fieldId) {
  const target = `${tableId}.${fieldId}`;
  const hits = [];

  const markField = (t, f, reason, severity) => {
    hits.push({
      ref: `${t.id}.${f.id}`,
      label: `${t.label}.${f.label}`,
      reason,
      severity,
      detail: f.source?.notes || f.attributes || "",
      consumed_by: f.consumed_by || [],
    });
  };

  for (const t of data.tables) {
    for (const f of t.fields) {
      const ref = `${t.id}.${f.id}`;
      if (ref === target) {
        markField(t, f, "直接來源", f.required ? "block" : "degrade");
      }
      const frm = f.source?.from || "";
      if (frm === target || (frm.endsWith(`.${fieldId}`) && frm.includes(tableId))) {
        markField(t, f, "lookup／參照", f.required ? "block" : "degrade");
      }
    }
  }

  for (const rel of data.relations || []) {
    if (rel.from === target || rel.to === target) {
      const other = rel.from === target ? rel.to : rel.from;
      hits.push({
        ref: other,
        label: rel.label || other,
        reason: "表關聯",
        severity: "block",
        detail: `${rel.from} → ${rel.to}`,
        consumed_by: [],
      });
    }
  }

  for (const step of data.story.steps) {
    const blob = `${step.label} ${step.action} ${step.notes || ""}`;
    const fieldLabel =
      data.tables.flatMap((t) => t.fields).find((f) => f.id === fieldId)?.label ||
      fieldId;
    if (blob.includes(fieldId) || blob.includes(fieldLabel) || blob.includes("部門")) {
      // only auto-include department-related when querying department — keep generic:
      if (blob.includes(fieldLabel) || blob.includes(fieldId)) {
        hits.push({
          ref: step.id,
          label: step.label,
          reason: "流程步驟",
          severity: "degrade",
          detail: step.action,
          consumed_by: [roleName(data, step.actor)],
        });
      }
    }
  }

  // dedupe
  const seen = new Set();
  return hits.filter((h) => {
    const k = `${h.ref}|${h.reason}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function renderImpact(hits) {
  const ul = document.getElementById("impact-list");
  ul.innerHTML = "";
  if (!hits.length) {
    ul.innerHTML = "<li>地圖上找不到直接依賴。</li>";
    return;
  }
  clearHits();
  for (const h of hits) {
    const li = document.createElement("li");
    li.className = h.severity;
    const cons = h.consumed_by?.length ? h.consumed_by.join("、") : "—";
    li.innerHTML = `<span class="tag">${h.severity}</span><strong>${h.label}</strong> ← ${h.reason}；下游：${cons}${
      h.detail ? `<div class="meta">${h.detail}</div>` : ""
    }`;
    ul.appendChild(li);

    const el = document.querySelector(`.field[data-ref="${CSS.escape(h.ref)}"]`);
    if (el) {
      el.classList.add(h.severity === "block" ? "hit-block" : "hit-degrade");
    }
  }

  document.getElementById("impact-list").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function wireImpact(data) {
  const btn = document.getElementById("btn-impact");
  btn.disabled = false;
  btn.addEventListener("click", () => {
    const hits = impactFrom(data, "personnel", "department");
    renderImpact(hits);
  });
}

async function main() {
  try {
    const data = await loadMap();
    renderHero(data);
    renderStory(data);
    renderStores(data);
    renderTables(data, (tableId, fieldId) => {
      renderImpact(impactFrom(data, tableId, fieldId));
    });
    renderWaterfall(data);
    wireImpact(data);
    document.getElementById("impact-list").innerHTML =
      "<li>尚未模擬。點「人員.部門改 SAP 且缺值」，或點資料家裡的來源連結。</li>";
  } catch (err) {
    document.getElementById("system-name").textContent = "載入失敗";
    document.getElementById("one-liner").textContent = String(err);
  }
}

main();
