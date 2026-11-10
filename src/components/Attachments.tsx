"use client";

import { useEffect, useId, useRef, useState } from "react";
import { compressImage } from "@/lib/image";
import { PHOTO_MAX_BYTES, PHOTO_SOURCE_MAX_BYTES, RESUME_MAX_BYTES } from "@/lib/schema";
import { cx } from "./ui";

export interface PhotoValue {
  blob: Blob;
  previewUrl: string;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** ช่องรูปถ่ายแบบกรอบ 3:4 เหมือนช่องติดรูปในใบสมัครกระดาษ */
export function PhotoPicker({
  value,
  onChange,
  error,
  onError,
}: {
  value: PhotoValue | null;
  onChange: (v: PhotoValue | null) => void;
  error?: string;
  onError: (message: string | undefined) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (value) URL.revokeObjectURL(value.previewUrl);
    };
  }, [value]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return onError("กรุณาเลือกไฟล์รูปภาพ (JPG หรือ PNG)");
    if (file.size > PHOTO_SOURCE_MAX_BYTES) return onError(`ไฟล์ใหญ่เกินไป (สูงสุด ${mb(PHOTO_SOURCE_MAX_BYTES)})`);
    setBusy(true);
    try {
      let blob = await compressImage(file);
      if (blob.size > PHOTO_MAX_BYTES) blob = await compressImage(file, 900, 0.75);
      if (blob.size > PHOTO_MAX_BYTES) return onError("รูปใหญ่เกินไป กรุณาเลือกรูปอื่น");
      onError(undefined);
      onChange({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      onError("เปิดรูปนี้ไม่ได้ กรุณาเลือกไฟล์ JPG หรือ PNG");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <label
        htmlFor={inputId}
        className={cx(
          "group relative flex aspect-[3/4] w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-subtle text-center transition-colors sm:w-36",
          "focus-within:ring-2 focus-within:ring-accent/60",
          error ? "border-danger" : "border-line-strong hover:border-accent-strong",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL ของไฟล์ในเครื่อง
          <img src={value.previewUrl} alt="รูปถ่ายผู้สมัคร" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-3 text-xs text-muted">
            <svg aria-hidden viewBox="0 0 24 24" className="size-8 text-faint" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="9" r="3.5" />
              <path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5" strokeLinecap="round" />
            </svg>
            {busy ? "กำลังเตรียมรูป…" : "แตะเพื่อเลือกรูปถ่าย"}
          </span>
        )}
        {value ? (
          <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            เปลี่ยนรูป
          </span>
        ) : null}
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <span className="text-sm font-medium text-ink">
        รูปถ่าย<span className="ml-0.5 text-danger" aria-hidden>*</span>
      </span>
      {error ? (
        <p role="alert" className="max-w-40 text-center text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="max-w-40 text-center text-xs text-muted">หน้าตรง เห็นใบหน้าชัดเจน</p>
      )}
    </div>
  );
}

export function ResumePicker({
  value,
  onChange,
  error,
  onError,
}: {
  value: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  onError: (message: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const pick = (file: File | undefined) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return onError("รองรับเฉพาะไฟล์ PDF");
    if (file.size > RESUME_MAX_BYTES) return onError(`ไฟล์ใหญ่เกิน ${mb(RESUME_MAX_BYTES)} กรุณาลดขนาดไฟล์`);
    onError(undefined);
    onChange(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">Resume / Portfolio (ถ้ามี)</span>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-line-strong bg-subtle px-3 py-2.5">
          <svg aria-hidden viewBox="0 0 24 24" className="size-6 shrink-0 text-accent-strong" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{value.name}</p>
            <p className="text-xs text-muted">{mb(value.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-line hover:text-ink"
          >
            ลบ
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cx(
            "flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-sm text-muted transition-colors hover:border-accent-strong hover:text-ink",
            error ? "border-danger" : "border-line-strong",
          )}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          แนบไฟล์ PDF (ไม่เกิน {mb(RESUME_MAX_BYTES)})
        </button>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
