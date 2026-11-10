import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { ApplicationForm } from "@/components/ApplicationForm";
import { COMPANY_LIST, getCompany } from "@/lib/companies";

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPANY_LIST.map((c) => ({ company: c.slug }));
}

type Props = { params: Promise<{ company: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = getCompany((await params).company);
  if (!company) return {};
  return {
    title: `สมัครงาน · ${company.brand}`,
    description: `กรอกใบสมัครงานออนไลน์ ${company.legalName}`,
    openGraph: {
      title: `ร่วมงานกับ ${company.brand}`,
      description: `กรอกใบสมัครงานออนไลน์ ${company.legalName}`,
      images: [company.logo.src],
    },
  };
}

export default async function CompanyApplyPage({ params }: Props) {
  const company = getCompany((await params).company);
  if (!company) notFound();

  const brandVars = {
    "--accent": company.accent,
    "--accent-strong": company.accentStrong,
    "--accent-soft": company.accentSoft,
  } as CSSProperties;

  return (
    <main style={brandVars} className="min-h-dvh">
      <div className="h-1.5 bg-accent" />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <nav className="mb-6 text-sm">
          <Link href="/" className="text-muted hover:text-ink">
            ← เลือกบริษัท
          </Link>
        </nav>

        <header className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
          <div
            className={
              company.logo.width > company.logo.height
                ? "flex h-20 items-center"
                : "size-24 shrink-0 overflow-hidden rounded-2xl shadow-sm"
            }
          >
            <Image
              src={company.logo.src}
              alt={company.brand}
              width={company.logo.width}
              height={company.logo.height}
              priority
              className={company.logo.width > company.logo.height ? "h-16 w-auto" : "size-full object-cover"}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">ใบสมัครงาน</h1>
            <p className="mt-1 text-base text-muted">{company.legalName}</p>
          </div>
        </header>

        <p className="mb-6 rounded-xl bg-surface px-4 py-3 text-sm leading-relaxed text-muted shadow-sm ring-1 ring-line">
          ใช้เวลากรอกประมาณ 10 นาที · ช่องที่มี <span className="font-semibold text-danger">*</span> จำเป็นต้องกรอก ·
          ระบบเก็บข้อมูลที่กรอกค้างไว้ในเครื่องนี้ให้อัตโนมัติ
        </p>

        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
          <ApplicationForm company={company} />
        </Suspense>

        <footer className="mt-10 text-center text-xs leading-relaxed text-faint">
          ข้อมูลของท่านจะถูกส่งถึงฝ่ายบุคคลของ {company.legalName} โดยตรง และใช้เพื่อการพิจารณารับสมัครงานเท่านั้น
        </footer>
      </div>
    </main>
  );
}
