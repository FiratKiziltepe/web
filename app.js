import * as pdfjsLib from "./vendor/pdf.min.mjs";
import { parseProgram, detectStartPage, detectCourseCode } from "./parser.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.min.mjs", import.meta.url).href;

const $ = (id) => document.getElementById(id);
const el = {
  drop: $("drop"), file: $("file"), uploader: $("uploader"),
  courseCode: $("courseCode"), startPage: $("startPage"),
  progress: $("progress"), barFill: $("barFill"), progressText: $("progressText"),
  error: $("error"), results: $("results"),
  sumFile: $("sumFile"), sumCode: $("sumCode"), sumRows: $("sumRows"),
  sumAreas: $("sumAreas"), sumPages: $("sumPages"), warnings: $("warnings"),
  fGrade: $("fGrade"), fArea: $("fArea"), fSearch: $("fSearch"), fIssues: $("fIssues"),
  btnExcel: $("btnExcel"), btnReset: $("btnReset"), btnExpand: $("btnExpand"),
  tbody: $("tbody"), empty: $("empty"), count: $("count"),
};

const HEADERS = [
  "Sıra No",
  "Ünite/Tema/Öğrenme alanı",
  "Öğrenme Çıktısı",
  "Süreç Bileşenleri",
  "Öğrenme Öğretme Uygulamaları",
];

let state = { rows: [], filtered: [], fileName: "", expanded: false, open: new Set() };

/* ---------------- yükleme olayları ---------------- */

el.drop.addEventListener("click", () => el.file.click());
el.drop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.file.click(); }
});
el.file.addEventListener("change", (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

["dragenter", "dragover"].forEach((t) =>
  el.drop.addEventListener(t, (e) => { e.preventDefault(); el.drop.classList.add("over"); })
);
["dragleave", "drop"].forEach((t) =>
  el.drop.addEventListener(t, (e) => { e.preventDefault(); el.drop.classList.remove("over"); })
);
el.drop.addEventListener("drop", (e) => {
  const f = e.dataTransfer?.files?.[0];
  if (f) handleFile(f);
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

/* ---------------- PDF işleme ---------------- */

function setProgress(pct, text) {
  el.progress.hidden = false;
  el.barFill.style.width = Math.max(2, Math.min(100, pct)) + "%";
  if (text) el.progressText.textContent = text;
}

function showError(msg) {
  el.error.hidden = false;
  el.error.textContent = msg;
  el.progress.hidden = true;
}

async function handleFile(file) {
  el.error.hidden = true;
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    showError("Lütfen PDF biçiminde bir dosya seçin.");
    return;
  }
  state.fileName = file.name;
  setProgress(3, "PDF okunuyor…");

  try {
    const buf = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({
      data: new Uint8Array(buf),
      isEvalSupported: false,
    }).promise;

    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      pages.push(
        tc.items
          .filter((i) => i.str && i.str.trim() !== "")
          .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: i.height }))
      );
      page.cleanup();
      if (p % 3 === 0 || p === doc.numPages) {
        setProgress(5 + (p / doc.numPages) * 80, `Sayfalar çözümleniyor… ${p}/${doc.numPages}`);
        await new Promise((r) => setTimeout(r));
      }
    }

    setProgress(90, "Tablo oluşturuluyor…");
    await new Promise((r) => setTimeout(r, 30));

    const manualStart = parseInt(el.startPage.value, 10);
    const opts = {};
    if (el.courseCode.value.trim()) opts.courseCode = el.courseCode.value.trim().toLocaleUpperCase("tr-TR");
    if (Number.isFinite(manualStart) && manualStart > 0) opts.startPage = manualStart - 1;

    const res = parseProgram(pages, opts);

    if (!res.rows.length) {
      const auto = detectStartPage(pages);
      const cand = detectCourseCode(pages, auto.start).candidates.slice(0, 5);
      showError(
        "Bu PDF'ten öğrenme çıktısı çıkarılamadı. " +
        (cand.length
          ? `Bulunan olası ders kodları: ${cand.map((c) => c[0]).join(", ")}. Gelişmiş ayarlardan ders kodunu veya başlangıç sayfasını elle girmeyi deneyin.`
          : "Dosya taranmış (görüntü tabanlı) olabilir; metin katmanı içeren bir PDF gerekir.")
      );
      return;
    }

    state.rows = res.rows;
    state.open = new Set();
    setProgress(100, "Tamamlandı.");
    renderSummary(res, doc.numPages);
    buildFilters(res.rows);
    applyFilters();
    el.results.hidden = false;
    setTimeout(() => { el.progress.hidden = true; }, 500);
    el.results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    showError("PDF işlenirken bir hata oluştu: " + (err?.message || err));
  }
}

/* ---------------- özet & filtreler ---------------- */

function renderSummary(res, pageCount) {
  el.sumFile.textContent = state.fileName.replace(/\.pdf$/i, "");
  el.sumCode.textContent = res.courseCode || "—";
  el.sumRows.textContent = res.rows.length;
  el.sumAreas.textContent = new Set(res.rows.map((r) => `${r.grade}-${r.area}`)).size;
  el.sumPages.textContent = pageCount;
  if (!el.courseCode.value.trim()) el.courseCode.placeholder = `Otomatik: ${res.courseCode}`;

  if (res.warnings.length) {
    el.warnings.hidden = false;
    el.warnings.innerHTML =
      "<b>Dikkat edilmesi gerekenler</b><ul>" +
      res.warnings.map((w) => `<li>${esc(w)}</li>`).join("") +
      "</ul>";
  } else {
    el.warnings.hidden = true;
  }
}

function buildFilters(rows) {
  const grades = [...new Set(rows.map((r) => r.grade).filter((g) => g != null))].sort((a, b) => a - b);
  el.fGrade.innerHTML =
    '<option value="">Tümü</option>' + grades.map((g) => `<option value="${g}">${g}. sınıf</option>`).join("");
  const areas = [...new Set(rows.map((r) => r.area).filter(Boolean))];
  el.fArea.innerHTML =
    '<option value="">Tümü</option>' + areas.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
}

[el.fGrade, el.fArea, el.fIssues].forEach((n) => n.addEventListener("change", applyFilters));
el.fSearch.addEventListener("input", debounce(applyFilters, 180));

function applyFilters() {
  const g = el.fGrade.value, a = el.fArea.value;
  const q = el.fSearch.value.trim().toLocaleLowerCase("tr-TR");
  const onlyIssues = el.fIssues.checked;
  state.filtered = state.rows.filter((r) => {
    if (g && String(r.grade) !== g) return false;
    if (a && r.area !== a) return false;
    if (onlyIssues && !isIssue(r)) return false;
    if (q) {
      const hay = `${r.outcome} ${r.area} ${r.components} ${r.applications}`.toLocaleLowerCase("tr-TR");
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  renderTable(q);
}

/* ---------------- tablo ---------------- */

function renderTable(q) {
  const rows = state.filtered;
  el.count.textContent = `${rows.length} kayıt gösteriliyor (toplam ${state.rows.length}).`;
  el.empty.hidden = rows.length > 0;
  el.btnExcel.textContent = rows.length === state.rows.length ? "Excel indir" : `Excel indir (${rows.length} satır)`;

  const frag = document.createDocumentFragment();
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="t-no" data-label="Sıra No">${i + 1}</td>
      <td class="t-area" data-label="Ünite/Tema/Öğrenme alanı">${hl(r.area, q)}</td>
      <td data-label="Öğrenme Çıktısı">${hl(r.outcome, q)}</td>
      <td data-label="Süreç Bileşenleri">${hl(r.components, q)}</td>
      <td data-label="Öğrenme Öğretme Uygulamaları">${appCell(r, q)}</td>`;
    frag.appendChild(tr);
  });
  el.tbody.replaceChildren(frag);

  el.tbody.querySelectorAll(".more").forEach((b) => {
    b.addEventListener("click", () => {
      const code = b.dataset.code;
      const box = b.previousElementSibling;
      const on = box.classList.toggle("clamp");
      if (on) state.open.delete(code); else state.open.add(code);
      b.textContent = on ? "Devamını göster" : "Daha az göster";
    });
  });
}

function isIssue(r) {
  return !r.applications || r.applications.length < 200;
}

function appCell(r, q) {
  if (!r.applications)
    return '<span class="missing">Bu çıktı için kaynak PDF\'te uygulama metni bulunamadı.</span>';
  const text = r.applications;
  const long = text.length > 420;
  const open = state.expanded || state.open.has(r.code) || !long;
  return (
    `<div class="${open ? "" : "clamp"}">${hl(text, q)}</div>` +
    (long ? `<button class="more" type="button" data-code="${esc(r.code)}">${open ? "Daha az göster" : "Devamını göster"}</button>` : "")
  );
}

el.btnExpand.addEventListener("click", () => {
  state.expanded = !state.expanded;
  state.open = new Set();
  el.btnExpand.textContent = state.expanded ? "Metinleri kısalt" : "Metinleri aç";
  renderTable(el.fSearch.value.trim().toLocaleLowerCase("tr-TR"));
});

el.btnReset.addEventListener("click", () => {
  state = { rows: [], filtered: [], fileName: "", expanded: false, open: new Set() };
  el.results.hidden = true;
  el.file.value = "";
  el.fSearch.value = "";
  el.progress.hidden = true;
  el.error.hidden = true;
  el.btnExpand.textContent = "Metinleri aç";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ---------------- Excel ---------------- */

el.btnExcel.addEventListener("click", async () => {
  const rows = state.filtered.length ? state.filtered : state.rows;
  if (!rows.length) return;
  el.btnExcel.disabled = true;
  const prev = el.btnExcel.textContent;
  el.btnExcel.textContent = "Hazırlanıyor…";
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Öğretim Programı Veri Çıkarma Aracı";
    const ws = wb.addWorksheet("Sayfa1", { views: [{ state: "frozen", ySplit: 1 }] });

    ws.columns = [
      { header: HEADERS[0], key: "no", width: 9 },
      { header: HEADERS[1], key: "area", width: 24 },
      { header: HEADERS[2], key: "outcome", width: 49 },
      { header: HEADERS[3], key: "comp", width: 38 },
      { header: HEADERS[4], key: "app", width: 95 },
    ];

    rows.forEach((r, i) =>
      ws.addRow({ no: i + 1, area: r.area, outcome: r.outcome, comp: r.components, app: r.applications })
    );

    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F5E8C" } };
    head.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    head.height = 30;

    ws.eachRow((row, n) => {
      if (n === 1) return;
      row.alignment = { vertical: "top", wrapText: true };
      row.getCell(1).alignment = { vertical: "top", horizontal: "center" };
    });
    ws.autoFilter = { from: "A1", to: "E1" };

    const buf = await wb.xlsx.writeBuffer();
    const name = (state.fileName.replace(/\.pdf$/i, "") || "ogretim-programi") + "-cikti.xlsx";
    downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name);
  } catch (err) {
    console.error(err);
    showError("Excel dosyası oluşturulamadı: " + (err?.message || err));
  } finally {
    el.btnExcel.disabled = false;
    el.btnExcel.textContent = prev;
  }
});

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------------- yardımcılar ---------------- */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function hl(text, q) {
  const safe = esc(text);
  if (!q) return safe;
  const needle = esc(q);
  const idx = safe.toLocaleLowerCase("tr-TR");
  let out = "", from = 0, at;
  while ((at = idx.indexOf(needle, from)) !== -1) {
    out += safe.slice(from, at) + "<mark>" + safe.slice(at, at + needle.length) + "</mark>";
    from = at + needle.length;
    if (needle.length === 0) break;
  }
  return out + safe.slice(from);
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
