/** Facts behind the dashboard's "Хийх зүйлс" box (pure rules: unit-tested). */
export type DashboardFacts = {
  newApplications: number;
  /** Close time of the recruitment period open now; null when none is open. */
  recruitmentClosesAt: number | null;
  faqTotal: number;
  faqPublished: number;
  usersWithoutName: number;
};

export type Todo = { text: string; action?: string; href?: string };

const DAY = 86_400_000;
/** Warn about the closing date when this many days (or fewer) are left. */
const CLOSING_SOON_DAYS = 7;

/** Only things that need someone to act, in plain words; empty = nothing to do. */
export function todoItems(f: DashboardFacts, now: number): Todo[] {
  const out: Todo[] = [];
  if (f.newApplications > 0)
    out.push({
      text: `${f.newApplications} шинэ өргөдөл хүлээж байна`,
      action: "Харах",
      href: "/admin/applications?status=new",
    });
  if (f.recruitmentClosesAt !== null) {
    const days = Math.ceil((f.recruitmentClosesAt - now) / DAY);
    if (days <= CLOSING_SOON_DAYS)
      out.push({
        text: days <= 1 ? "Элсэлт өнөөдөр хаагдана" : `Элсэлт ${days} хоногийн дараа хаагдана`,
        action: "Элсэлт",
        href: "/admin/recruitment",
      });
  }
  if (f.faqPublished === 0)
    out.push(
      f.faqTotal > 0
        ? {
            text: `Түгээмэл асуулт нийтлэгдээгүй байна (${f.faqTotal} ноорог бэлэн)`,
            action: "Шалгаад нийтлэх",
            href: "/admin/faq",
          }
        : { text: "Түгээмэл асуулт нийтлэгдээгүй байна", action: "Нэмэх", href: "/admin/faq" },
    );
  if (f.usersWithoutName > 0)
    out.push({
      text: `${f.usersWithoutName} хэрэглэгч нэрээ оруулаагүй`,
      action: "Харах",
      href: "/admin/users?role=noname",
    });
  return out;
}
