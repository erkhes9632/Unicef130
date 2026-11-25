/** Description length search engines show in full. */
export const META_DESCRIPTION = { min: 70, max: 155 } as const;

/**
 * Search-result friendly description (70–155 characters): too short → the club name is added
 * (nothing invented); too long → cut at a word boundary with "…".
 */
export function fitDescription(text: string | undefined, clubName: string) {
  let d = (text ?? "").replace(/\s+/g, " ").trim();
  if ([...d].length < META_DESCRIPTION.min)
    d = d ? `${d.replace(/[.!?]?$/, ".")} ${clubName}.` : `${clubName}.`;
  const chars = [...d];
  if (chars.length > META_DESCRIPTION.max) {
    const cut = chars.slice(0, META_DESCRIPTION.max - 1).join("");
    d = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 60)).replace(/[\s,.;:—–-]+$/, "")}…`;
  }
  return d;
}
