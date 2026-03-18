import { createTheme } from '@mui/material/styles';

/**
 * Minimal UI Theme - free.minimals.cc style
 * Clean, professional surveillance dashboard aesthetic
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2065D1',
      light: '#5A9AFA',
      dark: '#0C4A9E',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3366FF',
      light: '#6B8CFF',
      dark: '#0047CC',
      contrastText: '#ffffff',
    },
    success: {
      main: '#00AB55',
      light: '#5BE584',
      dark: '#007B55',
    },
    warning: {
      main: '#FFAB00',
      light: '#FFD666',
      dark: '#B76E00',
    },
    error: {
      main: '#FF5630',
      light: '#FF8F73',
      dark: '#DE350B',
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    text: {
      primary: '#212B36',
      secondary: '#637381',
      disabled: '#919EAB',
    },
    background: {
      default: '#F9FAFB',
      paper: '#ffffff',
    },
    divider: 'rgba(145, 158, 171, 0.24)',
  },
  typography: {
    fontFamily: '"Public Sans", "Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
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
    '0px 2px 4px rgba(145, 158, 171, 0.08)',
    '0px 4px 8px rgba(145, 158, 171, 0.08)',
    '0px 8px 16px rgba(145, 158, 171, 0.08)',
    '0px 12px 24px rgba(145, 158, 171, 0.08)',
    '0px 16px 32px rgba(145, 158, 171, 0.08)',
    '0px 20px 40px rgba(145, 158, 171, 0.08)',
    '0px 24px 48px rgba(145, 158, 171, 0.08)',
    '0px 28px 56px rgba(145, 158, 171, 0.08)',
    '0px 32px 64px rgba(145, 158, 171, 0.08)',
    '0px 36px 72px rgba(145, 158, 171, 0.08)',
    '0px 40px 80px rgba(145, 158, 171, 0.08)',
    '0px 44px 88px rgba(145, 158, 171, 0.08)',
    '0px 48px 96px rgba(145, 158, 171, 0.08)',
    '0px 52px 104px rgba(145, 158, 171, 0.08)',
    '0px 56px 112px rgba(145, 158, 171, 0.08)',
    '0px 60px 120px rgba(145, 158, 171, 0.08)',
    '0px 64px 128px rgba(145, 158, 171, 0.08)',
    '0px 68px 136px rgba(145, 158, 171, 0.08)',
    '0px 72px 144px rgba(145, 158, 171, 0.08)',
    '0px 76px 152px rgba(145, 158, 171, 0.08)',
    '0px 80px 160px rgba(145, 158, 171, 0.08)',
    '0px 84px 168px rgba(145, 158, 171, 0.08)',
    '0px 88px 176px rgba(145, 158, 171, 0.08)',
    '0px 92px 184px rgba(145, 158, 171, 0.08)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#919EAB transparent',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#919EAB',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 0px 2px rgba(145, 158, 171, 0.08), 0px 12px 24px -4px rgba(145, 158, 171, 0.08)',
          borderRadius: 16,
          border: '1px solid rgba(145, 158, 171, 0.08)',
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
            boxShadow: '0px 8px 16px rgba(32, 101, 209, 0.24)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 0px 2px rgba(145, 158, 171, 0.2), 0px 12px 24px -4px rgba(145, 158, 171, 0.12)',
          background: '#ffffff',
          color: '#212B36',
          borderBottom: '1px solid rgba(145, 158, 171, 0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(145, 158, 171, 0.12)',
          background: '#ffffff',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '0 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(32, 101, 209, 0.08)',
            color: '#2065D1',
            '& .MuiListItemIcon-root': {
              color: '#2065D1',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(145, 158, 171, 0.08)',
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
              borderColor: 'rgba(145, 158, 171, 0.32)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0px 0px 2px rgba(145, 158, 171, 0.2), 0px 12px 24px -4px rgba(145, 158, 171, 0.12)',
          borderRadius: 16,
          border: '1px solid rgba(145, 158, 171, 0.12)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(145, 158, 171, 0.08)',
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
            color: 'text.secondary',
            backgroundColor: 'rgba(145, 158, 171, 0.04)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(145, 158, 171, 0.04)',
          },
        },
      },
    },
  },
});
