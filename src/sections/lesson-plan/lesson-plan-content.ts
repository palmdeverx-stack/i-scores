export type AssessmentRow = {
  issue: string;
  method: string;
  tool: string;
  criteria: string;
};

export type LearningActivityRow = {
  title: string;
  description: string;
};

export type IndicatorRow = {
  code: string;
  description: string;
};

const ASSESSMENT_TABLE_PREFIX = 'ASSESSMENT_TABLE_V1:';
const ACTIVITIES_LIST_PREFIX = 'ACTIVITIES_LIST_V1:';

const INDICATOR_CODE_PATTERN =
  /^((?:[ก-๙A-Za-z]+\s+)?\d+(?:\.\d+)*\s+[ปม]\.?\s*\d+\/\d+)\s+(.*)$/;

export function richTextToPlainText(value?: string | null) {
  return (value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

export function parseIndicators(value?: string | null): IndicatorRow[] {
  const source = /<[^>]+>/.test(value ?? '') ? richTextToPlainText(value) : (value ?? '');

  return source
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-•]|\d+[.)])\s*/, '').trim())
    .map((line) => {
      const matched = line.match(INDICATOR_CODE_PATTERN);
      return matched
        ? { code: matched[1], description: matched[2] }
        : { code: '', description: line };
    });
}

export function serializeIndicators(rows: IndicatorRow[]) {
  return rows.map((row) => `${row.code.trim()} ${row.description.trim()}`.trim()).join('\n');
}

export function parseAssessment(value?: string | null): AssessmentRow[] {
  if (value?.startsWith(ASSESSMENT_TABLE_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(ASSESSMENT_TABLE_PREFIX.length));
      if (Array.isArray(parsed)) {
        const rows = parsed.flatMap((row): AssessmentRow[] => {
          if (!row || typeof row !== 'object') return [];
          const record = row as Record<string, unknown>;
          return [
            {
              issue: typeof record.issue === 'string' ? record.issue : '',
              method: typeof record.method === 'string' ? record.method : '',
              tool: typeof record.tool === 'string' ? record.tool : '',
              criteria: typeof record.criteria === 'string' ? record.criteria : '',
            },
          ];
        });
        if (rows.length) return rows;
      }
    } catch {
      // Fall through and preserve malformed or legacy content as a single row.
    }
  }

  return [
    {
      issue: richTextToPlainText(value),
      method: '',
      tool: '',
      criteria: '',
    },
  ];
}

export function serializeAssessment(rows: AssessmentRow[]) {
  const cleanedRows = rows
    .map((row) => ({
      issue: row.issue.trim(),
      method: row.method.trim(),
      tool: row.tool.trim(),
      criteria: row.criteria.trim(),
    }))
    .filter((row) => Object.values(row).some(Boolean));

  return cleanedRows.length ? `${ASSESSMENT_TABLE_PREFIX}${JSON.stringify(cleanedRows)}` : '';
}

export function parseLearningActivities(value?: string | null): LearningActivityRow[] {
  if (value?.startsWith(ACTIVITIES_LIST_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(ACTIVITIES_LIST_PREFIX.length));
      if (Array.isArray(parsed)) {
        const rows = parsed.flatMap((row): LearningActivityRow[] => {
          if (!row || typeof row !== 'object') return [];
          const record = row as Record<string, unknown>;
          return [
            {
              title: typeof record.title === 'string' ? record.title : '',
              description: typeof record.description === 'string' ? record.description : '',
            },
          ];
        });
        if (rows.length) return rows;
      }
    } catch {
      // Fall through and preserve malformed or legacy content as a single row.
    }
  }

  return [{ title: '', description: value ?? '' }];
}

export function serializeLearningActivities(rows: LearningActivityRow[]) {
  const cleanedRows = rows
    .map((row) => ({ title: row.title.trim(), description: row.description.trim() }))
    .filter((row) => row.title || richTextToPlainText(row.description));

  return cleanedRows.length ? `${ACTIVITIES_LIST_PREFIX}${JSON.stringify(cleanedRows)}` : '';
}

export function activitiesToPlainText(value?: string | null) {
  return parseLearningActivities(value)
    .flatMap((row, index) => {
      const description = richTextToPlainText(row.description);
      if (!row.title && !description) return [];
      return [row.title || `กิจกรรมที่ ${index + 1}`, description].filter(Boolean);
    })
    .join('\n');
}

export function assessmentToPlainText(value?: string | null) {
  return parseAssessment(value)
    .flatMap((row, index) => {
      const fields = [
        ['ประเด็นการประเมิน', row.issue],
        ['วิธีการประเมิน', row.method],
        ['เครื่องมือการประเมิน', row.tool],
        ['เกณฑ์การประเมิน', row.criteria],
      ].filter(([, content]) => content);

      return fields.length
        ? [`รายการที่ ${index + 1}`, ...fields.map(([label, content]) => `${label}: ${content}`)]
        : [];
    })
    .join('\n');
}
