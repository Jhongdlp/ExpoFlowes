from pydantic import BaseModel, ConfigDict


class ExhibitorRead(BaseModel):
    """Lectura minima. F4 añade cuota, asignadas, representante y contactos."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    tax_id: str
    tax_id_type: str
    legal_name: str
    stand_name: str
    address: str
    requested_m2: int
