import { createTheme } from '@mui/material/styles';

/**
 * Digital Sentinel (Stitch) — dark indigo surfaces, soft borders, Manrope-style headlines via CSS stack.
 * Tokens aligned with `stitch/stitch/desktop_dashboard_overview/code.html` and mobile `stitchTheme`.
 */
const surface = '#0b1326';
const surfaceLow = '#131b2e';
const surfaceContainer = '#171f33';
const surfaceContainerHigh = '#222a3d';
const onSurface = '#dae2fd';
const onSurfaceVariant = '#c2c6d5';
const outlineVariant = '#424753';
const primaryTint = '#afc6ff';
const primaryContainer = '#2065d1';
const secondary = '#57e082';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: primaryContainer,
      light: primaryTint,
      dark: '#0c4a9e',
      contrastText: '#e4eaff',
    },
    secondary: {
      main: secondary,
      light: '#75fd9c',
      dark: '#003918',
      contrastText: '#003415',
    },
    success: {
      main: '#00aa54',
      light: '#5be584',
      dark: '#007b55',
    },
    warning: {
      main: '#ffb950',
      light: '#ffd666',
      dark: '#915f00',
    },
    error: {
      main: '#ffb4ab',
      light: '#ffdad6',
      dark: '#93000a',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    text: {
      primary: onSurface,
      secondary: onSurfaceVariant,
      disabled: '#8c909f',
    },
    background: {
      default: surface,
      paper: surfaceContainer,
    },
    divider: 'rgba(255, 255, 255, 0.06)',
    action: {
      hover: 'rgba(175, 198, 255, 0.08)',
      selected: 'rgba(32, 101, 209, 0.16)',
    },
  },
  typography: {
    fontFamily: '"Public Sans", "Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontFamily: '"Manrope", "Public Sans", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: onSurface,
    },
    h2: {
      fontFamily: '"Manrope", "Public Sans", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: onSurface,
    },
    h3: {
      fontFamily: '"Manrope", "Public Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: onSurface,
    },
    h4: {
      fontFamily: '"Manrope", "Public Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: onSurface,
    },
    h5: {
      fontFamily: '"Manrope", "Public Sans", sans-serif',
      fontWeight: 700,
      color: onSurface,
    },
    h6: {
      fontFamily: '"Manrope", "Public Sans", sans-serif',
      fontWeight: 700,
      color: onSurface,
    },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 2px 8px rgba(0, 0, 0, 0.35)',
    '0 4px 16px rgba(0, 0, 0, 0.35)',
    '0 8px 24px rgba(0, 0, 0, 0.4)',
    '0 12px 32px rgba(0, 0, 0, 0.45)',
    '0 16px 40px rgba(0, 0, 0, 0.45)',
    '0 20px 48px rgba(0, 0, 0, 0.5)',
    '0 24px 56px rgba(0, 0, 0, 0.5)',
    '0 28px 64px rgba(0, 0, 0, 0.5)',
    '0 32px 72px rgba(0, 0, 0, 0.55)',
    '0 36px 80px rgba(0, 0, 0, 0.55)',
    '0 40px 88px rgba(0, 0, 0, 0.55)',
    '0 44px 96px rgba(0, 0, 0, 0.55)',
    '0 48px 104px rgba(0, 0, 0, 0.55)',
    '0 52px 112px rgba(0, 0, 0, 0.55)',
    '0 56px 120px rgba(0, 0, 0, 0.55)',
    '0 60px 128px rgba(0, 0, 0, 0.55)',
    '0 64px 136px rgba(0, 0, 0, 0.55)',
    '0 68px 144px rgba(0, 0, 0, 0.55)',
    '0 72px 152px rgba(0, 0, 0, 0.55)',
    '0 76px 160px rgba(0, 0, 0, 0.55)',
    '0 80px 168px rgba(0, 0, 0, 0.55)',
    '0 84px 176px rgba(0, 0, 0, 0.55)',
    '0 88px 184px rgba(0, 0, 0, 0.55)',
    '0 92px 192px rgba(0, 0, 0, 0.55)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${outlineVariant} transparent`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: outlineVariant,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.05), 0 12px 40px -8px rgba(0,0,0,0.45)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundImage: 'none',
          backgroundColor: surfaceContainerHigh,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '&:last-child': { paddingBottom: 24 },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 8px 24px rgba(32, 101, 209, 0.35)',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: onSurfaceVariant,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': {
            backgroundColor: 'rgba(32, 101, 209, 0.25)',
            color: primaryTint,
            borderColor: 'rgba(175, 198, 255, 0.35)',
            '&:hover': {
              backgroundColor: 'rgba(32, 101, 209, 0.32)',
              color: primaryTint,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.05)',
          background: 'rgba(11, 19, 38, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: onSurface,
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          background: surfaceLow,
          backgroundImage: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '0 8px',
          borderLeft: '2px solid transparent',
          color: onSurfaceVariant,
          '& .MuiListItemIcon-root': {
            color: onSurfaceVariant,
          },
          '&.Mui-selected': {
            backgroundColor: surfaceContainerHigh,
            color: primaryTint,
            borderLeftColor: primaryContainer,
            '& .MuiListItemIcon-root': {
              color: primaryTint,
            },
          },
          '&:hover': {
            backgroundColor: surfaceContainer,
            color: onSurface,
            '& .MuiListItemIcon-root': {
              color: onSurface,
            },
          },
          '&.Mui-selected:hover': {
            backgroundColor: surfaceContainerHigh,
            color: primaryTint,
            '& .MuiListItemIcon-root': {
              color: primaryTint,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(175, 198, 255, 0.35)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.05), 0 12px 40px -8px rgba(0,0,0,0.45)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: surfaceContainer,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: onSurfaceVariant,
          '&:hover': {
            backgroundColor: 'rgba(175, 198, 255, 0.08)',
            color: onSurface,
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: onSurfaceVariant,
            backgroundColor: 'rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
  },
});
