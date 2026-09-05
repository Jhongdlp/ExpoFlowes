"""Correo transaccional (punto extra E1).

Dos reglas que este modulo existe para garantizar:

1. **Nunca aborta una operacion de negocio.** Las funciones `notify_*` capturan cualquier
   fallo, lo registran y devuelven `False`. Un timeout de SMTP no puede tumbar el alta de un
   expositor (test E1b).
2. **Nunca viaja una contraseña.** Al representante se le manda un enlace de un solo uso con
   72 h de vida, jamas una clave.

Sin `SMTP_HOST` configurado el correo se escribe en el log estructurado en vez de enviarse.
El enunciado admite expresamente el correo simulado, asi que el demo funciona sin Mailtrap.
"""

import html
import logging
import smtplib
import time
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 10
# Mailtrap gratuito rechaza con 550 al segundo correo del mismo segundo. La carga masiva
# manda en rafaga, asi que el envio se espacia aqui y no en cada llamador.
MIN_SEND_INTERVAL_SECONDS = 1.1
# ponytail: contador de proceso, sin lock. Con varios workers habria que mover el reloj a la
# base o a un rate limiter compartido.
_last_send_at = 0.0


def send(to: str, subject: str, body: str, body_html: str | None = None) -> None:
    """Envio crudo. Lanza si el SMTP falla; los llamadores de negocio usan `notify_*`."""
    global _last_send_at
    settings = get_settings()
    if not settings.smtp_host:
        # El formateador JSON solo publica `message`: el correo va en la propia linea.
        logger.info(
            "mail_simulated to=%s subject=%s body=%s",
            to,
            subject,
            body.replace("\n", " | "),
        )
        return

    wait = MIN_SEND_INTERVAL_SECONDS - (time.monotonic() - _last_send_at)
    if wait > 0:
        time.sleep(wait)
    _last_send_at = time.monotonic()

    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    if body_html:
        # multipart/alternative: el texto plano queda como respaldo para clientes sin HTML.
        message.add_alternative(body_html, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=SMTP_TIMEOUT_SECONDS) as smtp:
        try:
            smtp.starttls()
        except smtplib.SMTPNotSupportedError:
            # Mailtrap ofrece STARTTLS; un buzon de captura local, no. Se cifra cuando se
            # puede en vez de exigirlo, para no atar el mailer a un unico proveedor.
            logger.warning("smtp_without_starttls host=%s", settings.smtp_host)
        # Sin usuario no se hace LOGIN: un servidor abierto rechaza el AUTH y tumba el envio.
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


def _try_send(to: str, subject: str, body: str, kind: str, body_html: str | None = None) -> bool:
    try:
        send(to, subject, body, body_html)
    except Exception:
        # El fallo se registra y se sigue: la transaccion de negocio ya esta confirmada.
        logger.exception("mail_failed kind=%s", kind)
        return False
    logger.info("mail_sent kind=%s", kind)
    return True


BRAND_COLOR = "#166534"
EVENT_NAME = "Expo Flor Ecuador 2026"
FOOTER_NOTE = "Demo tecnico - datos ficticios - no afiliado a Expoflores."


def _layout(heading: str, blocks: list[str]) -> str:
    """Plantilla unica de los correos: tabla con estilos en linea.

    Los clientes de correo ignoran hojas de estilo y `flex`, asi que la maqueta usa una tabla
    y estilos en linea a proposito. Los bloques ya vienen escapados por quien los construye.
    """
    body = "".join(blocks)
    return (
        f'<div style="margin:0;padding:24px 12px;background:#f3f4f6;'
        f'font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#111827">'
        f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" '
        f'style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;'
        f'border-radius:12px">'
        f'<tr><td style="background:{BRAND_COLOR};padding:18px 28px;border-radius:12px 12px 0 0;'
        f'color:#ffffff;font-size:15px;font-weight:600;letter-spacing:.3px">{EVENT_NAME}</td></tr>'
        f'<tr><td style="padding:28px">'
        f'<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">{heading}</h1>{body}'
        f"</td></tr>"
        f'<tr><td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;'
        f'border-radius:0 0 12px 12px;color:#6b7280;font-size:12px;line-height:1.5">'
        f"{FOOTER_NOTE}<br>Este es un mensaje automatico, no responda a este correo."
        f"</td></tr></table></div>"
    )


def _p(text: str) -> str:
    return f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6">{text}</p>'


def _button(label: str, url: str) -> str:
    return (
        f'<p style="margin:24px 0"><a href="{html.escape(url, quote=True)}" '
        f'style="display:inline-block;background:{BRAND_COLOR};color:#ffffff;text-decoration:none;'
        f'padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600">{label}</a></p>'
    )


def _data(rows: list[tuple[str, str]]) -> str:
    cells = "".join(
        f'<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">{k}</td>'
        f'<td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">{v}</td></tr>'
        for k, v in rows
    )
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" '
        f'style="margin:0 0 18px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">'
        f"{cells}</table>"
    )


def notify_password_setup(to: str, full_name: str, link: str) -> bool:
    """Correo 1: cuenta creada. Lleva el enlace de establecer clave, nunca la clave."""
    body = (
        f"Hola {full_name}:\n\n"
        f"Se creo su cuenta de representante en la plataforma de {EVENT_NAME}.\n"
        "Establezca su contraseña con este enlace, valido por 72 horas y de un solo uso:\n\n"
        f"{link}\n\n"
        "Si el enlace expira, solicite uno nuevo al organizador de la feria.\n\n"
        f"{FOOTER_NOTE}\n"
    )
    name = html.escape(full_name)
    body_html = _layout(
        "Active su cuenta de representante",
        [
            _p(f"Hola <strong>{name}</strong>:"),
            _p(f"Se creó su cuenta de representante en la plataforma de {EVENT_NAME}."),
            _button("Establecer mi contraseña", link),
            _p(
                '<span style="color:#6b7280;font-size:13px">El enlace es de un solo uso y '
                "caduca en 72 horas. Si no funciona, copie esta dirección en su navegador:<br>"
                f'<span style="word-break:break-all">{html.escape(link)}</span></span>'
            ),
            _p(
                '<span style="color:#6b7280;font-size:13px">Si el enlace expiró, solicite uno '
                "nuevo al organizador de la feria.</span>"
            ),
        ],
    )
    return _try_send(to, "Active su cuenta de representante", body, "password_setup", body_html)


def notify_password_reset(to: str, full_name: str, link: str) -> bool:
    """Recuperacion de contraseña. Mismo enlace de un solo uso y 72 h; nunca una clave."""
    body = (
        f"Hola {full_name}:\n\n"
        f"Recibimos una solicitud para restablecer su contraseña en {EVENT_NAME}.\n"
        "Use este enlace, valido por 72 horas y de un solo uso:\n\n"
        f"{link}\n\n"
        "Si usted no lo solicito, ignore este mensaje: su contraseña no cambia.\n\n"
        f"{FOOTER_NOTE}\n"
    )
    name = html.escape(full_name)
    body_html = _layout(
        "Restablezca su contraseña",
        [
            _p(f"Hola <strong>{name}</strong>:"),
            _p(f"Recibimos una solicitud para restablecer su contraseña en {EVENT_NAME}."),
            _button("Restablecer mi contraseña", link),
            _p(
                '<span style="color:#6b7280;font-size:13px">El enlace es de un solo uso y '
                "caduca en 72 horas. Si no funciona, copie esta dirección en su navegador:<br>"
                f'<span style="word-break:break-all">{html.escape(link)}</span></span>'
            ),
            _p(
                '<span style="color:#6b7280;font-size:13px">Si usted no solicitó el cambio, '
                "ignore este mensaje: su contraseña no cambia.</span>"
            ),
        ],
    )
    return _try_send(to, "Restablezca su contraseña", body, "password_reset", body_html)


def notify_credential(to: str, full_name: str, exhibitor_name: str, category: str) -> bool:
    """Correo 2: credencial asignada. Solo se envia si el participante tiene correo."""
    body = (
        f"Hola {full_name}:\n\n"
        f"{exhibitor_name} le asigno una credencial para {EVENT_NAME}.\n\n"
        f"Participante: {full_name}\n"
        f"Empresa: {exhibitor_name}\n"
        f"Categoria de la credencial: {category}\n\n"
        "Presente su documento de identificacion en el ingreso para retirarla.\n\n"
        f"{FOOTER_NOTE}\n"
    )
    body_html = _layout(
        "Su credencial está asignada",
        [
            _p(f"Hola <strong>{html.escape(full_name)}</strong>:"),
            _p(
                f"<strong>{html.escape(exhibitor_name)}</strong> le asignó una credencial "
                f"para {EVENT_NAME}."
            ),
            _data(
                [
                    ("Participante", html.escape(full_name)),
                    ("Empresa", html.escape(exhibitor_name)),
                    ("Categoría", html.escape(category)),
                ]
            ),
            _p("Presente su documento de identificación en el ingreso para retirarla."),
        ],
    )
    return _try_send(to, f"Su credencial para {EVENT_NAME}", body, "credential", body_html)
