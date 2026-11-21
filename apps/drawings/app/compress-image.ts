// Kompresi gambar di browser sebelum upload (desain 2026-11-21 §1). Server tetap memeriksa
// hasilnya dan mengonversi apa pun yang tidak lolos, jadi setiap kegagalan di sini aman:
// file asli yang dikirim.
const MAX_SIDE = 2560;

/** Ukuran proporsional dengan sisi terpanjang ≤ `max`, tanpa memperbesar. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Nama file dengan ekstensi sesuai tipe hasil encode. */
export function compressedName(name: string, type: 'image/webp' | 'image/jpeg') {
  return name.replace(/\.[A-Za-z0-9]{1,8}$/, '') + (type === 'image/webp' ? '.webp' : '.jpg');
}

/**
 * File asli dikirim bila hasil canvas bukan WebP/JPEG, bila PNG terpaksa menjadi JPEG (transparansi
 * hilang menjadi hitam; server mempertahankan alpha), atau bila hasilnya tidak lebih kecil padahal
 * resolusi asli sudah ≤ 2560 px.
 */
export function keepOriginal(c: {
  encodedType: string;
  encodedSize: number;
  originalType: string;
  originalSize: number;
  originalSmall: boolean;
}) {
  if (c.encodedType !== 'image/webp' && c.encodedType !== 'image/jpeg') return true;
  if (c.encodedType === 'image/jpeg' && c.originalType === 'image/png') return true;
  return c.originalSmall && c.encodedSize >= c.originalSize;
}

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * WebP 0,82 bila browser bisa meng-encode-nya, selain itu JPEG 0,85 (mis. Safari iOS yang diam-diam
 * menghasilkan PNG untuk `image/webp`). Orientasi EXIF diterapkan; hasil canvas tidak membawa metadata.
 */
export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const size = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    let blob = await encode(canvas, 'image/webp', 0.82);
    if (blob?.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg', 0.85);
    if (
      !blob ||
      keepOriginal({
        encodedType: blob.type,
        encodedSize: blob.size,
        originalType: file.type,
        originalSize: file.size,
        originalSmall: bitmap.width <= MAX_SIDE && bitmap.height <= MAX_SIDE,
      })
    )
      return file;
    return new File([blob], compressedName(file.name, blob.type as 'image/webp' | 'image/jpeg'), {
      type: blob.type,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
