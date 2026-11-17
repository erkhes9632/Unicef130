"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useActionState, useId, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import { ConfirmAction } from "./confirm-action";
import { AdminField, FormAlert, keepValuesOnSubmit, SubmitButton } from "./form";

type FaqValues = {
  question: string;
  questionEn: string | null;
  answer: string;
  answerEn: string | null;
  published: boolean;
};

/** One question (new when `initial` is missing). Blank line in the answer = new paragraph. */
export function FaqForm({
  initial,
  save,
  remove,
  move,
}: {
  initial?: FaqValues;
  save: (prev: ActionState, data: FormData) => Promise<ActionState>;
  remove?: () => Promise<ActionState>;
  move?: (direction: "up" | "down") => Promise<ActionState>;
}) {
  // A new question remounts this form after saving, so the result is also shown as a toast.
  const [state, formAction] = useActionState(async (prev: ActionState, data: FormData) => {
    const res = await save(prev, data);
    if (res.ok) toast.success(res.message ?? "Хадгалагдлаа.");
    return res;
  }, {});
  const [pending, start] = useTransition();
  const e = state.fieldErrors ?? {};
  const uid = useId();
  const shift = (d: "up" | "down") =>
    start(async () => {
      const res = await move!(d);
      if (!res.ok && res.message) toast.error(res.message);
    });
  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border"
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <AdminField label="Асуулт" htmlFor={`${uid}-question`} required errors={e.question}>
          <Input
            id={`${uid}-question`}
            name="question"
            defaultValue={initial?.question}
            maxLength={200}
            required
          />
        </AdminField>
        <AdminField label="Question (English)" htmlFor={`${uid}-questionEn`} errors={e.questionEn}>
          <Input
            id={`${uid}-questionEn`}
            name="questionEn"
            defaultValue={initial?.questionEn ?? ""}
            maxLength={200}
          />
        </AdminField>
        <AdminField label="Хариулт" htmlFor={`${uid}-answer`} required errors={e.answer}>
          <Textarea
            id={`${uid}-answer`}
            name="answer"
            defaultValue={initial?.answer}
            rows={4}
            maxLength={3000}
            required
          />
        </AdminField>
        <AdminField label="Answer (English)" htmlFor={`${uid}-answerEn`} errors={e.answerEn}>
          <Textarea
            id={`${uid}-answerEn`}
            name="answerEn"
            defaultValue={initial?.answerEn ?? ""}
            rows={4}
            maxLength={3000}
          />
        </AdminField>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="mr-auto flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published ?? true}
            className="size-4 accent-[var(--brand-cyan)]"
          />
          Сайт дээр харуулах
        </label>
        {move && (
          <>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Дээш"
              disabled={pending}
              onClick={() => shift("up")}
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Доош"
              disabled={pending}
              onClick={() => shift("down")}
            >
              <ArrowDown />
            </Button>
          </>
        )}
        {remove && <ConfirmAction action={remove} description="Энэ асуултыг устгах уу?" />}
        <SubmitButton className="h-8 px-3 text-xs">{initial ? "Хадгалах" : "Нэмэх"}</SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}
