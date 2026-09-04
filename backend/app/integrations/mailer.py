"""Correo transaccional (punto extra E1).

Dos reglas que este modulo existe para garantizar:

1. **Nunca aborta una operacion de negocio.** Las funciones `notify_*` capturan cualquier
   fallo, lo registran y devuelven `False`. Un timeout de SMTP no puede tumbar el alta de un
   expositor (§9.2, test E1b).
2. **Nunca viaja una contraseña.** Al representante se le manda un enlace de un solo uso con
   72 h de vida, jamas una clave (§0.5, §6.5).

Sin `SMTP_HOST` configurado el correo se escribe en el log estructurado en vez de enviarse.
El enunciado admite expresamente el correo simulado, asi que el demo funciona sin Mailtrap.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 10


def send(to: str, subject: str, body: str) -> None:
    """Envio crudo. Lanza si el SMTP falla; los llamadores de negocio usan `notify_*`."""
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

    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

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


def _try_send(to: str, subject: str, body: str, kind: str) -> bool:
    try:
        send(to, subject, body)
    except Exception:
        # El fallo se registra y se sigue: la transaccion de negocio ya esta confirmada (§9.2).
        logger.exception("mail_failed kind=%s", kind)
        return False
    logger.info("mail_sent kind=%s", kind)
    return True


def notify_password_setup(to: str, full_name: str, link: str) -> bool:
    """Correo 1: cuenta creada. Lleva el enlace de establecer clave, nunca la clave."""
    body = (
        f"Hola {full_name},\n\n"
        "Se creo su cuenta de representante en la plataforma de Expo Flor Ecuador.\n"
        "Establezca su contraseña con este enlace, valido por 72 horas y de un solo uso:\n\n"
        f"{link}\n\n"
        "Si el enlace expira, solicite uno nuevo al organizador de la feria.\n"
    )
    return _try_send(to, "Active su cuenta de representante", body, "password_setup")


def notify_credential(to: str, full_name: str, exhibitor_name: str, category: str) -> bool:
    """Correo 2: credencial asignada. Solo se envia si el participante tiene correo (§6.8)."""
    body = (
        f"Hola {full_name},\n\n"
        f"{exhibitor_name} le asigno una credencial para Expo Flor Ecuador.\n"
        f"Categoria de la credencial: {category}.\n\n"
        "Presente su identificacion en el ingreso para retirarla.\n"
    )
    return _try_send(to, "Su credencial para Expo Flor Ecuador", body, "credential")
