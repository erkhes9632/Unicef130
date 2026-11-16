import { CircleAlert, CircleCheck, CircleX, Download } from "lucide-react";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { systemStatus } from "@/lib/admin/system-status";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";

export const metadata: Metadata = { title: "Системийн төлөв" };

/** A file download (route handler), not a page: a plain link. */
const EXPORT_HREF = "/admin/system/export";

const icon = {
  ok: <CircleCheck className="size-5 text-brand-green-strong" aria-label="Хэвийн" />,
  warn: <CircleAlert className="size-5 text-brand-gold-strong" aria-label="Анхааруулга" />,
  fail: <CircleX className="size-5 text-destructive" aria-label="Алдаа" />,
};

export default async function SystemPage() {
  await requireAdmin();
  const s = await systemStatus();
  const c = s.counts;
  return (
    <>
      <AdminPageHeader
        title="Системийн төлөв"
        description={`Сайтын хэсгүүд хэвийн ажиллаж байгаа эсэх. ${s.siteUrl}`}
        actions={
          <Button asChild variant="outline">
            <a href={EXPORT_HREF} download>
              <Download /> Контент экспорт (JSON)
            </a>
          </Button>
        }
      />
      <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {s.checks.map((ch) => (
          <li key={ch.label} className="flex items-start gap-3 p-4">
            {icon[ch.state]}
            <div>
              <p className="font-semibold">{ch.label}</p>
              <p className="text-sm text-muted-foreground">{ch.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Тоо">
        {[
          ["Админ", c.admins],
          ["Гишүүн бүртгэл", c.memberAccounts],
          ["Өргөдөл гаргагч", c.applicants],
          ["Гишүүдийн жагсаалт", c.members],
          ["Өргөдөл", c.applications],
          ["Мэдээ", c.news],
          ["Арга хэмжээ", c.events],
        ].map(([label, n]) => (
          <div key={label} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="font-heading text-2xl font-extrabold">{n}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-2 rounded-2xl bg-muted/50 p-5 text-sm">
        <h2 className="font-bold">Нөөц ба сэргээх</h2>
        <p>
          Өдөр бүрийн автомат цэвэрлэгээ (тэнцээгүй өргөдөл):{" "}
          {s.lastRetention
            ? `сүүлд ${formatDate("mn", s.lastRetention, "long")}-нд устгасан`
            : "одоогоор устгах зүйл гараагүй"}
          .
        </p>
        <p>
          «Контент экспорт» нь мэдээ, арга хэмжээ, цомог, гишүүдийн нийтийн мэдээлэл, үр дүн,
          тохиргоог JSON-оор татна (өргөдөл, хэрэглэгч, зурвас ордоггүй). Бүрэн нөөцийг өөрийн
          терминалаас: <code>bunx wrangler d1 export DB --remote --output backup.sql</code>. Сүүлийн
          30 хоногийн аль ч мөч рүү буцаах (D1 Time Travel):{" "}
          <code>bunx wrangler d1 time-travel info DB</code> → <code>restore</code> (README).
        </p>
      </section>
    </>
  );
}
