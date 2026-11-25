import "server-only";
import { clerkPublishableKey } from "@/lib/auth/clerk";

const DAY = 86_400_000;

/**
 * Background checks for the statistics page, as plain sentences for student admins and a teacher:
 * one per real problem, each with what to do. Empty = the site is fine. Technical details stay in
 * the README and the CLI.
 */
export async function siteStatus(db: D1Database, now: number) {
  const problems: string[] = [];
  if (!clerkPublishableKey() || !process.env.CLERK_SECRET_KEY)
    problems.push("Нэвтрэх хэсэг ажиллахгүй байна — сайтыг хариуцсан хөгжүүлэгчид хэлээрэй.");
  try {
    const [admins, oldApplications] = await db.batch<{ n: number }>([
      db.prepare(`SELECT count(*) n FROM users WHERE role = 'admin' AND banned = 0`),
      db
        .prepare(`SELECT count(*) n FROM applications WHERE status = 'new' AND created_at < ?`)
        .bind(now - 14 * DAY),
    ]);
    const n = (r: typeof admins) => Number(r?.results[0]?.n ?? 0);
    if (n(admins) < 2) problems.push("Ганц админтай байна — хариуцсан багшийг админ болгоорой.");
    if (n(oldApplications) > 0)
      problems.push(
        `2 долоо хоногоос дээш хүлээгдэж буй ${n(oldApplications)} өргөдөл байна — «Өргөдлүүд» хэсэгт шийдвэрлээрэй.`,
      );
  } catch {
    problems.push(
      "Сайтын мэдээллийн сантай холбогдож чадсангүй — хэсэг хугацааны дараа дахин оролдоно уу.",
    );
  }
  return problems;
}
