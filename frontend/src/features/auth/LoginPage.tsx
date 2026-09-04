import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { HOME_BY_ROLE } from './guards'
import { useSession } from './session'

const schema = z.object({
  email: z.email('Escriba un correo válido.'),
  password: z.string().min(1, 'Escriba su contraseña.'),
})

type Values = z.infer<typeof schema>

/** Credenciales del demo, visibles por exigencia del entregable (§14.5). */
const DEMO_ACCOUNTS = [
  { role: 'Organización', email: 'admin@expoflores.demo', password: 'Admin123!' },
  {
    role: 'Representante',
    email: 'mariana.cevallos@rosascotopaxi.demo',
    password: 'Demo1234!',
  },
]

export function LoginPage() {
  const { status, user, signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [failure, setFailure] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (status === 'authenticated' && user !== null) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? HOME_BY_ROLE[user.role]} replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await signIn(values.email, values.password)
      navigate('/', { replace: true })
    } catch (error) {
      // El backend responde lo mismo exista o no el correo (§8.8); la UI no añade pistas.
      setFailure(error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.')
    }
  })

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col justify-between bg-ink px-8 py-10 text-white lg:px-14 lg:py-14">
        <p className="text-[11px] font-medium tracking-[0.08em] uppercase opacity-70">
          Demo técnico · datos ficticios · no afiliado a Expoflores
        </p>
        <div className="my-12 max-w-md lg:my-0">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight lg:text-4xl">
            Expo Flor Ecuador
          </h1>
          <p className="mt-3 text-sm opacity-70">
            Gestión de expositores y credenciales de stand. Cada feria mantiene sus datos,
            sus rangos de metraje y sus cuotas por separado.
          </p>
        </div>
        <p className="text-[13px] opacity-50">Edición 2026 · 7 al 9 de octubre</p>
      </section>

      <section className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-lg font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Acceda con el correo con el que se registró su empresa.
          </p>

          {failure !== null ? <Notice title={failure} className="mt-6" /> : null}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <Field
              label="Correo"
              type="email"
              autoComplete="username"
              autoFocus
              error={form.formState.errors.email?.message}
              {...form.register('email')}
            />
            <Field
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Verificando…' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-10 border-t border-line pt-5">
            <p className="label-caps">Cuentas de demostración</p>
            <ul className="mt-3 space-y-3">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{account.role}</p>
                    <p className="truncate text-[12px] text-ink-soft">{account.email}</p>
                    <p className="text-[12px] text-ink-faint">{account.password}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      form.setValue('email', account.email)
                      form.setValue('password', account.password)
                    }}
                  >
                    Usar
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
