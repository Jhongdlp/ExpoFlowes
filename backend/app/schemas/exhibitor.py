from pydantic import BaseModel, ConfigDict, EmailStr, Field

IdentificationType = str  # validado contra el algoritmo en el servicio, no por regex aqui


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    phone: str = Field(min_length=1, max_length=30)
    email: EmailStr


class RepresentativeIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    identification: str = Field(min_length=1, max_length=20)
    identification_type: IdentificationType
    email: EmailStr
    phone: str = Field(min_length=1, max_length=30)
    position: str = Field(min_length=1, max_length=80)


class ExhibitorCreate(BaseModel):
    tax_id: str = Field(min_length=1, max_length=20)
    tax_id_type: IdentificationType
    legal_name: str = Field(min_length=1, max_length=200)
    stand_name: str = Field(min_length=1, max_length=160)
    address: str = Field(min_length=1, max_length=255)
    requested_m2: int = Field(gt=0)
    representative: RepresentativeIn
    # Minimo un contacto adicional (§5.3). El maximo no existe.
    contacts: list[ContactIn] = Field(min_length=1)


class ExhibitorUpdate(BaseModel):
    """Todo opcional: es un PATCH. El representante y los contactos se editan aparte."""

    legal_name: str | None = Field(default=None, min_length=1, max_length=200)
    stand_name: str | None = Field(default=None, min_length=1, max_length=160)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    requested_m2: int | None = Field(default=None, gt=0)


class ContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    email: str


class RepresentativeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    identification: str
    identification_type: str
    email: str
    phone: str
    position: str


class ExhibitorRead(BaseModel):
    """Fila de listado. `stand_category` y `quota` son DERIVADAS: no hay columna (§6.4, §6.7)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    tax_id: str
    tax_id_type: str
    legal_name: str
    stand_name: str
    address: str
    requested_m2: int
    stand_category: str
    quota: dict[str, int]
    assigned: dict[str, int]
    available: dict[str, int]


class ExhibitorDetail(ExhibitorRead):
    representative: RepresentativeRead
    contacts: list[ContactRead]
