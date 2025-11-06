"""
Handler para indexación de documentos en ATHENIA.

Indexa documentos en el sistema vectorial después de ser guardados en BD.
Parte de la cadena de procesamiento de documentos.

Cadena de handlers:
    ValidateFileHandler
        ↓
    ExtractTextHandler
        ↓
    [EncryptFileHandler] (opcional)
        ↓
    SaveToDBHandler
        ↓
    IndexAtheniaHandler (este)
        ↓
    LogActivityHandler

Características:
    - Indexación en base de datos vectorial
    - Creación de embeddings con Gemini
    - Chunificación automática del texto
    - Registro en tabla AtheniaDocumentIndex
    - Manejo graceful de errores (no falla upload)
    - Detección de texto insuficiente
    - Retry logic implícita en DocumentProcessor

Performance:
    - Documento 1MB: 500-1000ms (depende de tamaño)
    - Embeddings: 1 por chunk (~1s para 1000 chunks)
    - Indexación vectorial: < 100ms

Notas de diseño:
    - Permite degradación (indexación es mejora, no requisito)
    - Errores de indexación NO detienen upload
    - Documentos sin texto suficiente se marcan (no se indexan)
    - Soporta reindexación manual posterior
"""

import logging
from app.services.handlers.base import DocumentHandler, DocumentContext  
from app.models.models import AtheniaDocumentIndex
from datetime import datetime

logger = logging.getLogger(__name__)


class IndexAtheniaHandler(DocumentHandler):  
    """
    Handler para indexación en ATHENIA.
    
    Toma documento guardado en BD e indexa su contenido en la base de datos
    vectorial para búsqueda semántica. Crea embeddings y registra metadatos.
    
    Responsabilidades:
        1. Verificar que documento existe
        2. Validar texto suficiente (> 50 caracteres)
        3. Procesar documento (chunificar, crear embeddings)
        4. Registrar en tabla AtheniaDocumentIndex
        5. Capturar errores sin fallar el upload
    
    Principio clave:
        "Indexación es una mejora, no un requisito"
        
        Si falla indexación:
        - Upload continúa exitoso
        - Documento se queda en BD
        - Se registra error para reintento
        - Usuario puede reindexar después
    
    Validaciones:
        - Documento existe (context.document)
        - Documento tiene texto (no None)
        - Texto tiene longitud mínima (50 caracteres)
        - DocumentProcessor.process_and_index() lo valida también
    
    Salida:
        context.athenia_indexed: bool (True si indexado)
        context.athenia_chunks: int (cantidad de chunks)
        context.athenia_error: str (mensaje de error si aplica)
    
    Ejemplo:
        # Parte de cadena de handlers
        index_handler = IndexAtheniaHandler()
        save_handler.set_next(index_handler)
        
        # Procesar documento
        await validate_handler.handle(context)
        
        # Verificar resultado
        if context.athenia_indexed:
            print(f"Documento indexado en {context.athenia_chunks} chunks")
        else:
            print(f"Error: {context.athenia_error}")
    
    Integración con DocumentProcessor:
        - DocumentProcessor.validate_document() valida tipos
        - DocumentProcessor.process_and_index() chunifica e indexa
        - RAGEngine maneja indexación vectorial
    
    Flujo de datos:
        DocumentContext
            ├─ document (BD record)
            ├─ document.text (texto extraído)
            └─ db (sesión)
            ↓
        process_and_index()
            ├─ Chunificar texto
            ├─ Crear embeddings
            ├─ Indexar en vectorstore
            └─ Retornar chunks_count
            ↓
        AtheniaDocumentIndex record
            ├─ document_id
            ├─ is_indexed: true
            ├─ chunks_count: N
            └─ last_indexed_at
    """
    
    async def _handle(self, context: DocumentContext):  
        """
        Indexar documento en ATHENIA.
        
        Operación:
            1. Verificar documento existe
            2. Validar texto suficiente
            3. Importar DocumentProcessor
            4. Procesar e indexar
            5. Registrar en BD
            6. Actualizar contexto
            7. Capturar errores sin propagar
        
        Args:
            context (DocumentContext): Contexto con documento guardado
        
        Comportamiento en error:
            - Logs error pero no propaga excepción
            - Documento permanece en BD
            - context.athenia_indexed = False
            - Intento posterior de reindexación posible
        
        Performance:
            - Documento 100KB: 200-300ms
            - Documento 1MB: 500-1000ms
            - Documento 10MB: 2-5 segundos
        
        Notas:
            - Llamar después de SaveToDBHandler
            - Llamar antes de LogActivityHandler
            - No requiere documento encriptado
            - Usa context.document.text (ya extraído)
        """
        correlation_id = getattr(context, 'correlation_id', 'N/A')
        
        try:
            # Paso 1: Verificar documento existe
            if not context.document:
                logger.debug(
                    f"No documento para indexar en ATHENIA"
                )
                return
            
            document = context.document
            
            # Paso 2: Validar texto suficiente
            if not document.text or len(document.text.strip()) < 50:
                logger.debug(
                    f"Documento {document.id} tiene texto insuficiente "
                    f"({len(document.text) if document.text else 0} chars). "
                    f"No indexable."
                )
                context.athenia_indexed = False
                context.athenia_chunks = 0
                return
            
            logger.debug(
                f"Indexando documento {document.id} ({document.filename}) "
                f"en ATHENIA ({len(document.text)} caracteres)"
            )
            
            # Paso 3: Importar DocumentProcessor
            # Se importa aquí para evitar dependencias circulares
            # entre handlers, services, y processors
            from app.services.athenia.document_processor import DocumentProcessor
            
            # Paso 4: Procesar e indexar
            processor = DocumentProcessor()
            chunks_count = processor.process_and_index(document)
            
            logger.debug(
                f"Documento {document.id} indexado. "
                f"Chunks: {chunks_count}"
            )
            
            # Paso 5: Registrar en BD
            # Crea record en AtheniaDocumentIndex para tracking
            index_record = AtheniaDocumentIndex(
                document_id=document.id,
                is_indexed=True,
                chunks_count=chunks_count,
                last_indexed_at=datetime.utcnow(),
                error_message=None
            )
            
            context.db.add(index_record)
            context.db.commit()
            
            logger.debug(
                f"Record AtheniaDocumentIndex creado para documento {document.id}"
            )
            
            # Paso 6: Actualizar contexto
            context.athenia_indexed = True
            context.athenia_chunks = chunks_count
            
        except ImportError as ie:
            """
            DocumentProcessor o dependencias no disponibles.
            
            Posibles causas:
            - ATHENIA deshabilitado en configuración
            - Paquetes requeridos no instalados
            - Path de importación incorrecto
            """
            logger.error(
                f"Módulo ATHENIA no disponible: {str(ie)}"
            )
            context.athenia_indexed = False
            context.athenia_error = "Módulo ATHENIA no instalado"
            
        except Exception as e:
            """
            Error genérico durante indexación.
            
            No propagar excepción: permitir que upload continúe.
            Registrar error en BD para auditoría y reintento posterior.
            
            Causas posibles:
            - Error en DocumentProcessor
            - Error en RAGEngine
            - Error en Gemini API
            - Error de BD
            """
            logger.error(
                f"Error indexando documento {document.id if hasattr(context, 'document') and context.document else 'N/A'}: {str(e)}",
                exc_info=False  # No print de stack trace completo
            )
            
            # Intentar registrar error en BD
            try:
                if context.document:
                    error_record = AtheniaDocumentIndex(
                        document_id=context.document.id,
                        is_indexed=False,
                        chunks_count=0,
                        error_message=str(e)[:500]  # Limitar longitud
                    )
                    context.db.add(error_record)
                    context.db.commit()
            except Exception as db_error:
                logger.error(
                    f"Fallo guardando registro de error en ATHENIA: {str(db_error)}"
                )
            
            # Actualizar contexto pero NO propagar error
            context.athenia_indexed = False
            context.athenia_error = str(e)[:200]
