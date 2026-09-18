# คู่มือ: เปิดใช้งาน "อ่านสลิปอัตโนมัติ" (Google Cloud Vision)

ตอนนี้ส่งรูปสลิปผ่าน LINE แล้วบอทจะตอบว่า "ระบบอ่านสลิปอัตโนมัติยังใช้งานไม่ได้ตอนนี้ครับ" —
เพราะยังไม่เคยตั้งค่าบัญชีบริการ (Google Cloud) ให้แอปใช้เรียก Vision API ได้ คู่มือนี้ทำครั้งเดียวจบ

**ก่อนเริ่ม เช็ค log จริงก่อน** (เผื่อสาเหตุไม่ใช่ตามนี้ทั้งหมด): SSH เข้า NAS แล้วรัน
```bash
pm2 logs finflow-app --lines 30
```
แล้วลองส่งรูปสลิปใหม่อีกรอบ จะเห็นบรรทัด `[line webhook] slip OCR failed: ...` พร้อม error จริง —
ถ้าขึ้น error เกี่ยวกับ credentials/authentication ให้ทำตามคู่มือนี้ต่อได้เลย

---

## 1. ใช้ GCP Project เดิมของ Gemini

ถ้าเคยสร้าง API Key ของ Gemini (AI Financial Coach) ไว้แล้ว ใช้ **โปรเจกต์เดียวกันนั้น** ได้เลย
ไม่ต้องสร้างใหม่ — เข้า [Google Cloud Console](https://console.cloud.google.com/) แล้วเลือกโปรเจกต์นั้นที่มุมบนซ้าย

## 2. เปิดใช้งาน Cloud Vision API

1. เมนู ☰ → **APIs & Services → Library**
2. ค้นหา **Cloud Vision API**
3. กด **Enable**
4. เช็คว่าโปรเจกต์นี้ผูก **Billing account** ไว้แล้ว (Menu → Billing) — Vision API ต้องมี billing
   เปิดอยู่ถึงจะเรียกได้ แม้จะอยู่ใน free tier ก็ตาม

## 3. สร้าง Service Account

1. เมนู ☰ → **IAM & Admin → Service Accounts** → **Create Service Account**
2. ตั้งชื่ออะไรก็ได้ เช่น `finflow-vision`
3. ขั้น "Grant this service account access" → เลือก role **Cloud Vision AI Service Agent**
   (ถ้าหาไม่เจอ ใช้ **Editor** แทนได้ ง่ายกว่าแต่สิทธิ์กว้างกว่าที่จำเป็น — ใช้ได้สำหรับโปรเจกต์ส่วนตัวเล็กๆ)
4. กด **Done**

## 4. ออก JSON Key

1. ในหน้า Service Accounts คลิก service account ที่เพิ่งสร้าง
2. แท็บ **Keys** → **Add Key → Create new key** → เลือก **JSON** → **Create**
3. ไฟล์ `.json` จะถูกดาวน์โหลดลงเครื่องอัตโนมัติ (เก็บให้ดี ออกซ้ำไม่ได้ต้องสร้าง key ใหม่ถ้าทำหาย)

## 5. อัปโหลดไฟล์ขึ้น NAS

ห้าม commit ไฟล์นี้เข้า git เด็ดขาด (เป็นความลับ) — อัปโหลดตรงไปที่ NAS แทน เช่นด้วย `scp`:

```bash
scp ~/Downloads/finflow-app-xxxxx.json 2morrow@<nas-ip>:/volume1/web/finflow-app/gcp-vision-key.json
```

หรือใช้ **File Station** บน DSM อัปโหลดเข้าโฟลเดอร์ `/volume1/web/finflow-app/` ก็ได้ — ตั้งชื่อไฟล์
อะไรก็ได้ เช่น `gcp-vision-key.json`

## 6. ตั้งค่า `.env` บน NAS

```bash
cd /volume1/web/finflow-app
nano .env
```
เพิ่ม/แก้บรรทัด:
```
GOOGLE_APPLICATION_CREDENTIALS="/volume1/web/finflow-app/gcp-vision-key.json"
```
(ใช้ path เต็มแบบ absolute ให้ตรงกับที่อัปโหลดไว้จริงในข้อ 5)

## 7. Restart และทดสอบ

```bash
pm2 restart finflow-app
```
ส่งรูปสลิปใหม่ผ่าน LINE อีกครั้ง — ถ้าสำเร็จ รายการควรถูกบันทึกอัตโนมัติและบอทตอบกลับด้วยรายละเอียดที่อ่านได้
แทนข้อความ "พิมพ์รายการเป็นข้อความแทนก่อน" ถ้ายังไม่ได้ ให้เช็ค `pm2 logs finflow-app` อีกครั้งเพื่อดู error
รอบใหม่ (เช่น สิทธิ์ไม่พอ หรือ path ไฟล์ผิด)
