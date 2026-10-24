'use client';

import { useQueryClient } from '@tanstack/react-query';

import { MasterItemListView } from 'src/sections/master-data/components/master-item-list-view';

import { useAuthContext } from 'src/auth/hooks';

type MasterRow = {
  id: string;
  name: string;
  name_en: string | null;
  sort_order: number;
  is_active: boolean;
};
type Values = { nameTh: string; nameEn: string; sortOrder: number; isActive?: boolean };

async function inventoryRequest(body?: unknown) {
  const response = await fetch(
    '/api/inventory',
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { cache: 'no-store' }
  );
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถจัดการข้อมูลพัสดุได้');
  return json;
}

export function InventoryMasterView({ kind }: { kind: 'category' | 'unit' | 'location' }) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const label = { category: 'หมวดหมู่พัสดุ', unit: 'หน่วยนับพัสดุ', location: 'ที่จัดเก็บพัสดุ' }[
    kind
  ];
  const key = ['inventory-master', user?.school_id ?? '', user?.id ?? '', kind];
  const canManage =
    user?.role === 'school_admin' || (user?.manage_permissions ?? []).includes('inventory.manage');
  const rowsKey = { category: 'categories', unit: 'units', location: 'locations' }[kind];
  async function list() {
    const data = await inventoryRequest();
    return (data[rowsKey] as MasterRow[])
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'th'))
      .map((row) => ({ ...row, code: null, is_system: false }));
  }
  async function save(values: Values, id?: string) {
    const result = await inventoryRequest({
      action: 'master',
      kind,
      id,
      name: values.nameTh,
      name_en: values.nameEn,
      sort_order: values.sortOrder,
      is_active: values.isActive ?? true,
    });
    await queryClient.invalidateQueries({ queryKey: ['school-inventory'] });
    const items = await list();
    const saved = items.find((row) => row.id === result.id);
    if (!saved) throw new Error('บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรช');
    return saved;
  }
  return (
    <MasterItemListView
      title={label}
      itemLabel={label}
      description="ข้อมูลกลางสำหรับเลือกใช้ในทะเบียนพัสดุของโรงเรียน"
      queryKey={key}
      readOnly={!canManage}
      listItems={list}
      createItem={(values) => save(values)}
      updateItem={(id, values) => save(values, id)}
      deleteItem={async (id) => {
        const row = (await list()).find((entry) => entry.id === id);
        if (!row) throw new Error('ไม่พบรายการ');
        await inventoryRequest({ action: 'master', kind, id, name: row.name, remove: true });
        await queryClient.invalidateQueries({ queryKey: ['school-inventory'] });
      }}
    />
  );
}
