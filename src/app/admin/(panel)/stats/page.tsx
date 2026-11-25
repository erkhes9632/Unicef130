import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatsDashboard } from "@/components/stats/stats-dashboard";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Статистик" };

/**
 * The club's statistics (visitors from Cloudflare Web Analytics + club numbers from D1). The
 * page is a light shell; the browser loads small aggregated JSON from /api/admin/stats and draws
 * the charts there (Free plan CPU budget).
 */
export default async function StatsPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        title="Статистик"
        description="Сайтад хэдэн хүн зочилж байна, клуб хэрхэн өсөж байгааг энгийн тоогоор."
      />
      <StatsDashboard />
    </>
  );
}
