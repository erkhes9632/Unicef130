"use client";

import { useActionState, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/admin/action-state";
import {
  AdminField,
  FormAlert,
  FormSection,
  keepValuesOnSubmit,
  NativeSelect,
  SubmitButton,
} from "./form";
import { ImageField } from "./image-field";

type MemberFormValues = {
  name: string;
  nameEn: string | null;
  role: string;
  roleEn: string | null;
  className: string;
  group: "leadership" | "member";
  photoUrl: string | null;
  showPhoto: boolean;
  active: boolean;
  showPublicly: boolean;
  volunteerHours: number | null;
  schoolYear: string | null;
  team: string;
  email: string | null;
  /** Linked account (approved applicant or linked by an admin). */
  hasAccount?: boolean;
};

export function MemberForm({
  action,
  initial,
  year,
  teams = [],
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial?: MemberFormValues;
  /** The school year whose role / position / «Нийтэд харуулах» this form edits. */
  year: string;
  /** Existing team names, offered as suggestions. */
  teams?: string[];
}) {
  const yearLabel = year.replace("-", "–");
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const wasPublic = initial?.showPublicly ?? false;
  const [showPublic, setShowPublic] = useState(wasPublic);
  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      data-guard
      className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_18rem]"
    >
      <div className="space-y-6">
        <FormAlert state={state} />
        <input type="hidden" name="schoolYear" value={year} />
        <FormSection
          title={`${yearLabel} хичээлийн жил`}
          description="Энэ жилийн үүрэг, бүлэг, нийтэд харуулах эсэх. Бусад жилийн мэдээлэлд нөлөөлөхгүй."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Бүлэг" htmlFor="group" errors={e.group}>
              <NativeSelect id="group" name="group" defaultValue={initial?.group ?? "member"}>
                <option value="leadership">Удирдлага</option>
                <option value="member">Гишүүн</option>
              </NativeSelect>
            </AdminField>
            <AdminField
              label="Албан тушаал / үүрэг"
              htmlFor="role"
              required
              errors={e.role}
              hint="Жишээ: Ерөнхийлөгч, Гишүүн"
            >
              <Input
                id="role"
                name="role"
                defaultValue={initial?.role ?? "Гишүүн"}
                required
                maxLength={100}
              />
            </AdminField>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="showPublicly"
              name="showPublicly"
              checked={showPublic}
              onCheckedChange={(v) => setShowPublic(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="showPublicly" className="leading-snug">
              Нэрийг нийтэд харуулах ({yearLabel})
              <span className="block font-normal text-muted-foreground">
                Удирдлага: «Бидний тухай» болон «Гишүүд» хуудасны удирдлагын хэсэгт. Гишүүн:
                «Гишүүд» хуудасны тухайн жилийн гишүүдийн жагсаалтад.
              </span>
            </Label>
          </div>
          {showPublic && !wasPublic && (
            <div className="flex items-start gap-2 rounded-xl bg-brand-gold-soft p-3">
              <Checkbox id="consent" name="consent" className="mt-0.5" required />
              <Label htmlFor="consent" className="leading-snug">
                Энэ сурагчийн нэрийг сайтад нийтлэхэд эцэг эх / асран хамгаалагч зөвшөөрсөн.
                {e.consent && <span className="block text-destructive">{e.consent[0]}</span>}
              </Label>
            </div>
          )}
        </FormSection>
        <FormSection title="Хүний мэдээлэл">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Нэр" htmlFor="name" required errors={e.name} hint="Жишээ: Б. Анужин">
              <Input id="name" name="name" defaultValue={initial?.name} required maxLength={100} />
            </AdminField>
            <AdminField
              label="Анги"
              htmlFor="className"
              errors={e.className}
              hint="10А, Багш гэх мэт. Мэдэхгүй бол хоосон."
            >
              <Input
                id="className"
                name="className"
                defaultValue={initial?.className}
                maxLength={20}
              />
            </AdminField>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="active" name="active" defaultChecked={initial?.active ?? true} />
            <Label htmlFor="active">Идэвхтэй (сайт дээрх жагсаалтад орно)</Label>
          </div>
          <AdminField
            label="Сайн дурын цаг"
            htmlFor="volunteerHours"
            hint={`Тайлангаас оруулсан цаг (${(initial?.schoolYear ?? year).replace("-", "–")}). Зөвхөн админд харагдана; бусад цаг «Сайн дурын цаг» хэсгээс жил бүрээр нэмэгдэнэ.`}
            errors={e.volunteerHours}
          >
            <Input
              id="volunteerHours"
              name="volunteerHours"
              type="number"
              min={0}
              max={100000}
              defaultValue={initial?.volunteerHours ?? ""}
              className="max-w-32"
            />
          </AdminField>
          <AdminField label="Баг" htmlFor="team" errors={e.team}>
            <Input
              id="team"
              name="team"
              defaultValue={initial?.team ?? ""}
              maxLength={60}
              className="max-w-64"
              list="team-options"
            />
            <datalist id="team-options">
              {teams.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </AdminField>
          <AdminField
            label="И-мэйл (зөвхөн админд)"
            htmlFor="email"
            hint={
              initial?.hasAccount
                ? "Энэ гишүүн сайтын бүртгэлтэй холбогдсон."
                : "Гишүүн энэ и-мэйлээр нэвтэрвэл Хэрэглэгчид хэсэгт «Гишүүнтэй холбох» товч гарна (автоматаар холбогдохгүй)."
            }
            errors={e.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              maxLength={254}
              className="max-w-80"
            />
          </AdminField>
        </FormSection>
        <FormSection title="English (заавал биш)">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Name" htmlFor="nameEn" errors={e.nameEn}>
              <Input
                id="nameEn"
                name="nameEn"
                defaultValue={initial?.nameEn ?? ""}
                maxLength={100}
              />
            </AdminField>
            <AdminField label="Role" htmlFor="roleEn" errors={e.roleEn}>
              <Input
                id="roleEn"
                name="roleEn"
                defaultValue={initial?.roleEn ?? ""}
                maxLength={100}
              />
            </AdminField>
          </div>
        </FormSection>
      </div>
      <div className="space-y-6">
        <FormSection
          title="Зураг"
          description="Насанд хүрээгүй хүүхдийн зургийг зөвхөн зөвшөөрөлтэй үед нийтэлнэ."
        >
          <ImageField
            id="photoUrl"
            name="photoUrl"
            defaultValue={initial?.photoUrl}
            kind="members"
          />
          <div className="flex items-start gap-2">
            <Checkbox
              id="showPhoto"
              name="showPhoto"
              defaultChecked={initial?.showPhoto ?? false}
              className="mt-0.5"
            />
            <Label htmlFor="showPhoto" className="leading-snug">
              Зургийг сайт дээр харуулах (эцэг эх/асран хамгаалагчийн зөвшөөрөл авсан)
            </Label>
          </div>
        </FormSection>
        <SubmitButton className="w-full" />
      </div>
    </form>
  );
}
