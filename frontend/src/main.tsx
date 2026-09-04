import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { ApiError } from './api/client'
import { AccessibilityProvider } from './features/accessibility/AccessibilityContext'
import { LanguageProvider } from './features/i18n/LanguageContext'
import { SessionProvider } from './features/auth/session'
import { AppRoutes } from './routes/AppRoutes'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reintentar un 401 o un 404 solo retrasa el mensaje al usuario.
      retry: (attempt, error) => attempt < 2 && !(error instanceof ApiError && error.status < 500),
      refetchOnWindowFocus: false,
    },
  },
})

const container = document.getElementById('root')
if (container === null) throw new Error('Falta el nodo #root')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <LanguageProvider>
          <SessionProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </SessionProvider>
        </LanguageProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  </StrictMode>,
)
