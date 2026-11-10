import { z } from "zod";
import { HEARD_FROM_OTHER } from "./options";
import {
  ageFrom,
  currentBuddhistYear,
  digitsOnly,
  isValidThaiId,
  isValidThaiPhone,
  parseIsoDate,
} from "./thai";

/*
 * schema เดียวใช้ทั้งฝั่งเบราว์เซอร์ (react-hook-form) และ /api/apply
 * ค่าในฟอร์มเป็น string ทั้งหมด (กรอกง่าย ไม่มี NaN) แล้วค่อยแปลงเป็น payload ของ ERP ใน toErpPayload()
 */

const req = (label: string, max = 200) =>
  z.string().trim().min(1, `กรุณากรอก${label}`).max(max, `${label}ยาวเกิน ${max} ตัวอักษร`);
const opt = (max = 200) => z.string().trim().max(max, `ยาวเกิน ${max} ตัวอักษร`);

const intString = (label: string, { min = 0, max = 10_000_000 } = {}) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v.replace(/,/g, "")), `${label}ต้องเป็นตัวเลข`)
    .refine((v) => {
      if (v === "") return true;
      const n = Number(v.replace(/,/g, ""));
      return n >= min && n <= max;
    }, `${label}ไม่ถูกต้อง`);

const beYear = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}$/.test(v), "กรอกปี พ.ศ. 4 หลัก")
  .refine((v) => {
    if (v === "") return true;
    const y = Number(v);
    return y >= 2450 && y <= currentBuddhistYear() + 6;
  }, "กรอกเป็นปี พ.ศ. เช่น 2566");

const isoDate = z.string().trim().refine((v) => v === "" || parseIsoDate(v) !== null, "วันที่ไม่ถูกต้อง");

const choice = <const T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.enum(values, { error: message });

export const educationRowSchema = z
  .object({
    level: opt(100),
    institution: opt(200),
    major: opt(150),
    startYear: beYear,
    endYear: beYear,
  })
  .superRefine((row, ctx) => {
    const filled = Object.values(row).some((v) => v !== "");
    if (!filled) return;
    if (!row.level) ctx.addIssue({ code: "custom", path: ["level"], message: "เลือกระดับการศึกษา" });
    if (!row.institution) ctx.addIssue({ code: "custom", path: ["institution"], message: "กรอกชื่อสถานศึกษา" });
    if (row.startYear && row.endYear && Number(row.endYear) < Number(row.startYear))
      ctx.addIssue({ code: "custom", path: ["endYear"], message: "ปีที่จบต้องไม่น้อยกว่าปีที่เริ่ม" });
  });

export const experienceRowSchema = z
  .object({
    workplace: opt(200),
    position: opt(150),
    jobDescription: opt(1000),
    salary: intString("ค่าจ้าง"),
    period: opt(100),
    reasonForLeaving: opt(500),
  })
  .superRefine((row, ctx) => {
    const filled = Object.values(row).some((v) => v !== "");
    if (!filled) return;
    if (!row.workplace) ctx.addIssue({ code: "custom", path: ["workplace"], message: "กรอกสถานที่ทำงาน" });
    if (!row.position) ctx.addIssue({ code: "custom", path: ["position"], message: "กรอกตำแหน่งงาน" });
  });

export const applicationSchema = z
  .object({
    company: choice(["BSMART", "NGAEDEE"], "ไม่พบบริษัท"),

    // ตำแหน่งที่สมัคร
    position1: req("ตำแหน่งที่ต้องการ", 150),
    position2: opt(150),
    expectedSalary: intString("เงินเดือนที่ต้องการ", { max: 1_000_000 }).refine(
      (v) => v !== "",
      "กรุณากรอกเงินเดือนที่ต้องการ",
    ),

    // ข้อมูลส่วนตัว
    firstName: req("ชื่อ", 100),
    lastName: req("นามสกุล", 100),
    nickname: opt(50),
    gender: choice(["MALE", "FEMALE"], "กรุณาเลือกเพศ"),
    dateOfBirth: isoDate.refine((v) => v !== "", "กรุณาเลือกวันเดือนปีเกิด"),
    ethnicity: opt(50),
    nationality: opt(50),
    religion: opt(50),
    nationalId: z
      .string()
      .trim()
      .refine((v) => digitsOnly(v).length === 13, "เลขบัตรประชาชนต้องมี 13 หลัก")
      .refine((v) => isValidThaiId(v), "เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"),
    nationalIdExpiry: isoDate,
    heightCm: intString("ส่วนสูง", { min: 50, max: 250 }),
    weightKg: intString("น้ำหนัก", { min: 20, max: 300 }),
    militaryStatus: z.union([z.literal(""), choice(["EXEMPTED", "RESERVE", "NOT_YET"], "เลือกภาวะทางทหาร")]),
    maritalStatus: choice(["SINGLE", "MARRIED", "WIDOWED", "SEPARATED"], "กรุณาเลือกสถานภาพ"),

    // ที่อยู่ & ติดต่อ
    addressNo: req("บ้านเลขที่", 50),
    moo: opt(20),
    road: opt(150),
    subdistrict: req("ตำบล/แขวง", 100),
    district: req("อำเภอ/เขต", 100),
    province: req("จังหวัด", 100),
    postalCode: z.string().trim().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
    phone: z.string().trim().refine(isValidThaiPhone, "เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678)"),
    email: z
      .string()
      .trim()
      .max(150)
      .refine((v) => v === "" || z.email().safeParse(v).success, "อีเมลไม่ถูกต้อง"),
    facebook: opt(150),
    lineId: opt(100),

    // การศึกษา & ประสบการณ์
    education: z.array(educationRowSchema).max(6, "เพิ่มได้สูงสุด 6 แถว"),
    experience: z.array(experienceRowSchema).max(10, "เพิ่มได้สูงสุด 10 แถว"),

    // ความสามารถพิเศษ
    canUseComputer: choice(["yes", "no"], "กรุณาเลือก"),
    canDrive: choice(["yes", "no"], "กรุณาเลือก"),
    drivingLicenseNo: opt(30),
    officeMachines: opt(300),
    hobbies: opt(300),
    sports: opt(300),

    // อื่นๆ
    canWorkUpcountry: choice(["YES", "NO", "OTHER"], "กรุณาเลือก"),
    workUpcountryNote: opt(200),
    emergencyContactName: req("ชื่อผู้ติดต่อกรณีฉุกเฉิน", 150),
    emergencyContactRelation: req("ความเกี่ยวข้อง", 50),
    emergencyContactPhone: z
      .string()
      .trim()
      .refine(isValidThaiPhone, "เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678)"),
    heardFrom: opt(100),
    heardFromOther: opt(100),
    hasSeriousIllness: choice(["yes", "no"], "กรุณาเลือก"),
    illnessDetail: opt(300),
    introduction: opt(3000),

    // ยืนยัน
    certified: z.boolean().refine((v) => v, "กรุณายืนยันว่าข้อมูลเป็นความจริง"),
    pdpaConsent: z.boolean().refine((v) => v, "กรุณายินยอมให้บริษัทเก็บและใช้ข้อมูลเพื่อการสมัครงาน"),
  })
  /*
   * กฎข้ามช่อง — ใส่ `when` ให้รันเสมอแม้ช่องอื่นยังผิด (ค่าเริ่มต้นของ zod 4 จะข้ามถ้ามีช่องผิด
   * ทำให้ error อย่าง "เลือกภาวะทางทหาร" โผล่ทีหลังตอนกดส่งรอบสอง) ฟังก์ชันต้องทนค่าที่ยังไม่ครบ
   */
  .refine((v) => {
    const age = ageFrom(String(v.dateOfBirth ?? ""));
    return age === null || (age >= 15 && age <= 80);
  }, { path: ["dateOfBirth"], message: "อายุต้องอยู่ระหว่าง 15–80 ปี", when: isObjectPayload })
  .refine((v) => !(v.gender === "MALE" && !v.militaryStatus), {
    path: ["militaryStatus"],
    message: "กรุณาเลือกภาวะทางทหาร",
    when: isObjectPayload,
  })
  .refine((v) => !(v.canWorkUpcountry === "OTHER" && !v.workUpcountryNote?.trim()), {
    path: ["workUpcountryNote"],
    message: "กรุณาระบุ",
    when: isObjectPayload,
  })
  .refine((v) => !(v.hasSeriousIllness === "yes" && !v.illnessDetail?.trim()), {
    path: ["illnessDetail"],
    message: "กรุณาระบุชื่อโรค",
    when: isObjectPayload,
  })
  .refine((v) => !(v.heardFrom === HEARD_FROM_OTHER && !v.heardFromOther?.trim()), {
    path: ["heardFromOther"],
    message: "กรุณาระบุ",
    when: isObjectPayload,
  });

function isObjectPayload(payload: { value: unknown }) {
  return typeof payload.value === "object" && payload.value !== null;
}

export type ApplicationForm = z.infer<typeof applicationSchema>;
export type EducationRow = z.infer<typeof educationRowSchema>;
export type ExperienceRow = z.infer<typeof experienceRowSchema>;

export const EMPTY_EDUCATION: EducationRow = { level: "", institution: "", major: "", startYear: "", endYear: "" };
export const EMPTY_EXPERIENCE: ExperienceRow = {
  workplace: "",
  position: "",
  jobDescription: "",
  salary: "",
  period: "",
  reasonForLeaving: "",
};

/* ------------------------------------------------------------------------------------------------
 * payload ที่ส่งเข้า bsmart-erp — ต้องตรงกับ CreateJobApplicationRequest ใน packages/shared ของ ERP
 * ---------------------------------------------------------------------------------------------- */

export interface ErpJobApplicationRequest {
  company: "BSMART" | "NGAEDEE";
  firstName: string;
  lastName: string;
  nickname?: string;
  position1: string;
  position2?: string;
  expectedSalary: number;
  addressNo: string;
  moo?: string;
  road?: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
  email?: string;
  facebook?: string;
  lineId?: string;
  dateOfBirth: string;
  ethnicity?: string;
  nationality?: string;
  religion?: string;
  nationalId: string;
  nationalIdExpiry?: string;
  heightCm?: number;
  weightKg?: number;
  militaryStatus?: "EXEMPTED" | "RESERVE" | "NOT_YET";
  maritalStatus: "SINGLE" | "MARRIED" | "WIDOWED" | "SEPARATED";
  gender: "MALE" | "FEMALE";
  education: {
    level: string;
    institution: string;
    major?: string;
    startYear?: number;
    endYear?: number;
  }[];
  experience: {
    workplace: string;
    position: string;
    jobDescription?: string;
    salary?: number;
    period?: string;
    reasonForLeaving?: string;
  }[];
  canUseComputer: boolean;
  canDrive: boolean;
  drivingLicenseNo?: string;
  officeMachines?: string;
  hobbies?: string;
  sports?: string;
  canWorkUpcountry: "YES" | "NO" | "OTHER";
  workUpcountryNote?: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  heardFrom?: string;
  hasSeriousIllness: boolean;
  illnessDetail?: string;
  introduction?: string;
  certified: true;
  pdpaConsent: true;
}

const s = (v: string) => (v.trim() === "" ? undefined : v.trim());
const n = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(/,/g, "")));
const isFilled = (row: object) => Object.values(row).some((v) => v !== "");

/** ใช้กับค่าที่ผ่าน applicationSchema แล้วเท่านั้น */
export function toErpPayload(v: ApplicationForm): ErpJobApplicationRequest {
  const heardFrom = v.heardFrom === HEARD_FROM_OTHER ? `อื่นๆ: ${v.heardFromOther.trim()}` : s(v.heardFrom);
  return {
    company: v.company,
    firstName: v.firstName,
    lastName: v.lastName,
    nickname: s(v.nickname),
    position1: v.position1,
    position2: s(v.position2),
    expectedSalary: Number(v.expectedSalary.replace(/,/g, "")),
    addressNo: v.addressNo,
    moo: s(v.moo),
    road: s(v.road),
    subdistrict: v.subdistrict,
    district: v.district,
    province: v.province,
    postalCode: v.postalCode,
    phone: digitsOnly(v.phone),
    email: s(v.email),
    facebook: s(v.facebook),
    lineId: s(v.lineId),
    dateOfBirth: v.dateOfBirth,
    ethnicity: s(v.ethnicity),
    nationality: s(v.nationality),
    religion: s(v.religion),
    nationalId: digitsOnly(v.nationalId),
    nationalIdExpiry: s(v.nationalIdExpiry),
    heightCm: n(v.heightCm),
    weightKg: n(v.weightKg),
    militaryStatus: v.gender === "MALE" && v.militaryStatus ? v.militaryStatus : undefined,
    maritalStatus: v.maritalStatus,
    gender: v.gender,
    education: v.education.filter(isFilled).map((e) => ({
      level: e.level,
      institution: e.institution,
      major: s(e.major),
      startYear: n(e.startYear),
      endYear: n(e.endYear),
    })),
    experience: v.experience.filter(isFilled).map((e) => ({
      workplace: e.workplace,
      position: e.position,
      jobDescription: s(e.jobDescription),
      salary: n(e.salary),
      period: s(e.period),
      reasonForLeaving: s(e.reasonForLeaving),
    })),
    canUseComputer: v.canUseComputer === "yes",
    canDrive: v.canDrive === "yes",
    drivingLicenseNo: v.canDrive === "yes" ? s(v.drivingLicenseNo) : undefined,
    officeMachines: s(v.officeMachines),
    hobbies: s(v.hobbies),
    sports: s(v.sports),
    canWorkUpcountry: v.canWorkUpcountry,
    workUpcountryNote: v.canWorkUpcountry === "OTHER" ? s(v.workUpcountryNote) : undefined,
    emergencyContactName: v.emergencyContactName,
    emergencyContactRelation: v.emergencyContactRelation,
    emergencyContactPhone: digitsOnly(v.emergencyContactPhone),
    heardFrom,
    hasSeriousIllness: v.hasSeriousIllness === "yes",
    illnessDetail: v.hasSeriousIllness === "yes" ? s(v.illnessDetail) : undefined,
    introduction: s(v.introduction),
    certified: true,
    pdpaConsent: true,
  };
}

/* ไฟล์แนบ — Vercel รับ request ได้ไม่เกิน 4.5 MB ต่อครั้ง จึงย่อรูปฝั่งเบราว์เซอร์และจำกัด PDF */
export const PHOTO_MAX_BYTES = 1.5 * 1024 * 1024; // หลังย่อแล้ว
export const PHOTO_SOURCE_MAX_BYTES = 20 * 1024 * 1024; // ไฟล์ต้นฉบับที่ผู้สมัครเลือก
export const RESUME_MAX_BYTES = 2.5 * 1024 * 1024;
