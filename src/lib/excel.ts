/**
 * Ekspor Excel TANPA dependency: menghasilkan dokumen HTML ber-MIME Excel
 * (application/vnd.ms-excel) yang dibuka langsung oleh Microsoft Excel /
 * LibreOffice / Google Sheets. Angka dikirim sebagai NUMERIK (bisa dijumlah &
 * diurutkan), teks sebagai teks. Satu sumber data dengan PDF (lihat reportData).
 */

export type Cell = string | number | null;
export type Section = {
  title: string;
  columns: { label: string; align?: "left" | "right"; blue?: boolean }[];
  rows: Cell[][];
  note?: string;
};

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cellHtml(v: Cell, align?: "left" | "right"): string {
  if (v === null || v === undefined || v === "") return `<td></td>`;
  if (typeof v === "number") {
    return `<td style="text-align:right;mso-number-format:'#,##0'">${v}</td>`;
  }
  return `<td style="text-align:${align ?? "left"};mso-number-format:'\\@'">${esc(String(v))}</td>`;
}

export function buildExcelHtml(meta: { title: string; company: string; generatedAt: Date }, sections: Section[]): string {
  const dt = (() => {
    try { return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(meta.generatedAt); }
    catch { return meta.generatedAt.toISOString(); }
  })();

  const body = sections.map((s) => {
    const head = s.columns.map((c) => `<th style="background:${c.blue ? "#2563eb" : "#047857"};color:#fff;text-align:${c.align ?? "left"}">${esc(c.label)}</th>`).join("");
    const rows = s.rows.map((r) => `<tr>${r.map((cell, i) => cellHtml(cell, s.columns[i]?.align)).join("")}</tr>`).join("");
    const note = s.note ? `<tr><td colspan="${s.columns.length}" style="color:#64748b;font-size:9pt">${esc(s.note)}</td></tr>` : "";
    return `<h2 style="color:#065f46">${esc(s.title)}</h2>
      <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-size:10pt">
        <thead><tr>${head}</tr></thead><tbody>${rows}${note}</tbody></table><br/>`;
  }).join("\n");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"/>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${esc(meta.title)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>body{font-family:Arial,sans-serif} h1{color:#047857;margin:0} table{border-collapse:collapse}</style>
</head>
<body>
<h1>AgroVision — ${esc(meta.title)}</h1>
<p>${esc(meta.company)} &middot; Dicetak: ${esc(dt)}</p>
${body}
</body></html>`;
}

/** Response siap-unduh untuk Excel. */
export function excelResponse(html: string, filename: string): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.xls"`,
      "Cache-Control": "no-store",
    },
  });
}
