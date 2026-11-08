import { notFound } from "next/navigation";

// Catch-all so unknown public URLs render [locale]/not-found.tsx (with header/footer).
export default function CatchAllPage() {
  notFound();
}
