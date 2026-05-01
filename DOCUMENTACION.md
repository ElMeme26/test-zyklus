# 📂 Índice: Zyklus Halo - Especificaciones y Operación

1. [Resumen Ejecutivo: La Transformación Digital de ZF](#1-resumen-ejecutivo-la-transformación-digital-de-zf)
2. [Arquitectura de Software y Seguridad](#2-arquitectura-de-software-y-seguridad)
3. [Zykla AI: El Motor de Inteligencia Proactiva](#3-zykla-ai-el-motor-de-inteligencia-proactiva)
4. [Ecosistema de Datos (11,000 Activos)](#4-ecosistema-de-datos-11000-activos)
5. [Flujo de Negocio y Jerarquía de Roles](#5-flujo-de-negocio-y-jerarquía-de-roles)
6. [Sistema de Escalación y Comunicaciones Críticas](#6-sistema-de-escalación-y-comunicaciones-críticas)
7. [Certificado de Responsabilidad Civil (PDF Export)](#7-certificado-de-responsabilidad-civil-pdf-export)
8. [Anexos de Auditoría y Pruebas QA](#8-anexos-de-auditoría-y-pruebas-qa)
9. [🛠️ Catálogo de Funciones](#9-🛠️-catálogo-de-funciones)

---

## 1. Resumen Ejecutivo: La Transformación Digital de ZF
Zyklus Halo nace para solucionar la ineficiencia operativa generada por las 17 etapas manuales requeridas históricamente para gestionar el préstamo, retorno y seguimiento de activos institucionales. A través de la automatización integral, el sistema reduce la fricción operativa al digitalizar por completo el flujo de trabajo: desde la solicitud inicial y aprobación departamental, hasta la liberación física mediante escaneo QR y recordatorios proactivos. Esto asegura una visibilidad en tiempo real y una reducción dramática en la pérdida de hardware.

## 2. Arquitectura de Software y Seguridad
Zyklus Halo se construyó sobre un enfoque de arquitectura desacoplada (Frontend y Backend separados) que garantiza escalabilidad, fácil mantenimiento y alta seguridad.
* **Frontend:** Desarrollado con React 18, Vite y TailwindCSS, ofreciendo interfaces reactivas, rápidas y adaptables a pantallas móviles y de escritorio.
* **Backend:** Construido en Node.js y Express (TypeScript), maneja la lógica de negocio, integración con APIs externas (Twilio, Google Gemini, Web Push) y control de accesos.
* **Base de Datos:** PostgreSQL (alojado en Supabase), optimizado con índices personalizados para manejar miles de activos simultáneamente.
* **Seguridad:** El sistema implementa los estándares del OWASP Top 10, empleando autenticación por JWT (JSON Web Tokens), encriptación Bcrypt para contraseñas, sanitización de datos contra inyección SQL y un robusto Control de Acceso Basado en Roles (RBAC).

## 3. Zykla AI: El Motor de Inteligencia Proactiva
Zykla es el asistente cognitivo de la plataforma, potenciado por **Google Gemini 2.5 Flash**. Su funcionalidad no se limita a responder preguntas, sino que actúa de forma proactiva:
* **Asistencia y Búsqueda Semántica:** Entiende el contexto del problema del usuario y sugiere qué herramientas utilizar, buscando exclusivamente en el inventario disponible.
* **Análisis Predictivo de Inventario:** Evalúa historiales de préstamo y genera recomendaciones para compras futuras de equipo de alta demanda.
* **Mantenimiento Automatizado y Alertas:** Lee estadísticas del sistema en segundo plano y genera alertas estructuradas clasificando la urgencia sobre activos vencidos o con daños reportados.

## 4. Ecosistema de Datos (11,000 Activos)
La base de datos está diseñada para operar a gran escala, asegurando alta disponibilidad e integridad referencial estricta.
* **Escalabilidad:** Las consultas están optimizadas (mediante índices B-Tree en `status`, `category` y timestamps) para filtrar más de 11,000 activos en milisegundos.
* **Integridad:** Uso intensivo de Foreign Keys y Restricciones (Constraints) entre Tablas de Activos, Usuarios, Solicitudes (Requests) y Registros de Mantenimiento para evitar operaciones huérfanas.
* **Diccionario de Datos Técnico:** Tablas normalizadas con categorización de estados estrictos (`Disponible`, `Prestada`, `En mantenimiento`, `Baja`).

## 5. Flujo de Negocio y Jerarquía de Roles
El sistema garantiza la trazabilidad exigiendo el paso de responsabilidades por 5 niveles de acceso:
1. **User (Usuario):** Explora el catálogo, agrupa combos y solicita préstamos.
2. **Manager (Líder):** Autoriza o rechaza las solicitudes de sus subordinados, evaluando la justificación de uso.
3. **Guard (Guardia de Caseta):** Controla el flujo físico de los bienes usando escáneres QR. Modifica los estados de "Aprobado" a "Activo" (Check-out) y "Activo" a "Disponible" (Check-in).
4. **Auditor:** Perfil de solo lectura con acceso a analíticas completas, descargas de comprobantes PDF y reportes de inventario.
5. **Admin:** Control total, alta de activos, configuración de roles, creación de Bundles y recepción de llamadas críticas de emergencia.

## 6. Sistema de Escalación y Comunicaciones Críticas
Zyklus Halo no espera pasivamente a que los usuarios devuelvan los equipos, sino que emplea una Matriz de Escalación Activa:
* **Notificaciones Push Preventivas:** Alertas al navegador cuando faltan 48h y 24h para el vencimiento de un préstamo.
* **Integración de Voz (Twilio):**
  * **Solicitudes Olvidadas:** Llamada al Manager tras 5 minutos de inactividad de una solicitud.
  * **Mora de 1 Día:** Llamada directa al Usuario exigiendo el equipo.
  * **Mora de 3 Días:** Llamada al Manager advirtiendo sobre el retraso de su subordinado.
  * **Mora de 7 Días:** Escalación crítica; llamada simultánea de emergencia a todos los Administradores reportando la desaparición del activo.

## 7. Certificado de Responsabilidad Civil (PDF Export)
* **Validez:** El sistema vincula la aceptación digital de los términos y condiciones, el identificador único del hardware y la identidad criptográfica del usuario (JWT), para crear un registro inmutable.
* **Uso en la vida real:** Tras una salida física de equipo, el Auditor puede descargar este comprobante en PDF como evidencia física oficial. En caso de daños o pérdidas, el documento vincula legal e internamente al usuario.

## 8. Anexos de Auditoría y Pruebas QA
El sistema ha sido probado exhaustivamente asegurando rendimientos óptimos (cargas del frontend menores a 2 segundos en métricas Lighthouse) e incluye un sistema de cuentas dummy (admin@zf.com, etc.) pre-pobladas para demostraciones y validaciones QA, las cuales cubren los roles de User, Manager, Guard, Auditor y Admin.

---

## 9. 🛠️ Catálogo de Funciones

*Aquí se detallan las operaciones prácticas en la plataforma. Agrega imágenes de la interfaz debajo de cada instrucción para mayor claridad.*

### A. Catálogo Inteligente y "Combos"
* **Característica:** Buscador indexado con filtros por categoría y kits preconfigurados (Bundles).
* **Instrucción:** El usuario selecciona "Combos" en el menú, elige su perfil (ej. IT Dev Kit) y hace clic en "Solicitar". El sistema reserva automáticamente todos los periféricos del kit de una sola vez.
*(Inserta imagen aquí)*

### B. Kiosk Mode (Check-in/Check-out)
* **Característica:** Escáner de visión computarizada para validación de hardware.
* **Instrucción:** El Guardia abre el escáner web desde su tablet/teléfono, enfoca el código QR del usuario aprobado y el sistema registra la salida (OUT). Al regresar, escanea el activo para marcarlo como disponible (IN) o reportar daños.
*(Inserta imagen aquí)*

### C. Escalación por Voz (Twilio Integration)
* **Característica:** Llamadas automáticas a niveles jerárquicos superiores en caso de mora.
* **Instrucción:** El sistema detecta un retraso de 24h en un préstamo; si el usuario no responde a las notificaciones visuales (push), el motor dispara de inmediato una llamada telefónica mediante Twilio al celular del implicado (o su Manager) proporcionando el detalle del activo faltante.
*(Inserta imagen aquí)*

### D. Dashboard de Auditoría
* **Característica:** Visualización de KPIs en tiempo real y exportación de reportes.
* **Instrucción:** El Auditor ingresa al menú "Dashboard", selecciona el rango de fecha y disciplina. Ahí puede visualizar las métricas de disponibilidad y dar clic en "Exportar Reporte" para generar de forma instantánea un archivo de revisiones de inventario.
*(Inserta imagen aquí)*

### E. Zykla Assistant (Chat IA)
* **Característica:** Asistente conversacional multi-idioma con acceso completo a la base de datos de activos.
* **Instrucción:** El usuario abre la ventana emergente de chat en la esquina inferior y pregunta: *"¿Qué equipos tengo vencidos?"* o *"¿Qué me sugieres para grabar audio en exterior?"*. Zykla analiza el contexto del usuario y le devuelve información verídica o gráficas precisas al instante.
*(Inserta imagen aquí)*

### F. Generación de Certificado Responsiva PDF
* **Característica:** Descarga directa de documento legal interno vinculante.
* **Instrucción:** Desde la vista del Auditor (o Admin), en la sección "Audit Trail", al identificar un movimiento de préstamo, se hace clic en el botón "Descargar Comprobante PDF". Esto genera un archivo formal que incluye la firma capturada del usuario.
*(Inserta imagen aquí)*
