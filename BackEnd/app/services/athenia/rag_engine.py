import os
import re
from typing import List, Tuple
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LangchainDocument
from google import genai
from app.models.models import Document

class RAGEngine:
    """
    Motor RAG optimizado para ATHENIA
    Maneja embeddings, búsqueda vectorial y generación de respuestas
    """
    
    def __init__(self):
        # Configuración
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.vector_db_path = "./storage/athenia_data/chroma_db"
        self.chunk_size = 500
        self.chunk_overlap = 100
        self.top_k = 2
        
        # Inicializar Gemini
        self.gemini_client = genai.Client(api_key=self.gemini_api_key)
        
        # Inicializar embeddings
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # Inicializar o cargar vectorstore
        self._init_vectorstore()
    
    def _init_vectorstore(self):
        """Inicializar vectorstore"""
        os.makedirs(self.vector_db_path, exist_ok=True)
        
        if os.path.exists(self.vector_db_path) and os.listdir(self.vector_db_path):
            # Cargar existente
            self.vectorstore = Chroma(
                persist_directory=self.vector_db_path,
                embedding_function=self.embeddings
            )
        else:
            # Crear nuevo
            self.vectorstore = Chroma(
                persist_directory=self.vector_db_path,
                embedding_function=self.embeddings,
                collection_metadata={
                    "hnsw:space": "cosine",
                    "hnsw:construction_ef": 100,
                    "hnsw:M": 16,
                    "hnsw:search_ef": 50,
                }
            )
    
    def index_document(self, document: Document) -> int:
        """
        Indexar un documento en el vectorstore
        
        Returns:
            Número de chunks creados
        """
        if not document.text:
            raise ValueError(f"Documento {document.id} no tiene texto extraído")
        
        # Dividir en chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        chunks = text_splitter.split_text(document.text)
        
        # Crear documentos de LangChain con metadata
        langchain_docs = [
            LangchainDocument(
                page_content=chunk,
                metadata={
                    "document_id": document.id,
                    "filename": document.filename,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
            )
            for i, chunk in enumerate(chunks)
        ]
        
        # Agregar a vectorstore
        self.vectorstore.add_documents(langchain_docs)
        
        return len(chunks)
    
    def query(
        self,
        question: str,
        documents: List[Document],
        top_k: int = None
    ) -> Tuple[str, float, List[int]]:
        """
        Realizar consulta RAG
        
        Args:
            question: Pregunta del usuario
            documents: Lista de documentos disponibles para el contexto
            top_k: Número de chunks a recuperar (None = usar default)
        
        Returns:
            Tupla (respuesta, confianza, source_document_ids)
        """
        if not documents:
            return (
                "No tengo documentos disponibles para responder tu pregunta.",
                0.0,
                []
            )
        
        # IDs de documentos disponibles
        doc_ids = [doc.id for doc in documents]
        
        # Buscar contexto relevante
        k = top_k or self.top_k
        retrieved_docs = self.vectorstore.similarity_search(
            query=question,
            k=k * 2  # Buscar más para filtrar
        )
        
        # Filtrar solo documentos del usuario
        filtered_docs = [
            doc for doc in retrieved_docs
            if doc.metadata.get("document_id") in doc_ids
        ][:k]
        
        if not filtered_docs:
            return (
                "No encontré información relevante en tus documentos para responder esa pregunta.",
                0.0,
                []
            )
        
        # Construir contexto
        contexto_texto = "\n\n".join([
            f"[Documento: {doc.metadata.get('filename')}]\n{doc.page_content}"
            for doc in filtered_docs
        ])
        
        # IDs de documentos fuente
        source_ids = list(set([
            doc.metadata.get("document_id")
            for doc in filtered_docs
            if doc.metadata.get("document_id")
        ]))
        
        # Generar respuesta con Gemini
        answer, confidence = self._generate_answer(question, contexto_texto)
        
        return answer, confidence, source_ids
    
    def _generate_answer(self, question: str, context: str) -> Tuple[str, float]:
        """Generar respuesta usando Gemini"""
        
        prompt = f"""Eres ATHENIA, una asistente virtual especializada en análisis de documentos.

INSTRUCCIONES:
- Responde en español de forma clara, concisa y profesional
- Sé precisa y directa

Responde EN ESPAÑOL usando SOLO este contexto:
{context}

PREGUNTA DEL USUARIO:
{question}

Respuesta directa (máximo 2 párrafos, sin formato Markdown):"""
        
        try:
            response = self.gemini_client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt
            )
            
            answer = self._limpiar_markdown(response.text)
            
            # Calcular confianza basado en la respuesta
            confidence = self._calculate_confidence(answer, context)
            
            return answer, confidence
            
        except Exception as e:
            print(f"Error generando respuesta: {e}")
            return (
                "Lo siento, hubo un error al generar la respuesta. Por favor intenta de nuevo.",
                0.0
            )
    
    def _limpiar_markdown(self, texto: str) -> str:
        """Eliminar formato Markdown del texto"""
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
    
    def _calculate_confidence(self, answer: str, context: str) -> float:
        """
        Calcular nivel de confianza de la respuesta
        
        Basado en:
        - Longitud de la respuesta
        - Presencia de palabras del contexto
        - Si admite no saber
        """
        # Respuestas de "no sé" tienen baja confianza
        no_info_phrases = [
            "no encuentro",
            "no tengo esa información",
            "no está disponible",
            "no puedo responder"
        ]
        
        if any(phrase in answer.lower() for phrase in no_info_phrases):
            return 0.3
        
        # Respuestas muy cortas tienen baja confianza
        if len(answer) < 50:
            return 0.5
        
        # Contar palabras del contexto en la respuesta
        context_words = set(context.lower().split())
        answer_words = set(answer.lower().split())
        overlap = len(context_words.intersection(answer_words))
        
        # Calcular confianza basado en overlap
        confidence = min(0.6 + (overlap / 100), 1.0)
        
        return round(confidence, 2)
    
    def get_db_size(self) -> float:
        """Obtener tamaño de la base vectorial en MB"""
        try:
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(self.vector_db_path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    total_size += os.path.getsize(filepath)
            return round(total_size / (1024 * 1024), 2)
        except Exception:
            return 0.0
    
    def clear_index(self):
        """Limpiar completamente el índice vectorial"""
        import shutil
        if os.path.exists(self.vector_db_path):
            shutil.rmtree(self.vector_db_path)
        self._init_vectorstore()
