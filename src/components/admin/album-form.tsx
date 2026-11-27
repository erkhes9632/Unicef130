"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import {
  AdminField,
  FormAlert,
  FormSection,
  keepValuesOnSubmit,
  NativeSelect,
  StickyActions,
  SubmitButton,
} from "./form";
import { SlugField } from "./slug-field";

type AlbumFormValues = {
  title: string;
  titleEn: string | null;
  slug: string;
  description: string;
  descriptionEn: string | null;
  date: string;
  published: boolean;
  eventId: string | null;
};

export function AlbumForm({
  action,
  initial,
  events = [],
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial?: AlbumFormValues;
  /** Activities the album can belong to (newest first). */
  events?: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      data-guard
      className="space-y-4"
    >
      <FormAlert state={state} />
      <FormSection title="Цомгийн мэдээлэл">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Нэр" htmlFor="title" required errors={e.title}>
            <Input id="title" name="title" defaultValue={initial?.title} required maxLength={200} />
          </AdminField>
          <AdminField label="Огноо" htmlFor="date" required errors={e.date}>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={initial?.date ?? new Date().toISOString().slice(0, 10)}
              required
            />
          </AdminField>
        </div>
        <AdminField label="Хаяг (URL)" htmlFor="slug" errors={e.slug}>
          <SlugField
            id="slug"
            name="slug"
            defaultValue={initial?.slug}
            sourceId="title"
            locked={!!initial?.slug && !!initial?.published}
          />
        </AdminField>
        <AdminField label="Тайлбар" htmlFor="description" errors={e.description}>
          <Textarea
            id="description"
            name="description"
            defaultValue={initial?.description}
            rows={2}
            maxLength={1000}
          />
        </AdminField>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Нэр (англи)" htmlFor="titleEn" errors={e.titleEn}>
            <Input
              id="titleEn"
              name="titleEn"
              defaultValue={initial?.titleEn ?? ""}
              maxLength={200}
            />
          </AdminField>
          <AdminField label="Тайлбар (англи)" htmlFor="descriptionEn" errors={e.descriptionEn}>
            <Input
              id="descriptionEn"
              name="descriptionEn"
              defaultValue={initial?.descriptionEn ?? ""}
              maxLength={1000}
            />
          </AdminField>
        </div>
        <AdminField
          label="Арга хэмжээ"
          htmlFor="eventId"
          hint="Цомог энэ арга хэмжээний хуудсанд харагдана."
        >
          <NativeSelect id="eventId" name="eventId" defaultValue={initial?.eventId ?? ""}>
            <option value="">—</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </NativeSelect>
        </AdminField>
        <div className="flex items-center gap-2">
          <Checkbox id="published" name="published" defaultChecked={initial?.published ?? false} />
          <Label htmlFor="published">Сайт дээр нийтлэх</Label>
        </div>
        <StickyActions>
          <SubmitButton />
        </StickyActions>
      </FormSection>
    </form>
  );
}
