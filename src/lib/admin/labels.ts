/** Mongolian labels shared by admin server and client components. */
export const categoryOptions = [
  { value: "activity", label: "Үйл ажиллагаа" },
  { value: "volunteering", label: "Сайн дурын ажил" },
  { value: "rights", label: "Хүүхдийн эрх" },
  { value: "charity", label: "Хандив" },
  { value: "announcement", label: "Зарлал" },
] as const;

export const categoryLabel: Record<string, string> = Object.fromEntries(
  categoryOptions.map((c) => [c.value, c.label]),
);

export const memberGroupLabel = { leadership: "Удирдлага", member: "Гишүүн" } as const;

export const applicationStatusLabel = {
  new: "Шинэ",
  accepted: "Зөвшөөрсөн",
  rejected: "Татгалзсан",
} as const;

export const helpOptionLabel: Record<string, string> = {
  events: "Арга хэмжээ зохион байгуулах",
  reading: "Бага ангийнханд туслах",
  charity: "Хандивын аян",
  media: "Зураг, видео, сошиал",
  design: "Зураг, дизайн",
  other: "Бусад",
};
