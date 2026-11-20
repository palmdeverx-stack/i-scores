'use client';

import type { MenuListProps } from '@mui/material/MenuList';
import type { IconButtonProps } from '@mui/material/IconButton';
import type { LangCode } from 'src/locales';

import { m } from 'framer-motion';
import { usePopover } from 'minimal-shared/hooks';

import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

import { useTranslate } from 'src/locales';

import { FlagIcon } from 'src/components/flag-icon';
import { RiTranslate2 } from 'src/components/remix-icon';
import { CustomPopover } from 'src/components/custom-popover';
import { varTap, varHover, transitionTap } from 'src/components/animate';

// ----------------------------------------------------------------------

export type LanguagePopoverProps = IconButtonProps & {
  showTranslateIcon?: boolean;
  data?: {
    value: string;
    label: string;
    countryCode: string;
  }[];
};

export function LanguageMenu({
  data,
  onSelect,
  ...menuListProps
}: Omit<MenuListProps, 'onSelect'> & {
  data: NonNullable<LanguagePopoverProps['data']>;
  onSelect: () => void;
}) {
  const { onChangeLang, currentLang } = useTranslate();

  return (
    <MenuList {...menuListProps}>
      {data.map((option) => (
        <MenuItem
          key={option.value}
          role="menuitemradio"
          aria-checked={option.value === currentLang.value}
          selected={option.value === currentLang.value}
          onClick={() => {
            onChangeLang(option.value as LangCode);
            onSelect();
          }}
        >
          <FlagIcon code={option.countryCode} />
          {option.label}
        </MenuItem>
      ))}
    </MenuList>
  );
}

export function LanguagePopover({
  data = [],
  sx,
  showTranslateIcon = false,
  ...other
}: LanguagePopoverProps) {
  const { open, anchorEl, onClose, onOpen } = usePopover();
  const { t, currentLang } = useTranslate();

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label={t('language.select', { defaultValue: 'เลือกภาษา' })}
        onClick={onOpen}
        sx={[
          (theme) => ({
            p: 0,
            width: 40,
            height: 40,
            ...(open && { bgcolor: theme.vars.palette.action.selected }),
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {showTranslateIcon ? (
          <RiTranslate2 aria-hidden="true" size={22} />
        ) : (
          <FlagIcon code={currentLang.countryCode} />
        )}
      </IconButton>

      <CustomPopover open={open} anchorEl={anchorEl} onClose={onClose}>
        <LanguageMenu data={data} onSelect={onClose} sx={{ width: 160, minHeight: 72 }} />
      </CustomPopover>
    </>
  );
}
