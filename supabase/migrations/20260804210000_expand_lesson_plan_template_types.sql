-- Add the remaining reusable lesson-plan sections found in the current lesson-plan form.
-- Cover metadata (subject, class, teacher, duration) stays dynamic and is not duplicated here.

alter table public.templates
  drop constraint if exists templates_template_type_check;

alter table public.templates
  add constraint templates_template_type_check check (template_type in (
    'learning_standard', 'learning_objective', 'essential_content', 'learning_content',
    'learning_activity', 'assessment', 'rubric', 'media', 'question', 'reflection',
    'competency', 'desired_characteristic', 'learner_development', 'learning_task',
    'lesson_plan'
  ));
