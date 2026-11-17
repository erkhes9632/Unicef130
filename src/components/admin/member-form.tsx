"use client";

import { useActionState } from "react";
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
  sortOrder: number;
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
  teams = [],
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial?: MemberFormValues;
  /** Existing team names, offered as suggestions. */
  teams?: string[];
}) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      data-guard
      className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_18rem]"
    >
      <div className="space-y-6">
        <FormAlert state={state} />
        <FormSection title="Мэдээлэл">
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
            <AdminField label="Үүрэг" htmlFor="role" required errors={e.role}>
              <Input
                id="role"
                name="role"
                defaultValue={initial?.role ?? "Гишүүн"}
                required
                maxLength={100}
              />
            </AdminField>
            <AdminField label="Бүлэг" htmlFor="group" errors={e.group}>
              <NativeSelect id="group" name="group" defaultValue={initial?.group ?? "member"}>
                <option value="leadership">Удирдлага</option>
                <option value="member">Гишүүн</option>
              </NativeSelect>
            </AdminField>
            <AdminField
              label="Эрэмбэ"
              htmlFor="sortOrder"
              hint="Бага тоо эхэнд харагдана"
              errors={e.sortOrder}
            >
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                max={10000}
                defaultValue={initial?.sortOrder ?? 100}
              />
            </AdminField>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="active" name="active" defaultChecked={initial?.active ?? true} />
            <Label htmlFor="active">Идэвхтэй гишүүн</Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="showPublicly"
              name="showPublicly"
              defaultChecked={initial?.showPublicly ?? false}
              className="mt-0.5"
            />
            <Label htmlFor="showPublicly" className="leading-snug">
              Нэрийг сайт дээр харуулах (насанд хүрээгүй бол эцэг эх/асран хамгаалагчийн зөвшөөрөл
              авсан)
            </Label>
          </div>
          <AdminField
            label="Хичээлийн жил"
            htmlFor="schoolYear"
            hint="Удирдлагын хувьд заавал: сайт дээр хамгийн сүүлийн жилийн удирдлага харагдана (жишээ: 2026-2027)."
            errors={e.schoolYear}
          >
            <Input
              id="schoolYear"
              name="schoolYear"
              defaultValue={initial?.schoolYear ?? ""}
              placeholder="2026-2027"
              className="max-w-40"
            />
          </AdminField>
          <AdminField
            label="Сайн дурын цаг"
            htmlFor="volunteerHours"
            hint="Зөвхөн админд харагдана; нийт цагийг тооцоход ашиглана. Сайт дээр хувь хүнийх харагдахгүй."
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
