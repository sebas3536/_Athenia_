# Proyecto Convocatorias

## 📋 Descripción

Plataforma web desarrollada con Angular que facilita la gestión integral de convocatorias y procesos de selección. El sistema permite a usuarios registrados crear, gestionar y participar en convocatorias, con funcionalidades avanzadas de autenticación de dos factores, gestión colaborativa de documentos, y seguimiento detallado del progreso en cada convocatoria.

## 🎯 Características Principales

- **Autenticación Segura**: Sistema completo de autenticación con soporte para verificación de dos factores (2FA), inicio de sesión, registro de usuarios, recuperación de contraseñas y cambio de credenciales.
- **Gestión de Convocatorias**: Crear, editar y visualizar convocatorias con información detallada, plazos y requisitos documentales específicos.
- **Colaboradores**: Sistema de gestión de colaboradores que permite asignar roles y permisos específicos dentro de cada convocatoria.
- **Documentos y Checklist**: Seguimiento de documentos requeridos, validación de cumplimiento y almacenamiento en caché para optimizar rendimiento.
- **Indicadores de Progreso**: Visualización en tiempo real del progreso en cada convocatoria mediante tarjetas interactivas y tablas de historial.
- **Panel de Control**: Dashboard que proporciona una vista general del estado de todas las convocatorias del usuario.
- **Búsqueda Avanzada**: Sistema de búsqueda que permite filtrar y encontrar convocatorias específicas de manera rápida.
- **Historial y Auditoría**: Registro completo de cambios y movimientos realizados en cada convocatoria.
- **Chat Inteligente (Athenia)**: Componente de chat integrado para consultas y soporte.
- **Soporte por Voz**: Funcionalidad de entrada por voz para mejorar la accesibilidad.
- **Seguridad de Roles**: Sistema de permisos basado en roles de usuario (Admin, Editor) con guardias de acceso específicas.

## 🛠️ Tecnologías Utilizadas

- **Frontend Framework**: Angular (versión moderna con standalone components)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS + PostCSS
- **Testing**: Jasmine + Karma, Cypress para E2E
- **Linting**: ESLint
- **Control de Versiones**: Git
- **Formato de Código**: EditorConfig
- **Internacionalización (i18n)**: JSON basado en archivos de idioma

## 📁 Estructura del Proyecto

```
project/
├── src/
│   ├── main.ts                          # Punto de entrada principal
│   ├── index.html                       # Archivo HTML base
│   ├── styles.css                       # Estilos globales
│   │
│   ├── app/
│   │   ├── app.ts                       # Componente raíz
│   │   ├── app.config.ts                # Configuración de la aplicación
│   │   ├── app.routes.ts                # Definición de rutas
│   │   ├── app.html                     # Template raíz
│   │   ├── app.css                      # Estilos de la app
│   │   ├── NotFoundComponent.ts         # Componente 404
│   │   │
│   │   ├── components/
│   │   │   ├── authentication/          # Módulo de autenticación
│   │   │   │   ├── auth/                # Lógica central de autenticación
│   │   │   │   ├── login/               # Formulario de inicio de sesión
│   │   │   │   ├── register/            # Registro de nuevos usuarios
│   │   │   │   ├── forgot-password/     # Recuperación de contraseña
│   │   │   │   ├── reset-password/      # Reseteo de contraseña
│   │   │   │   ├── check-email/         # Verificación de email
│   │   │   │   ├── password-changed/    # Confirmación cambio contraseña
│   │   │   │   └── two-verification/    # Verificación de dos factores
│   │   │   │
│   │   │   ├── convocatorias/           # Módulo principal de convocatorias
│   │   │   │   ├── pages/
│   │   │   │   │   ├── convocatorias-list/      # Listado de convocatorias
│   │   │   │   │   └── convocatoria-detail/     # Detalle de convocatoria
│   │   │   │   │
│   │   │   │   ├── components/
│   │   │   │   │   ├── convocatoria-card/       # Tarjeta de convocatoria
│   │   │   │   │   ├── progress-card/           # Indicador de progreso
│   │   │   │   │   ├── collaborators-section/   # Gestión de colaboradores
│   │   │   │   │   ├── documents-checklist/     # Checklist de documentos
│   │   │   │   │   ├── document-item/           # Elemento de documento
│   │   │   │   │   ├── deadline-indicator/      # Indicador de plazo
│   │   │   │   │   ├── history-table/           # Tabla de historial
│   │   │   │   │   │
│   │   │   │   │
│   │   │   │   ├── dialogs/
│   │   │   │   │   ├── create-convocatoria-dialog/      # Crear convocatoria
│   │   │   │   │   ├── add-collaborator-dialog/         # Agregar colaborador
│   │   │   │   │   ├── add-document-dialog/             # Agregar documento
│   │   │   │   │   └── edit-dates-dialog/               # Editar fechas
│   │   │   │   │
│   │   │   │   ├── services/
│   │   │   │   │   ├── convocatorias.service.ts         # CRUD convocatorias
│   │   │   │   │   ├── collaborators.service.ts         # Gestión colaboradores
│   │   │   │   │   ├── documents.service.ts             # Gestión documentos
│   │   │   │   │   ├── document-cache.service.ts        # Caché de documentos
│   │   │   │   │   ├── deadline.service.ts              # Lógica de plazos
│   │   │   │   │   ├── guides.service.ts                # Guías de convocatorias
│   │   │   │   │   ├── convocatorias-access.service.ts  # Control de acceso
│   │   │   │   │   └── convocatorias-permissions.service.ts # Permisos
│   │   │   │   │
│   │   │   │   └── utils/
│   │   │   │       ├── date.utils.ts                     # Utilidades de fechas
│   │   │   │       ├── progress.utils.ts                 # Cálculo de progreso
│   │   │   │       └── role.utils.ts                     # Utilidades de roles
│   │   │   │
│   │   │   ├── athenia-chat/            # Componente de chat inteligente
│   │   │   ├── athenia-voice/           # Componente de entrada por voz
│   │   │   ├── dashboard/               # Panel de control
│   │   │   ├── landing-page/            # Página de inicio
│   │   │   ├── navbar/                  # Barra de navegación
│   │   │   ├── search/                  # Búsqueda avanzada
│   │   │   ├── history/                 # Historial completo
│   │   │   ├── document/                # Visualizador de documentos
│   │   │   ├── security/                # Configuración de seguridad
│   │   │   ├── settings/                # Configuración de usuario
│   │   │   └── users/                   # Gestión de usuarios (admin)
│   │   │
│   │   ├── domain/
│   │   │   └── models/
│   │   │       ├── convocatorias.model.ts          # Modelo de convocatoria
│   │   │       ├── user.model.ts                   # Modelo de usuario
│   │   │       ├── document.model.ts               # Modelo de documento
│   │   │       ├── user-preferences.model.ts       # Preferencias de usuario
│   │   │       ├── password-reset.model.ts         # Modelo reset contraseña
│   │   │       └── search-result.model.ts          # Modelo resultados búsqueda
│   │   │
│   │   ├── services/
│   │   │   ├── api/
│   │   │   │   ├── api.ts                          # Servicio API base
│   │   │   │   ├── athenia.service.ts              # Integraciones Athenia
│   │   │   │   ├── user-service.ts                 # Gestión de usuarios
│   │   │   │   ├── auth-header.service.ts          # Headers de autenticación
│   │   │   │   ├── password-reset.service.ts       # Reset de contraseña
│   │   │   │   └── user-preferences.service.ts     # Preferencias usuario
│   │   │   │
│   │   │   ├── guards/
│   │   │   │   ├── auth-guard.ts                   # Protección rutas autenticadas
│   │   │   │   ├── admin-guard.ts                  # Protección rutas admin
│   │   │   │   ├── twoFactorGuard.ts               # Validación 2FA
│   │   │   │   └── convocatorias-access.guard.ts   # Acceso a convocatorias
│   │   │   │
│   │   │   └── interceptors/
│   │   │       └── auth.interceptor.ts             # Interceptor autenticación
│   │   │
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── accordion/                      # Componente acordeón
│   │   │   │   ├── alert/                          # Sistema de alertas
│   │   │   │   ├── profile-avatar/                 # Avatar de perfil
│   │   │   │   └── switch/                         # Toggle switch
│   │   │   │
│   │   │   ├── i18n/
│   │   │   │   ├── es.json                         # Traducciones español
│   │   │   │   └── en.json                         # Traducciones inglés
│   │   │   │
│   │   │   ├── pipes/                              # Pipes personalizados
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── cn.ts                           # Merge classes utility
│   │   │       ├── format-bytes.ts                 # Formateador de bytes
│   │   │       ├── merge-classes.ts                # Merge clases CSS
│   │   │       └── number.ts                       # Utilidades numéricas
│   │   │
│   │   ├── icon/
│   │   │   └── icons.ts                            # Sistema de iconos
│   │   │
│   │   └── assets/
│   │       └── videos/
│   │           └── 012.mp4                         # Videos multimedia
│   │
│   └── environments/
│       ├── environment.ts                          # Configuración producción
│       └── environment.development.ts              # Configuración desarrollo
│
├── Configuration Files
│   ├── angular.json                    # Configuración Angular
│   ├── tsconfig.json                   # Configuración TypeScript
│   ├── tsconfig.app.json               # TS config app
│   ├── tsconfig.spec.json              # TS config tests
│   ├── tailwind.config.js              # Configuración Tailwind
│   ├── tailwind.config.js              # PostCSS config
│   ├── eslint.config.js                # Reglas ESLint
│   ├── cypress.config.ts               # Configuración tests E2E
│   ├── .editorconfig                   # Configuración editor
│   ├── .gitignore                      # Archivos ignorados Git
│   ├── components.json                 # Metadatos componentes
│   ├── package.json                    # Dependencias y scripts
│   └── package-lock.json               # Lock file dependencias
```

## 🚀 Instalación

### Requisitos Previos

- Node.js v18 o superior
- npm v9 o superior
- Git

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd <nombre-del-proyecto>

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Editar src/environments/environment.ts con la URL de API correcta

# 4. Iniciar servidor de desarrollo
npm start

# 5. Acceder a la aplicación
# Abirir navegador en http://localhost:4200
```

## 📦 Dependencias Principales

- `@angular/core`: Framework principal
- `@angular/common`: Módulos comunes
- `@angular/forms`: Manejo de formularios reactivos
- `@angular/router`: Enrutamiento
- `tailwindcss`: Framework CSS
- `typescript`: Lenguaje de programación
- `rxjs`: Programación reactiva

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm start                    # Inicia servidor desarrollo en localhost:4200
npm run build               # Build para producción
npm run build:prod          # Build optimizado para producción

# Testing
npm test                    # Ejecuta tests unitarios
npm run test:watch         # Tests en modo watch
npm run e2e                # Ejecuta tests end-to-end con Cypress

# Linting
npm run lint               # Verifica código con ESLint
npm run lint:fix           # Arregla automáticamente errores ESLint

# Otros
npm run serve:ssr         # Servidor con SSR (si aplica)
```

## 🔐 Seguridad

### Autenticación

- Sistema de autenticación JWT con tokens de acceso y refresco
- Verificación de dos factores (2FA) opcional pero recomendada
- Rutas protegidas mediante guardias de acceso (AuthGuard, AdminGuard, TwoFactorGuard)
- Headers de seguridad automáticos en cada solicitud HTTP

### Permisos y Control de Acceso

El sistema implementa un modelo de permisos basado en roles:

- **Admin**: Acceso total a todas las convocatorias y usuarios
- **Editor**: Puede crear, editar y gestionar convocatorias propias


### Interceptores

- Interceptor de autenticación que añade automáticamente el token JWT en cada solicitud
- Manejo automático de tokens expirados con refresco transparente


## 🔄 Gestión de Estado

El proyecto utiliza:

- **RxJS**: Para programación reactiva y manejo de observables
- **Angular Services**: Para gestión centralizada de estado
- **OnPush Change Detection**: Para optimizar rendimiento

## 📡 Integración con API

### Configuración de Base URL

Editar los archivos de entorno:

- `src/environments/environment.ts` (Producción)
- `src/environments/environment.development.ts` (Desarrollo)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

### Servicios API

Los servicios se encuentran en `src/app/services/api/`:

- `api.ts`: Cliente HTTP base
- `user-service.ts`: Gestión de usuarios
- `athenia.service.ts`: Integraciones externas
- `password-reset.service.ts`: Reset de contraseñas
- `user-preferences.service.ts`: Preferencias

## 📋 Características Detalladas

### Gestión de Convocatorias

- Crear nuevas convocatorias con descripción, plazos y requisitos
- Editar información de convocatorias existentes
- Visualizar detalles completos de cada convocatoria
- Eliminar convocatorias (solo administradores)
- Filtrar por estado, fecha de cierre y otros criterios

### Gestión de Colaboradores

- Agregar colaboradores a convocatorias específicas
- Asignar roles y permisos personalizados
- Remover colaboradores
- Visualizar historial de colaboraciones

### Gestión de Documentos

- Subir y descargar documentos requeridos
- Marcar documentos como completados
- Validar cumplimiento de requisitos
- Historial de cambios de documentos
- Caché optimizado para rendimiento

### Panel de Control (Dashboard)

- Vista general de todas las convocatorias del usuario
- Indicadores de progreso en tiempo real
- Alertas de plazos próximos
- Estadísticas generales


## 🐛 Solución de Problemas

### Problema: Error de autenticación al iniciar

**Solución**: Verificar que el token JWT sea válido y que la URL de API sea correcta en `environment.ts`.

### Problema: Estilos Tailwind no aplican

**Solución**: Ejecutar `npm run build:css` o reconstruir la aplicación.

### Problema: Tests fallan

**Solución**: Ejecutar `npm install` nuevamente y limpiar cache con `npm run clean`.

## 📞 Soporte y Contribuciones

- Para reportar bugs, abrir issue en el repositorio
- Para contribuciones, crear pull request con descripción clara
- Seguir guía de estilo del proyecto (ESLint)



**Última actualización**: Noviembre 2025
**Versión**: 1.0.0