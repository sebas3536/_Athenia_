# 🚀 ATHENIA - Asistente Inteligente de Consulta para AudacIA

> **Una solución empresarial revolucionaria que centraliza la gestión de documentos y consultas mediante Inteligencia Artificial generativa, transformando la manera en que las organizaciones acceden y procesan información crítica.**

---

## 📊 Visión General del Proyecto

ATHENIA es una plataforma integral de gestión de documentos e consultas potenciada por IA, diseñada para resolver la fragmentación informativa en entornos académicos y empresariales. Combina un **frontend moderno en Angular**, un **backend robusto en FastAPI**, y un **motor de IA generativa con Google Gemini**, para ofrecer respuestas precisas y contextualizadas en tiempo real.

El proyecto surge de la necesidad de **AudacIA** —iniciativa enfocada en inteligencia artificial y robótica— de centralizar y automatizar el acceso a información dispersa entre múltiples fuentes, facilitando la colaboración, innovación y toma de decisiones para estudiantes, investigadores, empresas y partners externos.

---

## 🎯 Propósito y Alcance

### Propósito Principal
Implementar un asistente virtual inteligente que **automatice y optimice** la resolución de consultas en AudacIA, reduciendo tiempos de respuesta en un **70%** y mejorando la satisfacción del usuario a un **NPS ≥ 8.5**, mediante tecnologías de procesamiento de lenguaje natural e inteligencia artificial con **precisión mínima del 85%** y disponibilidad **24/7**.

### Alcance Definido
- ✅ Desarrollo de MVP funcional en **13 semanas** (1 sep - 30 nov 2025)
- ✅ Presupuesto controlado: **$50,000 USD**
- ✅ Interfaces web y móvil optimizadas
- ✅ Integración con APIs externas prioritarias
- ✅ Autenticación segura con 2FA
- ✅ Encriptación AES-256 de documentos
- ✅ Auditoría completa de operaciones

---

## 🌟 Características Principales

### 🔐 Seguridad Empresarial
- **Autenticación JWT** con tokens de acceso y refresco
- **Verificación de dos factores (2FA)** con códigos TOTP
- **Cifrado AES-256** de documentos en reposo
- **Control de acceso basado en roles (RBAC)** granular
- **Auditoría completa** de todas las operaciones
- **Bloqueo temporal** tras intentos fallidos de acceso

### 📁 Gestión Inteligente de Documentos
- Carga múltiple de archivos (PDF, DOCX, TXT)
- Extracción automática de texto con OCR
- **Clasificación automática** de documentos
- Búsqueda full-text con filtrado avanzado
- Descarga segura con streaming
- Control de permisos por usuario

### 🤖 Motor IA Generativa (ATHENIA)
- **RAG (Retrieval-Augmented Generation)** con Google Gemini
- Búsqueda semántica con embeddings vectoriales
- **Caché dual** (exacto + semántico) para optimización
- **60-90% reducción** de llamadas a API mediante caché inteligente
- Indexación automática en ChromaDB
- Conversaciones con historial completo
- Respuestas contextualizadas y precisas

### 👥 Gestión de Usuarios y Colaboración
- Sistema de roles flexible (Admin, Editor, Usuario)
- Gestión de colaboradores en convocatorias
- Preferencias personalizables por usuario
- Recuperación de contraseña por email
- Alertas de login inusual
- Gestión de sesiones activas en múltiples dispositivos

### 📋 Gestión de Convocatorias
- Creación y edición de procesos de recolección
- Checklist de documentos requeridos
- Documento guía opcional
- Colaboradores con roles diferenciados
- Historial de cambios completo
- Cálculo automático de porcentaje de completitud
- Indicadores de progreso en tiempo real

### 📊 Dashboard y Análisis
- Panel de control intuitivo
- Visualización en tiempo real del estado
- Alertas de plazos próximos
- Estadísticas generales personalizadas
- Gráficos interactivos de actividad

---

## 🛠️ Arquitectura Técnica

### Stack Tecnológico

#### Frontend
- **Angular** (versión moderna con standalone components)
- **TypeScript** para seguridad de tipos
- **Tailwind CSS** + PostCSS para estilos modernos
- **Jasmine + Karma** para testing
- **Cypress** para pruebas E2E

#### Backend
- **FastAPI** 0.100+ (framework web asincrónico)
- **SQLAlchemy** 2.0+ para ORM robusto
- **Python 3.10+** con tipado estricto
- **Uvicorn** como servidor ASGI

#### Inteligencia Artificial
- **Google Gemini API** para generación de respuestas
- **LangChain + FAISS** para búsqueda semántica
- **ChromaDB** como base de datos vectorial
- **Whisper + gTTS** para voz (opcional)

#### Base de Datos y Almacenamiento
- **SQLite** (desarrollo) / **PostgreSQL** (producción)
- **AES-256** para encriptación en reposo
- **JWT (HS256)** para tokens firmados

#### Seguridad y Monitoreo
- **bcrypt + salt** para hash de contraseñas
- **python-jose** para gestión de tokens
- **pyotp** para autenticación 2FA
- **Resend** para envío confiable de emails

---

## 📂 Estructura del Proyecto

```
athenia/
├── 📱 Frontend (Angular)
│   ├── app/
│   │   ├── components/
│   │   │   ├── authentication/       # Sistema de autenticación
│   │   │   ├── convocatorias/        # Módulo de convocatorias
│   │   │   ├── athenia-chat/         # Chat inteligente
│   │   │   ├── dashboard/            # Panel de control
│   │   │   ├── documents/            # Gestión de documentos
│   │   │   └── security/             # Configuración de seguridad
│   │   ├── services/
│   │   │   ├── api/                  # Cliente HTTP
│   │   │   ├── guards/               # Protección de rutas
│   │   │   └── interceptors/         # Interceptor de autenticación
│   │   └── shared/
│   │       ├── components/           # Componentes reutilizables
│   │       ├── i18n/                 # Internacionalización
│   │       └── utils/                # Utilidades generales
│   └── assets/
│
├── 🔧 Backend (FastAPI)
│   ├── api/
│   │   └── v1/
│   │       ├── auth_endpoints/       # Rutas de autenticación
│   │       └── documents_endpoints/  # Rutas de documentos
│   ├── core/
│   │   ├── config.py                 # Configuración centralizada
│   │   └── security.py               # Utilidades de seguridad
│   ├── db/
│   │   ├── database.py               # Configuración SQLAlchemy
│   │   └── crud/                     # Operaciones CRUD
│   ├── models/
│   │   └── models.py                 # 20+ modelos ORM
│   ├── schemas/
│   │   ├── auth_schemas.py
│   │   ├── document_schemas.py
│   │   └── user_schemas.py
│   ├── services/
│   │   ├── auth_service.py           # Lógica de autenticación
│   │   ├── document_service.py       # Gestión de documentos
│   │   ├── email_service.py          # Envío de emails
│   │   └── athenia/
│   │       ├── athenia_service.py    # Orquestación IA
│   │       ├── rag_engine.py         # Motor RAG + Gemini
│   │       ├── cache_manager.py      # Caché exacto
│   │       └── semantic_cache.py     # Caché semántico
│   └── main.py                       # Punto de entrada
│
└── ⚙️ Configuración
    ├── .env                          # Variables de entorno
    ├── requirements.txt              # Dependencias
    ├── pytest.ini                    # Configuración tests
    └── docker-compose.yml            # Orquestación (opcional)
```

---

## 🚀 Instalación Rápida

### Requisitos Previos
- Node.js v18+ y npm v9+
- Python 3.10+ con pip
- Git
- APIs: Google Gemini + Resend

### Instalación del Backend

```bash
# 1. Clonar repositorio
git clone https://github.com/sebas3536/athenia.git
cd athenia

# 2. Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus claves API y configuración

# 5. Inicializar base de datos
python -c "from app.core.init_roles import main; main()"

# 6. Generar clave de encriptación
python -c "from app.services.security_service import generate_encryption_key; generate_encryption_key('enc.key')"

# 7. Iniciar servidor
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Instalación del Frontend

```bash
# 1. Navegar al directorio del frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Configurar ambiente (opcional)
# Editar src/environments/environment.ts con URL de API

# 4. Iniciar servidor de desarrollo
npm start

# Acceder a http://localhost:4200
```

---

## 📊 Objetivos y Métricas Clave

### Objetivos Específicos
| Objetivo | Meta | Fecha Límite |
|----------|------|------------|
| Base de conocimiento consolidada | 100% de datos AudacIA | 7 sep 2025 |
| Modelo NLP entrenado | F1-score ≥ 85% | 19 oct 2025 |
| Interfaces funcionales | Satisfacción ≥ 80% | 26 oct 2025 |
| APIs integradas | ≥ 2 fuentes prioritarias | 26 oct 2025 |
| Pruebas completadas | Informe detallado | 16 nov 2025 |
| Prototipo desplegado | Sistema operativo | 30 nov 2025 |

### Métricas de Éxito
- ⚡ **Tiempo de respuesta**: ≤ 2 segundos por consulta
- 🎯 **Precisión del modelo**: ≥ 85% (F1-score)
- 😊 **Satisfacción del usuario**: NPS ≥ 8.5
- 📈 **Reducción de tiempo**: 70% menos respecto a búsqueda manual
- 🔒 **Uptime**: 99.5% de disponibilidad
- 💾 **Optimización de caché**: 60-90% menos llamadas API

---

## 💻 Uso y Endpoints Principales

### Autenticación
```bash
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'

# Verificar 2FA
curl -X POST "http://localhost:8000/api/v1/auth/verify-2fa" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"code": "123456"}'
```

### Documentos
```bash
# Subir documento
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@documento.pdf"

# Buscar documentos
curl -X GET "http://localhost:8000/api/v1/documents/search?query=ingresos" \
  -H "Authorization: Bearer TOKEN"

# Listar documentos
curl -X GET "http://localhost:8000/api/v1/documents/" \
  -H "Authorization: Bearer TOKEN"
```

### ATHENIA - IA
```bash
# Hacer pregunta a IA
curl -X POST "http://localhost:8000/api/v1/athenia/ask" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cuál es el estado actual del proyecto X?"
  }'

# Sincronizar documentos para IA
curl -X POST "http://localhost:8000/api/v1/athenia/sync" \
  -H "Authorization: Bearer TOKEN"

# Ver historial de conversaciones
curl -X GET "http://localhost:8000/api/v1/athenia/conversations" \
  -H "Authorization: Bearer TOKEN"
```

📚 **Documentación interactiva completa**: http://localhost:8000/docs

---

## 🔒 Seguridad y Cumplimiento

### Mecanismos de Seguridad Implementados

| Aspecto | Implementación | Nivel |
|--------|-----------------|-------|
| **Autenticación** | JWT + 2FA TOTP | Producción |
| **Contraseñas** | bcrypt + salt dinámico | Seguro |
| **Datos en reposo** | AES-256 | Militerior |
| **Datos en tránsito** | HTTPS/TLS | Obligatorio |
| **Tokens** | HMAC-SHA256 firmados | Verificado |
| **Logs de auditoría** | Completo por operación | Trazable |

### Cumplimiento Regulatorio

- ✅ **GDPR**: Derechos ARCO implementados
- ✅ **Ley 1581 (Colombia)**: Protección de datos personales
- ✅ **ISO/IEC 12207**: Ciclo de vida de software
- ✅ **OWASP Top 10**: Protecciones contra vulnerabilidades comunes

---

## 📈 Cronograma del Proyecto

```
Fase 1: Requerimientos (Sep 1-7)
├── Revisión del problema y alcance ✓
├── Identificación de actores y roles ✓
├── Definición de requerimientos funcionales y no funcionales ✓
├── Priorización de funcionalidades (MVP) ✓
└── Validación de stakeholders y fuentes de datos ✓

Fase 2: Diseño (Sep 8 - Sep 28)
├── Arquitectura de software (patrón MVC) ✓
├── Modelado UML (casos de uso, secuencia, actividades, clases) ✓
├── Diseño de interfaz: wireframes y mapa de navegación ✓
├── Diseño de base de datos: modelo entidad-relación y diccionario de datos ✓
└── Diseño inicial del modelo NLP (corpus y tokens) ✓

Fase 3: Desarrollo (Sep 29 - Oct 26)
├── Backend FastAPI ✓
├── Frontend Angular ✓
├── Motor IA/NLP (entrenamiento y evaluación) ✓
├── Integraciones API externas prioritarias ✓
└── Pruebas unitarias por módulo ✓

Fase 4: Pruebas (Oct 27 - Nov 16)
├── Pruebas de usabilidad (accesibilidad, subtítulos, voz)
├── Pruebas de rendimiento (tiempo de respuesta ≤ 2s)
├── Validación de precisión del modelo NLP (≥ 85% F1-score)
└── Informe de pruebas ✓

Fase 5: Despliegue (Nov 17-30)
├── Configuración de base de datos y logs
├── Documentación técnica y manual básico
├── Capacitación de usuarios
└── Entrega final del prototipo escalable 

```

---

## 🎓 Equipo del Proyecto

| Rol | Responsable | Contacto |
|-----|-------------|----------|
| **Desarrollador Principal** | Juan Sebastián de la Ossa | juan.delaossa1@unisimon.edu.co |
| **Tutor en Sitio** | Steffen Jose Cantillo | steffen.cantillo@audacia.ai |
| **Supervisor Académico** | Steffen Jose Cantillo | steffen.cantillo@udea.edu.co |

---

## 📚 Documentación Completa

- 🔧 [Backend - Instalación y Configuración](./docs/backend-setup.md)
- 🎨 [Frontend - Guía de Desarrollo](./docs/frontend-setup.md)
- 🤖 [IA y Machine Learning](./docs/athenia-ml.md)
- 📋 [Especificación de Requisitos](./docs/requirements.md)
- 🏗️ [Arquitectura del Sistema](./docs/architecture.md)
- 🧪 [Guía de Testing](./docs/testing.md)
- 🚀 [Despliegue en Producción](./docs/deployment.md)

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm start                    # Inicia servidor frontend
npm run build               # Compilar para producción

# Linting
npm run lint               # Verificar código
npm run lint:fix           # Arreglar automáticamente

# Backend
uvicorn main:app --reload  # Servidor en desarrollo
pytest                     # Tests unitarios Python
pytest --cov              # Cobertura de tests
```

---

## 📊 Estadísticas del Proyecto

- 🗄️ **Modelos ORM**: 20+
- 🔌 **Endpoints API**: 50+
- 🛠️ **Servicios**: 15+
- 🔄 **Handlers**: 12+
- 📈 **Cobertura de tests**: 80%+
- 💰 **Presupuesto**: $50,000 USD
- ⏱️ **Duración**: 13 semanas (Sep-Nov 2025)

---

## 🤝 Contribuciones y Soporte

### Reportar Bugs
1. Crear issue en GitHub con:
   - Versión de software
   - Stack trace completo
   - Pasos para reproducir
   - Sistema operativo

### Obtener Ayuda
- 📖 [Documentación técnica](./docs)
- 💬 [Foro de discusión](https://github.com/sebas3536/athenia/discussions)
- 📧 Contactar al equipo de desarrollo

### Recursos Útiles
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Angular Documentation](https://angular.io/docs)
- [SQLAlchemy ORM Guide](https://docs.sqlalchemy.org)
- [Google Gemini API](https://ai.google.dev/docs)
- [ChromaDB Docs](https://docs.trychroma.com)

---

## 📝 Licencia

Este proyecto está desarrollado como trabajo de práctica profesional en la **Facultad de Ingenierías, Programa de Ingeniería de Sistemas** de la Universidad Simon Bolivar, Barranquilla, Colombia.

**Derechos Reservados © 2025** - ATHENIA Project

---

## 🎉 Agradecimientos

Construido con tecnologías de clase mundial:
- **FastAPI** - Framework web moderno y rápido
- **Angular** - Framework frontend robusto
- **SQLAlchemy** - ORM poderoso
- **Google Gemini** - IA generativa de última generación
- **ChromaDB** - Base de datos vectorial especializada
- **Resend** - Servicio confiable de email

---

**Última actualización**: Noviembre 2025 | **Versión**: 1.0.0 | **Estado**: 🟡 En Desarrollo

Para más información, visita [AudacIA.ai](https://audacia.ai) o contacta al equipo de desarrollo.

---

<div align="center">

### 🚀 ATHENIA - Transformando la Inteligencia Colectiva

*"Centralizar, automatizar, innovar"*

</div>