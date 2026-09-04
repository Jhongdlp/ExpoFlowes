import { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '../lib/cn'

interface AvatarProps {
  firstName: string
  lastName: string
  identification?: string
  email?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/** Fotos de stock profesionales (Unsplash direct CDN con optimizacion de tamaño) */
const FEMALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=128&h=128&q=80',
]

const MALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=128&h=128&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=128&h=128&q=80',
]

const FEMALE_EXCEPTIONS = new Set([
  'carmen',
  'isabel',
  'raquel',
  'pilar',
  'beatriz',
  'luz',
  'mercedes',
  'ines',
  'dolores',
  'belen',
  'consuelo',
  'soledad',
  'rosario',
  'guadalupe',
  'monserrat',
  'marisol',
  'ester',
  'ruth',
  'miriam',
])

const MALE_EXCEPTIONS = new Set([
  'luca',
  'andrea',
  'borja',
  'josue',
  'elias',
  'jonas',
  'matias',
  'nicolas',
  'tomas',
  'lucas',
  'alex',
])

function isLikelyFemale(name: string): boolean {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const firstWord = normalized.split(/\s+/)[0] ?? ''

  if (FEMALE_EXCEPTIONS.has(firstWord)) return true
  if (MALE_EXCEPTIONS.has(firstWord)) return false

  if (
    firstWord.endsWith('a') ||
    firstWord.endsWith('ia') ||
    firstWord.endsWith('ina') ||
    firstWord.endsWith('ela') ||
    firstWord.endsWith('ica') ||
    firstWord.endsWith('isa') ||
    firstWord.endsWith('dra') ||
    firstWord.endsWith('eth') ||
    firstWord.endsWith('ine')
  ) {
    return true
  }

  return false
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function Avatar({
  firstName,
  lastName,
  identification = '',
  email,
  className,
  size = 'md',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const fullName = `${firstName.trim()} ${lastName.trim()}`
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase()

  const hasEmail = Boolean(email && email.trim() !== '')

  const female = isLikelyFemale(firstName)
  const pool = female ? FEMALE_PORTRAITS : MALE_PORTRAITS
  const hashKey = `${fullName}-${identification}`
  const photoIndex = hashString(hashKey) % pool.length
  const photoUrl = pool[photoIndex] ?? pool[0]

  const sizeClasses = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-8 w-8 text-[11px]',
    lg: 'h-10 w-10 text-[13px]',
  }[size]

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full border border-line bg-fill grid place-items-center font-semibold text-ink',
        sizeClasses,
        className,
      )}
    >
      {/* Solo mostramos foto si tiene correo registrado */}
      {hasEmail && !imgError && photoUrl ? (
        <img
          src={photoUrl}
          alt={fullName}
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover grayscale-[20%]"
        />
      ) : (
        <span>{initials || <User className="h-4 w-4 text-ink-faint" />}</span>
      )}
    </div>
  )
}
