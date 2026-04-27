# Manual Detallado de Funciones por Rol - Zyklus

A continuación se describen todas las capacidades detalladas de la plataforma, categorizadas según el tipo de usuario y separando las funciones automatizadas del sistema inteligente (Zykla).

---

## 👤 Usuario Estándar
Personal general que solicita equipo para sus labores.

* **Catálogo de Activos:** Permite explorar todo el inventario disponible, verificando en tiempo real si una herramienta está libre, prestada o en mantenimiento.
* **Carrito de Préstamos:** Herramienta ágil que permite ir agregando múltiples activos individuales para realizar una solicitud masiva en un solo paso.
* **Combos (Bundles):** Otorga la capacidad de solicitar kits o paquetes prearmados de herramientas (ej. Kit Topográfico) con un solo clic.
* **Préstamos Internos y Externos:** Permite especificar en la solicitud si el equipo será utilizado dentro de la empresa o si requiere salir de las instalaciones.
* **Mis Préstamos y Código QR:** Panel de seguimiento para ver el estado de sus solicitudes (aprobadas/rechazadas) y generar el código QR de recolección.

---

## 👥 Líder / Manager
Responsables de área que supervisan a los usuarios estándar.

* **Bandeja de Entrada:** Interfaz centralizada que enlista todas las solicitudes de préstamo generadas exclusivamente por su personal a cargo.
* **Aprobación de Pedidos Internos/Externos:** Capacidad para autorizar o denegar el uso del equipo, evaluando la justificación del empleado y añadiendo comentarios.
* **Supervisión de Subordinados:** Panel de monitoreo para vigilar en tiempo real qué herramientas tienen sus empleados físicamente en préstamo.

---

## 🛡️ Guardia de Caseta
Personal de seguridad física encargado de la logística de almacén.

* **Escáner de Códigos QR:** Módulo integrado que utiliza la cámara para escanear el QR del usuario y desplegar inmediatamente su solicitud aprobada.
* **Entrega (Check-out):** Función para liberar físicamente activos sueltos, carritos múltiples o combos, pasando su estado de "Aprobado" a "Préstamo Activo".
* **Recepción (Check-in):** Proceso de devolución física que regresa los activos a estado "Disponible" y permite reportar incidencias si el equipo volvió dañado.

---

## 🔎 Auditor
Perfil de solo lectura y análisis para revisar el comportamiento general de la empresa.

* **Dashboard Analítico y KPIs:** Acceso a gráficas en tiempo real sobre préstamos activos, disponibilidad y estatus de mantenimiento del inventario.
* **Monitoreo de Vencimientos:** Panel dedicado exclusivamente a listar, ordenar y contactar a los usuarios que tienen equipos vencidos.
* **Trazabilidad (Audit Log):** Capacidad para buscar, filtrar y revisar cualquier movimiento o aprobación realizada en el sistema sin poder alterar los datos.
* **Exportación de Reportes:** Función para extraer toda la información de activos y préstamos hacia documentos CSV o PDF para análisis externos.

---

## 👑 Administrador Patrimonial
Administrador global responsable de configurar y mantener el sistema.

* **Analíticas del Dashboard:** Gráficas avanzadas que miden el uso global, los equipos más populares por disciplina y los usuarios más frecuentes.
* **Gestión de Inventario:** Módulo para dar de alta nuevas herramientas, editar información, darlas de baja definitiva o enviarlas a mantenimiento preventivo.
* **Creador de Combos:** Herramienta administrativa para diseñar y empaquetar lógicamente múltiples herramientas en un solo "Bundle" prestable.
* **Control de Instituciones y Usuarios:** Administración global para gestionar los roles jerárquicos, correos, y emparejar a los usuarios con sus managers.
* **Trazabilidad (Audit Log):** Registro inmutable de seguridad que graba cada movimiento, aprobación, entrada y salida de todo el personal en la plataforma.

---

## 🤖 Sistema Zykla (IA y Automatización)
Zykla es el asistente inteligente de la plataforma, dotado con Inteligencia Artificial (Gemini) y un sistema de automatización proactiva. Funciona en 3 idiomas (Español, Inglés y Portugués) y ejecuta capacidades específicas por rol:

### Funciones dirigidas al Usuario Estándar
* **Asistente Chatbot Multi-idioma:** Resuelve dudas sobre manuales, estatus de préstamos e interactúa de manera conversacional en ES, EN o PT.
* **Búsqueda Semántica por Problema:** El usuario explica qué problema quiere resolver (ej. "Necesito grabar video 4K") y Zykla recomienda el equipo exacto con un porcentaje de compatibilidad.
* **Alertas Preventivas Push:** Envía notificaciones directamente al navegador del usuario cuando faltan 48 y 24 horas para que caduque su préstamo.
* **Llamadas de Cobranza (1 Día):** Zykla realiza una llamada telefónica robotizada de voz natural al usuario advirtiendo que su préstamo venció el día de ayer.

### Funciones dirigidas al Manager
* **Llamadas por Solicitudes Olvidadas:** Zykla telefonea al manager si tiene solicitudes de empleados esperando revisión en su bandeja por más de 5 minutos.
* **Llamadas de Escalación (3 Días):** El sistema llama automáticamente al manager para exigirle gestionar la devolución si un subordinado suyo tiene un atraso de 3 días.

### Funciones dirigidas al Administrador y Auditor
* **Generación de Alertas Inteligentes:** Analiza la base de datos para detectar cuellos de botella en mantenimiento, anomalías (ej. un usuario pidiendo el mismo equipo 3 veces en un día) y atrasos, clasificándolos por nivel de severidad.
* **Escalación Crítica Automática (7 Días):** Zykla realiza una llamada simultánea de emergencia a todos los administradores si un activo cumple 7 días desaparecido.
* **Reporte Predictivo de IA:** Genera un análisis exhaustivo bajo demanda sobre el historial de préstamos para sugerir tendencias, recambios y futuras compras necesarias.
