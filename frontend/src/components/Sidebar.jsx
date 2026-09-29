import AssignmentIcon from '@mui/icons-material/Assignment';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import InsightsIcon from '@mui/icons-material/Insights';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PERSONA_LABELS } from '../labels';
import { NAV_ITEMS, SHOW_ALERT_BELL } from '../persona/navConfig';
import { usePersona } from '../persona/PersonaContext';
import AiGarageLogo from './AiGarageLogo';
import AlertBell from './AlertBell';

const EXPANDED_WIDTH = 232;
const COLLAPSED_WIDTH = 68;
const COLLAPSE_KEY = 'agent-dashboard.sidebarCollapsed';

const NAV_ICONS = {
  '/': HomeIcon,
  '/marketplace': StorefrontIcon,
  '/insights': InsightsIcon,
  '/daily-sheet': AssignmentIcon,
  '/teams': GroupsIcon,
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

// Everything that used to live in the top AppBar (brand mark, nav, theme
// toggle, alerts, persona switch) now lives here instead, so the top of the
// page is nothing but table headers and table content.
export default function Sidebar({ onToggleTheme, themeMode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { persona, clearPersona } = usePersona();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  };

  const handleSwitchPersona = () => {
    clearPersona();
    navigate('/login');
  };

  const items = NAV_ITEMS.filter((item) => item.visibleTo.includes(persona));
  const showRail = collapsed && !isNarrow;
  const width = showRail ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const navList = (
    <List sx={{ px: 1, py: 1 }}>
      {items.map((item) => {
        const Icon = NAV_ICONS[item.path] || HomeIcon;
        const isActive = location.pathname === item.path;
        const button = (
          <ListItemButton
            key={item.path}
            component={Link}
            to={item.path}
            selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => setMobileOpen(false)}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              justifyContent: showRail ? 'center' : 'flex-start',
              px: showRail ? 1.5 : 2,
            }}
          >
            <ListItemIcon sx={{ minWidth: showRail ? 0 : 40, justifyContent: 'center', color: isActive ? 'primary.main' : 'inherit' }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            {!showRail && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }} />}
          </ListItemButton>
        );
        return showRail ? (
          <Tooltip key={item.path} title={item.label} placement="right">
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </List>
  );

  const footer = (
    <Box sx={{ p: 1.5 }}>
      {!isNarrow && (
        <Box sx={{ display: 'flex', justifyContent: showRail ? 'center' : 'flex-end', mb: 1 }}>
          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton size="small" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction={showRail ? 'column' : 'row'} spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction={showRail ? 'column' : 'row'} spacing={0.5} alignItems="center">
          <Tooltip title={themeMode === 'light' ? 'Dark mode' : 'Light mode'}>
            <IconButton onClick={onToggleTheme} size="small">
              {themeMode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          {SHOW_ALERT_BELL.includes(persona) && <AlertBell />}
        </Stack>
        <Tooltip title={showRail ? 'Switch persona' : ''}>
          <Chip
            label={showRail ? PERSONA_LABELS[persona]?.slice(0, 2).toUpperCase() : `${PERSONA_LABELS[persona]} · Switch`}
            onClick={handleSwitchPersona}
            variant="outlined"
            size="small"
          />
        </Tooltip>
      </Stack>
    </Box>
  );

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" justifyContent={showRail ? 'center' : 'flex-start'} sx={{ p: 1.5 }}>
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
          <AiGarageLogo size={32} withWordmark={!showRail} fitWidth={showRail} />
        </Box>
      </Stack>
      <Divider />
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>{navList}</Box>
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
            zIndex: (t) => t.zIndex.drawer + 1,
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <MenuIcon />
        </IconButton>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}>
          <Box sx={{ width: EXPANDED_WIDTH }}>{drawerContent}</Box>
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
