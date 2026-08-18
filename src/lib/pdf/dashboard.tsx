/**
 * PDF generik untuk laporan Dashboard (Master Laporan): header block + tabel
 * indikator (Status berwarna + Tindak lanjut) + Insight & Rekomendasi. Dipakai
 * ketiga dashboard. A4 landscape agar 8 kolom muat. Server-only (@react-pdf).
 */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { STATUS_LABEL, STATUS_COLOR, type DashboardReport, type IndStatus } from "@/lib/report/types";

const C = { brand: "#1a6c2c", brandDark: "#17512a", text: "#1e293b", muted: "#5c5a55", faint: "#a8a49a", border: "#e5e2da", zebra: "#f7f6f2", group: "#eef2f7" };

const st = StyleSheet.create({
  page: { paddingTop: 78, paddingBottom: 40, paddingHorizontal: 28, fontSize: 8, color: C.text, fontFamily: "Helvetica" },
  header: { position: "absolute", top: 0, left: 0, right: 0, height: 58, backgroundColor: C.brand, paddingHorizontal: 28, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  accent: { position: "absolute", top: 58, left: 0, right: 0, height: 3, backgroundColor: "#4f9d5d" },
  brand: { color: "#fff", fontSize: 15, fontFamily: "Helvetica-Bold" },
  hSub: { color: "#d7e8d9", fontSize: 8, marginTop: 2 },
  hRight: { color: "#eef6ef", fontSize: 7.5, textAlign: "right", marginBottom: 1.5 },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  metaCell: { width: "50%", flexDirection: "row", marginBottom: 2 },
  metaLabel: { width: 96, color: C.faint },
  metaVal: { flex: 1, fontFamily: "Helvetica-Bold", color: C.text },
  source: { fontSize: 7, color: C.faint, marginBottom: 6 },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.brandDark, marginTop: 10, marginBottom: 4 },
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border },
  th: { backgroundColor: C.group },
  cell: { paddingVertical: 3, paddingHorizontal: 4 },
  thText: { fontFamily: "Helvetica-Bold", color: C.muted, fontSize: 7 },
  note: { fontSize: 7, color: C.faint, marginTop: 5, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 18, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.faint, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 4 },
});

function s(v: string | null | undefined): string {
  return (v ?? "").replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080)).replace(/[²]/g, "2").replace(/[³]/g, "3").replace(/[→➔]/g, "->").replace(/✓/g, "").replace(/·/g, "-");
}
function fmt(d: Date): string {
  try { return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(d); } catch { return d.toISOString().slice(0, 10); }
}

const IND_COLS = [
  { label: "No", flex: 0.5, align: "left" as const },
  { label: "Tahap / Kelompok", flex: 2.2 },
  { label: "Indikator", flex: 3 },
  { label: "Nilai", flex: 1.6, align: "right" as const },
  { label: "Satuan", flex: 1.2 },
  { label: "Status", flex: 1.8 },
  { label: "Tindak lanjut", flex: 3.6 },
  { label: "Detail", flex: 1.8 },
];

function StatusPill({ status }: { status: IndStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <Text style={{ color: c.fg, backgroundColor: c.bg, borderWidth: 0.5, borderColor: c.border, borderRadius: 2, paddingVertical: 1, paddingHorizontal: 3, fontSize: 6.5 }}>
      {s(STATUS_LABEL[status])}
    </Text>
  );
}

export function DashboardReportPdf({ report }: { report: DashboardReport }) {
  const { meta, indicators, insights } = report;
  const metaRows: [string, string][] = [
    ["Entitas / Estate", meta.entity], ["Status data", meta.dataStatus],
    ["Periode laporan", meta.period], ["Tanggal cetak", fmt(meta.printedAt)],
    ["Lingkup blok", meta.blockScope], ["Disusun oleh", "________________"],
    ["Komoditas", meta.commodity], ["Diketahui", "________________"],
  ];
  return (
    <Document title={`${meta.title} — AgroVision`} author="AgroVision">
      <Page size="A4" orientation="landscape" style={st.page}>
        <View style={st.header} fixed>
          <View>
            <Text style={st.brand}>AgroVision</Text>
            <Text style={st.hSub}>{s(meta.title)}</Text>
          </View>
          <View>
            <Text style={st.hRight}>{s(meta.entity)}</Text>
            <Text style={st.hRight}>Dicetak: {fmt(meta.printedAt)}</Text>
          </View>
        </View>
        <View style={st.accent} fixed />

        <Text style={{ fontSize: 8, color: C.muted, marginBottom: 5 }}>{s(meta.subtitle)}</Text>
        <View style={st.metaWrap}>
          {metaRows.map(([l, v], i) => (
            <View key={i} style={st.metaCell}>
              <Text style={st.metaLabel}>{s(l)}</Text>
              <Text style={st.metaVal}>{s(v)}</Text>
            </View>
          ))}
        </View>
        <Text style={st.source}>Sumber: {s(meta.source)}</Text>

        {/* Indikator */}
        <View style={{ borderWidth: 0.5, borderColor: C.border, borderRadius: 3 }}>
          <View style={[st.tRow, st.th]}>
            {IND_COLS.map((c, i) => <Text key={i} style={[st.cell, st.thText, { flex: c.flex, textAlign: c.align ?? "left" }]}>{s(c.label)}</Text>)}
          </View>
          {indicators.map((ind, i) => (
            <View key={i} style={[st.tRow, { backgroundColor: ind.group ? C.zebra : "#fff" }]} wrap={false}>
              <Text style={[st.cell, { flex: IND_COLS[0].flex, color: C.faint }]}>{i + 1}</Text>
              <Text style={[st.cell, { flex: IND_COLS[1].flex, fontFamily: "Helvetica-Bold" }]}>{s(ind.group ?? "")}</Text>
              <Text style={[st.cell, { flex: IND_COLS[2].flex }]}>{s(ind.indicator)}</Text>
              <Text style={[st.cell, { flex: IND_COLS[3].flex, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{s(ind.value)}</Text>
              <Text style={[st.cell, { flex: IND_COLS[4].flex, color: C.muted }]}>{s(ind.unit)}</Text>
              <View style={[st.cell, { flex: IND_COLS[5].flex }]}><StatusPill status={ind.status} /></View>
              <Text style={[st.cell, { flex: IND_COLS[6].flex, color: C.muted }]}>{s(ind.followUp)}</Text>
              <Text style={[st.cell, { flex: IND_COLS[7].flex, color: C.faint }]}>{s(ind.detail)}</Text>
            </View>
          ))}
        </View>
        {meta.note && <Text style={st.note}>Catatan: {s(meta.note)}</Text>}

        {/* Insight */}
        {insights.length > 0 && (
          <>
            <Text style={st.h2}>Insight & Rekomendasi Tindak Lanjut</Text>
            <View style={{ borderWidth: 0.5, borderColor: C.border, borderRadius: 3 }}>
              <View style={[st.tRow, st.th]}>
                <Text style={[st.cell, st.thText, { flex: 0.5 }]}>No</Text>
                <Text style={[st.cell, st.thText, { flex: 4 }]}>Temuan (kesimpulan)</Text>
                <Text style={[st.cell, st.thText, { flex: 4 }]}>Rekomendasi tindak lanjut</Text>
                <Text style={[st.cell, st.thText, { flex: 2 }]}>Prioritas - PIC</Text>
              </View>
              {insights.map((ins, i) => (
                <View key={i} style={[st.tRow, { backgroundColor: i % 2 ? C.zebra : "#fff" }]} wrap={false}>
                  <Text style={[st.cell, { flex: 0.5, color: C.faint }]}>{i + 1}</Text>
                  <Text style={[st.cell, { flex: 4 }]}>{s(ins.finding)}</Text>
                  <Text style={[st.cell, { flex: 4, color: C.muted }]}>{s(ins.recommendation)}</Text>
                  <Text style={[st.cell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{s(`${ins.priority} · ${ins.pic}`)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={st.footer} fixed>
          <Text>AgroVision — {s(meta.title)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
