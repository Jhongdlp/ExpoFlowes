# ADR 0003 — El representante recibe un enlace de un solo uso, no una contraseña

**Estado:** aceptada · **Fecha:** 2026-09-03 · **Fase:** F3

## Contexto

El enunciado pide que, al crear un expositor, el sistema **cree automáticamente el usuario de
acceso del representante** usando su correo. No dice cómo recibe ese usuario su contraseña, y
esa omisión es justamente la parte delicada.

La salida cómoda es generar una contraseña aleatoria y enviarla por correo. El correo, sin
embargo, es un canal persistente: queda en la bandeja del destinatario, en la del remitente,
en los servidores intermedios y en cualquier backup, sin cifrar en reposo y sin caducidad. Una
contraseña enviada así sigue siendo válida meses después, en un buzón que quizá ya no controla
la misma persona.

## Decisión

**Nunca viaja una contraseña.** El flujo es:

1. Al crear el expositor se crea el usuario con `password_hash = NULL`. Un usuario sin
   `password_hash` **no puede autenticarse**: no es un estado intermedio permisivo.
2. Se genera un token aleatorio (`secrets.token_urlsafe(32)`) y se envía un enlace
   *"establece tu contraseña"*.
3. En base se guarda **`sha256(token)`**, nunca el token. El token en claro existe solo el
   tiempo que tarda en armarse el enlace; la función que lo emite lo devuelve una vez y el
   llamador lo descarta.
4. El token **expira a las 72 h** y es de **un solo uso**: consumirlo escribe `used_at` en la
   misma transacción que fija el `password_hash`.
5. El admin puede reemitirlo con `POST /auth/request-password-setup`, que responde **lo mismo
   exista o no el correo** (§8.12).

## Consecuencias

- Un correo interceptado o reenviado meses después no sirve: el token ya caducó o ya se usó.
- Una filtración de la base tampoco entrega tokens utilizables, solo sus hashes.
- El admin nunca conoce la contraseña del representante, lo que elimina una vía de soporte
  incómoda ("¿me la puedes decir?") y una responsabilidad legal.
- Coste: el representante depende de recibir el correo. Por eso existe el reenvío, y por eso
  un fallo del mailer **no aborta el alta del expositor** (§9.2): la transacción de negocio ya
  está confirmada y el enlace se puede reemitir.
- Los tokens usados y expirados quedan en la tabla. No estorban y sirven de rastro; una
  limpieza periódica queda fuera del MVP.
- Como el token no se guarda en claro, no hay forma de "recuperarlo": si se pierde, se emite
  otro. Es la propiedad que se buscaba, no una limitación.

## Alternativas descartadas

- **Contraseña temporal por correo con cambio obligatorio al primer acceso.** Sigue poniendo
  una credencial válida en un canal persistente, y el "cambio obligatorio" es una promesa de
  la aplicación, no una propiedad del secreto.
- **Guardar el token en claro** para poder reenviarlo tal cual. Convierte la tabla en una
  lista de llaves listas para usar: exactamente lo que se evita hasheándolo.
- **Enlace firmado con JWT sin fila en base.** No permite invalidar por uso —un JWT es válido
  hasta que expira—, y el requisito es de **un solo uso**. La fila con `used_at` es lo que
  hace cumplible esa condición.
- **Que el admin fije la contraseña inicial.** Le da acceso permanente a las cuentas de los
  expositores y traslada el problema del canal, no lo resuelve.
