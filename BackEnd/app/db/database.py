"""
Módulo de configuración de base de datos.

Este módulo gestiona toda la configuración de conexión a la base de datos,
incluyendo creación del motor SQLAlchemy, sesiones, modelos base y la
inyección de dependencias para FastAPI.

Configuración soportada:
    - SQLite: Desarrollo local sin dependencias externas
    - PostgreSQL: Producción con alta concurrencia
    - MySQL: Alternativa de producción

Componentes:
    - engine: Motor SQLAlchemy de conexión
    - SessionLocal: Factory de sesiones
    - Base: Declarative base para modelos ORM
    - get_db: Dependency injection para FastAPI
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# =========================================================
#  CONFIGURACIÓN DE CONEXIÓN
# =========================================================

# **DATABASE_URL**: URL de conexión a la base de datos
#   - Formato: protocol://user:password@host:port/database
#   - SQLite (desarrollo): sqlite:///./asistente_docs.db
#   - PostgreSQL (producción): postgresql://user:pass@localhost/dbname
#   - MySQL: mysql://user:pass@localhost/dbname
#   - Variable de entorno: DATABASE_URL
#   - Default: SQLite local (para desarrollo)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./asistente_docs.db")

# =========================================================
#  CREACIÓN DEL MOTOR SQLALCHEMY
# =========================================================

# **engine**: Motor SQLAlchemy que gestiona conexiones con la BD
#   - Proporciona pool de conexiones
#   - Maneja reconexiones automáticas
#   - Ejecuta queries SQL
#   - Se reutiliza en toda la aplicación
engine = create_engine(
    DATABASE_URL,
    # Argumento específico para SQLite (allows same thread)
    # PostgreSQL/MySQL no necesitan este parámetro
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# =========================================================
#  SESIONES DE BASE DE DATOS
# =========================================================

# **SessionLocal**: Factory para crear sesiones de BD
#   - Crea una nueva sesión para cada request
#   - autocommit=False: Requiere explicit commit
#   - autoflush=False: No flushea automáticamente
#   - bind=engine: Usa el motor definido arriba
SessionLocal = sessionmaker(
    autocommit=False,  # Transacciones explícitas (más control)
    autoflush=False,   # Flush explícito (mejor para debugging)
    bind=engine        # Usar nuestro motor
)

# **Base**: Base declarativa para definir modelos ORM
#   - Todos los modelos heredan de Base
#   - Base.metadata contiene definición de todas las tablas
#   - Se usa para crear_all() en inicialización
Base = declarative_base()

# =========================================================
#  REGISTRAR MODELOS
# =========================================================

# Importar modelos para registrar con Base.metadata
# IMPORTANTE: Estos imports activan el registro de modelos
from app.models.models import (
    User,              # Tabla usuarios
    Role,              # Tabla roles (admin, user)
    LoginAttempt,      # Tabla de intentos de login (para rate limiting)
    Document,          # Tabla documentos
    Log,               # Tabla logs de evento
    ActivityLog,       # Tabla de auditoría de acciones
    BlacklistedToken   # Tabla de tokens revocados (logout)
)

# =========================================================
#  DEPENDENCY INJECTION PARA FASTAPI
# =========================================================

def get_db():
    """
    Obtener sesión de base de datos para inyectar en endpoints.
    
    Esta función implementa el patrón de inyección de dependencias de FastAPI.
    Se usa para proporcionar sesiones de BD a los endpoints de forma automática.
    
    Características:
        - Crea nueva sesión para cada request
        - Cierra sesión automáticamente después
        - Maneja excepciones (cierra incluso si hay error)
        - Compatible con async/await
    
    Uso en endpoints:
        ```
        from fastapi import Depends
        from app.db.database import get_db
        from sqlalchemy.orm import Session
        
        @app.get("/users/")
        def get_users(db: Session = Depends(get_db)):
            # db es sesión automáticamente inyectada
            users = db.query(User).all()
            return users
        ```
    
    Ciclo de vida:
        1. FastAPI llama get_db() al recibir request
        2. Se crea sesión con SessionLocal()
        3. Se yield sesión al endpoint
        4. Endpoint usa la sesión
        5. Se ejecuta bloque finally
        6. Sesión se cierra
        7. Request completa
    
    Transacciones:
        - Cada sesión es transacción independiente
        - Changes se guardan con db.commit()
        - Rollback automático en excepciones
        - Cada sesión es thread-safe
    
    Pool de conexiones:
        - SessionLocal reutiliza conexiones
        - SQLAlchemy maneja pool automáticamente
        - En producción: típicamente 5-20 conexiones
        - Evita crear nueva conexión por request
    
    Performance:
        - Sesión nueva por request (overhead mínimo)
        - Pool de conexiones reutiliza conexiones BD
        - Típicamente < 1ms por request
    
    Error handling:
        - try/finally asegura cierre incluso con excepciones
        - Si endpoint genera error, sesión se cierra igual
        - Previene connection leaks
    
    Testing:
        - Fácil de mockear para tests
        - Se puede inyectar sesión de test
        - Permite transacciones de test aisladas
    
    Yields:
        Session: Sesión SQLAlchemy lista para usar
    
    Example:
        ```
        # En endpoint
        @app.post("/documents/")
        def create_doc(doc_data: DocumentCreate, db: Session = Depends(get_db)):
            db_doc = Document(**doc_data.dict())
            db.add(db_doc)
            db.commit()
            db.refresh(db_doc)
            return db_doc
        
        # Ciclo:
        # 1. get_db() crea sesión
        # 2. endpoint usa sesión
        # 3. finally db.close()
        ```
    """
    # Crear nueva sesión
    db = SessionLocal()
    try:
        # Yield sesión al endpoint (es generador)
        yield db
    finally:
        # Cerrar sesión siempre, incluso si hay error
        db.close()


# =========================================================
#  REFERENCIA DE MODELOS REGISTRADOS
# =========================================================

"""
Los siguientes modelos están registrados con Base.metadata:

1. **User**: Tabla de usuarios
   - Campos: id, email, name, hashed_password, role_id, etc.
   - Relaciones: Role, Documents, LoginAttempts

2. **Role**: Tabla de roles
   - Campos: id, name, description
   - Valores: admin, user

3. **LoginAttempt**: Tabla de intentos de login
   - Campos: id, user_id, timestamp, successful, ip_address
   - Usado para rate limiting y seguridad

4. **Document**: Tabla de documentos
   - Campos: id, filename, size, file_type, uploaded_by, created_at
   - Almacena metadatos y blob encriptado

5. **Log**: Tabla de logs
   - Campos: id, level, message, timestamp, details
   - Para debugging y monitoreo

6. **ActivityLog**: Tabla de auditoría
   - Campos: id, user_id, document_id, action, timestamp, ip_address
   - Rastrea acciones de usuarios

7. **BlacklistedToken**: Tabla de tokens revocados
   - Campos: id, token, revoked_at, user_id
   - Para logout y revocación

Todas las tablas se crean automáticamente con:
    Base.metadata.create_all(bind=engine)
"""
