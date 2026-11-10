"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import type { z } from "zod";
import type { Company } from "@/lib/companies";
import {
  EDUCATION_LEVELS,
  GENDERS,
  HEARD_FROM,
  HEARD_FROM_OTHER,
  ILLNESS,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  PROVINCES,
  RELIGIONS,
  WORK_UPCOUNTRY,
  YES_NO,
} from "@/lib/options";
import {
  EMPTY_EDUCATION,
  EMPTY_EXPERIENCE,
  RESUME_MAX_BYTES,
  applicationSchema,
  type ApplicationForm as FormValues,
} from "@/lib/schema";
import { ageFrom, currentBuddhistYear, formatThaiId } from "@/lib/thai";
import { PhotoPicker, ResumePicker, type PhotoValue } from "./Attachments";
import { ThaiDateSelect } from "./ThaiDateSelect";
import { Checkbox, ChoiceGroup, Field, Section, Select, TextInput, Textarea, cx } from "./ui";

type FormInput = z.input<typeof applicationSchema>;

const DRAFT_VERSION = 1;
const draftKey = (slug: string) => `bsmart-apply:draft:${slug}:v${DRAFT_VERSION}`;
/** ไม่เก็บเลขบัตรประชาชนไว้ในเครื่อง (อาจเป็นเครื่องสาธารณะ) */
const DRAFT_EXCLUDE = new Set(["nationalId", "certified", "pdpaConsent", "company"]);

function defaultValues(company: Company, position: string): Partial<FormInput> {
  return {
    company: company.code,
    position1: position,
    position2: "",
    expectedSalary: "",
    firstName: "",
    lastName: "",
    nickname: "",
    dateOfBirth: "",
    ethnicity: "ไทย",
    nationality: "ไทย",
    religion: "",
    nationalId: "",
    nationalIdExpiry: "",
    heightCm: "",
    weightKg: "",
    militaryStatus: "",
    addressNo: "",
    moo: "",
    road: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: "",
    phone: "",
    email: "",
    facebook: "",
    lineId: "",
    education: [{ ...EMPTY_EDUCATION }],
    experience: [{ ...EMPTY_EXPERIENCE }],
    drivingLicenseNo: "",
    officeMachines: "",
    hobbies: "",
    sports: "",
    workUpcountryNote: "",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",
    heardFrom: "",
    heardFromOther: "",
    illnessDetail: "",
    introduction: "",
    certified: false,
    pdpaConsent: false,
  };
}

function readDraft(slug: string): Partial<FormInput> | null {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const allowed = applicationSchema.shape;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!(k in allowed) || DRAFT_EXCLUDE.has(k)) continue;
      if (typeof v === "string" || Array.isArray(v)) out[k] = v;
    }
    return Object.keys(out).length ? (out as Partial<FormInput>) : null;
  } catch {
    return null;
  }
}

function writeDraft(slug: string, values: Partial<FormInput>) {
  try {
    const copy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) if (!DRAFT_EXCLUDE.has(k)) copy[k] = v;
    localStorage.setItem(draftKey(slug), JSON.stringify(copy));
  } catch {
    // private mode / storage เต็ม — ไม่เป็นไร
  }
}

function clearDraft(slug: string) {
  try {
    localStorage.removeItem(draftKey(slug));
  } catch {
    // ignore
  }
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success"; code: string; name: string };

export function ApplicationForm({ company }: { company: Company }) {
  const searchParams = useSearchParams();
  const initialPosition = (searchParams.get("position") ?? "").slice(0, 150);
  const [formKey, setFormKey] = useState(0);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  if (submit.kind === "success") {
    return (
      <SuccessCard
        company={company}
        code={submit.code}
        name={submit.name}
        onAgain={() => {
          setSubmit({ kind: "idle" });
          setFormKey((k) => k + 1);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <FormBody
      key={formKey}
      company={company}
      initialPosition={initialPosition}
      submit={submit}
      setSubmit={setSubmit}
      onReset={() => {
        clearDraft(company.slug);
        setFormKey((k) => k + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}

function FormBody({
  company,
  initialPosition,
  submit,
  setSubmit,
  onReset,
}: {
  company: Company;
  initialPosition: string;
  submit: SubmitState;
  setSubmit: (s: SubmitState) => void;
  onReset: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: defaultValues(company, initialPosition),
    mode: "onTouched",
  });
  const education = useFieldArray({ control, name: "education" });
  const experience = useFieldArray({ control, name: "experience" });

  const [photo, setPhoto] = useState<PhotoValue | null>(null);
  const [photoError, setPhotoError] = useState<string>();
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string>();
  const [restored, setRestored] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const photoBox = useRef<HTMLDivElement>(null);

  // กู้ข้อมูลที่กรอกค้างไว้ (เฉพาะเครื่องนี้)
  useEffect(() => {
    const draft = readDraft(company.slug);
    if (draft) {
      reset({ ...defaultValues(company, initialPosition), ...draft, ...(initialPosition ? { position1: initialPosition } : {}) });
      setRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ทำครั้งเดียวตอนเปิดหน้า
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const sub = watch((values) => {
      clearTimeout(t);
      t = setTimeout(() => writeDraft(company.slug, values as Partial<FormInput>), 600);
    });
    return () => {
      clearTimeout(t);
      sub.unsubscribe();
    };
  }, [watch, company.slug]);

  const gender = watch("gender");
  const dob = watch("dateOfBirth");
  const canDrive = watch("canDrive");
  const upcountry = watch("canWorkUpcountry");
  const illness = watch("hasSeriousIllness");
  const heardFrom = watch("heardFrom");
  const intro = watch("introduction") ?? "";
  const age = dob ? ageFrom(dob) : null;
  const thisYearBE = currentBuddhistYear();

  const requirePhoto = () => {
    if (photo) return true;
    setPhotoError("กรุณาแนบรูปถ่าย");
    return false;
  };

  const onValid = async (values: FormValues) => {
    if (!requirePhoto()) {
      photoBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmit({ kind: "submitting" });
    const fd = new FormData();
    fd.set("data", JSON.stringify(values));
    fd.set("photo", photo!.blob, "photo.jpg");
    if (resume) fd.set("resume", resume, resume.name);
    fd.set("website", honeypot.current?.value ?? "");

    try {
      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
      if (!res.ok || !body?.code) {
        setSubmit({
          kind: "error",
          message: body?.message ?? "ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        });
        return;
      }
      clearDraft(company.slug);
      setSubmit({ kind: "success", code: body.code, name: `${values.firstName} ${values.lastName}` });
      window.scrollTo({ top: 0 });
    } catch {
      setSubmit({
        kind: "error",
        message: "เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง (ข้อมูลที่กรอกยังอยู่)",
      });
    }
  };

  const onInvalid = (errs: FieldErrors<FormInput>) => {
    requirePhoto();
    if (Object.keys(errs).length === 0 && !photo) {
      photoBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const errorCount = Object.keys(errors).length + (photoError ? 1 : 0);
  const submitting = submit.kind === "submitting";
  const e = errors;

  return (
    <form noValidate onSubmit={handleSubmit(onValid, onInvalid)} className="flex flex-col gap-5">
      {restored ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm text-ink">
          <span>เราเก็บข้อมูลที่คุณกรอกค้างไว้ในเครื่องนี้ให้แล้ว (ยกเว้นเลขบัตรประชาชน รูปถ่าย และไฟล์แนบ)</span>
          <button type="button" onClick={onReset} className="font-semibold text-accent-strong underline underline-offset-2">
            เริ่มกรอกใหม่
          </button>
        </div>
      ) : null}

      {/* honeypot กันบอท — คนจริงมองไม่เห็น */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* 1. ข้อมูลการสมัคร */}
      <Section index={1} title="ตำแหน่งที่สมัคร และชื่อผู้สมัคร">
        <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <Field label="ชื่อ" htmlFor="firstName" required error={e.firstName?.message}>
              <TextInput id="firstName" autoComplete="given-name" invalid={!!e.firstName} {...register("firstName")} />
            </Field>
            <Field label="นามสกุล" htmlFor="lastName" required error={e.lastName?.message}>
              <TextInput id="lastName" autoComplete="family-name" invalid={!!e.lastName} {...register("lastName")} />
            </Field>
            <Field label="ชื่อเล่น" htmlFor="nickname" error={e.nickname?.message}>
              <TextInput id="nickname" invalid={!!e.nickname} {...register("nickname")} />
            </Field>
            <Field
              label="เงินเดือนที่ต้องการ"
              htmlFor="expectedSalary"
              required
              error={e.expectedSalary?.message}
            >
              <TextInput
                id="expectedSalary"
                inputMode="numeric"
                placeholder="เช่น 18000"
                suffix="บาท/เดือน"
                invalid={!!e.expectedSalary}
                {...register("expectedSalary")}
              />
            </Field>
            <Field label="ตำแหน่งที่ต้องการ (อันดับ 1)" htmlFor="position1" required error={e.position1?.message}>
              <TextInput id="position1" invalid={!!e.position1} {...register("position1")} />
            </Field>
            <Field label="ตำแหน่งที่ต้องการ (อันดับ 2)" htmlFor="position2" error={e.position2?.message}>
              <TextInput id="position2" invalid={!!e.position2} {...register("position2")} />
            </Field>
          </div>
          <div ref={photoBox} className="self-center sm:self-start">
            <PhotoPicker
              value={photo}
              onChange={(v) => {
                setPhoto(v);
                if (v) setPhotoError(undefined);
              }}
              error={photoError}
              onError={setPhotoError}
            />
          </div>
        </div>
      </Section>

      {/* 2. ประวัติส่วนตัว */}
      <Section index={2} title="ประวัติส่วนตัว">
        <div className="grid gap-4 sm:grid-cols-6">
          <ChoiceGroup
            className="sm:col-span-2"
            legend="เพศ"
            name="gender"
            required
            options={GENDERS}
            error={e.gender?.message}
            inputProps={register("gender")}
          />
          <Field
            className="sm:col-span-4"
            label="วัน เดือน ปีเกิด"
            htmlFor="dateOfBirth"
            required
            error={e.dateOfBirth?.message}
            hint={age !== null ? `อายุ ${age} ปี` : undefined}
          >
            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field }) => (
                <ThaiDateSelect
                  id="dateOfBirth"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  fromYearBE={thisYearBE - 80}
                  toYearBE={thisYearBE - 15}
                  invalid={!!e.dateOfBirth}
                />
              )}
            />
          </Field>
          <Field className="sm:col-span-2" label="เชื้อชาติ" htmlFor="ethnicity" error={e.ethnicity?.message}>
            <TextInput id="ethnicity" invalid={!!e.ethnicity} {...register("ethnicity")} />
          </Field>
          <Field className="sm:col-span-2" label="สัญชาติ" htmlFor="nationality" error={e.nationality?.message}>
            <TextInput id="nationality" invalid={!!e.nationality} {...register("nationality")} />
          </Field>
          <Field className="sm:col-span-2" label="ศาสนา" htmlFor="religion" error={e.religion?.message}>
            <TextInput id="religion" list="religions" invalid={!!e.religion} {...register("religion")} />
            <datalist id="religions">
              {RELIGIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          <Field
            className="sm:col-span-3"
            label="เลขบัตรประชาชน"
            htmlFor="nationalId"
            required
            error={e.nationalId?.message}
          >
            <Controller
              control={control}
              name="nationalId"
              render={({ field }) => (
                <TextInput
                  id="nationalId"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="X-XXXX-XXXXX-XX-X"
                  invalid={!!e.nationalId}
                  name={field.name}
                  ref={field.ref}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={(ev) => field.onChange(formatThaiId(ev.target.value))}
                />
              )}
            />
          </Field>
          <Field
            className="sm:col-span-3"
            label="บัตรหมดอายุ"
            htmlFor="nationalIdExpiry"
            error={e.nationalIdExpiry?.message}
          >
            <Controller
              control={control}
              name="nationalIdExpiry"
              render={({ field }) => (
                <ThaiDateSelect
                  id="nationalIdExpiry"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  fromYearBE={thisYearBE - 1}
                  toYearBE={thisYearBE + 10}
                  descending={false}
                  invalid={!!e.nationalIdExpiry}
                />
              )}
            />
          </Field>
          <Field className="sm:col-span-3" label="ส่วนสูง" htmlFor="heightCm" error={e.heightCm?.message}>
            <TextInput id="heightCm" inputMode="numeric" suffix="ซม." invalid={!!e.heightCm} {...register("heightCm")} />
          </Field>
          <Field className="sm:col-span-3" label="น้ำหนัก" htmlFor="weightKg" error={e.weightKg?.message}>
            <TextInput id="weightKg" inputMode="numeric" suffix="กก." invalid={!!e.weightKg} {...register("weightKg")} />
          </Field>
          <ChoiceGroup
            className="sm:col-span-6"
            legend="สถานภาพ"
            name="maritalStatus"
            required
            options={MARITAL_STATUSES}
            error={e.maritalStatus?.message}
            inputProps={register("maritalStatus")}
          />
          {gender === "MALE" ? (
            <ChoiceGroup
              className="sm:col-span-6"
              legend="ภาวะทางทหาร"
              name="militaryStatus"
              required
              options={MILITARY_STATUSES}
              error={e.militaryStatus?.message}
              inputProps={register("militaryStatus")}
            />
          ) : null}
        </div>
      </Section>

      {/* 3. ที่อยู่ & ติดต่อ */}
      <Section index={3} title="ที่อยู่ปัจจุบัน และช่องทางติดต่อ">
        <div className="grid gap-4 sm:grid-cols-6">
          <Field className="sm:col-span-2" label="บ้านเลขที่" htmlFor="addressNo" required error={e.addressNo?.message}>
            <TextInput id="addressNo" invalid={!!e.addressNo} {...register("addressNo")} />
          </Field>
          <Field className="sm:col-span-1" label="หมู่ที่" htmlFor="moo" error={e.moo?.message}>
            <TextInput id="moo" inputMode="numeric" invalid={!!e.moo} {...register("moo")} />
          </Field>
          <Field className="sm:col-span-3" label="ถนน / ซอย" htmlFor="road" error={e.road?.message}>
            <TextInput id="road" invalid={!!e.road} {...register("road")} />
          </Field>
          <Field className="sm:col-span-3" label="ตำบล / แขวง" htmlFor="subdistrict" required error={e.subdistrict?.message}>
            <TextInput id="subdistrict" invalid={!!e.subdistrict} {...register("subdistrict")} />
          </Field>
          <Field className="sm:col-span-3" label="อำเภอ / เขต" htmlFor="district" required error={e.district?.message}>
            <TextInput id="district" invalid={!!e.district} {...register("district")} />
          </Field>
          <Field className="sm:col-span-4" label="จังหวัด" htmlFor="province" required error={e.province?.message}>
            <Select id="province" invalid={!!e.province} {...register("province")}>
              <option value="">เลือกจังหวัด</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field className="sm:col-span-2" label="รหัสไปรษณีย์" htmlFor="postalCode" required error={e.postalCode?.message}>
            <TextInput
              id="postalCode"
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
              invalid={!!e.postalCode}
              {...register("postalCode")}
            />
          </Field>
          <Field className="sm:col-span-3" label="เบอร์โทรศัพท์" htmlFor="phone" required error={e.phone?.message}>
            <TextInput
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08X-XXX-XXXX"
              invalid={!!e.phone}
              {...register("phone")}
            />
          </Field>
          <Field className="sm:col-span-3" label="อีเมล" htmlFor="email" error={e.email?.message}>
            <TextInput id="email" type="email" autoComplete="email" invalid={!!e.email} {...register("email")} />
          </Field>
          <Field className="sm:col-span-3" label="Facebook" htmlFor="facebook" error={e.facebook?.message}>
            <TextInput id="facebook" placeholder="ชื่อหรือลิงก์ Facebook" invalid={!!e.facebook} {...register("facebook")} />
          </Field>
          <Field className="sm:col-span-3" label="LINE ID" htmlFor="lineId" error={e.lineId?.message}>
            <TextInput id="lineId" autoCapitalize="none" invalid={!!e.lineId} {...register("lineId")} />
          </Field>
        </div>
      </Section>

      {/* 4. การศึกษา */}
      <Section index={4} title="ประวัติการศึกษา" description="กรอกจากระดับสูงสุดก่อน ปีเป็น พ.ศ.">
        <div className="flex flex-col gap-4">
          {education.fields.map((row, i) => {
            const re = e.education?.[i];
            return (
              <RowCard
                key={row.id}
                title={`การศึกษา ${i + 1}`}
                onRemove={education.fields.length > 1 ? () => education.remove(i) : undefined}
              >
                <div className="grid gap-4 sm:grid-cols-6">
                  <Field className="sm:col-span-2" label="ระดับ" htmlFor={`education.${i}.level`} error={re?.level?.message}>
                    <Select id={`education.${i}.level`} invalid={!!re?.level} {...register(`education.${i}.level`)}>
                      <option value="">เลือกระดับ</option>
                      {EDUCATION_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    className="sm:col-span-4"
                    label="ชื่อสถานศึกษา"
                    htmlFor={`education.${i}.institution`}
                    error={re?.institution?.message}
                  >
                    <TextInput
                      id={`education.${i}.institution`}
                      invalid={!!re?.institution}
                      {...register(`education.${i}.institution`)}
                    />
                  </Field>
                  <Field className="sm:col-span-2" label="สาขาวิชา" htmlFor={`education.${i}.major`} error={re?.major?.message}>
                    <TextInput id={`education.${i}.major`} invalid={!!re?.major} {...register(`education.${i}.major`)} />
                  </Field>
                  <Field
                    className="sm:col-span-2"
                    label="เริ่มปี พ.ศ."
                    htmlFor={`education.${i}.startYear`}
                    error={re?.startYear?.message}
                  >
                    <TextInput
                      id={`education.${i}.startYear`}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder={String(thisYearBE - 4)}
                      invalid={!!re?.startYear}
                      {...register(`education.${i}.startYear`)}
                    />
                  </Field>
                  <Field
                    className="sm:col-span-2"
                    label="สำเร็จปี พ.ศ."
                    htmlFor={`education.${i}.endYear`}
                    error={re?.endYear?.message}
                  >
                    <TextInput
                      id={`education.${i}.endYear`}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder={String(thisYearBE)}
                      invalid={!!re?.endYear}
                      {...register(`education.${i}.endYear`)}
                    />
                  </Field>
                </div>
              </RowCard>
            );
          })}
          {education.fields.length < 6 ? (
            <AddRowButton onClick={() => education.append({ ...EMPTY_EDUCATION })}>เพิ่มประวัติการศึกษา</AddRowButton>
          ) : null}
        </div>
      </Section>

      {/* 5. ประสบการณ์ */}
      <Section
        index={5}
        title="ประสบการณ์ทำงาน"
        description="เรียงจากงานล่าสุดก่อน · ถ้ายังไม่เคยทำงาน (เช่น เพิ่งจบการศึกษา) เว้นว่างได้"
      >
        <div className="flex flex-col gap-4">
          {experience.fields.map((row, i) => {
            const re = e.experience?.[i];
            return (
              <RowCard key={row.id} title={`งานที่ ${i + 1}`} onRemove={() => experience.remove(i)}>
                <div className="grid gap-4 sm:grid-cols-6">
                  <Field
                    className="sm:col-span-3"
                    label="สถานที่ทำงาน"
                    htmlFor={`experience.${i}.workplace`}
                    error={re?.workplace?.message}
                  >
                    <TextInput
                      id={`experience.${i}.workplace`}
                      invalid={!!re?.workplace}
                      {...register(`experience.${i}.workplace`)}
                    />
                  </Field>
                  <Field
                    className="sm:col-span-3"
                    label="ตำแหน่งงาน"
                    htmlFor={`experience.${i}.position`}
                    error={re?.position?.message}
                  >
                    <TextInput
                      id={`experience.${i}.position`}
                      invalid={!!re?.position}
                      {...register(`experience.${i}.position`)}
                    />
                  </Field>
                  <Field
                    className="sm:col-span-6"
                    label="ลักษณะงานที่ทำ"
                    htmlFor={`experience.${i}.jobDescription`}
                    error={re?.jobDescription?.message}
                  >
                    <Textarea
                      id={`experience.${i}.jobDescription`}
                      className="min-h-20"
                      invalid={!!re?.jobDescription}
                      {...register(`experience.${i}.jobDescription`)}
                    />
                  </Field>
                  <Field
                    className="sm:col-span-2"
                    label="ค่าจ้าง"
                    htmlFor={`experience.${i}.salary`}
                    error={re?.salary?.message}
                  >
                    <TextInput
                      id={`experience.${i}.salary`}
                      inputMode="numeric"
                      suffix="บาท"
                      invalid={!!re?.salary}
                      {...register(`experience.${i}.salary`)}
                    />
                  </Field>
                  <Field
                    className="sm:col-span-4"
                    label="ระยะเวลา"
                    htmlFor={`experience.${i}.period`}
                    error={re?.period?.message}
                  >
                    <TextInput
                      id={`experience.${i}.period`}
                      placeholder="เช่น ม.ค. 2565 – ธ.ค. 2567 (3 ปี)"
                      invalid={!!re?.period}
                      {...register(`experience.${i}.period`)}
                    />
                  </Field>
                  <Field
                    className="sm:col-span-6"
                    label="เหตุผลที่ออก"
                    htmlFor={`experience.${i}.reasonForLeaving`}
                    error={re?.reasonForLeaving?.message}
                  >
                    <TextInput
                      id={`experience.${i}.reasonForLeaving`}
                      invalid={!!re?.reasonForLeaving}
                      {...register(`experience.${i}.reasonForLeaving`)}
                    />
                  </Field>
                </div>
              </RowCard>
            );
          })}
          {experience.fields.length < 10 ? (
            <AddRowButton onClick={() => experience.append({ ...EMPTY_EXPERIENCE })}>เพิ่มประสบการณ์ทำงาน</AddRowButton>
          ) : null}
        </div>
      </Section>

      {/* 6. ความสามารถพิเศษ */}
      <Section index={6} title="ความสามารถพิเศษ">
        <div className="grid gap-5 sm:grid-cols-6">
          <ChoiceGroup
            className="sm:col-span-3"
            legend="ใช้คอมพิวเตอร์"
            name="canUseComputer"
            required
            options={YES_NO}
            error={e.canUseComputer?.message}
            inputProps={register("canUseComputer")}
          />
          <ChoiceGroup
            className="sm:col-span-3"
            legend="ขับรถยนต์"
            name="canDrive"
            required
            options={YES_NO}
            error={e.canDrive?.message}
            inputProps={register("canDrive")}
          />
          {canDrive === "yes" ? (
            <Field
              className="sm:col-span-3 sm:col-start-4"
              label="ใบขับขี่เลขที่"
              htmlFor="drivingLicenseNo"
              error={e.drivingLicenseNo?.message}
            >
              <TextInput id="drivingLicenseNo" invalid={!!e.drivingLicenseNo} {...register("drivingLicenseNo")} />
            </Field>
          ) : null}
          <Field
            className="sm:col-span-6"
            label="ความสามารถในการใช้เครื่องใช้สำนักงาน (Office Machine)"
            htmlFor="officeMachines"
            error={e.officeMachines?.message}
          >
            <TextInput
              id="officeMachines"
              placeholder="เช่น เครื่องถ่ายเอกสาร, Word, Excel, Photoshop, Illustrator"
              invalid={!!e.officeMachines}
              {...register("officeMachines")}
            />
          </Field>
          <Field className="sm:col-span-3" label="งานอดิเรก" htmlFor="hobbies" error={e.hobbies?.message}>
            <TextInput id="hobbies" invalid={!!e.hobbies} {...register("hobbies")} />
          </Field>
          <Field className="sm:col-span-3" label="กีฬาที่ชอบ" htmlFor="sports" error={e.sports?.message}>
            <TextInput id="sports" invalid={!!e.sports} {...register("sports")} />
          </Field>
        </div>
      </Section>

      {/* 7. ข้อมูลเพิ่มเติม */}
      <Section index={7} title="ข้อมูลเพิ่มเติม">
        <div className="grid gap-5 sm:grid-cols-6">
          <ChoiceGroup
            className="sm:col-span-3"
            legend="สามารถไปปฏิบัติงานต่างจังหวัด"
            name="canWorkUpcountry"
            required
            options={WORK_UPCOUNTRY}
            error={e.canWorkUpcountry?.message}
            inputProps={register("canWorkUpcountry")}
          />
          {upcountry === "OTHER" ? (
            <Field
              className="sm:col-span-3"
              label="อื่นๆ ระบุ"
              htmlFor="workUpcountryNote"
              required
              error={e.workUpcountryNote?.message}
            >
              <TextInput id="workUpcountryNote" invalid={!!e.workUpcountryNote} {...register("workUpcountryNote")} />
            </Field>
          ) : null}

          <div className="sm:col-span-6">
            <p className="mb-3 text-sm font-semibold text-ink">บุคคลที่ติดต่อได้กรณีฉุกเฉิน</p>
            <div className="grid gap-4 sm:grid-cols-6">
              <Field
                className="sm:col-span-3"
                label="ชื่อ-นามสกุล"
                htmlFor="emergencyContactName"
                required
                error={e.emergencyContactName?.message}
              >
                <TextInput
                  id="emergencyContactName"
                  invalid={!!e.emergencyContactName}
                  {...register("emergencyContactName")}
                />
              </Field>
              <Field
                className="sm:col-span-3"
                label="เกี่ยวข้องเป็น"
                htmlFor="emergencyContactRelation"
                required
                error={e.emergencyContactRelation?.message}
              >
                <TextInput
                  id="emergencyContactRelation"
                  placeholder="เช่น มารดา"
                  invalid={!!e.emergencyContactRelation}
                  {...register("emergencyContactRelation")}
                />
              </Field>
              <Field
                className="sm:col-span-3"
                label="เบอร์โทรศัพท์"
                htmlFor="emergencyContactPhone"
                required
                error={e.emergencyContactPhone?.message}
              >
                <TextInput
                  id="emergencyContactPhone"
                  type="tel"
                  inputMode="tel"
                  invalid={!!e.emergencyContactPhone}
                  {...register("emergencyContactPhone")}
                />
              </Field>
            </div>
          </div>

          <Field className="sm:col-span-3" label="ทราบข่าวการรับสมัครจาก" htmlFor="heardFrom" error={e.heardFrom?.message}>
            <Select id="heardFrom" invalid={!!e.heardFrom} {...register("heardFrom")}>
              <option value="">เลือก</option>
              {HEARD_FROM.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
          </Field>
          {heardFrom === HEARD_FROM_OTHER ? (
            <Field
              className="sm:col-span-3"
              label="ระบุช่องทาง"
              htmlFor="heardFromOther"
              required
              error={e.heardFromOther?.message}
            >
              <TextInput id="heardFromOther" invalid={!!e.heardFromOther} {...register("heardFromOther")} />
            </Field>
          ) : null}

          <ChoiceGroup
            className="sm:col-span-6"
            legend="ท่านเคยป่วยหนักและเป็นโรคติดต่อร้ายแรงมาก่อนหรือไม่?"
            name="hasSeriousIllness"
            required
            options={ILLNESS}
            error={e.hasSeriousIllness?.message}
            inputProps={register("hasSeriousIllness")}
          />
          {illness === "yes" ? (
            <Field
              className="sm:col-span-6"
              label="ระบุชื่อโรค"
              htmlFor="illnessDetail"
              required
              error={e.illnessDetail?.message}
            >
              <TextInput id="illnessDetail" invalid={!!e.illnessDetail} {...register("illnessDetail")} />
            </Field>
          ) : null}
        </div>
      </Section>

      {/* 8. แนะนำตัว & เอกสาร */}
      <Section index={8} title="แนะนำตัว และเอกสารแนบ">
        <div className="flex flex-col gap-5">
          <Field
            label="กรุณาแนะนำตัวของท่านให้บริษัทได้รู้จักยิ่งขึ้น"
            htmlFor="introduction"
            error={e.introduction?.message}
            hint={`${intro.length.toLocaleString("th-TH")} / 3,000 ตัวอักษร`}
          >
            <Textarea
              id="introduction"
              rows={6}
              maxLength={3000}
              placeholder="เล่าเกี่ยวกับตัวคุณ จุดเด่น ผลงาน หรือเหตุผลที่อยากร่วมงานกับเรา"
              invalid={!!e.introduction}
              {...register("introduction")}
            />
          </Field>
          <ResumePicker value={resume} onChange={setResume} error={resumeError} onError={setResumeError} />
          <p className="-mt-3 text-xs text-muted">
            ไฟล์ PDF ไม่เกิน {(RESUME_MAX_BYTES / 1024 / 1024).toFixed(1)} MB — ถ้าไฟล์ใหญ่กว่านี้ ส่งลิงก์ Google Drive ไว้ในช่องแนะนำตัวได้
          </p>
        </div>
      </Section>

      {/* 9. ยืนยัน */}
      <Section index={9} title="ยืนยันข้อมูล">
        <div className="flex flex-col gap-4">
          <Checkbox id="certified" error={e.certified?.message} {...register("certified")}>
            ข้าพเจ้าขอรับรองว่า ข้อความดังกล่าวทั้งหมดในใบสมัครนี้เป็นความจริงทุกประการ
            หลังจากบริษัทจ้างเข้ามาทำงานแล้วปรากฏว่า ข้อความในใบสมัครงาน เอกสารที่นำมาแสดง
            หรือรายละเอียดที่ให้ไว้ไม่เป็นความจริง บริษัทฯ มีสิทธิ์ที่จะเลิกจ้างข้าพเจ้าได้โดยไม่ต้องจ่ายเงินชดเชยหรือค่าเสียหายใดๆ ทั้งสิ้น
          </Checkbox>
          <Checkbox id="pdpaConsent" error={e.pdpaConsent?.message} {...register("pdpaConsent")}>
            ข้าพเจ้ายินยอมให้ {company.legalName} เก็บรวบรวม ใช้ และเก็บรักษาข้อมูลส่วนบุคคลในใบสมัครนี้
            (รวมถึงเลขบัตรประชาชน รูปถ่าย และข้อมูลสุขภาพ) เพื่อการพิจารณารับสมัครงานและติดต่อกลับเท่านั้น
            ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </Checkbox>
        </div>

        {submit.kind === "error" ? (
          <div role="alert" className="mt-5 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
            {submit.message}
          </div>
        ) : null}
        {isSubmitted && errorCount > 0 && submit.kind !== "error" ? (
          <p role="status" className="mt-5 text-sm text-danger">
            ยังมีช่องที่ต้องแก้ไขอีก {errorCount} จุด — ดูข้อความสีแดงด้านบน
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className={cx(
            "mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-base font-bold text-ink shadow-sm transition",
            "hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40",
            "disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-64",
          )}
        >
          {submitting ? (
            <>
              <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
              กำลังส่งใบสมัคร…
            </>
          ) : (
            "ส่งใบสมัคร"
          )}
        </button>
      </Section>
    </form>
  );
}

function RowCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-subtle/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">{title}</p>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-line hover:text-ink"
          >
            ลบ
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function AddRowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-accent-strong hover:text-ink"
    >
      <span aria-hidden className="text-lg leading-none">
        +
      </span>
      {children}
    </button>
  );
}

function SuccessCard({
  company,
  code,
  name,
  onAgain,
}: {
  company: Company;
  code: string;
  name: string;
  onAgain: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft">
        <svg aria-hidden viewBox="0 0 24 24" className="size-9 text-accent-strong" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-5 text-2xl font-bold text-ink">ส่งใบสมัครเรียบร้อยแล้ว</h2>
      <p className="mt-2 text-muted">
        ขอบคุณคุณ{name} ที่สนใจร่วมงานกับ {company.brand}
      </p>
      <div className="mx-auto mt-6 inline-flex flex-col rounded-xl border border-line bg-subtle px-6 py-3">
        <span className="text-xs text-muted">เลขที่ใบสมัคร</span>
        <span className="font-mono text-xl font-bold tracking-wide text-ink">{code}</span>
      </div>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-muted">
        ฝ่ายบุคคลจะพิจารณาใบสมัครและติดต่อกลับทางเบอร์โทรศัพท์ที่ให้ไว้ หากต้องการสอบถาม กรุณาแจ้งเลขที่ใบสมัครนี้
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-8 text-sm font-semibold text-accent-strong underline underline-offset-4"
      >
        กรอกใบสมัครใหม่อีกใบ
      </button>
    </div>
  );
}
