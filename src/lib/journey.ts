/** Journey pictures ship a phone-sized copy beside any raster wider than
 * 1000px: `<name>-800.webp` (the design-system test resolves every srcset
 * candidate, so a missing copy fails). Vectors and small rasters have none. */
export function phoneCopy(src: string, width?: number): string | undefined {
  if (!/\.(webp|jpe?g|png)$/i.test(src) || (width ?? 0) <= 1000) return undefined;
  return `${src.replace(/\.\w+$/, "-800.webp")} 800w, ${src} ${width}w`;
}
