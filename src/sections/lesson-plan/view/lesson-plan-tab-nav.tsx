import type { DropResult } from '@hello-pangea/dnd';
import type { LessonPlanNavigationSection } from './lesson-plan-form.schema';

import { memo } from 'react';
import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';

import { RemixIcon } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

function DraggableLessonPlanTab({
  section,
  index,
  active,
  onMove,
  onSelect,
}: {
  section: LessonPlanNavigationSection;
  index: number;
  active: boolean;
  onMove: (tabId: string, offset: number) => void;
  onSelect: (tabId: string) => void;
}) {
  return (
    <Draggable draggableId={section.id} index={index}>
      {(provided, snapshot) => (
        <Button
          ref={provided.innerRef}
          {...provided.draggableProps}
          fullWidth
          color="inherit"
          title="ลากไอคอนเพื่อจัดลำดับ หรือกด Alt พร้อมปุ่มลูกศรขึ้น/ลง"
          aria-label={`${section.label} ${section.complete ? 'ครบแล้ว' : 'ยังไม่ครบ'}`}
          onClick={() => onSelect(section.id)}
          onKeyDown={(event) => {
            if (!event.altKey) return;
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              onMove(section.id, -1);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              onMove(section.id, 1);
            }
          }}
          sx={{
            gap: 1,
            px: 1.25,
            py: 1,
            minWidth: 0,
            borderRadius: 1,
            position: 'relative',
            justifyContent: 'flex-start',
            opacity: snapshot.isDragging ? 0.85 : 1,
            bgcolor: active ? 'primary.lighter' : 'transparent',
            color: active ? 'primary.main' : 'text.secondary',
            ...(snapshot.isDragging && {
              border: 0,
              outline: 'none',
              boxShadow: 'none',
            }),
            '&:hover': {
              bgcolor: snapshot.isDragging
                ? active
                  ? 'primary.lighter'
                  : 'transparent'
                : 'action.hover',
            },
          }}
        >
          <RemixIcon
            width={20}
            icon={section.complete ? 'solar:check-circle-bold' : 'solar:radio-button-linear'}
            sx={{
              flexShrink: 0,
              color: section.complete ? 'success.main' : 'text.disabled',
            }}
          />
          <Typography
            component="span"
            variant="body2"
            sx={{ minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {section.label}
          </Typography>
          <Box
            {...provided.dragHandleProps}
            component="span"
            aria-label={`ลากเพื่อย้าย ${section.label}`}
            sx={{
              ml: 'auto',
              p: 0.25,
              display: 'grid',
              flexShrink: 0,
              cursor: 'grab',
              color: 'text.disabled',
              touchAction: 'none',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <RemixIcon icon="custom:drag-dots-fill" width={18} />
          </Box>
        </Button>
      )}
    </Draggable>
  );
}

type LessonPlanTabNavProps = {
  sections: LessonPlanNavigationSection[];
  activeSection: string;
  onSelect: (tabId: string) => void;
  onMove: (tabId: string, offset: number) => void;
  onDragEnd: (result: DropResult) => void;
  evaluationSectionIds?: readonly string[];
  enabledEvaluationSections?: readonly string[];
  onToggleEvaluationSection?: (tabId: string) => void;
};

export const LessonPlanTabNav = memo(function LessonPlanTabNav({
  sections,
  activeSection,
  onSelect,
  onMove,
  onDragEnd,
  evaluationSectionIds = [],
  enabledEvaluationSections = [],
  onToggleEvaluationSection,
}: LessonPlanTabNavProps) {
  const evaluationIds = new Set(evaluationSectionIds);
  const enabledIds = new Set(enabledEvaluationSections);
  const mainSections = sections.filter((section) => !evaluationIds.has(section.id));
  const evaluationSections = sections.filter((section) => evaluationIds.has(section.id));
  const handleMainDragEnd = (result: DropResult) => {
    if (!result.destination) {
      onDragEnd(result);
      return;
    }
    const sourceSection = mainSections[result.source.index];
    const destinationSection = mainSections[result.destination.index];
    if (!sourceSection || !destinationSection) return;
    onDragEnd({
      ...result,
      source: { ...result.source, index: sections.indexOf(sourceSection) },
      destination: { ...result.destination, index: sections.indexOf(destinationSection) },
    });
  };
  const handleMainMove = (tabId: string, offset: number) => {
    const currentIndex = mainSections.findIndex((section) => section.id === tabId);
    const targetSection = mainSections[currentIndex + offset];
    const currentSection = mainSections[currentIndex];
    if (!currentSection || !targetSection) return;
    onMove(tabId, sections.indexOf(targetSection) - sections.indexOf(currentSection));
  };

  return (
    <Card
      component="nav"
      variant="outlined"
      aria-label="หัวข้อแผนการสอน"
      sx={{
        p: 0,
        top: 88,
        zIndex: 5,
        position: { md: 'sticky' },
        maxHeight: { md: 'calc(100vh - 112px)' },
        overflowY: { md: 'auto' },
        boxShadow: 'none',
        border: 'none',
        borderRadius: 0,
      }}
    >
      <Typography variant="subtitle2" sx={{ px: 1.25, py: 1 }}>
        หัวข้อแผนการสอน
      </Typography>
      <DragDropContext onDragEnd={handleMainDragEnd}>
        <Droppable droppableId="lesson-plan-nav">
          {(droppableProvided) => (
            <Box
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              sx={{
                gap: 1,
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  md: '1fr',
                },
              }}
            >
              {mainSections.map((section, index) => (
                <DraggableLessonPlanTab
                  key={section.id}
                  section={section}
                  index={index}
                  active={activeSection === section.id}
                  onMove={handleMainMove}
                  onSelect={onSelect}
                />
              ))}
              {droppableProvided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>
      {evaluationSections.length ? (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ px: 1.25, pb: 1 }}>
            <Typography variant="subtitle2">เอกสารประเมินเพิ่มเติม</Typography>
            <Typography variant="caption" color="text.secondary">
              เลือกเฉพาะเอกสารที่ต้องการแสดงใน PDF
            </Typography>
          </Box>
          <Box
            sx={{
              gap: 1,
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: '1fr',
              },
            }}
          >
            {evaluationSections.map((section) => {
              const enabled = enabledIds.has(section.id);
              const active = activeSection === section.id;
              return (
                <Button
                  key={section.id}
                  fullWidth
                  color="inherit"
                  onClick={() => onSelect(section.id)}
                  sx={{
                    gap: 0.5,
                    px: 0.5,
                    py: 0.75,
                    minWidth: 0,
                    borderRadius: 1,
                    justifyContent: 'flex-start',
                    bgcolor: active ? 'primary.lighter' : 'transparent',
                    color: active ? 'primary.main' : enabled ? 'text.primary' : 'text.disabled',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={enabled}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => onToggleEvaluationSection?.(section.id)}
                    inputProps={{
                      'aria-label': `${enabled ? 'นำออก' : 'เพิ่ม'} ${section.label} ในเอกสาร`,
                    }}
                  />
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ minWidth: 0, textAlign: 'left' }}
                  >
                    {section.label}
                  </Typography>
                </Button>
              );
            })}
          </Box>
        </>
      ) : null}
    </Card>
  );
});
