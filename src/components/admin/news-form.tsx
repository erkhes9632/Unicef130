"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import { categoryOptions } from "@/lib/admin/labels";
import type { RichTextDoc } from "@/lib/types";
import {
  AdminField,
  FormAlert,
  FormSection,
  keepValuesOnSubmit,
  NativeSelect,
  SubmitButton,
} from "./form";
import { ImageField } from "./image-field";
import { RichTextEditor } from "./rich-text-editor";
import { SlugField } from "./slug-field";

type NewsFormValues = {
  title: string;
  titleEn: string | null;
  slug: string;
  excerpt: string;
  excerptEn: string | null;
  category: string;
  tags: string[];
  coverUrl: string | null;
  content: RichTextDoc | null;
  contentEn: RichTextDoc | null;
  status: "draft" | "published";
  publishedAt: string; // datetime-local (UB)
  sdgs: number[];
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  albumId: string | null;
};

export function NewsForm({
  action,
  initial,
  saved,
  albums = [],
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial?: NewsFormValues;
  saved?: boolean;
  /** Albums that can be shown under the post. */
  albums?: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState(
    action,
    saved ? { ok: true, message: "Хадгалагдлаа." } : {},
  );
  const e = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      data-guard
      className="grid gap-6 xl:grid-cols-[1fr_20rem]"
    >
      <div className="space-y-6">
        <FormAlert state={state} />
        <FormSection title="Үндсэн мэдээлэл">
          <AdminField label="Гарчиг" htmlFor="title" required errors={e.title}>
            <Input id="title" name="title" defaultValue={initial?.title} required maxLength={200} />
          </AdminField>
          <AdminField
            label="Хаяг (URL)"
            htmlFor="slug"
            hint="Сайтын хаягийн сүүлийн хэсэг (жишээ: /news/mod-tarikh). Хоосон орхивол гарчгаас автоматаар үүснэ."
            errors={e.slug}
          >
            <SlugField id="slug" name="slug" defaultValue={initial?.slug} sourceId="title" />
          </AdminField>
          <AdminField
            label="Товч агуулга"
            htmlFor="excerpt"
            required
            errors={e.excerpt}
            hint="Жагсаалт болон хайлтад харагдана."
          >
            <Textarea
              id="excerpt"
              name="excerpt"
              defaultValue={initial?.excerpt}
              rows={3}
              maxLength={400}
              required
            />
          </AdminField>
          <AdminField label="Агуулга" htmlFor="content" required errors={e.content}>
            <RichTextEditor
              id="content"
              name="content"
              label="Агуулга"
              defaultValue={initial?.content}
            />
          </AdminField>
        </FormSection>

        <FormSection
          title="English (заавал биш)"
          description="Хоосон бол англи хувилбарт монгол текст харагдана."
        >
          <AdminField label="Title" htmlFor="titleEn" errors={e.titleEn}>
            <Input
              id="titleEn"
              name="titleEn"
              defaultValue={initial?.titleEn ?? ""}
              maxLength={200}
            />
          </AdminField>
          <AdminField label="Excerpt" htmlFor="excerptEn" errors={e.excerptEn}>
            <Textarea
              id="excerptEn"
              name="excerptEn"
              defaultValue={initial?.excerptEn ?? ""}
              rows={3}
              maxLength={400}
            />
          </AdminField>
          <AdminField label="Content" htmlFor="contentEn" errors={e.contentEn}>
            <RichTextEditor
              id="contentEn"
              name="contentEn"
              label="Content (English)"
              defaultValue={initial?.contentEn}
            />
          </AdminField>
        </FormSection>
      </div>

      <div className="space-y-6">
        <FormSection title="Нийтлэх">
          <AdminField label="Төлөв" htmlFor="status" errors={e.status}>
            <NativeSelect id="status" name="status" defaultValue={initial?.status ?? "draft"}>
              <option value="draft">Ноорог</option>
              <option value="published">Нийтлэгдсэн</option>
            </NativeSelect>
          </AdminField>
          <AdminField
            label="Нийтэлсэн огноо"
            htmlFor="publishedAt"
            hint="Улаанбаатарын цагаар. Хоосон бол нийтлэх үед одоогийн цаг."
            errors={e.publishedAt}
          >
            <Input
              id="publishedAt"
              name="publishedAt"
              type="datetime-local"
              defaultValue={initial?.publishedAt}
            />
          </AdminField>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initial?.featured ?? false}
              className="size-4 accent-[var(--brand-cyan)]"
            />
            Онцлох мэдээ (нүүр хуудсанд эхэнд)
          </label>
          <SubmitButton className="w-full" />
        </FormSection>
        <FormSection title="Зургийн цомог">
          <AdminField
            label="Мэдээний доор харуулах цомог"
            htmlFor="albumId"
            hint="Зөвхөн нийтлэгдсэн цомог сайт дээр харагдана."
            errors={e.albumId}
          >
            <NativeSelect id="albumId" name="albumId" defaultValue={initial?.albumId ?? ""}>
              <option value="">—</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </NativeSelect>
          </AdminField>
        </FormSection>
        <FormSection
          title="Хайлтын систем (SEO)"
          description="Хоосон бол гарчиг, товч агуулгыг ашиглана."
        >
          <AdminField label="SEO гарчиг (≤ 70)" htmlFor="metaTitle" errors={e.metaTitle}>
            <Input
              id="metaTitle"
              name="metaTitle"
              maxLength={70}
              defaultValue={initial?.metaTitle ?? ""}
            />
          </AdminField>
          <AdminField
            label="SEO тайлбар (≤ 160)"
            htmlFor="metaDescription"
            errors={e.metaDescription}
          >
            <Textarea
              id="metaDescription"
              name="metaDescription"
              maxLength={160}
              rows={3}
              defaultValue={initial?.metaDescription ?? ""}
            />
          </AdminField>
        </FormSection>
        <FormSection title="Ангилал, шошго">
          <AdminField label="Ангилал" htmlFor="category" errors={e.category}>
            <NativeSelect
              id="category"
              name="category"
              defaultValue={initial?.category ?? "activity"}
            >
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </AdminField>
          <AdminField
            label="Шошго"
            htmlFor="tags"
            hint="Таслалаар тусгаарлана: хандив, өвөл"
            errors={e.tags}
          >
            <Input id="tags" name="tags" defaultValue={initial?.tags.join(", ")} />
          </AdminField>
          <AdminField
            label="Тогтвортой хөгжлийн зорилго (дугаар)"
            htmlFor="sdgs"
            hint="Аль зорилгод хамаарах вэ: дугаарыг таслалаар (жишээ: 1, 10). 1–17."
            errors={e.sdgs}
          >
            <Input id="sdgs" name="sdgs" defaultValue={initial?.sdgs.join(", ") ?? ""} />
          </AdminField>
        </FormSection>
        <FormSection title="Нүүр зураг">
          <ImageField id="coverUrl" name="coverUrl" defaultValue={initial?.coverUrl} kind="news" />
          {e.coverUrl?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </FormSection>
      </div>
    </form>
  );
}
