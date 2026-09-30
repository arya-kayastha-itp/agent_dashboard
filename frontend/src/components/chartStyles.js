import { FONTS } from '../theme';

// Shared Recharts styling so every chart reads as the same system: mono axis
// ticks in the muted text tone, and a tooltip card matching the app's menus.

export function chartAxisTick(theme) {
  return { fill: theme.palette.garage.text3, fontSize: 10.5, fontFamily: FONTS.mono };
}

export function chartTooltipProps(theme) {
  const g = theme.palette.garage;
  return {
    contentStyle: {
      background: g.surface3,
      border: `1px solid ${g.line2}`,
      borderRadius: 12,
      boxShadow: g.popShadow,
      padding: '10px 12px',
      fontFamily: FONTS.sans,
      fontSize: 11.5,
      fontWeight: 700,
    },
    labelStyle: { color: g.text3, fontFamily: FONTS.mono, fontWeight: 600, marginBottom: 4 },
    itemStyle: { color: g.text, padding: '2px 0' },
    cursor: { fill: g.track, stroke: g.line2 },
  };
}
