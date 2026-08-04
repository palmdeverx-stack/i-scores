# OpenAI Template AI

ระบบนี้เรียก OpenAI Responses API จาก Next.js Route Handler ฝั่งเซิร์ฟเวอร์เท่านั้น
Client จะไม่ได้รับ API key, internal prompt หรือ raw provider error และ AI จะสร้างเพียง Preview
จนกว่าผู้ใช้จะกด “นำไปใช้” และบันทึก Template ด้วยตนเอง

## ตั้งค่า

1. สร้าง API key ใน [OpenAI API keys](https://platform.openai.com/api-keys)
2. คัดลอก `.env.example` เป็น `.env.local`
3. ตั้งค่าอย่างน้อย:

```env
OPENAI_API_KEY=ใส่_key_ที่นี่
OPENAI_TEMPLATE_MODEL=
OPENAI_TEMPLATE_MAX_OUTPUT_TOKENS=4000
OPENAI_TEMPLATE_ENABLED=true
```

เมื่อ `OPENAI_TEMPLATE_MODEL` ว่าง ระบบจะใช้โมเดลกลางจาก
`src/features/ai/config/ai.config.ts` ห้ามใช้ชื่อตัวแปร `NEXT_PUBLIC_` กับ API key
และห้าม commit `.env.local` (ไฟล์นี้อยู่ใน `.gitignore` แล้ว)

ตัวเลือกควบคุมต้นทุนและการป้องกันการเรียกซ้ำ:

```env
OPENAI_TEMPLATE_TIMEOUT_MS=45000
OPENAI_TEMPLATE_RATE_LIMIT_MAX=5
OPENAI_TEMPLATE_RATE_LIMIT_WINDOW_SECONDS=60
OPENAI_TEMPLATE_DAILY_LIMIT=20
OPENAI_TEMPLATE_MONTHLY_LIMIT=200
```

ปิด AI ได้ด้วย `OPENAI_TEMPLATE_ENABLED=false` โดยระบบ Template ปกติยังทำงานเหมือนเดิม

## ฐานข้อมูล

รัน migration `20260804110000_template_ai.sql` หลัง migration ระบบ Template โดย migration จะเพิ่ม:

- `curriculum_indicators` สำหรับให้ Client ส่งเฉพาะ UUID และ Backend resolve ข้อความหลักสูตรจริง
- `ai_usage_logs` สำหรับสถานะ, token usage, quota, duration และ error code โดยไม่เก็บ prompt/เนื้อหาเต็ม
- metadata แหล่งกำเนิด AI บน `templates`

ก่อนเลือกตัวชี้วัดใน Dialog ต้อง import/seed ข้อมูลของโรงเรียนลง `curriculum_indicators`
ระบบจะปฏิเสธ ID ที่ไม่อยู่ในโรงเรียนหรือไม่ตรงกับรายวิชา และจะไม่เดารหัสตัวชี้วัด

## ทดสอบด้วยหน้าเว็บ

1. เข้าระบบด้วยครูหรือผู้ดูแลโรงเรียน
2. ไปที่ Template แล้วเปิดหน้า Create หรือ Edit
3. กด “สร้างด้วย AI” กรอกหัวข้อและบริบทแบบข้อมูลรวม
4. กด “สร้าง Preview” ตรวจคำเตือนและเนื้อหา
5. ทดลอง “ปรับให้สั้นลง”, “เพิ่มรายละเอียด” หรือ “สร้างใหม่”
6. กด “นำไปใช้” ตรวจว่าฟอร์มถูกเติมแต่ยังไม่มีการบันทึก
7. กด “บันทึก Template” เมื่อยืนยันแล้ว

Automated tests ต้อง mock provider และห้ามใช้ API key จริง ดูคำสั่ง `yarn test:ai`

อ้างอิง: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
