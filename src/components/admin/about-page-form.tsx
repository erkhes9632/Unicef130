"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import type { AboutContent, ValueItem } from "@/lib/settings/types";
import { AdminField, FormAlert, FormSection, SubmitButton } from "./form";
import { ListEditor } from "./list-editor";

type Row = ValueItem & { _id: string };

function DraftNotice() {
  return (
    <p className="flex gap-2 rounded-xl bg-brand-gold-soft p-3 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-gold-strong" aria-hidden="true" />
      <span>
        <strong>Ноорог текст.</strong> Энэ нь жишээ болгон бичсэн текст бөгөөд баталгаажаагүй.
        Клубын бодит түүх, ажлаар засаж бичээд «Сайт дээр харуулах»-г чагтлана. Чагтлаагүй үед сайт
        дээр харагдахгүй.
      </span>
    </p>
  );
}

function Publish({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-[var(--brand-cyan)]"
      />
      Сайт дээр харуулах (текстийг шалгаж баталгаажуулсан)
    </label>
  );
}

function Bilingual({
  id,
  label,
  value,
  valueEn,
  max,
  rows = 3,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  valueEn: string;
  max: number;
  rows?: number;
  hint?: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminField label={label} htmlFor={id} hint={hint}>
        <Textarea id={id} name={id} defaultValue={value} maxLength={max} rows={rows} />
      </AdminField>
      <AdminField
        label={`${label} (English)`}
        htmlFor={`${id}En`}
        hint="Заавал биш. Хоосон бол англи хувилбарт монгол текст харагдана."
      >
        <Textarea
          id={`${id}En`}
          name={`${id}En`}
          defaultValue={valueEn}
          maxLength={max}
          rows={rows}
        />
      </AdminField>
    </div>
  );
}

export function AboutPageForm({
  action,
  initial,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial: AboutContent;
}) {
  const [state, formAction] = useActionState(action, {});
  const [values, setValues] = useState<Row[]>(() =>
    initial.values.map((v) => ({ ...v, _id: crypto.randomUUID() })),
  );

  return (
    <form action={formAction} className="max-w-4xl space-y-6">
      <FormAlert state={state} />
      {state.fieldErrors && (
        <ul className="list-disc rounded-xl bg-destructive/10 p-3 pl-8 text-sm text-destructive">
          {Object.entries(state.fieldErrors).flatMap(([k, v]) =>
            (v ?? []).map((m) => <li key={k + m}>{m}</li>),
          )}
        </ul>
      )}

      <FormSection title="Танилцуулга" description="Хуудасны дээд хэсэгт гарчгийн доор харагдана.">
        <Bilingual
          id="intro"
          label="Танилцуулга"
          value={initial.intro}
          valueEn={initial.introEn}
          max={1000}
        />
      </FormSection>

      <FormSection title="Бидний түүх">
        {!initial.historyPublished && <DraftNotice />}
        <Bilingual
          id="history"
          label="Түүх"
          value={initial.history}
          valueEn={initial.historyEn}
          max={5000}
          rows={7}
          hint="Шинэ догол мөр: хоосон мөр үлдээнэ."
        />
        <Publish name="historyPublished" defaultChecked={initial.historyPublished} />
      </FormSection>

      <FormSection title="Эрхэм зорилго">
        <Bilingual
          id="mission"
          label="Эрхэм зорилго"
          value={initial.mission}
          valueEn={initial.missionEn}
          max={1000}
        />
      </FormSection>

      <FormSection title="Үнэт зүйлс" description="Хоосон бол энэ хэсэг харагдахгүй.">
        <ListEditor
          items={values}
          onChange={setValues}
          getKey={(v) => v._id}
          max={8}
          addLabel="Үнэт зүйл нэмэх"
          create={() => ({
            _id: crypto.randomUUID(),
            title: "",
            titleEn: "",
            body: "",
            bodyEn: "",
          })}
          itemLabel={(v) => v.title || "Шинэ үнэт зүйл"}
          renderItem={(v, update, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Нэр" htmlFor={`value-title-${i}`} required>
                <Input
                  id={`value-title-${i}`}
                  value={v.title}
                  maxLength={80}
                  onChange={(e) => update({ title: e.target.value })}
                />
              </AdminField>
              <AdminField label="Title (English)" htmlFor={`value-titleEn-${i}`}>
                <Input
                  id={`value-titleEn-${i}`}
                  value={v.titleEn}
                  maxLength={80}
                  onChange={(e) => update({ titleEn: e.target.value })}
                />
              </AdminField>
              <AdminField label="Тайлбар" htmlFor={`value-body-${i}`}>
                <Input
                  id={`value-body-${i}`}
                  value={v.body}
                  maxLength={300}
                  onChange={(e) => update({ body: e.target.value })}
                />
              </AdminField>
              <AdminField label="Description (English)" htmlFor={`value-bodyEn-${i}`}>
                <Input
                  id={`value-bodyEn-${i}`}
                  value={v.bodyEn}
                  maxLength={300}
                  onChange={(e) => update({ bodyEn: e.target.value })}
                />
              </AdminField>
            </div>
          )}
        />
        <input
          type="hidden"
          name="values"
          value={JSON.stringify(values.map(({ _id, ...v }) => (void _id, v)))}
        />
      </FormSection>

      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        «Бидний хийдэг ажил» хэсэг нь Арга хэмжээ доторх үйл ажиллагаануудаас (Нөлөөлөл, Боловсрол,
        Хандив чиглэлээр) автоматаар бүрдэнэ.
      </p>

      <SubmitButton />
    </form>
  );
}
