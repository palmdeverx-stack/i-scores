-- Switch the "โครงสร้างหลักสูตรรายวิชา" fields from a text[] of one-line
-- items to a single rich-text (HTML) blob per field, edited with Field.Editor
-- instead of a plain "one item per line" textarea. Nothing else in the app
-- reads these columns as arrays, so this is a straight column-type swap;
-- existing lines are preserved as HTML paragraphs.

create or replace function public.__migrate_array_to_html(items text[])
returns text
language sql
immutable
as $$
  select nullif(
    string_agg(
      '<p>' || replace(replace(replace(trim(elem), '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>',
      ''
      order by ord
    ),
    ''
  )
  from unnest(items) with ordinality as t (elem, ord)
  where trim(elem) <> '';
$$;

alter table public.subjects
  alter column learning_standards type text
    using public.__migrate_array_to_html(learning_standards),
  alter column learning_standards drop not null,
  alter column learning_standards drop default,
  alter column learning_outcomes type text
    using public.__migrate_array_to_html(learning_outcomes),
  alter column learning_outcomes drop not null,
  alter column learning_outcomes drop default,
  alter column learning_units type text
    using public.__migrate_array_to_html(learning_units),
  alter column learning_units drop not null,
  alter column learning_units drop default,
  alter column indicators type text
    using public.__migrate_array_to_html(indicators),
  alter column indicators drop not null,
  alter column indicators drop default;

drop function public.__migrate_array_to_html(text[]);

comment on column public.subjects.learning_standards is
  'Curriculum learning standards (rich text HTML)';
comment on column public.subjects.learning_outcomes is
  'Expected learning outcomes (rich text HTML)';
comment on column public.subjects.learning_units is
  'Learning unit names or summaries (rich text HTML)';
comment on column public.subjects.indicators is
  'Curriculum indicators (rich text HTML)';
