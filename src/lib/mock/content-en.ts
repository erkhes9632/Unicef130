// English versions of the sample content (merged into mock news/events by slug).
// TODO(content): replace together with the Mongolian sample content.
import type { RichTextDoc } from "@/lib/types";
import { b, doc, h, p, quote, ul } from "./rich-text";

export const newsContentEn: Record<string, RichTextDoc> = {
  "delkhiin-khuukhdiin-udriig-temdeglene": doc(
    p(
      "Every year on 20 November the world celebrates ",
      b("World Children's Day"),
      ". This year our club is organising short lessons on children's rights and a poster contest in every class of our school.",
    ),
    h(2, "What's happening?"),
    ul(
      "15-minute 'Children's Rights' mini-lessons in classes",
      "'My dream world' poster contest",
      "Wear something blue during the break",
    ),
    quote("Every child has the right to be heard and protected."),
    p("Students who want to take part, please talk to a club member!"),
  ),
  "ovliin-dulaan-khuvtsasny-ayan": doc(
    p(
      "Winters in Ulaanbaatar are cold, so we have started a drive to collect warm clothes for children in the ger districts.",
    ),
    h(2, "What can you donate?"),
    ul("Clean, intact warm jackets", "Hats, scarves and gloves", "Warm socks and boots"),
    p(
      "Please put your donations in the club box on the 1st floor of the school by ",
      b("15 December"),
      ". Let's make a warm winter together!",
    ),
  ),
  "bagachuudad-unshlagyn-tsag": doc(
    p(
      "Every Thursday we meet pupils from grades 1–3 in the library, read stories together and draw what we heard. It's one of our favourite activities inside the school!",
    ),
    p("Join the club if you'd like to become a volunteer reader."),
  ),
  "asramjiin-tuvd-zochilloo": doc(
    p(
      "We delivered books, school supplies and toys collected by students to the children at a care centre. Most importantly, we laughed, played and made new friends.",
    ),
    quote("Even a small act of help can brighten someone's day."),
  ),
  "shine-khicheeliin-jild-shine-gishuud": doc(
    p(
      "At the welcome meeting at the start of the school year, 20 new members joined the club. They will take part in projects inside and outside the school.",
    ),
  ),
  "khuukhdiin-bayriin-naadam": doc(
    p(
      "For Children's Day, club members organised game corners, face painting and a drawing contest for younger pupils. More than 300 children took part!",
    ),
  ),
  "khuukhdiin-erkhiin-surgalt": doc(
    p(
      "The four core principles of the UN Convention on the Rights of the Child: non-discrimination, the best interests of the child, the right to life and development, and respect for the views of the child.",
    ),
    p("We will now teach these in classes through games."),
  ),
  "klub-baiguulagdlaa": doc(
    p(
      "Our goal is simple: help children inside and outside our school, promote children's rights and do good together. That's how our club began.",
    ),
  ),
};

export const eventContentEn: Record<string, RichTextDoc> = {
  "delkhiin-khuukhdiin-udur-2026": doc(
    p("The whole school goes blue and talks about children's rights."),
    ul(
      "08:30 — Opening, information in all classes",
      "12:00 — Poster exhibition",
      "15:00 — Awards",
    ),
  ),
  "dulaan-uvul-handiv-huleen-avah": doc(
    p("Volunteers sort the clothes by size and pack them into boxes. We need helping hands!"),
  ),
  "shine-jiliin-beleg-asramjiin-tuvd": doc(
    p("Performances, games and gifts — a festive day together with the children."),
  ),
  "unshlagyn-tsag-1-sar": doc(p("We meet pupils from grades 1–3 in the library.")),
  "asramjiin-tuvd-zochlokh-2026-09": doc(
    p("We handed books and school supplies to more than 40 children."),
  ),
  "khuukhdiin-bayriin-naadam-2026": doc(
    p("A festive day in the school yard with more than 300 children."),
  ),
};
