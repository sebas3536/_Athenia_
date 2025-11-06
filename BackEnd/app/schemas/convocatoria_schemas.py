from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from requests import Session
from app.models.models import Document

# ==========================================
# CREATE SCHEMAS
# ==========================================

class ConvocatoriaCreate(BaseModel):
    """Schema para crear convocatoria"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ConvocatoriaUpdate(BaseModel):
    """Schema para actualizar convocatoria"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ConvocatoriaDocumentCreate(BaseModel):
    """Schema para agregar documento al checklist"""
    name: str = Field(..., min_length=1, max_length=255)


class ConvocatoriaDocumentUpdate(BaseModel):
    """Schema para actualizar nombre de documento"""
    name: str = Field(..., min_length=1, max_length=255)


class ConvocatoriaCollaboratorAdd(BaseModel):
    """Schema para agregar colaborador"""
    user_ids: List[int] = Field(..., description="IDs de usuarios a agregar")
    role: str = Field(default="editor", description="Rol: admin, editor")


class GuideDocumentLink(BaseModel):
    """Schema para vincular documento guía"""
    document_id: int = Field(..., gt=0)


class AddDocumentWithFileRequest(BaseModel):
    """Schema para agregar documento con archivo"""
    name: Optional[str] = None


class AddDocumentRequest(BaseModel):
    name: str = Field(..., min_length=1)


# ==========================================
# GUIDE SCHEMA (NUEVO)
# ==========================================

class GuideDocumentInfo(BaseModel):
    """Información de la guía adjunta a un documento"""
    id: int
    fileName: str  # Simplemente recibe fileName como está
    uploadedAt: Optional[datetime] = None
    uploadedBy: Optional[str] = None
    size: Optional[int] = None
    
    class Config:
        from_attributes = True

# ==========================================
# OUTPUT SCHEMAS
# ==========================================

class ConvocatoriaDocumentOut(BaseModel):
    """Schema de salida para documentos -  GARANTIZA fileName"""
    id: int
    name: Optional[str] = None
    fileName: Optional[str] = Field(default="", description="Nombre del archivo (default: empty string)")
    status: str = Field(default="pending")
    document_id: Optional[int] = None
    uploadedBy: Optional[str] = None
    uploadedAt: Optional[datetime] = None
    guide: Optional[GuideDocumentInfo] = None
    
    # VALIDATOR: Asegurar que fileName nunca es None
    @field_validator('fileName', mode='before')
    @classmethod
    def ensure_filename_not_none(cls, v):
        """Garantizar que fileName nunca es None"""
        if v is None:
            return ""
        if not isinstance(v, str):
            return str(v)
        return v
    
    class Config:
        from_attributes = True
        # Configuración para mapeo correcto de atributos
        populate_by_name = True

class ConvocatoriaHistoryOut(BaseModel):
    """Schema de salida para historial"""
    id: int
    document_name: str
    action: str
    user_name: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

class CollaboratorOut(BaseModel):
    """Schema de salida para colaboradores"""
    id: int
    user_id: int
    user_name: str
    user_email: Optional[str] = None
    role: str = "editor"
    added_at: datetime
    
    class Config:
        from_attributes = True

class GuideDocumentOut(BaseModel):
    """Schema de salida para documento guía"""
    id: int
    document_id: int
    filename: str
    uploaded_at: datetime
    uploaded_by: int
    
    class Config:
        from_attributes = True

class ConvocatoriaOut(BaseModel):
    """Schema básico de convocatoria"""
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    documents: List[ConvocatoriaDocumentOut] = Field(default_factory=list)
    
    class Config:
        from_attributes = True

class ConvocatoriaDetailOut(ConvocatoriaOut):
    """Versión extendida con historial y colaboradores"""
    history: List[ConvocatoriaHistoryOut] = Field(default_factory=list)
    collaborators: List[CollaboratorOut] = Field(default_factory=list)

    class Config:
        from_attributes = True

# ==========================================
# ACCESO A CONVOCATORIAS 
# ==========================================

class UserConvocatoriaAccess(BaseModel):
    """Schema para respuesta de /convocatorias/access-info"""
    hasAccess: bool = Field(..., alias="hasAccess")
    isAdmin: bool = Field(..., alias="isAdmin")
    isCollaborator: bool = Field(..., alias="isCollaborator")
    convocatoriaIds: List[int] = Field(default_factory=list, alias="convocatoriaIds")
    
    class Config:
        populate_by_name = True  
