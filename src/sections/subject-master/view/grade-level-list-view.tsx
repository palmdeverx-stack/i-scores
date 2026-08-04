'use client';

import { MasterItemListView } from 'src/sections/master-data/components/master-item-list-view';

import {
  listSubjectMasterItems,
  createSubjectMasterItem,
  deleteSubjectMasterItem,
  updateSubjectMasterItem,
} from '../subject-master-actions';

export function GradeLevelListView() {
  return (
    <MasterItemListView
      title="ระดับชั้น"
      description="ระดับชั้นที่ใช้กับรายวิชา เช่น ป.1–ป.6 และ ม.1–ม.6"
      itemLabel="ระดับชั้น"
      queryKey={['subject-master-items', 'grade_level']}
      listItems={() => listSubjectMasterItems().then((items) => items.filter((item) => item.category === 'grade_level'))}
      createItem={(values) => createSubjectMasterItem({ category: 'grade_level', ...values })}
      updateItem={updateSubjectMasterItem}
      deleteItem={deleteSubjectMasterItem}
    />
  );
}
