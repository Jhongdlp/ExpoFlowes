import type { Role } from '../../api/types'
import type { TranslationTree } from '../i18n/translations'

export interface TourStep {
  selector: string
  title: string
  body: string
}

/** Selecciona el objetivo por su `data-tour`, escrito a mano junto a cada elemento resaltado. */
export function getTourSteps(role: Role, t: TranslationTree): TourStep[] {
  if (role === 'admin') {
    const s = t.tour.admin
    return [
      { selector: '[data-tour="dashboard-stats"]', ...s.dashboardStats },
      { selector: '[data-tour="nav-panel"]', ...s.navPanel },
      { selector: '[data-tour="nav-exhibitors"]', ...s.navExhibitors },
      { selector: '[data-tour="nav-credentials"]', ...s.navCredentials },
      { selector: '[data-tour="nav-rules"]', ...s.navRules },
      { selector: '[data-tour="nav-options"]', ...s.navOptions },
    ]
  }

  const s = t.tour.representative
  return [
    { selector: '[data-tour="dashboard-stats"]', ...s.dashboardStats },
    { selector: '[data-tour="dashboard-quota"]', ...s.dashboardQuota },
    { selector: '[data-tour="nav-panel"]', ...s.navPanel },
    { selector: '[data-tour="nav-credentials"]', ...s.navCredentials },
    { selector: '[data-tour="nav-upload"]', ...s.navUpload },
    { selector: '[data-tour="nav-options"]', ...s.navOptions },
  ]
}
