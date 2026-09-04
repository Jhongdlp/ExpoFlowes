import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api/client'
import type { ExhibitorDetail } from '../../api/types'
import { PageHeader } from '../../components/PageHeader'
import { ExhibitorForm } from './ExhibitorForm'
import type { ExhibitorFormValues } from './schema'

export function ExhibitorCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: ExhibitorFormValues) =>
      api.post<ExhibitorDetail>('/exhibitors', values),
    onSuccess: async (created) => {
      // El alta crea tambien el usuario del representante y su token, en la misma
      // transaccion; los agregados del panel cambian, asi que se invalidan.
      await queryClient.invalidateQueries({ queryKey: ['exhibitors'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate(`/admin/expositores/${created.id}`, { replace: true })
    },
  })

  return (
    <>
      <PageHeader
        title="Nuevo expositor"
        subtitle="Al guardar se crea el acceso del representante y se le envía el enlace para establecer su contraseña."
      />
      <ExhibitorForm
        onSubmit={async (values) => {
          await mutation.mutateAsync(values).catch(() => undefined)
        }}
        onCancel={() => navigate('/admin/expositores')}
        submitting={mutation.isPending}
        serverError={mutation.error}
        onDismissError={() => mutation.reset()}
      />
    </>
  )
}
