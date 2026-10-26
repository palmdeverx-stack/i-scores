## Prerequisites

- Node.js >=22 (Recommended)

## Installation

Copy `.env.example` to `.env` and set `MASTER_ADMIN_PIN` to the 8-digit PIN used by
`master_admin` accounts. School administrators use their school's 8-digit code as the PIN.

**Using Yarn (Recommended)**

```sh
yarn install
yarn dev
```

**Using Npm**

```sh
npm i
npm run dev
```

## งานพัสดุ

ติดตั้งฐานข้อมูลด้วย migration
`supabase/migrations/20261024090000_school_inventory.sql` ผ่านกระบวนการ migration
ของโปรเจกต์ หรือรันไฟล์ทั้งหมดใน Supabase SQL Editor ก่อนใช้งานครั้งแรก

ผู้ดูแลโรงเรียนเข้า `/admin/inventory` เพื่อเพิ่มทะเบียนวัสดุ บันทึกรับเข้า–เบิกจ่าย
และดูยอดคงเหลือ ครูเข้า `/teacher/inventory` หลังได้รับสิทธิ์ “งานพัสดุ”
จากหน้าจัดการสิทธิ์บุคลากร หรือมอบหมายผ่านสิทธิ์งานฝ่าย
ระดับดูข้อมูลอ่านทะเบียนและประวัติได้ ระดับจัดการเพิ่ม/แก้ไขทะเบียนและทำรายการได้
หลังเปลี่ยนสิทธิ์ ให้ครูเข้าสู่ระบบใหม่

หมวดหมู่และหน่วยนับเลือกจากข้อมูลกลางของโรงเรียน ติดตั้งเพิ่มเติมด้วย
`supabase/migrations/20261024100000_inventory_master_data.sql`
migration นี้นำค่าเดิมมาเป็นข้อมูลกลางและเพิ่มค่าเริ่มต้น
ติดตั้ง `supabase/migrations/20261024110000_inventory_master_management.sql`
เพื่อใช้หน้าข้อมูลหลัก “หมวดหมู่พัสดุ” และ “หน่วยนับพัสดุ”
รูปแบบเดียวกับหน้าตำแหน่ง รองรับชื่ออังกฤษ ลำดับ เปิด/ปิดใช้งาน และลบรายการที่ยังไม่มีการอ้างอิง
ผู้มีสิทธิ์จัดการเข้าได้จากเมนูข้อมูลหลักหรือปุ่ม “หมวดหมู่ / หน่วยนับ”
การเปลี่ยนชื่อจะอัปเดตรายการพัสดุที่อ้างอิงด้วย

ติดตั้ง `supabase/migrations/20261024130000_inventory_category_auto_codes.sql`
เพื่อสร้างรหัสพัสดุอัตโนมัติแยกตามโรงเรียนและหมวดหมู่เมื่อบันทึก
เช่น `OFF-001`, `EDU-001` หมวดหมู่เพิ่มเติมใช้ `CAT001-001`
ระบบต่อเลขจากรหัสที่มีอยู่ รหัสเดิมไม่เปลี่ยนเมื่อแก้ไขชื่อหรือหมวดหมู่

ทะเบียนใหม่เริ่มที่ยอดศูนย์ ใช้รายการรับเข้าเพื่อบันทึกยอดตั้งต้น
การเบิกจ่ายต้องระบุผู้รับและไม่เกินยอดคงเหลือ ประวัติแสดงล่าสุด 100 รายการ
โมดูลเริ่มต้นนี้ใช้กับวัสดุที่นับจำนวน ยังไม่รวมยืมคืนรายชิ้นและจัดซื้อจัดจ้าง

ตรวจ API ด้วย `node --test tests/inventory-api.test.mjs`

## Build

```sh
yarn build
# or
npm run build
```

## Mock server

By default we provide demo data from : `https://api-dev-minimal-[version].vercel.app`

To set up your local server:

- **Guide:** [https://docs.minimals.cc/mock-server](https://docs.minimals.cc/mock-server).

- **Resource:** [Download](https://www.dropbox.com/scl/fo/bopqsyaatc8fbquswxwww/AKgu6V6ZGmxtu22MuzsL5L4?rlkey=8s55vnilwz2d8nsrcmdo2a6ci&dl=0).

## Full version

- Create React App ([migrate to CRA](https://docs.minimals.cc/migrate-to-cra/)).
- Next.js
- Vite.js

## Starter version

- To remove unnecessary components. This is a simplified version ([https://starter.minimals.cc/](https://starter.minimals.cc/))
- Good to start a new project. You can copy components from the full version.
- Make sure to install the dependencies exactly as compared to the full version.

---

**NOTE:**
_When copying folders remember to also copy hidden files like .env. This is important because .env files often contain environment variables that are crucial for the application to run correctly._

### ใบรับเข้าและเบิกจ่ายหลายรายการ

ติดตั้ง `supabase/migrations/20261024160000_inventory_movement_documents.sql`
เพื่อใช้หนึ่งใบต่อหลายรายการ (สูงสุด 100 รายการ) ฟอร์มรองรับเพิ่ม/นำรายการออก
และไม่ให้พัสดุซ้ำในใบเดียวกัน ผู้ส่งมอบ/ผู้รับและหมายเหตุใช้ร่วมกันทั้งใบ
ระบบตรวจทุกบรรทัดและบันทึกในธุรกรรมเดียว หากยอดไม่พอจะไม่เปลี่ยนยอดบางส่วน
การส่งซ้ำด้วยรหัสใบเดิมไม่เพิ่ม/ตัดสต็อกซ้ำ ประวัติแสดงเลขที่ใบเดียวกันในแต่ละบรรทัด
รายการเคลื่อนไหวเดิมยังคงอยู่และแสดงเป็น “รายการเดิม”

### ขั้นตอนขออนุมัติพัสดุ (STOCK)

ติดตั้ง `supabase/migrations/20261024170000_inventory_approval_workflow.sql`
หลัง migrations งานพัสดุก่อนหน้า เพื่อเปลี่ยนขั้นตอนการทำรายการ:

- ใบขอเบิก: สร้างหลายรายการและส่งอนุมัติ สถานะ “รออนุมัติ” ยังไม่ตัด/สำรองสต็อก
- อนุมัติใบขอเบิก: ผู้ดูแลโรงเรียน หรือผู้ได้รับสิทธิ์จัดการ “อนุมัติพัสดุ”
  ตรวจสอบรายการและอนุมัติทั้งใบ ระบบตรวจยอดคงเหลืออีกครั้งแล้วตัดสต็อกในธุรกรรมเดียว
- ไม่อนุมัติ: ต้องระบุเหตุผล ไม่เปลี่ยนยอดสต็อก
- รับเข้า: ระบุเลขที่ใบส่งของ/เอกสารและวันที่เอกสาร พร้อมรายการพัสดุในใบนั้น
  เมื่อบันทึกสำเร็จจะเพิ่มยอดสต็อกทั้งใบ
- เอกสารเก่าที่บันทึกสต็อกแล้วไม่ถูกตัด/เพิ่มซ้ำ

เมนู `/admin/inventory/issue` และ `/teacher/inventory/issue` แสดงใบขอเบิก
เมนู `/admin/inventory/approvals` และ `/teacher/inventory/approvals` แสดงคิวรออนุมัติ
หลังเปลี่ยนสิทธิ์ ให้ผู้ใช้ออกจากระบบและเข้าสู่ระบบใหม่

### ขอจัดซื้อจนรับเข้า พร้อมแนบใบสั่งซื้อ

ติดตั้ง `supabase/migrations/20261024190000_inventory_purchasing.sql`
หลัง migrations ก่อนหน้า แล้วใช้เมนู **งานพัสดุ → จัดซื้อพัสดุ**:

1. สร้างใบขอจัดซื้อหลายรายการ พร้อมเหตุผลความจำเป็น แล้วส่งอนุมัติ
2. ผู้ดูแลหรือผู้ได้รับสิทธิ์ “อนุมัติพัสดุ” พิจารณาผ่านเมนู “อนุมัติจัดซื้อ”
3. หลังอนุมัติ ผู้ดูแลพัสดุระบุผู้จำหน่าย เลขที่/วันที่ใบสั่งซื้อ
   และแนบ PDF/JPG/PNG/WebP ไม่เกิน 10 MB ก่อนบันทึกสั่งซื้อ
4. กด “รับของตามใบสั่งซื้อ” เพื่อดึงจำนวนค้างรับเข้าสู่ฟอร์มรับเข้า
   ระบุเลขที่ใบส่งของ/เอกสารรับเข้า และบันทึกจำนวนที่รับจริง
5. รับบางส่วนได้หลายครั้ง ระบบไม่ให้เกินยอดที่อนุมัติ และปิดใบเมื่อรับครบ

ใบขอจัดซื้อ/ใบสั่งซื้อไม่เปลี่ยนยอดสต็อก จนกว่าจะบันทึกรับเข้า
ไฟล์ใบสั่งซื้อเก็บแบบส่วนตัว แก้ไขได้ก่อนบันทึกสั่งซื้อ
ข้อมูลรับเข้าอ้างอิงใบจัดซื้อและใบสั่งซื้อไว้สำหรับตรวจสอบย้อนหลัง

### แบบร่างใบขอจัดซื้อ

ติดตั้ง `supabase/migrations/20261024200000_inventory_purchase_drafts.sql`
เพื่อใช้ปุ่ม “บันทึกแบบร่าง” ในหน้าเพิ่ม/แก้ไขใบขอจัดซื้อ
แบบร่างต้องมีหัวข้อ แต่ยังไม่จำเป็นต้องมีเหตุผลหรือรายการครบถ้วน
บันทึกเฉพาะบรรทัดที่เลือกพัสดุแล้ว (จำนวนต้องถูกต้อง)
เปิดใบจากหน้ารายการแล้วกด “แก้ไขแบบร่าง / ส่งอนุมัติ” เพื่อทำต่อ
เฉพาะเจ้าของแบบร่างหรือผู้ดูแลโรงเรียนที่มีสิทธิ์จัดการจะแก้ไขได้
เมื่อส่งอนุมัติแล้วจะแก้ไขไม่ได้ แบบร่างไม่อยู่ในคิวอนุมัติและไม่เปลี่ยนสต็อก

### ประเภทพัสดุและทะเบียนครุภัณฑ์

ติดตั้ง `supabase/migrations/20261024210000_inventory_equipment_registry.sql`
เพื่อแยกข้อมูลหลักเป็น “วัสดุ” (ชนิดเริ่มต้น: วัสดุสิ้นเปลือง) และ “ครุภัณฑ์”
รายการเดิมยังเป็นวัสดุสิ้นเปลือง ให้ตรวจและเปลี่ยนประเภทตามของจริง

วัสดุสิ้นเปลืองใช้ขั้นตอนรับเข้าและใบขอเบิกเดิม
ครุภัณฑ์รับเข้าได้ตามใบสั่งซื้อ จากนั้นไป **คลังพัสดุ → ทะเบียนครุภัณฑ์ / นำไปใช้งาน**
ขึ้นทะเบียนหนึ่งรายการต่อหนึ่งชิ้น ระบุเลขทะเบียน หมายเลขเครื่อง วันที่ได้มา และมูลค่า
อ้างอิงรายการรับเข้าจริงและขึ้นทะเบียนได้ไม่เกินยอดที่รับ/ยอดครุภัณฑ์คงเหลือ
หลังขึ้นทะเบียนจึงระบุผู้รับผิดชอบและสถานที่จาก master เพื่อยืนยันนำไปใช้งาน
ระบบไม่ให้ครุภัณฑ์ผ่านใบเบิกวัสดุสิ้นเปลือง และไม่ให้เปลี่ยนประเภทหลังขึ้นทะเบียน
จำนวนใน stock ของครุภัณฑ์ยังเป็นจำนวนรวม ส่วนการใช้งานติดตามจากสถานะทะเบียนรายชิ้น

## เอกสารจากแม่แบบ

ติดตั้ง `supabase/migrations/20261024230000_editable_user_documents.sql`
เพื่อใช้หน้า `/admin/documents/new` และ `/teacher/documents/new`
เลือกแม่แบบจากรายการ หรือกด “ใช้แม่แบบนี้” ในหน้าตัวอย่างเอกสาร
ระบบคัดลอกข้อความตัวอย่างเป็นเนื้อหาของฉบับใหม่ แก้ไขโดยไม่กระทบแม่แบบกลาง
ข้อมูลโรงเรียน รหัสต้นหนังสือ และผู้จัดทำถูกเติมให้เริ่มต้น

บันทึกเป็นฉบับร่าง แล้วเปิดแก้ไขต่อที่ “เอกสารของฉัน” (`/documents/my/[id]`)
บันทึกข้อความรองรับส่วนราชการ เลขที่ วันที่ เรื่อง ผู้รับ เนื้อความ และผู้ลงนาม
แม่แบบอื่นรองรับเนื้อหาแยกตามหัวข้อ
กด “อัปเดตพรีวิว / ดาวน์โหลด PDF” เพื่อสร้างพรีวิวจากข้อมูลล่าสุดในฟอร์ม
เอกสารที่ส่งแล้วดูและดาวน์โหลดได้ แต่แก้ไขไม่ได้

### รันเลขที่เอกสารต่อจากเลขปัจจุบัน

ติดตั้ง `supabase/migrations/20261024233000_school_document_sequence.sql`
แล้วตั้งค่า **เลขที่เอกสารล่าสุด / เลขตั้งต้น** ใน `/admin/school`
ใส่เลขที่ใช้แล้ว เช่น 100 ฉบับใหม่จะได้ `รหัสต้นหนังสือ/101` เมื่อบันทึกครั้งแรก
ใช้ลำดับร่วมกันภายในโรงเรียน ไม่เปลี่ยนเลขเมื่อแก้ไขเอกสารเดิม
เลขก่อนบันทึกเป็นเลขประมาณการ ตัวจริงกำหนดในธุรกรรมเดียวกับการสร้างเอกสาร
ไม่ให้ลดเลขล่าสุดเพื่อป้องกันใช้เลขซ้ำ และไม่คืนเลขของฉบับร่างที่ลบแล้ว
เอกสารเก่าก่อนติดตั้ง migration คงเลขเดิมไว้ จึงควรตั้งเลขล่าสุดให้ถูกต้องก่อนสร้างฉบับใหม่

### จองเลขเอกสารล่วงหน้า

ติดตั้ง `supabase/migrations/20261024234500_document_number_reservations.sql`
หลัง migration รันเลขเอกสาร แล้วกด “จองเลขล่วงหน้า” ใน “เอกสารของฉัน”
หรือเปิด `/admin/documents/reserve` (`/teacher/documents/reserve` สำหรับครู)
ระบุแม่แบบ เรื่อง/โครงการ และวันวางแผนจัดทำได้ โดยยังไม่ต้องมีเนื้อหา
ระบบออกเลขจริงและบันทึกสถานะ “จองเลขแล้ว” ทันที
กลับมาเติมเนื้อหาจากรายการเดิมแล้วบันทึกเป็นฉบับร่างโดยไม่ออกเลขใหม่
ยกเลิกการจองได้ แต่ไม่คืนเลขเข้าสู่ลำดับ และใบจองยังไม่สามารถส่งดำเนินการจนกว่าจะเติมเนื้อหา

### Realtime task badges (Supabase Broadcast)

1. Run `supabase/migrations/20261025010000_task_notifications_realtime.sql`
   in Supabase SQL Editor after the inventory purchasing and lesson-plan migrations.
   This creates three database triggers, a receive-only `task_realtime` database
   role, and private Broadcast authorization policies. Do not create duplicate
   triggers through the Dashboard wizard.
2. Set server-only `SUPABASE_REALTIME_JWT_SECRET` in the local `.env` and the
   deployment environment. It must be an HS256 signing secret **accepted by the
   same Supabase project's Realtime service**, not `AUTH_JWT_SECRET`, an API key,
   or the service-role key. For projects still accepting the legacy JWT secret,
   use that secret from Supabase's JWT settings. For projects using only new
   signing keys, provision an accepted signing key first; an arbitrary secret
   will not work. Do not rotate or re-enable old signing keys just for this feature.
   Keep this value server-side; never use a `NEXT_PUBLIC_` prefix or commit it.
3. Restart/redeploy the app. In Supabase Realtime Settings, disable Allow public
   access if the project has no other feature that requires public channels.
   The app explicitly uses private channels regardless of that global setting.
4. Sign in using two different accounts in the same school: a requester and an
   authorized approver. Submit a purchase, issue request, or lesson plan. The
   approver's menu badge should update without refreshing. Reviewing the request
   removes it from the count. The requester's own submissions are excluded.
5. Verify the browser Network panel: `/api/navigation/realtime-session` returns
   `enabled: true` and the Realtime WebSocket connects. A different school must
   not be able to join the topic. A user without review/approval rights receives only their inbox and school
   invalidation topics, without approval topics. Do not copy bearer tokens into logs or screenshots.

The token lasts at most five minutes and cannot outlive the app session. Its
custom Postgres role is separate from Supabase Auth sessions. Broadcasts contain
only an empty `tasks.changed` invalidation signal; the existing API applies user,
permission and school filters when fetching counts. Subscriptions renew and
refresh data on reconnect, and are cleaned up on logout/account changes. Counts
still refresh every minute if Realtime is not configured or temporarily offline.
SQL trigger delivery errors are logged as database warnings without failing the
business transaction. Integration needs verification against the target Supabase
project after applying the migration and configuring its signing secret.

### In-app notification inbox

Run `supabase/migrations/20261025020000_notification_inbox_events.sql` after the
Realtime migration above, then restart the app so renewed tokens include the inbox
channels. The notification bell now receives all rows inserted into the existing
`notifications` table through a private per-user channel, including existing
schedule approvals, grade reminders and Marketplace invitations.

New automatic events:

- Purchase request submission -> authorized purchase approvers.
- Issue request submission -> authorized stock approvers.
- Lesson-plan submission -> authorized lesson-plan reviewers.
- Approval/rejection/revision -> the request owner, with the review note.
- Purchase order/partial receipt/full receipt -> the purchase requester.
- New duty assignment -> the assigned teacher.

School administrators can also open the bell and select the internal notification
compose action. Choose up to 100 active recipients in the same school, then enter
the title and message. This is in-app delivery only; it sends no email or LINE
message and does not create a task badge.

Workflow events are queued transactionally in `notification_events`. An inbox
refresh claims up to ten events for its school, resolves current reviewer rights,
creates per-user messages, and acknowledges each successfully delivered event.
Two-minute leases allow retry after process failure. Unique recipient/event keys
prevent duplicate messages. Pending events are picked up on the next staff inbox
refresh/login even if no client was online when the workflow changed. This uses
read-driven delivery rather than a continuously running background worker; busy
schools can add a scheduled worker later. No historical backfill is performed.

The unread badge counts all unread messages, while the dropdown shows the latest
30. Reading a message does not complete the underlying task. Menu task badges
continue to count only submissions from other people that require the current
user's review. Missing Realtime configuration falls back to 30-second inbox
polling. Test on the target Supabase project: requester/reviewer in one school,
an unrelated school, an ordinary teacher, and two browser tabs for read-state sync.

### Return materials and equipment

Apply `supabase/migrations/20261025030000_inventory_returns.sql` after the equipment
registry and notification inbox migrations. Open `/admin/inventory/returns`
(or `/teacher/inventory/returns` for delegated inventory staff), or select the
return action from a posted issue document or an in-use asset's registry row.

- Material returns reference a posted issue document. One return may contain
  multiple items; partial returns are supported. Only unused/serviceable material
  should be returned to available stock. The server rejects quantities above the
  original issued quantity minus all previous returns. Source-document and item
  row locks serialize competing returns, and the stock movement and return audit
  commit together. Return receipts are visible in stock history as returns.
- Equipment returns reference individual registered assets currently in use.
  The custody activation timestamp prevents stale forms returning a later custody
  cycle. Serviceable equipment becomes available (`registered`) again; damaged
  equipment becomes `maintenance` and cannot be activated. Equipment totals do
  not increase. The return stores the previous custodian/location and condition.
  A repair/release-from-maintenance workflow is not included in this migration.
- Inventory managers record actual receipt immediately; these are not requests
  awaiting a second approval. Returns are immutable through the API and retries
  use an idempotent UUID. Each receipt stores the receiving staff member, return
  date, returner, reason and original source. Material request owners receive an
  inbox notification when another staff member records a return against their
  issue. Asset custodians are currently free text, so they are not guessed or
  matched to user accounts for notifications.
- The list/source pickers use the latest 100 entries, with search and client-side
  pagination on the loaded return list. Existing source IDs passed from issue
  actions are loaded directly even when outside the source-picker window.

Validation: `node --test tests/inventory-return-api.test.mjs`. SQL checks use an
optional temporary PostgreSQL-compatible engine (not an app dependency):

```sh
npm install --prefix /tmp/i-scores-return-sql-test @electric-sql/pglite --ignore-scripts --no-audit --no-fund
INVENTORY_TEST_PGLITE_MODULE=/tmp/i-scores-return-sql-test/node_modules/@electric-sql/pglite/dist/index.js node --test tests/inventory-return-database.test.mjs
```

The SQL tests cover stock restoration, over-return rejection, atomic rollback,
idempotent retries, duplicate lines, school isolation, audit snapshots, custody
cycles and preventing activation of damaged assets. Real concurrent transactions
and the browser flow should also be verified on the target Supabase project.

### Navigation and personal access

School menus are organized centrally in
`src/layouts/organize-school-navigation.ts`: personal work, teaching, review and
approval, academic administration, inventory, documents, people, communication,
master data and school/access settings. Master-admin and student menus remain
separate role workspaces. Existing URLs, feature keys, permission keys and
notification badge paths are preserved. Staff, academic and inventory master
menus are split into separate submenus.

Access follows the existing server model: role/workspace boundaries first;
department grants and staff-type defaults provide baseline access; individual
`none`, `view` and `manage` overrides take precedence. View access does not imply
management or approval. Read-only management menus show a View only caption.
Personal documents use their existing owner-scoped access permission, which
permits editing one's own documents without granting school-wide management.
Manage-level page guards protect existing management create/edit routes, while
API routes remain responsible for permissions, ownership and school isolation.
Director status by itself does not grant approval rights.

In **School settings and access → Staff type and individual access → Individual**,
select a staff member and use the menu-preview button to see their saved,
server-resolved navigation including school-plan filtering. The preview is
school-admin-only and cannot look up another school's profiles. Unsaved changes
are not included. Open clients refresh their session/permissions every minute
while visible, or when returning to the tab (throttled to 30 seconds); backend
permission checks still apply immediately to every action.

No SQL migration is required for this navigation change. Validate with:

```sh
node --test tests/navigation-access.test.mjs tests/navigation-permission-resolution.test.mjs tests/staff-menu-preview.test.mjs tests/navigation-task-counts.test.mjs
```

Teacher teaching APIs also use `src/lib/teacher-work-access.ts` in their route
handlers: course assignments/scores, attendance scanning, timetable and teacher
announcements now distinguish view from manage rights. Delegated timetable and
school-announcement managers retain their explicit management capabilities.
Lesson creation/edit/copy requires teaching management; submitting/archiving a
lesson checks owner management separately from reviewer approval rights. Existing
ownership, school and feature checks still run after this capability gate.

```sh
node --test tests/teacher-work-access.test.mjs
```

Navigation labels include Thai and English translations. The saved-menu preview
shows inactive accounts as unable to access the workspace. Reading a review queue
never grants the corresponding decision action; explicit individual denial is
not restored by the grade-review read-compatibility mapping.

### LINE Login ผ่าน LIFF สำหรับครูเดิม

รัน migration `supabase/migrations/20261026010000_teacher_line_login.sql` ก่อนเปิดใช้งาน หากรันแล้วไม่ต้องรันซ้ำ ตารางเดิมรองรับ LIFF ได้โดยไม่ต้องเพิ่ม migration ใหม่ ตั้งสองตัวแปรนี้ให้เป็นของ E-KRU แยกจาก Marketplace:

```ini
NEXT_PUBLIC_LIFF_ID=2012217961-zWHJVvh5
LINE_LOGIN_CHANNEL_ID=2012217961
```

ใน LINE Developers เลือก LINE Login channel `2012217961` และ LIFF app ที่ตรงกัน ตั้ง Endpoint URL เป็น `https://<โดเมน-E-KRU>/auth/line` เปิด scopes `openid` และ `profile` ค่า Endpoint ต้องเป็นโดเมนที่ deploy โปรเจกต์ E-KRU นี้ ไม่ใช่ `e-kru-marketplace.com` และเปิด channel ให้ผู้ใช้งานจริงตามการตั้งค่าของ LINE Developers โค้ดนี้ใช้ LIFF SDK จึงไม่ต้องตั้ง `LINE_LOGIN_CHANNEL_SECRET` หรือ `LINE_LOGIN_CALLBACK_URL` หลังเปลี่ยน `NEXT_PUBLIC_LIFF_ID` ต้อง build/deploy ใหม่

ครูเข้าสู่ระบบด้วยรหัสผ่านหรือ Google เดิม → โปรไฟล์ → “เข้าสู่ระบบด้วย LINE” → เชื่อม LINE Login → ยืนยันบัญชี LINE และบัญชีครูบนหน้าจออีกครั้ง ครั้งถัดไปใช้ปุ่ม LINE ในหน้าเข้าสู่ระบบได้ ระบบใช้ cookie/session และ guard ครู โรงเรียน และแพ็กเกจเดิม ไม่สร้าง `app_users` หรือโรงเรียน ไม่จับคู่ด้วยอีเมล/ชื่อจาก LINE และไม่เปลี่ยนการเชื่อม LINE แจ้งเตือน

สำหรับ LINE MINI App ให้ใช้ LIFF ID และ channel ID ของ stage เดียวกัน และตั้ง Endpoint URL ของ stage นั้นเป็น `/auth/line` หาก SDK ยังไม่ส่ง ID token โค้ดจะตรวจ permission และเรียก `permission.requestAll()` เฉพาะเมื่อยังมีสิทธิ์ที่รอความยินยอม จากนั้นอ่าน token ใหม่หนึ่งครั้ง หากไม่มี token หรือผู้ใช้ไม่อนุญาตจะไม่ออก session และไม่ส่ง profile มาใช้แทนหลักฐานยืนยันตัวตน

LINE หนึ่งบัญชีเชื่อมได้กับครูหนึ่งบัญชี และครูหนึ่งบัญชีเชื่อม LINE Login ได้หนึ่งบัญชี การเปลี่ยนหรือยกเลิกการเชื่อมต้องเข้าสู่ระบบเดิมด้วยรหัสผ่าน/Google ก่อน การยกเลิกจะเพิกถอน session ที่เข้าผ่าน LINE โดยไม่กระทบ session ผ่านช่องทางเดิม ผู้เข้าสู่ระบบผ่าน LINE ต้องเข้าบัญชีเดิมด้วยรหัสผ่าน/Google หากต้องการสลับ workspace

LIFF SDK จัดการ LINE login บนหน้า `/auth/line` แล้วส่ง raw ID token จาก `liff.getIDToken()` ให้ `/api/auth/line/verify` ตรวจที่ LINE ฝั่งเซิร์ฟเวอร์ พร้อมตรวจ issuer, channel ID และอายุ token ไม่ใช้ decoded profile จากไคลเอนต์เป็นหลักฐานยืนยันตัวตน ระบบผูกคำขอเข้ากับ HttpOnly cookies สองตัว จำกัดอายุ 10 นาที ใช้ได้ครั้งเดียว ตรวจ same-origin สำหรับ POST และตรวจ session เดิมอีกครั้งก่อนเชื่อมบัญชี ไม่เก็บ ID/access/refresh token ในฐานข้อมูล ตารางเชื่อมบัญชีเข้าถึงผ่าน service role เท่านั้น ทดสอบการเชื่อม/ล็อกอิน/ยกเลิกบนโดเมน E-KRU จริงก่อนเปิดใช้งาน

เอกสาร LINE: [การส่ง ID token ให้เซิร์ฟเวอร์ตรวจสอบ](https://developers.line.biz/en/docs/liff/using-user-profile/) และ [การพัฒนา LIFF app](https://developers.line.biz/en/docs/liff/developing-liff-apps/)

ทดสอบ: `node --test tests/line-login*.test.mjs` ส่วน SQL integration test ใช้ PostgreSQL-compatible PGlite ภายนอก project dependencies: ตั้ง `LINE_LOGIN_TEST_PGLITE_MODULE` เป็น absolute path ของ `@electric-sql/pglite/dist/index.js` แล้วรันคำสั่งเดิม (ถ้าไม่ตั้งจะข้ามเฉพาะ SQL test)

### Marketplace SSO: authorization code + PKCE

ใช้ migration `supabase/migrations/20261026020000_marketplace_code_sso.sql` ก่อนเปิด receiver รุ่นนี้ ตั้ง `MARKETPLACE_SSO_SECRET` เป็น secret สุ่มอย่างน้อย 32 ตัวอักษรที่ตรงกันทั้ง E-KRU และ Marketplace เก็บเฉพาะฝั่งเซิร์ฟเวอร์ ไม่ใช้ `NEXT_PUBLIC_` ไม่ commit secret จริง และ restart/deploy หลังเปลี่ยนค่า

ปุ่ม “เปิดใช้งาน E-KRU” ใน Marketplace ให้เปิด:

```text
https://e-kru.com/auth/marketplace/start?returnTo=%2Faccount%2Fapps
```

เปิดแอปที่ซื้อโดยตรงได้ด้วย `returnTo=%2Flaunch%3Fapp%3DCHAT_AI` ระบบตรวจ License ก่อนเข้าสู่แอป ไม่รับ URL ภายนอกหรือเส้นทาง API/auth callback เป็น returnTo

E-KRU สร้าง state และ PKCE S256 แล้ว redirect ไป `https://e-kru-marketplace.com/api/sso/authorize` โดยใช้ redirect URI ตายตัว `https://e-kru.com/auth/marketplace/callback` เก็บ verifier/state/returnTo ใน encrypted HttpOnly Secure SameSite=Lax cookie อายุไม่เกิน 5 นาที พร้อม transaction ฝั่งฐานข้อมูล callback ตรวจ browser/state/expiry แล้ว claim transaction และ hash ของ code แบบใช้ครั้งเดียว ก่อนส่ง POST ไป `https://e-kru-marketplace.com/api/sso/exchange` พร้อม Bearer secret, code, code_verifier และ redirect_uri

Marketplace ต้อง allowlist redirect URI ให้ตรงทุกตัวอักษร ผูก code กับ PKCE challenge และ redirect URI และปฏิเสธ code ที่หมดอายุ 60 วินาทีหรือใช้ซ้ำ E-KRU ไม่สามารถทราบเวลาออก code แบบ opaque ได้เอง จึงต้องอาศัย exchange endpoint บังคับข้อกำหนดนี้ด้วย E-KRU ปฏิเสธ exchange ที่ไม่สำเร็จ และป้องกันการ replay transaction/code hash ฝั่ง receiver เพิ่มเติม ไม่รับ JWT ticket เก่าที่ `/auth/marketplace-sso` อีกต่อไป เส้นทางเก่าจะเริ่ม flow ใหม่

Response ที่รองรับเป็น JSON object โดยตรง: `issuer`, `subject`, `account_type`, `user_id`, `auth_user_id` (null ได้), `first_name`, `last_name` โดย issuer ต้องเป็น `https://e-kru-marketplace.com` ข้อมูล `user_id` ต้องเป็นรหัสผู้ซื้อ Marketplace ที่เชื่อถือได้จาก endpoint นี้ ใช้จับคู่กับ `marketplace_users.id` เท่านั้น ไม่ใช้ค้นหา `app_users` ทุกครั้งที่พบตัวตนใหม่จะบันทึกคู่ issuer + subject ที่ unique ไม่เปลี่ยนเจ้าของ binding จาก response ครั้งถัดไป และไม่จับคู่ด้วยชื่อ/อีเมล

`auth_user_id` ใช้เป็นทางเลือกจับคู่ได้เฉพาะเมื่อผู้ดูแลยืนยันแล้วว่าทั้งสองระบบใช้ Supabase Auth project เดียวกัน โดยตั้ง `MARKETPLACE_SSO_SHARED_SUPABASE_URL` ให้ตรงกับ project URL ของ Marketplace และ `NEXT_PUBLIC_SUPABASE_URL` ของ E-KRU หากไม่ยืนยันจะไม่ใช้ auth_user_id ค้นหาบัญชี และไม่มีการจับคู่บัญชีครู/ผู้ดูแลอัตโนมัติ

ผู้ซื้อเข้าระบบในบทบาท `marketplace_user` และไป `/account/apps` เห็นเฉพาะแอปที่ตรงกับ License ส่วนบุคคลที่ active อยู่ในช่วง starts_at/expires_at และ feature_keys ของตน ก่อนเปิดแต่ละแอปตรวจสิทธิ์ซ้ำผ่านตัวตรวจเดิม ไม่ให้สิทธิ์โรงเรียนจากการซื้อแพ็กเกจส่วนบุคคล บัญชีใหม่ที่ยังไม่จับคู่ไปหน้า onboarding เพื่อเลือกสร้างบัญชี Marketplace (ไม่สร้างครู โรงเรียน หรือ License) หรือเข้าสู่ระบบ E-KRU เดิมเพื่อยืนยันเชื่อม หากข้อมูล License ยังไม่ได้ sync/provision เข้าฐาน E-KRU จะยังไม่เปิดสิทธิ์จากข้อมูล SSO อย่างเดียว

รองรับผู้ซื้อ LINE ที่ไม่มี auth_user_id โดย marketplace_users.auth_user_id/email เป็น nullable และ workspace ส่วนบุคคลใช้ owner_marketplace_user_id แทน Auth UUID ได้ ไม่ใช้ email จำลองและไม่สร้าง Supabase Auth user ให้อัตโนมัติ Workspace เก่ายังคงเจ้าของเดิม และ workspace ที่ถูก archived จะไม่ถูกเปิดใหม่อัตโนมัติ

การเชื่อมกับบัญชีครู/นักเรียน/ผู้ดูแลต้องยืนยันจาก session E-KRU เดิมที่ active และไม่ใช่ impersonation บัญชีผู้ดูแลที่เชื่อมไว้ต้องยืนยัน PIN เดิมทุกครั้งก่อนออก session SSO ตรวจสถานะบัญชี โรงเรียน แพ็กเกจ และสถานะนักเรียนตามเดิม ผู้ใช้ผ่าน Marketplace SSO ต้องเข้าสู่ระบบช่องทางเดิมหากต้องการสลับ workspace

E-KRU ออก session cookie ของตัวเองโดยผูกกับ identity ที่ยัง active ไม่ใช้ Marketplace token เป็น E-KRU session ไม่ log code/verifier/secret และ redirect callback ออกจาก URL ที่มี code เสมอ ตั้ง no-store/no-referrer สำหรับ flow SSO คำขอค้าง/ยืนยัน PIN เก็บใน encrypted cookie และฐานข้อมูลอายุไม่เกิน transaction เดิม

ตั้งค่า Next.js ให้ไม่เขียน request URL ของ callback และ legacy ticket ลง development log แล้ว หาก production มี reverse proxy, access log หรือระบบ telemetry เพิ่มเติม ต้องตัด query string ของเส้นทางเหล่านี้ออกด้วย เพราะเป็น log ภายนอกโค้ด receiver

ทดสอบ localhost: ตั้ง `MARKETPLACE_SSO_DEV_CALLBACK_URL=http://localhost:3300/auth/marketplace/callback` เฉพาะ development แล้วให้ Marketplace allowlist URI นี้ด้วย ต้องเริ่มจาก hostname เดียวกันตลอด flow และ browser ต้องรองรับ Secure cookies บน localhost Production ไม่อนุญาต override callback URI

ทดสอบด้วย `node --test tests/marketplace-*.test.mjs tests/line-login*.test.mjs tests/auth-home-routing.test.mjs` สำหรับ SQL integration ตั้ง `SSO_TEST_PGLITE_MODULE` และ `LINE_LOGIN_TEST_PGLITE_MODULE` เป็น absolute path ของ `@electric-sql/pglite/dist/index.js` ที่ติดตั้งแยกภายนอก dependency ของแอป หากไม่ตั้งจะข้าม SQL test เท่านั้น ยังต้องทดสอบ end-to-end กับ authorize/exchange ของ Marketplace จริงก่อนเปิด production
