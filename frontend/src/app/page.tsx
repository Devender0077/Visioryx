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
        background: 'linear-gradient(160deg, #060e20 0%, #0b1326 40%, #131b2e 100%)',
      }}
    >
      <Typography
        variant="h3"
        sx={{
          fontFamily: '"Manrope", "Public Sans", sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#afc6ff',
        }}
      >
        Visioryx
      </Typography>
      <Typography sx={{ color: '#c2c6d5' }}>
        AI Powered Real-Time Face Recognition & Surveillance System
      </Typography>
      <Button
        component={Link}
        href="/login"
        variant="contained"
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          fontWeight: 600,
          px: 3,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        Sign In to Access Dashboard
      </Button>
    </main>
  );
}
