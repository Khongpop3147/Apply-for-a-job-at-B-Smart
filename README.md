# เว็บสมัครงาน B-smart / แง่ดี ครีเอทีฟ

ฟอร์มสมัครงานออนไลน์ (Next.js 16) สำหรับ

- `/bsmart` — บริษัท ที.เอส.พริ้นท์ติ้ง 2002 จำกัด (B-smart)
- `/ngaedee` — บริษัท แง่ดี ครีเอทีฟ จำกัด

ฟิลด์ตรงกับใบสมัครกระดาษ (`ใบสมัครงาน บีสมาร์ท.doc` / `ใบสมัครงาน แง่ดี.doc`) + แนบรูปถ่าย (บังคับ) และ Resume PDF (ไม่บังคับ)

เว็บนี้**ไม่เก็บข้อมูลเอง** — ใบสมัครถูกส่งต่อเข้า **bsmart-erp** (โมดูล "ผู้สมัครงาน") แล้ว HR ดู/เปลี่ยนสถานะ/พิมพ์ใบสมัครใน ERP

```
ผู้สมัคร ─▶ Vercel: /api/apply ──(x-api-key)──▶ ERP: POST /public/job-applications ─▶ Postgres + S3
            ตรวจข้อมูลซ้ำ, ตรวจไฟล์                                        HR ดูที่เมนู "ผู้สมัครงาน"
```

## ลิงก์สำหรับประกาศรับสมัคร

ใส่ `?position=` เพื่อเติมตำแหน่งให้อัตโนมัติ เช่น

```
https://<โดเมน>/bsmart?position=กราฟิกดีไซเนอร์
https://<โดเมน>/ngaedee?position=Content%20Creator
```

## ตั้งค่า (Environment Variables)

| ตัวแปร | ที่ไหน | ค่า |
|---|---|---|
| `ERP_API_URL` | Vercel | URL ของ ERP backend บน Railway เช่น `https://xxx.up.railway.app` (ไม่มี `/` ท้าย) |
| `JOB_APPLICATION_API_KEY` | Vercel **และ** Railway (ERP backend) | ค่าเดียวกันทั้งสองฝั่ง สร้างด้วย `openssl rand -hex 32` |

## Deploy ขึ้น Vercel

1. push repo นี้ขึ้น GitHub
2. Vercel → **Add New… → Project** → เลือก repo → Framework = Next.js (ค่าเริ่มต้นใช้ได้เลย)
3. ใส่ Environment Variables 2 ตัวด้านบน → **Deploy**
4. ฝั่ง ERP: deploy branch ที่มีโมดูลผู้สมัครงาน (migration จะสร้างตาราง + สิทธิ์ `job_application.view` / `job_application.manage`) แล้วตั้ง `JOB_APPLICATION_API_KEY` บน Railway
5. ใน ERP ให้สิทธิ์ 2 ตัวนั้นกับ role ของ HR

## พัฒนาในเครื่อง

```bash
cp .env.example .env.local   # แก้ค่าให้ชี้ ERP ที่รันในเครื่อง
npm install
npm run dev                  # http://localhost:3100 (เลี่ยงพอร์ต 3000/3001 ของ ERP)
```

## ข้อจำกัดที่ควรรู้

- Vercel รับ request ได้ไม่เกิน **4.5 MB** → เว็บย่อรูปถ่ายในเบราว์เซอร์ (≤1200px JPEG) และจำกัด Resume ไว้ที่ 2.5 MB
- ป้องกันสแปม: honeypot + จำกัด 5 ครั้ง/10 นาที/IP (นับแยกต่อ serverless instance) + throttle ของ ERP
  ถ้าเจอสแปมจริงจัง ค่อยเพิ่ม Cloudflare Turnstile
- ข้อมูลที่กรอกค้างจะถูกเก็บใน localStorage ของเครื่องผู้สมัคร (ยกเว้นเลขบัตรประชาชน รูป และไฟล์แนบ) และลบเมื่อส่งสำเร็จ
