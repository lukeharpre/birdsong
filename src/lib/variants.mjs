// Responsive widths generated for every image. Shared by the image script and
// the <Img> component so the files on disk and the srcset always agree.
export const WIDTHS = [480, 960, 1600];

export const stem = (name) => name.replace(/\.[^.]+$/, "");

export const variants = (width) => [...new Set(WIDTHS.map((w) => Math.min(w, width)))];

export const variantPath = (name, w) => `/media/${stem(name)}-${w}.webp`;
