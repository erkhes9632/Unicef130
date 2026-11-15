import "server-only";
import { and, count, eq, gt, inArray, or } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import {
  applicationBlocks,
  applications,
  recruitmentPeriods,
  type RecruitmentQuestion,
} from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/data/localize";
import { countedStatuses, findNextPeriod, findOpenPeriod, intakeFor, type Intake } from "./logic";

export type PeriodRow = typeof recruitmentPeriods.$inferSelect;

export const listPeriods = cache(async (): Promise<PeriodRow[]> => {
  const db = await getDb();
  return db.select().from(recruitmentPeriods);
});

/** Applications that occupy a place in the period. */
export async function countTaken(periodId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(applications)
    .where(
      and(eq(applications.periodId, periodId), inArray(applications.status, [...countedStatuses])),
    );
  return row?.n ?? 0;
}

export type PublicQuestion = {
  id: string;
  type: RecruitmentQuestion["type"];
  label: string;
  options: string[];
  required: boolean;
};

export type RecruitmentState =
  | {
      phase: "open";
      period: PeriodRow;
      name: string;
      intro: string;
      closesAt: string;
      intake: Intake;
      /** null = no capacity limit */
      placesLeft: number | null;
      questions: PublicQuestion[];
    }
  | {
      phase: "closed";
      message: string;
      next: { name: string; opensAt: string } | null;
    };

/** What /join (and the banner) should show right now, with texts resolved for the locale. */
export const getRecruitmentState = cache(async (locale: Locale): Promise<RecruitmentState> => {
  let periods: PeriodRow[] = [];
  try {
    periods = await listPeriods();
  } catch (err) {
    console.error("[recruitment] could not load periods", err);
  }
  const open = findOpenPeriod(periods);
  if (open) {
    const taken = open.capacity === null ? 0 : await countTaken(open.id);
    return {
      phase: "open",
      period: open,
      name: pick(locale, open.name, open.nameEn),
      intro: pick(locale, open.introText, open.introTextEn),
      closesAt: open.closesAt.toISOString(),
      intake: intakeFor(open, taken),
      placesLeft: open.capacity === null ? null : Math.max(0, open.capacity - taken),
      questions: open.questions.map((q) => ({
        id: q.id,
        type: q.type,
        label: pick(locale, q.label, q.labelEn),
        options: q.options.map((o) => pick(locale, o.label, o.labelEn)),
        required: q.required,
      })),
    };
  }
  const next = findNextPeriod(periods);
  // The closing words of the most recently finished period, or of the upcoming one.
  const last = periods
    .filter((p) => p.closesAt.getTime() <= Date.now())
    .sort((a, b) => b.closesAt.getTime() - a.closesAt.getTime())[0];
  const source = next ?? last;
  return {
    phase: "closed",
    message: source ? pick(locale, source.closedMessage, source.closedMessageEn) : "",
    next: next
      ? { name: pick(locale, next.name, next.nameEn), opensAt: next.opensAt.toISOString() }
      : null,
  };
});

/** True when the phone or the address was blocked by an admin and the block has not expired. */
export async function isBlocked(phone: string, ipHash: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: applicationBlocks.id })
    .from(applicationBlocks)
    .where(
      and(
        gt(applicationBlocks.expiresAt, new Date()),
        or(
          and(eq(applicationBlocks.kind, "phone"), eq(applicationBlocks.value, phone)),
          and(eq(applicationBlocks.kind, "ip"), eq(applicationBlocks.value, ipHash)),
        ),
      ),
    )
    .limit(1);
  return !!row;
}
