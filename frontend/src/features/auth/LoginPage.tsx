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
      {/*
        Panel de marca sobre fotografía.

        El texto vive arriba, sobre el cielo, y el degradado de legibilidad baja desde ahí:
        así las rosas —que son lo único que la imagen aporta— quedan limpias en la mitad
        inferior en vez de enterradas bajo un velo. Medido sobre el píxel más claro de la
        franja de texto, el blanco queda por encima de 8:1.
      */}
      <section className="relative isolate flex min-h-[42vh] flex-col overflow-hidden bg-ink px-5 py-6 text-white sm:px-8 sm:py-10 lg:min-h-0 lg:px-14 lg:py-14">
        <img
          src="/fondo-login.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_72%]"
        />
        {/* Denso donde hay texto, transparente donde hay flores. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-ink from-20% via-ink/80 via-46% to-transparent to-72%"
        />
        {/* Un asentado mínimo abajo, para el pie y para que la foto no corte en seco. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-ink/85 to-transparent"
        />

        <p className="text-[11px] font-medium tracking-[0.08em] text-white/85 uppercase">
          Demo técnico · datos ficticios · no afiliado a Expoflores
        </p>

        <div className="mt-8 max-w-md sm:mt-10">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight">
            Expo Flor Ecuador
          </h1>
          <p className="mt-2 max-w-sm text-[13px] text-white/80">
            Gestión de expositores y credenciales de stand. Cada feria mantiene sus datos,
            sus rangos de metraje y sus cuotas por separado.
          </p>
        </div>

        <p className="mt-auto pt-10 text-[12px] text-white/75">
          Edición 2026 · 7 al 9 de octubre
        </p>
      </section>

      <section className="flex items-center justify-center bg-surface px-5 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-[19px] font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            Acceda con el correo con el que se registró su empresa.
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
            <Field
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Verificando…' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-8 border-t border-line pt-4">
            <p className="label-caps">Cuentas de demostración</p>
            <ul className="mt-3 space-y-3">
              {DEMO_ACCOUNTS.map((account) => (
                <li
                  key={account.email}
                  className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium">{account.role}</p>
                    <p className="truncate text-[12px] text-ink-soft">{account.email}</p>
                    <p className="tnum text-[11px] text-ink-faint">{account.password}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start"
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
