import { useEffect, useState } from 'react'

import type { Role } from '../../api/types'
import { useTranslation } from '../i18n/LanguageContext'
import { getTourSteps } from './tourSteps'

const storageKey = (role: Role) => `expoflores.tour.seen.${role}`

function hasSeenTour(role: Role): boolean {
  try {
    return localStorage.getItem(storageKey(role)) === '1'
  } catch {
    return true
  }
}

/** Guía de bienvenida: arranca sola la primera vez por rol, y queda disponible para repetirla. */
export function useTourGuide(role: Role) {
  const { t } = useTranslation()
  const steps = getTourSteps(role, t)
  const [stepIndex, setStepIndex] = useState<number | null>(null)

  useEffect(() => {
    if (hasSeenTour(role)) return
    // Deja que el layout termine de montar antes de medir los elementos a resaltar.
    const id = window.setTimeout(() => setStepIndex(0), 500)
    return () => window.clearTimeout(id)
  }, [role])

  const finish = () => {
    setStepIndex(null)
    try {
      localStorage.setItem(storageKey(role), '1')
    } catch {
      // Sin storage disponible el tour simplemente reaparecera la proxima vez.
    }
  }

  const next = () => {
    if (stepIndex === null) return
    if (stepIndex + 1 >= steps.length) finish()
    else setStepIndex(stepIndex + 1)
  }

  const prev = () => {
    if (stepIndex === null || stepIndex === 0) return
    setStepIndex(stepIndex - 1)
  }

  return {
    steps,
    stepIndex,
    start: () => setStepIndex(0),
    skip: finish,
    next,
    prev,
  }
}
