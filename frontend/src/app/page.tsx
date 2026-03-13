import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
        background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
      }}
    >
      <Typography variant="h3" fontWeight={700} sx={{ color: 'white' }}>
        Visioryx
      </Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.9)' }}>
        AI Powered Real-Time Face Recognition & Surveillance System
      </Typography>
      <Button component={Link} href="/login" variant="contained" sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}>
        Sign In to Access Dashboard
      </Button>
    </main>
  );
}
