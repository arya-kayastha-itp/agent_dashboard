import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import './index.css'
import { PersonaProvider } from './persona/PersonaContext.jsx'
import { ThemeProvider as AppThemeProvider } from './theme/ThemeContext.jsx'
import getTheme from './theme.js'

const queryClient = new QueryClient()

function Root() {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light')

  const handleToggleTheme = () => {
    setMode((prev) => {
      const newMode = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('themeMode', newMode)
      return newMode
    })
  }

  const theme = getTheme(mode)

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AppThemeProvider>
              <PersonaProvider>
                <ToastProvider>
                  <App onToggleTheme={handleToggleTheme} themeMode={mode} />
                </ToastProvider>
              </PersonaProvider>
            </AppThemeProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
