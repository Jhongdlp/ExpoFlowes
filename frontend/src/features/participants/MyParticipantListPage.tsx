import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../../api/client'
import type { MyParticipantPage, Participant } from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Pagination } from '../../components/Pagination'
import { ServerError } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Table, TBody, TD, TH } from '../../components/ui/Table'

const PAGE_SIZE = 20

export function MyParticipantListPage() {
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<Participant | null>(null)
  const queryClient = useQueryClient()

  const participants = useQuery({
    queryKey: ['me', 'participants', page],
    queryFn: () =>
      api.get<MyParticipantPage>(`/me/participants?page=${page}&page_size=${PAGE_SIZE}`),
    placeholderData: (previous) => previous,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/me/participants/${id}`),
    onSuccess: async () => {
      // Borrar libera cupo y libera la identificacion en la feria (§7.2).
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const nueva = (
    <>
      <Link to="/stand/credenciales/carga">
        <Button variant="secondary">Carga masiva</Button>
      </Link>
      <Link to="/stand/credenciales/nueva">
        <Button>Nueva credencial</Button>
      </Link>
    </>
  )

  return (
    <>
      <PageHeader
        title="Credenciales del stand"
        subtitle={
          participants.data === undefined
            ? undefined
            : `${participants.data.total} persona${participants.data.total === 1 ? '' : 's'} acreditada${participants.data.total === 1 ? '' : 's'}`
        }
        actions={nueva}
      />

      {remove.error === null ? null : (
        <div className="mb-6">
          <ServerError error={remove.error} onDismiss={() => remove.reset()} />
        </div>
      )}

      {participants.isPending ? (
        <Loading label="Cargando credenciales" />
      ) : participants.isError ? (
        <ServerError error={participants.error} />
      ) : participants.data.total === 0 ? (
        <EmptyState
          title="Todavía no ha acreditado a nadie"
          description="Registre al personal que operará su stand. Cada persona consume una credencial de su categoría."
          action={nueva}
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <TH>Persona</TH>
                <TH>Identificación</TH>
                <TH>Cargo</TH>
                <TH>Categoría</TH>
                <TH>Correo</TH>
                <TH className="text-right">Acción</TH>
              </tr>
            </thead>
            <TBody>
              {participants.data.items.map((person) => (
                <tr key={person.id} className="hover:bg-fill">
                  <TD>
                    <p className="font-medium">
                      {person.first_name} {person.last_name}
                    </p>
                  </TD>
                  <TD className="tnum text-ink-soft">
                    {person.identification}
                    <p className="label-caps">{person.identification_type}</p>
                  </TD>
                  <TD className="text-ink-soft">{person.position}</TD>
                  <TD>
                    {person.category}
                    {person.provider_company === null ? null : (
                      <p className="text-[12px] text-ink-faint">{person.provider_company}</p>
                    )}
                  </TD>
                  <TD className="text-ink-soft">
                    {person.email ?? <span className="text-ink-faint">Sin correo</span>}
                  </TD>
                  <TD className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setPending(person)}>
                      Eliminar
                    </Button>
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={participants.data.total}
            onChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Eliminar esta credencial"
        description={
          pending === null
            ? ''
            : `Se elimina la credencial de ${pending.first_name} ${pending.last_name}. Se libera el cupo de su categoría y su identificación queda disponible para otro stand de la feria.`
        }
        confirmLabel="Eliminar credencial"
        busy={remove.isPending}
        onConfirm={() => {
          if (pending !== null) remove.mutate(pending.id)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
