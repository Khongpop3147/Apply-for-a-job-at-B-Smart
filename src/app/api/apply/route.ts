import { NextResponse, type NextRequest } from "next/server";
import { PHOTO_MAX_BYTES, RESUME_MAX_BYTES, applicationSchema, toErpPayload } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

/*
 * รับใบสมัครจากเบราว์เซอร์ → ตรวจซ้ำฝั่ง server → ส่งต่อเข้า bsmart-erp
 * API key ของ ERP อยู่ใน env ของ Vercel เท่านั้น ไม่เคยถูกส่งไปที่เบราว์เซอร์
 */

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status });

// กันยิงซ้ำแบบง่าย ๆ ต่อ instance (serverless แต่ละตัวนับแยกกัน — เป็นแค่ด่านแรก ERP มี throttle อีกชั้น)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

async function head(file: Blob, n: number) {
  return new Uint8Array(await file.slice(0, n).arrayBuffer());
}
const startsWith = (bytes: Uint8Array, sig: number[]) => sig.every((b, i) => bytes[i] === b);

async function isImage(file: Blob) {
  const b = await head(file, 12);
  return (
    startsWith(b, [0xff, 0xd8, 0xff]) || // JPEG
    startsWith(b, [0x89, 0x50, 0x4e, 0x47]) || // PNG
    (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) // WEBP
  );
}
async function isPdf(file: Blob) {
  return startsWith(await head(file, 5), [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
}

const safeFileName = (name: string) =>
  name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(-120) || "resume.pdf";

export async function POST(req: NextRequest) {
  const erpUrl = process.env.ERP_API_URL;
  const apiKey = process.env.JOB_APPLICATION_API_KEY;
  if (!erpUrl || !apiKey) {
    console.error("[apply] ERP_API_URL / JOB_APPLICATION_API_KEY ยังไม่ได้ตั้งค่า");
    return json(503, { message: "ระบบรับสมัครยังไม่พร้อมใช้งาน กรุณาติดต่อบริษัทโดยตรง" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return json(429, { message: "ส่งใบสมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(400, { message: "ข้อมูลที่ส่งมาไม่ถูกต้อง หรือไฟล์ใหญ่เกินไป" });
  }

  // honeypot: บอทกรอกช่องที่คนมองไม่เห็น → ตอบเหมือนสำเร็จแต่ไม่ส่งต่อ
  if (String(form.get("website") ?? "") !== "") {
    return json(200, { code: "RECEIVED" });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("data") ?? ""));
  } catch {
    return json(400, { message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" });
  }
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, {
      message: "ข้อมูลบางช่องไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const photo = form.get("photo");
  if (!(photo instanceof Blob) || photo.size === 0) return json(400, { message: "กรุณาแนบรูปถ่าย" });
  if (photo.size > PHOTO_MAX_BYTES) return json(413, { message: "รูปถ่ายใหญ่เกินไป" });
  if (!(await isImage(photo))) return json(400, { message: "รูปถ่ายต้องเป็นไฟล์ JPG, PNG หรือ WEBP" });

  const resume = form.get("resume");
  const hasResume = resume instanceof File && resume.size > 0;
  if (hasResume) {
    if (resume.size > RESUME_MAX_BYTES) return json(413, { message: "ไฟล์ Resume ใหญ่เกินไป" });
    if (!(await isPdf(resume))) return json(400, { message: "Resume ต้องเป็นไฟล์ PDF" });
  }

  const out = new FormData();
  out.set("data", JSON.stringify(toErpPayload(parsed.data)));
  out.set("photo", new Blob([await photo.arrayBuffer()], { type: photo.type || "image/jpeg" }), "photo.jpg");
  if (hasResume) {
    out.set("resume", new Blob([await resume.arrayBuffer()], { type: "application/pdf" }), safeFileName(resume.name));
  }

  let res: Response;
  try {
    res = await fetch(`${erpUrl.replace(/\/+$/, "")}/public/job-applications`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: out,
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[apply] ส่งเข้า ERP ไม่ได้", err);
    return json(502, { message: "ระบบรับสมัครไม่ตอบสนอง กรุณาลองใหม่อีกครั้งในอีกสักครู่ (ข้อมูลที่กรอกยังอยู่)" });
  }

  const body = (await res.json().catch(() => null)) as { id?: string; code?: string; message?: unknown } | null;
  if (res.ok && body?.code) {
    return json(201, { code: body.code });
  }

  console.error("[apply] ERP ตอบกลับ", res.status, JSON.stringify(body)?.slice(0, 2000));
  if (res.status === 400) {
    return json(400, { message: "ข้อมูลบางช่องไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" });
  }
  if (res.status === 413) {
    return json(413, { message: "ไฟล์แนบใหญ่เกินไป กรุณาลดขนาดไฟล์" });
  }
  if (res.status === 429) {
    return json(429, { message: "มีผู้สมัครจำนวนมากในขณะนี้ กรุณาลองใหม่อีกครั้งในอีกสักครู่" });
  }
  return json(502, { message: "ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง (ข้อมูลที่กรอกยังอยู่)" });
}
