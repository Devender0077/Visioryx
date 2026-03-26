'use client';

import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import Link from 'next/link';
import { WelcomeIllustration } from '@/components/illustrations';

interface WelcomeCardProps {
  displayName?: string;
}

/** Stitch Digital Sentinel — dark hero card */
export function WelcomeCard({ displayName = 'Admin' }: WelcomeCardProps) {
  return (
    <Card
      sx={{
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(135deg, #131b2e 0%, #171f33 45%, #222a3d 100%)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
      }}
    >
      {/* Subtle pattern overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: `radial-gradient(circle at 20% 80%, #2065d1 1px, transparent 1px),
                           radial-gradient(circle at 80% 20%, #57e082 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <CardContent
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          position: 'relative',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Manrope", "Public Sans", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              mb: 0.5,
            }}
          >
            Hi, {displayName} 👋
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.72)',
              maxWidth: 420,
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Monitor your AI surveillance system in real time. View live streams, manage cameras, and track face recognition events.
          </Typography>
          <Button
            component={Link}
            href="/live"
            variant="contained"
            endIcon={<ArrowForward />}
            sx={{
              bgcolor: '#00aa54',
              color: '#003415',
              fontWeight: 600,
              px: 2.5,
              py: 1.25,
              '&:hover': {
                bgcolor: '#007b55',
                color: '#fff',
              },
            }}
          >
            Go to Live
          </Button>
        </Box>
        <Box sx={{ flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
          <WelcomeIllustration size={220} sx={{ opacity: 0.9 }} />
        </Box>
      </CardContent>
    </Card>
  );
}
