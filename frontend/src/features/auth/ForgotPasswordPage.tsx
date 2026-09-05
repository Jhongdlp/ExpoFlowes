import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { api, ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'

const schema = z.object({
  email: z.email('Escriba un correo válido.'),
})

type Values = z.infer<typeof schema>

/**
 * Recuperación self-service. Envía el mismo enlace de un solo uso (72 h) que la activación.
 * La respuesta del servidor es idéntica exista o no el correo: la UI no revela nada.
 */
export function ForgotPasswordPage() {
  const [done, setDone] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await api.post('/auth/forgot-password', { email: values.email })
      setDone(true)
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : 'No se pudo procesar la solicitud.')
    }
  })

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="label-caps">Expo Flor Ecuador 2026</p>
        <h1 className="mt-2 text-[19px] font-semibold tracking-tight">Recuperar contraseña</h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <Notice tone="success" title="Revise su correo">
              Si el correo corresponde a una cuenta, le enviamos un enlace para restablecer la
              contraseña. El enlace sirve una sola vez y caduca en 72 horas.
            </Notice>
            <Link to="/login">
              <Button className="w-full">Volver a iniciar sesión</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[12px] text-ink-soft">
              Escriba el correo con el que se registró su empresa y le enviaremos un enlace para
              definir una contraseña nueva.
            </p>
            {failure !== null ? <Notice tone="error" title={failure} className="mt-5" /> : null}
            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <Field
                label="Correo"
                type="email"
                autoComplete="username"
                autoFocus
                error={form.formState.errors.email?.message}
                {...form.register('email')}
              />
              <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando…' : 'Enviar enlace'}
              </Button>
            </form>
            <div className="mt-6 border-t border-line pt-4">
              <Link to="/login" className="text-[12px] text-ink-soft underline">
                Volver a iniciar sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
