# คู่มือ: เอาค่าจาก LINE Developers Console มาตั้งค่า FinFlow

คู่มือนี้สำหรับ **โฮส (Admin)** ของครอบครัว ใช้ตอนตั้งค่า LINE Official Account ครั้งแรก
หรือตอนแก้ปัญหาบอทไม่ตอบ ทำตามลำดับ 1-6 ได้เลย ทุกค่าจะเอาไปกรอกที่หน้า
**FinFlow → ตั้งค่า → การ์ด "LINE Official Account ของครอบครัวนี้"**

ก่อนเริ่ม: ต้องมี LINE Official Account + Messaging API channel อยู่แล้ว (สร้างที่
[LINE Developers Console](https://developers.line.biz/console/) ถ้ายังไม่มี)

---

## 1. Channel Secret

1. เข้า [LINE Developers Console](https://developers.line.biz/console/) → เลือก Provider → เลือก
   channel (ประเภท Messaging API) ของครอบครัวนี้
2. แท็บ **Basic settings**
3. หาช่อง **Channel secret** → กด **Issue** ถ้ายังไม่เคยออก หรือคัดลอกค่าที่มีอยู่
4. เก็บค่านี้ไว้ก่อน (จะเอาไปกรอกในขั้นตอนที่ 6)

## 2. Channel Access Token

1. channel เดิม → แท็บ **Messaging API**
2. เลื่อนหาหัวข้อ **Channel access token (long-lived)**
3. กด **Issue** → คัดลอกค่าที่ได้ (ค่านี้จะโชว์ครั้งเดียว ถ้าไม่ได้บันทึกไว้ต้อง Issue ใหม่)

## 3. LIFF ID สองตัว

channel เดิม → แท็บ **LIFF** → กด **Add** เพื่อสร้าง LIFF app **2 ตัวแยกกัน**:

| LIFF app | Endpoint URL ที่ต้องกรอก | เอา LIFF ID ไปกรอกที่ช่อง |
|---|---|---|
| ตัวที่ 1 (ผูกบัญชี) | `https://finflow.code-n-fun-house.top/liff` | "LIFF ID (ผูกบัญชี)" |
| ตัวที่ 2 (บันทึกจดเงิน) | `https://finflow.code-n-fun-house.top/liff/quick-record` | "LIFF ID (บันทึกจดเงิน)" |

Size แนะนำ: **Full**, Scope: `profile`, `openid` (ค่า default พอใช้ได้) หลังสร้างเสร็จแต่ละตัวจะมี
LIFF ID เป็นรูปแบบ `1234567890-abcdEFGH` — คัดลอกเก็บไว้ทั้งสองตัว

## 4. Webhook URL (จุดนี้แก้ปัญหา "บอทไม่ตอบ" ได้ด้วย)

1. เข้าเว็บ FinFlow ที่ `https://finflow.code-n-fun-house.top/settings` (ล็อกอินเป็นโฮส)
2. หา URL ที่ระบบโชว์ให้เป็น Webhook URL ของครอบครัวนี้ (จะมีรหัสเฉพาะครอบครัวต่อท้าย เช่น
   `.../api/line/webhook/xxxxxxxx-xxxx-...`) → คัดลอกทั้งหมด **ห้ามตัดรหัสท้ายทิ้ง**
3. กลับไป LINE Developers Console → channel เดิม → แท็บ **Messaging API** → หัวข้อ
   **Webhook settings**
4. วาง URL ที่คัดลอกมาลงช่อง **Webhook URL** → กด **Update**
5. กด **Verify** — ต้องขึ้นสำเร็จ (ถ้า error ให้เช็คว่า URL มีรหัสท้ายครบตามข้อ 2)
6. เปิดสวิตช์ **Use webhook** ให้เป็น ON

## 5. Response mode ต้องเป็น Bot

1. จาก Developers Console กดไปที่ **LINE Official Account Manager** ของ channel นี้ (ปุ่ม/ลิงก์
   ในหน้า Basic settings) หรือเข้าตรงที่ [entry.line.biz](https://entry.line.biz/) แล้วเลือกบัญชี
2. ไปที่ **การตั้งค่า (Settings) → การตอบกลับ (Response settings)**
3. ตั้ง **โหมดการตอบกลับ (Response mode)** เป็น **บอท (Bot)** — ถ้าเป็น "แชท (Chat)" อยู่ บอทจะไม่มีวันตอบเลย
   เพราะข้อความจะไม่ถูกส่งเข้า Webhook

## 6. กรอกค่าใน FinFlow

1. กลับไปที่ `https://finflow.code-n-fun-house.top/settings`
2. การ์ด "LINE Official Account ของครอบครัวนี้" → กรอก:
   - **Channel Access Token** = ค่าจากข้อ 2
   - **Channel Secret** = ค่าจากข้อ 1
   - **LIFF ID (ผูกบัญชี)** = ค่าจากข้อ 3 (ตัวที่ 1)
   - **LIFF ID (บันทึกจดเงิน)** = ค่าจากข้อ 3 (ตัวที่ 2)
3. กด **บันทึก**
4. ลองส่งข้อความในแชท LINE ของบัญชีนี้ เช่น "ค่าข้าวเช้า 50 บาท" — บอทควรตอบกลับและรายการควรขึ้นในหน้า
   "รายการบันทึกเงิน" ของเว็บ

> ช่องไหนเว้นว่างไว้ตอนกด "บันทึก" แปลว่า "ไม่เปลี่ยนค่าเดิม" ไม่ใช่ "ลบค่านั้น" — ถ้าต้องการล้างค่าทั้งหมดจริงๆ
> ให้กดปุ่ม "ยกเลิกการเชื่อมต่อ" แทน
