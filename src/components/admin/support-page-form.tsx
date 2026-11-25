"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/admin/action-state";
import { supportWays, type SupportContent, type SupportWay } from "@/lib/settings/types";
import { Bilingual } from "./about-page-form";
import { FormAlert, FormSection, keepValuesOnSubmit, StickyActions, SubmitButton } from "./form";

const wayNames: Record<SupportWay, string> = {
  volunteer: "Сайн дурын ажилтан болох",
  donateItems: "Эд зүйлсээр хандивлах",
  partner: "Хамтран ажиллах",
  share: "Мэдээлэл түгээх",
};

/** «Дэмжих» page text: each card has a title and a short text, in Mongolian and English. */
export function SupportPageForm({
  action,
  initial,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial: SupportContent;
}) {
  const [state, formAction] = useActionState(action, {});
  const pair = (id: string, title: string, v: SupportContent["donate"]) => (
    <FormSection key={id} title={title}>
      <Bilingual
        id={`${id}.title`}
        label="Гарчиг"
        value={v.title}
        valueEn={v.titleEn}
        max={80}
        rows={1}
      />
      <Bilingual id={`${id}.body`} label="Тайлбар" value={v.body} valueEn={v.bodyEn} max={400} />
    </FormSection>
  );
  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      data-guard
      className="max-w-4xl space-y-6"
    >
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
          max={300}
        />
      </FormSection>
      {supportWays.map((w) => pair(`ways.${w}`, `Карт: ${wayNames[w]}`, initial.ways[w]))}
      {pair("donate", "Мөнгөн хандивын хэсэг", initial.donate)}
      <StickyActions>
        <SubmitButton />
      </StickyActions>
    </form>
  );
}
