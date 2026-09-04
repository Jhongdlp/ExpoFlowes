/**
 * Geometría única de todo control de formulario del sistema: misma altura, mismo radio,
 * mismo borde, mismo foco. Si un campo se ve distinto a otro, es un error, no un matiz.
 */
export const CONTROL =
  'block h-9 w-full rounded-md border bg-surface px-3 text-[13px] text-ink ' +
  'transition-[border-color,box-shadow] duration-[120ms] ease-brand ' +
  'placeholder:text-ink-faint focus:outline-none disabled:bg-fill disabled:text-ink-faint'

/** Borde según el estado de validación. El error se marca en el borde y en el texto. */
export const CONTROL_TONE = (invalid: boolean): string =>
  invalid
    ? 'border-alert focus:border-alert focus:ring-2 focus:ring-alert/15'
    : 'border-line-strong hover:border-ink-faint focus:border-ink focus:ring-2 focus:ring-ink/10'

export const LABEL = 'block text-[12px] font-medium text-ink'
