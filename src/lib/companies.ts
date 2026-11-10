/**
 * บริษัทที่รับสมัครผ่านเว็บนี้ — `code` ต้องตรงกับ `JobApplicationCompany` ใน bsmart-erp
 */
export type CompanyCode = "BSMART" | "NGAEDEE";

export interface Company {
  slug: string;
  code: CompanyCode;
  brand: string;
  legalName: string;
  tagline: string;
  logo: { src: string; width: number; height: number };
  /** สีหลักของแบรนด์ — ใช้เป็นพื้น (ตัวหนังสือบนพื้นนี้ใช้สีเข้ม) */
  accent: string;
  /** สีเข้มสำหรับตัวหนังสือ/เส้นบนพื้นขาว (contrast ≥ 4.5:1) */
  accentStrong: string;
  /** พื้นอ่อน */
  accentSoft: string;
}

export const COMPANIES: Record<string, Company> = {
  bsmart: {
    slug: "bsmart",
    code: "BSMART",
    brand: "B-smart",
    legalName: "บริษัท ที.เอส.พริ้นท์ติ้ง 2002 จำกัด",
    tagline: "Good Media Starts Here",
    logo: { src: "/logos/bsmart.png", width: 571, height: 207 },
    accent: "#F7941D",
    accentStrong: "#A84F00",
    accentSoft: "#FFF4E6",
  },
  ngaedee: {
    slug: "ngaedee",
    code: "NGAEDEE",
    brand: "แง่ดี ครีเอทีฟ",
    legalName: "บริษัท แง่ดี ครีเอทีฟ จำกัด",
    tagline: "ทีมครีเอทีฟที่มองทุกงานในแง่ดี",
    logo: { src: "/logos/ngaedee.jpg", width: 640, height: 640 },
    accent: "#FF7300",
    accentStrong: "#B04500",
    accentSoft: "#FFFADA",
  },
};

export const COMPANY_LIST = Object.values(COMPANIES);

export function getCompany(slug: string): Company | undefined {
  return Object.hasOwn(COMPANIES, slug) ? COMPANIES[slug] : undefined;
}
