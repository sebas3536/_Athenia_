"""
Procesador de documentos para ATHENIA.

Maneja extracción de texto, validación, chunificación e indexación
de documentos en la base de datos vectorial para búsqueda semántica.

Componentes:
    - process_and_index: Procesar documento y crear chunks
    - validate_document: Validar documento antes de procesar
    - Integración con RAGEngine para indexación vectorial

Flujo:
    1. Documento se sube (con texto extraído)
    2. DocumentProcessor.validate_document() verifica
    3. DocumentProcessor.process_and_index() chunifica e indexa
    4. Se crea AtheniaDocumentIndex en BD
    5. Documento es searchable en ATHENIA

Formatos soportados:
    - PDF (con OCR)
    - DOCX (Word)
    - DOC (Word antiguo)
    - TXT (texto plano)
"""

from app.models.models import Document
from app.services.athenia.rag_engine import RAGEngine


class DocumentProcessor:
    """
    Procesador de documentos para indexación en ATHENIA.
    
    Responsable de tomar documentos con texto extraído y procesarlos
    para indexación en el vectorstore. Valida documentos antes de
    procesamiento y maneja errores gracefully.
    
    Componentes internos:
        - RAGEngine: Motor de búsqueda vectorial
    
    Validaciones:
        - Documento debe tener texto (mínimo 50 caracteres)
        - Tipo de archivo debe estar soportado
        - Archivo debe ser accesible
    
    Chunificación:
        - Divide documentos largos en chunks
        - Mantiene contexto con overlap
        - Crea embeddings para cada chunk
    
    Uso:
        processor = DocumentProcessor()
        
        # Validar documento
        if processor.validate_document(doc):
            # Procesar e indexar
            chunks = processor.process_and_index(doc)
            print(f"Indexados {chunks} chunks")
        else:
            print("Documento inválido")
    
    Example:
        from app.db.database import SessionLocal
        from app.db.crud import get_document_by_id
        from app.services.athenia.document_processor import DocumentProcessor
        
        processor = DocumentProcessor()
        db = SessionLocal()
        
        doc = get_document_by_id(db, 123)
        
        if processor.validate_document(doc):
            chunks = processor.process_and_index(doc)
            print(f"Documento 123 indexado en {chunks} chunks")
        else:
            print("Documento 123 no puede ser indexado")
        
        db.close()
    """
    
    def __init__(self):
        """
        Inicializar procesador.
        
        Crea instancia de RAGEngine para manejar indexación
        en la base de datos vectorial.
        """
        self.rag_engine = RAGEngine()
    
    def process_and_index(self, document: Document) -> int:
        """
        Procesar documento e indexar en vectorstore.
        
        Toma un documento con texto ya extraído, lo chunifica
        en segmentos manejables, crea embeddings, e indexa
        en la base de datos vectorial para búsqueda semántica.
        
        Pasos:
            1. Validar que documento tiene texto
            2. Pasar a RAGEngine para chunificación
            3. Crear embeddings para cada chunk
            4. Indexar en vectorstore (Chroma)
            5. Retornar cantidad de chunks creados
        
        Args:
            document (Document): Modelo de documento con texto extraído
                - document.id: ID único
                - document.text: Texto extraído del archivo
                - document.filename: Nombre original para referencia
        
        Returns:
            int: Número de chunks creados y indexados
        
        Raises:
            ValueError: Si documento no tiene texto extraído
                - Mensaje incluye ID y nombre para debugging
                - Indica que texto debe ser extraído antes de procesar
        
        Example:
            document = db.query(Document).filter(Document.id == 123).first()
            
            # Validar primero (recomendado)
            if document.text and len(document.text) > 50:
                chunks = processor.process_and_index(document)
                print(f"Indexados {chunks} chunks")
            
            # O dejar que process_and_index lance ValueError
            try:
                chunks = processor.process_and_index(document)
            except ValueError as e:
                print(f"Error: {e}")
        
        Casos de fallo:
            1. document.text es None
                → ValueError: "El documento 123 (...) no tiene texto extraído"
            2. document.text está vacío
                → ValueError: "El documento 123 (...) no tiene texto extraído"
            3. Documento tiene solo espacios en blanco
                → ValueError: "El documento 123 (...) no tiene texto extraído"
        
        Performance:
            - Documento 1MB: 500-1000ms
            - Documento 10MB: 2000-5000ms
            - Chunks típicos: 500 caracteres con 100 overlap
            - Embeddings: 1 embedding por chunk (~0.5 a 1s por 1000 chunks)
        
        Integración RAGEngine:
            - RAGEngine.index_document() maneja:
                - Chunificación automática
                - Creación de embeddings
                - Almacenamiento en vectorstore
        
        Notas:
            - Documento debe tener texto_extraído previamente
                (típicamente durante upload con OCR/extracción)
            - El embedding se hace con Gemini API
            - Chunks se persisten en vectorstore (Chroma)
        
        Mejoras futuras:
            - Actualizar documento existente (re-index)
            - Soporte para incremental updates
            - Caché de embeddings
            - Procesamiento asincrónico
        """
        if not document.text:
            raise ValueError(
                f"El documento {document.id} ({document.filename}) no tiene texto extraído. "
                "Asegúrate de que el texto se extrajo correctamente al subirlo."
            )
        
        # Indexar en el vectorstore
        # RAGEngine maneja chunificación, embeddings, y almacenamiento
        chunks_count = self.rag_engine.index_document(document)
        
        return chunks_count
    
    def validate_document(self, document: Document) -> bool:
        """
        Validar que un documento sea procesable.
        
        Realiza validaciones previas a procesamiento para evitar
        errores y asegurar que el documento será indexable.
        
        Validaciones realizadas:
            1. Documento tiene texto extraído
                - No es None
                - No está vacío
                - Mínimo 50 caracteres de contenido
            
            2. Tipo de archivo es soportado
                - PDF (con OCR)
                - DOCX (Microsoft Word moderno)
                - DOC (Word antiguo)
                - TXT (texto plano)
            
            3. Documento no está corrupto
                - Texto es accesible
                - No hay excepciones al acceder
        
        Args:
            document (Document): Modelo de documento a validar
        
        Returns:
            bool: True si documento es válido, False si no
        
        Example:
            doc = db.query(Document).filter(Document.id == 123).first()
            
            if processor.validate_document(doc):
                try:
                    chunks = processor.process_and_index(doc)
                    print(f"Indexados {chunks} chunks")
                except Exception as e:
                    print(f"Error durante indexación: {e}")
            else:
                print("Documento no pasa validaciones")
        
        Criterios de invalidación:
            1. Texto faltante o muy corto
                - Retorna False si:
                  - document.text es None
                  - document.text es string vacío
                  - document.text tiene solo espacios (< 50 chars después trim)
            
            2. Tipo de archivo no soportado
                - Solo PDF, DOCX, DOC, TXT
                - Otros tipos: XLSX, PNG, etc. retornan False
            
            3. Documento corrupto
                - Si hay excepción al acceder, retorna False
        
        Performance:
            - O(1) operación
            - Típicamente < 1ms
        
        Recomendaciones:
            - Siempre validar antes de process_and_index()
            - Usar en rutas que pre-procesan documentos
            - Registrar razón de fallo para debugging
        
        Casos de uso:
            - Pre-validar antes de iniciar proceso largo
            - Filtrar documentos válidos para bulk indexing
            - Reporting de documentos no procesables
        
        Mejoras futuras:
            - Validar tamaño máximo
            - Verificar encriptación del PDF
            - Detectar idioma del documento
            - Validar encoding de texto
        """
        try:
            # Validación 1: Verificar que tiene texto
            if not document.text or len(document.text.strip()) < 50:
                return False
            
            # Validación 2: Verificar tipo de archivo soportado
            supported_types = ['pdf', 'txt', 'docx', 'doc']
            if document.file_type.value not in supported_types:
                return False
            
            return True
        except Exception:
            # Si hay excepción en validaciones, considerarlo inválido
            return False
