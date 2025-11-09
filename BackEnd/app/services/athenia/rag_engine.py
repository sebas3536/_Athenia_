"""
Motor RAG (Retrieval-Augmented Generation) para ATHENIA.

Este módulo implementa un sistema de búsqueda semántica y generación de respuestas
utilizando Chroma como base de datos vectorial, embeddings de Hugging Face y
Google Gemini como modelo generativo.
"""

import os
import re
import shutil
from typing import List, Tuple, Set

from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LangchainDocument
import google.generativeai as genai

from app.models.models import Document


class RAGEngine:
    """
    Motor principal del sistema RAG de ATHENIA.
    
    Gestiona la indexación de documentos en una base de datos vectorial
    y genera respuestas naturales basadas en el contenido indexado utilizando
    Gemini de Google como modelo generativo.
    
    Attributes:
        gemini_api_key (str): Clave API de Google Gemini.
        vector_db_path (str): Ruta al directorio de persistencia de Chroma.
        chunk_size (int): Tamaño de cada fragmento de texto.
        chunk_overlap (int): Superposición entre fragmentos consecutivos.
        model: Modelo generativo de Gemini configurado.
        embeddings: Función de embeddings multilingüe.
        vectorstore: Instancia de Chroma para almacenamiento vectorial.
    """
    
    def __init__(self):
        """
        Inicializa el motor RAG.
        
        Configura la API de Gemini, carga el modelo de embeddings y
        prepara o carga la base de datos vectorial existente.
        
        Raises:
            ValueError: Si la variable GEMINI_API_KEY no está configurada.
            Exception: Si falla la configuración de Gemini.
        """
        # Leer y validar API key de Gemini
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not self.gemini_api_key:
            raise ValueError("Configura GEMINI_API_KEY en .env")

        self.vector_db_path = "./storage/athenia_data/chroma_db"
        self.chunk_size = 500
        self.chunk_overlap = 100

        # Configurar modelo generativo de Gemini
        try:
            genai.configure(api_key=self.gemini_api_key)
            self.model = genai.GenerativeModel('models/gemini-2.5-flash')
        except Exception as e:
            raise Exception(f"Error configurando Gemini: {e}")

        # Configurar modelo de embeddings multilingüe
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        self._init_vectorstore()

    def _init_vectorstore(self) -> None:
        """
        Inicializa o carga la base de datos vectorial Chroma.
        
        Si existe una base de datos previa en el path configurado, la carga.
        De lo contrario, crea una nueva con configuración optimizada (cosine similarity, HNSW).
        """
        os.makedirs(self.vector_db_path, exist_ok=True)
        
        if os.path.exists(self.vector_db_path) and os.listdir(self.vector_db_path):
            # Cargar base de datos existente
            self.vectorstore = Chroma(
                persist_directory=self.vector_db_path,
                embedding_function=self.embeddings
            )
        else:
            # Crear nueva base de datos con configuración HNSW
            self.vectorstore = Chroma(
                persist_directory=self.vector_db_path,
                embedding_function=self.embeddings,
                collection_metadata={"hnsw:space": "cosine", "hnsw:M": 16}
            )

    def index_document(self, document: Document) -> int:
        """
        Indexa un documento dividiéndolo en fragmentos (chunks) y almacenándolos.
        
        Utiliza RecursiveCharacterTextSplitter para dividir el texto en fragmentos
        del tamaño configurado, manteniendo coherencia semántica.
        
        Args:
            document (Document): Documento a indexar con id, filename y text.
        
        Returns:
            int: Número de fragmentos creados e indexados.
        
        Raises:
            ValueError: Si el documento no contiene texto válido.
        """
        if not document.text or not document.text.strip():
            raise ValueError(f"Documento {document.id} sin texto")

        # Dividir texto en fragmentos con superposición
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        chunks = splitter.split_text(document.text)

        # Crear documentos Langchain con metadata
        docs = [
            LangchainDocument(
                page_content=chunk,
                metadata={
                    "document_id": document.id,
                    "filename": document.filename,
                    "chunk_index": i
                }
            )
            for i, chunk in enumerate(chunks)
        ]
        
        self.vectorstore.add_documents(docs)
        return len(chunks)

    def query(
        self, 
        question: str, 
        documents: List[Document], 
        top_k: int = None
    ) -> Tuple[str, float, List[int]]:
        """
        Procesa una pregunta y genera una respuesta basada en los documentos disponibles.
        
        Realiza búsqueda semántica en la base vectorial, selecciona los fragmentos
        más relevantes y genera una respuesta natural usando Gemini.
        
        Args:
            question (str): Pregunta del usuario.
            documents (List[Document]): Lista de documentos disponibles para consulta.
            top_k (int, optional): Número máximo de fragmentos a recuperar.
        
        Returns:
            Tuple[str, float, List[int]]: 
                - Respuesta generada (str)
                - Nivel de confianza 0-1 (float)
                - IDs de documentos fuente utilizados (List[int])
        """
        if not documents:
            return "No tengo documentos disponibles.", 0.0, []

        # Calcular parámetros de búsqueda
        doc_ids = {doc.id for doc in documents}
        target_docs = min(len(documents), 4)
        chunks_per_doc = 3
        total_k = target_docs * chunks_per_doc

        # Búsqueda semántica con filtro por documento
        try:
            retrieved = self.vectorstore.similarity_search(
                query=question,
                k=total_k * 2,
                filter={"document_id": {"$in": list(doc_ids)}}
            )
        except Exception as e:
            return "Error en búsqueda.", 0.0, []

        # Seleccionar fragmentos únicos por documento
        seen = set()
        selected = []
        for doc in retrieved:
            doc_id = doc.metadata["document_id"]
            if doc_id not in seen and len(selected) < total_k:
                selected.append(doc)
                seen.add(doc_id)
            if len(seen) >= target_docs:
                break

        if not selected:
            return "No encontré información relevante.", 0.0, []

        # Construir contexto con información de archivos fuente
        context_parts = [
            f"Del archivo *{doc.metadata['filename']}*: {doc.page_content.strip()}" 
            for doc in selected
        ]
        contexto_texto = "\n\n".join(context_parts)
        source_ids = list(seen)

        # Generar respuesta natural
        answer, confidence = self._generate_natural_answer(
            question, 
            contexto_texto, 
            documents
        )
        return answer, confidence, source_ids

    def _generate_natural_answer(
        self, 
        question: str, 
        context: str, 
        documents: List[Document]
    ) -> Tuple[str, float]:
        """
        Genera una respuesta natural usando el modelo Gemini.
        
        Construye un prompt estructurado con reglas de comportamiento,
        contexto relevante y la pregunta del usuario para obtener
        respuestas precisas y naturales.
        
        Args:
            question (str): Pregunta del usuario.
            context (str): Contexto construido desde fragmentos relevantes.
            documents (List[Document]): Documentos disponibles.
        
        Returns:
            Tuple[str, float]: Respuesta limpia y nivel de confianza.
        """
        prompt = f"""Eres ATHENIA, una asistente experta, cálida y precisa.

REGLAS:
- Responde en español, natural y humano
- Menciona archivos así: "En X dice...", "En A y B se menciona..."
- Combina o compara información
- Usa TODO el contexto relevante
- Máximo 4-5 oraciones
- Si no sabes: "No lo veo en los documentos"

CONTEXTO:
{context}

PREGUNTA:
{question}

Respuesta:"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.7,
                    "top_p": 0.8,
                    "max_output_tokens": 512
                }
            )
            raw_answer = response.text.strip()
            clean_answer = self._limpiar_markdown(raw_answer)
            confidence = self._calcular_confianza(clean_answer, context)
            
            return clean_answer, confidence
            
        except Exception as e:
            if "429" in str(e):
                return "Límite de uso alcanzado. Intenta mañana.", 0.0
            return "Error al generar respuesta.", 0.0

    def _limpiar_markdown(self, texto: str) -> str:
        """
        Elimina formato Markdown del texto generado.
        
        Remueve negritas (**), cursivas (*_), headers (#), bloques de código (```
        código inline (`) y enlaces [texto](url) para obtener texto plano.
        
        Args:
            texto (str): Texto con formato Markdown.
        
        Returns:
            str: Texto sin formato Markdown.
        """
        texto = re.sub(r'\*\*(.+?)\*\*', r'\1', texto)
        texto = re.sub(r'__(.+?)__', r'\1', texto)
        texto = re.sub(r'\*(.+?)\*', r'\1', texto)
        texto = re.sub(r'_(.+?)_', r'\1', texto)
        texto = re.sub(r'^#+\s+', '', texto, flags=re.MULTILINE)
        texto = re.sub(r'``````', '', texto, flags=re.DOTALL)
        texto = re.sub(r'`(.+?)`', r'\1', texto)
        texto = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', texto)
        texto = re.sub(r'^[\*\-]\s+', '', texto, flags=re.MULTILINE)
        return texto.strip()
        
        return texto.strip()

    def _calcular_confianza(self, answer: str, context: str) -> float:
        """
        Calcula el nivel de confianza de una respuesta generada.
        
        Evalúa la longitud de la respuesta, presencia de frases de incertidumbre
        y superposición léxica con el contexto para estimar confianza.
        
        Args:
            answer (str): Respuesta generada.
            context (str): Contexto utilizado.
        
        Returns:
            float: Valor de confianza entre 0.0 y 1.0.
        """
        # Respuestas muy cortas tienen baja confianza
        if len(answer) < 30:
            return 0.4
        
        # Detectar frases de incertidumbre
        if any(p in answer.lower() for p in ["no lo veo", "no aparece", "no dice"]):
            return 0.5
        
        # Calcular superposición léxica
        overlap = len(set(answer.lower().split()) & set(context.lower().split()))
        return round(min(0.6 + overlap / 50, 1.0), 2)

    def safe_clear_index(self):
        """
        Limpia completamente el índice de la base de datos vectorial.
        
        Elimina el directorio completo de Chroma y reinicializa
        la base de datos desde cero. Operación irreversible.
        
        Raises:
            Exception: Si ocurre un error durante la eliminación.
        """
        try:
            # Liberar referencia a vectorstore
            if hasattr(self, 'vectorstore'):
                self.vectorstore = None
            
            # Eliminar directorio físico
            if os.path.exists(self.vector_db_path):
                shutil.rmtree(self.vector_db_path)
            
            # Reinicializar vectorstore vacía
            self._init_vectorstore()
            
        except Exception as e:
            raise Exception(f"Error en safe_clear_index: {e}")

    def delete_document_chunks(self, document_id: int):
        """
        Elimina todos los fragmentos asociados a un documento específico.
        
        Busca en la colección de Chroma todos los chunks que pertenecen
        al document_id indicado y los elimina de forma selectiva.
        
        Args:
            document_id (int): ID del documento cuyos chunks se eliminarán.
        
        Raises:
            Exception: Si ocurre un error durante la eliminación.
        """
        try:
            # Buscar chunks del documento
            results = self.vectorstore._collection.get(
                where={"document_id": document_id},
                include=["ids"]
            )
            
            # Eliminar si existen
            if results['ids']:
                self.vectorstore._collection.delete(ids=results['ids'])
                
        except Exception as e:
            raise Exception(f"Error borrando chunks: {e}")

    def get_db_size(self) -> float:
        """
        Calcula el tamaño total de la base de datos vectorial en disco.
        
        Recorre recursivamente el directorio de Chroma y suma el tamaño
        de todos los archivos.
        
        Returns:
            float: Tamaño en megabytes (MB). Retorna 0.0 si hay error.
        """
        try:
            total = sum(
                os.path.getsize(os.path.join(d, f))
                for d, _, fs in os.walk(self.vector_db_path) 
                for f in fs
            )
            return round(total / (1024 * 1024), 2)
        except:
            return 0.0