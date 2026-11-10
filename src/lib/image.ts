/**
 * ย่อรูปถ่ายในเบราว์เซอร์ก่อนส่ง (ด้านยาวสุด ≤ maxEdge, JPEG) — รูปจากมือถือมัก 3–8 MB
 * ซึ่งเกินเพดาน request 4.5 MB ของ Vercel
 */
export async function compressImage(file: File, maxEdge = 1200, quality = 0.85): Promise<Blob> {
  const source = await loadImage(file);
  const { width, height } = source;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unsupported");
  ctx.fillStyle = "#fff"; // PNG โปร่งใส → พื้นขาว
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("encode-failed");
  return blob;
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // ตกไปใช้ <img> ด้านล่าง
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
