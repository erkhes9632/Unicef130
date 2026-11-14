import "server-only";
import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { impactStats, type ImpactDirection } from "@/db/schema";
import { formatNumber } from "@/lib/dates/format";

export type ImpactRow = {
  direction: ImpactDirection;
  activities: number;
  inPerson: number;
  /** As in the report, e.g. "300+" */
  inPersonLabel: string;
  online: number;
  total: number;
  donationAmount: number;
};

export type ImpactYear = {
  schoolYear: string;
  /** Club directions in fixed order (missing ones omitted). */
  directions: ImpactRow[];
  total: ImpactRow | null;
};

/** "2025-2026" → "2025–2026" */
export const displayYear = (y: string) => y.replace("-", "–");

/** School years that have impact numbers, newest first. */
export const listImpactYears = cache(async (): Promise<string[]> => {
  try {
    const db = await getDb();
    const rows = await db
      .selectDistinct({ y: impactStats.schoolYear })
      .from(impactStats)
      .orderBy(desc(impactStats.schoolYear));
    return rows.map((r) => r.y);
  } catch (err) {
    console.error("[impact] D1 read failed", err);
    return [];
  }
});

const order: ImpactDirection[] = ["activity", "education", "charity"];

export const getImpactYear = cache(async (schoolYear: string): Promise<ImpactYear | null> => {
  const db = await getDb();
  const rows = await db.select().from(impactStats).where(eq(impactStats.schoolYear, schoolYear));
  if (rows.length === 0) return null;
  const toRow = (r: (typeof rows)[number]): ImpactRow => ({
    direction: r.direction,
    activities: r.activities,
    inPerson: r.inPerson,
    inPersonLabel: r.inPersonLabel || formatNumber(r.inPerson),
    online: r.online,
    total: r.total,
    donationAmount: r.donationAmount,
  });
  const by = new Map(rows.map((r) => [r.direction, toRow(r)]));
  return {
    schoolYear,
    directions: order.map((d) => by.get(d)).filter((r): r is ImpactRow => !!r),
    total: by.get("total") ?? null,
  };
});

/** Latest year with numbers (for the home teaser and /impact default). */
export async function getLatestImpact(): Promise<ImpactYear | null> {
  const [latest] = await listImpactYears();
  return latest ? getImpactYear(latest) : null;
}
