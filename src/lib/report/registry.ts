import type { RlsContext } from "@/lib/db";
import type { DashboardReport, ModuleReport } from "./types";
import { financialDashboardData } from "./financial";
import { operationalDashboardData, sustainabilityDashboardData } from "./dashboards";
import { expenditureModuleReport } from "./pengeluaran";
import * as M from "./moduleData";

/**
 * Registry seluruh laporan (Master Laporan): 3 dashboard + 15 modul. Satu route
 * dinamis /laporan/[slug] (page/pdf/excel) melayani semuanya lewat registry ini.
 */
export type ReportEntry =
  | { slug: string; kind: "dashboard"; group: "Dashboard"; title: string; load: (ctx: RlsContext) => Promise<DashboardReport> }
  | { slug: string; kind: "module"; group: "Modul"; title: string; load: (ctx: RlsContext) => Promise<ModuleReport> };

export const REPORTS: ReportEntry[] = [
  { slug: "operasional", kind: "dashboard", group: "Dashboard", title: "Laporan Operasional", load: operationalDashboardData },
  { slug: "keuangan", kind: "dashboard", group: "Dashboard", title: "Laporan Finansial", load: financialDashboardData },
  { slug: "keberlanjutan", kind: "dashboard", group: "Dashboard", title: "Laporan Sustainability", load: sustainabilityDashboardData },
  { slug: "kesesuaian-lahan", kind: "module", group: "Modul", title: "01 · Kesesuaian Lahan", load: M.suitabilityReport },
  { slug: "persiapan-lahan", kind: "module", group: "Modul", title: "02 · Persiapan Lahan", load: M.landPrepReport },
  { slug: "bibit", kind: "module", group: "Modul", title: "03 · Bibit & Nursery", load: M.nurseryReport },
  { slug: "penyiangan", kind: "module", group: "Modul", title: "04 · Penyiangan", load: M.weedingReport },
  { slug: "pemupukan", kind: "module", group: "Modul", title: "05 · Pemupukan", load: M.fertilizingReport },
  { slug: "pruning", kind: "module", group: "Modul", title: "06 · Pruning", load: M.pruningReport },
  { slug: "penyemprotan", kind: "module", group: "Modul", title: "07 · Penyemprotan", load: M.sprayingReport },
  { slug: "panen", kind: "module", group: "Modul", title: "08 · Panen", load: M.harvestReport },
  { slug: "chemical", kind: "module", group: "Modul", title: "09 · Agri-Input Chemical", load: M.chemicalReport },
  { slug: "equipment", kind: "module", group: "Modul", title: "10 · Agri-Input Equipment", load: M.equipmentReport },
  { slug: "karbon", kind: "module", group: "Modul", title: "11 · Carbon Accounting", load: M.carbonReport },
  { slug: "blok", kind: "module", group: "Modul", title: "12 · Blok & Peta", load: M.blocksReport },
  { slug: "pengeluaran", kind: "module", group: "Modul", title: "13 · Pengeluaran", load: expenditureModuleReport },
  { slug: "anggaran", kind: "module", group: "Modul", title: "14 · Anggaran", load: M.budgetReport },
  { slug: "approval", kind: "module", group: "Modul", title: "15 · Approval Inbox", load: M.approvalReport },
];

export const reportBySlug = (slug: string): ReportEntry | undefined => REPORTS.find((r) => r.slug === slug);
