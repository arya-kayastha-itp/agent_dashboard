import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import HomeIcon from '@mui/icons-material/Home';
import InsightsIcon from '@mui/icons-material/Insights';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Fragment, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PERSONA_LABELS } from '../labels';
import { useAgents } from '../hooks/useAgents';
import { useSubmissions } from '../hooks/useSubmissions';
import { NAV_ITEMS, SHOW_ALERT_BELL } from '../persona/navConfig';
import { usePersona } from '../persona/PersonaContext';
import { canReviewUpdates, isAssignedTo } from '../persona/permissions';
import AiGarageLogo from './AiGarageLogo';
import AlertBell from './AlertBell';

const EXPANDED_WIDTH = 224;
const COLLAPSED_WIDTH = 66;
const COLLAPSE_KEY = 'agent-dashboard.sidebarCollapsed';

const NAV_ICONS = {
  '/': HomeIcon,
  '/my-agents': AssignmentIndIcon,
  '/review': FactCheckIcon,
  '/marketplace': StorefrontIcon,
  '/insights': InsightsIcon,
  '/daily-sheet': AssignmentIcon,
  '/teams': GroupsIcon,
  '/audit': HistoryIcon,
  '/finops/pricing': PriceChangeIcon,
  '/finops/thresholds': NotificationsActiveIcon,
};

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0');
  } catch {
    // localStorage unavailable — collapse state just won't persist
  }
}

const sectionLabelSx = {
  px: 1.5,
  pt: 2,
  pb: 1,
  fontFamily: 'var(--g-mono)',
  fontSize: '0.6rem',
  fontWeight: 600,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'text.disabled',
};

// Everything that used to live in the top AppBar (brand mark, nav, theme
// toggle, alerts, who's signed in) now lives here instead, so the top of the
// page is nothing but table headers and table content.
export default function Sidebar({ onToggleTheme, themeMode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { persona, user, clearPersona } = usePersona();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  // Same query (and cache) as the Review page, so the count stays in step with it.
  const { data: pendingReviews } = useSubmissions({ status: 'pending' }, { enabled: canReviewUpdates(persona) });
  const pendingReviewCount = pendingReviews?.length || 0;
  // Same agent list (and cache) the pages use — decides whether My Agents shows.
  const hasAssignedOnlyItems = NAV_ITEMS.some((item) => item.onlyWhenAssigned && item.visibleTo.includes(persona));
  const { data: agents } = useAgents({ enabled: hasAssignedOnlyItems });
  const isAssignedToAny = Boolean(agents?.some((agent) => isAssignedTo(agent, user)));

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  };

  const handleSignOut = () => {
    clearPersona();
    navigate('/login');
  };

  const items = NAV_ITEMS.filter((item) => item.visibleTo.includes(persona) && (!item.onlyWhenAssigned || isAssignedToAny));
  const showRail = collapsed && !isNarrow;
  const width = showRail ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  const personaLabel = PERSONA_LABELS[persona];
  const displayName = user?.name || personaLabel;
  const initials = (displayName || '')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const accent = theme.palette.primary.main;

  const navList = (
    <List sx={{ px: 1.5, py: 1.5 }}>
      {items.map((item, index) => {
        const Icon = NAV_ICONS[item.path] || HomeIcon;
        const isActive = location.pathname === item.path;
        // Pricing and Alert Rules are flagged `configure` in navConfig —
        // occasional setup tasks, so they get their own labelled group.
        const startsConfigureGroup = item.configure && !items[index - 1]?.configure;
        const button = (
          <ListItemButton
            component={Link}
            to={item.path}
            selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => setMobileOpen(false)}
            sx={{
              position: 'relative',
              minHeight: 38,
              borderRadius: '10px',
              mb: 0.5,
              justifyContent: showRail ? 'center' : 'flex-start',
              px: 1.5,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'var(--g-surface-2)', color: 'text.primary' },
              '&.Mui-selected': {
                bgcolor: alpha(accent, 0.12),
                color: 'text.primary',
                '&:hover': { bgcolor: alpha(accent, 0.16) },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: -10.5,
                  top: 9,
                  bottom: 9,
                  width: 3,
                  borderRadius: '0 3px 3px 0',
                  bgcolor: 'primary.main',
                  boxShadow: `0 0 12px ${alpha(accent, 0.65)}`,
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: showRail ? 0 : 32,
                justifyContent: 'center',
                color: isActive ? 'var(--g-accent-text)' : 'inherit',
              }}
            >
              {item.path === '/review' ? (
                <Badge badgeContent={pendingReviewCount} color="primary" max={99} sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                  <Icon sx={{ fontSize: 18 }} />
                </Badge>
              ) : (
                <Icon sx={{ fontSize: 18 }} />
              )}
            </ListItemIcon>
            {!showRail && (
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isActive ? 800 : 600 }}
              />
            )}
          </ListItemButton>
        );
        return (
          <Fragment key={item.path}>
            {startsConfigureGroup &&
              (showRail ? (
                <Divider sx={{ my: 1.5, mx: 1 }} />
              ) : (
                <Typography component="div" sx={sectionLabelSx}>
                  Configure
                </Typography>
              ))}
            {showRail ? (
              <Tooltip title={item.label} placement="right">
                {button}
              </Tooltip>
            ) : (
              button
            )}
          </Fragment>
        );
      })}
    </List>
  );

  const themeButton = (mode, label, Icon) => {
    const active = themeMode === mode;
    return (
      <Tooltip title={label}>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={active}
          onClick={active ? undefined : onToggleTheme}
          sx={{
            width: 30,
            height: 26,
            borderRadius: '8px',
            color: active ? 'text.primary' : 'text.disabled',
            bgcolor: active ? 'var(--g-surface-3)' : 'transparent',
            boxShadow: active ? '0 4px 10px -6px rgba(0, 0, 0, 0.6)' : 'none',
            '&:hover': { bgcolor: active ? 'var(--g-surface-3)' : 'var(--g-surface-2)', color: 'text.primary' },
          }}
        >
          <Icon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    );
  };

  const footer = (
    <Box sx={{ p: 1.5, pt: 1 }}>
      {!isNarrow && (
        <Box sx={{ display: 'flex', justifyContent: showRail ? 'center' : 'flex-end', mb: 1 }}>
          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton
              size="small"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary', bgcolor: 'var(--g-surface-2)' } }}
            >
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction={showRail ? 'column' : 'row'} spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Stack
          direction={showRail ? 'column' : 'row'}
          role="group"
          aria-label="Theme"
          spacing={0.25}
          sx={{ p: '3px', borderRadius: '12px', bgcolor: 'var(--g-field)', border: 1, borderColor: 'divider' }}
        >
          {themeButton('dark', 'Dark mode', DarkModeIcon)}
          {themeButton('light', 'Light mode', LightModeIcon)}
        </Stack>
        {SHOW_ALERT_BELL.includes(persona) && <AlertBell />}
      </Stack>
      <Tooltip title={showRail ? `${displayName} (${personaLabel}) · Sign out` : personaLabel} placement="right">
        <ButtonBase
          onClick={handleSignOut}
          aria-label={`${displayName} · Sign out`}
          sx={{
            width: '100%',
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: showRail ? 'center' : 'space-between',
            gap: 1,
            px: showRail ? 0 : 1,
            pr: showRail ? 0 : 1.75,
            borderRadius: '12px',
            border: 1,
            borderColor: 'var(--g-line-2)',
            bgcolor: 'var(--g-surface-2)',
            color: 'text.primary',
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            '&:hover': { borderColor: alpha(accent, 0.55), bgcolor: 'var(--g-surface-3)' },
            '&.Mui-focusVisible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
          }}
        >
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Box
              component="span"
              aria-hidden="true"
              sx={{
                width: 24,
                height: 24,
                flexShrink: 0,
                borderRadius: '8px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.58rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              {initials}
            </Box>
            {!showRail && (
              <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </Box>
            )}
          </Box>
          {!showRail && (
            <Box component="span" sx={{ fontSize: '0.69rem', fontWeight: 700, color: 'text.disabled', flexShrink: 0 }}>
              Sign out
            </Box>
          )}
        </ButtonBase>
      </Tooltip>
    </Box>
  );

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" justifyContent={showRail ? 'center' : 'flex-start'} sx={{ px: 1.5, pt: 2, pb: 1.75 }}>
        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            textDecoration: 'none',
            color: 'inherit',
            overflow: 'hidden',
            width: showRail ? '100%' : 'auto',
            justifyContent: showRail ? 'center' : 'flex-start',
          }}
        >
          <AiGarageLogo size={28} withWordmark={!showRail} fitWidth={showRail} />
        </Box>
      </Stack>
      <Divider sx={{ mx: 1.5 }} />
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>{navList}</Box>
      {footer}
    </Box>
  );

  if (isNarrow) {
    return (
      <>
        <IconButton
          aria-label="Open navigation menu"
          onClick={() => setMobileOpen(true)}
          sx={{
            position: 'fixed',
            top: 12,
            left: 12,
            width: 40,
            height: 40,
            zIndex: (t) => t.zIndex.drawer + 1,
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'var(--g-line-2)',
            color: 'text.primary',
            '&:hover': { backgroundColor: 'var(--g-surface-2)' },
          }}
        >
          <MenuIcon />
        </IconButton>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}>
          <Box sx={{ width: EXPANDED_WIDTH, height: '100%' }}>{drawerContent}</Box>
        </Drawer>
      </>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        transition: (t) => t.transitions.create('width', { duration: t.transitions.duration.shortest }),
        '& .MuiDrawer-paper': {
          width,
          overflowX: 'hidden',
          transition: (t) => t.transitions.create('width', { duration: t.transitions.duration.shortest }),
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
