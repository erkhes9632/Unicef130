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
    /** Accounts created on the site (running total), never imported rows. */
    growth: Point[];
    /** Accounts without a name yet (shown as a to-do on the dashboard). */
    withoutName: number;
  };
  /**
   * Two different member counts, labelled separately:
   * `report` = the official figures of the latest annual report (public pages show these),
   * `site` = members who have an account on the site.
   */
  members: {
    report: { schoolYear: string; joined: number; active: number; hours: number } | null;
    site: number;
  };
  applications: {
    byStatus: Record<(typeof APPLICATION_STEPS)[number], number>;
    inPeriod: number;
    prevPeriod: number;
  };
  hours: {
    /** Hours logged on the site in the selected period (the report's hours are separate). */
    inPeriod: number;
    prevPeriod: number;
    /** Hours logged on the site per month, last 12 months. */
    byMonth: Point[];
    /** Per school year: the report's figure and the hours logged on the site. */
    byYear: { schoolYear: string; report: number; logged: number }[];
  };
  content: { news: number; events: number; albums: number; photos: number };
  signups: { inPeriod: number; prevPeriod: number };
};

export type StatsResponse = {
  period: Period;
  /** Null when Web Analytics is not connected (or the API failed). */
  traffic: TrafficStats | null;
  club: ClubStats;
};
