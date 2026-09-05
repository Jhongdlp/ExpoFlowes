import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '../components/AppLayout'
import { NotFoundPage } from '../components/NotFoundPage'
import { OfflinePage } from '../components/OfflinePage'
import { BulkUploadPage } from '../features/bulk-upload/BulkUploadPage'
import { CredentialPrintPage } from '../features/participants/CredentialPrintPage'
import { DocumentationPage } from '../features/docs/DocumentationPage'
import { HomeRedirect, RequireRole } from '../features/auth/guards'
import { LoginPage } from '../features/auth/LoginPage'
import { SetPasswordPage } from '../features/auth/SetPasswordPage'
import { AdminDashboardPage } from '../features/dashboard/AdminDashboardPage'
import { ExhibitorCreatePage } from '../features/exhibitors/ExhibitorCreatePage'
import { ExhibitorDetailPage } from '../features/exhibitors/ExhibitorDetailPage'
import { ExhibitorListPage } from '../features/exhibitors/ExhibitorListPage'
import { useOnlineStatus } from '../hooks/use-online-status'
import { MyParticipantListPage } from '../features/participants/MyParticipantListPage'
import { ParticipantCreatePage } from '../features/participants/ParticipantCreatePage'
import { ParticipantEditPage } from '../features/participants/ParticipantEditPage'
import { ParticipantListPage } from '../features/participants/ParticipantListPage'
import { RulesPage } from '../features/rules/RulesPage'
import { StandDashboardPage } from '../features/dashboard/StandDashboardPage'

export function AppRoutes() {
  const online = useOnlineStatus()
  if (!online) return <OfflinePage />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/establecer-clave" element={<SetPasswordPage />} />
      <Route
        path="/documentacion"
        element={
          <div className="min-h-dvh bg-canvas text-ink">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:px-10">
              <DocumentationPage />
            </div>
          </div>
        }
      />

      <Route
        path="/stand/credenciales/imprimir"
        element={
          <RequireRole role="representative">
            <div className="min-h-dvh bg-canvas text-ink">
              <div className="badge-print-page mx-auto max-w-5xl px-4 py-8 sm:px-6 md:px-10">
                <CredentialPrintPage />
              </div>
            </div>
          </RequireRole>
        }
      />

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
        <Route path="/admin/reglas" element={<RulesPage />} />
        <Route path="/admin/documentacion" element={<DocumentationPage />} />
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
        <Route path="/stand/credenciales/carga" element={<BulkUploadPage />} />
        <Route path="/stand/credenciales/:id" element={<ParticipantEditPage />} />
        <Route path="/stand/documentacion" element={<DocumentationPage />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

