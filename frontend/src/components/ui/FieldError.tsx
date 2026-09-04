/**
 * Error de campo. El color no lleva el mensaje solo: hay texto, `role="alert"` y una marca
 * a la izquierda, así que se entiende igual en escala de grises o con un lector de pantalla.
 */
export function FieldError({ id, message }: { id?: string; message?: string | undefined }) {
  if (message === undefined || message === '') return null

  return (
    <p
      id={id}
      role="alert"
      className="animate-fade flex items-start gap-1.5 text-[12px] font-medium text-alert"
    >
      <span aria-hidden="true" className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-alert" />
      {message}
    </p>
  )
}
