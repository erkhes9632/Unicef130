/**
 * Icon for a headline stat, chosen from what it measures (labels are admin text in mn or en),
 * so reordering stats in the admin never puts the wrong icon on a number.
 */
export type StatKind = "money" | "hours" | "members" | "reach" | "events" | "other";

export function statKind(label: string, value: string): StatKind {
  const l = label.toLocaleLowerCase();
  if (/₮|mnt|\$/i.test(value) || /хандив|donat|fund|raised/.test(l)) return "money";
  if (/цаг|hour/.test(l)) return "hours";
  if (/гишүүн|member/.test(l)) return "members";
  if (/хүрсэн|хүн|reach|people|children|хүүхэд/.test(l)) return "reach";
  if (/арга хэмжээ|үйл ажиллагаа|event|activit/.test(l)) return "events";
  return "other";
}
