import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MailX, Plus, Upload, Trash2 } from 'lucide-react'

import { api } from '../../api/client'
import type { MyParticipantPage, Participant } from '../../api/types'
import { Avatar } from '../../components/Avatar'
import { CategoryBadge } from '../../components/CategoryBadge'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Pagination } from '../../components/Pagination'
import { SearchInput, normalizeText } from '../../components/SearchInput'
import { ServerError } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Table, TBody, TD, TH } from '../../components/ui/Table'

const PAGE_SIZE = 20

export function MyParticipantListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
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
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const actions = (
    <div className="flex items-center gap-2">
      <Link to="/stand/credenciales/carga">
        <Button variant="secondary" className="gap-2">
          <Upload className="h-4 w-4" />
          <span>Carga masiva</span>
        </Button>
      </Link>
      <Link to="/stand/credenciales/nueva">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Nueva credencial</span>
        </Button>
      </Link>
    </div>
  )

  // Filtrado universal por teclado
  const allItems = participants.data?.items ?? []
  const q = normalizeText(search)
  const visibleItems =
    q === ''
      ? allItems
      : allItems.filter((person) => {
          const fullName = normalizeText(`${person.first_name} ${person.last_name}`)
          const id = normalizeText(person.identification)
          const provider = normalizeText(person.provider_company)
          const position = normalizeText(person.position)
          const email = normalizeText(person.email)
          const categoryName = normalizeText(person.category)

          return (
            fullName.includes(q) ||
            id.includes(q) ||
            provider.includes(q) ||
            position.includes(q) ||
            email.includes(q) ||
            categoryName.includes(q)
          )
        })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credenciales del stand"
        subtitle={
          participants.data === undefined
            ? undefined
            : search !== '' && visibleItems.length !== participants.data.total
              ? `Mostrando ${visibleItems.length} de ${participants.data.total} acreditados`
              : `${participants.data.total} persona${participants.data.total === 1 ? '' : 's'} acreditada${participants.data.total === 1 ? '' : 's'}`
        }
        actions={actions}
      />

      {remove.error !== null && remove.error !== undefined ? (
        <ServerError error={remove.error} onDismiss={() => remove.reset()} />
      ) : null}

      {/* Buscador universal de credenciales */}
      {participants.data && participants.data.total > 0 ? (
        <div className="rounded-lg border border-line bg-surface p-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, cédula/RUC, cargo o correo..."
          />
        </div>
      ) : null}

      {participants.isPending ? (
        <Loading label="Cargando credenciales…" />
      ) : participants.isError ? (
        <ServerError error={participants.error} />
      ) : participants.data.total === 0 ? (
        <EmptyState
          title="Todavía no ha acreditado a nadie"
          description="Registre al personal que operará su stand. Cada persona consume una credencial de su categoría correspondiente."
          action={actions}
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title="Sin resultados para la búsqueda"
          description={`No se encontró ningún acreditado en su stand que coincida con "${search}".`}
          action={
            <Button variant="secondary" onClick={() => setSearch('')}>
              Limpiar búsqueda
            </Button>
          }
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
                <TH>Contacto</TH>
                <TH className="text-right">Acción</TH>
              </tr>
            </thead>
            <TBody>
              {visibleItems.map((person) => (
                <tr
                  key={person.id}
                  className="even:bg-fill/25 hover:bg-fill/60 transition-colors"
                >
                  {/* Persona con Avatar */}
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar
                        firstName={person.first_name}
                        lastName={person.last_name}
                        identification={person.identification}
                        email={person.email}
                      />
                      <div>
                        <p className="font-semibold text-ink leading-tight">
                          {person.first_name} {person.last_name}
                        </p>
                        <p className="text-[11px] text-ink-faint mt-0.5 sm:hidden">
                          {person.position}
                        </p>
                      </div>
                    </div>
                  </TD>

                  {/* Identificacion */}
                  <TD className="tnum">
                    <p className="font-medium text-ink">{person.identification}</p>
                    <p className="label-caps mt-0.5 text-[10px]">{person.identification_type}</p>
                  </TD>

                  {/* Cargo */}
                  <TD className="text-ink-soft">{person.position}</TD>

                  {/* Categoria */}
                  <TD>
                    <CategoryBadge category={person.category} />
                    {person.provider_company ? (
                      <p className="text-[11px] text-ink-faint mt-1">
                        {person.provider_company}
                      </p>
                    ) : null}
                  </TD>

                  {/* Correo */}
                  <TD>
                    {person.email ? (
                      <div className="flex items-center gap-1.5 text-ink-soft">
                        <Mail className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                        <span className="truncate max-w-[200px]">{person.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-ink-faint">
                        <MailX className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                        <span className="text-[12px] italic">Sin correo</span>
                      </div>
                    )}
                  </TD>

                  {/* Accion */}
                  <TD className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPending(person)}
                      className="gap-1 text-ink-faint hover:text-ink"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Eliminar</span>
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
            : `Se eliminará la credencial de ${pending.first_name} ${pending.last_name}. Se liberará el cupo de su categoría (${pending.category}) y su identificación quedará disponible para otro registro.`
        }
        confirmLabel="Eliminar credencial"
        busy={remove.isPending}
        onConfirm={() => {
          if (pending !== null) remove.mutate(pending.id)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
