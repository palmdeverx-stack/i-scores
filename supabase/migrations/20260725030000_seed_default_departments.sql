-- Seeds the 5 common Thai school departments for every existing school.
-- Skips schools that already have a department with the same name (e.g. an
-- admin who already set one up manually before this migration ran).

insert into public.departments (school_id, name, description)
select school.id, dept.name, dept.description
from public.schools school
cross join (
  values
    ('ฝ่ายวิชาการ', 'การเรียนการสอน'),
    ('ฝ่ายกิจการนักเรียน', 'ดูแลนักเรียน'),
    ('ฝ่ายบริหารทั่วไป', 'งานธุรการ'),
    ('ฝ่ายงบประมาณ', 'การเงิน'),
    ('ฝ่ายสัมพันธ์ชุมชน', 'ผู้ปกครอง')
) as dept (name, description)
where not exists (
  select 1 from public.departments existing
  where existing.school_id = school.id and lower(existing.name) = lower(dept.name)
);
