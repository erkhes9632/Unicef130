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

/**
 * The given name of a display name in Mongolian order ("Овог Нэр", see `displayName`):
 * "Батын Анужин" → "Анужин", "Б. Анужин" → "Анужин", "Анужин" → "Анужин".
 */
export function givenName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .at(-1)
      ?.replace(/^[^\s.]{1,3}\./u, "") ?? ""
  );
}
