import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '../components/AppLayout'
import { HomeRedirect, RequireRole } from '../features/auth/guards'
import { LoginPage } from '../features/auth/LoginPage'
import { SetPasswordPage } from '../features/auth/SetPasswordPage'
import { AdminDashboardPage } from '../features/dashboard/AdminDashboardPage'
import { ExhibitorCreatePage } from '../features/exhibitors/ExhibitorCreatePage'
import { ExhibitorDetailPage } from '../features/exhibitors/ExhibitorDetailPage'
import { ExhibitorListPage } from '../features/exhibitors/ExhibitorListPage'
import { MyParticipantListPage } from '../features/participants/MyParticipantListPage'
import { ParticipantCreatePage } from '../features/participants/ParticipantCreatePage'
import { ParticipantListPage } from '../features/participants/ParticipantListPage'
import { StandDashboardPage } from '../features/dashboard/StandDashboardPage'

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
        <Route path="/admin/expositores/nuevo" element={<ExhibitorCreatePage />} />
        <Route path="/admin/expositores/:id" element={<ExhibitorDetailPage />} />
        <Route path="/admin/credenciales" element={<ParticipantListPage />} />
      </Route>

      <Route
        element={
          <RequireRole role="representative">
            <AppLayout />
          </RequireRole>
        }
      >
        <Route path="/stand" element={<StandDashboardPage />} />
        <Route path="/stand/credenciales" element={<MyParticipantListPage />} />
        <Route path="/stand/credenciales/nueva" element={<ParticipantCreatePage />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
