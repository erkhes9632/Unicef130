"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import { displayYear } from "@/lib/school-year";
import {
  MAX_FEATURED_STATS,
  socialPlatforms,
  type HelpOptionItem,
  type Partner,
  type SiteSettings,
  type SocialPlatform,
  type StatItem,
  type StatKind,
} from "@/lib/settings/types";
import {
  AdminField,
  FormAlert,
  FormSection,
  keepValuesOnSubmit,
  NativeSelect,
  StickyActions,
  SubmitButton,
} from "./form";
import { ImageField } from "./image-field";
import { ListEditor } from "./list-editor";

const socialLabels: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  telegram: "Telegram",
  x: "X (Twitter)",
  website: "Бусад / вэбсайт",
};

const statKindLabels: Record<StatKind, string> = {
  custom: "Гараар бичих",
  members: "Автоматаар: идэвхтэй гишүүдийн тоо",
  events: "Автоматаар: үйл ажиллагааны тоо (Жилийн үр дүнгийн сүүлийн жил)",
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
  value,
  valueEn,
  max,
  multiline,
  hint,
}: {
  id: string;
  label: string;
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
        label={`${label} (англи)`}
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
  schoolYear,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial: SiteSettings;
  /** The year of today ("Автоматаар") and the years an admin may pick. */
  schoolYear: { auto: string; options: string[] };
}) {
  const [state, formAction] = useActionState(action, {});
  const [stats, setStats] = useState(() => withIds<StatItem>(initial.stats));
  const [partners, setPartners] = useState(() => withIds<Partner>(initial.partners));
  const [helpOptions, setHelpOptions] = useState(() =>
    withIds<HelpOptionItem>(initial.helpOptions),
  );
  const socialUrl = (p: SocialPlatform) => initial.socials.find((s) => s.platform === p)?.url;

  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      data-guard
      className="max-w-3xl space-y-6"
    >
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

      <FormSection
        title="Зарлалын тууз"
        description="Сайтын хамгийн дээр бүх хуудсанд харагдана. Элсэлт нээлттэй үед «Элсэлт нээлттэй» зар автоматаар гардаг (Элсэлт хэсгээс тохируулна). Энэ зарлалыг асаавал тэр автомат зарын оронд гарна — элсэлтийн үеэр унтраахаа мартуузай."
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="announcement.enabled"
            defaultChecked={initial.announcement.enabled}
            className="size-4 accent-[var(--brand-cyan)]"
          />
          Зарлалыг харуулах
        </label>
        <Pair
          id="announcement.text"
          label="Зарлалын текст"
          value={initial.announcement.text}
          valueEn={initial.announcement.textEn}
          max={200}
        />
        <AdminField
          label="Холбоос (заавал биш)"
          htmlFor="announcement.href"
          hint="Жишээ: /events эсвэл https://..."
        >
          <Input
            id="announcement.href"
            name="announcement.href"
            defaultValue={initial.announcement.href}
          />
        </AdminField>
      </FormSection>

      <FormSection title="Клубын мэдээлэл">
        <Pair
          id="club.name"
          label="Клубын нэр"
          value={initial.club.name}
          valueEn={initial.club.nameEn}
          max={120}
          hint="Сайт даяар (header, footer, хуваалцах карт) энэ нэр харагдана."
        />
        <Pair
          id="club.shortName"
          label="Богино нэр (хуудасны гарчигт)"
          value={initial.club.shortName}
          valueEn={initial.club.shortNameEn}
          max={60}
          hint="Жишээ: 130 UNICEF клуб. Хоосон бол бүтэн нэр ашиглана."
        />
        <Pair
          id="club.description"
          label="Товч танилцуулга (footer)"
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
        description="Клубын лого, favicon, хуваалцах зураг нь public/brand/ доторх албан ёсны файлууд (README → Лого). Энд зөвхөн сургуулийн лого (Бидний тухай хуудсанд жижгээр) болон нүүр зургийг оруулна."
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
          value={initial.branding.heroImageAlt}
          valueEn={initial.branding.heroImageAltEn}
          max={200}
          hint="Харааны бэрхшээлтэй хэрэглэгчдэд уншигдана."
        />
      </FormSection>

      <FormSection
        title="Холбоо барих"
        description="Хөл хэсэгт (бүх хуудсанд) болон «Биднийг дэмжих» хуудсанд харагдана. Хоосон үлдээсэн мөр сайт дээр харагдахгүй."
      >
        <Pair
          id="contact.address"
          label="Хаяг"
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
              placeholder="130foreverychild@gmail.com"
            />
          </AdminField>
          <AdminField
            label="Instagram"
            htmlFor="contact.instagram"
            hint="@нэр эсвэл профайлын хаяг (https://www.instagram.com/…/)."
          >
            <Input
              id="contact.instagram"
              name="contact.instagram"
              defaultValue={initial.contact.instagram ? `@${initial.contact.instagram}` : ""}
              placeholder="@130_foreverychild"
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
            featured: stats.filter((x) => x.featured).length < MAX_FEATURED_STATS,
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
              <AdminField label="Нэр (англи)" htmlFor={`stat-labelEn-${i}`}>
                <Input
                  id={`stat-labelEn-${i}`}
                  value={s.labelEn}
                  maxLength={60}
                  onChange={(e) => update({ labelEn: e.target.value })}
                />
              </AdminField>
              <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--brand-cyan)]"
                  checked={s.featured}
                  onChange={(e) => update({ featured: e.target.checked })}
                />
                Нүүр хуудсанд онцлох (хамгийн ихдээ {MAX_FEATURED_STATS}; бүгд «Үр дүн» хуудсанд
                харагдана)
              </label>
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
              <AdminField label="Нэр (англи)" htmlFor={`partner-nameEn-${i}`}>
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
              <AdminField label="Сонголт (англи)" htmlFor={`help-labelEn-${i}`}>
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

      <FormSection
        title="Гишүүнчлэл ба нууцлал"
        description="Тэнцээгүй өргөдлийн хувийн мэдээллийг элсэлт хаагдсанаас хойш заасан хоногийн дараа автоматаар устгана (элсэлтийн хуудсанд энэ тухай бичигдэнэ). Идэвхтэй гишүүний босго хоосон бол гишүүний хэсэгт явцын мөр харагдахгүй."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField
            label="Тэнцээгүй өргөдлийг устгах хугацаа (хоног)"
            htmlFor="membership.rejectedRetentionDays"
            required
            hint="7–730 хоног. Элсэлт хаагдсанаас хойш тоолно."
          >
            <Input
              id="membership.rejectedRetentionDays"
              name="membership.rejectedRetentionDays"
              type="number"
              min={7}
              max={730}
              required
              defaultValue={initial.membership.rejectedRetentionDays}
            />
          </AdminField>
          <AdminField label="Идэвхтэй гишүүний жилийн цаг" htmlFor="membership.activeMemberHours">
            <Input
              id="membership.activeMemberHours"
              name="membership.activeMemberHours"
              type="number"
              min={1}
              step="0.5"
              defaultValue={initial.membership.activeMemberHours ?? ""}
            />
          </AdminField>
        </div>
      </FormSection>

      <FormSection
        title="Хичээлийн жил"
        description="Сайт хичээлийн жилээр (9-р сарын 1 – 8-р сарын 31) зохион байгуулагдана: «Гишүүд» хуудас одоогийн жилийн багийг харуулж, гишүүн нэмэх, элсэлтээр тэнцсэн хүн энэ жилд орно. Анхнаасаа өнөөдрийн огнооноос тооцогдоно; шинэ жилийг хэдэн өдрийн өмнө эхлүүлэх бол энд сонгоно."
      >
        <AdminField label="Одоогийн хичээлийн жил" htmlFor="schoolYear.current">
          <NativeSelect
            id="schoolYear.current"
            name="schoolYear.current"
            defaultValue={initial.schoolYear.current}
            className="max-w-72"
          >
            <option value="">Автоматаар ({displayYear(schoolYear.auto)})</option>
            {schoolYear.options.map((y) => (
              <option key={y} value={y}>
                {displayYear(y)}
              </option>
            ))}
          </NativeSelect>
        </AdminField>
        <p className="text-sm">
          <Link
            href="/admin/school-year"
            className="inline-flex min-h-11 items-center font-semibold text-brand-cyan-strong hover:underline"
          >
            Шинэ хичээлийн жил эхлүүлэх →
          </Link>
        </p>
      </FormSection>

      <StickyActions>
        <SubmitButton />
      </StickyActions>
    </form>
  );
}
