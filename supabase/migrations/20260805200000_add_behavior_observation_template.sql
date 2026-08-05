-- Add the reusable behavior observation form used by full lesson-plan templates.

alter table public.templates
  drop constraint if exists templates_template_type_check;

alter table public.templates
  add constraint templates_template_type_check check (template_type in (
    'learning_standard', 'learning_objective', 'essential_content', 'learning_content',
    'learning_activity', 'assessment', 'rubric', 'media', 'question', 'reflection',
    'worksheet_assessment_record', 'competency', 'competency_assessment',
    'behavior_observation', 'desired_characteristic',
    'desired_characteristic_assessment', 'learner_development', 'learning_task',
    'lesson_plan'
  ));
