import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import logo from '../assets/ai-garage-logo.png';
import AccentMark from './AccentMark';
import AiGarageLogo from './AiGarageLogo';

const orbSx = {
  position: 'absolute',
  borderRadius: '50%',
  filter: 'blur(70px)',
  animation: 'g-orb 14s ease-in-out infinite',
  pointerEvents: 'none',
};

// Shared frame for the signed-out screens (sign in, set password, forgot
// password): the brand panel on the left, a narrow form column on the right.
export default function AuthLayout({ title, children }) {
  // The logo is a large PNG — hold it back until decoded so it never paints half-drawn.
  const [logoLoaded, setLogoLoaded] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.15fr) minmax(0, 1fr)' } }}>
      {/* Brand panel — the logo on its native black, lit by two slow orbs. */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3.5,
          bgcolor: '#000000',
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ ...orbSx, width: 380, height: 380, left: '12%', top: '22%', bgcolor: '#ff8a3d', opacity: 0.55 }} />
        <Box sx={{ ...orbSx, width: 440, height: 440, right: '8%', bottom: '14%', bgcolor: '#e85d9a', opacity: 0.3, animationDelay: '-7s' }} />
        <Box
          component="img"
          src={logo}
          alt="AI Garage"
          onLoad={() => setLogoLoaded(true)}
          sx={{
            position: 'relative',
            zIndex: 1,
            width: 'min(460px, 66%)',
            height: 'auto',
            borderRadius: '22px',
            boxShadow: '0 60px 120px -40px rgba(255, 138, 61, 0.5)',
            opacity: logoLoaded ? 1 : 0,
            transform: logoLoaded ? 'none' : 'translateY(12px) scale(0.975)',
            transition: 'opacity 0.9s var(--g-ease), transform 0.9s var(--g-ease)',
          }}
        />
        <Typography
          sx={{
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--g-mono)',
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.7)',
            animation: 'g-fade 1.2s var(--g-ease) 0.4s backwards',
          }}
        >
          Agents Dashboard
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 3, sm: 6, lg: 12 }, py: 8 }}>
        <Box sx={{ width: '100%', maxWidth: 380, animation: 'g-rise 0.8s var(--g-ease) 0.2s backwards' }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 5 }}>
            <AiGarageLogo size={44} />
          </Box>

          <AccentMark />
          <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
            {title}
          </Typography>

          {children}
        </Box>
      </Box>
    </Box>
  );
}
