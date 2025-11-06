"""
Módulo de gestión de convocatorias y documentos.

Este módulo maneja la creación, actualización y gestión de convocatorias,
incluyendo documentos asociados, guías, colaboradores e historial de cambios.
Implementa un sistema de checklist para documentos con soporte para archivos
guía y seguimiento completo de actividades.
"""

from datetime import datetime
import logging
import os
import uuid
from fastapi import APIRouter, Body, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional
from app.db.database import get_db
from sqlalchemy.orm import selectinload
from app.enums.enums import FileType
from app.schemas.convocatoria_schemas import (
    AddDocumentRequest,
    ConvocatoriaCreate, 
    ConvocatoriaUpdate,
    ConvocatoriaDocumentCreate, 
    ConvocatoriaDocumentUpdate,
    ConvocatoriaDocumentOut, 
    ConvocatoriaOut,
    ConvocatoriaDetailOut,
    ConvocatoriaHistoryOut,
    ConvocatoriaCollaboratorAdd,
    CollaboratorOut,
    GuideDocumentLink,
    GuideDocumentOut,
    UserConvocatoriaAccess
)

from app.models.models import (
    Convocatoria, 
    ConvocatoriaDocument, 
    ConvocatoriaHistory, 
    ConvocatoriaCollaborator,
    ConvocatoriaGuideDocument,
    Document,
    User
)

from app.schemas.document_schemas import DocumentUploadResponse, UserDocumentSettings
from app.services.auth_service import get_current_user
from app.services.handlers.base import DocumentContext, verify_chain_integrity
from app.services.handlers.extract_text import ExtractTextHandler
from app.services.handlers.index_athenia import IndexAtheniaHandler
from app.services.handlers.log_activity import LogActivityHandler
from app.services.handlers.save_to_db import SaveToDBHandler
from app.services.handlers.validate_file import ValidateFileHandler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/convocatorias", tags=["convocatorias"])


# ==========================================
# UTILIDADES
# ==========================================

def register_history(
    db: Session,
    conv_id: int,
    action: str,
    document_name: str,
    user_id: int
):
    """
    Registrar una acción en el historial de la convocatoria.
    
    Esta función auxiliar crea un registro de auditoría para cualquier acción
    realizada en una convocatoria. Si falla, registra el error pero no interrumpe
    la operación principal.
    
    Args:
        db (Session): Sesión de base de datos activa
        conv_id (int): ID de la convocatoria
        action (str): Tipo de acción realizada (created, updated, deleted, uploaded, etc.)
        document_name (str): Nombre del documento afectado
        user_id (int): ID del usuario que realizó la acción
    
    Notes:
        - Los errores se registran en logs pero no se propagan
        - Utiliza flush() en lugar de commit() para permitir rollback si es necesario
    """
    try:
        history = ConvocatoriaHistory(
            convocatoria_id=conv_id,
            document_name=document_name,
            action=action,
            user_id=user_id,
            timestamp=datetime.utcnow()
        )
        db.add(history)
        db.flush()
    except Exception as e:
        logger.warning(f"No se pudo registrar el historial: {e}")


def detect_file_type(filename: str) -> FileType:
    """
    Detectar el tipo de archivo basado en su extensión.
    
    Analiza la extensión del archivo y retorna el tipo correspondiente del enum FileType.
    Si la extensión no es reconocida, retorna FileType.txt por defecto.
    
    Args:
        filename (str): Nombre del archivo incluyendo extensión
    
    Returns:
        FileType: Tipo de archivo identificado (pdf, docx, o txt)
    
    Example:
        >>> detect_file_type("documento.pdf")
        FileType.pdf
        >>> detect_file_type("reporte.docx")
        FileType.docx
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return FileType.pdf
    elif ext == ".docx":
        return FileType.docx
    elif ext == ".txt":
        return FileType.txt
    else:
        return FileType.txt


def build_handler_chain(user_settings=None):
    """
    Construir la cadena de responsabilidad para procesamiento de documentos.
    
    Crea y configura una cadena de handlers que procesan documentos en secuencia:
    validación → guardado en BD → registro de actividad. Verifica la integridad
    de la cadena para evitar ciclos infinitos.
    
    Args:
        user_settings (Optional): Configuraciones personalizadas del usuario (no usado actualmente)
    
    Returns:
        ValidateFileHandler: Primer handler de la cadena
    
    Raises:
        RuntimeError: Si se detecta un ciclo en la cadena de handlers
    
    Notes:
        - La cadena se construye en orden específico para garantizar procesamiento correcto
        - El último handler tiene _next_handler = None para terminar la cadena
    """
    validate_handler = ValidateFileHandler()
    save_handler = SaveToDBHandler()
    log_handler = LogActivityHandler()

    # Establecer _next_handler del último handler como None para terminar cadena
    log_handler._next_handler = None
    validate_handler.set_next(save_handler)
    save_handler.set_next(log_handler)

    # Verificar que no hay ciclos en la cadena
    if not verify_chain_integrity(validate_handler):
        raise RuntimeError("La cadena de handlers tiene un ciclo!")

    return validate_handler


# ==========================================
# ENDPOINTS - ACCESO Y INFORMACIÓN
# ==========================================

@router.get("/access-info", response_model=UserConvocatoriaAccess, response_model_by_alias=True)
def get_user_convocatoria_access(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener información de acceso del usuario a convocatorias.
    
    Este endpoint determina los permisos y nivel de acceso del usuario actual
    al sistema de convocatorias. Retorna si el usuario es administrador,
    colaborador, y lista las convocatorias específicas a las que tiene acceso.
    
    Niveles de acceso:
        - **Admin**: Acceso completo a todas las convocatorias
        - **Colaborador**: Acceso solo a convocatorias específicas asignadas
        - **Sin acceso**: Usuario sin permisos en el sistema de convocatorias
    
    Args:
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado actual (inyectado automáticamente)
    
    Returns:
        UserConvocatoriaAccess: Información de acceso incluyendo:
            - hasAccess: Si tiene algún tipo de acceso (admin o colaborador)
            - isAdmin: Si tiene privilegios de administrador
            - isCollaborator: Si es colaborador en alguna convocatoria
            - convocatoriaIds: Lista de IDs de convocatorias accesibles
    
    Example:
        GET /convocatorias/access-info
        Headers: Authorization: Bearer <access_token>
    """
    # Determinar si el usuario es administrador
    is_admin = current_user.role.name == "admin"
    
    # Obtener todas las colaboraciones del usuario
    collaborations = db.query(ConvocatoriaCollaborator).filter(
        ConvocatoriaCollaborator.user_id == current_user.id
    ).all()
    
    # Extraer IDs de convocatorias donde es colaborador
    convocatoria_ids = [c.convocatoria_id for c in collaborations]
    is_collaborator = len(convocatoria_ids) > 0
    has_access = is_admin or is_collaborator
    
    return UserConvocatoriaAccess(
        hasAccess=has_access,
        isAdmin=is_admin,
        isCollaborator=is_collaborator,
        convocatoriaIds=convocatoria_ids
    )


# ==========================================
# ENDPOINTS - CRUD CONVOCATORIAS
# ==========================================

@router.post("/", response_model=ConvocatoriaOut, status_code=status.HTTP_201_CREATED)
def create_convocatoria(
    data: ConvocatoriaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Crear una nueva convocatoria con fechas de inicio y fin.
    
    Este endpoint permite crear una convocatoria vacía que posteriormente
    puede ser poblada con documentos, guías y colaboradores. El usuario
    que crea la convocatoria se registra como creador.
    
    Args:
        data (ConvocatoriaCreate): Datos de la nueva convocatoria incluyendo:
            - name: Nombre de la convocatoria (requerido)
            - description: Descripción detallada (opcional)
            - start_date: Fecha de inicio (opcional)
            - end_date: Fecha de finalización (opcional)
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        ConvocatoriaOut: Convocatoria creada con todos sus campos
    
    Raises:
        HTTPException 401: Usuario no autenticado
        HTTPException 500: Error al crear la convocatoria
    
    Example:
        POST /convocatorias/
        Body: {
            "name": "Convocatoria 2025",
            "description": "Proceso de selección anual",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31"
        }
    """
    # Crear instancia de convocatoria
    convocatoria = Convocatoria(
        name=data.name,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        created_by=current_user.id
    )
    db.add(convocatoria)
    db.commit()
    db.refresh(convocatoria)
    
    return ConvocatoriaOut(
        id=convocatoria.id,
        name=convocatoria.name,
        description=convocatoria.description,
        created_at=convocatoria.created_at,
        start_date=convocatoria.start_date,
        end_date=convocatoria.end_date,
        documents=[]
    )


@router.get("/", response_model=List[ConvocatoriaOut])
def list_convocatorias(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Listar convocatorias accesibles para el usuario actual.
    
    Este endpoint retorna todas las convocatorias a las que el usuario tiene acceso.
    Los administradores ven todas las convocatorias, mientras que los colaboradores
    solo ven aquellas en las que participan.
    
    Control de acceso:
        - **Administradores**: Ven todas las convocatorias del sistema
        - **Colaboradores**: Solo ven convocatorias donde están asignados
        - **Otros usuarios**: Lista vacía
    
    Args:
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        List[ConvocatoriaOut]: Lista de convocatorias con sus documentos,
        incluyendo información de guías y usuarios que subieron archivos
    
    Example:
        GET /convocatorias/
        Headers: Authorization: Bearer <access_token>
    """
    # Determinar convocatorias accesibles según rol
    if current_user.role.name == "admin":
        # Administradores ven todas las convocatorias
        convocatorias = db.query(Convocatoria).options(
            selectinload(Convocatoria.documents).selectinload(ConvocatoriaDocument.guide),
            selectinload(Convocatoria.documents).selectinload(ConvocatoriaDocument.uploader)
        ).all()
    else:
        # Colaboradores solo ven sus convocatorias asignadas
        from app.models.models import ConvocatoriaCollaborator
        
        collaboration_ids = db.query(ConvocatoriaCollaborator.convocatoria_id).filter(
            ConvocatoriaCollaborator.user_id == current_user.id
        ).all()
        
        conv_ids = [cid[0] for cid in collaboration_ids]
        
        convocatorias = db.query(Convocatoria).options(
            selectinload(Convocatoria.documents).selectinload(ConvocatoriaDocument.guide),
            selectinload(Convocatoria.documents).selectinload(ConvocatoriaDocument.uploader)
        ).filter(
            Convocatoria.id.in_(conv_ids)
        ).all() if conv_ids else []
    
    # Construir respuesta con formato específico
    results = []
    for conv in convocatorias:
        
        conv_dict = {
            "id": conv.id,
            "name": conv.name,
            "description": conv.description,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "start_date": conv.start_date.isoformat() if conv.start_date else None,
            "end_date": conv.end_date.isoformat() if conv.end_date else None,
            "documents": []
        }
        
        # Agregar información de cada documento
        for doc in conv.documents:
            filename_value = doc.filename if doc.filename else ""
            
            doc_dict = {
                "id": doc.id,
                "name": doc.name,
                "status": doc.status,
                "fileName": filename_value,
                "uploadedAt": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                "uploadedBy": doc.uploader.name if doc.uploader else None,
                "document_id": doc.document_id,
                "guide": None
            }
            
            # Agregar información de guía si existe
            if doc.guide:
                guide_owner = doc.guide.owner
                doc_dict["guide"] = {
                    "id": doc.guide.id,
                    "fileName": doc.guide.filename or "Sin nombre",
                    "uploadedAt": doc.guide.created_at.isoformat() if doc.guide.created_at else None,
                    "uploadedBy": guide_owner.name if guide_owner else None,
                    "size": doc.guide.size
                }
            
            conv_dict["documents"].append(doc_dict)
        
        results.append(conv_dict)
    
    return results


@router.get("/{conv_id}", response_model=ConvocatoriaDetailOut)
def get_convocatoria(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener detalles completos de una convocatoria específica.
    
    Este endpoint retorna información detallada de una convocatoria incluyendo
    todos sus documentos, historial de cambios y colaboradores. Solo usuarios
    con permisos (administradores, creadores o colaboradores) pueden acceder.
    
    Información incluida:
        - Datos básicos de la convocatoria
        - Lista completa de documentos con guías
        - Historial de cambios y acciones
        - Lista de colaboradores asignados
    
    Args:
        conv_id (int): ID de la convocatoria a consultar
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        ConvocatoriaDetailOut: Detalles completos de la convocatoria
    
    Raises:
        HTTPException 403: Usuario sin permisos para acceder
        HTTPException 404: Convocatoria no encontrada
        HTTPException 500: Error al procesar la solicitud
    
    Example:
        GET /convocatorias/1
        Headers: Authorization: Bearer <access_token>
    """
    # Cargar convocatoria con todas sus relaciones
    convocatoria = db.query(Convocatoria).options(
        selectinload(Convocatoria.documents).selectinload(ConvocatoriaDocument.guide),
        selectinload(Convocatoria.documents).selectinload(ConvocatoriaDocument.uploader),
        selectinload(Convocatoria.collaborators),
        selectinload(Convocatoria.history).selectinload(ConvocatoriaHistory.user)
    ).filter(Convocatoria.id == conv_id).first()
    
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos de acceso
    is_admin = current_user.role.name == "admin"
    is_creator = convocatoria.created_by == current_user.id
    is_collaborator = db.query(ConvocatoriaCollaborator).filter(
        ConvocatoriaCollaborator.convocatoria_id == conv_id,
        ConvocatoriaCollaborator.user_id == current_user.id
    ).first() is not None
    
    has_access = is_admin or is_creator or is_collaborator
    
    if not has_access:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Construir lista de documentos
    documents_out = []
    
    for doc in convocatoria.documents:
        
        if doc.filename is None:
            doc.filename = ""
        
        doc_dict = {
            "id": doc.id,
            "name": doc.name,
            "fileName": doc.filename,
            "status": doc.status,
            "document_id": doc.document_id,
            "uploadedBy": doc.uploader.name if doc.uploader else None,
            "uploadedAt": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "guide": None
        }
        
        # Agregar información de guía si existe
        if doc.guide:
            guide_owner = doc.guide.owner
            doc_dict["guide"] = {
                "id": doc.guide.id,
                "fileName": doc.guide.filename or "Sin nombre",
                "uploadedAt": doc.guide.created_at.isoformat() if doc.guide.created_at else None,
                "uploadedBy": guide_owner.name if guide_owner else None,
                "size": doc.guide.size
            }
        
        try:
            doc_out = ConvocatoriaDocumentOut.model_validate(doc_dict)
            documents_out.append(doc_out)
        except Exception as e:
            logger.error(f"Error validando documento {doc.id}: {e}")
            documents_out.append(doc_dict)
    
    # Construir historial de cambios
    history_entries = []
    for h in convocatoria.history:
        history_entries.append(ConvocatoriaHistoryOut(
            id=h.id,
            document_name=h.document_name,
            action=h.action,
            user_name=h.user.name,
            timestamp=h.timestamp
        ))
    
    # Construir lista de colaboradores
    collaborators_out = []
    for c in convocatoria.collaborators:
        collaborators_out.append(CollaboratorOut(
            id=c.id,
            user_id=c.user_id,
            user_name=c.user.name,
            user_email=c.user.email,
            role=c.role,
            added_at=c.added_at
        ))
    
    # Construir respuesta completa
    response = ConvocatoriaDetailOut(
        id=convocatoria.id,
        name=convocatoria.name,
        description=convocatoria.description,
        created_at=convocatoria.created_at,
        start_date=convocatoria.start_date,
        end_date=convocatoria.end_date,
        documents=documents_out,
        history=history_entries,
        collaborators=collaborators_out
    )
    
    return response


@router.put("/{conv_id}", response_model=ConvocatoriaOut)
def update_convocatoria(
    conv_id: int,
    data: ConvocatoriaUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Actualizar una convocatoria existente.
    
    Permite modificar los campos de una convocatoria. Solo el creador o
    administradores pueden realizar actualizaciones. Los cambios se registran
    en el historial de la convocatoria.
    
    Campos actualizables:
        - name: Nombre de la convocatoria
        - description: Descripción
        - start_date: Fecha de inicio
        - end_date: Fecha de finalización
    
    Args:
        conv_id (int): ID de la convocatoria a actualizar
        data (ConvocatoriaUpdate): Campos a actualizar (solo los proporcionados)
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        ConvocatoriaOut: Convocatoria actualizada
    
    Raises:
        HTTPException 403: Usuario sin permisos para actualizar
        HTTPException 404: Convocatoria no encontrada
    
    Example:
        PUT /convocatorias/1
        Body: {"name": "Convocatoria 2025 Actualizada"}
    """
    # Buscar convocatoria
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Aplicar actualizaciones
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(convocatoria, field, value)
    
    convocatoria.updated_at = datetime.utcnow()
    
    # Registrar en historial
    register_history(db, conv_id, "updated", "Convocatoria", current_user.id)
    
    db.commit()
    db.refresh(convocatoria)
    
    return convocatoria


@router.delete("/{conv_id}", status_code=status.HTTP_200_OK)
def delete_convocatoria(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Eliminar una convocatoria completa.
    
    Elimina permanentemente una convocatoria junto con todos sus documentos,
    historial y colaboradores asociados. Solo el creador o administradores
    pueden eliminar convocatorias.
    
    Advertencia:
        Esta operación es irreversible y eliminará todos los datos relacionados
        debido a las restricciones de clave foránea en cascada.
    
    Args:
        conv_id (int): ID de la convocatoria a eliminar
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        dict: Mensaje de confirmación con el nombre de la convocatoria eliminada
    
    Raises:
        HTTPException 403: Usuario sin permisos para eliminar
        HTTPException 404: Convocatoria no encontrada
    
    Example:
        DELETE /convocatorias/1
        Headers: Authorization: Bearer <access_token>
    """
    # Buscar convocatoria
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    conv_name = convocatoria.name
    
    # Eliminar convocatoria (cascada eliminará relaciones)
    db.delete(convocatoria)
    db.commit()
    
    return {"message": f"Convocatoria '{conv_name}' eliminada exitosamente"}


# ==========================================
# ENDPOINTS - DOCUMENTOS
# ==========================================

@router.post("/{conv_id}/documents", response_model=DocumentUploadResponse)
async def add_document_to_convocatoria(
    conv_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Agregar documentos al checklist de una convocatoria.
    
    Este endpoint permite crear ítems de checklist vacíos o con archivos adjuntos.
    Soporta tanto JSON (para checklist vacío) como multipart/form-data (con archivos).
    Los documentos se procesan de forma secuencial y se reportan resultados individuales.
    
    Modos de operación:
        - **JSON**: Crea ítem de checklist vacío pendiente de subir archivo
        - **Multipart**: Crea ítem y sube uno o más archivos simultáneamente
    
    Args:
        conv_id (int): ID de la convocatoria
        request (Request): Request de FastAPI con el contenido
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        DocumentUploadResponse: Resultado del procesamiento incluyendo:
            - successful_uploads: Lista de documentos subidos exitosamente
            - failed_uploads: Lista de archivos que fallaron con razón
            - total_processed: Total de archivos procesados
            - success_count: Cantidad de éxitos
            - failure_count: Cantidad de fallos
    
    Raises:
        HTTPException 400: Content-Type no soportado o datos inválidos
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria no encontrada
    
    Example JSON:
        POST /convocatorias/1/documents
        Content-Type: application/json
        Body: {"name": "Certificado de estudios"}
    
    Example Multipart:
        POST /convocatorias/1/documents
        Content-Type: multipart/form-data
        Form: name=Certificado&files=archivo1.pdf&files=archivo2.pdf
    """
    name = None
    files = None
    
    content_type = request.headers.get("content-type", "")
    
    # Parsear según Content-Type
    if "application/json" in content_type:
        try:
            body = await request.json()
            name = body.get("name")
        except Exception as e:
            logger.error(f"Error parsing JSON: {e}")
            raise HTTPException(status_code=400, detail="Invalid JSON")
    
    elif "multipart/form-data" in content_type:
        try:
            form_data = await request.form()
            name = form_data.get("name")
            files = form_data.getlist("files")
        except Exception as e:
            logger.error(f"Error parsing FormData: {e}")
            raise HTTPException(status_code=400, detail="Invalid FormData")
    
    else:
        raise HTTPException(status_code=400, detail="Content-Type no soportado")
    
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")

    # Verificar permisos
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Validar nombre
    if not name or not isinstance(name, str) or not name.strip():
        raise HTTPException(status_code=400, detail="Se requiere nombre del documento")
    
    name = name.strip()

    # Si no hay archivos, crear checklist vacío
    if not files or len(files) == 0:
        
        empty_checklist = ConvocatoriaDocument(
            convocatoria_id=convocatoria.id,
            name=name,
            filename=None,
            status="pending",
            uploaded_by=current_user.id,
            uploaded_at=datetime.utcnow()
        )
        
        db.add(empty_checklist)
        
        # Registrar en historial
        history = ConvocatoriaHistory(
            convocatoria_id=conv_id,
            document_name=name,
            action="created",
            user_id=current_user.id
        )
        db.add(history)
        
        db.commit()
        db.refresh(empty_checklist)
        
        return DocumentUploadResponse(
            successful_uploads=[{
                "id": empty_checklist.id,
                "filename": empty_checklist.name,
                "status": empty_checklist.status
            }],
            failed_uploads=[],
            total_processed=1,
            success_count=1,
            failure_count=0
        )
    
    # Procesar archivos adjuntos
    created_documents = []
    failed_files = []
    
    async def process_file(file: UploadFile, file_index: int):
        """Procesar un archivo individual y crear documento en BD."""
        try:
            content = await file.read()
            file_size = len(content)
            
            if file_size == 0:
                raise ValueError(f"El archivo {file.filename} está vacío")
            
            # Crear documento en tabla Document
            new_doc = Document(
                filename=file.filename,
                mimetype=file.content_type or "application/octet-stream",
                size=file_size,
                file_type=detect_file_type(file.filename),
                blob_enc=content,
                uploaded_by=current_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_doc)
            db.flush()
            
            # Crear entrada en ConvocatoriaDocument
            convocatoria_doc = ConvocatoriaDocument(
                convocatoria_id=conv_id,
                name=name,
                filename=file.filename,
                document_id=new_doc.id,
                status="completed",
                uploaded_by=current_user.id,
                uploaded_at=datetime.utcnow()
            )
            db.add(convocatoria_doc)
            
            # Registrar en historial
            history = ConvocatoriaHistory(
                convocatoria_id=conv_id,
                document_name=name,
                action="uploaded",
                user_id=current_user.id
            )
            db.add(history)
            
            db.commit()
            
            return {
                "id": convocatoria_doc.id,
                "filename": convocatoria_doc.name,
                "status": convocatoria_doc.status
            }
        
        except Exception as e:
            db.rollback()
            logger.error(f"Error procesando archivo {file.filename}: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"filename": file.filename, "error": str(e)}
    
    # Procesar cada archivo
    for idx, file in enumerate(files):
        result = await process_file(file, idx)
        if isinstance(result, dict) and "error" in result:
            failed_files.append(result)
        else:
            created_documents.append(result)
    
    return DocumentUploadResponse(
        successful_uploads=created_documents,
        failed_uploads=failed_files if failed_files else [],
        total_processed=len(files),
        success_count=len(created_documents),
        failure_count=len(failed_files)
    )


@router.post("/{conv_id}/documents/{doc_id}/upload")
async def upload_to_existing_checklist(
    conv_id: int,
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Subir un archivo a un ítem de checklist existente.
    
    Este endpoint permite adjuntar un archivo a un ítem de checklist previamente
    creado. El archivo pasa por una cadena de handlers para validación, extracción
    de texto, guardado en BD e indexación en Athenia. Todos los pasos son rastreables
    mediante un correlation ID único.
    
    Flujo de procesamiento:
        1. Validar archivo (tamaño, tipo, contenido)
        2. Extraer texto del documento
        3. Guardar en base de datos
        4. Indexar en Athenia para búsqueda
        5. Registrar actividad
    
    Args:
        conv_id (int): ID de la convocatoria
        doc_id (int): ID del ítem de checklist
        request (Request): Request con el archivo
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        dict: Resultado de la operación incluyendo:
            - success: Si la operación fue exitosa
            - message: Mensaje descriptivo
            - checklist_id: ID del ítem actualizado
            - status: Nuevo estado del checklist
            - filename: Nombre del archivo subido
            - document_id: ID del documento en BD
    
    Raises:
        HTTPException 400: Archivo inválido o vacío
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria o checklist no encontrado
    
    Example:
        POST /convocatorias/1/documents/5/upload
        Content-Type: multipart/form-data
        Form: files=documento.pdf
    
    Notes:
        - Se genera un correlation_id para rastrear el procesamiento
        - Todos los errores se registran en logs con el correlation_id
        - El archivo se valida antes de ser procesado
    """
    correlation_id = str(uuid.uuid4())
    logger.info(f"[Correlation ID: {correlation_id}] Starting upload for checklist {doc_id} in convocatoria {conv_id}")

    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        logger.error(f"[Correlation ID: {correlation_id}] Convocatoria not found")
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos (admin, creador o colaborador)
    is_admin = current_user.role.name == "admin"
    is_creator = convocatoria.created_by == current_user.id
    is_collaborator = db.query(ConvocatoriaCollaborator).filter(
        ConvocatoriaCollaborator.convocatoria_id == conv_id,
        ConvocatoriaCollaborator.user_id == current_user.id
    ).first() is not None
    
    has_permission = is_admin or is_creator or is_collaborator
    if not has_permission:
        logger.error(f"[Correlation ID: {correlation_id}] Permission denied")
        raise HTTPException(status_code=403, detail="No tienes permisos para subir documentos a esta convocatoria")

    # Buscar el ítem de checklist
    conv_doc = db.query(ConvocatoriaDocument).filter(ConvocatoriaDocument.id == doc_id).first()
    if not conv_doc:
        logger.error(f"[Correlation ID: {correlation_id}] Checklist not found")
        raise HTTPException(status_code=404, detail="Checklist no encontrado")

    try:
        # Obtener archivo del request
        form_data = await request.form()
        files = form_data.getlist("files")
        if not files or len(files) == 0:
            raise HTTPException(status_code=400, detail="Se requiere un archivo")

        file = files[0]
        content = await file.read()
        file_size = len(content)
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        # Crear contexto para la cadena de handlers
        context = DocumentContext(
            filename=file.filename,
            content=content,
            user=current_user,
            db=db,
            mimetype=file.content_type
        )
        
        context.correlation_id = correlation_id
        
        def build_handler_chain():
            """Construir cadena de handlers completa para procesamiento."""
            validate_handler = ValidateFileHandler()
            extract_handler = ExtractTextHandler()
            save_handler = SaveToDBHandler()
            athenia_handler = IndexAtheniaHandler()
            log_handler = LogActivityHandler()
            
            # Terminar cadena explícitamente
            log_handler._next_handler = None
            
            # Conectar handlers en secuencia
            validate_handler.set_next(extract_handler)
            extract_handler.set_next(save_handler)
            save_handler.set_next(athenia_handler)
            athenia_handler.set_next(log_handler)
            
            return validate_handler

        # Ejecutar cadena de procesamiento
        handler_chain = build_handler_chain()
        
        await handler_chain.handle(context)

        if not context.document:
            raise HTTPException(status_code=400, detail="No se pudo crear el documento")

        # Actualizar checklist con el documento procesado
        conv_doc.document_id = context.document.id
        conv_doc.filename = file.filename
        conv_doc.status = "completed"
        conv_doc.uploaded_by = current_user.id
        conv_doc.uploaded_at = datetime.utcnow()
        
        # Registrar en historial
        history = ConvocatoriaHistory(
            convocatoria_id=conv_id,
            document_name=conv_doc.name,
            action="uploaded",
            user_id=current_user.id
        )
        db.add(history)
        db.commit()

        logger.info(f"[Correlation ID: {correlation_id}] Successfully uploaded document {context.document.id} to checklist {conv_doc.id}")
        
    except HTTPException as he:
        logger.error(f"[Correlation ID: {correlation_id}] HTTP error: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"[Correlation ID: {correlation_id}] Unexpected error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al procesar el archivo")

    return {
        "success": True,
        "message": "Documento subido exitosamente",
        "checklist_id": conv_doc.id,
        "status": conv_doc.status,
        "filename": conv_doc.filename,
        "document_id": context.document.id
    }


@router.post("/{conv_id}/documents/{doc_id}/link")
def link_uploaded_document(
    conv_id: int,
    doc_id: int,
    backend_document_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Vincular un documento previamente subido con un ítem del checklist.
    
    Este endpoint permite asociar un documento que ya existe en la base de datos
    (tabla Document) con un ítem de checklist específico. Útil cuando se suben
    documentos de forma independiente y luego se vinculan.
    
    Args:
        conv_id (int): ID de la convocatoria
        doc_id (int): ID del ítem de checklist
        backend_document_id (int): ID del documento en la tabla Document
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        dict: Mensaje de confirmación
    
    Raises:
        HTTPException 404: Checklist o documento no encontrado
    
    Example:
        POST /convocatorias/1/documents/5/link?backend_document_id=123
    """
    # Buscar ítem de checklist
    conv_doc = db.query(ConvocatoriaDocument).filter(
        ConvocatoriaDocument.id == doc_id,
        ConvocatoriaDocument.convocatoria_id == conv_id
    ).first()
    
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar que el documento backend existe
    backend_doc = db.query(Document).filter(Document.id == backend_document_id).first()
    if not backend_doc:
        raise HTTPException(status_code=404, detail="Documento backend no encontrado")
    
    # Vincular documento
    conv_doc.document_id = backend_document_id
    conv_doc.status = "completed"
    conv_doc.uploaded_by = current_user.id
    conv_doc.uploaded_at = datetime.utcnow()
    
    # Registrar en historial
    history = ConvocatoriaHistory(
        convocatoria_id=conv_id,
        document_name=conv_doc.name,
        action="uploaded",
        user_id=current_user.id
    )
    db.add(history)
    
    db.commit()
    return {"message": "Documento vinculado exitosamente"}


@router.delete("/{conv_id}/documents/{doc_id}", status_code=status.HTTP_200_OK)
def delete_document_from_convocatoria(
    conv_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Eliminar un documento del checklist.
    
    Elimina un ítem de checklist de la convocatoria. Solo el creador o
    administradores pueden eliminar documentos. La eliminación se registra
    en el historial.
    
    Args:
        conv_id (int): ID de la convocatoria
        doc_id (int): ID del documento a eliminar
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        dict: Mensaje de confirmación con el nombre del documento eliminado
    
    Raises:
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria o documento no encontrado
    
    Example:
        DELETE /convocatorias/1/documents/5
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Buscar documento
    conv_doc = db.query(ConvocatoriaDocument).filter(
        ConvocatoriaDocument.id == doc_id,
        ConvocatoriaDocument.convocatoria_id == conv_id
    ).first()
    
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    doc_name = conv_doc.name
    
    # Registrar eliminación en historial
    history = ConvocatoriaHistory(
        convocatoria_id=conv_id,
        document_name=doc_name,
        action="deleted",
        user_id=current_user.id
    )
    db.add(history)
    
    # Eliminar documento
    db.delete(conv_doc)
    db.commit()
    
    return {"message": f"Documento '{doc_name}' eliminado exitosamente"}


@router.put("/{conv_id}/documents/{doc_id}", response_model=ConvocatoriaDocumentOut)
def update_document_name(
    conv_id: int,
    doc_id: int,
    data: ConvocatoriaDocumentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Actualizar el nombre de un documento del checklist.
    
    Permite renombrar un ítem de checklist. El cambio se registra en el
    historial mostrando el nombre anterior y el nuevo.
    
    Args:
        conv_id (int): ID de la convocatoria
        doc_id (int): ID del documento a renombrar
        data (ConvocatoriaDocumentUpdate): Nuevo nombre
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        ConvocatoriaDocumentOut: Documento actualizado
    
    Raises:
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria o documento no encontrado
    
    Example:
        PUT /convocatorias/1/documents/5
        Body: {"name": "Nuevo nombre del documento"}
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Buscar documento
    conv_doc = db.query(ConvocatoriaDocument).filter(
        ConvocatoriaDocument.id == doc_id,
        ConvocatoriaDocument.convocatoria_id == conv_id
    ).first()
    
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Actualizar nombre
    old_name = conv_doc.name
    conv_doc.name = data.name
    
    # Registrar cambio en historial
    history = ConvocatoriaHistory(
        convocatoria_id=conv_id,
        document_name=f"{old_name} → {data.name}",
        action="renamed",
        user_id=current_user.id
    )
    db.add(history)
    
    db.commit()
    db.refresh(conv_doc)
    
    return conv_doc


@router.get("/{conv_id}/documents/{doc_id}/download")
def download_document(
    conv_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Descargar un documento de un checklist.
    
    Permite descargar el archivo asociado a un ítem de checklist. Solo usuarios
    con acceso a la convocatoria (administradores, creadores o colaboradores)
    pueden descargar archivos.
    
    Args:
        conv_id (int): ID de la convocatoria
        doc_id (int): ID del documento a descargar
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        StreamingResponse: Archivo para descargar con headers apropiados
    
    Raises:
        HTTPException 403: Usuario sin acceso a la convocatoria
        HTTPException 404: Convocatoria, documento o archivo no encontrado
    
    Example:
        GET /convocatorias/1/documents/5/download
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(
        Convocatoria.id == conv_id
    ).first()
    
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")

    # Verificar permisos de acceso
    is_admin = current_user.role.name == "admin"
    is_creator = convocatoria.created_by == current_user.id
    is_collaborator = db.query(ConvocatoriaCollaborator).filter(
        ConvocatoriaCollaborator.convocatoria_id == conv_id,
        ConvocatoriaCollaborator.user_id == current_user.id
    ).first() is not None
    
    has_access = is_admin or is_creator or is_collaborator
    
    if not has_access:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Buscar documento del checklist
    conv_doc = db.query(ConvocatoriaDocument).filter(
        ConvocatoriaDocument.id == doc_id,
        ConvocatoriaDocument.convocatoria_id == conv_id
    ).first()
    
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not conv_doc.document_id:
        raise HTTPException(status_code=404, detail="Documento no disponible para descargar")
    
    # Obtener archivo de la tabla Document
    document = db.query(Document).filter(
        Document.id == conv_doc.document_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    if not document.blob_enc:
        raise HTTPException(status_code=404, detail="Archivo vacío")

    # Determinar nombre del archivo
    filename = document.filename or conv_doc.filename or f"documento_{doc_id}"

    # Retornar archivo como streaming response
    return StreamingResponse(
        iter([document.blob_enc]),
        media_type=document.mimetype or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# ==========================================
# ENDPOINTS - GUÍAS
# ==========================================

@router.post("/{conv_id}/documents/{doc_id}/guide")
async def upload_document_guide(
    conv_id: int,
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Cargar un archivo guía para un documento del checklist.
    
    Este endpoint permite subir un documento guía o plantilla que sirve como
    referencia para los usuarios al subir el documento principal. Las guías
    no afectan el porcentaje de completitud pero están disponibles para descarga.
    
    Casos de uso:
        - Plantillas de formularios
        - Ejemplos de documentos correctos
        - Instrucciones de llenado
        - Formatos requeridos
    
    Args:
        conv_id (int): ID de la convocatoria
        doc_id (int): ID del documento del checklist
        request (Request): Request con el archivo guía
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        dict: Información del resultado incluyendo:
            - success: Si la operación fue exitosa
            - message: Mensaje descriptivo
            - document_id: ID del checklist actualizado
            - guide: Información del archivo guía subido
    
    Raises:
        HTTPException 400: Archivo inválido o vacío
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria o documento no encontrado
    
    Example:
        POST /convocatorias/1/documents/5/guide
        Content-Type: multipart/form-data
        Form: files=plantilla.pdf
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos (solo creador o admin)
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Buscar documento del checklist
    conv_doc = db.query(ConvocatoriaDocument).filter(
        ConvocatoriaDocument.id == doc_id,
        ConvocatoriaDocument.convocatoria_id == conv_id
    ).first()
    
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    try:
        # Obtener archivo del request
        form_data = await request.form()
        files = form_data.getlist("files")
        
        if not files or len(files) == 0:
            raise HTTPException(status_code=400, detail="Se requiere archivo")
        
        file = files[0]
        content = await file.read()
        file_size = len(content)
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Archivo vacío")
        
    except Exception as e:
        logger.error(f"Error procesando archivo guía: {e}")
        raise HTTPException(status_code=400, detail="Error al procesar archivo")
    
    try:
        # Crear documento guía en tabla Document
        guide_doc = Document(
            filename=file.filename,
            mimetype=file.content_type or "application/octet-stream",
            size=file_size,
            file_type=detect_file_type(file.filename),
            blob_enc=content,
            uploaded_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(guide_doc)
        db.flush()
        
        if not guide_doc.id or not guide_doc.filename:
            raise RuntimeError("No se asignaron propiedades al documento guía")
        
        # Vincular guía con el checklist
        conv_doc.guide_id = guide_doc.id
        
        # Registrar en historial
        history = ConvocatoriaHistory(
            convocatoria_id=conv_id,
            document_name=f"Guía de {conv_doc.name}: {file.filename}",
            action="guide_uploaded",
            user_id=current_user.id
        )
        db.add(history)
        
        db.commit()
        db.refresh(guide_doc)
        
        return {
            "success": True,
            "message": "Guía subida exitosamente",
            "document_id": conv_doc.id,
            "guide": {
                "id": guide_doc.id,
                "fileName": guide_doc.filename or "Sin nombre",
                "uploadedAt": guide_doc.created_at.isoformat(),
                "uploadedBy": current_user.name,
                "size": guide_doc.size
            }
        }
        
    except Exception as e:
        logger.error(f"Error creando documento guía: {e}")
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear documento: {str(e)}")


@router.get("/{conv_id}/documents/{doc_id}/guide/download")
def download_guide_document(
    conv_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Descargar el archivo guía de un documento.
    
    Permite descargar el documento guía asociado a un ítem de checklist.
    Solo el creador o administradores pueden descargar guías.
    
    Args:
        conv_id (int): ID de la convocatoria
        doc_id (int): ID del documento del checklist
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        StreamingResponse: Archivo guía para descargar
    
    Raises:
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria, documento o guía no encontrada
    
    Example:
        GET /convocatorias/1/documents/5/guide/download
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Buscar documento del checklist
    conv_doc = db.query(ConvocatoriaDocument).filter(
        ConvocatoriaDocument.id == doc_id,
        ConvocatoriaDocument.convocatoria_id == conv_id
    ).first()
    
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if not conv_doc.guide_id:
        raise HTTPException(status_code=404, detail="Este documento no tiene guía")
    
    # Obtener documento guía
    guide = db.query(Document).filter(Document.id == conv_doc.guide_id).first()
    
    if not guide or not guide.blob_enc:
        raise HTTPException(status_code=404, detail="Guía no encontrada o vacía")
    
    # Retornar archivo como streaming response
    return StreamingResponse(
        iter([guide.blob_enc]),
        media_type=guide.mimetype or "application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={guide.filename}"}
    )


@router.delete("/{conv_id}/documents/{doc_id}/guide", status_code=status.HTTP_200_OK)
async def delete_guide_document(
    conv_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Eliminar el archivo guía de un documento.
    
    Elimina el documento guía asociado a un ítem de checklist. El documento
    del checklist permanece intacto, solo se elimina la guía. La eliminación
    se registra en el historial.
    
    Args:
        conv_id (int): ID de la convocatoria
        doc_id (int): ID del documento del checklist
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        dict: Mensaje de confirmación
    
    Raises:
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria, documento o guía no encontrada
    
    Example:
        DELETE /convocatorias/1/documents/5/guide
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Buscar documento del checklist
    conv_doc = db.query(ConvocatoriaDocument).filter(
        ConvocatoriaDocument.id == doc_id,
        ConvocatoriaDocument.convocatoria_id == conv_id
    ).first()
    
    if not conv_doc or not conv_doc.guide_id:
        raise HTTPException(status_code=404, detail="Guía no encontrada")
    
    # Desvincular y eliminar guía
    guide_id = conv_doc.guide_id
    conv_doc.guide_id = None
    
    # Registrar en historial
    history = ConvocatoriaHistory(
        convocatoria_id=conv_id,
        document_name=f"Guía de {conv_doc.name}",
        action="guide_deleted",
        user_id=current_user.id
    )
    db.add(history)
    
    # Eliminar documento guía de la BD
    guide_doc = db.query(Document).filter(Document.id == guide_id).first()
    if guide_doc:
        db.delete(guide_doc)
    
    db.commit()
    
    return {"message": "Guía eliminada exitosamente"}


# ==========================================
# ENDPOINTS - HISTORIAL
# ==========================================

@router.get("/{conv_id}/history", response_model=List[ConvocatoriaHistoryOut])
def get_convocatoria_history(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener el historial de cambios de una convocatoria.
    
    Retorna un registro cronológico de todas las acciones realizadas en una
    convocatoria, ordenado de más reciente a más antiguo. Útil para auditoría
    y seguimiento de actividades.
    
    Tipos de acciones registradas:
        - created: Creación de documentos
        - uploaded: Subida de archivos
        - updated: Actualizaciones
        - deleted: Eliminaciones
        - renamed: Cambios de nombre
        - guide_uploaded: Subida de guías
        - guide_deleted: Eliminación de guías
        - collaborator_added: Adición de colaboradores
        - collaborator_removed: Eliminación de colaboradores
    
    Args:
        conv_id (int): ID de la convocatoria
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        List[ConvocatoriaHistoryOut]: Lista de eventos del historial
    
    Example:
        GET /convocatorias/1/history
    """
    # Obtener historial ordenado por fecha descendente
    history = db.query(ConvocatoriaHistory).filter(
        ConvocatoriaHistory.convocatoria_id == conv_id
    ).order_by(ConvocatoriaHistory.timestamp.desc()).all()
    
    return [
        ConvocatoriaHistoryOut(
            id=h.id,
            document_name=h.document_name,
            action=h.action,
            user_name=h.user.name,
            timestamp=h.timestamp
        )
        for h in history
    ]


# ==========================================
# ENDPOINTS - COLABORADORES
# ==========================================

@router.get("/{conv_id}/collaborators", response_model=List[CollaboratorOut])
def list_collaborators(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Listar todos los colaboradores de una convocatoria.
    
    Retorna la lista completa de usuarios que tienen acceso de colaborador
    a la convocatoria especificada, incluyendo su rol y fecha de adición.
    
    Args:
        conv_id (int): ID de la convocatoria
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        List[CollaboratorOut]: Lista de colaboradores con su información
    
    Raises:
        HTTPException 404: Convocatoria no encontrada
    
    Example:
        GET /convocatorias/1/collaborators
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Obtener todos los colaboradores
    collaborators = db.query(ConvocatoriaCollaborator).filter(
        ConvocatoriaCollaborator.convocatoria_id == conv_id
    ).all()
    
    return [
        CollaboratorOut(
            id=c.id,
            user_id=c.user_id,
            user_name=c.user.name,
            user_email=c.user.email,
            role=c.role,
            added_at=c.added_at
        )
        for c in collaborators
    ]


@router.post("/{conv_id}/collaborators", response_model=dict)
def add_collaborators(
    conv_id: int,
    data: ConvocatoriaCollaboratorAdd,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Agregar múltiples colaboradores a una convocatoria.
    
    Este endpoint permite agregar uno o más usuarios como colaboradores de una
    convocatoria. Los colaboradores obtienen permisos para ver y subir documentos.
    Solo el creador o administradores pueden agregar colaboradores.
    
    Validaciones:
        - Los usuarios deben existir en el sistema
        - No se pueden agregar usuarios que ya son colaboradores
        - Se registra cada adición en el historial
    
    Args:
        conv_id (int): ID de la convocatoria
        data (ConvocatoriaCollaboratorAdd): IDs de usuarios y rol a asignar
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        dict: Resultado de la operación incluyendo:
            - success: Si se agregó al menos un colaborador
            - message: Resumen de la operación
            - added_count: Cantidad de colaboradores agregados
            - errors: Lista de errores si los hubo
    
    Raises:
        HTTPException 400: Lista de usuarios vacía
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria no encontrada
    
    Example:
        POST /convocatorias/1/collaborators
        Body: {
            "user_ids": [2, 3, 4],
            "role": "collaborator"
        }
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos
    if not current_user.is_admin and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Validar que se proporcionaron usuarios
    if not data.user_ids or len(data.user_ids) == 0:
        raise HTTPException(status_code=400, detail="Debe proporcionar al menos un usuario")
    
    added_count = 0
    errors = []

    # Procesar cada usuario
    for user_id in data.user_ids:
        try:
            # Verificar que el usuario existe
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                errors.append(f"Usuario ID {user_id} no encontrado")
                continue
            
            # Verificar si ya es colaborador
            existing = db.query(ConvocatoriaCollaborator).filter(
                ConvocatoriaCollaborator.convocatoria_id == conv_id,
                ConvocatoriaCollaborator.user_id == user_id
            ).first()
            
            if existing:
                errors.append(f"Usuario {user.name} ya es colaborador")
                continue
            
            # Crear colaborador
            collaborator = ConvocatoriaCollaborator(
                convocatoria_id=conv_id,
                user_id=user_id,
                role=data.role,
                added_by=current_user.id
            )
            db.add(collaborator)
            
            # Registrar en historial
            history = ConvocatoriaHistory(
                convocatoria_id=conv_id,
                document_name=f"Colaborador: {user.name}",
                action="collaborator_added",
                user_id=current_user.id
            )
            db.add(history)
            
            added_count += 1

        except Exception as e:
            errors.append(f"Error al agregar usuario {user_id}: {str(e)}")
    
    db.commit()
    
    return {
        "success": added_count > 0,
        "message": f"Se agregaron {added_count} colaborador(es)",
        "added_count": added_count,
        "errors": errors if errors else []
    }


@router.delete("/{conv_id}/collaborators/{collab_id}", status_code=status.HTTP_200_OK)
def delete_collaborator(
    conv_id: int,
    collab_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Eliminar un colaborador de una convocatoria.
    
    Remueve los permisos de colaborador de un usuario específico. Solo el
    creador de la convocatoria o administradores pueden eliminar colaboradores.
    La eliminación se registra en el historial.
    
    Args:
        conv_id (int): ID de la convocatoria
        collab_id (int): ID del registro de colaborador a eliminar
        db (Session): Sesión de base de datos (inyectada automáticamente)
        current_user (User): Usuario autenticado (inyectado automáticamente)
    
    Returns:
        dict: Mensaje de confirmación y ID del usuario removido
    
    Raises:
        HTTPException 403: Usuario sin permisos
        HTTPException 404: Convocatoria o colaborador no encontrado
    
    Example:
        DELETE /convocatorias/1/collaborators/10
    """
    # Verificar que la convocatoria existe
    convocatoria = db.query(Convocatoria).filter(Convocatoria.id == conv_id).first()
    if not convocatoria:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    
    # Verificar permisos
    if not current_user.role.name == "admin" and convocatoria.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Buscar colaborador
    collaborator = db.query(ConvocatoriaCollaborator).filter(
        ConvocatoriaCollaborator.id == collab_id,
        ConvocatoriaCollaborator.convocatoria_id == conv_id
    ).first()
    
    if not collaborator:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    
    # Guardar información antes de eliminar
    collab_name = collaborator.user.name
    removed_user_id = collaborator.user_id
    
    # Registrar en historial
    history = ConvocatoriaHistory(
        convocatoria_id=conv_id,
        document_name=f"Colaborador: {collab_name}",
        action="collaborator_removed",
        user_id=current_user.id
    )
    db.add(history)
    
    # Eliminar colaborador
    db.delete(collaborator)
    db.commit()
    
    return {
        "message": f"Colaborador {collab_name} eliminado",
        "removed_user_id": removed_user_id
    }
