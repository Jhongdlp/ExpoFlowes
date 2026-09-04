import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '../components/AppLayout'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { HomeRedirect, RequireRole } from '../features/auth/guards'
import { LoginPage } from '../features/auth/LoginPage'
import { SetPasswordPage } from '../features/auth/SetPasswordPage'
import { AdminDashboardPage } from '../features/dashboard/AdminDashboardPage'
import { ExhibitorListPage } from '../features/exhibitors/ExhibitorListPage'
import { StandDashboardPage } from '../features/dashboard/StandDashboardPage'

/** Secciones cuyo contenido llega en las fases siguientes. La navegacion no miente. */
function Pending({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        title="Sección en preparación"
        description="Esta pantalla se habilita en la siguiente entrega. El resto de la plataforma ya funciona."
      />
    </>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/establecer-clave" element={<SetPasswordPage />} />

      <Route
        element={
          <RequireRole role="admin">
            <AppLayout />
          </RequireRole>
        }
      >
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/expositores" element={<ExhibitorListPage />} />
        <Route path="/admin/credenciales" element={<Pending title="Credenciales" />} />
      </Route>

      <Route
        element={
          <RequireRole role="representative">
            <AppLayout />
          </RequireRole>
        }
      >
        <Route path="/stand" element={<StandDashboardPage />} />
        <Route path="/stand/credenciales" element={<Pending title="Credenciales del stand" />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
