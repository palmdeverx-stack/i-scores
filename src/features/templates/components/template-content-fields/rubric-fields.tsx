'use client';

import type { RubricContent } from '../../types';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { ObjectList, RowActions } from './common-fields';
import { uid, contentName, useArrayValue } from './helpers';
import { SCORE_TYPE_OPTIONS, RUBRIC_TYPE_OPTIONS } from './constants';

export function RubricFields({ contentPath }: { contentPath: string }) {
  const rows = useArrayValue<RubricContent['criteria'][number]>(
    contentName(contentPath, 'criteria')
  );
  const totalWeight = rows.value.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  const addCriterion = () =>
    rows.update([
      ...rows.value,
      {
        id: uid(),
        name: '',
        description: '',
        weight: 0,
        levels: [{ id: uid(), level: 1, label: 'ผ่าน', score: 1, description: '' }],
      },
    ]);
  const updateLevels = (
    criterionIndex: number,
    levels: RubricContent['criteria'][number]['levels']
  ) => {
    const next = [...rows.value];
    next[criterionIndex] = { ...next[criterionIndex], levels };
    rows.update(next);
  };
  return (
    <Box sx={{ gap: 2, display: 'grid' }}>
      <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <Field.Select name={contentName(contentPath, 'rubricType')} label="ประเภทรูบริก">
          {RUBRIC_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Select name={contentName(contentPath, 'scoreType')} label="รูปแบบคะแนน">
          {SCORE_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Text
          type="number"
          name={contentName(contentPath, 'maximumScore')}
          label="คะแนนเต็ม"
        />
        <Field.Text
          type="number"
          name={contentName(contentPath, 'passingScore')}
          label="คะแนนผ่าน"
        />
      </Box>
      {totalWeight > 100 ? (
        <Alert severity="error">น้ำหนักรวม {totalWeight}% เกิน 100%</Alert>
      ) : (
        <Alert severity="info">น้ำหนักรวม {totalWeight}%</Alert>
      )}
      <ObjectList title="เกณฑ์การประเมิน" onAdd={addCriterion}>
        {rows.value.map((criterion, criterionIndex) => (
          <Box
            key={criterion.id}
            sx={{
              p: 2,
              gap: 1.5,
              display: 'grid',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
            }}
          >
            <Box
              sx={{
                gap: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 150px' },
              }}
            >
              <Field.Text
                required
                name={contentName(contentPath, `criteria.${criterionIndex}.name`)}
                label={`เกณฑ์ที่ ${criterionIndex + 1}`}
              />
              <Field.Text
                type="number"
                name={contentName(contentPath, `criteria.${criterionIndex}.weight`)}
                label="น้ำหนัก (%)"
              />
            </Box>
            <Field.Text
              multiline
              name={contentName(contentPath, `criteria.${criterionIndex}.description`)}
              label="คำอธิบายเกณฑ์"
            />
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">ระดับคะแนน</Typography>
              <Button
                size="small"
                onClick={() =>
                  updateLevels(criterionIndex, [
                    ...criterion.levels,
                    {
                      id: uid(),
                      level: criterion.levels.length + 1,
                      label: '',
                      score: 0,
                      description: '',
                    },
                  ])
                }
              >
                เพิ่มระดับ
              </Button>
            </Box>
            {criterion.levels.map((level, levelIndex) => (
              <Box
                key={level.id}
                sx={{
                  gap: 1,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '100px 160px 100px minmax(220px, 1fr) 40px',
                  },
                }}
              >
                <Field.Text
                  type="number"
                  name={contentName(
                    contentPath,
                    `criteria.${criterionIndex}.levels.${levelIndex}.level`
                  )}
                  label="ระดับ"
                />
                <Field.Text
                  name={contentName(
                    contentPath,
                    `criteria.${criterionIndex}.levels.${levelIndex}.label`
                  )}
                  label="ชื่อระดับ"
                />
                <Field.Text
                  type="number"
                  name={contentName(
                    contentPath,
                    `criteria.${criterionIndex}.levels.${levelIndex}.score`
                  )}
                  label="คะแนน"
                />
                <Field.Text
                  name={contentName(
                    contentPath,
                    `criteria.${criterionIndex}.levels.${levelIndex}.description`
                  )}
                  label="คำอธิบาย"
                />
                <IconButton
                  color="error"
                  aria-label="ลบระดับ"
                  onClick={() =>
                    updateLevels(
                      criterionIndex,
                      criterion.levels.filter((_, index) => index !== levelIndex)
                    )
                  }
                >
                  <RemixIcon icon="solar:trash-bin-trash-linear" />
                </IconButton>
              </Box>
            ))}
            <RowActions
              index={criterionIndex}
              total={rows.value.length}
              onMove={rows.move}
              onRemove={() => rows.remove(criterionIndex)}
            />
          </Box>
        ))}
      </ObjectList>
    </Box>
  );
}
