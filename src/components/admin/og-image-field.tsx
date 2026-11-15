"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/media/client";

const W = 1200;
const H = 630;
const COLORS = ["#1cabe2", "#8e4fc6", "#4cb847", "#2f7ed8", "#f5b301"];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Лого ачаалж чадсангүй"));
    img.src = src;
  });
}

/** Draws the share card (same design as scripts/brand-assets.ts) in the browser. */
async function drawCard(logos: string[], name: string, subtitle: string): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b1220";
  g.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, color: string) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `${color}99`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  };
  blob(140, 90, 320, COLORS[0]!);
  blob(1080, 140, 300, COLORS[1]!);
  blob(980, 600, 260, COLORS[4]!);
  blob(260, 610, 240, COLORS[2]!);

  // white card
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(250, 95, 700, 300, 48);
  g.fill();

  const imgs = await Promise.all(logos.map(loadImage));
  const boxH = 200;
  const boxW = imgs.length === 2 ? 260 : 400;
  const gap = imgs.length === 2 ? 90 : 0;
  const sizes = imgs.map((img) => {
    const s = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    return { w: img.naturalWidth * s, h: img.naturalHeight * s };
  });
  let x = 250 + (700 - (sizes.reduce((a, s) => a + s.w, 0) + gap)) / 2;
  imgs.forEach((img, i) => {
    const { w, h } = sizes[i]!;
    g.drawImage(img, x, 95 + (300 - h) / 2, w, h);
    x += w;
    if (i === 0 && imgs.length === 2) {
      g.fillStyle = "#9ca3af";
      g.font = "800 56px system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText("×", x + gap / 2, 95 + 150 + 20);
      x += gap;
    }
  });

  g.textAlign = "center";
  g.fillStyle = "#ffffff";
  let size = 60;
  do {
    g.font = `800 ${size}px system-ui, sans-serif`;
    size -= 2;
  } while (g.measureText(name).width > 1100 && size > 30);
  g.fillText(name, W / 2, 482);
  g.globalAlpha = 0.8;
  g.font = "500 32px system-ui, sans-serif";
  g.fillText(subtitle, W / 2, 538);
  g.globalAlpha = 1;
  COLORS.forEach((color, i) => {
    g.fillStyle = color;
    g.fillRect(i * 240, H - 12, 240, 12);
  });

  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Зураг үүсгэж чадсангүй"))), "image/png"),
  );
}

/**
 * Share image (og:image) built from the uploaded logos. Regenerated automatically when a logo
 * changes; the result is uploaded to R2 and saved with the settings.
 */
export function OgImageField({
  schoolLogo,
  unicefLogo,
  initial,
}: {
  schoolLogo: string;
  unicefLogo: string;
  initial: string;
}) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);

  async function generate() {
    const logos = [schoolLogo, unicefLogo].filter(Boolean);
    if (logos.length === 0) {
      setUrl("");
      return;
    }
    setBusy(true);
    try {
      const name =
        (document.getElementById("club.name") as HTMLInputElement | null)?.value.trim() ||
        "130-р сургуулийн UNICEF клуб";
      const card = await drawCard(logos, name, "130-р сургууль × UNICEF");
      setUrl(await uploadImage(card, "site"));
      toast.success("Хуваалцах зураг шинэчлэгдлээ. Хадгалахаа мартуузай.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate only when a logo changes
  }, [schoolLogo, unicefLogo]);

  return (
    <div className="space-y-2">
      <div className="flex aspect-[1200/630] w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border bg-muted text-xs text-muted-foreground">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span className="p-4 text-center">Лого оруулаагүй — үндсэн зураг ашиглагдана.</span>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || (!schoolLogo && !unicefLogo)}
        onClick={() => void generate()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Логоноос дахин үүсгэх
      </Button>
      <input type="hidden" name="branding.ogImageUrl" value={url} />
    </div>
  );
}
