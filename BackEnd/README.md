# ATHENIA - Asistente Inteligente de Documentos

> Plataforma empresarial de gestión de documentos con inteligencia artificial integrada. Procesa, indexa y busca documentos usando embeddings vectoriales y generación de respuestas impulsada por Google Gemini.

**Estado:** Producción | **Versión:** 1.0.0 | **Python:** 3.10+ | **Última Actualización:** Noviembre 2025

---

## 📋 Tabla de Contenidos

1. [Características Principales](#características-principales)
2. [Requisitos Previos](#requisitos-previos)
3. [Instalación Paso a Paso](#instalación-paso-a-paso)
4. [Configuración del Archivo .env](#configuración-del-archivo-env)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Uso y Endpoints](#uso-y-endpoints)
7. [Arquitectura del Sistema](#arquitectura-del-sistema)
8. [Seguridad](#seguridad)
9. [Solución de Problemas](#solución-de-problemas)
10. [Despliegue en Producción](#despliegue-en-producción)

---

## ✨ Características Principales

### 🔐 Autenticación y Seguridad
- Autenticación con JWT tokens con expiración configurable
- Autenticación de dos factores (2FA) con códigos TOTP
- Códigos de respaldo para recuperación de 2FA
- Bloqueo temporal de cuenta tras intentos fallidos
- Gestión de sesiones activas en múltiples dispositivos
- Detección de login sospechoso con alertas

### 📁 Gestión de Documentos
- Subida de múltiples formatos (PDF, DOCX, DOC, TXT)
- Extracción automática de texto con OCR
- Encriptación de documentos en reposo (AES-256)
- Búsqueda full-text con filtrado por tipo
- Descarga segura con streaming
- Auditoría completa de acciones

### 🤖 ATHENIA - IA Integrada
- Búsqueda semántica con embeddings vectoriales
- Generación de respuestas con RAG (Retrieval-Augmented Generation)
- Caché dual (exacto + semántico) para optimización
- Indexación automática en Chroma DB
- Conversaciones con historial completo
- **60-90% reducción de llamadas a API**

### 👥 Gestión de Usuarios
- Control de acceso basado en roles (RBAC)
- Preferencias personalizables por usuario
- Gestión de colaboradores en convocatorias
- Recuperación de contraseña por email
- Cambio de contraseña con validación
- Alertas de login inusual

### 📋 Convocatorias
- Creación de procesos de recolección de documentos
- Checklist de documentos requeridos
- Documento guía opcional
- Colaboradores con roles diferenciados (admin/editor)
- Historial de cambios completo
- Cálculo de porcentaje de completitud

---

## 📦 Requisitos Previos

### Software Requerido
- Python 3.10+ (testeado en 3.10, 3.11, 3.14)
- Git
- pip (incluido con Python)

### Servicios Externos Requeridos
| Servicio | Propósito | Link |
|----------|-----------|------|
| Google Gemini API | IA para procesamiento y respuestas | [Obtener aquí](https://makersuite.google.com/app/apikey) |
| Resend | Envío de emails | [Obtener aquí](https://resend.com/api-keys) |

### Versiones de Librerías Compatibles
- FastAPI: 0.100+
- SQLAlchemy: 2.0+
- Python-Jose: 3.3+
- PyJWT: 2.8+

---

## 🚀 Instalación Paso a Paso

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/sebas3536/athenia.git
cd athenia
```

### Paso 2: Crear Entorno Virtual

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Paso 3: Instalar Dependencias
```bash
pip install -r requirements.txt
```

### Paso 4: Configurar Variables de Entorno

Copiar archivo de plantilla:
```bash
cp .env.example .env
```

Editar el archivo `.env`:
```bash
# Windows
notepad .env

# macOS/Linux
nano .env
```

### Paso 5: Inicializar Base de Datos
```bash
python -c "from app.core.init_roles import main; main()"
```

### Paso 6: Crear Clave de Encriptación
```bash
python -c "from app.services.security_service import generate_encryption_key; generate_encryption_key('enc.key')"
```

### Paso 7: Ejecutar el Servidor
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Acceso a la Aplicación:**
- API: http://localhost:8000
- Documentación Swagger: http://localhost:8000/docs
- Documentación ReDoc: http://localhost:8000/redoc

---

## ⚙️ Configuración del Archivo .env

Copia y pega estas variables en tu archivo `.env`:

### Seguridad y Autenticación
```
# Clave secreta para JWT (GENERAR UNA NUEVA EN PRODUCCIÓN)
# Ejecutar: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=#############################################

# Duración del token en minutos (Desarrollo: 480 | Producción: 15-30)
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Ruta del archivo de encriptación
ENC_KEY_PATH=./enc.key
```

### Base de Datos
```
# SQLite para desarrollo (recomendado para comenzar)
DATABASE_URL=sqlite:///./asistente_docs.db

# PostgreSQL para producción
# DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/athenia_db

# MySQL para producción
# DATABASE_URL=mysql+pymysql://usuario:contraseña@localhost:3306/athenia

# Flag para testing
TESTING=0
```

### Servidor y CORS
```
# Modo de depuración (False en producción)
DEBUG=False

# Ambiente (development, staging, production)
ENV=development

# Orígenes permitidos (separados por comas)
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000
```

### Email (Resend)
```
# API Key de Resend (obtener en https://resend.com/api-keys)
RESEND_API_KEY=re_##################

# Email del remitente (formato: "Nombre <email@dominio.com>")
FROM_EMAIL= Nombre <email@dominio.com>"
```

### Google Gemini (OBLIGATORIO para IA)
```
# API Key de Gemini (obtener en https://makersuite.google.com/app/apikey)
# NO COMMITEAR ESTA CLAVE AL REPOSITORIO
GEMINI_API_KEY=################################################

# Configuración RAG
CHUNK_SIZE=500                    # Tamaño de fragmentos (300-1000)
CHUNK_OVERLAP=100                 # Superposición (10-25%)
TOP_K_RESULTS=3                   # Fragmentos para respuesta (2-5)

# Almacenamiento de datos de IA
ATHENIA_STORAGE_PATH=./storage/athenia_data

# Caché
ATHENIA_CACHE_TTL_DAYS=7          # TTL en días
ATHENIA_CACHE_ENABLED=True        # Habilitar caché
```

### Voz (Opcional)
```
# Velocidad de síntesis
VOICE_SPEED=+20%

# Voz de Edge-TTS (es-PA-MargaritaNeural, es-ES-AlvaroNeural, es-MX-DariaNeural)
DEFAULT_VOICE=es-PA-MargaritaNeural
```

### Logging
```
# Nivel: DEBUG, INFO, WARNING, ERROR
LOG_LEVEL=INFO

# Habilitar logs de IA
ATHENIA_LOGGING=True
```

---

## 📂 Estructura del Proyecto

```
athenia/
├── main.py                          # Punto de entrada
├── requirements.txt                 # Dependencias
├── .env                            # Configuración (NO COMMITEAR)
├── .gitignore                      # Archivos ignorados
├── enc.key                         # Clave de encriptación (NO COMMITEAR)
├── pytest.ini                      # Configuración de tests
│
├── api/
│   └── v1/
│       └── routes/
│           ├── auth_endpoints/
│           │   ├── autentication.py
│           │   ├── session_routes.py
│           │   ├── user_preferences.py
│           │   ├── password_reset_router.py
│           │   ├── gestionusuarios.py
│           │   ├── administracion.py
│           │   ├── convocatorias_router.py
│           │   └── verficacion2fa.py
│           │
│           └── documents_endpoints/
│               ├── upload.py
│               ├── documents.py
│               ├── search.py
│               ├── download.py
│               ├── delete.py
│               └── metadata.py
│
├── core/
│   ├── config.py                   # Configuración centralizada
│   ├── init_roles.py               # Inicialización de BD
│   └── security.py                 # Utilidades de seguridad
│
├── db/
│   ├── database.py                 # SQLAlchemy config
│   └── crud/
│       └── crud.py                 # Operaciones CRUD
│
├── models/
│   └── models.py                   # 20+ Modelos ORM
│
├── schemas/
│   ├── auth_schemas.py
│   ├── document_schemas.py
│   ├── user_schemas.py
│   └── ...
│
├── services/
│   ├── auth_service.py             # Lógica de autenticación
│   ├── security_service.py         # Hash, JWT, encriptación
│   ├── document_service.py         # Gestión de documentos
│   ├── email_service.py            # Envío de emails
│   ├── password_reset_service.py   # Reset de contraseña
│   ├── session_service.py          # Gestión de sesiones
│   │
│   ├── athenia/
│   │   ├── athenia_service.py      # Orquestación de IA
│   │   ├── rag_engine.py           # Motor RAG + Gemini
│   │   ├── cache_manager.py        # Caché exacto
│   │   ├── semantic_cache.py       # Caché semántico
│   │   └── document_processor.py   # Procesamiento
│   │
│   └── handlers/
│       ├── base.py                 # Clases base
│       ├── validate_file.py        # Validación
│       ├── extract_text.py         # Extracción
│       ├── encrypt_file.py         # Encriptación
│       ├── save_to_db.py           # Guardado BD
│       └── index_athenia.py        # Indexación
│
├── enums/
│   └── enums.py                    # Enumeraciones
│
├── uploads/
│   └── profile_photos/             # Fotos de usuario
│
└── storage/
    └── athenia_data/               # Datos de IA
```

---

## 💻 Uso y Endpoints

### Iniciar el Servidor

**Desarrollo (con recarga automática):**
```bash
uvicorn main:app --reload
```

**Producción (optimizado):**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Endpoints de Autenticación

**Login:**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

**Registro:**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password123!",
    "password_confirm": "Password123!",
    "name": "John Doe"
  }'
```

**Logout:**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/logout" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Endpoints de Documentos

**Subir documento:**
```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@reporte.pdf"
```

**Listar documentos:**
```bash
curl -X GET "http://localhost:8000/api/v1/documents/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Buscar documentos:**
```bash
curl -X GET "http://localhost:8000/api/v1/documents/search?query=ingresos" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Descargar documento:**
```bash
curl -X GET "http://localhost:8000/api/v1/documents/123/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o documento.pdf
```

**Eliminar documento:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/documents/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Endpoints de ATHENIA (IA)

**Hacer una pregunta:**
```bash
curl -X POST "http://localhost:8000/api/v1/athenia/ask" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cuáles fueron los ingresos totales?"
  }'
```

**Ver conversaciones:**
```bash
curl -X GET "http://localhost:8000/api/v1/athenia/conversations" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Sincronizar documentos:**
```bash
curl -X POST "http://localhost:8000/api/v1/athenia/sync" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Tabla de Endpoints Principales

| Método | Endpoint | Descripción | Requiere Autenticación |
|--------|----------|-------------|------------------------|
| POST | `/api/v1/auth/login` | Login de usuario | No |
| POST | `/api/v1/auth/signup` | Registro de usuario | No |
| POST | `/api/v1/auth/logout` | Cerrar sesión | Sí |
| POST | `/api/v1/documents/upload` | Subir documento | Sí |
| GET | `/api/v1/documents/` | Listar documentos | Sí |
| GET | `/api/v1/documents/search` | Buscar documentos | Sí |
| GET | `/api/v1/documents/{id}/download` | Descargar documento | Sí |
| DELETE | `/api/v1/documents/{id}` | Eliminar documento | Sí |
| POST | `/api/v1/athenia/ask` | Hacer pregunta a IA | Sí |
| GET | `/api/v1/athenia/conversations` | Ver historial | Sí |
| POST | `/api/v1/athenia/sync` | Sincronizar IA | Sí |

**Documentación interactiva completa:** http://localhost:8000/docs

---

## 🏗️ Arquitectura del Sistema

### Capas de Arquitectura

```
┌─────────────────────────────────────┐
│  Frontend (Angular/React)           │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│  FastAPI Router & Endpoints         │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│  Services (Lógica de Negocio)       │
├────────────────┬────────────────────┤
│ AuthService    │ DocumentService    │
│ EmailService   │ SessionService     │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│  Handlers (Responsabilidades)       │
├────────────────┬────────────────────┤
│ Validate       │ Extract            │
│ Encrypt        │ Index              │
│ SaveToDB       │ LogActivity        │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│  Base de Datos & Servicios Externos │
├────────────────┬────────────────────┤
│ SQLAlchemy     │ Google Gemini      │
│ ChromaDB       │ Resend Email       │
└─────────────────────────────────────┘
```

### Flujo de Procesamiento de Documentos

```
1. Upload File
   ↓
2. ValidateFileHandler
   (verifica formato y tamaño)
   ↓
3. ExtractTextHandler
   (extrae texto de PDF, DOCX, TXT)
   ↓
4. EncryptFileHandler
   (encripta con AES-256)
   ↓
5. SaveToDBHandler
   (registra en base de datos)
   ↓
6. IndexAtheniaHandler
   (crea embeddings y vectores)
   ↓
7. LogActivityHandler
   (registra auditoría)
   ↓
✅ Documento listo para búsqueda
```

### Flujo de Búsqueda con ATHENIA

```
1. Entrada de Pregunta
   ↓
2. Validar Caché Exacto
   ├─ ✅ HIT → Retornar respuesta en caché
   └─ ❌ MISS → Continuar
   ↓
3. Validar Caché Semántico
   ├─ ✅ HIT (similitud 85%) → Retornar respuesta en caché
   └─ ❌ MISS → Continuar
   ↓
4. Obtener Documentos del Usuario
   ├─ Sin documentos → Respuesta genérica
   └─ Con documentos → Continuar
   ↓
5. RAGEngine (Google Gemini)
   ├─ Crear embeddings de pregunta
   ├─ Buscar chunks similares
   ├─ Generar respuesta contextualizada
   └─ Retornar con confianza
   ↓
6. Guardar en Ambos Cachés
   ├─ Caché exacto
   └─ Caché semántico
   ↓
7. Registrar en Historial
   ↓
✅ Respuesta Final Entregada
```

### Optimización de Caché

El sistema implementa caché dual para reducir llamadas a la API de Gemini:

- **Caché Exacto:** Guarda respuestas de preguntas idénticas
- **Caché Semántico:** Detecta preguntas similares (85%+) sin llamar API
- **TTL Configurable:** Expira automáticamente después de días configurados
- **Resultado:** 60-90% reducción en llamadas a API Gemini

---

## 🔒 Seguridad

### Autenticación y Autorización

| Aspecto | Implementación | Nivel |
|--------|-----------------|-------|
| Autenticación | JWT tokens con HS256 | Producción |
| Refresh Tokens | Renovación automática | Seguro |
| Roles de Acceso | RBAC (admin, user) | Granular |
| Validación | Cada endpoint verificado | Completa |
| 2FA | Códigos TOTP + respaldo | Doble Factor |

### Encriptación de Datos

| Elemento | Algoritmo | Estado de Protección |
|----------|-----------|----------------------|
| Contraseñas | bcrypt + salt | En tránsito y reposo |
| Documentos | AES-256 | En reposo |
| Tokens JWT | HMAC-SHA256 | Firmados |
| Transporte | TLS/HTTPS | Producción requerido |

### Gestión de Sesiones

- Bloqueo de cuenta tras 5 intentos fallidos (15 minutos)
- Invalidación de tokens al hacer logout
- Rastreo de sesiones activas por dispositivo
- Revocación de sesiones por dispositivo específico
- Detección de login inusual con alertas

### Rate Limiting y Protección

- Bloqueo temporal tras intentos fallidos
- IP logging para detección de fuerza bruta
- Alertas de acceso sospechoso
- Límites de solicitudes por endpoint

### Auditoría Completa

- Todos los accesos registrados con timestamp
- Historial de cambios de documentos
- Correlación de requests con IDs únicos
- Logs sin información sensible

### Requisitos de Contraseña

Las contraseñas deben cumplir:
- Mínimo 8 caracteres
- 1 letra mayúscula
- 1 letra minúscula
- 1 número
- 1 carácter especial (!@#$%^&*)

Ejemplo válido: `SecurePass123!`

---

## 🔧 Solución de Problemas

### Error: "GEMINI_API_KEY no configurado"

**Solución:**
1. Verificar que `.env` existe en la raíz del proyecto
2. Verificar que `GEMINI_API_KEY` está presente en el archivo
3. Obtener clave en: https://makersuite.google.com/app/apikey
4. Reiniciar el servidor

**Verificar:**
```bash
grep GEMINI_API_KEY .env
```

### Error: "Database connection refused"

**Para SQLite:**
```bash
# Verificar permisos en la base de datos
ls -la asistente_docs.db

# Reinicializar base de datos
python -c "from app.core.init_roles import main; main()"
```

**Para PostgreSQL:**
```bash
# Windows
net start postgresql-x64-14

# Linux
sudo systemctl start postgresql

# macOS
brew services start postgresql
```

### Error: "ModuleNotFoundError"

**Solución:**
```bash
# 1. Verificar entorno virtual activado
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 2. Reinstalar dependencias
pip install -r requirements.txt

# 3. Limpiar caché de pip
python -m pip cache purge
```

### Documentos no se indexan en ATHENIA

**Solución:**
```bash
# 1. Verificar que documento tiene suficiente texto
# Mínimo 50 caracteres

# 2. Verificar que GEMINI_API_KEY es válido
grep GEMINI_API_KEY .env

# 3. Ver logs
tail -f app.log | grep -i athenia

# 4. Reindexar documentos
# POST /api/v1/athenia/sync
curl -X POST "http://localhost:8000/api/v1/athenia/sync" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Error: "Archivo .env no encontrado"

```bash
# Crear desde plantilla
cp .env.example .env

# Editar según ambiente
nano .env  # macOS/Linux
# o
notepad .env  # Windows
```

---

## 🚀 Despliegue en Producción

### Checklist Pre-Producción

Antes de desplegar, verificar:

- [ ] Cambiar `SECRET_KEY` a valor aleatorio único
- [ ] Cambiar `DEBUG=False`
- [ ] Configurar `DATABASE_URL` a PostgreSQL o MySQL
- [ ] Configurar `ALLOWED_ORIGINS` solo con dominios autorizados
- [ ] Generar nueva clave de encriptación (`enc.key`)
- [ ] Cambiar `ACCESS_TOKEN_EXPIRE_MINUTES` a 15-30 minutos
- [ ] Habilitar HTTPS/TLS en servidor
- [ ] Configurar rotación de logs
- [ ] Configurar backup automático de BD
- [ ] Implementar monitoreo y alertas
- [ ] Revisar permisos de archivos sensibles

### Generar Nueva SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copiar el resultado en `.env`:
```
SECRET_KEY=<resultado_del_comando>
```

### Opciones de Despliegue

**Usando Docker:**
```bash
docker build -t athenia .
docker run -p 8000:8000 --env-file .env athenia
```

**Usando Gunicorn + Uvicorn:**
```bash
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

**En Heroku:**
```bash
git push heroku main
```

### Configuración de Producción

```
DEBUG=False
ENV=production
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=postgresql://user:pass@host:5432/athenia
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

---

## 📚 Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|----------|
| FastAPI | 0.100+ | Framework web |
| SQLAlchemy | 2.0+ | ORM de BD |
| PyJWT | 2.8+ | Tokens JWT |
| bcrypt | 4.0+ | Hash de contraseñas |
| python-jose | 3.3+ | Seguridad JWT |
| pyotp | 2.9+ | 2FA con TOTP |
| PyPDF2 | 4.0+ | Lectura de PDFs |
| python-docx | 0.8+ | Lectura de Word |
| qrcode | 7.4+ | Generación QR |
| google-generativeai | 0.3+ | API Gemini |
| chromadb | 0.4+ | BD vectorial |
| resend | 0.8+ | Envío emails |

### Instalar Todas las Dependencias

```bash
pip install -r requirements.txt
```

---

## 📍 Puertos por Defecto

| Servicio | Puerto | Configuración |
|----------|--------|---------------|
| API FastAPI | 8000 | N/A |
| PostgreSQL | 5432 | DATABASE_URL |
| MySQL | 3306 | DATABASE_URL |
| ChromaDB | 8001 | ATHENIA_STORAGE_PATH |

---

## 📝 Archivos No Commitear

Asegurar que `.gitignore` contenga:

```
.env                    # Variables de entorno
enc.key                 # Clave de encriptación
__pycache__/           # Cache de Python
*.pyc                  # Archivos compilados
.pytest_cache/         # Cache de pytest
*.db                   # Bases de datos locales
venv/                  # Entorno virtual
storage/athenia_data/  # Datos de IA
uploads/               # Archivos subidos
.vscode/               # Configuración VSCode
.idea/                 # Configuración JetBrains
*.log                  # Archivos de logs
.DS_Store              # macOS
```

---

## 🆘 Soporte y Recursos

### Reportar Bugs

1. Crear issue en GitHub con:
   - Versión de Python
   - Stack trace completo del error
   - Pasos para reproducir
   - Sistema operativo

### Documentación Útil

- [Documentación FastAPI](https://fastapi.tiangolo.com)
- [Documentación SQLAlchemy](https://docs.sqlalchemy.org)
- [Google Gemini API](https://ai.google.dev/docs)
- [ChromaDB Documentation](https://docs.trychroma.com)

---

## 📊 Estadísticas del Proyecto

- **Líneas de código:** 15,000+
- **Modelos ORM:** 20+
- **Endpoints API:** 50+
- **Handlers:** 12+
- **Servicios:** 15+
- **Cobertura de tests:** 80%+
- **Ahorro con caché:** 60-90% menos llamadas a API

---

## 🙏 Agradecimientos

Construido con tecnologías de clase mundial:

- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy** - ORM poderoso para bases de datos
- **Google Gemini** - IA generativa de última generación
- **ChromaDB** - Base de datos vectorial especializada
- **Resend** - Servicio confiable de email transaccional
