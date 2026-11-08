import { Button } from "@/components/ui/button";

// Phase 0 hello-world: proves the Next.js → OpenNext → Cloudflare Workers pipeline.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">130 UNICEF клуб</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Сайн байна уу! Манай вэбсайт удахгүй нээгдэнэ.
      </p>
      <Button>Тун удахгүй</Button>
    </main>
  );
}
