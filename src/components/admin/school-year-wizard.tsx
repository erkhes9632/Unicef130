"use client";

import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/admin/action-state";
import { displayYear } from "@/lib/school-year";
import { cn } from "@/lib/utils";
import { AdminField, NativeSelect } from "./form";

type Person = { id: string; name: string; className: string };
type PrevLeader = {
  memberId: string;
  name: string;
  className: string;
  position: string;
  positionEn: string;
};
type Leader = {
  key: string;
  memberId: string | null;
  name: string;
  className: string;
  position: string;
  positionEn: string;
  showPublicly: boolean;
};
type Result = ActionState & {
  summary?: { year: string; leaders: number; members: number; created: number };
};

const STEPS = ["Жил", "Удирдлага", "Гишүүд", "Батлах"] as const;

/**
 * The «Шинэ хичээлийн жил эхлүүлэх» steps, all in the browser until the last click (one Server
 * Action). Names stay hidden unless «Нийтэд харуулах» is ticked together with the consent box.
 */
export function SchoolYearWizard({
  from,
  to,
  current,
  leaders: prevLeaders,
  members: prevMembers,
  people,
  start,
}: {
  /** The latest year with a team (null: none yet). */
  from: string | null;
  /** The year this wizard creates. */
  to: string;
  current: string;
  leaders: PrevLeader[];
  members: Person[];
  /** Everyone, to pick an existing person as a leader. */
  people: Person[];
  start: (input: unknown) => Promise<Result>;
}) {
  const [step, setStep] = useState(0);
  const [kept, setKept] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Record<string, string>>(() =>
    Object.fromEntries(prevLeaders.map((l) => [l.memberId, l.position])),
  );
  const [publicIds, setPublicIds] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState<Leader[]>([]);
  const [pick, setPick] = useState("");
  const [draft, setDraft] = useState({ name: "", className: "", position: "" });
  const [copy, setCopy] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, run] = useTransition();

  const leaders: Leader[] = [
    ...prevLeaders
      .filter((l) => kept[l.memberId])
      .map((l) => ({
        key: l.memberId,
        memberId: l.memberId,
        name: l.name,
        className: l.className,
        position: positions[l.memberId] ?? l.position,
        positionEn: positions[l.memberId] === l.position ? l.positionEn : "",
        showPublicly: !!publicIds[l.memberId],
      })),
    ...extra,
  ];
  const chosenIds = new Set(leaders.flatMap((l) => (l.memberId ? [l.memberId] : [])));
  const anyPublic = leaders.some((l) => l.showPublicly);
  const leadersValid = leaders.every((l) => l.position.trim() && (l.memberId || l.name.trim()));
  const copyList = prevMembers.filter((m) => !chosenIds.has(m.id));
  const shownMembers = filter
    ? copyList.filter((m) => m.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
    : copyList;
  const copyCount = copyList.filter((m) => copy.has(m.id)).length;

  const addExisting = () => {
    const p = people.find((x) => x.id === pick);
    if (!p || chosenIds.has(p.id)) return;
    setExtra((list) => [
      ...list,
      {
        key: p.id,
        memberId: p.id,
        name: p.name,
        className: p.className,
        position: "",
        positionEn: "",
        showPublicly: false,
      },
    ]);
    setPick("");
  };
  const addNew = () => {
    if (!draft.name.trim() || !draft.position.trim()) return;
    setExtra((list) => [
      ...list,
      {
        key: `new-${crypto.randomUUID()}`,
        memberId: null,
        name: draft.name.trim(),
        className: draft.className.trim(),
        position: draft.position.trim(),
        positionEn: "",
        showPublicly: false,
      },
    ]);
    setDraft({ name: "", className: "", position: "" });
  };
  const updateExtra = (key: string, patch: Partial<Leader>) =>
    setExtra((list) => list.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = () =>
    run(async () => {
      const res = await start({
        year: to,
        leaders: leaders.map((l) => ({
          memberId: l.memberId,
          name: l.name,
          className: l.className,
          position: l.position,
          positionEn: l.positionEn,
          showPublicly: l.showPublicly,
        })),
        copyMemberIds: [...copy].filter((id) => !chosenIds.has(id)),
        consent: anyPublic && consent,
      });
      setResult(res);
    });

  if (result?.ok && result.summary) {
    const s = result.summary;
    return (
      <section
        aria-labelledby="wizard-done"
        className="max-w-2xl space-y-4 rounded-2xl bg-brand-green-soft p-6 ring-1 ring-border"
      >
        <h2 id="wizard-done" className="flex items-center gap-2 text-xl font-extrabold">
          <Check className="size-6" aria-hidden="true" /> {displayYear(s.year)} хичээлийн жил
          эхэллээ
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Удирдлага: {s.leaders}</li>
          <li>Хуулсан гишүүн: {s.members}</li>
          {s.created > 0 && <li>Шинээр нэмсэн хүн: {s.created}</li>}
          {from && <li>{displayYear(from)} оны мэдээлэл «Өмнөх жилүүд» хэсэгт хэвээр үлдлээ.</li>}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="/members" target="_blank" rel="noopener noreferrer">
              Нийтийн хуудсыг харах <ExternalLink />
              <span className="sr-only">(шинэ цонхонд нээгдэнэ)</span>
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/members">Гишүүд рүү</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Алхам">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-semibold ring-1 ring-border",
              i === step && "bg-brand-cyan text-brand-ink ring-brand-cyan",
              i < step && "bg-muted",
            )}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section
          aria-labelledby="step-year"
          className="space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border"
        >
          <h2 id="step-year" className="text-lg font-bold">
            Хичээлийн жил
          </h2>
          <p className="text-2xl font-extrabold" data-testid="wizard-years">
            Одоогийн жил: {from ? displayYear(from) : "—"} → Шинэ жил: {displayYear(to)}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Шинэ жилийн удирдлагыг сонгоно (одоогийнхоос эсвэл шинэ хүн).</li>
            <li>Хүсвэл өмнөх жилийн гишүүдийг хуулна — анхнаасаа хэнийг ч хуулахгүй.</li>
            <li>
              Юу ч устгахгүй: {from ? displayYear(from) : "өмнөх"} оны мэдээлэл түүх болж үлдэнэ.
            </li>
            {to > current && (
              <li>
                «Одоогийн хичээлийн жил» {displayYear(to)} болно (шинэ жилийг эрт эхлүүлж байна).
              </li>
            )}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section
          aria-labelledby="step-leaders"
          className="space-y-5 rounded-2xl bg-card p-6 ring-1 ring-border"
        >
          <h2 id="step-leaders" className="text-lg font-bold">
            {displayYear(to)} оны удирдлага
          </h2>
          {prevLeaders.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-semibold">
                {from && displayYear(from)} оны удирдлага — үлдээх хүнээ сонгоно уу
              </legend>
              {prevLeaders.map((l) => (
                <div
                  key={l.memberId}
                  className="flex flex-wrap items-center gap-3 rounded-xl p-3 ring-1 ring-border"
                >
                  <Checkbox
                    id={`keep-${l.memberId}`}
                    checked={!!kept[l.memberId]}
                    onCheckedChange={(v) => setKept((k) => ({ ...k, [l.memberId]: v === true }))}
                  />
                  <Label htmlFor={`keep-${l.memberId}`} className="min-w-40 flex-1 font-semibold">
                    {l.name}
                    {l.className && (
                      <span className="font-normal text-muted-foreground"> · {l.className}</span>
                    )}
                  </Label>
                  {kept[l.memberId] && (
                    <>
                      <Input
                        aria-label={`Албан тушаал: ${l.name}`}
                        value={positions[l.memberId] ?? ""}
                        onChange={(e) =>
                          setPositions((p) => ({ ...p, [l.memberId]: e.target.value }))
                        }
                        maxLength={100}
                        className="max-w-56"
                      />
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!publicIds[l.memberId]}
                          onCheckedChange={(v) =>
                            setPublicIds((p) => ({ ...p, [l.memberId]: v === true }))
                          }
                        />
                        Нийтэд харуулах
                      </label>
                    </>
                  )}
                </div>
              ))}
            </fieldset>
          )}

          {extra.length > 0 && (
            <ul className="space-y-2">
              {extra.map((l) => (
                <li
                  key={l.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-cyan-soft p-3"
                >
                  <span className="min-w-40 flex-1 font-semibold">
                    {l.name}
                    <span className="font-normal text-muted-foreground">
                      {l.className && ` · ${l.className}`}
                      {l.memberId ? "" : " · шинэ хүн"}
                    </span>
                  </span>
                  <Input
                    aria-label={`Албан тушаал: ${l.name}`}
                    placeholder="Албан тушаал"
                    value={l.position}
                    onChange={(e) => updateExtra(l.key, { position: e.target.value })}
                    maxLength={100}
                    className="max-w-56"
                  />
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <Checkbox
                      checked={l.showPublicly}
                      onCheckedChange={(v) => updateExtra(l.key, { showPublicly: v === true })}
                    />
                    Нийтэд харуулах
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Хасах: ${l.name}`}
                    onClick={() => setExtra((list) => list.filter((x) => x.key !== l.key))}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-4 border-t pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <AdminField label="Бүртгэлтэй хүнээс сонгох" htmlFor="pick-person">
              <NativeSelect id="pick-person" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">— сонгох —</option>
                {people
                  .filter((p) => !chosenIds.has(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.className ? ` (${p.className})` : ""}
                    </option>
                  ))}
              </NativeSelect>
            </AdminField>
            <Button type="button" variant="outline" disabled={!pick} onClick={addExisting}>
              <Plus /> Нэмэх
            </Button>
          </div>

          <fieldset className="grid gap-4 border-t pt-4 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold sm:col-span-3">Шинэ хүн нэмэх</legend>
            <AdminField label="Нэр" htmlFor="new-name">
              <Input
                id="new-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={100}
                placeholder="Б. Анужин"
              />
            </AdminField>
            <AdminField label="Анги" htmlFor="new-class">
              <Input
                id="new-class"
                value={draft.className}
                onChange={(e) => setDraft((d) => ({ ...d, className: e.target.value }))}
                maxLength={20}
              />
            </AdminField>
            <AdminField label="Албан тушаал" htmlFor="new-position">
              <Input
                id="new-position"
                value={draft.position}
                onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))}
                maxLength={100}
                placeholder="Ерөнхийлөгч"
              />
            </AdminField>
            <div className="sm:col-span-3">
              <Button
                type="button"
                variant="outline"
                disabled={!draft.name.trim() || !draft.position.trim()}
                onClick={addNew}
              >
                <Plus /> Шинэ хүн нэмэх
              </Button>
            </div>
          </fieldset>

          {anyPublic && (
            <div className="flex items-start gap-2 rounded-xl bg-brand-gold-soft p-3">
              <Checkbox
                id="wizard-consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="wizard-consent" className="leading-snug">
                «Нийтэд харуулах» гэж сонгосон сурагчдын нэрийг сайтад нийтлэхэд эцэг эх / асран
                хамгаалагч нь зөвшөөрсөн.
              </Label>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Сонгосон: {leaders.length}. Нэр анхнаасаа нийтэд харагдахгүй (зөвхөн албан тушаал).
          </p>
        </section>
      )}

      {step === 2 && (
        <section
          aria-labelledby="step-members"
          className="space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border"
        >
          <h2 id="step-members" className="text-lg font-bold">
            Гишүүдийг хуулах (заавал биш)
          </h2>
          {copyList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Хуулах гишүүн алга.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {from && displayYear(from)} оны гишүүдээс {displayYear(to)} онд үргэлжлүүлэх
                хүмүүсээ сонгоно уу. Анхнаасаа хэнийг ч хуулахгүй.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <AdminField label="Хайх" htmlFor="member-filter">
                  <Input
                    id="member-filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-64"
                  />
                </AdminField>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCopy((c) => new Set([...c, ...shownMembers.map((m) => m.id)]))}
                >
                  Бүгдийг сонгох
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCopy(new Set())}>
                  Цэвэрлэх
                </Button>
              </div>
              <ul className="grid gap-1 sm:grid-cols-2">
                {shownMembers.map((m) => (
                  <li key={m.id}>
                    <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted">
                      <Checkbox
                        checked={copy.has(m.id)}
                        onCheckedChange={(v) =>
                          setCopy((c) => {
                            const next = new Set(c);
                            if (v === true) next.add(m.id);
                            else next.delete(m.id);
                            return next;
                          })
                        }
                      />
                      {m.name}
                      {m.className && (
                        <span className="text-xs text-muted-foreground">{m.className}</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-sm font-semibold">Хуулах: {copyCount}</p>
        </section>
      )}

      {step === 3 && (
        <section
          aria-labelledby="step-confirm"
          className="space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border"
        >
          <h2 id="step-confirm" className="text-lg font-bold">
            Батлах
          </h2>
          <dl className="grid gap-2 sm:grid-cols-[12rem_1fr]">
            <dt className="text-muted-foreground">Шинэ жил</dt>
            <dd className="font-semibold">{displayYear(to)}</dd>
            <dt className="text-muted-foreground">Удирдлага</dt>
            <dd>
              {leaders.length === 0
                ? "—"
                : leaders.map((l) => `${l.name} (${l.position})`).join(", ")}
            </dd>
            <dt className="text-muted-foreground">Хуулах гишүүн</dt>
            <dd>{copyCount}</dd>
            <dt className="text-muted-foreground">Нийтэд нэр нь харагдах</dt>
            <dd>{anyPublic && consent ? leaders.filter((l) => l.showPublicly).length : 0}</dd>
          </dl>
          <p className="rounded-xl bg-muted p-3 text-sm">
            Юу ч устгахгүй. {from ? `${displayYear(from)} оны` : "Өмнөх"} мэдээлэл «Өмнөх жилүүд»
            хэсэгт үлдэнэ.
          </p>
          {result && !result.ok && (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {result.message}
            </p>
          )}
        </section>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft /> Буцах
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            disabled={step === 1 && (!leadersValid || (anyPublic && !consent))}
            onClick={() => setStep((s) => s + 1)}
          >
            Үргэлжлүүлэх <ArrowRight />
          </Button>
        ) : (
          <Button type="button" disabled={pending} onClick={submit}>
            {pending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
            {displayYear(to)} хичээлийн жилийг эхлүүлэх
          </Button>
        )}
      </div>
    </div>
  );
}
