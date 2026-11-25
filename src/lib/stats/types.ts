import type { Period } from "./period";

/** Shapes of /api/admin/stats (aggregates only — never names or personal data). */
export type Point = { key: string; value: number };
export type Count = { label: string; value: number };

export type TrafficStats = {
  series: { key: string; visits: number; views: number }[];
  totals: { visits: number; views: number };
  prevTotals: { visits: number; views: number };
  pages: { path: string; views: number }[];
  referrers: Count[];
  countries: Count[];
  devices: Count[];
  browsers: Count[];
  os: Count[];
  /** 75th percentile: LCP ms, INP ms, CLS (unitless). Null when not available. */
  vitals: { lcp: number; inp: number; cls: number } | null;
};

export const APPLICATION_STEPS = [
  "new",
  "reviewing",
  "interview",
  "accepted",
  "rejected",
  "waitlist",
] as const;

export type ClubStats = {
  users: {
    total: number;
    inPeriod: number;
    prevPeriod: number;
    byRole: { applicant: number; member: number; admin: number };
    growth: Point[];
  };
  members: { active: number; prevActive: number; growth: Point[] };
  applications: {
    byStatus: Record<(typeof APPLICATION_STEPS)[number], number>;
    inPeriod: number;
    prevPeriod: number;
  };
  hours: { inPeriod: number; prevPeriod: number; byMonth: Point[] };
  content: { news: number; events: number; albums: number; photos: number };
  messages: { inPeriod: number; byMonth: Point[] };
  signups: { inPeriod: number; prevPeriod: number };
};

export type StatsResponse = {
  period: Period;
  /** Plain sentences, one per real problem; empty = everything is fine. */
  status: string[];
  /** Null when Web Analytics is not connected (or the API failed). */
  traffic: TrafficStats | null;
  club: ClubStats;
};
