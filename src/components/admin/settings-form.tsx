"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import type { SiteSettings } from "@/lib/data/settings";
import { AdminField, FormAlert, FormSection, SubmitButton } from "./form";

const socialLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  telegram: "Telegram",
  x: "X (Twitter)",
};

/** Flattened field errors use dotted paths (contact.email, socials.1.url, ...). */
function errs(state: ActionState, key: string) {
  return state.fieldErrors?.[key];
}

export function SettingsForm({
  action,
  initial,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial: SiteSettings;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <FormAlert state={state} />
      {state.fieldErrors && (
        <ul className="list-disc rounded-xl bg-destructive/10 p-3 pl-8 text-sm text-destructive">
          {Object.entries(state.fieldErrors).flatMap(([k, v]) =>
            (v ?? []).map((m) => <li key={k + m}>{m}</li>),
          )}
        </ul>
      )}
      <FormSection title="Холбоо барих мэдээлэл">
        <AdminField label="Хаяг" htmlFor="contact.address">
          <Textarea
            id="contact.address"
            name="contact.address"
            defaultValue={initial.contact.address}
            rows={2}
            maxLength={300}
          />
        </AdminField>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="И-мэйл" htmlFor="contact.email" errors={errs(state, "contact")}>
            <Input
              id="contact.email"
              name="contact.email"
              type="email"
              defaultValue={initial.contact.email}
            />
          </AdminField>
          <AdminField label="Утас" htmlFor="contact.phone">
            <Input
              id="contact.phone"
              name="contact.phone"
              defaultValue={initial.contact.phone}
              maxLength={40}
            />
          </AdminField>
        </div>
        <AdminField label="Цагийн хуваарь" htmlFor="contact.officeHours">
          <Input
            id="contact.officeHours"
            name="contact.officeHours"
            defaultValue={initial.contact.officeHours}
            maxLength={120}
          />
        </AdminField>
        <AdminField
          label="Google Maps embed хаяг"
          htmlFor="contact.mapEmbedUrl"
          hint='Google Maps → Share → Embed a map → HTML доторх src="..." хэсгийг хуулж оруулна.'
        >
          <Input
            id="contact.mapEmbedUrl"
            name="contact.mapEmbedUrl"
            defaultValue={initial.contact.mapEmbedUrl}
            placeholder="https://www.google.com/maps/embed?pb=..."
          />
        </AdminField>
      </FormSection>

      <FormSection title="Сошиал хаягууд" description="Хоосон үлдээсэн хаяг сайт дээр харагдахгүй.">
        <div className="grid gap-4 sm:grid-cols-2">
          {initial.socials.map((s) => (
            <AdminField
              key={s.platform}
              label={socialLabels[s.platform] ?? s.platform}
              htmlFor={`socials.${s.platform}`}
            >
              <Input
                id={`socials.${s.platform}`}
                name={`socials.${s.platform}`}
                defaultValue={s.url}
                placeholder="https://..."
              />
            </AdminField>
          ))}
        </div>
      </FormSection>

      <FormSection title="Нүүр хуудасны тоон үзүүлэлт">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["members", "Идэвхтэй гишүүн"],
              ["events", "Зохион байгуулсан арга хэмжээ"],
              ["volunteerHours", "Сайн дурын цаг"],
              ["childrenHelped", "Хүүхдэд хүрсэн"],
            ] as const
          ).map(([key, label]) => (
            <AdminField key={key} label={label} htmlFor={`stats.${key}`}>
              <Input
                id={`stats.${key}`}
                name={`stats.${key}`}
                type="number"
                min={0}
                defaultValue={initial.stats[key]}
              />
            </AdminField>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Хандивын холбоос"
        description="Зөвхөн сургуулийн албан ёсны журмаар зөвшөөрөгдсөн холбоос оруулна. Хоосон бол товч харагдахгүй."
      >
        <AdminField label="Хандивын хуудасны хаяг" htmlFor="donationUrl">
          <Input
            id="donationUrl"
            name="donationUrl"
            defaultValue={initial.donationUrl}
            placeholder="https://..."
          />
        </AdminField>
      </FormSection>
      <SubmitButton />
    </form>
  );
}
