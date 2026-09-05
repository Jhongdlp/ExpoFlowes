import { useState } from 'react'

import type { MyQuota } from '../../api/types'
import { resolveBannerUrl } from '../exhibitors/bannerPresets'
import { cn } from '../../lib/cn'

interface Props {
  data: MyQuota
  className?: string
}

export function StandHeroBanner({ data, className }: Props) {
  const imageUrl = resolveBannerUrl(data.banner_url)
  // En conexion lenta la foto tarda mas que el resto del banner: sin esto aparece de golpe
  // encima del nombre ya visible. El fondo oscuro de base cubre el hueco mientras carga.
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-zinc-900 text-white shadow-xs',
        'h-28 sm:h-32 md:h-36 lg:h-40',
        className,
      )}
    >
      {/* Fondo fotográfico en alta resolución */}
      <img
        src={imageUrl}
        alt={data.stand_name}
        onLoad={() => setLoaded(true)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-200',
          loaded && 'opacity-100',
        )}
      />

      {/* Degradados sutiles para alto contraste y legibilidad absoluta */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

      {/* Contenido del Banner: Únicamente el nombre del stand con tipografía destacada */}
      <div className="relative z-10 flex h-full w-full flex-col justify-end px-4 py-4 sm:px-6 sm:py-5 md:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-4xl md:text-5xl lg:text-6xl">
            {data.stand_name}
          </h1>
        </div>
      </div>
    </div>
  )
}
