// TODO(content): sample albums with placeholder images — replace via /admin → Зургийн цомог.
import type { Album, GalleryImage } from "@/lib/types";

const sizes: Record<number, [number, number]> = {
  1: [1200, 800],
  2: [800, 1000],
  3: [1200, 800],
  4: [1200, 900],
  5: [800, 1000],
  6: [1200, 800],
  7: [1000, 1000],
  8: [1200, 800],
  9: [1200, 800],
};

function images(albumId: string, nums: number[], alt: string): GalleryImage[] {
  return nums.map((n, i) => {
    const [width, height] = sizes[n] ?? [1200, 800];
    return {
      id: `${albumId}-img-${i + 1}`,
      url: `/placeholders/photo-${n}.svg`,
      thumbUrl: `/placeholders/photo-${n}.svg`,
      width,
      height,
      alt: `${alt} — ${i + 1}`,
      order: i,
    };
  });
}

export const mockAlbums: Album[] = [
  {
    id: "album-1",
    slug: "khuukhdiin-bayr-2026",
    title: "Хүүхдийн баярын наадам 2026",
    titleEn: "Children's Day festival 2026",
    description: "6-р сарын 1-ний баярын өдрийн дурсамжууд.",
    descriptionEn: "Memories from our 1 June celebration.",
    date: "2026-06-01",
    coverUrl: "/placeholders/photo-3.svg",
    images: images("album-1", [3, 1, 2, 4, 6, 5, 7], "Хүүхдийн баярын наадам"),
    published: true,
  },
  {
    id: "album-2",
    slug: "asramjiin-tuvd-zochilson-ni",
    title: "Асрамжийн төвд зочилсон нь",
    titleEn: "Care centre visit",
    description: "Ном, бичгийн хэрэгсэл гардуулж, хамтдаа тоглосон өдөр.",
    descriptionEn: "The day we delivered books and played together.",
    date: "2026-09-27",
    coverUrl: "/placeholders/photo-4.svg",
    images: images("album-2", [4, 8, 2, 9], "Асрамжийн төвд зочилсон нь"),
    published: true,
  },
  {
    id: "album-3",
    slug: "unshlagyn-tsag",
    title: "Уншлагын цаг",
    titleEn: "Reading Hour",
    description: "Бага ангийнхантай хамт ном уншиж, зурсан мөчүүд.",
    descriptionEn: "Reading and drawing with younger pupils.",
    date: "2026-10-14",
    coverUrl: "/placeholders/photo-7.svg",
    images: images("album-3", [7, 5, 1, 6, 9], "Уншлагын цаг"),
    published: true,
  },
];
