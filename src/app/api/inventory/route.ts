import { z } from 'zod';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canViewViaPermission, canManageViaPermission } from 'src/lib/department-permission-access';

const itemSchema = z
  .object({
    action: z.literal('item'),
    item_type: z.enum(['material', 'equipment']).optional(),
    material_subtype: z.literal('consumable').nullable().optional(),
    description: z.string().trim().max(4000).optional(),
    brand: z.string().trim().max(100).optional(),
    model: z.string().trim().max(100).optional(),
    specifications: z.string().trim().max(4000).optional(),
    barcode: z.string().trim().max(100).optional(),
    reference_price: z.number().finite().min(0).max(999999999999.99).optional(),
    supplier: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(4000).optional(),
    id: z.uuid().optional(),
    code: z.string().trim().max(60).optional(),
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(100),
    unit: z.string().trim().min(1).max(40),
    location: z.string().trim().max(200),
    minimum_stock: z.number().int().min(0).max(1000000000),
    maximum_stock: z.number().int().min(0).max(1000000000).optional(),
  })
  .refine(
    (value) =>
      value.maximum_stock === undefined ||
      value.maximum_stock === 0 ||
      value.maximum_stock >= value.minimum_stock,
    { message: 'MAX ต้องไม่น้อยกว่า MIN', path: ['maximum_stock'] }
  );
const masterSchema = z
  .object({
    action: z.literal('master'),
    kind: z.enum(['category', 'unit', 'location']),
    id: z.uuid().optional(),
    name: z.string().trim().min(1).max(200),
    name_en: z.string().trim().max(200).optional(),
    sort_order: z.number().int().min(0).max(1000000).optional(),
    is_active: z.boolean().optional(),
    remove: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name.length <= (value.kind === 'unit' ? 40 : value.kind === 'category' ? 100 : 200)
  );
const movementSchema = z
  .object({
    action: z.literal('movement'),
    id: z.uuid(),
    item_id: z.uuid(),
    kind: z.enum(['receive', 'issue']),
    quantity: z.number().int().min(1).max(1000000000),
    recipient: z.string().trim().max(200),
    note: z.string().trim().max(1000),
  })
  .refine((value) => value.kind !== 'issue' || value.recipient.length > 0, {
    message: 'กรุณาระบุผู้เบิก',
  });

const documentSchema = z
  .object({
    action: z.literal('movement_document'),
    id: z.uuid(),
    kind: z.enum(['receive', 'issue']),
    recipient: z.string().trim().max(200),
    note: z.string().trim().max(1000),
    source_request_id: z.uuid().nullable().optional(),
    source_purchase_id: z.uuid().nullable().optional(),
    reference_number: z.string().trim().max(200).optional(),
    document_date: z.iso.date().optional(),
    lines: z
      .array(z.object({ item_id: z.uuid(), quantity: z.number().int().min(1).max(1000000000) }))
      .min(1)
      .max(100),
  })
  .superRefine((value, ctx) => {
    if (
      (value.source_purchase_id && value.source_request_id) ||
      (value.kind !== 'receive' && (value.source_request_id || value.source_purchase_id))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['source_request_id'],
        message: 'เชื่อมใบต้นทางได้เฉพาะรับเข้า',
      });
    if (value.kind === 'receive' && (!value.reference_number || !value.document_date))
      ctx.addIssue({
        code: 'custom',
        path: ['reference_number'],
        message: 'กรุณาระบุเลขที่และวันที่เอกสารรับเข้า',
      });
    if (value.kind === 'issue' && !value.recipient)
      ctx.addIssue({ code: 'custom', path: ['recipient'], message: 'กรุณาระบุผู้รับ' });
    if (new Set(value.lines.map((line) => line.item_id)).size !== value.lines.length)
      ctx.addIssue({ code: 'custom', path: ['lines'], message: 'รายการพัสดุซ้ำ' });
  });

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (
    !caller?.schoolId ||
    (!(await canViewViaPermission(caller, 'inventory.manage')) &&
      !(await canViewViaPermission(caller, 'inventory.approve')))
  ) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดูงานพัสดุ' }, { status: 403 });
  }
  const sourceId = new URL(request.url).searchParams.get('request_source');
  const purchaseId = new URL(request.url).searchParams.get('purchase_source');
  if (purchaseId) {
    if (!z.uuid().safeParse(purchaseId).success)
      return NextResponse.json({ message: 'รหัสใบจัดซื้อไม่ถูกต้อง' }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc('inventory_purchase_remaining', {
      p_school: caller.schoolId,
      p_id: purchaseId,
    });
    if (error) return NextResponse.json({ message: 'โหลดรายการค้างรับไม่สำเร็จ' }, { status: 500 });
    return NextResponse.json({ lines: data ?? [] });
  }
  if (sourceId) {
    if (!z.uuid().safeParse(sourceId).success)
      return NextResponse.json({ message: 'รหัสใบขอเบิกไม่ถูกต้อง' }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc('inventory_request_remaining', {
      p_school: caller.schoolId,
      p_id: sourceId,
    });
    if (error) return NextResponse.json({ message: 'โหลดรายการค้างรับไม่สำเร็จ' }, { status: 500 });
    return NextResponse.json({ lines: data ?? [] });
  }
  const [items, movements, categories, units, locations, documents, canManage, canApprove] =
    await Promise.all([
      supabaseAdmin
        .from('inventory_items')
        .select('*')
        .eq('school_id', caller.schoolId)
        .order('name'),
      supabaseAdmin
        .from('inventory_movements')
        .select('*, document:inventory_documents(document_number)')
        .eq('school_id', caller.schoolId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('inventory_categories')
        .select('id, name, name_en, sort_order, is_active')
        .eq('school_id', caller.schoolId)
        .order('name'),
      supabaseAdmin
        .from('inventory_units')
        .select('id, name, name_en, sort_order, is_active')
        .eq('school_id', caller.schoolId)
        .order('sort_order')
        .order('name'),
      supabaseAdmin
        .from('inventory_locations')
        .select('id, name, name_en, sort_order, is_active')
        .eq('school_id', caller.schoolId)
        .order('sort_order')
        .order('name'),
      supabaseAdmin
        .from('inventory_documents')
        .select('*')
        .eq('school_id', caller.schoolId)
        .order('created_at', { ascending: false })
        .limit(100),
      canManageViaPermission(caller, 'inventory.manage'),
      canManageViaPermission(caller, 'inventory.approve'),
    ]);
  if (
    items.error ||
    movements.error ||
    categories.error ||
    units.error ||
    locations.error ||
    documents.error
  ) {
    console.error('Inventory load failed', items.error, movements.error);
    return NextResponse.json(
      { message: 'โหลดข้อมูลพัสดุไม่สำเร็จ กรุณาตรวจสอบว่าได้ติดตั้งฐานข้อมูลงานพัสดุแล้ว' },
      { status: 500 }
    );
  }
  return NextResponse.json({
    items: items.data,
    movements: movements.data,
    categories: categories.data,
    units: units.data,
    locations: locations.data,
    documents: documents.data,
    canManage,
    canApprove,
  });
}

const reviewSchema = z
  .object({
    action: z.literal('review_document'),
    id: z.uuid(),
    approve: z.boolean(),
    note: z.string().trim().max(1000),
  })
  .refine((v) => v.approve || Boolean(v.note));

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId)
    return NextResponse.json({ message: 'ไม่มีสิทธิ์จัดการพัสดุ' }, { status: 403 });
  const payload = await request.json().catch(() => null);
  if (payload?.action === 'review_document') {
    if (!(await canManageViaPermission(caller, 'inventory.approve')))
      return NextResponse.json({ message: 'ไม่มีสิทธิ์อนุมัติพัสดุ' }, { status: 403 });
    const parsedReview = reviewSchema.safeParse(payload);
    if (!parsedReview.success)
      return NextResponse.json({ message: 'กรุณาระบุข้อมูลการพิจารณาให้ครบ' }, { status: 400 });
    const { error } = await supabaseAdmin.rpc('review_inventory_document', {
      p_id: parsedReview.data.id,
      p_school: caller.schoolId,
      p_actor: caller.sub,
      p_approve: parsedReview.data.approve,
      p_note: parsedReview.data.note,
    });
    if (error)
      return NextResponse.json(
        {
          message: error.message.includes('asset registry')
            ? 'ครุภัณฑ์ต้องขึ้นทะเบียนก่อนใช้งาน ไม่ใช้ใบเบิกวัสดุสิ้นเปลือง'
            : error.message.includes('Insufficient stock')
              ? 'ยอดคงเหลือไม่พอ ยังไม่อนุมัติและไม่ตัดสต็อก กรุณารับเข้าก่อน'
              : 'พิจารณารายการไม่สำเร็จ กรุณาโหลดข้อมูลใหม่',
        },
        { status: error.code === 'P0001' ? 409 : 500 }
      );
    return NextResponse.json({ success: true });
  }
  if (!(await canManageViaPermission(caller, 'inventory.manage')))
    return NextResponse.json({ message: 'ไม่มีสิทธิ์จัดการพัสดุ' }, { status: 403 });
  const parsed = z
    .union([itemSchema, movementSchema, masterSchema, documentSchema])
    .safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'กรุณาตรวจสอบข้อมูลและกรอกจำนวนเป็นจำนวนเต็มที่ถูกต้อง' },
      { status: 400 }
    );
  }
  const body = parsed.data;
  if (body.action === 'movement_document') {
    const { data, error } = await supabaseAdmin.rpc('submit_inventory_document', {
      p_id: body.id,
      p_school: caller.schoolId,
      p_kind: body.kind,
      p_recipient: body.recipient,
      p_note: body.note,
      p_actor: caller.sub,
      p_lines: body.lines,
      p_reference: body.reference_number ?? '',
      p_date: body.document_date ?? null,
      p_source_request: body.source_request_id ?? null,
      p_source_purchase: body.source_purchase_id ?? null,
    });
    if (error) {
      console.error('Inventory document failed', error);
      return NextResponse.json(
        {
          message: error.message.includes('asset registry')
            ? 'ครุภัณฑ์ต้องขึ้นทะเบียนก่อนใช้งาน ไม่ใช้ใบเบิกวัสดุสิ้นเปลือง'
            : error.message.includes('Insufficient stock')
              ? 'พัสดุบางรายการคงเหลือไม่เพียงพอ ยังไม่ได้บันทึกทั้งใบ กรุณาตรวจสอบจำนวน'
              : error.message.includes('source') || error.message.includes('purchase remaining')
                ? 'รายการหรือจำนวนรับเข้าไม่ตรงกับยอดค้างรับของใบต้นทาง กรุณาโหลดข้อมูลใหม่'
                : 'บันทึกใบพัสดุไม่สำเร็จ กรุณาตรวจสอบรายการและลองใหม่',
        },
        { status: error.code === 'P0001' ? 409 : 500 }
      );
    }
    return NextResponse.json({ id: data }, { status: 201 });
  }
  if (body.action === 'master') {
    const table = {
      category: 'inventory_categories',
      unit: 'inventory_units',
      location: 'inventory_locations',
    }[body.kind];
    if (body.remove) {
      if (!body.id) return NextResponse.json({ message: 'กรุณาระบุรายการ' }, { status: 400 });
      const { data, error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('id', body.id)
        .eq('school_id', caller.schoolId)
        .select('id')
        .maybeSingle();
      if (error)
        return NextResponse.json(
          {
            message:
              error.code === '23503'
                ? 'รายการนี้มีพัสดุใช้อยู่ กรุณาปิดใช้งานแทนการลบ'
                : 'ลบไม่สำเร็จ',
          },
          { status: error.code === '23503' ? 409 : 500 }
        );
      if (!data) return NextResponse.json({ message: 'ไม่พบรายการ' }, { status: 404 });
      return NextResponse.json({ success: true });
    }
    const fields = {
      name: body.name,
      ...(body.name_en !== undefined && { name_en: body.name_en || null }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
    };
    const query = body.id
      ? supabaseAdmin.from(table).update(fields).eq('id', body.id).eq('school_id', caller.schoolId)
      : supabaseAdmin.from(table).insert({ ...fields, school_id: caller.schoolId });
    const { data, error } = await query.select('id').maybeSingle();
    if (error)
      return NextResponse.json(
        { message: error.code === '23505' ? 'ชื่อนี้มีอยู่แล้ว' : 'บันทึกข้อมูลกลางไม่สำเร็จ' },
        { status: ['23505', '23503'].includes(error.code) ? 409 : 500 }
      );
    if (!data) return NextResponse.json({ message: 'ไม่พบข้อมูลกลาง' }, { status: 404 });
    return NextResponse.json({ id: data.id }, { status: body.id ? 200 : 201 });
  }
  if (body.action === 'item') {
    const {
      id,
      name,
      category,
      unit,
      location,
      minimum_stock,
      maximum_stock,
      item_type,
      material_subtype,
    } = body;
    const { description, brand, model, specifications, barcode, reference_price, supplier, notes } =
      body;
    const fields = {
      ...(!id && { code: null }),
      name,
      item_type,
      material_subtype:
        item_type === 'equipment'
          ? null
          : item_type === 'material'
            ? 'consumable'
            : material_subtype,
      category,
      unit,
      location: location || null,
      minimum_stock,
      maximum_stock,
      description,
      brand,
      model,
      specifications,
      barcode,
      reference_price,
      supplier,
      notes,
    };
    const query = id
      ? supabaseAdmin
          .from('inventory_items')
          .update(fields)
          .eq('id', id)
          .eq('school_id', caller.schoolId)
      : supabaseAdmin.from('inventory_items').insert({ ...fields, school_id: caller.schoolId });
    const { data, error } = await query.select('id').maybeSingle();
    if (error) {
      console.error('Inventory item save failed', error);
      return NextResponse.json(
        {
          message:
            error.code === '23505'
              ? 'รหัสพัสดุซ้ำ กรุณาใช้รหัสอื่น'
              : error.code === '23503'
                ? 'กรุณาเลือกหมวดหมู่ หน่วยนับ และที่จัดเก็บจากข้อมูลกลางของโรงเรียน'
                : error.message.includes('Registered equipment type')
                  ? 'ครุภัณฑ์ที่ขึ้นทะเบียนแล้วไม่สามารถเปลี่ยนเป็นวัสดุได้'
                  : 'บันทึกพัสดุไม่สำเร็จ',
        },
        { status: ['23505', '23503'].includes(error.code) ? 409 : 500 }
      );
    }
    if (!data) return NextResponse.json({ message: 'ไม่พบพัสดุ' }, { status: 404 });
    return NextResponse.json({ id: data.id }, { status: id ? 200 : 201 });
  }
  return NextResponse.json(
    { message: 'กรุณาสร้างใบรับเข้าหรือใบขอเบิกผ่านหน้าทำรายการ' },
    { status: 400 }
  );
}
