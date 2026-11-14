// TODO(content): sample news posts — replace with real posts via /admin → Мэдээ.
import type { NewsPost } from "@/lib/types";
import { newsContentEn } from "./content-en";
import { b, doc, h, p, quote, ul } from "./rich-text";

const baseNews: NewsPost[] = [
  {
    id: "news-1",
    slug: "delkhiin-khuukhdiin-udriig-temdeglene",
    title: "Дэлхийн хүүхдийн өдрийг хамтдаа тэмдэглэнэ",
    titleEn: "Celebrating World Children's Day together",
    excerpt:
      "11-р сарын 20-ны Дэлхийн хүүхдийн өдрөөр сургууль даяар «Хүүхэд бүрийн эрх» аян өрнүүлэхээр бэлтгэж байна.",
    excerptEn:
      "On 20 November, World Children's Day, we are preparing a school-wide 'Every Child's Rights' campaign.",
    content: doc(
      p(
        "Жил бүрийн 11-р сарын 20-нд дэлхий даяар ",
        b("Дэлхийн хүүхдийн өдөр"),
        "-ийг тэмдэглэдэг. Энэ жил манай клуб сургуулийнхаа бүх ангид хүүхдийн эрхийн тухай богино хичээл, зурагт хуудасны уралдаан зохион байгуулна.",
      ),
      h(2, "Юу болох вэ?"),
      ul(
        "Ангиуд дахь 15 минутын «Хүүхдийн эрх» мини-хичээл",
        "«Миний мөрөөдлийн ертөнц» зурагт хуудасны уралдаан",
        "Хөнх цохиулах үеэр цэнхэр өнгийн хувцаслалт",
      ),
      quote("Хүүхэд бүр сонсогдох, хамгаалагдах эрхтэй."),
      p("Оролцохыг хүссэн сурагчид клубын гишүүдэд хандаарай!"),
    ),
    coverUrl: null,
    category: "activity",
    tags: ["хүүхдийн эрх", "аян"],
    status: "published",
    publishedAt: "2026-11-05T09:00:00+08:00",
  },
  {
    id: "news-2",
    slug: "ovliin-dulaan-khuvtsasny-ayan",
    title: "«Дулаан өвөл» хувцас цуглуулах аян эхэллээ",
    titleEn: "'Warm Winter' clothing drive has started",
    excerpt:
      "Өвлийн хүйтэнд дулаан хувцас хэрэгтэй хүүхдүүдэд зориулж хувцас, малгай, бээлий цуглуулж байна.",
    excerptEn:
      "We are collecting coats, hats and gloves for children who need warm clothes this winter.",
    content: doc(
      p(
        "Улаанбаатарын өвөл хүйтэн. Тиймээс бид гэр хорооллын хүүхдүүдэд зориулан дулаан хувцас цуглуулах аян эхлүүллээ.",
      ),
      h(2, "Юу хандивлаж болох вэ?"),
      ul("Цэвэр, бүтэн дулаан хүрэм", "Малгай, ороолт, бээлий", "Дулаан оймс, гутал"),
      p(
        "Хандиваа сургуулийн 1-р давхрын клубын хайрцагт ",
        b("12-р сарын 15"),
        " хүртэл хийнэ үү. Хамтдаа дулаахан өвөл бүтээцгээе!",
      ),
    ),
    coverUrl: null,
    category: "charity",
    tags: ["хандив", "өвөл"],
    status: "published",
    publishedAt: "2026-10-28T10:00:00+08:00",
  },
  {
    id: "news-3",
    slug: "bagachuudad-unshlagyn-tsag",
    title: "Бага ангийнханд зориулсан «Уншлагын цаг»",
    titleEn: "'Reading Hour' for younger pupils",
    excerpt:
      "Клубын гишүүд долоо хоног бүр бага ангийн сурагчдад ном уншиж өгч, хамтдаа зурж будаж байна.",
    excerptEn: "Every week our members read books to younger pupils and draw together with them.",
    content: doc(
      p(
        "Пүрэв гаригт бүр бид 1–3-р ангийн сурагчидтай номын санд уулзаж, үлгэр уншиж, сонссон зүйлээ зурдаг. Энэ бол сургууль доторх хамгийн дуртай ажлуудын нэг маань!",
      ),
      p("Сайн дураараа уншигч болохыг хүсвэл клубт нэгдээрэй."),
    ),
    coverUrl: null,
    category: "activity",
    tags: ["сургууль дотор", "ном"],
    status: "published",
    publishedAt: "2026-10-14T15:00:00+08:00",
  },
  {
    id: "news-4",
    slug: "asramjiin-tuvd-zochilloo",
    title: "Хүүхдийн асрамжийн төвд зочиллоо",
    titleEn: "We visited a children's care centre",
    excerpt:
      "Гишүүд маань асрамжийн төвийн хүүхдүүдтэй тоглоом тоглож, бэлэг гардуулж, хамтдаа дулаахан өдрийг өнгөрүүллээ.",
    excerptEn:
      "Our members played games, handed out gifts and spent a warm day with children at a care centre.",
    content: doc(
      p(
        "Сурагчдын цуглуулсан ном, бичгийн хэрэгсэл, тоглоомыг асрамжийн төвийн хүүхдүүдэд гардууллаа. Хамгийн чухал нь бид хамтдаа инээж, тоглож, шинэ найзуудтай боллоо.",
      ),
      quote("Жижиг тусламж ч гэсэн хэн нэгний өдрийг гэрэлтүүлж чадна."),
    ),
    coverUrl: null,
    category: "education",
    tags: ["сайн дурын ажил"],
    status: "published",
    publishedAt: "2026-09-30T12:00:00+08:00",
  },
  {
    id: "news-5",
    slug: "shine-khicheeliin-jild-shine-gishuud",
    title: "Шинэ хичээлийн жилд 20 шинэ гишүүн нэгдлээ",
    titleEn: "20 new members joined for the new school year",
    excerpt: "9-р сарын танилцах уулзалтад олон сурагч ирж, клубын гэр бүл маань улам томорлоо.",
    excerptEn: "Many students came to our September welcome meeting and our club family grew.",
    content: doc(
      p(
        "Хичээлийн шинэ жилийн эхэнд зохион байгуулсан танилцах уулзалтаар 20 шинэ гишүүн клубт нэгдлээ. Тэд сургууль дотор болон гадна хэрэгжих төслүүдэд оролцоно.",
      ),
    ),
    coverUrl: null,
    category: "announcement",
    tags: ["гишүүнчлэл"],
    status: "published",
    publishedAt: "2026-09-12T16:00:00+08:00",
  },
  {
    id: "news-6",
    slug: "khuukhdiin-bayriin-naadam",
    title: "Хүүхдийн баярын наадам амжилттай боллоо",
    titleEn: "Children's Day festival was a success",
    excerpt:
      "6-р сарын 1-нд сургуулийн талбайд тоглоом, зураг, спортын олон төрлийн булан ажиллууллаа.",
    excerptEn: "On 1 June we ran game, art and sports corners in the school yard.",
    content: doc(
      p(
        "Хүүхдийн баярыг тохиолдуулан клубын гишүүд бага ангийнханд зориулж тоглоомын булан, нүүр будалт, зургийн уралдаан зохион байгуулсан. 300 гаруй хүүхэд оролцлоо!",
      ),
    ),
    coverUrl: null,
    category: "activity",
    tags: ["хүүхдийн баяр", "сургууль дотор"],
    status: "published",
    publishedAt: "2026-06-02T10:00:00+08:00",
  },
  {
    id: "news-7",
    slug: "khuukhdiin-erkhiin-surgalt",
    title: "«Хүүхдийн эрхийн тухай конвенц» сургалтад хамрагдлаа",
    titleEn: "We took part in a training on the Convention on the Rights of the Child",
    excerpt:
      "Гишүүд хүүхдийн эрхийн үндсэн зарчмуудыг судалж, үе тэнгийнхэндээ хэрхэн тайлбарлах аргад суралцлаа.",
    excerptEn:
      "Members studied the core principles of children's rights and how to explain them to their peers.",
    content: doc(
      p(
        "НҮБ-ын Хүүхдийн эрхийн тухай конвенцын 4 үндсэн зарчим: ялгаварлан гадуурхахгүй байх, хүүхдийн язгуур ашиг сонирхол, амьд явах ба хөгжих эрх, хүүхдийн үзэл бодлыг хүндэтгэх.",
      ),
      p("Эдгээрийг одоо бид ангиудад тоглоомын хэлбэрээр заах болно."),
    ),
    coverUrl: null,
    category: "activity",
    tags: ["сургалт", "хүүхдийн эрх"],
    status: "published",
    publishedAt: "2026-04-18T11:00:00+08:00",
  },
  {
    id: "news-8",
    slug: "klub-baiguulagdlaa",
    title: "130 UNICEF клуб байгууллаа!",
    titleEn: "The 130 UNICEF club is founded!",
    excerpt:
      "2025 онд 130-р сургуулийн идэвхтэй сурагчид хүүхдүүдэд туслах зорилготой UNICEF чиглэлийн клубээ байгууллаа.",
    excerptEn:
      "In 2025, active students of School No. 130 founded a UNICEF-direction club to help children.",
    content: doc(
      p(
        "Бидний зорилго энгийн: сургууль дотор болон гадна хүүхдүүдэд туслах, хүүхдийн эрхийг сурталчлах, сайн үйлсийг хамтдаа хийх. Клуб маань ингэж эхэлсэн юм.",
      ),
    ),
    coverUrl: null,
    category: "announcement",
    tags: ["клубын түүх"],
    status: "published",
    publishedAt: "2025-10-01T09:00:00+08:00",
  },
];

export const mockNews: NewsPost[] = baseNews.map((n) => ({
  ...n,
  contentEn: n.contentEn ?? newsContentEn[n.slug] ?? null,
}));
