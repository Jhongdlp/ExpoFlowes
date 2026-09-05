/**
 * Prepara una imagen del disco para viajar dentro de la fila del expositor.
 *
 * No hay almacenamiento de ficheros en el sistema, ni hace falta: una credencial mide
 * 90 mm de ancho, así que 1200 px de lado largo sobran para imprimirla nítida. El
 * navegador reescala y comprime antes de subir, y lo que llega al servidor es un data URI
 * de unos pocos cientos de KB en vez de los 5 MB que saca un teléfono.
 *
 * Añadir un bucket de objetos para una imagen por stand sería más infraestructura que
 * problema.
 */

/** Lado largo máximo. Por encima de esto solo se gana peso, no nitidez impresa. */
const MAX_EDGE = 1200

/** Debe coincidir con `MAX_BADGE_IMAGE_CHARS` del backend, que es quien manda. */
const MAX_CHARS = 400_000

export const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'

export class BadgeImageError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      // El objeto se revoca en cuanto la imagen está decodificada: si no, cada intento de
      // subida deja un blob colgado en memoria hasta recargar la página.
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new BadgeImageError('No se pudo leer la imagen.'))
    }
    image.src = url
  })
}

/**
 * Devuelve el data URI listo para `PUT /me/badge-art`, o lanza `BadgeImageError` con un
 * mensaje que ya se puede mostrar tal cual.
 */
export async function prepareBadgeImage(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.split(',').includes(file.type)) {
    throw new BadgeImageError('El archivo debe ser una imagen JPG, PNG o WEBP.')
  }

  const image = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext('2d')
  if (context === null) throw new BadgeImageError('Su navegador no pudo procesar la imagen.')

  // Un PNG o WEBP con transparencia sale negro si se codifica a JPEG: el formato no tiene
  // canal alfa, y un lienzo sin pintar es negro transparente. Se rellena de blanco antes
  // de dibujar, que además es el color sobre el que se imprime la credencial.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  // Siempre JPEG: un PNG fotográfico pesa varias veces más para el mismo resultado
  // impreso, y aquí el peso es el límite real.
  let quality = 0.82
  let encoded = canvas.toDataURL('image/jpeg', quality)

  // Una foto muy detallada puede pasarse del tope incluso reescalada. Se baja la calidad
  // antes que rechazarla: para un fondo de credencial es un cambio que no se ve.
  while (encoded.length > MAX_CHARS && quality > 0.4) {
    quality -= 0.12
    encoded = canvas.toDataURL('image/jpeg', quality)
  }

  if (encoded.length > MAX_CHARS) {
    throw new BadgeImageError('La imagen es demasiado pesada. Pruebe con una más pequeña.')
  }
  return encoded
}
