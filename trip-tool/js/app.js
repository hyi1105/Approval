/**
 * 環島路線工具
 * - Leaflet 地圖標註停留點
 * - OSRM 規劃機車／汽車路線
 * - Nominatim 地址定位
 * - 計算停留時間、點到點時間
 * - 各點可上傳照片（存在 localStorage，縮圖 base64）
 */

const STORAGE_KEY = "trip-tool-v1";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/** @typedef {{ id: string, name: string, address: string, lat: number, lng: number, arrive: string, leave: string, note?: string, photos?: string[] }} Stop */
/** @typedef {{ title: string, date: string, stops: Stop[], route?: { coords: [number, number][], distanceM: number, durationS: number } | null }} Trip */

/** @type {Trip} */
let trip = {
  title: "環島路線",
  date: new Date().toISOString().slice(0, 10),
  stops: [],
  route: null,
};

/** @type {string | null} */
let editingId = null;
/** @type {string[]} */
let draftPhotos = [];
/** @type {L.Map} */
let map;
/** @type {L.LayerGroup} */
let markerLayer;
/** @type {L.Polyline | null} */
let routeLine = null;
/** @type {Map<string, L.Marker>} */
const markerById = new Map();

const $ = (id) => document.getElementById(id);

function uid() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function parseHM(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(mins) {
  if (mins == null || Number.isNaN(mins)) return "—";
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(Math.round(mins));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} 分`;
  return `${sign}${h} 時 ${m} 分`;
}

function formatDurationSeconds(sec) {
  if (sec == null) return "—";
  return formatMinutes(sec / 60);
}

function formatKm(meters) {
  if (meters == null) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

function stayMinutes(stop) {
  return Math.max(0, parseHM(stop.leave) - parseHM(stop.arrive));
}

function travelMinutesBetween(a, b) {
  // Prefer scheduled gap leave→arrive; fallback to OSRM later in UI
  return parseHM(b.arrive) - parseHM(a.leave);
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
  } catch (err) {
    console.warn("localStorage full or blocked", err);
    toast("本機儲存空間不足（照片可能太多）");
  }
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function totalStayMinutes() {
  return trip.stops.reduce((sum, s) => sum + stayMinutes(s), 0);
}

function totalScheduledTravelMinutes() {
  let sum = 0;
  for (let i = 0; i < trip.stops.length - 1; i++) {
    sum += Math.max(0, travelMinutesBetween(trip.stops[i], trip.stops[i + 1]));
  }
  return sum;
}

function tripSpanMinutes() {
  if (trip.stops.length === 0) return 0;
  const first = trip.stops[0];
  const last = trip.stops[trip.stops.length - 1];
  return Math.max(0, parseHM(last.arrive) - parseHM(first.leave || first.arrive));
}

function updateStats() {
  const stay = totalStayMinutes();
  const rideSched = totalScheduledTravelMinutes();
  const total = tripSpanMinutes() || stay + rideSched;
  const dist = trip.route?.distanceM ?? null;
  const rideOsrm = trip.route?.durationS != null ? trip.route.durationS / 60 : null;

  $("statDistance").textContent = formatKm(dist);
  $("statRide").textContent = formatMinutes(rideOsrm ?? rideSched);
  $("statStay").textContent = formatMinutes(stay);
  $("statTotal").textContent = formatMinutes(total);

  $("mapDistance").textContent = formatKm(dist);
  $("mapTotal").textContent = formatMinutes(total);
  $("mapStart").textContent = trip.stops[0]
    ? `${trip.date} ${trip.stops[0].arrive}`
    : "—";
  $("mapEnd").textContent = trip.stops.length
    ? `${trip.date} ${trip.stops[trip.stops.length - 1].arrive}`
    : "—";

  $("tripTitle").textContent = trip.title || "路線紀錄";
  $("tripDate").textContent = trip.date || "";
}

function makePinIcon(index, kind = "mid") {
  const cls = kind === "start" ? "start" : kind === "end" ? "end" : "";
  return L.divIcon({
    className: "",
    html: `<div class="marker-pin ${cls}"><span>${index}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function popupHtml(stop, index) {
  const stay = stayMinutes(stop);
  const prev = index > 0 ? trip.stops[index - 1] : null;
  const travel = prev ? travelMinutesBetween(prev, stop) : null;
  const photos = (stop.photos || [])
    .map((src) => `<img src="${src}" alt="" />`)
    .join("");
  return `
    <div class="popup-card">
      <h3>${index}. ${escapeHtml(stop.name)}</h3>
      <p>${escapeHtml(stop.address || "")}</p>
      <p>抵達 <b>${stop.arrive}</b>　離開 <b>${stop.leave}</b></p>
      <p>停留 <b>${formatMinutes(stay)}</b>${
        travel != null ? `　上一段騎乘 <b>${formatMinutes(Math.max(0, travel))}</b>` : ""
      }</p>
      ${stop.note ? `<p>${escapeHtml(stop.note)}</p>` : ""}
      ${photos ? `<div class="photos">${photos}</div>` : ""}
      <button type="button" class="btn primary compact" data-edit="${stop.id}">編輯／上傳照片</button>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderMarkers() {
  markerLayer.clearLayers();
  markerById.clear();
  const n = trip.stops.length;
  trip.stops.forEach((stop, i) => {
    const kind = i === 0 ? "start" : i === n - 1 ? "end" : "mid";
    const marker = L.marker([stop.lat, stop.lng], {
      icon: makePinIcon(i + 1, kind),
      draggable: true,
      title: stop.name,
    });
    marker.bindPopup(() => popupHtml(stop, i + 1));
    marker.on("popupopen", (e) => {
      const btn = e.popup.getElement()?.querySelector("[data-edit]");
      btn?.addEventListener("click", () => openEditor(stop.id));
    });
    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      stop.lat = +ll.lat.toFixed(6);
      stop.lng = +ll.lng.toFixed(6);
      saveLocal();
      renderStopList();
      toast("已更新座標，可再按「規劃路線」");
    });
    marker.on("click", () => highlightStop(stop.id));
    marker.addTo(markerLayer);
    markerById.set(stop.id, marker);
  });
}

function renderRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
  if (trip.route?.coords?.length) {
    routeLine = L.polyline(trip.route.coords, {
      color: "#1b6ca8",
      weight: 5,
      opacity: 0.9,
      lineJoin: "round",
    }).addTo(map);
  }
}

function fitMap() {
  const pts = trip.stops.map((s) => [s.lat, s.lng]);
  if (trip.route?.coords?.length) {
    map.fitBounds(L.latLngBounds(trip.route.coords), { padding: [40, 40] });
  } else if (pts.length >= 2) {
    map.fitBounds(pts, { padding: [50, 50] });
  } else if (pts.length === 1) {
    map.setView(pts[0], 11);
  } else {
    map.setView([23.7, 121], 7);
  }
}

function renderStopList() {
  const list = $("stopList");
  list.innerHTML = "";
  trip.stops.forEach((stop, i) => {
    if (i > 0) {
      const prev = trip.stops[i - 1];
      const travel = Math.max(0, travelMinutesBetween(prev, stop));
      const chip = document.createElement("div");
      chip.className = "segment-chip";
      chip.textContent = `騎乘 ${formatMinutes(travel)} →`;
      list.appendChild(chip);
    }

    const card = document.createElement("article");
    card.className = "stop-card";
    card.dataset.id = stop.id;
    const stay = stayMinutes(stop);
    const thumbs = (stop.photos || [])
      .slice(0, 4)
      .map((src) => `<img src="${src}" alt="" />`)
      .join("");
    card.innerHTML = `
      <div class="top">
        <span class="idx">#${i + 1}</span>
        <span class="name">${escapeHtml(stop.name)}</span>
      </div>
      <div class="meta">
        <span>${stop.arrive}–${stop.leave}</span>
        <span>停留 <b>${formatMinutes(stay)}</b></span>
        ${stop.address ? `<span>${escapeHtml(stop.address)}</span>` : ""}
      </div>
      ${thumbs ? `<div class="thumbs">${thumbs}</div>` : ""}
    `;
    card.addEventListener("click", () => {
      highlightStop(stop.id);
      const m = markerById.get(stop.id);
      if (m) {
        map.panTo(m.getLatLng());
        m.openPopup();
      }
      openEditor(stop.id);
    });
    list.appendChild(card);
  });
}

function highlightStop(id) {
  document.querySelectorAll(".stop-card").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === id);
  });
}

function refreshAll() {
  renderStopList();
  renderMarkers();
  renderRoute();
  updateStats();
  saveLocal();
}

async function fetchRoute() {
  if (trip.stops.length < 2) {
    trip.route = null;
    refreshAll();
    toast("至少需要 2 個停留點");
    return;
  }

  const path = trip.stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `${OSRM_URL}/${path}?overview=full&geometries=geojson`;
  $("btnRoute").disabled = true;
  $("btnRoute").textContent = "規劃中…";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) throw new Error(data.message || "無路線");
    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    trip.route = {
      coords,
      distanceM: route.distance,
      durationS: route.duration,
    };
    refreshAll();
    fitMap();
    toast(`路線完成：${formatKm(route.distance)}`);
  } catch (err) {
    console.error(err);
    // Fallback: straight segments
    const coords = trip.stops.map((s) => [s.lat, s.lng]);
    let distanceM = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      distanceM += map.distance(coords[i], coords[i + 1]);
    }
    trip.route = { coords, distanceM, durationS: null };
    refreshAll();
    fitMap();
    toast("路線服務暫時不可用，已改畫直線連線");
  } finally {
    $("btnRoute").disabled = false;
    $("btnRoute").textContent = "規劃路線";
  }
}

async function geocode(query) {
  const q = query.trim();
  if (!q) throw new Error("請輸入地址");
  const params = new URLSearchParams({
    q: q.includes("台灣") || q.includes("臺灣") || q.toLowerCase().includes("taiwan")
      ? q
      : `${q}, 台灣`,
    format: "json",
    limit: "1",
    countrycodes: "tw",
  });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("定位失敗");
  const data = await res.json();
  if (!data.length) throw new Error("找不到此地點");
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display: data[0].display_name,
  };
}

function openEditor(id = null) {
  editingId = id;
  const modal = $("stopModal");
  const stop = id ? trip.stops.find((s) => s.id === id) : null;
  $("modalTitle").textContent = stop ? "編輯停留點" : "新增停留點";
  $("stopId").value = stop?.id || "";
  $("fName").value = stop?.name || "";
  $("fAddress").value = stop?.address || "";
  $("fLat").value = stop?.lat ?? "";
  $("fLng").value = stop?.lng ?? "";
  $("fArrive").value = stop?.arrive || "12:00";
  $("fLeave").value = stop?.leave || "12:20";
  $("fNote").value = stop?.note || "";
  draftPhotos = [...(stop?.photos || [])];
  renderPhotoGrid();
  $("btnDeleteStop").style.display = stop ? "inline-flex" : "none";
  modal.showModal();
}

function renderPhotoGrid() {
  const grid = $("photoGrid");
  grid.innerHTML = "";
  draftPhotos.forEach((src, i) => {
    const div = document.createElement("div");
    div.className = "shot";
    div.innerHTML = `<img src="${src}" alt="" /><button type="button" aria-label="移除">×</button>`;
    div.querySelector("button").addEventListener("click", () => {
      draftPhotos.splice(i, 1);
      renderPhotoGrid();
    });
    grid.appendChild(div);
  });
}

function readFilesAsDataUrls(fileList, maxW = 960, quality = 0.72) {
  return Promise.all(
    [...fileList].map(
      (file) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            const scale = Math.min(1, maxW / img.width);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", quality));
          };
          img.onerror = reject;
          img.src = url;
        })
    )
  );
}

function saveStopFromForm(ev) {
  ev.preventDefault();
  const id = $("stopId").value || uid();
  const payload = {
    id,
    name: $("fName").value.trim(),
    address: $("fAddress").value.trim(),
    lat: parseFloat($("fLat").value),
    lng: parseFloat($("fLng").value),
    arrive: $("fArrive").value,
    leave: $("fLeave").value,
    note: $("fNote").value.trim(),
    photos: draftPhotos,
  };
  if (Number.isNaN(payload.lat) || Number.isNaN(payload.lng)) {
    toast("請先定位或填入座標");
    return;
  }
  const idx = trip.stops.findIndex((s) => s.id === id);
  if (idx >= 0) trip.stops[idx] = payload;
  else trip.stops.push(payload);
  // Keep chronological by arrive time
  trip.stops.sort((a, b) => parseHM(a.arrive) - parseHM(b.arrive));
  $("stopModal").close();
  refreshAll();
  toast("已儲存停留點");
}

function deleteCurrentStop() {
  const id = $("stopId").value;
  if (!id) return;
  if (!confirm("確定刪除此停留點？")) return;
  trip.stops = trip.stops.filter((s) => s.id !== id);
  $("stopModal").close();
  refreshAll();
}

async function loadSample() {
  const res = await fetch("data/sample-trip.json");
  const data = await res.json();
  trip = {
    title: data.title,
    date: data.date,
    stops: data.stops.map((s) => ({ ...s, photos: s.photos || [] })),
    route: null,
  };
  refreshAll();
  await fetchRoute();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(trip, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `trip-${trip.date || "export"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.stops)) throw new Error("格式錯誤");
      trip = {
        title: data.title || "匯入行程",
        date: data.date || "",
        stops: data.stops,
        route: data.route || null,
      };
      refreshAll();
      fitMap();
      toast("匯入成功");
    } catch (err) {
      toast("匯入失敗");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

/**
 * Parse lines like:
 * 05:00 台北出發
 * 06:00-06:20 北宜坪林7-11 (20分鐘)
 * 23:21到台北
 */
function parseItineraryText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const stops = [];
  for (const line of lines) {
    let m = line.match(
      /^(\d{1,2}:\d{2})\s*[-–~〜到至]\s*(\d{1,2}:\d{2})\s*(.+?)(?:\s*[（(]\s*\d+\s*分鐘?\s*[）)])?\s*$/
    );
    if (m) {
      let name = m[3].trim().replace(/\s*[（(]\s*\d+\s*分鐘?\s*[）)]\s*$/, "");
      stops.push({
        id: uid(),
        name,
        address: name,
        lat: NaN,
        lng: NaN,
        arrive: normalizeTime(m[1]),
        leave: normalizeTime(m[2]),
        note: "",
        photos: [],
      });
      continue;
    }
    m = line.match(/^(\d{1,2}:\d{2})\s*(?:到)?\s*(.+)$/);
    if (m) {
      const name = m[2].trim();
      const t = normalizeTime(m[1]);
      stops.push({
        id: uid(),
        name,
        address: name,
        lat: NaN,
        lng: NaN,
        arrive: t,
        leave: t,
        note: "",
        photos: [],
      });
    }
  }
  return stops;
}

function normalizeTime(t) {
  const [h, m] = t.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Rough Taiwan fallbacks when geocode fails / skipped */
const NAME_COORDS = [
  [/台北|臺北/, 25.0478, 121.5319],
  [/坪林/, 24.9356, 121.7112],
  [/蘇澳|南聖湖/, 24.5945, 121.8518],
  [/崇德/, 24.1684, 121.6535],
  [/靜浦|北回歸線/, 23.4533, 121.3734],
  [/葉氏|台東市|臺東市/, 22.7552, 121.1448],
  [/三越/, 22.7518, 121.1465],
  [/枋山|楓港/, 22.1588, 120.6825],
  [/內埔|涼山/, 22.6448, 120.5689],
  [/玉井|走馬瀨/, 23.1245, 120.4608],
  [/通宵|落日/, 24.4912, 120.6774],
  [/高雄/, 22.6273, 120.3014],
  [/台中|臺中/, 24.1477, 120.6736],
  [/花蓮/, 23.9871, 121.6012],
  [/台南|臺南/, 22.9997, 120.227],
];

function guessCoords(name) {
  for (const [re, lat, lng] of NAME_COORDS) {
    if (re.test(name)) return { lat, lng };
  }
  return null;
}

async function applyPastedItinerary(text, doGeocode) {
  const parsed = parseItineraryText(text);
  if (!parsed.length) {
    toast("無法解析行程文字");
    return;
  }
  for (const stop of parsed) {
    const guess = guessCoords(stop.name);
    if (guess) {
      stop.lat = guess.lat;
      stop.lng = guess.lng;
    }
    if (doGeocode) {
      try {
        await new Promise((r) => setTimeout(r, 1100)); // Nominatim rate limit
        const g = await geocode(stop.address || stop.name);
        stop.lat = g.lat;
        stop.lng = g.lng;
        stop.address = g.display;
      } catch {
        /* keep guess */
      }
    }
    if (Number.isNaN(stop.lat) || Number.isNaN(stop.lng)) {
      stop.lat = 23.7;
      stop.lng = 121;
    }
  }
  trip.stops = parsed;
  trip.route = null;
  if (!trip.title) trip.title = "自訂行程";
  refreshAll();
  await fetchRoute();
  toast(`已建立 ${parsed.length} 個停留點`);
}

function initMap() {
  map = L.map("map", { zoomControl: true }).setView([23.7, 121], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  // Click map to draft new stop coords
  map.on("click", (e) => {
    if ($("stopModal").open) {
      $("fLat").value = e.latlng.lat.toFixed(6);
      $("fLng").value = e.latlng.lng.toFixed(6);
      toast("已填入點擊座標");
    }
  });
}

function bindUi() {
  $("btnAddStop").addEventListener("click", () => openEditor(null));
  $("btnRoute").addEventListener("click", () => fetchRoute());
  $("btnLoadSample").addEventListener("click", () => loadSample());
  $("btnPasteItinerary").addEventListener("click", () => {
    $("fPaste").value = "";
    $("pasteModal").showModal();
  });
  $("btnCancelPaste").addEventListener("click", () => $("pasteModal").close());
  $("pasteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("fPaste").value;
    const doGeocode = $("fGeocodeAll").checked;
    $("pasteModal").close();
    toast(doGeocode ? "定位中，請稍候…" : "建立中…");
    await applyPastedItinerary(text, doGeocode);
  });
  $("btnExport").addEventListener("click", exportJson);
  $("btnImport").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJson(file);
    e.target.value = "";
  });
  $("btnToggleSidebar").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });
  $("stopForm").addEventListener("submit", saveStopFromForm);
  $("btnCancelStop").addEventListener("click", () => $("stopModal").close());
  $("btnDeleteStop").addEventListener("click", deleteCurrentStop);
  $("btnGeocode").addEventListener("click", async () => {
    try {
      $("btnGeocode").disabled = true;
      const result = await geocode($("fAddress").value || $("fName").value);
      $("fLat").value = result.lat.toFixed(6);
      $("fLng").value = result.lng.toFixed(6);
      if (!$("fAddress").value) $("fAddress").value = result.display;
      toast("定位成功");
      map.setView([result.lat, result.lng], 14);
    } catch (err) {
      toast(err.message || "定位失敗");
    } finally {
      $("btnGeocode").disabled = false;
    }
  });
  $("fPhotos").addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const urls = await readFilesAsDataUrls(files);
      draftPhotos.push(...urls);
      renderPhotoGrid();
      toast(`已加入 ${urls.length} 張照片`);
    } catch (err) {
      console.error(err);
      toast("照片讀取失敗");
    }
    e.target.value = "";
  });
}

async function boot() {
  initMap();
  bindUi();
  const local = loadLocal();
  if (local?.stops?.length) {
    trip = local;
    refreshAll();
    fitMap();
  } else {
    await loadSample();
  }
}

boot();
