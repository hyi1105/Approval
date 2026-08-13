(() => {
  const STORAGE_KEY = "approval-play-v1";

  const SAMPLE = {
    id: "leave-sample",
    name: "請假簽核（範例）",
    fields: [
      {
        id: "employee",
        label: "申請人",
        type: "text",
        requiredAt: ["submit"],
        editableBy: ["applicant"],
        relevantAt: ["submit", "mgr", "hr"],
      },
      {
        id: "days",
        label: "天數",
        type: "number",
        requiredAt: ["submit"],
        editableBy: ["applicant"],
        relevantAt: ["submit", "mgr", "hr"],
      },
      {
        id: "reason",
        label: "事由",
        type: "text",
        requiredAt: ["submit"],
        editableBy: ["applicant"],
        relevantAt: ["submit", "mgr", "hr"],
      },
      {
        id: "coverage",
        label: "職務代理人",
        type: "text",
        requiredAt: ["approve"],
        editableBy: ["manager"],
        relevantAt: ["mgr", "hr"],
      },
      {
        id: "hr_note",
        label: "人資備註",
        type: "text",
        requiredAt: ["confirm"],
        editableBy: ["hr"],
        relevantAt: ["hr"],
      },
    ],
    pipeline: [
      { id: "submit", role: "applicant", label: "申請人", action: "submit" },
      { id: "mgr", role: "manager", label: "主管", action: "approve" },
      { id: "hr", role: "hr", label: "人資", action: "confirm" },
    ],
  };

  /** @type {{ systems: any[], activeSystemId: string, cases: Record<string, any> }} */
  let store = loadStore();

  const el = {
    systemSelect: document.getElementById("systemSelect"),
    systemHint: document.getElementById("systemHint"),
    roleSelect: document.getElementById("roleSelect"),
    pipelineList: document.getElementById("pipelineList"),
    caseStatus: document.getElementById("caseStatus"),
    stepHint: document.getElementById("stepHint"),
    formTitle: document.getElementById("formTitle"),
    fieldGrid: document.getElementById("fieldGrid"),
    chatLog: document.getElementById("chatLog"),
    commentInput: document.getElementById("commentInput"),
    btnPrimary: document.getElementById("btnPrimary"),
    btnDeny: document.getElementById("btnDeny"),
    btnRequestFill: document.getElementById("btnRequestFill"),
    btnNewSystem: document.getElementById("btnNewSystem"),
    builderDialog: document.getElementById("builderDialog"),
    builderForm: document.getElementById("builderForm"),
  };

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.systems?.length) return parsed;
      }
    } catch (_) {
      /* ignore */
    }
    return {
      systems: [SAMPLE],
      activeSystemId: SAMPLE.id,
      cases: {},
    };
  }

  function saveStore() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function activeSystem() {
    return (
      store.systems.find((s) => s.id === store.activeSystemId) || store.systems[0]
    );
  }

  function ensureCase(system) {
    if (!store.cases[system.id]) {
      store.cases[system.id] = {
        status: "open",
        stepIndex: 0,
        values: Object.fromEntries(system.fields.map((f) => [f.id, ""])),
        chat: [
          {
            kind: "system",
            text: `系統「${system.name}」已就緒。申請人填完必要欄後送出；之後每人核准或駁回。駁回即結束。`,
            at: Date.now(),
          },
        ],
        missingHighlight: [],
      };
    }
    return store.cases[system.id];
  }

  function currentStep(system, c) {
    if (c.status === "denied") return null;
    if (c.status === "done") return null;
    return system.pipeline[c.stepIndex] || null;
  }

  function roleLabel(system, roleId) {
    const hit = system.pipeline.find((p) => p.role === roleId);
    return hit ? hit.label : roleId;
  }

  function paintMode(field, step, roleId, status) {
    if (!step || status === "denied" || status === "done") {
      return { mode: "read", required: false, relevant: true };
    }
    const relevant =
      !field.relevantAt ||
      field.relevantAt.includes(step.id) ||
      field.relevantAt.includes("*");
    const canEdit =
      relevant &&
      status === "open" &&
      (field.editableBy || []).includes(roleId) &&
      step.role === roleId;
    const required =
      canEdit && (field.requiredAt || []).includes(step.action);
    if (!relevant) return { mode: "dim", required: false, relevant: false };
    if (canEdit) return { mode: "edit", required, relevant: true };
    return { mode: "read", required: false, relevant: true };
  }

  function missingRequired(system, c, step, roleId) {
    if (!step) return [];
    return system.fields.filter((f) => {
      const p = paintMode(f, step, roleId, c.status);
      if (!p.required) return false;
      const v = c.values[f.id];
      return v === "" || v === null || v === undefined;
    });
  }

  function renderSystems() {
    el.systemSelect.innerHTML = store.systems
      .map(
        (s) =>
          `<option value="${escapeAttr(s.id)}" ${
            s.id === store.activeSystemId ? "selected" : ""
          }>${escapeHtml(s.name)}</option>`
      )
      .join("");
    el.systemHint.textContent = "沒有系統就按「抽出新系統」。一流程一契約。";
  }

  function renderRoles(system) {
    const roles = [];
    const seen = new Set();
    for (const p of system.pipeline) {
      if (seen.has(p.role)) continue;
      seen.add(p.role);
      roles.push(p);
    }
    const prev = el.roleSelect.value;
    el.roleSelect.innerHTML = roles
      .map(
        (p) =>
          `<option value="${escapeAttr(p.role)}">${escapeHtml(p.label)}</option>`
      )
      .join("");
    if (roles.some((r) => r.role === prev)) el.roleSelect.value = prev;
    else {
      const step = currentStep(system, ensureCase(system));
      el.roleSelect.value = step ? step.role : roles[0]?.role || "";
    }
  }

  function renderPipeline(system, c) {
    el.pipelineList.innerHTML = system.pipeline
      .map((p, i) => {
        let cls = "";
        if (c.status === "denied" && i === c.stepIndex) cls = "denied";
        else if (c.status === "done" || i < c.stepIndex) cls = "done";
        else if (c.status === "open" && i === c.stepIndex) cls = "active";
        const actionLabel =
          p.action === "submit"
            ? "送出"
            : p.action === "approve"
              ? "核准"
              : "確認";
        return `<li class="${cls}"><span class="n">${i + 1}</span><div><div>${escapeHtml(
          p.label
        )}</div><div class="meta">${actionLabel} · ${escapeHtml(p.role)}</div></div></li>`;
      })
      .join("");
  }

  function renderStatus(system, c) {
    const step = currentStep(system, c);
    el.caseStatus.classList.remove("is-denied", "is-done");
    if (c.status === "denied") {
      el.caseStatus.textContent = "已駁回（結束）";
      el.caseStatus.classList.add("is-denied");
      el.stepHint.textContent = "此流程已結束。可改系統或抽出新系統再玩。";
    } else if (c.status === "done") {
      el.caseStatus.textContent = "已完成";
      el.caseStatus.classList.add("is-done");
      el.stepHint.textContent = "最後一關已確認。";
    } else if (step) {
      el.caseStatus.textContent = `進行中 · ${step.label}`;
      el.stepHint.textContent =
        step.action === "submit"
          ? "申請人填必要欄後送出。"
          : step.action === "approve"
            ? "可請對方補欄；核准前進、駁回結束。"
            : "必要欄齊才能留言確認；駁回結束。";
    }
  }

  function renderFields(system, c) {
    const roleId = el.roleSelect.value;
    const step = currentStep(system, c);
    const missing = new Set(
      missingRequired(system, c, step, roleId).map((f) => f.id)
    );
    const ask = new Set(c.missingHighlight || []);

    // 固定順序＝固定座標；只改 class / disabled
    el.fieldGrid.innerHTML = system.fields
      .map((f) => {
        const paint = paintMode(f, step, roleId, c.status);
        const isMissing = missing.has(f.id) || ask.has(f.id);
        const badges = [];
        if (paint.mode === "edit") badges.push(`<span class="badge edit">可編</span>`);
        if (paint.mode === "read") badges.push(`<span class="badge read">只看</span>`);
        if (paint.mode === "dim") badges.push(`<span class="badge">此步無關</span>`);
        if (paint.required || (f.requiredAt || []).includes(step?.action)) {
          badges.push(`<span class="badge req">必填@${escapeHtml(step?.action || "")}</span>`);
        }

        const disabled = paint.mode !== "edit";
        const val = c.values[f.id] ?? "";
        let control = "";
        if (f.type === "bool") {
          control = `<select data-field="${escapeAttr(f.id)}" ${
            disabled ? "disabled" : ""
          }>
            <option value="" ${val === "" ? "selected" : ""}>—</option>
            <option value="yes" ${val === "yes" ? "selected" : ""}>是</option>
            <option value="no" ${val === "no" ? "selected" : ""}>否</option>
          </select>`;
        } else if (f.type === "number") {
          control = `<input type="number" data-field="${escapeAttr(
            f.id
          )}" value="${escapeAttr(String(val))}" ${disabled ? "disabled" : ""} />`;
        } else {
          control = `<textarea rows="2" data-field="${escapeAttr(f.id)}" ${
            disabled ? "disabled" : ""
          }>${escapeHtml(String(val))}</textarea>`;
        }

        const cls = [
          "field",
          `mode-${paint.mode}`,
          paint.required ? "needs-req" : "",
          isMissing ? "is-missing" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `<div class="${cls}" data-field-id="${escapeAttr(f.id)}">
          <div class="label-col">
            <span class="label">${escapeHtml(f.label)}</span>
            <span class="key">${escapeHtml(f.id)}</span>
            <div class="badges">${badges.join("")}</div>
          </div>
          <div class="control">${control}</div>
        </div>`;
      })
      .join("");

    el.fieldGrid.querySelectorAll("[data-field]").forEach((node) => {
      node.addEventListener("input", onFieldInput);
      node.addEventListener("change", onFieldInput);
    });
  }

  function onFieldInput(e) {
    const system = activeSystem();
    const c = ensureCase(system);
    const id = e.target.getAttribute("data-field");
    c.values[id] = e.target.value;
    c.missingHighlight = (c.missingHighlight || []).filter((x) => x !== id);
    saveStore();
    // 只重刷缺欄標示，避免輸入時整個重繪造成失焦：輕量更新 class
    const step = currentStep(system, c);
    const roleId = el.roleSelect.value;
    const missing = new Set(
      missingRequired(system, c, step, roleId).map((f) => f.id)
    );
    el.fieldGrid.querySelectorAll(".field").forEach((box) => {
      const fid = box.getAttribute("data-field-id");
      box.classList.toggle("is-missing", missing.has(fid));
    });
  }

  function renderChat(c) {
    el.chatLog.innerHTML = c.chat
      .map((m) => {
        if (m.kind === "system") {
          return `<div class="bubble system"><div class="body">${escapeHtml(
            m.text
          )}</div></div>`;
        }
        const mine = m.role === el.roleSelect.value;
        return `<div class="bubble ${mine ? "mine" : ""}">
          <div class="who">${escapeHtml(m.who || m.role)}</div>
          <div class="body">${escapeHtml(m.text)}</div>
          <div class="time">${formatTime(m.at)}</div>
        </div>`;
      })
      .join("");
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
  }

  function renderActions(system, c) {
    const step = currentStep(system, c);
    const roleId = el.roleSelect.value;
    const myTurn = !!(step && step.role === roleId && c.status === "open");

    if (!step || c.status !== "open") {
      el.btnPrimary.disabled = true;
      el.btnDeny.disabled = true;
      el.btnRequestFill.disabled = true;
      el.btnPrimary.textContent = c.status === "done" ? "已完成" : "已結束";
      return;
    }

    const label =
      step.action === "submit"
        ? "送出"
        : step.action === "approve"
          ? "核准"
          : "確認（核准）";
    el.btnPrimary.textContent = label;
    el.btnPrimary.disabled = !myTurn;
    el.btnDeny.disabled = !myTurn || step.action === "submit";
    el.btnRequestFill.disabled = !myTurn || step.action === "submit";
  }

  function renderAll() {
    const system = activeSystem();
    const c = ensureCase(system);
    el.formTitle.textContent = system.name;
    renderSystems();
    renderRoles(system);
    renderPipeline(system, c);
    renderStatus(system, c);
    renderFields(system, c);
    renderChat(c);
    renderActions(system, c);
  }

  function pushChat(c, msg) {
    c.chat.push({ ...msg, at: Date.now() });
  }

  function takeComment() {
    const t = el.commentInput.value.trim();
    el.commentInput.value = "";
    return t;
  }

  function onPrimary() {
    const system = activeSystem();
    const c = ensureCase(system);
    const step = currentStep(system, c);
    const roleId = el.roleSelect.value;
    if (!step || step.role !== roleId || c.status !== "open") return;

    const missing = missingRequired(system, c, step, roleId);
    if (missing.length) {
      c.missingHighlight = missing.map((f) => f.id);
      const names = missing.map((f) => f.label).join("、");
      pushChat(c, {
        kind: "user",
        role: roleId,
        who: roleLabel(system, roleId),
        text: `還不能${
          step.action === "submit" ? "送出" : "核准"
        }：請先填 ${names}`,
      });
      saveStore();
      renderAll();
      return;
    }

    const comment = takeComment();
    const actionWord =
      step.action === "submit"
        ? "送出申請"
        : step.action === "approve"
          ? "核准，交給下一關"
          : "確認完成";
    pushChat(c, {
      kind: "user",
      role: roleId,
      who: roleLabel(system, roleId),
      text: comment ? `${actionWord}\n${comment}` : actionWord,
    });

    if (c.stepIndex >= system.pipeline.length - 1) {
      c.status = "done";
      pushChat(c, {
        kind: "system",
        text: "流程完成。資訊與動作契約已走完（畫面排列本來就可以不同）。",
      });
    } else {
      c.stepIndex += 1;
      const next = system.pipeline[c.stepIndex];
      pushChat(c, {
        kind: "system",
        text: `輪到「${next.label}」。必要欄若未齊，可按「請填必要欄」。`,
      });
      el.roleSelect.value = next.role;
    }
    c.missingHighlight = [];
    saveStore();
    renderAll();
  }

  function onDeny() {
    const system = activeSystem();
    const c = ensureCase(system);
    const step = currentStep(system, c);
    const roleId = el.roleSelect.value;
    if (!step || step.role !== roleId || c.status !== "open") return;
    if (step.action === "submit") return;

    const comment = takeComment();
    pushChat(c, {
      kind: "user",
      role: roleId,
      who: roleLabel(system, roleId),
      text: comment ? `駁回（結束）\n${comment}` : "駁回（結束）",
    });
    c.status = "denied";
    pushChat(c, { kind: "system", text: "已駁回，流程結束。" });
    saveStore();
    renderAll();
  }

  function onRequestFill() {
    const system = activeSystem();
    const c = ensureCase(system);
    const step = currentStep(system, c);
    const roleId = el.roleSelect.value;
    if (!step || step.role !== roleId || c.status !== "open") return;

    // 請填：針對「本關動作」標成必填、且目前空白的欄（含應由上游填的）
    const need = system.fields.filter((f) => {
      const reqHere = (f.requiredAt || []).some(
        (a) =>
          a === step.action ||
          a === "submit" ||
          (step.action === "confirm" && (a === "approve" || a === "submit"))
      );
      const empty = !c.values[f.id];
      return reqHere && empty;
    });

    if (!need.length) {
      pushChat(c, {
        kind: "user",
        role: roleId,
        who: roleLabel(system, roleId),
        text: "目前看得到的必要資訊都有了；若還要補，請直接留言指名欄位。",
      });
      saveStore();
      renderAll();
      return;
    }

    c.missingHighlight = need.map((f) => f.id);
    const names = need.map((f) => `「${f.label}」`).join("、");
    // 退回申請人補件（行為：請填），不結束流程
    const applicantStep = system.pipeline.find((p) => p.action === "submit");
    if (applicantStep && step.action !== "submit") {
      c.stepIndex = system.pipeline.indexOf(applicantStep);
      pushChat(c, {
        kind: "user",
        role: roleId,
        who: roleLabel(system, roleId),
        text: `請補填：${names}\n（已退回申請人；補完再送出）`,
      });
      el.roleSelect.value = applicantStep.role;
    } else {
      pushChat(c, {
        kind: "user",
        role: roleId,
        who: roleLabel(system, roleId),
        text: `請填：${names}`,
      });
    }
    saveStore();
    renderAll();
  }

  function parseBuilder() {
    const name = document.getElementById("bName").value.trim();
    const fieldLines = document
      .getElementById("bFields")
      .value.split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const pipeLines = document
      .getElementById("bPipe")
      .value.split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const fields = fieldLines.map((line) => {
      const [id, label, type, req] = line.split("|").map((x) => x.trim());
      const requiredAt = (req || "submit")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const editableBy = [];
      // 依必填步驟推誰可編：submit→第一關角色、approve→approve 關、confirm→confirm 關
      return {
        id,
        label: label || id,
        type: type || "text",
        requiredAt,
        editableBy, // 稍後依 pipeline 填
        relevantAt: ["*"],
      };
    });

    const pipeline = pipeLines.map((line) => {
      const [id, role, label, action] = line.split("|").map((x) => x.trim());
      return {
        id,
        role,
        label: label || role,
        action: action || "approve",
      };
    });

    for (const f of fields) {
      const owners = new Set();
      for (const a of f.requiredAt) {
        const step = pipeline.find((p) => p.action === a);
        if (step) owners.add(step.role);
      }
      if (!owners.size && pipeline[0]) owners.add(pipeline[0].role);
      f.editableBy = [...owners];
    }

    return {
      id: `sys-${Date.now()}`,
      name: name || "未命名系統",
      fields,
      pipeline,
    };
  }

  function resetCase(systemId) {
    delete store.cases[systemId];
  }

  el.systemSelect.addEventListener("change", () => {
    store.activeSystemId = el.systemSelect.value;
    saveStore();
    renderAll();
  });

  el.roleSelect.addEventListener("change", () => {
    // 只改 paint，不搬家
    renderAll();
  });

  el.btnPrimary.addEventListener("click", onPrimary);
  el.btnDeny.addEventListener("click", onDeny);
  el.btnRequestFill.addEventListener("click", onRequestFill);

  el.btnNewSystem.addEventListener("click", () => {
    el.builderDialog.showModal();
  });

  el.builderForm.addEventListener("submit", (e) => {
    const submitter = e.submitter;
    if (submitter && submitter.value === "cancel") return;
    e.preventDefault();
    const sys = parseBuilder();
    if (!sys.fields.length || !sys.pipeline.length) return;
    store.systems.push(sys);
    store.activeSystemId = sys.id;
    resetCase(sys.id);
    saveStore();
    el.builderDialog.close();
    renderAll();
  });

  // 雙擊狀態列：重置目前案件（方便重玩）
  el.caseStatus.title = "雙擊可重置此系統的案件";
  el.caseStatus.addEventListener("dblclick", () => {
    const system = activeSystem();
    resetCase(system.id);
    saveStore();
    renderAll();
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        month: "numeric",
        day: "numeric",
      });
    } catch (_) {
      return "";
    }
  }

  renderAll();
})();
