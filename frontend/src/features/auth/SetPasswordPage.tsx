import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { api, ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'

const schema = z
  .object({
    password: z.string().min(8, 'Use al menos 8 caracteres.'),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  })

type Values = z.infer<typeof schema>

/**
 * Pantalla del enlace de un solo uso. El token viaja en la URL, se consume una vez y
 * caduca a las 72 h; nunca se envia una contraseña por correo.
 */
export function SetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmation: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await api.post('/auth/set-password', { token, password: values.password })
      setDone(true)
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : 'No se pudo establecer la clave.')
    }
  })

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="label-caps">Expo Flor Ecuador 2026</p>
        <h1 className="mt-2 text-[19px] font-semibold tracking-tight">Establecer contraseña</h1>

        {token === '' ? (
          <Notice tone="error" title="Falta el enlace de activación" className="mt-5">
            Abra el enlace que recibió por correo. Si caducó, el organizador puede reenviarlo.
          </Notice>
        ) : done ? (
          <div className="mt-6 space-y-4">
            <Notice tone="success" title="Contraseña establecida">
              Ya puede acceder con su correo y la contraseña que acaba de definir.
            </Notice>
            <Link to="/login">
              <Button className="w-full">Ir a iniciar sesión</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[12px] text-ink-soft">
              El enlace sirve una sola vez. Elija una contraseña de al menos 8 caracteres.
            </p>
            {failure !== null ? <Notice tone="error" title={failure} className="mt-5" /> : null}
            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <Field
                label="Contraseña"
                type="password"
                autoComplete="new-password"
                autoFocus
                error={form.formState.errors.password?.message}
                {...form.register('password')}
              />
              <Field
                label="Repita la contraseña"
                type="password"
                autoComplete="new-password"
                error={form.formState.errors.confirmation?.message}
                {...form.register('confirmation')}
              />
              <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
