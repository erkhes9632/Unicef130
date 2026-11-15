/**
 * Avatar letters from the given name, not the patronymic initial:
 * "Д.Цэцэг" → "Ц", "Б.Бат-Эрдэнэ" → "БЭ", "D. Tsetseg" → "T", "Ану" → "А".
 */
export function initials(name: string) {
  const given = name.replace(/^\s*[^\s.]{1,3}\.\s*/u, "").trim() || name.trim();
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase())
    .join("");
}
