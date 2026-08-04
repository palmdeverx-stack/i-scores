'use client';

import { MasterItemListView } from 'src/sections/master-data/components/master-item-list-view';

import {
  listSubjectMasterItems,
  createSubjectMasterItem,
  deleteSubjectMasterItem,
  updateSubjectMasterItem,
} from '../subject-master-actions';

export function ActivityTypeListView() {
  return (
    <MasterItemListView
      title="ประเภทกิจกรรมพัฒนาผู้เรียน"
      description="เช่น แนะแนว ลูกเสือ/เนตรนารี ชุมนุม และกิจกรรมเพื่อสังคม"
      itemLabel="ประเภทกิจกรรม"
      queryKey={['subject-master-items', 'activity_type']}
      listItems={() => listSubjectMasterItems().then((items) => items.filter((item) => item.category === 'activity_type'))}
      createItem={(values) => createSubjectMasterItem({ category: 'activity_type', ...values })}
      updateItem={updateSubjectMasterItem}
      deleteItem={deleteSubjectMasterItem}
    />
  );
}
