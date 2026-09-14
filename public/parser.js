/* =========================================================================
 *  Öğretim Programı PDF Ayrıştırıcı  (Türkiye Yüzyılı Maarif Modeli formatı)
 *  Tarayıcıda ve Node'da aynı şekilde çalışır.
 *  Girdi : pdf.js text item'larından üretilmiş sayfa dizisi
 *          pages[i] = [{ str, x, y, w, h }, ...]
 *  Çıktı : { rows, courseCode, warnings, ... }
 * =======================================================================*/

const UP = "A-ZÇĞİÖŞÜ";

/* ---------- Yardımcılar -------------------------------------------------- */

const norm = (s) =>
  (s || "")
    .normalize("NFC")
    .toLocaleUpperCase("tr-TR")
    .replace(/[‐‑–—−]/g, "-")
    .replace(/ÖĞRENME\s*-?\s*ÖĞRETME/g, "ÖĞRENME-ÖĞRETME")
    .replace(/[’'`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* satır sonu tiresini kaldırarak birleştir */
function appendText(buf, next) {
  const t = (next || "").trim();
  if (!t) return buf;
  if (!buf) return t;
  if (/[-‐‑–]$/.test(buf) && /^[a-zçğıöşü]/.test(t)) {
    return buf.replace(/[-‐‑–]$/, "") + t;
  }
  return buf + " " + t;
}

/* ---------- 1) Satır kurma ---------------------------------------------- */

function buildLines(items, yTol = 2.6) {
  const sorted = items
    .filter((i) => i.str && i.str.trim() !== "")
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row.y - it.y) <= yTol) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  return rows;
}

function joinItems(items) {
  let out = "";
  let prevEnd = null;
  let prevH = 10;
  for (const it of items) {
    if (out === "") {
      out = it.str;
    } else {
      // Sıkıştırılmış (iki yana yaslı) satırlarda kelime arası boşluk çok dar
      // olabildiği için eşik yazı boyutuna göre belirlenir.
      const limit = Math.max(0.25, 0.06 * (prevH || 10));
      out += (it.x - prevEnd > limit ? " " : "") + it.str;
    }
    prevEnd = it.x + (it.w || 0);
    prevH = it.h || prevH;
  }
  return out.replace(/\s+/g, " ").trim();
}

/* ---------- 2) Etiket sözlüğü ------------------------------------------- */
/* Maarif Modeli öğretim programlarında tablo etiketleri tüm derslerde aynıdır.
   Etiketler satır başında yer alır ve ardından hücre boşluğu gelir.        */

const SEC = { OUTCOMES: "outcomes", APPS: "apps", NONE: "none" };

const LABELS = [
  // --- öğrenme çıktıları ---
  [/^ÖĞRENME ÇIKTILARI(?: VE)?(?: SÜREÇ BİLEŞENLERİ)?/, SEC.OUTCOMES],
  [/^VE SÜREÇ BİLEŞENLERİ/, SEC.OUTCOMES],
  [/^SÜREÇ BİLEŞENLERİ/, SEC.OUTCOMES],
  // --- öğrenme-öğretme uygulamaları ---
  [/^ÖĞRENME-ÖĞRETME UYGULAMALARI/, SEC.APPS],
  [/^UYGULAMALARI/, SEC.APPS],
  // --- diğer bölümler (veri alınmaz) ---
  [/^İÇERİK ÇERÇEVESİ/, SEC.NONE],
  [/^ANAHTAR KAVRAMLAR/, SEC.NONE],
  [/^ÖĞRENME KANITLARI/, SEC.NONE],
  [/^KANITLARI/, SEC.NONE],
  [/^\(ÖLÇME VE/, SEC.NONE],
  [/^DEĞERLENDİRME\)/, SEC.NONE],
  [/^ÖĞRENME-ÖĞRETME$/, SEC.NONE],
  [/^ÖĞRENME-ÖĞRETME YAŞANTILARI/, SEC.NONE],
  [/^YAŞANTILARI/, SEC.NONE],
  [/^TEMEL KABULLER/, SEC.NONE],
  [/^ÖN DEĞERLENDİRME SÜRECİ/, SEC.NONE],
  [/^KÖPRÜ KURMA/, SEC.NONE],
  [/^FARKLILAŞTIRMA/, SEC.NONE],
  [/^ZENGİNLEŞTİRME/, SEC.NONE],
  [/^DESTEKLEME/, SEC.NONE],
  [/^ÖĞRETMEN YANSITMALARI/, SEC.NONE],
  [/^YANSITMALARI/, SEC.NONE],
  [/^DERS SAATİ/, SEC.NONE],
  [/^ALAN BECERİLERİ/, SEC.NONE],
  [/^KAVRAMSAL BECERİLER/, SEC.NONE],
  [/^EĞİLİMLER/, SEC.NONE],
  [/^PROGRAMLAR ARASI/, SEC.NONE],
  [/^BİLEŞENLER$/, SEC.NONE],
  [/^SOSYAL-DUYGUSAL/, SEC.NONE],
  [/^ÖĞRENME BECERİLERİ/, SEC.NONE],
  [/^DEĞERLER$/, SEC.NONE],
  [/^OKURYAZARLIK/, SEC.NONE],
  [/^BECERİLERİ$/, SEC.NONE],
  [/^DİSİPLİNLER ARASI/, SEC.NONE],
  [/^İLİŞKİLER$/, SEC.NONE],
  [/^BECERİLER ARASI/, SEC.NONE],
  [/^ÖĞRENME$/, SEC.NONE],
];

/* Sayfanın gövde (içerik) sütununun sol kenarını bul.
   Tablo düzeninde sol sütun etiketler, sağ sütun içeriktir.                */
export function detectContentX(items) {
  const hist = new Map();
  for (const it of items) {
    if (!it.str || it.str.trim().length < 2) continue;
    if (it.y > 780 || it.y < 30) continue; // üst/alt bilgi
    const k = Math.round(it.x * 2) / 2;
    if (k < 40) continue;
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  let best = null;
  for (const [x, n] of hist) {
    if (n >= 3 && (best === null || x < best)) best = x;
  }
  return best;
}

/* İçerik sütununa düşmüş bölüm başlıkları (metin taşmasını durdurur) */
const BLEED_GUARD =
  /^(FARKLILAŞTIRMA|ZENGİNLEŞTİRME|DESTEKLEME|ÖĞRETMEN YANSITMALARI|ÖĞRENME KANITLARI|ÖĞRENME ÇIKTILARI|İÇERİK ÇERÇEVESİ|ANAHTAR KAVRAMLAR|TEMEL KABULLER|ÖN DEĞERLENDİRME SÜRECİ|KÖPRÜ KURMA|DERS SAATİ|ÖĞRENME-ÖĞRETME YAŞANTILARI)\b/;

/* Tek başına anlamı belirsiz, iki satıra bölünmüş etiket parçaları */
const FRAGMENT_LABEL =
  /^(ÖĞRENME-ÖĞRETME|ÖĞRENME|BİLEŞENLER|BECERİLERİ|BECERİLER|İLİŞKİLER|DEĞERLER|YANSITMALARI|KANITLARI|YAŞANTILARI|UYGULAMALARI|ARASI)$/;

export function classifyLabel(label) {
  const nl = norm(label);
  for (const [re, sec] of LABELS) if (re.test(nl)) return sec;
  return null;
}

/* Satırı "etiket + içerik" olarak çöz. */
function splitRow(row, contentX) {
  const items = row.items;
  const full = joinItems(items);
  // Some PDFs store both table cells in one text item. Split explicit
  // headings before applying the coordinate-based column boundary.
  const inline = full.match(/^(Öğrenme[\s‐‑–—-]*Öğretme\s+Uygulamaları|ÖĞRENME ÇIKTILARI(?: VE SÜREÇ BİLEŞENLERİ)?)(?=\s|$)/i);
  if (inline) return { label: inline[0], section: classifyLabel(inline[0]), text: full.slice(inline[0].length).trim(), full };
  if (contentX == null) return { label: "", section: null, text: full, full };

  const cut = contentX - 1.5;
  const left = items.filter((i) => i.x < cut);
  const right = items.filter((i) => i.x >= cut);
  const label = joinItems(left);
  const text = joinItems(right);

  const section = label ? classifyLabel(label) : null;
  // Sol sütunda metin yoksa satır tamamen içeriktir
  return { label, section, text: section ? text : full, full };
}

/* ---------- 3) Ders kodu tespiti ---------------------------------------- */

// S.B., S. B. ve SB aynı ders kodudur. Sayısal basamaklar değişmez.
const normalizeCourseCode = (code) => norm(code).replace(/[.\s]+/g, "");

export function detectCourseCode(pages, startPage = 0) {
  const scan = (segments) => {
    const counts = new Map();
    const re = new RegExp(
      `(?:^|[\\s(\\[])([${UP}](?:[${UP}0-9]|\\s*\\.\\s*[${UP}]){1,7})((?:\\s*\\.\\s*|\\s+)\\d+(?:\\s*\\.\\s*\\d+){${segments - 1}})(?!\\d|\\s*\\.\\s*\\d)`,
      "g"
    );
    for (let p = startPage; p < pages.length; p++) {
      const txt = " " + buildLines(pages[p]).map((r) => joinItems(r.items)).join(" ");
      let m;
      while ((m = re.exec(txt))) {
        const code = normalizeCourseCode(m[1]);
        counts.set(code, (counts.get(code) || 0) + 1);
      }
    }
    return [...counts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
  };
  // önce ders.sınıf.alan.çıktı (3 sayı), bulunamazsa ders.alan.çıktı (2 sayı)
  let sorted = scan(3);
  if (!sorted.length) sorted = scan(2);
  return { code: sorted.length ? sorted[0][0] : null, candidates: sorted };
}

/* ---------- 4) İçeriğin başlayacağı sayfa -------------------------------- */
/* "Programın yapısı" tanıtım sayfaları ("Dersin kodu", "Sınıf seviyesi",
   "Öğrenme alanı numarası" şemasını taşıyan sayfalar) atlanır.             */

function isSchemaPage(text) {
  let hits = 0;
  if (/DERSİN KODU/.test(text)) hits++;
  if (/ÖĞRENME ÇIKTISI NUMARASI/.test(text)) hits++;
  if (/ÖĞRENME ALANI NUMARASI/.test(text)) hits++;
  if (/SINIF SEVİYESİ/.test(text)) hits++;
  return hits >= 2;
}

export function detectStartPage(pages) {
  const pageText = pages.map((items) => norm(items.map((i) => i.str).join(" ")));

  let last = -1;
  pageText.forEach((t, i) => { if (isSchemaPage(t)) last = i; });
  if (last >= 0) return { start: last + 1, reason: "programın yapısı sayfası" };

  const i2 = pageText.findIndex((t, i) => i > 2 && /SINIF DÜZEYLERİNE AİT/.test(t));
  if (i2 >= 0) return { start: i2, reason: "bölüm başlığı" };

  const i3 = pageText.findIndex((t, i) => i > 4 && /(ÖĞRENME ALANI|ÜNİTE|TEMA)\s*:/.test(t));
  if (i3 >= 0) return { start: i3, reason: "ilk öğrenme alanı" };

  return { start: 0, reason: "varsayılan" };
}

/* ---------- 5) Ana ayrıştırma ------------------------------------------- */

/* "3. ÖĞRENME ALANI: AİLEM VE TOPLUM" · "1. ÜNİTE: …" · "ÜNİTE 1: …" · "2. TEMA: …" */
const AREA_RES = [
  /^\s*(\d+)\s*[.)]\s*(?:ÖĞRENME ALANI|ÖĞRENME ALANl|ÜNİTE|TEMA)\s*[::]\s*(.+)$/,
  /^\s*(?:ÖĞRENME ALANI|ÜNİTE|TEMA)\s*(\d+)\s*[::]\s*(.+)$/,
];

function matchArea(nfull) {
  for (const re of AREA_RES) {
    const m = nfull.match(re);
    if (m) return m;
  }
  return null;
}

export function parseProgram(pages, options = {}) {
  const warnings = [];
  const startPage =
    options.startPage != null ? options.startPage : detectStartPage(pages).start;
  const courseCode =
    normalizeCourseCode(options.courseCode || "") || detectCourseCode(pages, startPage).code;

  if (!courseCode) {
    warnings.push("Ders kodu tespit edilemedi. Kodu elle girmeyi deneyin.");
    return { rows: [], courseCode: null, startPage, warnings, areaCount: 0 };
  }

  /* Ders kısaltmasındaki noktalar isteğe bağlıdır: SB ve S.B. */
  const coursePattern = [...courseCode].map(escapeRe).join("\\s*\\.?\\s*");
  const codeLead = new RegExp(
    `^\\s*(${coursePattern}(?:\\s*\\.\\s*|\\s+)\\d+(?:\\s*\\.\\s*\\d+){1,3})\\s*\\.?(?=[\\s)a-zçğıöşü(]|$)`,
    "i"
  );
  const cleanCode = (s) => courseCode + "." + s.match(/\d+/g).join(".");

  /* 5a) içerik sayfalarını tek akışa çevir */
  const stream = [];
  for (let p = startPage; p < pages.length; p++) {
    const ntxt = norm(pages[p].map((i) => i.str).join(" "));
    if (isSchemaPage(ntxt)) continue;
    const contentX = detectContentX(pages[p]);
    const lines = buildLines(pages[p]).map(row => ({ ...splitRow(row, contentX), page: p, y: row.y }));
    // Resolve multi-line sidebar headings before reading adjacent content. The
    // first code can sit slightly above its heading (different font baselines).
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^ÖĞRENME-ÖĞRETME(?:\s|$)/.test(norm(line.label))) {
        const tail = lines.slice(i + 1, i + 3).find(n => /^UYGULAMALARI/.test(norm(n.label)) && line.y - n.y < 35);
        if (tail) {
          line.section = SEC.APPS;
          if (line.label && line.text.startsWith(line.label)) line.text = line.text.slice(line.label.length).trim();
          const prev = lines[i - 1];
          if (prev && !prev.label && prev.y - line.y <= 5 && codeLead.test(prev.text)) prev.section = SEC.APPS;
        }
      }
    }
    stream.push(...lines);
  }

  /* 5b) yinelenen üstbilgi / altbilgi satırlarını ele */
  const freq = new Map();
  for (const ln of stream) {
    const k = norm(ln.full).replace(/\d+/g, "#");
    if (k.length > 8) freq.set(k, (freq.get(k) || 0) + 1);
  }
  const chromeKeys = new Set(
    [...freq.entries()]
      .filter(([k, n]) => n >= Math.max(5, stream.length / 300) && k.length < 140 && /PROGRAM|BAKANLIĞ/.test(k))
      .map(([k]) => k)
  );
  const isChrome = (ln) => {
    const t = ln.full.trim();
    if (!t) return true;
    if (/^\d{1,4}$/.test(t)) return true;
    if (t.length < 140 && /(?:DERS.*ÖĞRET.*PROGRAM|^PROGRAMI$)/.test(norm(t))) return true;
    return chromeKeys.has(norm(t).replace(/\d+/g, "#"));
  };

  /* 5c) durum makinesi */
  const outcomes = new Map();
  const apps = new Map();
  const areas = [];
  let area = null;
  let section = SEC.NONE;
  let curOutcome = null;
  let curApp = null;
  let order = 0;

  for (let si = 0; si < stream.length; si++) {
    const ln = stream[si];
    if (isChrome(ln)) continue;

    /* öğrenme alanı / ünite başlığı */
    const am = matchArea(norm(ln.full));
    if (am) {
      const name = ln.full.slice(ln.full.indexOf(":") + 1).trim();
      area = { no: +am[1], name: name || am[2] };
      areas.push(area);
      section = SEC.NONE;
      curOutcome = null;
      curApp = null;
      continue;
    }

    /* Etiket iki satıra bölünmüş olabilir ("Öğrenme-Öğretme" / "Uygulamaları").
       Parça etiketlerde bir sonraki satırın etiketiyle birleştirip sınıflandır. */
    let sec = ln.section;
    if (ln.label && FRAGMENT_LABEL.test(norm(ln.label)) && sec !== SEC.APPS) {
      const nxt = stream[si + 1];
      if (nxt && nxt.label) {
        const combo = classifyLabel(ln.label + " " + nxt.label);
        if (combo) sec = combo;
      }
    }

    if (sec) {
      if (sec !== section) { curOutcome = null; curApp = null; }
      section = sec;
    }

    const body = (ln.text || "").trim();
    if (!body) continue;

    /* Güvenlik ağı: sütun ayrımı bozulup bölüm başlığı içerik sütununa
       düşerse (sayfa düzeni değişen PDF'ler) metnin taşmasını engelle. */
    if (body.length <= 60) {
      const nb = norm(body);
      if (BLEED_GUARD.test(nb)) {
        section = classifyLabel(body) || SEC.NONE;
        curOutcome = null;
        curApp = null;
        continue;
      }
    }

    if (section === SEC.OUTCOMES) {
      const lead = body.match(codeLead);
      if (lead) {
        const code = cleanCode(lead[1]);
        curOutcome = {
          code,
          title: body.slice(lead[0].length).trim().replace(/^[.\s]+/, ""),
          comps: [],
          area: area ? area.name : "",
          areaNo: area ? area.no : null,
          order: order++,
        };
        if (!outcomes.has(code)) outcomes.set(code, curOutcome);
        else curOutcome = outcomes.get(code);
      } else if (/^[a-zçğıöşü]\s*[)\.]\s/.test(body)) {
        if (curOutcome) curOutcome.comps.push(body.trim());
      } else if (curOutcome) {
        if (curOutcome.comps.length) {
          const i = curOutcome.comps.length - 1;
          curOutcome.comps[i] = appendText(curOutcome.comps[i], body);
        } else {
          curOutcome.title = appendText(curOutcome.title, body);
        }
      }
      continue;
    }

    if (section === SEC.APPS) {
      const lead = body.match(codeLead);
      if (lead) {
        curApp = cleanCode(lead[1]);
        const rest = body.slice(lead[0].length).trim();
        apps.set(curApp, appendText(apps.get(curApp) || "", rest));
      } else if (curApp) {
        apps.set(curApp, appendText(apps.get(curApp) || "", body));
      }
      continue;
    }
  }

  /* 5d) eşleşmeyen uygulama kodlarını onar
     (kaynak PDF'te "BİY.11.10" gibi eksik yazılmış başlıklar görülebiliyor) */
  const repaired = [];
  for (const appCode of [...apps.keys()]) {
    if (outcomes.has(appCode)) continue;
    const a = appCode.split(".").slice(1);
    const hits = [...outcomes.keys()].filter((oc) => {
      if (apps.has(oc)) return false;
      const o = oc.split(".").slice(1);
      if (o.length !== a.length + 1) return false;
      // ortadaki (öğrenme alanı) basamağı düşünce kod tutuyor mu?
      return o.filter((_, i) => i !== 1).join(".") === a.join(".");
    });
    if (hits.length === 1) {
      apps.set(hits[0], apps.get(appCode));
      apps.delete(appCode);
      repaired.push(`${appCode} → ${hits[0]}`);
    }
  }
  if (repaired.length)
    warnings.push(
      `Kaynak PDF'te eksik yazılmış ${repaired.length} uygulama başlığı eşleştirildi: ${repaired
        .slice(0, 6)
        .join(", ")}${repaired.length > 6 ? " …" : ""}`
    );

  /* 5e) satırları üret */
  const rows = [];
  for (const o of [...outcomes.values()].sort((a, b) => a.order - b.order)) {
    const nums = o.code.split(".").slice(1).map(Number);
    const grade = nums.length >= 3 ? nums[0] : null;
    const app = (apps.get(o.code) || "").trim();
    rows.push({
      no: rows.length + 1,
      grade,
      areaNo: o.areaNo,
      area: o.area,
      code: o.code,
      outcome: `${o.code}. ${o.title}`.replace(/\s+/g, " ").trim(),
      components: o.comps.length
        ? o.comps.join(" ").replace(/\s+/g, " ").trim()
        : "Yok",
      applications: app ? `${o.code} ${app}`.replace(/\s+/g, " ").trim() : "",
    });
  }

  const missing = rows.filter((r) => !r.applications).map((r) => r.code);
  if (missing.length)
    warnings.push(
      `${missing.length} öğrenme çıktısının uygulama metni bulunamadı: ${missing
        .slice(0, 10)
        .join(", ")}${missing.length > 10 ? " …" : ""}`
    );
  const orphanApps = [...apps.keys()].filter((c) => !outcomes.has(c));
  if (orphanApps.length)
    warnings.push(
      `${orphanApps.length} uygulama metni bir çıktıyla eşleşmedi: ${orphanApps
        .slice(0, 10)
        .join(", ")}${orphanApps.length > 10 ? " …" : ""}`
    );
  if (!rows.length) warnings.push("Hiç öğrenme çıktısı bulunamadı.");

  return {
    rows,
    courseCode,
    startPage,
    warnings,
    areaCount: areas.length,
    areas: areas.map((a) => a.name),
  };
}
