'use client';

import { Box, Typography } from '@mui/material';
import { EmptyStateIllustration } from './illustrations';

interface EmptyStateProps {
  message: string;
  illustrationSize?: number;
}

/**
 * Reusable empty state with illustration (minimals.cc style).
 */
export function EmptyState({ message, illustrationSize = 140 }: EmptyStateProps) {
  return (
    <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <EmptyStateIllustration size={illustrationSize} sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
