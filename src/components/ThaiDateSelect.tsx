"use client";

import { useState } from "react";
import { THAI_MONTHS } from "@/lib/options";
import { BE_OFFSET } from "@/lib/thai";
import { Select, cx } from "./ui";

/**
 * วัน / เดือน / ปี พ.ศ. แบบ 3 dropdown → ค่า "YYYY-MM-DD" (ค.ศ.) หรือ "" ถ้ายังเลือกไม่ครบ
 * คนไทยคุ้นกับ พ.ศ. มากกว่า date picker ของเบราว์เซอร์ (ซึ่งแสดง ค.ศ.)
 */
export function ThaiDateSelect({
  id,
  value,
  onChange,
  onBlur,
  fromYearBE,
  toYearBE,
  invalid,
  descending = true,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  fromYearBE: number;
  toYearBE: number;
  invalid?: boolean;
  descending?: boolean;
}) {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  // เก็บค่าที่เลือกไม่ครบไว้ในตัวเอง — ฟอร์มจะได้ค่าเมื่อครบ 3 ช่องเท่านั้น
  const [draft, setDraft] = useState({ d: "", m: "", y: "" });
  const parts = parsed
    ? { d: String(Number(parsed[3])), m: String(Number(parsed[2])), y: String(Number(parsed[1]) + BE_OFFSET) }
    : draft;

  const update = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    setDraft(next);
    if (next.d && next.m && next.y) {
      const yearCE = Number(next.y) - BE_OFFSET;
      onChange(`${yearCE}-${next.m.padStart(2, "0")}-${next.d.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const years: number[] = [];
  for (let y = fromYearBE; y <= toYearBE; y++) years.push(y);
  if (descending) years.reverse();

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.3fr] gap-2" onBlur={onBlur}>
      <Select
        id={id}
        aria-label="วัน"
        invalid={invalid}
        value={parts.d}
        onChange={(e) => update({ d: e.target.value })}
        className={cx(!parts.d && "text-faint")}
      >
        <option value="">วัน</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={String(d)}>
            {d}
          </option>
        ))}
      </Select>
      <Select
        aria-label="เดือน"
        invalid={invalid}
        value={parts.m}
        onChange={(e) => update({ m: e.target.value })}
        className={cx(!parts.m && "text-faint")}
      >
        <option value="">เดือน</option>
        {THAI_MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1)}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="ปี พ.ศ."
        invalid={invalid}
        value={parts.y}
        onChange={(e) => update({ y: e.target.value })}
        className={cx(!parts.y && "text-faint")}
      >
        <option value="">ปี พ.ศ.</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
