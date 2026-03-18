'use client';

import { Box, SxProps, Theme } from '@mui/material';

interface ChartEmptyIllustrationProps {
  sx?: SxProps<Theme>;
  size?: number;
}

/**
 * Chart/analytics empty-state illustration.
 */
export function ChartEmptyIllustration({ sx, size = 120 }: ChartEmptyIllustrationProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 120 80"
      sx={{
        width: size,
        height: size,
        maxWidth: '100%',
        opacity: 0.5,
        ...sx,
      }}
    >
      {/* Chart axes */}
      <line x1="20" y1="10" x2="20" y2="70" stroke="#919EAB" strokeWidth="1" opacity={0.3} />
      <line x1="20" y1="70" x2="110" y2="70" stroke="#919EAB" strokeWidth="1" opacity={0.3} />
      {/* Empty bars placeholder */}
      <rect x="35" y="50" width="12" height="20" rx="2" fill="#919EAB" opacity={0.15} />
      <rect x="52" y="45" width="12" height="25" rx="2" fill="#919EAB" opacity={0.12} />
      <rect x="69" y="55" width="12" height="15" rx="2" fill="#919EAB" opacity={0.1} />
      <rect x="86" y="40" width="12" height="30" rx="2" fill="#919EAB" opacity={0.12} />
      {/* Trend line (dashed) */}
      <path
        d="M 30 55 Q 50 45 70 50 T 100 35"
        fill="none"
        stroke="#2065D1"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity={0.4}
      />
    </Box>
  );
}
