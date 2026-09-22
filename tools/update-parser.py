from pathlib import Path
p=Path('public/parser.js');s=p.read_text('utf-8')
s=s.replace('const LABELS = [', '''const EN_LABELS = [
  [/^LEARNING OUTCOMES(?: AND PROCESS COMPONENTS)?$/, SEC.OUTCOMES],
  [/^(?:AND )?PROCESS COMPONENTS$/, SEC.OUTCOMES],
  [/^LEARNING[ -]TEACHING PRACTICES$/, SEC.APPS],
  [/^(?:CONTENT FRAME|INDICATORS FOR LEARNING(?: \\(ASSESSMENT AND EVALUATION\\))?|LEARNING[ -]TEACHING EXPERIENCES|DIFFERENTIATION|EXPANSION|SUPPORTING|TEACHER REFLECTIONS|BASIC ACCEPTATIONS(?::.*)?|PRE-EVALUATION PROCESS|ESTABLISHING LINKS)$/, SEC.NONE],
];

const LABELS = [''')
s=s.replace('const nl = norm(label);', 'const nl = norm(label);\n  for (const [re, sec] of EN_LABELS) if (re.test(nl.replace(/İ/g, "I"))) return sec;')
s=s.replace('const full = joinItems(items);', '''const full = joinItems(items);
  const enSection = EN_LABELS.find(([re]) => re.test(norm(full).replace(/İ/g, "I")));
  if (enSection) return { label: full, section: enSection[1], text: "", full };''',1)
a=s.index('  const scan = (segments) => {',s.index('export function detectCourseCode'))
b=s.index('\n}\n',a)
s=s[:a]+'''  const counts = new Map();
  // A course prefix contains letters; the first number belongs to its code,
  // even when the separator is missing (TDE3.1).
  const re = new RegExp(`(?:^|[\\\\s(\\\\[])([${UP}](?:[${UP}]|\\\\s*\\\\.\\\\s*[${UP}]){1,7})\\\\s*\\\\.?\\\\s*\\\\d+(?:\\\\s*\\\\.\\\\s*[${UP}]*\\\\d+){1,3}(?![${UP}\\\\d]|\\\\s*\\\\.\\\\s*\\\\d)`, "g");
  for (let p = startPage; p < pages.length; p++) {
    if (isSchemaPage(norm(pages[p].map(i => i.str).join(" ")))) continue;
    for (const row of buildLines(pages[p])) {
      const txt = joinItems(row.items);
      for (const m of txt.matchAll(re)) {
        const code = normalizeCourseCode(m[1]);
        counts.set(code, (counts.get(code) || 0) + 1);
      }
    }
  }
  const sorted = [...counts].filter(([, n]) => n >= 3).sort((a,b) => b[1]-a[1]);
  return { code: sorted[0]?.[0] || null, candidates: sorted };'''+s[b:]
s=s.replace('let hits = 0;', '''let hits = 0;
  if (/COURSE CODE/.test(text)) hits++;
  if (/NUMBER OF LEARNING OUTCOME/.test(text)) hits++;
  if (/NUMBER OF THEME/.test(text)) hits++;''',1)
s=s.replace('const AREA_RES = [', 'const AREA_RES = [\n  /^\\s*THEME\\s*(\\d+)\\s*:\\s*(.+)$/,')
a=s.index('  const codeLead = new RegExp(');b=s.index('\n\n  /* 5a)',a)
s=s[:a]+'''  const codeLead = new RegExp(
    `^\\\\s*(${coursePattern}\\\\s*\\\\.?\\\\s*(\\\\d+(?:\\\\s*\\\\.\\\\s*[${UP}]*\\\\d+){1,3}))\\\\s*\\\\.?(?=[\\\\s,;:)a-zçğıöşü(]|$)`, "i"
  );
  const cleanCode = (s) => {
    const lead = s.match(codeLead);
    return courseCode + "." + lead[2].replace(/\\s+/g, "").toLocaleUpperCase("tr-TR");
  };'''+s[b:]
s=s.replace('/(?:DERS.*ÖĞRET.*PROGRAM|^PROGRAMI$)/','/(?:DERS.*ÖĞRET.*PROGRAM|^PROGRAMI$|^THE ENGLISH LANGUAGE CURRICULUM$)/')
s=s.replace('let order = 0;', '''let order = 0;
  let scope = 0;
  let currentGrade = null;
  const keyFor = code => `${scope}|${code}`;''')
s=s.replace('    /* öğrenme alanı / ünite başlığı */', '''    const gradeHeading = norm(ln.full).match(/^(?:(\\d+)\\. SINIF TEMALARI|HAZIRLIK SINIFI TEMALARI)$/);
    if (gradeHeading) { currentGrade = gradeHeading[1] ? +gradeHeading[1] : "Hazırlık"; continue; }

    /* öğrenme alanı / ünite başlığı */''')
s=s.replace('      areas.push(area);', '      areas.push(area);\n      scope++;')
s=s.replace('    if (!body) continue;', '''    if (!body) continue;
    // Skill subheadings separate TDE application groups without becoming part
    // of the preceding outcome's prose.
    if (/^(Metin Tahlili \\(Anlama\\)|Edebiyat Atölyesi \\(Anlatma\\)|Dinleme\\/İzleme|Okuma|Konuşma|Yazma)$/.test(body)) {
      curOutcome = null; curApp = null; continue;
    }''')
s=s.replace('          code,\n          title:', '          code,\n          key: keyFor(code),\n          scope,\n          grade: currentGrade,\n          title:')
s=s.replace('if (!outcomes.has(code)) outcomes.set(code, curOutcome);\n        else curOutcome = outcomes.get(code);', 'if (!outcomes.has(curOutcome.key)) outcomes.set(curOutcome.key, curOutcome);\n        else curOutcome = outcomes.get(curOutcome.key);')
a=s.index('    if (section === SEC.APPS) {');b=s.index('\n  /* 5d)',a)
s=s[:a]+'''    if (section === SEC.APPS) {
      const lead = body.match(codeLead);
      if (lead) {
        curApp = [keyFor(cleanCode(lead[1]))];
        let rest = body.slice(lead[0].length).trim();
        // A heading can name several outcomes sharing the following activity.
        while (true) {
          const nextText = rest.replace(/^(?:[,;]\\s*|(?:ve|and)\\s+)/i, "");
          if (nextText === rest) break;
          const next = nextText.match(codeLead);
          if (!next) break;
          curApp.push(keyFor(cleanCode(next[1])));
          rest = nextText.slice(next[0].length).trim();
        }
        for (const key of curApp) apps.set(key, appendText(apps.get(key) || "", rest));
      } else if (curApp) {
        for (const key of curApp) apps.set(key, appendText(apps.get(key) || "", body));
      }
      continue;
    }
  }
''' + s[b:]
s=s.replace('const a = appCode.split(".").slice(1);', 'const [appScope, rawCode] = appCode.split("|");\n    const a = rawCode.split(".").slice(1);')
s=s.replace('if (apps.has(oc)) return false;\n      const o = oc.split(".").slice(1);','if (apps.has(oc) || !oc.startsWith(appScope + "|")) return false;\n      const o = outcomes.get(oc).code.split(".").slice(1);')
s=s.replace('const grade = nums.length >= 3 ? nums[0] : null;','const grade = nums.length >= 3 ? nums[0] : o.grade;')
s=s.replace('apps.get(o.code)', 'apps.get(o.key)')
s=s.replace('      no: rows.length + 1,','      id: o.key,\n      no: rows.length + 1,')
s=s.replace('const orphanApps = [...apps.keys()].filter((c) => !outcomes.has(c));','const orphanApps = [...apps.keys()].filter((c) => !outcomes.has(c)).map(c => c.split("|")[1]);')
p.write_text(s,'utf-8')
