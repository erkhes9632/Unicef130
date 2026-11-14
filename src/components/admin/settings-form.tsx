"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import {
  socialPlatforms,
  type HelpOptionItem,
  type Partner,
  type SiteSettings,
  type SocialPlatform,
  type StatItem,
  type StatKind,
} from "@/lib/settings/types";
import { AdminField, FormAlert, FormSection, NativeSelect, SubmitButton } from "./form";
import { ImageField } from "./image-field";
import { ListEditor } from "./list-editor";

const socialLabels: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  telegram: "Telegram",
  x: "X (Twitter)",
  website: "Бусад / вэбсайт",
};

const statKindLabels: Record<StatKind, string> = {
  custom: "Гараар бичих",
  members: "Автоматаар: идэвхтэй гишүүдийн тоо",
  events: "Автоматаар: болж өнгөрсөн арга хэмжээний тоо",
};

/** Client-only row ids keep React state (image pickers) attached to the right row. */
type Row<T> = T & { _id: string };
const withIds = <T,>(items: T[]): Row<T>[] =>
  items.map((it) => ({ ...it, _id: crypto.randomUUID() }));
const stripIds = <T,>(items: Row<T>[]): T[] =>
  items.map(({ _id, ...rest }) => (void _id, rest as T));
const keyOf = (r: { _id: string }) => r._id;

function newOptionKey() {
  return `opt-${crypto.randomUUID().slice(0, 8)}`;
}

function Pair({
  id,
  label,
  labelEn,
  value,
  valueEn,
  max,
  multiline,
  hint,
}: {
  id: string;
  label: string;
  labelEn: string;
  value: string;
  valueEn: string;
  max: number;
  multiline?: boolean;
  hint?: string;
}) {
  const Field = multiline ? Textarea : Input;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AdminField label={label} htmlFor={id} hint={hint}>
        <Field id={id} name={id} defaultValue={value} maxLength={max} />
      </AdminField>
      <AdminField
        label={labelEn}
        htmlFor={`${id}En`}
        hint="Заавал биш. Хоосон бол англи хувилбарт монгол текст харагдана."
      >
        <Field id={`${id}En`} name={`${id}En`} defaultValue={valueEn} maxLength={max} />
      </AdminField>
    </div>
  );
}

export function SettingsForm({
  action,
  initial,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial: SiteSettings;
}) {
  const [state, formAction] = useActionState(action, {});
  const [stats, setStats] = useState(() => withIds<StatItem>(initial.stats));
  const [partners, setPartners] = useState(() => withIds<Partner>(initial.partners));
  const [helpOptions, setHelpOptions] = useState(() =>
    withIds<HelpOptionItem>(initial.helpOptions),
  );
  const socialUrl = (p: SocialPlatform) => initial.socials.find((s) => s.platform === p)?.url;

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
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        Хоосон үлдээсэн талбар сайт дээр <strong>харагдахгүй</strong>. Англи (English) талбар хоосон
        бол англи хувилбарт монгол текст гарна.
      </p>

      <FormSection title="Клубын мэдээлэл">
        <Pair
          id="club.name"
          label="Клубын нэр"
          labelEn="Club name (English)"
          value={initial.club.name}
          valueEn={initial.club.nameEn}
          max={120}
          hint="Хоосон бол «130 UNICEF клуб»."
        />
        <Pair
          id="club.description"
          label="Товч танилцуулга (footer)"
          labelEn="Short description (English)"
          value={initial.club.description}
          valueEn={initial.club.descriptionEn}
          max={600}
          multiline
        />
        <AdminField
          label="Байгуулагдсан он"
          htmlFor="club.foundedYear"
          hint="Хоосон бол он харагдахгүй."
        >
          <Input
            id="club.foundedYear"
            name="club.foundedYear"
            type="number"
            min={1900}
            max={2100}
            defaultValue={initial.club.foundedYear ?? ""}
            className="max-w-40"
          />
        </AdminField>
      </FormSection>

      <FormSection
        title="Лого ба нүүр зураг"
        description="Лого оруулаагүй бол public/logos/ доторх файл, тэр ч байхгүй бол «130» тэмдэг харагдана. Ил тод (PNG/WebP) лого тохиромжтой."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <AdminField label="130-р сургуулийн лого" htmlFor="branding.schoolLogoUrl">
            <ImageField
              id="branding.schoolLogoUrl"
              name="branding.schoolLogoUrl"
              defaultValue={initial.branding.schoolLogoUrl}
              kind="site"
              fit="contain"
              maxEdge={1024}
              label="Сургуулийн лого"
            />
          </AdminField>
          <AdminField label="UNICEF лого" htmlFor="branding.unicefLogoUrl">
            <ImageField
              id="branding.unicefLogoUrl"
              name="branding.unicefLogoUrl"
              defaultValue={initial.branding.unicefLogoUrl}
              kind="site"
              fit="contain"
              maxEdge={1024}
              label="UNICEF лого"
            />
          </AdminField>
        </div>
        <AdminField
          label="Нүүр хуудасны зураг (жишээ: клубын хамтын зураг)"
          htmlFor="branding.heroImageUrl"
          hint="Оруулбал нүүр хуудасны баруун талын лого картын оронд харагдана. Хүүхдийн зургийг зөвшөөрөлтэй оруулна."
        >
          <ImageField
            id="branding.heroImageUrl"
            name="branding.heroImageUrl"
            defaultValue={initial.branding.heroImageUrl}
            kind="site"
            label="Нүүр зураг"
          />
        </AdminField>
        <Pair
          id="branding.heroImageAlt"
          label="Зургийн тайлбар (alt)"
          labelEn="Image description (English)"
          value={initial.branding.heroImageAlt}
          valueEn={initial.branding.heroImageAltEn}
          max={200}
          hint="Харааны бэрхшээлтэй хэрэглэгчдэд уншигдана."
        />
      </FormSection>

      <FormSection title="Холбоо барих мэдээлэл">
        <Pair
          id="contact.address"
          label="Хаяг"
          labelEn="Address (English)"
          value={initial.contact.address}
          valueEn={initial.contact.addressEn}
          max={300}
          multiline
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="И-мэйл" htmlFor="contact.email">
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
        <Pair
          id="contact.officeHours"
          label="Цагийн хуваарь"
          labelEn="Office hours (English)"
          value={initial.contact.officeHours}
          valueEn={initial.contact.officeHoursEn}
          max={120}
        />
        <AdminField
          label="Google Maps embed хаяг"
          htmlFor="contact.mapEmbedUrl"
          hint='Google Maps → Share → Embed a map → HTML доторх src="..." хэсгийг хуулж оруулна. Эсвэл доор өргөрөг/уртраг оруулна.'
        >
          <Input
            id="contact.mapEmbedUrl"
            name="contact.mapEmbedUrl"
            defaultValue={initial.contact.mapEmbedUrl}
            placeholder="https://www.google.com/maps/embed?pb=..."
          />
        </AdminField>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Өргөрөг (latitude)" htmlFor="contact.mapLat">
            <Input
              id="contact.mapLat"
              name="contact.mapLat"
              inputMode="decimal"
              defaultValue={initial.contact.mapLat}
              placeholder="47.9184"
            />
          </AdminField>
          <AdminField label="Уртраг (longitude)" htmlFor="contact.mapLng">
            <Input
              id="contact.mapLng"
              name="contact.mapLng"
              inputMode="decimal"
              defaultValue={initial.contact.mapLng}
              placeholder="106.9177"
            />
          </AdminField>
        </div>
      </FormSection>

      <FormSection
        title="Сошиал хаягууд"
        description="Зөвхөн бөглөсөн хаягууд сайт дээр харагдана."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {socialPlatforms.map((p) => (
            <AdminField key={p} label={socialLabels[p]} htmlFor={`socials.${p}`}>
              <Input
                id={`socials.${p}`}
                name={`socials.${p}`}
                defaultValue={socialUrl(p)}
                placeholder="https://..."
              />
            </AdminField>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Нүүр хуудасны тоон үзүүлэлт"
        description="Зөвхөн бодит тоо оруулна. Жагсаалт хоосон бол тоон хэсэг нүүр хуудсанд харагдахгүй."
      >
        <ListEditor<Row<StatItem>>
          items={stats}
          onChange={setStats}
          getKey={keyOf}
          max={12}
          addLabel="Тоон үзүүлэлт нэмэх"
          emptyText="Одоогоор тоон үзүүлэлт алга — нүүр хуудсанд харагдахгүй."
          create={() => ({
            _id: crypto.randomUUID(),
            kind: "custom",
            label: "",
            labelEn: "",
            value: "",
          })}
          itemLabel={(s) => s.label || statKindLabels[s.kind]}
          renderItem={(s, update, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Төрөл" htmlFor={`stat-kind-${i}`} className="sm:col-span-2">
                <NativeSelect
                  id={`stat-kind-${i}`}
                  value={s.kind}
                  onChange={(e) => update({ kind: e.target.value as StatKind })}
                >
                  {Object.entries(statKindLabels).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </AdminField>
              <AdminField
                label="Нэр"
                htmlFor={`stat-label-${i}`}
                hint={s.kind !== "custom" ? "Хоосон бол стандарт нэр." : undefined}
              >
                <Input
                  id={`stat-label-${i}`}
                  value={s.label}
                  maxLength={60}
                  placeholder="Идэвхтэй гишүүн"
                  onChange={(e) => update({ label: e.target.value })}
                />
              </AdminField>
              <AdminField label="Label (English)" htmlFor={`stat-labelEn-${i}`}>
                <Input
                  id={`stat-labelEn-${i}`}
                  value={s.labelEn}
                  maxLength={60}
                  onChange={(e) => update({ labelEn: e.target.value })}
                />
              </AdminField>
              {s.kind === "custom" && (
                <AdminField label="Тоо" htmlFor={`stat-value-${i}`} hint="Жишээ: 25 эсвэл 120+">
                  <Input
                    id={`stat-value-${i}`}
                    value={s.value}
                    maxLength={20}
                    onChange={(e) => update({ value: e.target.value })}
                  />
                </AdminField>
              )}
            </div>
          )}
        />
        <input type="hidden" name="stats" value={JSON.stringify(stripIds(stats))} />
      </FormSection>

      <FormSection
        title="Хамтрагч байгууллагууд"
        description="Жагсаалт хоосон бол нүүр хуудсанд хамтрагчийн хэсэг харагдахгүй."
      >
        <ListEditor<Row<Partner>>
          items={partners}
          onChange={setPartners}
          getKey={keyOf}
          max={30}
          addLabel="Хамтрагч нэмэх"
          emptyText="Одоогоор хамтрагч алга."
          create={() => ({
            _id: crypto.randomUUID(),
            name: "",
            nameEn: "",
            logoUrl: "",
            url: "",
            type: "partner" as const,
          })}
          itemLabel={(p) => p.name || "Шинэ хамтрагч"}
          renderItem={(p, update, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Нэр" htmlFor={`partner-name-${i}`} required>
                <Input
                  id={`partner-name-${i}`}
                  value={p.name}
                  maxLength={120}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </AdminField>
              <AdminField label="Name (English)" htmlFor={`partner-nameEn-${i}`}>
                <Input
                  id={`partner-nameEn-${i}`}
                  value={p.nameEn}
                  maxLength={120}
                  onChange={(e) => update({ nameEn: e.target.value })}
                />
              </AdminField>
              <AdminField label="Төрөл" htmlFor={`partner-type-${i}`} className="sm:col-span-2">
                <NativeSelect
                  id={`partner-type-${i}`}
                  value={p.type}
                  onChange={(e) => update({ type: e.target.value as Partner["type"] })}
                >
                  <option value="partner">Хамтрагч байгууллага</option>
                  <option value="beneficiary">Хандив хүлээн авагч</option>
                </NativeSelect>
              </AdminField>
              <AdminField label="Вэбсайт" htmlFor={`partner-url-${i}`} className="sm:col-span-2">
                <Input
                  id={`partner-url-${i}`}
                  value={p.url}
                  placeholder="https://..."
                  onChange={(e) => update({ url: e.target.value })}
                />
              </AdminField>
              <AdminField label="Лого" htmlFor={`partner-logo-${i}`} className="sm:col-span-2">
                <ImageField
                  id={`partner-logo-${i}`}
                  defaultValue={p.logoUrl}
                  kind="site"
                  fit="contain"
                  maxEdge={800}
                  label={`${p.name || "Хамтрагч"} лого`}
                  onChange={(url) => update({ logoUrl: url })}
                />
              </AdminField>
            </div>
          )}
        />
        <input type="hidden" name="partners" value={JSON.stringify(stripIds(partners))} />
      </FormSection>

      <FormSection
        title="Хандивын мэдээлэл"
        description="Зөвхөн сургуулийн албан ёсны журмаар зөвшөөрөгдсөн мэдээлэл оруулна. Хоосон бол «Дэмжих» хуудсанд нэг богино өгүүлбэр л харагдана."
      >
        <AdminField label="Хандивын хуудасны хаяг (заавал биш)" htmlFor="donation.url">
          <Input
            id="donation.url"
            name="donation.url"
            defaultValue={initial.donation.url}
            placeholder="https://..."
          />
        </AdminField>
        <Pair
          id="donation.text"
          label="Хандивын мэдээлэл (банкны данс гэх мэт)"
          labelEn="Donation info (English)"
          value={initial.donation.text}
          valueEn={initial.donation.textEn}
          max={1500}
          multiline
        />
      </FormSection>

      <FormSection
        title="Гишүүнчлэлийн маягтын сонголтууд"
        description="«Ямар ажилд туслахыг хүсэж байна вэ?» асуултын сонголтууд. Устгасан сонголттой хуучин өргөдлүүд хэвээр үлдэнэ."
      >
        <ListEditor
          items={helpOptions}
          onChange={setHelpOptions}
          getKey={keyOf}
          max={20}
          addLabel="Сонголт нэмэх"
          create={() => ({ _id: crypto.randomUUID(), key: newOptionKey(), label: "", labelEn: "" })}
          itemLabel={(o) => o.label || "Шинэ сонголт"}
          renderItem={(o, update, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Сонголт" htmlFor={`help-label-${i}`} required>
                <Input
                  id={`help-label-${i}`}
                  value={o.label}
                  maxLength={80}
                  onChange={(e) => update({ label: e.target.value })}
                />
              </AdminField>
              <AdminField label="Option (English)" htmlFor={`help-labelEn-${i}`}>
                <Input
                  id={`help-labelEn-${i}`}
                  value={o.labelEn}
                  maxLength={80}
                  onChange={(e) => update({ labelEn: e.target.value })}
                />
              </AdminField>
            </div>
          )}
        />
        <input type="hidden" name="helpOptions" value={JSON.stringify(stripIds(helpOptions))} />
      </FormSection>

      <SubmitButton />
    </form>
  );
}
