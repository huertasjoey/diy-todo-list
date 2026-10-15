import { DAY_NAMES } from "./dates";

// Quote when needed, and defuse cells that a spreadsheet would run as formulas.
const cell = (value) => {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const buildCsv = (tasks, notes) => {
  const rows = [["Task", ...DAY_NAMES]];
  for (const t of tasks) {
    if (t.text.trim()) rows.push([t.text.trim(), ...t.days.map((d) => (d ? "x" : ""))]);
  }
  if (notes.trim()) rows.push([], ["Notes", notes.trim()]);
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
};

export const downloadCsv = (filename, csv) => {
  // BOM so Excel reads the file as UTF-8
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
