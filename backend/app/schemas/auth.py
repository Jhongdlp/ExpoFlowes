from pydantic import BaseModel, EmailStr, Field

from app.core.security import Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8, max_length=128)


class PasswordSetupRequest(BaseModel):
    email: EmailStr


class MeResponse(BaseModel):
    user_id: int
    email: EmailStr
    role: Role
    event_id: int
    exhibitor_id: int | None
