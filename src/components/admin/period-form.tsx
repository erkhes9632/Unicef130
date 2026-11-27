"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RecruitmentQuestion } from "@/db/schema";
import type { ActionState } from "@/lib/admin/action-state";
import { buildClassList } from "@/lib/recruitment/logic";
import { schoolYearOf } from "@/lib/school-year";
import {
  AdminField,
  FormAlert,
  FormSection,
  keepValuesOnSubmit,
  NativeSelect,
  StickyActions,
  SubmitButton,
} from "./form";
import { ListEditor } from "./list-editor";

/** Placeholder: the school year of the day the page was opened. */
const EXAMPLE_YEAR = schoolYearOf(Date.now());

type PeriodFormValues = {
  name: string;
  nameEn: string | null;
  schoolYear: string;
  /** datetime-local values in Ulaanbaatar time */
  opensAt: string;
  closesAt: string;
  capacity: number | null;
  whenFull: "close" | "waitlist";
  classes: string[];
  introText: string;
  introTextEn: string | null;
  closedMessage: string;
  closedMessageEn: string | null;
  questions: RecruitmentQuestion[];
  showBanner: boolean;
};

type Row = RecruitmentQuestion & { _id: string };
const typeLabels: Record<RecruitmentQuestion["type"], string> = {
  text: "Бичгээр хариулах",
  choice: "Нэгийг сонгох",
  checkbox: "Чагтлах (тийм/үгүй)",
};

export function PeriodForm({
  action,
  initial,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial?: PeriodFormValues;
}) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const [classes, setClasses] = useState((initial?.classes ?? []).join(" "));
  const [questions, setQuestions] = useState<Row[]>(() =>
    (initial?.questions ?? []).map((q) => ({ ...q, _id: crypto.randomUUID() })),
  );
  const allErrors = Object.values(e).flatMap((v) => v ?? []);

  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      data-guard
      className="grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="space-y-6">
        <FormAlert state={state} />
        {allErrors.length > 0 && (
          <ul className="list-disc rounded-xl bg-destructive/10 p-3 pl-8 text-sm text-destructive">
            {allErrors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        <FormSection title="Үндсэн мэдээлэл">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Нэр" htmlFor="name" required hint="Жишээ: 2026–2027 намрын элсэлт">
              <Input id="name" name="name" defaultValue={initial?.name} required maxLength={120} />
            </AdminField>
            <AdminField label="Нэр (англи)" htmlFor="nameEn">
              <Input
                id="nameEn"
                name="nameEn"
                defaultValue={initial?.nameEn ?? ""}
                maxLength={120}
              />
            </AdminField>
          </div>
          <AdminField
            label="Хичээлийн жил"
            htmlFor="schoolYear"
            required
            hint="Элссэн сурагчид энэ жилийн гишүүн болж бүртгэгдэнэ."
          >
            <Input
              id="schoolYear"
              name="schoolYear"
              defaultValue={initial?.schoolYear}
              placeholder={EXAMPLE_YEAR}
              required
              className="max-w-40"
            />
          </AdminField>
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminField label="Танилцуулга (маягтын дээр)" htmlFor="introText">
              <Textarea
                id="introText"
                name="introText"
                rows={3}
                maxLength={1500}
                defaultValue={initial?.introText}
              />
            </AdminField>
            <AdminField label="Танилцуулга (англи)" htmlFor="introTextEn">
              <Textarea
                id="introTextEn"
                name="introTextEn"
                rows={3}
                maxLength={1500}
                defaultValue={initial?.introTextEn ?? ""}
              />
            </AdminField>
            <AdminField
              label="Хаалттай үед харагдах текст"
              htmlFor="closedMessage"
              hint="Энэ элсэлт хаагдсаны дараа (эсвэл нээгдэхээс өмнө) /join хуудсанд гарна."
            >
              <Textarea
                id="closedMessage"
                name="closedMessage"
                rows={2}
                maxLength={500}
                defaultValue={initial?.closedMessage}
              />
            </AdminField>
            <AdminField label="Хаалттай үеийн мэдэгдэл (англи)" htmlFor="closedMessageEn">
              <Textarea
                id="closedMessageEn"
                name="closedMessageEn"
                rows={2}
                maxLength={500}
                defaultValue={initial?.closedMessageEn ?? ""}
              />
            </AdminField>
          </div>
        </FormSection>

        <FormSection
          title="Ангиуд"
          description="Маягтын «Анги» сонголтод гарах ангиуд (зайгаар тусгаарлана). Хоосон бол сурагч ангиа өөрөө бичнэ."
        >
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["6–12 анги, а–г", () => buildClassList(6, 12, ["а", "б", "в", "г"])],
                ["9–12 анги, а–г", () => buildClassList(9, 12, ["а", "б", "в", "г"])],
                ["6–12 анги, а–е", () => buildClassList(6, 12, ["а", "б", "в", "г", "д", "е"])],
              ] as const
            ).map(([label, make]) => (
              <Button
                key={label}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setClasses(make().join(" "))}
              >
                <Plus /> {label}
              </Button>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => setClasses("")}>
              <Trash2 /> Цэвэрлэх
            </Button>
          </div>
          <Textarea
            name="classes"
            aria-label="Ангиудын жагсаалт"
            rows={3}
            value={classes}
            onChange={(ev) => setClasses(ev.target.value)}
            placeholder="6а 6б 6в 7а …"
          />
        </FormSection>

        <FormSection
          title="Нэмэлт асуултууд"
          description="Үндсэн талбаруудаас (нэр, анги, утас, шалтгаан) гадна асуух зүйлс. Насанд хүрээгүй сурагчдаас зөвхөн хэрэгтэй мэдээллийг л асуугаарай."
        >
          <ListEditor<Row>
            items={questions}
            onChange={setQuestions}
            getKey={(q) => q._id}
            max={10}
            addLabel="Асуулт нэмэх"
            emptyText="Нэмэлт асуулт алга."
            create={() => ({
              _id: crypto.randomUUID(),
              id: `q-${crypto.randomUUID().slice(0, 8)}`,
              type: "text",
              label: "",
              labelEn: "",
              options: [],
              required: false,
            })}
            itemLabel={(q) => q.label || "Шинэ асуулт"}
            renderItem={(q, update, i) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Асуулт" htmlFor={`q-label-${i}`} required>
                  <Input
                    id={`q-label-${i}`}
                    value={q.label}
                    maxLength={200}
                    onChange={(ev) => update({ label: ev.target.value })}
                  />
                </AdminField>
                <AdminField label="Асуулт (англи)" htmlFor={`q-labelEn-${i}`}>
                  <Input
                    id={`q-labelEn-${i}`}
                    value={q.labelEn}
                    maxLength={200}
                    onChange={(ev) => update({ labelEn: ev.target.value })}
                  />
                </AdminField>
                <AdminField label="Төрөл" htmlFor={`q-type-${i}`}>
                  <NativeSelect
                    id={`q-type-${i}`}
                    value={q.type}
                    onChange={(ev) =>
                      update({ type: ev.target.value as RecruitmentQuestion["type"] })
                    }
                  >
                    {Object.entries(typeLabels).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </NativeSelect>
                </AdminField>
                <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--brand-cyan)]"
                    checked={q.required}
                    onChange={(ev) => update({ required: ev.target.checked })}
                  />
                  Заавал хариулах
                </label>
                {q.type === "choice" && (
                  <AdminField
                    label="Сонголтууд (мөр бүрт нэг; англи хувилбарыг « | »-ийн ард)"
                    htmlFor={`q-options-${i}`}
                    className="sm:col-span-2"
                    hint="Жишээ: Найзаасаа | From a friend"
                  >
                    <Textarea
                      id={`q-options-${i}`}
                      rows={3}
                      defaultValue={q.options
                        .map((o) => (o.labelEn ? `${o.label} | ${o.labelEn}` : o.label))
                        .join("\n")}
                      onChange={(ev) =>
                        update({
                          options: ev.target.value
                            .split("\n")
                            .map((line) => {
                              const [label = "", labelEn = ""] = line.split("|");
                              return { label: label.trim(), labelEn: labelEn.trim() };
                            })
                            .filter((o) => o.label),
                        })
                      }
                    />
                  </AdminField>
                )}
              </div>
            )}
          />
          <input
            type="hidden"
            name="questions"
            value={JSON.stringify(questions.map(({ _id, ...q }) => (void _id, q)))}
          />
        </FormSection>
      </div>

      <div className="space-y-6">
        <FormSection title="Хугацаа" description="Улаанбаатарын цагаар">
          <AdminField label="Нээгдэх" htmlFor="opensAt" required errors={e.opensAt}>
            <Input
              id="opensAt"
              name="opensAt"
              type="datetime-local"
              defaultValue={initial?.opensAt}
              required
            />
          </AdminField>
          <AdminField label="Хаагдах" htmlFor="closesAt" required errors={e.closesAt}>
            <Input
              id="closesAt"
              name="closesAt"
              type="datetime-local"
              defaultValue={initial?.closesAt}
              required
            />
          </AdminField>
          <label className="flex items-start gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="showBanner"
              defaultChecked={initial?.showBanner ?? true}
              className="mt-0.5 size-4 accent-[var(--brand-cyan)]"
            />
            Нээлттэй үед сайтын дээд талд «Элсэлт нээлттэй» зар харуулах
          </label>
        </FormSection>

        <FormSection title="Багтаамж">
          <AdminField
            label="Хүлээн авах өргөдлийн тоо"
            htmlFor="capacity"
            hint="Хоосон бол хязгааргүй. Спам, татгалзсан өргөдөл тоонд орохгүй."
          >
            <Input
              id="capacity"
              name="capacity"
              inputMode="numeric"
              defaultValue={initial?.capacity ?? ""}
              className="max-w-32"
            />
          </AdminField>
          <AdminField label="Дүүрсэн үед" htmlFor="whenFull">
            <NativeSelect
              id="whenFull"
              name="whenFull"
              defaultValue={initial?.whenFull ?? "waitlist"}
            >
              <option value="waitlist">Хүлээлгийн жагсаалтад бүртгэх</option>
              <option value="close">Өргөдөл авахаа зогсоох</option>
            </NativeSelect>
          </AdminField>
        </FormSection>
      </div>
      <StickyActions className="lg:col-span-2">
        <SubmitButton />
      </StickyActions>
    </form>
  );
}
