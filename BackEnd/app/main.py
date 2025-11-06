import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import time
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from urllib.parse import urlparse

from app.core.config import settings
from app.db.database import Base, engine, SessionLocal
from app.api.v1.routes.auth_endpoints import router as auth_router
from app.api.v1.routes.documents_endpoints import router as docs_router
from app.api.v1.routes.assistant import router as assist_router
from app.core.init_roles import init_roles
from app.models.models import User, Role, LoginAttempt, Document, Log, ActivityLog, BlacklistedToken

load_dotenv()
#  Validar configuración de ATHENIA
try:
    settings.validate_athenia()
except ValueError as e:
    logging.error(f" Error de configuración: {e}")
    print("\n⚠️  ATHENIA no está completamente configurado.")
    print("📝 Por favor, agrega tu GEMINI_API_KEY en el archivo .env\n")
    # No detener la app, solo advertir

ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("asistente")



# ==================================================
# 🔥 Resetear completamente la base de datos al iniciar
# ==================================================

def verify_database_empty(db):
    """
    Verifica que no haya datos en las tablas después del reseteo.
    """
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        for table in tables:
            query = text(f"SELECT COUNT(*) FROM {table}")
            count = db.execute(query).scalar()
            if count > 0:
                logger.warning(f"Tabla {table} contiene {count} registros después del reseteo.")
                return False
        return True
    except SQLAlchemyError as e:
        logger.error(f"Error al verificar si la base de datos está vacía: {e}")
        return False

def reset_database():
    """
    Resetea completamente la base de datos, eliminando todas las tablas y datos,
    incluyendo usuarios, administradores, roles y tablas de Alembic.
    """
    try:
        
        # For SQLite, attempt to delete the database file
        db_url_str = str(engine.url)
        if "sqlite" in db_url_str:
            parsed = urlparse(db_url_str)
            db_path = parsed.path.lstrip('/')
            full_path = os.path.abspath(db_path) if db_path else "./asistente_docs.db"
            if os.path.exists(full_path):
                # Close all connections to release file locks
                try:
                    engine.dispose()  # Close all engine connections
                except Exception as e:
                    logger.warning(f"No se pudieron cerrar conexiones: {e}")
                
                # Retry file deletion up to 3 times with delay
                for attempt in range(3):
                    try:
                        os.remove(full_path)
                        break
                    except PermissionError as e:
                        logger.warning(f"Intento {attempt + 1}/3: No se pudo eliminar '{full_path}': {e}")
                        if attempt < 2:
                            time.sleep(1)  # Wait 1 second before retrying
                        else:
                            logger.error(f"Fallo al eliminar '{full_path}' después de 3 intentos.")
                            # Fall back to dropping tables
                            break
                    except OSError as e:
                        logger.error(f"No se pudo eliminar el archivo '{full_path}': {e}")
                        raise
        
        # Drop any remaining tables (fallback or non-SQLite cases)
        Base.metadata.drop_all(bind=engine)
        
        # Drop any non-SQLAlchemy tables (e.g., alembic_version)
        inspector = inspect(engine)
        remaining_tables = inspector.get_table_names()
        if remaining_tables:
            logger.warning(f"Tablas restantes después de drop_all: {remaining_tables}")
            with engine.connect() as connection:
                for table in remaining_tables:
                    try:
                        connection.execute(text(f"DROP TABLE IF EXISTS {table}"))
                    except SQLAlchemyError as e:
                        logger.error(f"No se pudo eliminar la tabla {table}: {e}")
                connection.commit()
        
        # Recreate all tables
        Base.metadata.create_all(bind=engine)
        
        # Verify that tables were created
        inspector = inspect(engine)
        created_tables = inspector.get_table_names()
        expected_tables = ['users', 'roles', 'login_attempts', 'documents', 'logs', 'activity_logs', 'blacklisted_tokens']
        for table in expected_tables:
            if table not in created_tables:
                logger.error(f"Tabla '{table}' no fue creada. Verifique la definición de modelos.")
                raise Exception(f"Tabla '{table}' no creada.")
        
        # Initialize roles
        with SessionLocal() as db:
            try:
                # Verify no data exists before initializing roles
                if not verify_database_empty(db):
                    logger.error("Datos residuales detectados antes de inicializar roles.")
                    raise Exception("Base de datos no está vacía después del reseteo.")
                
                init_roles(db)
                
                # Verify roles and no users
                role_count = db.query(Role).count()
                user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
                if user_count > 0:
                    logger.error(f"Se encontraron {user_count} usuarios después del reseteo.")
                    raise Exception("Usuarios residuales detectados.")
                
            except Exception as e:
                logger.error(f"Error al inicializar roles después del reseteo: {e}")
                raise
            
            db.commit()
        
        logger.info("✅ Base de datos reseteada e inicializada con éxito.")
        
    except SQLAlchemyError as e:
        logger.error(f" Error de SQLAlchemy al resetear la base de datos: {e}")
        raise
    except Exception as e:
        logger.error(f" Error crítico al resetear la base de datos: {e}")
        raise

# Ejecutar el reseteo de la base de datos al iniciar la aplicación
reset_database()

# ===============================
#  Lifespan (startup/shutdown)
# ===============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando aplicación...")
    yield
    logger.info("Cerrando aplicación...")

# ========================
#  Crear instancia FastAPI
# ========================
app = FastAPI(
    title="Asistente Documental - MVP",
    lifespan=lifespan
)

# =====================
#  Incluir routers
# =====================
app.include_router(auth_router)
app.include_router(docs_router)
app.include_router(assist_router)

# ================================
#  Configurar middleware CORS
# ================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================
#  Ruta raíz
# ====================
@app.get("/")
def root():
    return {"status": "ok"}

# Montar archivos estáticos
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")