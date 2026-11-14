import { getTranslations } from "next-intl/server";
import type { MemberItem } from "@/lib/data/members";
import { cn } from "@/lib/utils";

const avatarTones = [
  "bg-brand-cyan-soft text-brand-cyan-strong",
  "bg-brand-purple-soft text-brand-purple-strong",
  "bg-brand-green-soft text-brand-green-strong",
  "bg-brand-blue-soft text-brand-blue-strong",
  "bg-brand-gold-soft text-brand-gold-strong",
];

function initials(name: string) {
  // "Б. Ану" → "БА"; "Мөнх-Эрдэнэ" → "МЭ"
  const parts = name
    .replace(/\./g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase())
    .join("");
}

export async function MemberCard({
  member,
  index,
  size = "default",
}: {
  member: MemberItem;
  index: number;
  size?: "default" | "large";
}) {
  const t = await getTranslations("Members");
  const large = size === "large";

  return (
    <li className="flex flex-col items-center gap-3 rounded-3xl bg-card p-5 text-center ring-1 ring-border">
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full font-heading font-extrabold",
          large ? "size-24 text-2xl" : "size-16 text-lg",
          avatarTones[index % avatarTones.length],
        )}
      >
        {member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 photo shown with consent
          <img src={member.photoUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials(member.name)}</span>
        )}
      </div>
      <div className="space-y-1">
        <p className={cn("font-bold", large && "text-lg")}>{member.name}</p>
        <p className="text-sm font-semibold text-brand-cyan-strong">{member.role}</p>
        {member.className && !/^(багш|teacher)$/i.test(member.className) && (
          <p className="text-xs text-muted-foreground">
            {t("classLabel", { className: member.className })}
          </p>
        )}
      </div>
    </li>
  );
}
