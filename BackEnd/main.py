"""
Punto de entrada principal de la aplicación FastAPI.

Configuración de la API del asistente documental con autenticación,
gestión de documentos y asistente conversacional.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.db.database import Base, engine, SessionLocal
from app.api.v1.routes.auth_endpoints import router as auth_router
from app.api.v1.routes.documents_endpoints import router as docs_router
from app.api.v1.routes.assistant import router as assist_router
from app.core.init_roles import init_roles
from app.models.models import Role

load_dotenv()

# Validar configuración de ATHENIA
try:
    settings.validate_athenia()
except ValueError as e:
    logging.error(f"⚠️ Error de configuración: {e}")
    print("\n⚠️  ATHENIA no está completamente configurado.")
    print("📝 Por favor, agrega tu GEMINI_API_KEY en el archivo .env\n")

ALLOWED_ORIGINS = [
    origin.strip() 
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")
]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("asistente")


def initialize_database():
    """
    Inicializa la base de datos creando tablas y roles si no existen.
    
    Utiliza create_all con checkfirst=True para evitar recrear tablas existentes.
    Inicializa roles solo si la tabla de roles está vacía.
    """
    try:
        # Crear todas las tablas si no existen (checkfirst=True es el default)
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tablas de base de datos verificadas/creadas")
        
        # Inicializar roles solo si no existen
        with SessionLocal() as db:
            role_count = db.query(Role).count()
            
            if role_count == 0:
                logger.info("📋 Inicializando roles por primera vez...")
                init_roles(db)
                db.commit()
                logger.info("✅ Roles inicializados correctamente")
            else:
                logger.info(f"✅ Base de datos ya contiene {role_count} roles")
                
    except Exception as e:
        logger.error(f"❌ Error al inicializar la base de datos: {e}")
        raise


# Ejecutar inicialización al cargar el módulo
initialize_database()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestiona el ciclo de vida de la aplicación.
    
    Se ejecuta al iniciar y al cerrar la aplicación para
    manejar recursos, conexiones y limpieza.
    
    Args:
        app (FastAPI): Instancia de la aplicación.
    """
    logger.info("🚀 Iniciando aplicación...")
    yield
    logger.info("🛑 Cerrando aplicación...")


# Crear instancia FastAPI
app = FastAPI(
    title="Asistente Documental - MVP",
    description="API para gestión de documentos con asistente conversacional",
    version="1.0.0",
    lifespan=lifespan
)


# Incluir routers de endpoints
app.include_router(auth_router)
app.include_router(docs_router)
app.include_router(assist_router)


# Configurar middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """
    Endpoint raíz para verificar que la API está funcionando.
    
    Returns:
        dict: Estado de la aplicación.
    """
    return {
        "status": "ok",
        "message": "Asistente Documental API",
        "version": "1.0.0"
    }


# Montar directorio de archivos estáticos
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
