from pathlib import Path
p=Path('public/parser.js');s=p.read_text('utf-8').replace('nl.replace(/İ/g, "I")','nl.replace(/İ/g, "I").replace(/[^\\x00-\\x7F]/g, "")').replace('norm(full).replace(/İ/g, "I")','norm(full).replace(/İ/g, "I").replace(/[^\\x00-\\x7F]/g, "")');s=s.replace('  const full = joinItems(items);','''  const full = joinItems(items);
  if (norm(full) === "TEMA SONU DEĞERLENDİRME") return {label:full, section:SEC.NONE, text:"", full};''',1);p.write_text(s,'utf-8')
