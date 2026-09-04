import { useState } from 'react'

/**
 * Seleccion de filas para acciones en lote.
 *
 * Solo cuenta lo que esta a la vista: al cambiar de pagina o de busqueda, lo que ya no se ve
 * deja de estar seleccionado. Asi nadie borra una fila que no tiene delante.
 */
export function useSelection(visibleIds: readonly number[]) {
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())

  const selected = visibleIds.filter((id) => picked.has(id))
  const allSelected = visibleIds.length > 0 && selected.length === visibleIds.length

  return {
    /** Ids seleccionados y visibles, en el orden de la tabla. */
    selected,
    count: selected.length,
    allSelected,
    isSelected: (id: number) => picked.has(id),
    toggle: (id: number) =>
      setPicked((current) => {
        const next = new Set(current)
        if (!next.delete(id)) next.add(id)
        return next
      }),
    toggleAll: () => setPicked(allSelected ? new Set<number>() : new Set(visibleIds)),
    clear: () => setPicked(new Set<number>()),
  }
}
