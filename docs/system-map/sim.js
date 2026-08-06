/**
 * System Map 角色×情境模擬
 * 硬規則：欄位 DOM／格子位置建立後永不移除、永不重排；只改 paint class。
 */

const KIND_LABEL = {
  auto: "自動產生",
  manual: "人工輸入",
  lookup: "參照帶入",
  api_sync: "API 同步",
  computed: "計算",
  derived_permission: "依權限決定",
};

const PAINT_LABEL = {
  edit: "我會填／會改",
  view: "我看得到（不能改）",
  use: "這步會用到／依賴",
  idle: "仍在地圖上（這步與我無關）",
  break: "這情境會壞／缺值風險",
};

const state = {
  data: null,
  roleId: null,
  sceneId: null,
  selectedRef: null,
};

function roleName(id) {
  return state.data.roles.find((r) => r.id === id)?.label || id;
}

function scenesFromData(data) {
  const scenes = data.story.steps.map((s) => ({
    id: s.id,
    label: s.label,
    kind: "step",
    actor: s.actor,
    action: s.action,
    notes: s.notes || "",
  }));
  // 額外衝擊情境：馬路還在，但漆成 break
  scenes.push({
    id: "impact_sap_dept",
    label: "衝擊：SAP 缺部門",
    kind: "impact",
    actor: null,
    action: "假設人員主檔改由 SAP 提供，且沒有「部門」欄。看地圖哪些地點會亮紅——位置不變。",
    notes: "對照你原本的痛點：改來源時立刻看出炸掉的路。",
    breakRefs: ["personnel.department", "resignation.department"],
  });
  return scenes;
}

function fieldRef(tableId, fieldId) {
  return `${tableId}.${fieldId}`;
}

function findField(ref) {
  const [tid, fid] = ref.split(".");
  const table = state.data.tables.find((t) => t.id === tid);
  const field = table?.fields.find((f) => f.id === fid);
  return { table, field, ref };
}

function matrixFor(field, stepId, roleId) {
  return (field.step_matrix || []).find((m) => m.step === stepId && m.role === roleId);
}

function paintFor({ field, tableId, roleId, scene }) {
  const ref = fieldRef(tableId, field.id);

  if (scene.kind === "impact") {
    if ((scene.breakRefs || []).includes(ref)) return "break";
    // 衝擊情境：仍依「若我是目前角色、站在相關步驟」淡淡標示依賴，但不搬走
    const used =
      (field.consumed_by || []).some((c) => String(c).includes("department") || String(c).includes("部門")) ||
      field.source?.from === "personnel.department";
    if (used && ref !== "personnel.department") return "use";
    return "idle";
  }

  const stepId = scene.id;
  const cell = matrixFor(field, stepId, roleId);
  const isActor = scene.actor === roleId;

  // 1) 這步矩陣：可編／必填優先（會變色＝你會動到）
  if (cell?.editable || cell?.must_fill) return "edit";
  if ((field.editable_by || []).includes(roleId) && isActor) return "edit";

  // 1b) 這步明確「可見不可編」＝核對／簽核視線（藍），不要被下游 use 蓋掉
  if (cell?.visible && !cell.editable) return "view";

  // 2) 這步依賴的來源欄（lookup from）— 仍在原地，漆成「會用到」
  for (const t of state.data.tables) {
    for (const f of t.fields) {
      if (f.source?.from !== ref) continue;
      const m = matrixFor(f, stepId, roleId);
      const actorFills =
        isActor && ((f.filled_by || []).includes(roleId) || m?.editable || m?.must_fill);
      const anyoneTouches = m?.visible || m?.editable || m?.must_fill;
      if (actorFills || (isActor && anyoneTouches)) return "use";
    }
  }

  const consumedHere = (field.consumed_by || []).some(
    (c) => String(c).includes(stepId) || String(c).includes("通知")
  );
  if (consumedHere && isActor) return "use";

  // 3) 可見但不能改（無矩陣格時）
  if ((field.visible_to || []).includes(roleId)) return "view";

  // 4) 無關：變淡，禁止從地圖移除
  return "idle";
}

function buildCity(data) {
  const city = document.getElementById("city");
  city.innerHTML = "";
  const storeLabel = Object.fromEntries((data.system.stores || []).map((s) => [s.id, s.label]));

  // 固定順序：先人員主檔（上游城區），再離職單（下游城區）——地理不變
  const order = [...data.tables].sort((a, b) => {
    const score = (t) => (t.id === "personnel" ? 0 : t.id === "resignation" ? 1 : 2);
    return score(a) - score(b);
  });

  for (const table of order) {
    const district = document.createElement("section");
    district.className = "district";
    district.dataset.table = table.id;

    const head = document.createElement("h3");
    head.className = "district-head";
    head.textContent = table.label;
    district.appendChild(head);

    const meta = document.createElement("p");
    meta.className = "district-meta";
    meta.textContent = `存在：${storeLabel[table.store] || table.store}${table.notes ? ` · ${table.notes}` : ""}`;
    district.appendChild(meta);

    for (const field of table.fields) {
      const ref = fieldRef(table.id, field.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plot paint-idle";
      btn.dataset.ref = ref;
      btn.setAttribute("aria-label", `${table.label} ${field.label}`);
      btn.innerHTML = `
        <span class="addr">${table.id}.${field.id}</span>
        <span class="name">${field.label}</span>
        <span class="tag" data-tag>…</span>
      `;
      btn.addEventListener("click", () => selectField(ref));
      district.appendChild(btn);
    }
    city.appendChild(district);
  }
}

function drawRoads() {
  const svg = document.getElementById("roads");
  const wrap = svg.parentElement;
  const rect = wrap.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  svg.innerHTML = "";

  const relations = state.data.relations || [];
  for (const rel of relations) {
    const fromEl = document.querySelector(`.plot[data-ref="${CSS.escape(rel.to)}"]`);
    // relation: resignation.department → personnel.department；線畫在兩端點之間
    const a = document.querySelector(`.plot[data-ref="${CSS.escape(rel.from)}"]`);
    const b = document.querySelector(`.plot[data-ref="${CSS.escape(rel.to)}"]`);
    if (!a || !b) continue;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const x1 = ra.left + ra.width / 2 - rect.left;
    const y1 = ra.top + ra.height / 2 - rect.top;
    const x2 = rb.left + rb.width / 2 - rect.left;
    const y2 = rb.top + rb.height / 2 - rect.top;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const midX = (x1 + x2) / 2;
    path.setAttribute("d", `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
    path.setAttribute("class", "road-line");
    path.dataset.from = rel.from;
    path.dataset.to = rel.to;
    svg.appendChild(path);
  }
}

function litRoads() {
  document.querySelectorAll(".road-line").forEach((line) => {
    line.classList.remove("lit-edit", "lit-use", "lit-break");
    const from = line.dataset.from;
    const to = line.dataset.to;
    const pa = document.querySelector(`.plot[data-ref="${CSS.escape(from)}"]`);
    const pb = document.querySelector(`.plot[data-ref="${CSS.escape(to)}"]`);
    const classes = `${pa?.className || ""} ${pb?.className || ""}`;
    if (classes.includes("paint-break")) line.classList.add("lit-break");
    else if (classes.includes("paint-edit")) line.classList.add("lit-edit");
    else if (classes.includes("paint-use")) line.classList.add("lit-use");
  });
}

function applyPaint() {
  const scene = scenesFromData(state.data).find((s) => s.id === state.sceneId);
  const roleId = state.roleId;
  if (!scene || !roleId) return;

  const counts = { edit: 0, view: 0, use: 0, idle: 0, break: 0 };

  for (const table of state.data.tables) {
    for (const field of table.fields) {
      const ref = fieldRef(table.id, field.id);
      const paint = paintFor({ field, tableId: table.id, roleId, scene });
      counts[paint] = (counts[paint] || 0) + 1;
      const el = document.querySelector(`.plot[data-ref="${CSS.escape(ref)}"]`);
      if (!el) continue;
      el.classList.remove("paint-edit", "paint-view", "paint-use", "paint-idle", "paint-break");
      el.classList.add(`paint-${paint}`);
      const tag = el.querySelector("[data-tag]");
      if (tag) tag.textContent = PAINT_LABEL[paint];
    }
  }

  document.getElementById("scene-title").textContent = `${roleName(roleId)} × ${scene.label}`;
  document.getElementById("scene-blurb").textContent =
    scene.kind === "impact"
      ? scene.action
      : `${scene.action}${scene.notes ? `（${scene.notes}）` : ""}`;

  const bits = [];
  if (counts.edit) bits.push(`會改 ${counts.edit} 格`);
  if (counts.view) bits.push(`只看 ${counts.view} 格`);
  if (counts.use) bits.push(`依賴 ${counts.use} 格`);
  if (counts.break) bits.push(`風險 ${counts.break} 格`);
  bits.push(`其餘 ${counts.idle} 格仍在原地（變淡，沒消失）`);
  document.getElementById("paint-summary").textContent = bits.join(" · ");

  litRoads();
  if (state.selectedRef) renderInspector(state.selectedRef);
}

function selectField(ref) {
  state.selectedRef = ref;
  document.querySelectorAll(".plot").forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.ref === ref);
  });
  renderInspector(ref);
}

function renderInspector(ref) {
  const { table, field } = findField(ref);
  const body = document.getElementById("inspect-body");
  if (!table || !field) {
    body.innerHTML = `<p class="placeholder">找不到欄位。</p>`;
    return;
  }

  const scene = scenesFromData(state.data).find((s) => s.id === state.sceneId);
  const paint = paintFor({
    field,
    tableId: table.id,
    roleId: state.roleId,
    scene,
  });

  const src = field.source || {};
  const whyNow = (() => {
    if (paint === "edit") {
      return `此刻你是「${roleName(state.roleId)}」、情境「${scene.label}」——這個欄位輪到你填或修改。改完會影響：${(field.consumed_by || []).join("、") || "（地圖上的下游）"}。`;
    }
    if (paint === "view") {
      return `你看得到內容，但這個情境不准你改（常見：主管／人資核對，不能動申請人原內容）。`;
    }
    if (paint === "use") {
      return `你不一定直接改它，但這步流程或畫面會依賴它（例如 lookup 來源、路由、通知）。`;
    }
    if (paint === "break") {
      return `在這個衝擊情境裡，它是爆點或直接受害者。位置還在，只是整格亮紅提醒你：馬路還在，但可能會斷。`;
    }
    return `對你現在的角色×情境來說，這格不是你的主戰場——但它仍釘在地圖上，方便你對照「我家門前那條路」。`;
  })();

  body.innerHTML = `
    <p class="inspect-kicker">${table.label} · ${ref}</p>
    <h3 class="inspect-title">${field.label}</h3>
    <p><span class="badge ${paint}">${PAINT_LABEL[paint]}</span></p>
    <ul class="inspect-list">
      <li><strong>這格是什麼：</strong>${field.attributes || field.label}（${field.type}${field.required ? "，必填" : ""}）</li>
      <li><strong>資料怎麼來：</strong>${KIND_LABEL[src.kind] || src.kind}${src.from ? ` ← ${src.from}` : ""}${src.condition ? `；${src.condition}` : ""}${src.notes ? `；${src.notes}` : ""}</li>
      <li><strong>誰常填：</strong>${(field.filled_by || []).map(roleName).join("、") || "（系統／無人手填）"}</li>
      <li><strong>後來誰用：</strong>${(field.consumed_by || []).join("、") || "—"}</li>
      <li><strong>在這個模擬裡：</strong>${whyNow}</li>
    </ul>
  `;
}

function buildChips() {
  const roles = document.getElementById("role-chips");
  const scenes = document.getElementById("scene-chips");
  roles.innerHTML = "";
  scenes.innerHTML = "";

  for (const role of state.data.roles) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.setAttribute("role", "radio");
    btn.dataset.role = role.id;
    btn.textContent = role.label;
    btn.addEventListener("click", () => {
      state.roleId = role.id;
      syncChipAria();
      // 若目前情境主角不是此人，自動跳到該角色第一個步驟（較直覺）
      const own = scenesFromData(state.data).find((s) => s.kind === "step" && s.actor === role.id);
      if (own && state.sceneId !== "impact_sap_dept") state.sceneId = own.id;
      syncChipAria();
      applyPaint();
    });
    roles.appendChild(btn);
  }

  for (const scene of scenesFromData(state.data)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.setAttribute("role", "radio");
    btn.dataset.scene = scene.id;
    btn.textContent = scene.label.replace(/^STEP\d+\s*/, "") || scene.label;
    if (scene.kind === "impact") btn.textContent = scene.label;
    btn.addEventListener("click", () => {
      state.sceneId = scene.id;
      if (scene.kind === "step" && scene.actor) state.roleId = scene.actor;
      syncChipAria();
      applyPaint();
    });
    scenes.appendChild(btn);
  }
}

function syncChipAria() {
  document.querySelectorAll("#role-chips .chip").forEach((el) => {
    el.setAttribute("aria-checked", String(el.dataset.role === state.roleId));
  });
  document.querySelectorAll("#scene-chips .chip").forEach((el) => {
    el.setAttribute("aria-checked", String(el.dataset.scene === state.sceneId));
  });
}

async function main() {
  const res = await fetch("./resignation.example.json");
  if (!res.ok) throw new Error("無法載入地圖資料");
  state.data = await res.json();
  document.getElementById("system-name").textContent = state.data.system.name;
  document.title = `模擬｜${state.data.system.name}`;

  const params = new URLSearchParams(location.search);
  state.roleId = params.get('role') || state.data.roles[0]?.id;
  state.sceneId = params.get('scene') || state.data.story.steps[0]?.id;

  buildChips();
  syncChipAria();
  buildCity(state.data);

  // 等字型／版面後畫路
  requestAnimationFrame(() => {
    drawRoads();
    applyPaint();
  });
  window.addEventListener("resize", () => {
    drawRoads();
    litRoads();
  });
}

main().catch((err) => {
  document.getElementById("system-name").textContent = "載入失敗";
  document.getElementById("scene-blurb").textContent = String(err);
});
