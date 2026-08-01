/**
 * Ekspor Laporan → PDF (dirender di server via @react-pdf/renderer, dipanggil
 * dari route handler /laporan/<x>/pdf). BUKAN komponen klien.
 *
 * Catatan font: memakai Helvetica bawaan (tanpa registrasi font eksternal agar
 * ringan & andal di Cloud Run). Helvetica tidak punya subskrip Unicode (₂/₃),
 * jadi semua teks dinamis dilewatkan `s()` yang menormalkan ke ASCII.
 */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatIdr, formatHa, formatPct, formatNumber, EMPTY } from "@/lib/format";

const C = {
  brand: "#047857", brandDark: "#065f46", text: "#1e293b", muted: "#64748b",
  faint: "#94a3b8", border: "#e2e8f0", zebra: "#f8fafc", group: "#f1f5f9",
  warn: "#b91c1c", warnBg: "#fef2f2",
};

const styles = StyleSheet.create({
  page: { paddingTop: 88, paddingBottom: 46, paddingHorizontal: 34, fontSize: 9, color: C.text, fontFamily: "Helvetica" },
  header: { position: "absolute", top: 0, left: 0, right: 0, height: 68, backgroundColor: C.brand, paddingHorizontal: 34, paddingTop: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  accent: { position: "absolute", top: 68, left: 0, right: 0, height: 3, backgroundColor: "#34d399" },
  brand: { color: "#ffffff", fontSize: 17, fontFamily: "Helvetica-Bold" },
  hSub: { color: "#d1fae5", fontSize: 9.5, marginTop: 3, fontFamily: "Helvetica-Bold" },
  hRight: { color: "#ecfdf5", fontSize: 8, textAlign: "right", marginBottom: 1.5 },
  subtitle: { fontSize: 8.5, color: C.muted, marginBottom: 2, lineHeight: 1.4 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.brandDark, marginTop: 15, marginBottom: 5, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: C.border },
  kpiRow: { flexDirection: "row", marginTop: 2 },
  kpi: { flexGrow: 1, flexBasis: 0, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8, marginRight: 7 },
  kpiLabel: { fontSize: 7.5, color: C.muted },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  kpiNote: { fontSize: 6.5, color: C.faint, marginTop: 3, lineHeight: 1.3 },
  note: { borderWidth: 1, borderRadius: 4, padding: 7, marginTop: 7, fontSize: 8, lineHeight: 1.45 },
  tWrap: { borderWidth: 1, borderColor: C.border, borderRadius: 4, marginTop: 4, overflow: "hidden" },
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border },
  th: { backgroundColor: C.group },
  cell: { paddingVertical: 4, paddingHorizontal: 5 },
  thText: { fontFamily: "Helvetica-Bold", color: C.muted, fontSize: 7.5 },
  empty: { fontSize: 8.5, color: C.faint, paddingVertical: 8 },
  footnote: { fontSize: 7, color: C.faint, marginTop: 5, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 20, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.faint, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 5 },
});

/** Normalkan teks agar aman di Helvetica (subskrip → digit biasa, panah → ASCII). */
function s(v: string | null | undefined): string {
  const str = v ?? "";
  return str
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/[²]/g, "2").replace(/[³]/g, "3").replace(/[¹]/g, "1")
    .replace(/[→➔]/g, "->").replace(/✓/g, "");
}

function fmtDateTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(d);
  } catch {
    return d.toISOString();
  }
}
const tco2e = (v: number | null | undefined): string =>
  v === null || v === undefined ? EMPTY : `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v)} tCO2e`;

// ── Primitives ──────────────────────────────────────────────────────────────
type Col = { label: string; flex: number; align?: "left" | "right" };
type Row = { cells: string[]; kind?: "total" | "warn" | "group" | "sub" };

function Table({ columns, rows }: { columns: Col[]; rows: Row[] }) {
  return (
    <View style={styles.tWrap}>
      <View style={[styles.tRow, styles.th]}>
        {columns.map((c, i) => (
          <Text key={i} style={[styles.cell, styles.thText, { flex: c.flex, textAlign: c.align ?? "left" }]}>{s(c.label)}</Text>
        ))}
      </View>
      {rows.map((r, ri) => {
        const bg = r.kind === "warn" ? C.warnBg : r.kind === "total" || r.kind === "group" ? C.group : ri % 2 ? C.zebra : "#ffffff";
        return (
          <View key={ri} style={[styles.tRow, { backgroundColor: bg }]} wrap={false}>
            {r.cells.map((cell, ci) => (
              <Text key={ci} style={[
                styles.cell,
                { flex: columns[ci].flex, textAlign: columns[ci].align ?? "left" },
                r.kind === "total" || r.kind === "group" ? { fontFamily: "Helvetica-Bold" } : {},
                r.kind === "warn" ? { color: C.warn } : {},
                r.kind === "sub" ? { color: C.muted, paddingLeft: ci === 0 ? 14 : 5 } : {},
              ]}>{s(cell)}</Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function KpiRow({ items }: { items: { label: string; value: string; note?: string }[] }) {
  return (
    <View style={styles.kpiRow}>
      {items.map((k, i) => (
        <View key={i} style={[styles.kpi, i === items.length - 1 ? { marginRight: 0 } : {}]}>
          <Text style={styles.kpiLabel}>{s(k.label)}</Text>
          <Text style={[styles.kpiValue, { color: k.value === EMPTY ? C.faint : C.text }]}>{s(k.value)}</Text>
          {k.note ? <Text style={styles.kpiNote}>{s(k.note)}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function Note({ tone, children }: { tone: "info" | "warn" | "danger"; children: string }) {
  const m = {
    info: { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1e3a8a" },
    warn: { bg: "#fffbeb", bd: "#fde68a", fg: "#92400e" },
    danger: { bg: C.warnBg, bd: "#fecaca", fg: "#991b1b" },
  }[tone];
  return (
    <View style={[styles.note, { backgroundColor: m.bg, borderColor: m.bd }]}>
      <Text style={{ color: m.fg }}>{s(children)}</Text>
    </View>
  );
}

function Shell({ title, subtitle, company, generatedAt, defCode, children }: {
  title: string; subtitle?: string | null; company: string; generatedAt: Date; defCode?: string; children: React.ReactNode;
}) {
  return (
    <Document title={`${title} — AgroVision`} author="AgroVision">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>AgroVision</Text>
            <Text style={styles.hSub}>{s(title)}</Text>
          </View>
          <View>
            <Text style={styles.hRight}>{s(company)}</Text>
            <Text style={styles.hRight}>Dicetak: {fmtDateTime(generatedAt)}</Text>
            {defCode ? <Text style={styles.hRight}>Definisi: {s(defCode)}</Text> : null}
          </View>
        </View>
        <View style={styles.accent} fixed />
        {subtitle ? <Text style={styles.subtitle}>{s(subtitle)}</Text> : null}
        {children}
        <View style={styles.footer} fixed>
          <Text>AgroVision — Laporan {s(title)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

const EmptyRow = ({ text }: { text: string }) => <Text style={styles.empty}>{s(text)}</Text>;

// ── Laporan Keuangan ────────────────────────────────────────────────────────
type Def = { name: string; description: string | null; code: string; baseView?: string };
export type FinanceProps = {
  company: string; generatedAt: Date; def: Def;
  pnl: { totalSpendIdr: number | null; totalBudgetIdr: number | null; transactionCount: number };
  perBlock: { blockCode: string; areaHa: number | null; transactionCount: number; totalCostIdr: number | null; costPerHaIdr: number | null }[];
  budget: { periodName: string; costCategoryName: string; scopeType: string; budgetIdr: number; actualIdr: number; remainingIdr: number; utilisationPct: number | null; isOverBudget: boolean }[];
  categories: { name: string; total: number; count: number; share: number | null; subs: { name: string; total: number; count: number; share: number | null }[] }[];
};

export function FinanceReport(p: FinanceProps) {
  const overBudget = p.budget.filter((b) => b.isOverBudget);
  const grandTotal = p.categories.reduce((s2, c) => s2 + c.total, 0);
  const grandCount = p.categories.reduce((s2, c) => s2 + c.count, 0);
  const catRows: Row[] = [];
  for (const c of p.categories) {
    catRows.push({ cells: [c.name, String(c.count), formatIdr(c.total), formatPct(c.share)], kind: "group" });
    for (const sub of [...c.subs].sort((a, b) => b.total - a.total)) {
      catRows.push({ cells: [sub.name, String(sub.count), formatIdr(sub.total), formatPct(sub.share)], kind: "sub" });
    }
  }
  catRows.push({ cells: ["Total", String(grandCount), formatIdr(grandTotal), ""], kind: "total" });

  return (
    <Shell title="Laporan Keuangan" subtitle={p.def.description} company={p.company} generatedAt={p.generatedAt} defCode={p.def.code}>
      <KpiRow items={[
        { label: "Total pengeluaran disetujui", value: formatIdr(p.pnl.totalSpendIdr), note: p.pnl.totalSpendIdr === null ? "Belum ada transaksi disetujui" : `${p.pnl.transactionCount} transaksi` },
        { label: "Total anggaran", value: formatIdr(p.pnl.totalBudgetIdr), note: p.pnl.totalBudgetIdr === null ? "Anggaran belum disusun" : undefined },
        { label: "Pendapatan", value: EMPTY, note: "Belum ada panen" },
        { label: "Break-even", value: EMPTY, note: "Butuh sisi pendapatan" },
      ]} />
      <Note tone="info">Pendapatan dan break-even sengaja kosong: keduanya butuh data panen, dan proyek belum menanam. Struktur data sudah siap; angka muncul otomatis saat penjualan pertama.</Note>
      {overBudget.length > 0 && (
        <Note tone="danger">{`${overBudget.length} anggaran terlampaui: ${overBudget.map((b) => `${b.costCategoryName} (${b.periodName})`).join(", ")}`}</Note>
      )}

      <Text style={styles.h2}>Realisasi vs Anggaran</Text>
      {p.budget.length === 0 ? <EmptyRow text="Anggaran belum disusun." /> : (
        <Table
          columns={[
            { label: "Periode", flex: 2 }, { label: "Kategori", flex: 2.6 }, { label: "Lingkup", flex: 1.4 },
            { label: "Anggaran", flex: 2, align: "right" }, { label: "Realisasi", flex: 2, align: "right" },
            { label: "Sisa", flex: 2, align: "right" }, { label: "Serapan", flex: 1.4, align: "right" },
          ]}
          rows={p.budget.map((b) => ({
            cells: [b.periodName, b.costCategoryName, b.scopeType, formatIdr(b.budgetIdr), formatIdr(b.actualIdr), formatIdr(b.remainingIdr), formatPct(b.utilisationPct)],
            kind: b.isOverBudget ? "warn" : undefined,
          }))}
        />
      )}

      <Text style={styles.h2}>Rincian per Komponen Biaya</Text>
      {p.categories.length === 0 ? <EmptyRow text="Belum ada pengeluaran disetujui." /> : (
        <Table
          columns={[{ label: "Komponen", flex: 4 }, { label: "Transaksi", flex: 1.5, align: "right" }, { label: "Nilai", flex: 2, align: "right" }, { label: "Porsi", flex: 1.5, align: "right" }]}
          rows={catRows}
        />
      )}

      <Text style={styles.h2}>Biaya per Blok</Text>
      {p.perBlock.length === 0 ? <EmptyRow text="Belum ada pengeluaran disetujui." /> : (
        <Table
          columns={[{ label: "Blok", flex: 2 }, { label: "Luas", flex: 1.5, align: "right" }, { label: "Transaksi", flex: 1.5, align: "right" }, { label: "Total biaya", flex: 2.2, align: "right" }, { label: "Biaya / ha", flex: 2.2, align: "right" }]}
          rows={p.perBlock.map((b) => ({ cells: [b.blockCode, formatHa(b.areaHa), String(b.transactionCount), formatIdr(b.totalCostIdr), b.costPerHaIdr === null ? EMPTY : formatIdr(b.costPerHaIdr)] }))}
        />
      )}
      <Text style={styles.footnote}>Hanya transaksi DISETUJUI yang dihitung; draft & ditolak dikecualikan. Luas berasal dari PostGIS, bukan input manual.</Text>
    </Shell>
  );
}

// ── Laporan Operasional ─────────────────────────────────────────────────────
export type OperationalProps = {
  company: string; generatedAt: Date; def: Def | null;
  stock: { batchCode: string; cropName: string; qtyAlive: number | null; qtyInitial: number; survivalPct: number | null }[];
  totals: { totalInitial: number; totalAlive: number; overall: number | null };
};

export function OperationalReport(p: OperationalProps) {
  const has = p.stock.length > 0;
  return (
    <Shell title="Laporan Operasional" subtitle={p.def?.description} company={p.company} generatedAt={p.generatedAt} defCode={p.def?.code}>
      <KpiRow items={[
        { label: "Total bibit awal", value: has ? formatNumber(p.totals.totalInitial) : EMPTY },
        { label: "Bibit hidup", value: has ? formatNumber(p.totals.totalAlive) : EMPTY },
        { label: "Survival keseluruhan", value: p.totals.overall === null ? EMPTY : formatPct(p.totals.overall) },
      ]} />

      <Text style={styles.h2}>Stok Bibit per Batch</Text>
      {!has ? <EmptyRow text="Belum ada data bibit." /> : (
        <Table
          columns={[{ label: "Batch", flex: 2 }, { label: "Komoditas", flex: 2.5 }, { label: "Hidup / Awal", flex: 2.5, align: "right" }, { label: "Survival", flex: 1.6, align: "right" }]}
          rows={p.stock.map((x) => ({ cells: [x.batchCode, x.cropName, `${formatNumber(x.qtyAlive)} / ${formatNumber(x.qtyInitial)}`, x.survivalPct === null ? EMPTY : formatPct(x.survivalPct)] }))}
        />
      )}
      <Text style={styles.footnote}>Progress penanaman & realisasi pemupukan bergabung ke laporan ini setelah penanaman dimulai. Struktur datanya sudah siap.</Text>
    </Shell>
  );
}

// ── Laporan Keberlanjutan ───────────────────────────────────────────────────
export type SustainabilityProps = {
  company: string; generatedAt: Date; def: Def | null;
  run: { netBalanceTco2e: number | null; grossEmissionTco2e: number | null } | null;
  blocks: { blockCode: string; areaHa: number | null; netTco2e: number | null }[];
  activeCerts: number; certCount: number;
};

export function SustainabilityReport(p: SustainabilityProps) {
  return (
    <Shell title="Laporan Keberlanjutan" subtitle={p.def?.description} company={p.company} generatedAt={p.generatedAt} defCode={p.def?.code}>
      <Note tone="warn">Angka karbon memakai koefisien IPCC perkiraan yang BELUM DIVALIDASI. Cukup untuk gambaran fase awal; belum untuk klaim keberlanjutan resmi.</Note>
      <View style={{ marginTop: 7 }}>
        <KpiRow items={[
          { label: "Neraca karbon bersih", value: tco2e(p.run?.netBalanceTco2e ?? null), note: p.run && (p.run.netBalanceTco2e ?? 0) < 0 ? "Net emitter (fase land clearing)" : undefined },
          { label: "Emisi bruto", value: tco2e(p.run?.grossEmissionTco2e ?? null) },
          { label: "Sertifikat aktif", value: p.certCount === 0 ? EMPTY : String(p.activeCerts) },
        ]} />
      </View>

      <Text style={styles.h2}>Net Carbon per Blok</Text>
      {p.blocks.length === 0 ? <EmptyRow text="Belum ada perhitungan karbon." /> : (
        <Table
          columns={[{ label: "Blok", flex: 2 }, { label: "Luas", flex: 2, align: "right" }, { label: "Neraca", flex: 2.5, align: "right" }]}
          rows={p.blocks.map((b) => ({ cells: [b.blockCode, formatHa(b.areaHa), tco2e(b.netTco2e)] }))}
        />
      )}
      <Text style={styles.footnote}>tCO2e = ton setara CO2. Neraca negatif = emitter neto (fase pembukaan lahan); positif = penyerap neto.</Text>
    </Shell>
  );
}
