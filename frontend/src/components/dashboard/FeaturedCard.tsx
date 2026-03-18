'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import Link from 'next/link';

/**
 * Minimals-style featured/quick actions card with gradient background.
 */
export function FeaturedCard() {
  return (
    <Link href="/live" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <Card
        sx={{
          textDecoration: 'none',
          color: 'inherit',
          overflow: 'hidden',
          position: 'relative',
          isolation: 'isolate',
          height: '100%',
          minHeight: 180,
          background: 'linear-gradient(135deg, #2065D1 0%, #3366FF 40%, #5A9AFA 100%)',
          border: 'none',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px -12px rgba(32, 101, 209, 0.4)',
          },
        }}
      >
        {/* Slight dark overlay to guarantee text contrast */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.24) 100%)',
            zIndex: 0,
          }}
        />

        {/* Subtle gradient overlays - low opacity to not obscure text */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 110,
            height: 110,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -14,
            left: -14,
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,171,85,0.14) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />

        <CardContent
          sx={{
            p: 3,
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.98)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              mb: 0.5,
              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
            }}
          >
            Quick Access
          </Typography>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              color: 'rgba(255,255,255,0.98)',
              mb: 1,
              textShadow: '0 1px 3px rgba(0,0,0,0.45)',
              fontSize: { xs: '1.05rem', sm: '1.15rem' },
            }}
          >
            Live Monitoring
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.92)',
              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              lineHeight: 1.5,
            }}
          >
            View real-time camera streams with face & object detection
          </Typography>
        </CardContent>
      </Card>
    </Link>
  );
}
