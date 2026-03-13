'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import { Box, CircularProgress, Typography } from '@mui/material';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) {
      router.replace('/login');
    }
  }, [mounted, router]);

  if (!mounted) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }
  if (typeof window !== 'undefined' && !getToken()) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Typography color="text.secondary">Redirecting to login...</Typography>
      </Box>
    );
  }
  return <>{children}</>;
}
