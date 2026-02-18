from typing import Optional
from datetime import datetime
from pydantic import BaseModel as PydanticBaseModel, Field
import uuid


class Attachment(PydanticBaseModel):
    """Generic attachment payload stored inline (base64)."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    file_name: str
    file_type: str  # MIME type
    file_data: str  # Base64 encoded
    file_size: int  # bytes
    uploaded_by: Optional[uuid.UUID] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

