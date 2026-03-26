'use client';

import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export type StitchPageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

const headlineFont = 'Manrope, Public Sans, sans-serif';

export function StitchPageHeader({ eyebrow, title, subtitle, actions }: StitchPageHeaderProps) {
  return (
    <Box
      sx={{
        mb: { xs: 2, sm: 3 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { md: 'flex-end' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? (
          <Typography
            variant="caption"
            component="p"
            sx={{
              color: 'primary.light',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontSize: { xs: '0.65rem', sm: '0.7rem' },
              mb: 0.75,
            }}
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontFamily: headlineFont,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'text.primary',
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            mb: subtitle ? 0.5 : 0,
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900, lineHeight: 1.65 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
    </Box>
  );
}
