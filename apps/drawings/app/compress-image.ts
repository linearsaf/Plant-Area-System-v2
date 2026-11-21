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
    if (!blob || (blob.type !== 'image/webp' && blob.type !== 'image/jpeg')) return file;
    const alreadySmall = bitmap.width <= MAX_SIDE && bitmap.height <= MAX_SIDE;
    if (blob.size >= file.size && alreadySmall) return file;
    return new File([blob], compressedName(file.name, blob.type), { type: blob.type });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
