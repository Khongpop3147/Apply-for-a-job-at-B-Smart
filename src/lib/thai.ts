export const BE_OFFSET = 543;

export const digitsOnly = (v: string) => v.replace(/\D/g, "");

/** ตรวจเลขบัตรประชาชน 13 หลักด้วย checksum หลักสุดท้าย */
export function isValidThaiId(raw: string): boolean {
  const id = digitsOnly(raw);
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

/** 1234567890123 → 1-2345-67890-12-3 */
export function formatThaiId(raw: string): string {
  const d = digitsOnly(raw).slice(0, 13);
  const parts = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)];
  return parts.filter(Boolean).join("-");
}

/** เบอร์มือถือ/บ้านไทย: 0 นำหน้า ยาว 9–10 หลัก */
export function isValidThaiPhone(raw: string): boolean {
  return /^0\d{8,9}$/.test(digitsOnly(raw));
}

/** "YYYY-MM-DD" (ค.ศ.) → Date ที่ตรงวันจริง หรือ null ถ้าไม่ใช่วันที่จริง (เช่น 31 ก.พ.) */
export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function ageFrom(iso: string, now = new Date()): number | null {
  const dob = parseIsoDate(iso);
  if (!dob) return null;
  let age = now.getFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getUTCMonth() ||
    (now.getMonth() === dob.getUTCMonth() && now.getDate() < dob.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

export const currentBuddhistYear = () => new Date().getFullYear() + BE_OFFSET;
