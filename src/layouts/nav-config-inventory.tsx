import type { NavItemDataProps } from 'src/components/nav-section';

import { RiArchiveLine, RiHandCoinLine, RiShoppingCartLine } from 'src/components/remix-icon';

export function createInventoryNav(root: string): NavItemDataProps[] {
  return [
    {
      title: 'จัดซื้อพัสดุ',
      path: `${root}/purchases`,
      icon: <RiShoppingCartLine />,
      children: [
        {
          title: 'ใบขอจัดซื้อ / แบบร่าง',
          path: `${root}/purchases`,
          requiresDepartmentPermission: 'inventory.manage',
        },
        {
          title: 'อนุมัติจัดซื้อ',
          path: `${root}/purchase-approvals`,
          requiresDepartmentPermission: 'inventory.approve',
        },
      ],
    },
    {
      title: 'คลังพัสดุ (STOCK)',
      path: root,
      deepMatch: false,
      icon: <RiArchiveLine />,
      children: [
        {
          title: 'ทะเบียน / ยอดคงเหลือ',
          path: root,
          deepMatch: false,
          requiresDepartmentPermission: 'inventory.manage',
        },
        {
          title: 'ทะเบียนครุภัณฑ์ / นำไปใช้งาน',
          path: `${root}/assets`,
          requiresDepartmentPermission: 'inventory.manage',
        },
        {
          title: 'รับเข้าพัสดุ',
          path: `${root}/receive`,
          requiresDepartmentPermission: 'inventory.manage',
        },
        {
          title: 'ประวัติรับเข้า–จ่ายออก',
          path: `${root}/history`,
          requiresDepartmentPermission: 'inventory.manage',
        },
      ],
    },
    {
      title: 'เบิกจ่ายพัสดุ',
      path: `${root}/issue`,
      icon: <RiHandCoinLine />,
      children: [
        {
          title: 'ใบขอเบิกพัสดุ',
          path: `${root}/issue`,
          requiresDepartmentPermission: 'inventory.manage',
        },
        {
          title: 'อนุมัติใบขอเบิก',
          path: `${root}/approvals`,
          requiresDepartmentPermission: 'inventory.approve',
        },
      ],
    },
  ];
}
