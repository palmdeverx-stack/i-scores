# ระบบย่อย E-KRU

อัปเดตตามการทำงานของระบบ ณ วันที่ 3 สิงหาคม 2026

## ระบบนี้มีหน้าที่อะไร

`ระบบย่อย E-KRU` เป็นทะเบียนกลางสำหรับจับคู่ระบบย่อยกับสิทธิ์ที่ขายใน Marketplace โดยก่อนเปิดระบบจะตรวจตามลำดับดังนี้:

1. ผู้ใช้มี Session ของ E-KRU
2. ระบบย่อยใน `ekru_apps` เปิดใช้งานอยู่
3. บัญชี Google เชื่อมกับ `marketplace_users` ที่ active
4. มี License ที่ยังใช้งานได้และมี Feature key ตรงกับระบบย่อย
5. Scope ของ License ตรงกับ Scope ที่ระบบย่อยรองรับ
6. มี Workspace สำหรับผู้ซื้อหรือโรงเรียน จากนั้น redirect ไปยัง Launch path พร้อม `workspaceId`

จุดเข้าใช้งานมาตรฐานคือ `/launch?app=APP_CODE`

## ความหมายของช่องตั้งค่า

| ช่อง | ความหมาย |
| --- | --- |
| Code | รหัสระบบที่ใช้เปิดผ่าน `/launch?app=CODE` ต้องเป็น A-Z, 0-9 หรือ `_` |
| ชื่อระบบ | ชื่อที่แสดงแก่ผู้ดูแลระบบ |
| Launch path | เส้นทางภายใน E-KRU รูปแบบ `/apps/...` |
| Required feature key | Feature ที่ License ต้องมี เช่น `teacher.worksheet_ai` |
| Scope: individual | License และ Workspace เป็นของบัญชีผู้ซื้อ |
| Scope: school | License และ Workspace เป็นของโรงเรียน |
| Scope: both | รองรับทั้งสองแบบ โดยตรวจ individual ก่อน school |
| เปิดใช้งาน | ปิดแล้ว `/launch` จะไม่อนุญาตให้เข้า |

## Flow การซื้อและเข้าใช้งาน

```text
Master เพิ่ม E-KRU App
        ↓
Marketplace Product grant Feature key เดียวกัน
        ↓
ผู้ใช้ซื้อสินค้าและชำระเงินสำเร็จ
        ↓
Marketplace เรียก POST /api/internal/marketplace/provision
        ↓
สร้าง License + Workspace แบบ individual หรือ school
        ↓
ผู้ใช้ Login ด้วย Google บัญชีเดียวกับผู้ซื้อ
        ↓
/launch?app=CODE ตรวจสิทธิ์และ redirect ไป Launch path?workspaceId=...
```

## การตรวจสิทธิ์ตาม Scope

### Individual

- ตรวจ `marketplace_user_licenses`
- ผู้ซื้อ, License และระบบย่อยต้อง active
- วันเริ่มต้น/หมดอายุต้องครอบคลุมเวลาปัจจุบัน
- `feature_keys` ต้องมี `required_feature_key`
- Workspace ผูกด้วย `owner_auth_user_id` และไม่ผูกโรงเรียน

### School

- ผู้ใช้ต้องมี `app_users.school_id`
- ต้องเป็นสมาชิกใน `marketplace_school_members`
- ตรวจ `marketplace_school_licenses`
- License แบบ `school` ใช้ได้ทั้งโรงเรียน
- License แบบ `teacher` ต้องมีรายการ assign ใน `marketplace_teacher_license_assignments`
- Workspace ผูกด้วย `school_id` และใช้ร่วมกันในโรงเรียน

### Personal Workspace

แพ็กเกจบุคคลที่ให้ Feature ระบบโรงเรียนจะสร้าง tenant ส่วนตัวในตาราง `schools` โดยมี `workspace_type = personal` เพื่อให้ใช้ schema และ Feature เดิมได้ครบ แต่แยกข้อมูลจากโรงเรียนจริง ผู้ซื้อเข้าใช้งานด้วยบทบาท `teacher` และทำงานแบบ self-service โดยสร้างวิชา กลุ่มเรียน และผู้เรียนเอง ระบบสร้างเพียง tenant, ปีการศึกษาปัจจุบัน และภาคเรียนเริ่มต้นให้ การซื้อแพ็กเกจบุคคลครั้งต่อไปจะใช้ `school_id` ภายในตัวเดิม และรวม Feature จาก License ที่ยัง active ทั้งหมดโดยไม่สร้างข้อมูลซ้ำ

## Contract ระหว่าง Marketplace กับ E-KRU

### เริ่ม Trial, ซื้อใหม่ และต่ออายุ

เรียก `POST /api/internal/marketplace/provision` พร้อม header:

```text
Authorization: Bearer <MARKETPLACE_PROVISION_SECRET>
```

ตัวอย่าง payload:

```json
{
  "orderItemId": "UUID ใหม่ของแต่ละ Trial/การซื้อ/การต่ออายุ",
  "buyerAuthUserId": "Supabase Auth user UUID",
  "licenseScope": "individual",
  "planCode": "PERSONAL_ALL",
  "featureKeys": ["teacher.assignments", "teacher.qr_attendance"],
  "expiresAt": "2026-09-03T00:00:00.000Z"
}
```

- การต่ออายุใช้ `orderItemId` ใหม่ ห้ามเปลี่ยน payload ของ idempotency key เดิม
- License ใหม่จะผูก Personal Workspace เดิมผ่าน `buyerAuthUserId`
- สิทธิ์ใช้งานจริงคือผลรวมของทุก License ที่ `active` และยังไม่ถึง `expires_at`
- ราคา รอบเรียกเก็บ และระยะเวลาขายเป็นข้อมูลของ Marketplace เท่านั้น

### หมดอายุ ยกเลิก หรือคืนเงินก่อนกำหนด

วันหมดอายุปกติไม่ต้องส่ง webhook เพิ่ม เพราะ E-KRU ตรวจ `expires_at` ทุกครั้ง หากต้องตัดสิทธิ์ก่อนวันหมดอายุ ให้เรียก `PATCH /api/internal/marketplace/provision`:

```json
{
  "orderItemId": "UUID ของรายการเดิม",
  "status": "revoked",
  "reason": "ยกเลิกหรือคืนเงิน",
  "graceUntil": null
}
```

`status` รองรับ `expired`, `revoked` และ `refunded`

### One-time SSO

Marketplace สร้าง JWT อายุไม่เกิน 60 วินาทีด้วย `MARKETPLACE_SSO_SECRET` และส่งผู้ใช้ไปที่:

```text
/auth/marketplace-sso?ticket=<JWT>&returnTo=/teacher
```

JWT ต้องใช้ `HS256` และมี claim:

```json
{
  "sub": "Supabase Auth user UUID",
  "jti": "UUID ที่ไม่เคยใช้",
  "iss": "ekru-marketplace",
  "aud": "ekru-app",
  "iat": 1785686400,
  "exp": 1785686460
}
```

E-KRU จะตรวจลายเซ็น ตรวจ `marketplace_users` และ `app_users` ผ่าน `auth_user_id`, บันทึก `jti` เพื่อป้องกัน replay แล้วออก httpOnly Session cookie ของ E-KRU

## พฤติกรรมเมื่อ License หมดอายุ

- Proxy ฝั่ง Server ตรวจ License ก่อนเปิด `/admin`, `/teacher`, `/student` และ API ที่มี Session
- หากไม่มี License ที่ใช้งานได้ หน้าเว็บจะ redirect ไป `/license-expired`
- API จะตอบ `403` พร้อม `code: LICENSE_EXPIRED`
- ข้อมูล Workspace ไม่ถูกลบ
- เมื่อต่ออายุด้วย order item ใหม่ ระบบจะเปิด Workspace เดิมทันที

## จุดสำคัญในการสร้างสินค้า Marketplace

- `grants_feature_keys` ต้องมี Feature key เดียวกับ `ekru_apps.required_feature_key`
- Scope สินค้าต้องตรงกับ `supported_scope`
- `grants_plan_code` ต้องตรงกับ plan code ที่ส่งมา Provision
- Order ต้องมีสถานะ `paid` หรือ `completed`
- Provision ใช้ `orderItemId` เป็น idempotency key ห้ามนำไปใช้ซ้ำกับ payload อื่น
- Endpoint ภายในต้องส่ง secret ตาม `MARKETPLACE_PROVISION_SECRET`

## การ Login

- ใช้ Google Client ID จาก `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Marketplace และ E-KRU ต้องใช้ Supabase Auth ชุดเดียวกัน เพื่อให้ `auth_user_id` ตรงกัน
- สำหรับข้ามโดเมน ให้ใช้ One-time SSO ticket ไม่ส่ง Supabase access token ผ่าน URL
- บัญชีที่มีเฉพาะ License บุคคลจะถูกพาไปยังระบบย่อยแรกที่ตรงกับ Feature
- บัญชีโรงเรียนจะเข้า dashboard ตาม role และสามารถเปิดระบบย่อยผ่าน `/launch`
- บัญชีที่ไม่มี License จะแสดงข้อความ login กลางว่า `ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง`

## Checklist ทดสอบ

1. เปิดใช้งาน App ในเมนู Master Admin → ระบบย่อย E-KRU
2. ตรวจ Code, Launch path, Feature key และ Scope
3. ซื้อสินค้าด้วย Google บัญชีทดสอบ
4. ตรวจ `marketplace_provision_events`, License และ `ekru_app_workspaces`
5. Login E-KRU ด้วย Google บัญชีเดียวกัน
6. เปิด `/launch?app=CODE`
7. ทดสอบหมดอายุ/ยกเลิก License ว่าหน้าเว็บไป `/license-expired` และ API ตอบ `LICENSE_EXPIRED`
8. ต่ออายุด้วย order item ใหม่และตรวจว่าเปิด Workspace พร้อมข้อมูลเดิมได้

## ไฟล์หลักที่เกี่ยวข้อง

- `src/lib/ekru-app-access.ts` — ตรวจสิทธิ์และหา/สร้าง Workspace
- `src/app/launch/route.ts` — จุดเข้าโดยใช้ App Code
- `src/app/apps/[slug]/page.tsx` — หน้าปลายทางตัวอย่างและตรวจ `workspaceId`
- `src/app/api/internal/marketplace/provision/route.ts` — รับผลซื้อและ Provision
- `src/app/api/auth/google/route.ts` — Login และหา landing page ของผู้ซื้อบุคคล
- `src/app/auth/marketplace-sso/route.ts` — แลก One-time SSO ticket เป็น Session ของ E-KRU
- `src/proxy.ts` — บล็อกหน้าเว็บและ API เมื่อ License หมดอายุ
- `src/sections/ekru-app/view/ekru-app-list-view.tsx` — UI ตั้งค่าและวิธีใช้งาน
