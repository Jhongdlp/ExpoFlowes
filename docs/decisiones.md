# Ambigüedades detectadas y decisiones tomadas

El enunciado deja abiertas ocho cuestiones que no se pueden implementar sin decidir. Este
documento las lista con la decisión tomada y su porqué. Cada una está implementada tal cual se
describe aquí, y las cuatro de mayor calado tienen su propio ADR en [`adr/`](adr/).

> Criterio general: **ante una ambigüedad, la opción que falla en voz alta gana a la que
> adivina en silencio.** Un error explícito es recuperable; un dato mal clasificado no.

---

## 1. Redondeo de cuotas · [ADR-0004](adr/0004-criterio-de-redondeo.md)

**Ambigüedad.** Las cuotas se expresan como *"N credenciales por cada M m²"*, pero la mayoría
de los metrajes válidos no son múltiplos del bloque. 13 m² con la regla `Exhibitor` (2 por cada
5 m²): ¿4 credenciales o 6?

**Decisión.** `floor`: solo se pagan bloques completos. 13 m² → `2 * floor(13/5)` = **4**.
El criterio **no está en el código**: es la columna `credential_rules.rounding_mode`
(`floor` | `ceil` | `round`).

**Por qué.** Es la lectura literal de "por cada N m²" y la conservadora para el organizador
(nunca regala credenciales impresas). Y como es un dato, otra feria puede decidir distinto con
un `UPDATE`, que es justo lo que el enunciado dice que va a evaluar.

**Consecuencia aceptada.** Un stand de 5–9 m² recibe **0** credenciales `Guest` y **0**
`Service`. Es correcto, y el frontend renderiza `0 / 0` sin romperse.

---

## 2. Metrajes fuera de los rangos definidos

**Ambigüedad.** Los rangos van de 5 a 50 m². El enunciado no dice qué hacer con 3 m² ni con
60 m².

**Decisión.** Rechazar en validación con `STAND_SIZE_OUT_OF_RANGE`, y devolver en `details` los
rangos vigentes para que la pantalla los muestre sin tenerlos escritos.

**Por qué.** La alternativa —asignar la categoría más cercana— crea datos erróneos silenciosos
en la columna que alimenta el cálculo de credenciales de todo el stand. Un 60 m² tratado como
"Grande" no avisa a nadie y entrega 20 credenciales `Exhibitor` que nadie contrató.

---

## 3. ¿El representante consume credencial?

**Ambigüedad.** El representante es una persona con nombre e identificación, igual que un
participante. No se dice si ocupa cupo.

**Decisión.** **No.** Es una identidad de acceso al sistema. Si además va a operar el stand, se
registra explícitamente como participante y ahí sí consume cupo.

**Por qué.** Separa la cuenta de la credencial física. Un descuento invisible de cupo es el tipo
de regla que nadie recuerda seis meses después, cuando un stand se queda una credencial corto y
no hay forma de explicarlo mirando la pantalla.

---

## 4. ¿La cuota se congela o se calcula? · [ADR-0001](adr/0001-scope-por-evento.md)

**Ambigüedad.** No se dice si la cuota se fija al crear el expositor o se deriva del metraje.

**Decisión.** **Cálculo derivado**, siempre. No existe columna de cuota. Si el admin corrige el
metraje, la cuota cambia en la siguiente lectura.

**Protección.** Si el metraje nuevo dejara la cuota **por debajo de lo ya asignado**, el cambio
se **bloquea** con `QUOTA_BELOW_ASSIGNED` en vez de dejar un stand con más credenciales
emitidas que disponibles.

**Por qué.** Una columna congelada se desincroniza en cuanto alguien corrige un metraje, y
obliga a un job de recálculo que nadie va a escribir en un MVP. El cálculo derivado es siempre
consistente; el bloqueo convierte el único caso peligroso en un error legible.

---

## 5. Cómo recibe la contraseña el usuario auto-creado · [ADR-0003](adr/0003-token-set-password.md)

**Ambigüedad.** El enunciado pide crear el usuario del representante automáticamente, pero no
dice cómo obtiene su clave.

**Decisión.** No se envía ninguna contraseña. Se emite un **token de un solo uso con 72 h de
vida** y se manda un enlace de *"establezca su contraseña"*. En base se guarda el **hash** del
token, nunca el token.

**Por qué.** El correo es un canal persistente y sin cifrado en reposo: una contraseña enviada
por correo sigue ahí dentro de dos años. Un token de un solo uso deja de servir en cuanto se
usa o expira. Además, un usuario nace sin `password_hash` y por tanto no puede autenticarse
hasta completar el proceso.

---

## 6. Unicidad de la identificación: ¿global o por evento?

**Ambigüedad.** La validación crítica dice que una persona no puede estar en dos empresas. No
dice si eso vale también entre ediciones distintas de la feria.

**Decisión.** **Por evento**: `UNIQUE(event_id, identification)`, nunca `UNIQUE(identification)`.
La misma persona puede estar en 2026 con una empresa y en 2027 con otra.

**Por qué.** Las ferias son ediciones independientes y la gente cambia de empleador. Una
restricción global bloquearía registros legítimos y, sobre todo, rompería el aislamiento entre
ferias que el enunciado pide como requisito arquitectónico.

---

## 7. Relación entre categoría de stand y cuota de credenciales *(detectada por nosotros)*

**Ambigüedad.** Hay dos clasificaciones —tamaño de stand (Pequeño/Mediano/Grande) y categoría
de credencial (Exhibitor/Guest/Service)— y el enunciado nunca las relaciona.

**Decisión.** La categoría de stand es **informativa y de validación de rango**; **no**
interviene en el cálculo de cuota. La cuota sale exclusivamente de bloques de m² según
`credential_rules`.

**Por qué.** Las reglas de cuota están expresadas en m², no por categoría. Cruzarlas sería
inventar una regla que el enunciado no pide, y haría que ampliar el rango "Grande" cambiara
silenciosamente las cuotas de stands que no se tocaron.

---

## 8. El participante no tiene correo, pero hay que enviarle uno *(contradicción interna)*

**Ambigüedad.** El punto extra de correos pide notificar **al participante** cuando se le
asigna una credencial. Pero el correo **no figura** entre los datos requeridos del participante
("nombre, apellido, identificación, celular, cargo y empresa proveedora, si aplica"). Sin
correo no hay destinatario.

**Decisión.** `participants.email` es **opcional**. Si viene, se envía la notificación; si no,
no se envía nada y **el alta no falla**. La columna `correo` del Excel también es opcional. El
panel del representante muestra cuántos participantes no tienen correo, por si quiere
completarlos.

**Por qué.** Hacerlo obligatorio contradiría la lista de datos requeridos del propio enunciado
y bloquearía altas legítimas —personal de servicio sin correo corporativo—. Notificar al
representante en lugar del participante se descartó porque el enunciado nombra expresamente al
participante como destinatario.

---

## Decisiones de ingeniería que no son ambigüedades del enunciado

Van aquí para que se lean juntas; están desarrolladas en los ADR y en el README.

| Decisión | Dónde |
|---|---|
| Toda tabla operativa lleva `event_id` y ningún repositorio se construye sin él | [ADR-0001](adr/0001-scope-por-evento.md) |
| Las reglas viven en tablas y llegan al motor como parámetro | [ADR-0002](adr/0002-reglas-en-base-de-datos.md) |
| El cupo se verifica dentro de la transacción, con `SELECT … FOR UPDATE` | README, §9.3 del contrato |
| Un recurso ajeno responde **404**, no 403 | README, sección de seguridad |
| El duplicado se valida en el servicio **y** con un constraint, y ambos producen el mismo error | README, sección de robustez |
