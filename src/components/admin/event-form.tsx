"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import type { RichTextDoc } from "@/lib/types";
import { AdminField, FormAlert, FormSection, NativeSelect, SubmitButton } from "./form";
import { ImageField } from "./image-field";
import { RichTextEditor } from "./rich-text-editor";
import { SlugField } from "./slug-field";

export type EventFormValues = {
  title: string;
  titleEn: string | null;
  slug: string;
  summary: string;
  summaryEn: string | null;
  location: string;
  locationEn: string | null;
  coverUrl: string | null;
  startsAt: string;
  endsAt: string;
  content: RichTextDoc | null;
  contentEn: RichTextDoc | null;
  published: boolean;
  allDay: boolean;
  direction: string | null;
  schoolYear: string | null;
  reachInPerson: string | null;
  reachInPersonEn: string | null;
  reachOnline: number | null;
  donationAmount: number | null;
  partners: string[];
  beneficiaries: string[];
  sdgs: number[];
  adminNote: string;
};

export function EventForm({
  action,
  initial,
  saved,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial?: EventFormValues;
  saved?: boolean;
}) {
  const [state, formAction] = useActionState(
    action,
    saved ? { ok: true, message: "Хадгалагдлаа." } : {},
  );
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <FormAlert state={state} />
        <FormSection title="Үндсэн мэдээлэл">
          <AdminField label="Нэр" htmlFor="title" required errors={e.title}>
            <Input id="title" name="title" defaultValue={initial?.title} required maxLength={200} />
          </AdminField>
          <AdminField
            label="Slug (URL)"
            htmlFor="slug"
            hint="Хоосон орхивол нэрнээс автоматаар үүсгэнэ."
            errors={e.slug}
          >
            <SlugField id="slug" name="slug" defaultValue={initial?.slug} sourceId="title" />
          </AdminField>
          <AdminField label="Товч тайлбар" htmlFor="summary" required errors={e.summary}>
            <Textarea
              id="summary"
              name="summary"
              defaultValue={initial?.summary}
              rows={2}
              maxLength={400}
              required
            />
          </AdminField>
          <AdminField label="Байршил" htmlFor="location" required errors={e.location}>
            <Input
              id="location"
              name="location"
              defaultValue={initial?.location}
              required
              maxLength={200}
            />
          </AdminField>
          <AdminField label="Дэлгэрэнгүй" htmlFor="content" errors={e.content}>
            <RichTextEditor
              id="content"
              name="content"
              label="Дэлгэрэнгүй"
              defaultValue={initial?.content}
            />
          </AdminField>
        </FormSection>
        <FormSection title="English (заавал биш)">
          <AdminField label="Title" htmlFor="titleEn" errors={e.titleEn}>
            <Input
              id="titleEn"
              name="titleEn"
              defaultValue={initial?.titleEn ?? ""}
              maxLength={200}
            />
          </AdminField>
          <AdminField label="Summary" htmlFor="summaryEn" errors={e.summaryEn}>
            <Textarea
              id="summaryEn"
              name="summaryEn"
              defaultValue={initial?.summaryEn ?? ""}
              rows={2}
              maxLength={400}
            />
          </AdminField>
          <AdminField label="Location" htmlFor="locationEn" errors={e.locationEn}>
            <Input
              id="locationEn"
              name="locationEn"
              defaultValue={initial?.locationEn ?? ""}
              maxLength={200}
            />
          </AdminField>
          <AdminField label="Details" htmlFor="contentEn" errors={e.contentEn}>
            <RichTextEditor
              id="contentEn"
              name="contentEn"
              label="Details (English)"
              defaultValue={initial?.contentEn}
            />
          </AdminField>
        </FormSection>
      </div>
      <div className="space-y-6">
        <FormSection title="Цаг хугацаа" description="Улаанбаатарын цагаар">
          <AdminField label="Эхлэх" htmlFor="startsAt" required errors={e.startsAt}>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={initial?.startsAt}
              required
            />
          </AdminField>
          <AdminField label="Дуусах" htmlFor="endsAt" errors={e.endsAt}>
            <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={initial?.endsAt} />
          </AdminField>
          <div className="flex items-start gap-2">
            <Checkbox
              id="allDay"
              name="allDay"
              defaultChecked={initial?.allDay ?? false}
              className="mt-0.5"
            />
            <Label htmlFor="allDay" className="leading-snug">
              Зөвхөн огноо (цаг тодорхойгүй — сайт дээр цаг харуулахгүй)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="published"
              name="published"
              defaultChecked={initial?.published ?? false}
            />
            <Label htmlFor="published">Сайт дээр нийтлэх</Label>
          </div>
          <SubmitButton className="w-full" />
        </FormSection>
        <FormSection
          title="Нүүр зураг"
          description="Зураггүй бол чиглэл, SDG-тэй загвар харагдана."
        >
          <ImageField
            id="coverUrl"
            name="coverUrl"
            defaultValue={initial?.coverUrl}
            kind="events"
          />
        </FormSection>
        <FormSection
          title="Тайлангийн мэдээлэл"
          description="Заавал биш. Хоосон талбар сайт дээр харагдахгүй."
        >
          <AdminField label="Чиглэл" htmlFor="direction">
            <NativeSelect id="direction" name="direction" defaultValue={initial?.direction ?? ""}>
              <option value="">—</option>
              <option value="activity">Нөлөөлөл</option>
              <option value="education">Боловсрол</option>
              <option value="charity">Хандив</option>
            </NativeSelect>
          </AdminField>
          <AdminField label="Хичээлийн жил" htmlFor="schoolYear" errors={e.schoolYear}>
            <Input
              id="schoolYear"
              name="schoolYear"
              defaultValue={initial?.schoolYear ?? ""}
              placeholder="2025-2026"
            />
          </AdminField>
          <AdminField
            label="Биечлэн хүрсэн"
            htmlFor="reachInPerson"
            hint="Тайланд бичигдсэнээр: 137, 50+, ~500"
            errors={e.reachInPerson}
          >
            <Input
              id="reachInPerson"
              name="reachInPerson"
              defaultValue={initial?.reachInPerson ?? ""}
              maxLength={40}
            />
          </AdminField>
          <AdminField label="In person (English)" htmlFor="reachInPersonEn">
            <Input
              id="reachInPersonEn"
              name="reachInPersonEn"
              defaultValue={initial?.reachInPersonEn ?? ""}
              maxLength={40}
            />
          </AdminField>
          <AdminField label="Онлайнаар хүрсэн" htmlFor="reachOnline" errors={e.reachOnline}>
            <Input
              id="reachOnline"
              name="reachOnline"
              inputMode="numeric"
              defaultValue={initial?.reachOnline ?? ""}
            />
          </AdminField>
          <AdminField
            label="Цуглуулсан хандив (₮)"
            htmlFor="donationAmount"
            errors={e.donationAmount}
          >
            <Input
              id="donationAmount"
              name="donationAmount"
              inputMode="numeric"
              defaultValue={initial?.donationAmount ?? ""}
            />
          </AdminField>
          <AdminField label="Хамтрагч (таслалаар)" htmlFor="partners" errors={e.partners}>
            <Input
              id="partners"
              name="partners"
              defaultValue={initial?.partners.join(", ") ?? ""}
            />
          </AdminField>
          <AdminField
            label="Хандив хүлээн авагч (таслалаар)"
            htmlFor="beneficiaries"
            errors={e.beneficiaries}
          >
            <Input
              id="beneficiaries"
              name="beneficiaries"
              defaultValue={initial?.beneficiaries.join(", ") ?? ""}
            />
          </AdminField>
          <AdminField label="SDG дугаарууд" htmlFor="sdgs" hint="Жишээ: 1, 10" errors={e.sdgs}>
            <Input id="sdgs" name="sdgs" defaultValue={initial?.sdgs.join(", ") ?? ""} />
          </AdminField>
          <AdminField
            label="Админы тэмдэглэл"
            htmlFor="adminNote"
            hint="Зөвхөн админд харагдана (жишээ: тайлангийн өгөгдлийн зөрүү)."
          >
            <Textarea
              id="adminNote"
              name="adminNote"
              rows={3}
              defaultValue={initial?.adminNote ?? ""}
              maxLength={2000}
              className={initial?.adminNote ? "border-brand-gold bg-brand-gold-soft" : undefined}
            />
          </AdminField>
        </FormSection>
      </div>
    </form>
  );
}
