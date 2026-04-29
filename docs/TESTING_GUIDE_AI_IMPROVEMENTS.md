# 🧪 Guía de Pruebas - Mejoras del Módulo de IA

Guía completa para probar las 3 mejoras implementadas en el módulo de IA.

---

## Prerrequisitos

✅ Build exitoso (`npm run build`)
✅ Backend ejecutándose (`npm run dev --prefix backend`)
✅ Frontend ejecutándose (`npm run dev --prefix frontend`)
✅ Base de datos conectada (Supabase/PostgreSQL)
✅ API key de Gemini configurada en `.env`

---

## Prueba 1: Soporte Multi-Idioma (MEJORA 4)

### 1.1 Pruebas de Interfaz (Frontend)

**Paso 1: Abrir Chat**
```
Haz clic en el botón flotante 💬 (esquina inferior derecha)
```

**Paso 2: Verificar Selector de Idioma**
```
✓ Deberías ver 3 botones en la cabecera: ES, EN, PT
✓ ES debe estar resaltado por defecto (fondo púrpura)
✓ Los botones deben ser clicables
```

**Paso 3: Probar Mensajes en Diferentes Idiomas**
```
Idioma: ES
Mensaje: "¿Cuáles son mis préstamos activos?"
Resultado esperado: Respuesta en Español

Idioma: EN
Mensaje: "What are my active loans?"
Resultado esperado: Respuesta en Inglés

Idioma: PT
Mensaje: "Quais são meus empréstimos ativos?"
Resultado esperado: Respuesta en Portugués
```

---

## Prueba 2: Búsqueda Semántica (MEJORA 2)

### 2.1 Pruebas de Interfaz

**Paso 1: Clic en el botón "Buscar activo"**
```
✓ Botón visible (color cian, lado izquierdo)
✓ Tiene el icono 🔍
✓ Al hacer clic, abre un diálogo de entrada
```

**Paso 2: Ingresar descripción del problema**
```
Diálogo: "¿Qué problema quieres resolver?"
Entrada: "Necesito una computadora portátil para programar en Python"
Clic en OK
```

**Resultado Esperado**:
- ✓ El botón muestra estado de carga.
- ✓ El bot responde con 3 recomendaciones.
- ✓ Cada recomendación muestra: Nombre, TAG, % de Confianza y Razón del emparejamiento.

---

## Prueba 3: Alertas Automáticas (MEJORA 3)

### 3.1 Pruebas de Interfaz

**Paso 1: Iniciar sesión como Admin**
```
Usa una cuenta con rol: ADMIN_PATRIMONIAL o AUDITOR
```

**Paso 2: Verificar botón "Alertas"**
```
✓ Botón visible (color rojo/rosa, lado derecho)
✓ Tiene el icono 🔔
✓ Solo visible para ADMIN/AUDITOR/LIDER_EQUIPO
✓ Oculto para el rol USUARIO regular
```

**Paso 3: Clic en el botón "Alertas"**
```
Resultado Esperado:
- Se muestra el spinner de carga.
- El chat muestra el mensaje del bot con las alertas generadas.
- Cada alerta muestra: Tipo (Mantenimiento, Vencimiento, etc.), Título, Descripción e Indicador de severidad.
```

**Paso 4: Verificar códigos de color de severidad**
```
Severidad ALTA: Color Rojo/Rosa (🔴)
Severidad MEDIA: Color Amarillo/Ámbar (🟡)
Severidad BAJA: Color Azul/Cian (🟢)
```

---

## Prueba 4: Pruebas de Integración

### 4.1 Flujo de Conversación Completo

**Escenario**: Usuario buscando equipo con búsqueda semántica

```
1. Abrir ChatAssistant
2. Seleccionar idioma: EN
3. Clic en "Buscar activo"
4. Ingresar: "I need a GPU-enabled computer for machine learning"
5. Revisar recomendaciones
6. Preguntar en el chat: "Can I request number 2?"
7. El sistema responde con el proceso de préstamo.
```

**Validación**:
- ✓ Idioma respetado en todo momento.
- ✓ Resultados de búsqueda semántica relevantes.
- ✓ Preguntas de seguimiento respondidas en el idioma correcto.

---

## Lista de Verificación Final

**MEJORA 4: Multi-Idioma**
- [ ] Selector de idioma visible y funcional.
- [ ] ES seleccionado por defecto.
- [ ] Las respuestas del chat cambian de idioma según la selección.

**MEJORA 2: Búsqueda Semántica**
- [ ] Botón visible para todos los usuarios.
- [ ] Devuelve 3 recomendaciones relevantes al problema.
- [ ] Funciona en los 3 idiomas.

**MEJORA 3: Auto-Alertas**
- [ ] Botón visible solo para ADMIN/AUDITOR.
- [ ] Clasificación de severidad por colores funcional.
- [ ] El endpoint está protegido (los usuarios normales no pueden acceder).

---

**Estado**: ✅ LISTO PARA QA
**Versión**: 1.0
