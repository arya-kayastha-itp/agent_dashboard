import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: { main: '#0D9488' },
    secondary: { main: '#0F172A' },
    background: {
      default: mode === 'light' ? '#F8FAFC' : '#0F172A',
      paper: mode === 'light' ? '#FFFFFF' : '#1E293B',
    },
    text: {
      primary: mode === 'light' ? '#0F172A' : '#F1F5F9',
      secondary: mode === 'light' ? '#64748B' : '#94A3B8',
    },
    divider: mode === 'light' ? '#E2E8F0' : '#334155',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: 'none',
          transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
          backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(79, 70, 229, 0.03)' : 'rgba(79, 70, 229, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
          color: mode === 'light' ? '#0F172A' : '#F1F5F9',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
        },
      },
    },
  },
});

export default getTheme;
