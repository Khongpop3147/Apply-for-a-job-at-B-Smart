import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { COMPANY_LIST } from "@/lib/companies";

export default function Home() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex max-w-3xl flex-col px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <h1 className="text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">ร่วมงานกับเรา</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-muted">
          เลือกบริษัทที่ต้องการสมัคร แล้วกรอกใบสมัครงานออนไลน์ได้เลย
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {COMPANY_LIST.map((c) => {
            const wide = c.logo.width > c.logo.height;
            return (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                style={{ "--accent": c.accent, "--accent-strong": c.accentStrong, "--accent-soft": c.accentSoft } as CSSProperties}
                className="group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/50"
              >
                <div className="flex h-44 items-center justify-center bg-accent-soft p-6">
                  <Image
                    src={c.logo.src}
                    alt={c.brand}
                    width={c.logo.width}
                    height={c.logo.height}
                    className={wide ? "h-auto w-full max-w-60" : "h-full w-auto rounded-xl"}
                    priority
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-5">
                  <p className="text-lg font-semibold text-ink">{c.brand}</p>
                  <p className="text-sm text-muted">{c.legalName}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-strong">
                    กรอกใบสมัคร
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
