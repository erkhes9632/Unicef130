import { BrandLogo } from "@/components/brand/brand-logo";

/** Admin page loading: the club mark, gently pulsing (opacity only, none with reduced motion). */
export default function AdminLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-1 items-center justify-center py-24">
      <span className="motion-safe:animate-pulse">
        <BrandLogo variant="mark" locale="mn" alt="" height={56} />
      </span>
      <span className="sr-only">Ачааллаж байна…</span>
    </div>
  );
}
