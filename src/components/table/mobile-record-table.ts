import type { Theme } from '@mui/material/styles';

export const mobileRecordTableSx = (theme: Theme) => ({
  [theme.breakpoints.down('md')]: {
    display: 'block',
    minWidth: 0,
    '& .MuiTableHead-root': {
      position: 'absolute',
      width: '1px',
      height: '1px',
      clipPath: 'inset(50%)',
      overflow: 'hidden',
    },
    '& .MuiTableBody-root': { display: 'block' },
    '& .MuiTableBody-root .MuiTableRow-root': {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      alignItems: 'start',
      columnGap: 12,
      padding: theme.spacing(1.5, 2),
      '&:not(:last-of-type)': { borderBottom: `1px solid ${theme.vars.palette.divider}` },
    },
    '& .MuiTableBody-root .MuiTableCell-root': {
      display: 'block',
      width: 'auto',
      minWidth: 0,
      padding: theme.spacing(0.5, 0),
      borderBottom: 0,
      overflowWrap: 'anywhere',
    },
    '& [data-mobile-label]::before': {
      content: 'attr(data-mobile-label)',
      display: 'block',
      ...theme.typography.caption,
      color: theme.vars.palette.text.secondary,
    },
    '& [data-mobile-wide], & [colspan]': { gridColumn: '1 / -1' },
    '& [data-mobile-actions]': {
      gridColumn: '1 / -1',
      textAlign: 'end',
      '& .MuiIconButton-root': { minWidth: 44, minHeight: 44 },
    },
    '& .MuiTypography-noWrap': { whiteSpace: 'normal' },
  },
});

export const mobileTablePaginationSx = {
  '& .MuiTablePagination-toolbar': { px: { xs: 0.5, sm: 2 } },
  '& .MuiTablePagination-selectLabel': { display: { xs: 'none', sm: 'block' } },
  '& .MuiTablePagination-actions': { ml: { xs: 0.5, sm: 2 } },
};
