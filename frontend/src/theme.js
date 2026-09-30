import { alpha, createTheme } from '@mui/material/styles';

// "Garage Night · Solid Accent" — one orange accent taken from the AI Garage
// mark; magenta only as the second chart series; green/amber/red/blue stay
// reserved for status. Values the MUI palette has no slot for (extra surfaces,
// hairlines, a third text tone) are exposed as --g-* CSS variables on <body>
// so sx props and index.css can use them without threading the theme around.
const TOKENS = {
  dark: {
    bg: '#09080d',
    side: '#0d0b12',
    surface: '#121019',
    surface2: '#17141f',
    surface3: '#1f1b29',
    field: '#0c0a11',
    track: 'rgba(255, 255, 255, 0.07)',
    line: 'rgba(255, 255, 255, 0.07)',
    line2: 'rgba(255, 255, 255, 0.12)',
    text: '#f4f2f8',
    text2: '#aba5bb',
    text3: '#878199',
    accent: '#ff8a3d',
    accentText: '#ff8a3d',
    accentHover: '#ff9e5e',
    accentInk: '#1a0c04',
    accent2: '#e85d9a',
    ok: '#3ddc97',
    warn: '#ffc53d',
    risk: '#ff5c7a',
    info: '#5aa9ff',
    glowA: 'rgba(255, 138, 61, 0.13)',
    glowB: 'rgba(255, 138, 61, 0.06)',
    dots: 'rgba(255, 255, 255, 0.045)',
    shadow: '0 30px 60px -32px rgba(0, 0, 0, 0.9)',
    popShadow: '0 40px 70px -30px rgba(0, 0, 0, 0.9)',
    scrim: 'rgba(5, 4, 8, 0.72)',
  },
  light: {
    bg: '#f5f3f8',
    side: '#ffffff',
    surface: '#ffffff',
    surface2: '#f8f6fb',
    surface3: '#efebf5',
    field: '#ffffff',
    track: 'rgba(24, 16, 40, 0.08)',
    line: 'rgba(24, 16, 40, 0.08)',
    line2: 'rgba(24, 16, 40, 0.15)',
    text: '#16131d',
    text2: '#57516a',
    text3: '#6c667e',
    accent: '#ff8a3d',
    accentText: '#c4560c',
    accentHover: '#ff9e5e',
    accentInk: '#1a0c04',
    accent2: '#c2407f',
    ok: '#0c8457',
    warn: '#9a6100',
    risk: '#cf2d52',
    info: '#1d68c9',
    glowA: 'rgba(255, 138, 61, 0.16)',
    glowB: 'rgba(255, 138, 61, 0.07)',
    dots: 'rgba(24, 16, 40, 0.06)',
    shadow: '0 24px 50px -34px rgba(40, 20, 80, 0.4)',
    popShadow: '0 30px 60px -30px rgba(40, 20, 80, 0.45)',
    scrim: 'rgba(22, 19, 29, 0.45)',
  },
};

export const FONTS = {
  display: '"Unbounded", "Arial Black", system-ui, sans-serif',
  sans: '"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace',
};

export const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

const getTheme = (mode) => {
  const t = TOKENS[mode] || TOKENS.light;
  const accentRing = alpha(t.accent, 0.2);

  return createTheme({
    palette: {
      mode,
      primary: { main: t.accent, light: t.accentHover, dark: '#e0701f', contrastText: t.accentInk },
      secondary: { main: t.accent2, contrastText: '#ffffff' },
      success: { main: t.ok },
      warning: { main: t.warn },
      error: { main: t.risk },
      info: { main: t.info },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.text, secondary: t.text2, disabled: t.text3 },
      divider: t.line,
      action: {
        hover: alpha(t.text, 0.05),
        selected: alpha(t.accent, 0.12),
        focus: alpha(t.text, 0.1),
      },
      garage: t,
    },
    shape: {
      borderRadius: 10,
    },
    // Compact density: a 7px spacing unit and a 13px type base (MUI scales
    // every rem-based variant by fontSize / 14) keep a laptop at 125% display
    // scaling showing as much as the wireframes did.
    spacing: 7,
    typography: {
      fontFamily: FONTS.sans,
      fontSize: 13,
      h4: { fontFamily: FONTS.display, fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.12, letterSpacing: '-0.025em' },
      h5: { fontFamily: FONTS.display, fontWeight: 600, fontSize: '1.2rem', lineHeight: 1.25, letterSpacing: '-0.015em' },
      h6: { fontFamily: FONTS.display, fontWeight: 600, fontSize: '1rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 800 },
      body2: { fontWeight: 500 },
      caption: { fontWeight: 600 },
      button: { fontWeight: 800, textTransform: 'none', letterSpacing: '0.005em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.bg,
            WebkitFontSmoothing: 'antialiased',
            '--g-bg': t.bg,
            '--g-side': t.side,
            '--g-surface': t.surface,
            '--g-surface-2': t.surface2,
            '--g-surface-3': t.surface3,
            '--g-field': t.field,
            '--g-track': t.track,
            '--g-line': t.line,
            '--g-line-2': t.line2,
            '--g-text': t.text,
            '--g-text-2': t.text2,
            '--g-text-3': t.text3,
            '--g-accent': t.accent,
            '--g-accent-text': t.accentText,
            '--g-accent-2': t.accent2,
            '--g-glow-a': t.glowA,
            '--g-glow-b': t.glowB,
            '--g-dots': t.dots,
            '--g-shadow': t.shadow,
            '--g-display': FONTS.display,
            '--g-mono': FONTS.mono,
            '--g-ease': EASE,
          },
          '::selection': { backgroundColor: alpha(t.accent, 0.35) },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: t.line, borderRadius: 16, boxShadow: t.shadow },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundColor: t.surface,
            transition: `transform 0.3s ${EASE}, border-color 0.3s ${EASE}, box-shadow 0.3s ${EASE}, background-color 0.3s ${EASE}`,
          },
        },
      },
      MuiCardActionArea: {
        styleOverrides: {
          focusHighlight: { backgroundColor: t.text },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            minHeight: 34,
            paddingLeft: 14,
            paddingRight: 14,
            transition: `transform 0.25s ${EASE}, box-shadow 0.25s ${EASE}, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease`,
          },
          sizeSmall: { minHeight: 29, borderRadius: 8, paddingLeft: 10, paddingRight: 10, fontSize: '0.75rem' },
          sizeLarge: { minHeight: 42, fontSize: '0.875rem' },
          containedPrimary: {
            color: t.accentInk,
            backgroundColor: t.accent,
            boxShadow: `0 12px 28px -14px ${alpha(t.accent, 0.8)}, inset 0 1px 0 rgba(255, 255, 255, 0.35)`,
            '&:hover': {
              backgroundColor: t.accentHover,
              transform: 'translateY(-1px)',
              boxShadow: `0 16px 34px -14px ${alpha(t.accent, 0.95)}, inset 0 1px 0 rgba(255, 255, 255, 0.4)`,
            },
          },
          containedError: {
            color: '#ffffff',
            backgroundColor: '#cf3354',
            '&:hover': { backgroundColor: '#bb2a49', transform: 'translateY(-1px)' },
          },
          outlined: {
            color: t.text,
            borderColor: t.line2,
            backgroundColor: t.surface2,
            '&:hover': { borderColor: alpha(t.accent, 0.55), backgroundColor: t.surface3 },
          },
          outlinedPrimary: {
            color: t.text,
            borderColor: t.line2,
            backgroundColor: t.surface2,
            '&:hover': { borderColor: alpha(t.accent, 0.55), backgroundColor: t.surface3 },
          },
          textPrimary: {
            color: t.text2,
            '&:hover': { color: t.text, backgroundColor: t.surface2 },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: { fontWeight: 800, textTransform: 'none' },
          primary: {
            color: t.accentInk,
            backgroundColor: t.accent,
            boxShadow: `0 22px 44px -14px ${alpha(t.accent, 0.7)}, inset 0 0 0 1px rgba(255, 255, 255, 0.12)`,
            '&:hover': { backgroundColor: t.accentHover },
          },
          extended: { height: 44, borderRadius: 14, paddingLeft: 16, paddingRight: 20, fontSize: '0.84rem' },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'background-color 0.2s ease, color 0.2s ease',
          },
          colorError: {
            '&:hover': { backgroundColor: alpha(t.risk, 0.12) },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ ownerState, theme }) => {
            const base = { fontWeight: 800, borderRadius: 999 };
            const color = ownerState.color;
            if (ownerState.variant === 'outlined') {
              return {
                ...base,
                borderColor: t.line2,
                backgroundColor: t.surface2,
                '&.MuiChip-clickable:hover': { backgroundColor: t.surface3, borderColor: alpha(t.accent, 0.55) },
              };
            }
            if (color && color !== 'default' && theme.palette[color]) {
              const main = theme.palette[color].main;
              return {
                ...base,
                color: main,
                backgroundColor: alpha(main, 0.14),
                border: `1px solid ${alpha(main, 0.3)}`,
                '& .MuiChip-icon': { color: 'inherit' },
                '&.MuiChip-clickable:hover': { backgroundColor: alpha(main, 0.22) },
              };
            }
            return {
              ...base,
              color: t.text2,
              backgroundColor: t.surface3,
              border: `1px solid ${t.line}`,
              '& .MuiChip-deleteIcon': { color: t.text3, '&:hover': { color: t.text } },
            };
          },
          sizeSmall: { height: 22, fontSize: '0.69rem' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: t.line, fontSize: '0.8125rem' },
          head: {
            fontFamily: FONTS.mono,
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: t.text3,
            backgroundColor: t.surface2,
            whiteSpace: 'nowrap',
          },
          stickyHeader: { backgroundColor: t.surface2 },
          sizeSmall: { padding: '9px 14px' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.25s ease',
            '&.MuiTableRow-hover:hover': { backgroundColor: t.surface2 },
          },
        },
      },
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            '&:hover': { color: t.text },
            '&.Mui-active': { color: t.text },
            '&.Mui-active .MuiTableSortLabel-icon': { color: t.accentText },
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: { color: t.text2, borderTop: `1px solid ${t.line}` },
          selectLabel: { fontSize: '0.8125rem', fontWeight: 600 },
          displayedRows: { fontSize: '0.8125rem', fontWeight: 600, fontFamily: FONTS.mono },
        },
      },
      // Labels sit above the field instead of floating inside the outline, so
      // every form reads the same way at a glance.
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            position: 'relative',
            transform: 'none',
            maxWidth: '100%',
            whiteSpace: 'normal',
            overflow: 'visible',
            marginBottom: 6,
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.01em',
            lineHeight: 1.4,
            color: t.text2,
            pointerEvents: 'auto',
            '&.Mui-focused': { color: t.text2 },
            '&.Mui-error': { color: t.risk },
          },
          asterisk: { color: t.accentText },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontSize: '0.84rem',
            backgroundColor: t.field,
            '&.MuiInputBase-multiline': { padding: '9px 12px' },
            '&.MuiInputBase-multiline.MuiInputBase-sizeSmall': { padding: '7px 11px' },
            transition: 'box-shadow 0.2s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(t.text3, 0.75) },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.accent, borderWidth: 1 },
            '&.Mui-focused': { boxShadow: `0 0 0 4px ${accentRing}` },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: t.risk },
            '&.Mui-error.Mui-focused': { boxShadow: `0 0 0 4px ${alpha(t.risk, 0.16)}` },
          },
          notchedOutline: {
            top: 0,
            borderColor: t.line2,
            '& legend': { display: 'none' },
          },
          input: {
            fontWeight: 600,
            padding: '9px 12px',
            '&[type="date"], &[type="datetime-local"]': { cursor: 'pointer' },
            '&::-webkit-calendar-picker-indicator': {
              cursor: 'pointer',
              opacity: 0.8,
              borderRadius: 4,
              transition: 'opacity 0.2s ease',
            },
            '&::-webkit-calendar-picker-indicator:hover': { opacity: 1 },
          },
          inputSizeSmall: { padding: '7px 11px' },
          inputMultiline: { padding: 0 },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginLeft: 0,
            marginRight: 0,
            marginTop: 5,
            fontSize: '0.69rem',
            fontWeight: 500,
            color: t.text3,
            '&.Mui-error': { color: t.risk, fontWeight: 700 },
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          label: { fontWeight: 700, fontSize: '0.8125rem' },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: { color: t.text3 },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: 6,
            backgroundColor: t.surface2,
            border: `1px solid ${t.line2}`,
            borderRadius: 16,
            boxShadow: t.popShadow,
          },
          list: { padding: 6 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            minHeight: 34,
            fontSize: '0.8125rem',
            fontWeight: 600,
            '&:hover': { backgroundColor: t.surface3 },
            '&.Mui-selected': { backgroundColor: alpha(t.accent, 0.14) },
            '&.Mui-selected:hover': { backgroundColor: alpha(t.accent, 0.2) },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            marginTop: 6,
            backgroundColor: t.surface2,
            border: `1px solid ${t.line2}`,
            borderRadius: 14,
            boxShadow: t.popShadow,
          },
          listbox: { padding: 6 },
          // Match the compact height of every other field.
          inputRoot: { paddingTop: 4, paddingBottom: 4 },
          input: { paddingTop: '4.5px !important', paddingBottom: '4.5px !important' },
          option: {
            borderRadius: 8,
            fontSize: '0.875rem',
            fontWeight: 600,
            '&.Mui-focused': { backgroundColor: `${t.surface3} !important` },
          },
          noOptions: { color: t.text3 },
          loading: { color: t.text3 },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: { height: 6, color: t.accent },
          sizeSmall: { height: 5 },
          rail: { backgroundColor: t.track, opacity: 1 },
          track: { border: 'none' },
          thumb: {
            width: 18,
            height: 18,
            backgroundColor: '#ffffff',
            border: `4px solid ${t.accent}`,
            boxShadow: `0 0 0 5px ${accentRing}, 0 4px 10px rgba(0, 0, 0, 0.35)`,
            '&::before': { boxShadow: 'none' },
            '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: `0 0 0 7px ${alpha(t.accent, 0.26)}, 0 4px 10px rgba(0, 0, 0, 0.35)` },
            '.MuiSlider-sizeSmall &': { width: 15, height: 15, borderWidth: 3.5 },
          },
          valueLabel: {
            backgroundColor: t.surface3,
            color: t.text,
            borderRadius: 8,
            fontFamily: FONTS.mono,
            fontWeight: 600,
            fontSize: '0.75rem',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { width: 40, height: 24, padding: 0, margin: '0 10px 0 8px', overflow: 'visible' },
          switchBase: {
            padding: 3,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#ffffff',
              '& + .MuiSwitch-track': { backgroundColor: t.accent, opacity: 1, borderColor: 'transparent' },
            },
            '&.Mui-focusVisible + .MuiSwitch-track': { outline: `2px solid ${t.accent}`, outlineOffset: 2 },
          },
          thumb: { width: 18, height: 18, backgroundColor: '#ffffff', boxShadow: '0 3px 8px rgba(0, 0, 0, 0.4)' },
          track: {
            borderRadius: 12,
            backgroundColor: t.surface3,
            border: `1px solid ${t.line2}`,
            opacity: 1,
            transition: `background-color 0.3s ${EASE}`,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 6,
            borderRadius: 99,
            '&.MuiLinearProgress-determinate .MuiLinearProgress-bar': {
              animation: `g-bar-in 1.2s ${EASE} both`,
            },
          },
          colorPrimary: { backgroundColor: t.track },
          bar: { borderRadius: 99 },
          barColorPrimary: { backgroundColor: t.accent },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            position: 'relative',
            backgroundColor: t.surface,
            border: `1px solid ${t.line2}`,
            borderRadius: 18,
            boxShadow: '0 50px 90px -30px rgba(0, 0, 0, 0.85)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: t.accent,
            },
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: t.scrim,
            backdropFilter: 'blur(6px)',
            '&.MuiBackdrop-invisible': { backgroundColor: 'transparent', backdropFilter: 'none' },
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontFamily: FONTS.display,
            fontWeight: 600,
            fontSize: '1.05rem',
            letterSpacing: '-0.015em',
            padding: '20px 22px 4px',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: { padding: '10px 22px 6px', '.MuiDialogTitle-root + &': { paddingTop: 10 } },
        },
      },
      MuiDialogContentText: {
        styleOverrides: {
          root: { color: t.text2, fontSize: '0.84rem', lineHeight: 1.6 },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: '14px 22px 18px' },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: ({ ownerState, theme }) => {
            const base = { borderRadius: 12, alignItems: 'center', fontSize: '0.8125rem', fontWeight: 600, padding: '2px 14px' };
            if (ownerState.variant !== 'standard') return base;
            const main = theme.palette[ownerState.color || ownerState.severity || 'info'].main;
            return {
              ...base,
              color: t.text,
              backgroundColor: alpha(main, mode === 'dark' ? 0.1 : 0.08),
              border: `1px solid ${alpha(main, 0.28)}`,
              '& .MuiAlert-icon': { color: main },
            };
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: t.surface3,
            color: t.text,
            border: `1px solid ${t.line2}`,
            borderRadius: 10,
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '8px 10px',
            boxShadow: t.popShadow,
          },
          arrow: { color: t.surface3 },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          root: { fontSize: '0.78rem', fontWeight: 700, color: t.text3 },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: t.line },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: t.side, borderRight: `1px solid ${t.line}` },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: { fontWeight: 800, fontSize: '0.66rem', minWidth: 18, height: 18, boxShadow: `0 0 0 2px ${t.side}` },
        },
      },
    },
  });
};

export default getTheme;
