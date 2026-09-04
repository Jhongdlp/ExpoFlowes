from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import RequestIdMiddleware, configure_logging
from app.core.rate_limit import RateLimitExceeded, limiter, rate_limit_handler
from app.routers import auth, exhibitors, health, me

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="Expoflores API", version="0.1.0", docs_url="/docs")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,  # lista explicita, nunca "*" (§8.5)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(exhibitors.router, prefix="/api/v1")
app.include_router(me.router, prefix="/api/v1")
