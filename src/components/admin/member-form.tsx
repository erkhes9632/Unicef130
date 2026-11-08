"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/admin/action-state";
import { AdminField, FormAlert, FormSection, NativeSelect, SubmitButton } from "./form";
import { ImageField } from "./image-field";

export type MemberFormValues = {
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
};

export function MemberForm({
  action,
  initial,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  initial?: MemberFormValues;
}) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_18rem]">
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
              required
              errors={e.className}
              hint="10А, Багш гэх мэт"
            >
              <Input
                id="className"
                name="className"
                defaultValue={initial?.className}
                required
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
            <Label htmlFor="active">Идэвхтэй (сайт дээр харагдана)</Label>
          </div>
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
          <ImageField id="photoUrl" name="photoUrl" defaultValue={initial?.photoUrl} />
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
