/**
 * Responsive variants of uploaded images. The yearly report import stores each photo as
 * `…/NN.webp` (1600 px long edge), `…/NN-md.webp` (960 px) and `…/NN-thumb.webp` (480 px), so a
 * srcset can be built from the full URL. Other uploads have no known pair: they get no srcset.
 */
const REPORT_PHOTO = /^(\/media\/content\/[\w/.-]+\/\d{2})\.webp$/;
export const THUMB_EDGE = 480;
export const MEDIUM_EDGE = 960;
export const FULL_EDGE = 1600;

export function responsiveSrc(url: string | null | undefined, sizes: string) {
  const m = url ? REPORT_PHOTO.exec(url) : null;
  if (!m) return {};
  return {
    srcSet: `${m[1]}-thumb.webp ${THUMB_EDGE}w, ${m[1]}-md.webp ${MEDIUM_EDGE}w, ${url} ${FULL_EDGE}w`,
    sizes,
  };
}
