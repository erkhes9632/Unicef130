"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import { AdminField, FormAlert, FormSection, SubmitButton } from "./form";
import { SlugField } from "./slug-field";

export type AlbumFormValues = {
  title: string;
  titleEn: string | null;
  slug: string;
  description: string;
  descriptionEn: string | null;
  date: string;
  published: boolean;
};

export function AlbumForm({
  action,
  initial,
  saved,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial?: AlbumFormValues;
  saved?: boolean;
}) {
  const [state, formAction] = useActionState(
    action,
    saved ? { ok: true, message: "Хадгалагдлаа." } : {},
  );
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
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
        <AdminField label="Slug (URL)" htmlFor="slug" errors={e.slug}>
          <SlugField id="slug" name="slug" defaultValue={initial?.slug} sourceId="title" />
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
          <AdminField label="Title (English)" htmlFor="titleEn" errors={e.titleEn}>
            <Input
              id="titleEn"
              name="titleEn"
              defaultValue={initial?.titleEn ?? ""}
              maxLength={200}
            />
          </AdminField>
          <AdminField
            label="Description (English)"
            htmlFor="descriptionEn"
            errors={e.descriptionEn}
          >
            <Input
              id="descriptionEn"
              name="descriptionEn"
              defaultValue={initial?.descriptionEn ?? ""}
              maxLength={1000}
            />
          </AdminField>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="published" name="published" defaultChecked={initial?.published ?? false} />
          <Label htmlFor="published">Сайт дээр нийтлэх</Label>
        </div>
        <SubmitButton />
      </FormSection>
    </form>
  );
}
