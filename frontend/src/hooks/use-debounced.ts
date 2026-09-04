import { useEffect, useState } from 'react'

/**
 * Valor que se estabiliza tras `delay` ms sin cambios.
 *
 * Los buscadores consultan al servidor: sin esto, escribir "constructora" son once peticiones
 * y la ultima puede llegar antes que la anterior.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
