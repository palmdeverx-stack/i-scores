import type { NavItemDataProps } from 'src/components/nav-section';

import { RiArchiveLine, RiHandCoinLine, RiShoppingCartLine } from 'src/components/remix-icon';

export function createInventoryNav(root: string): NavItemDataProps[] {
  return [
    {
      title: 'ขอซื้อและออกใบสั่งซื้อ',
      path: `${root}/purchases`,
      icon: <RiShoppingCartLine />,
      requiresDepartmentPermission: 'inventory.manage',
    },
    {
      title: 'คลังและทะเบียนพัสดุ',
      path: root,
      deepMatch: false,
      icon: <RiArchiveLine />,
      requiresDepartmentPermission: 'inventory.manage',
      children: [
        { title: 'ยอดคงเหลือวัสดุ', path: root, deepMatch: false },
        { title: 'รับเข้าตามเอกสาร', path: `${root}/receive` },
        { title: 'ทะเบียนครุภัณฑ์และการใช้งาน', path: `${root}/assets` },
        { title: 'รับคืนวัสดุและครุภัณฑ์', path: `${root}/returns` },
        { title: 'ประวัติการเคลื่อนไหว', path: `${root}/history` },
      ],
    },
    {
      title: 'ขอเบิกวัสดุ',
      path: `${root}/issue`,
      icon: <RiHandCoinLine />,
      requiresDepartmentPermission: 'inventory.manage',
    },
    {
      title: 'พิจารณาคำขอจัดซื้อ',
      path: `${root}/purchase-approvals`,
      icon: <RiShoppingCartLine />,
      requiresDepartmentPermission: 'inventory.approve',
    },
    {
      title: 'พิจารณาคำขอเบิกวัสดุ',
      path: `${root}/approvals`,
      icon: <RiHandCoinLine />,
      requiresDepartmentPermission: 'inventory.approve',
    },
  ];
}
