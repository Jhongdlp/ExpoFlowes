from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuracion por entorno. Ningun secreto tiene valor literal aqui."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60
    cors_origins: str = ""
    login_rate_limit: str = "5/minute"
    app_base_url: str = "http://localhost:5173"
    log_level: str = "INFO"

    seed_admin_email: str = "admin@expoflores.demo"
    # Clave trivial a proposito: es de demostracion, esta publicada en el README y en la
    # pantalla de login, y en cualquier entorno real se sobrescribe por variable de entorno.
    seed_admin_password: str = "admin"
    # Solo el representante de la primera empresa del seed nace con clave, para que el
    # demo se pueda probar con los dos roles. El resto la establece con su token.
    seed_rep_password: str = "admin"

    smtp_host: str = ""
    smtp_port: int = 2525
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = "no-reply@expoflores.demo"
    # Fallback de demo: expone el enlace de set-password en la respuesta del alta para
    # poder activar cuentas sin inbox. Falso en produccion.
    expose_setup_link: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
