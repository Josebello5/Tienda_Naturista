# Documentación Técnica: Sistema de Tour Interactivo

Este documento describe la arquitectura y funcionamiento del sistema de "Tour Guiado" o Ayuda Interactiva implementado en la aplicación de la Tienda Naturista.

## 1. Tecnologías Utilizadas

*   **Librería Core**: [Intro.js](https://introjs.com/) (v7.2.0)
*   **Integración**: JavaScript Vanilla (ES6+)
*   **Estilos**: CSS nativo de Intro.js + Personalizaciones en `mnenu.css`

## 2. Estructura de Archivos

El sistema de tour se compone de tres partes fundamentales distribuidas en la estructura del proyecto Django:

1.  **Lógica Principal (`tour.js`)**:
    *   *Ubicación*: `usuarios/static/usuarios/js/tour.js`
    *   *Función*: Contiene la definición de todos los pasos del tour, la lógica de detección de rutas (URLs) y la inicialización de la librería.

2.  **Integración en Plantilla (`base.html`)**:
    *   *Ubicación*: `usuarios/templates/base.html`
    *   *Función*: Carga los recursos CDN (CSS/JS) de Intro.js y define el botón disparador en el menú lateral.

3.  **Estilos CSS**:
    *   *Ubicación*: `usuarios/static/usuarios/css/menu.css`
    *   *Función*: (Opcional) Personalizaciones visuales para ajustar la apariencia de los cuadros de diálogo del tour.

---

## 3. Funcionamiento Detallado

### A. Carga de Recursos (Base Template)
En el archivo `base.html`, se incluyen las referencias a la librería desde un CDN para asegurar una carga rápida y sin dependencias locales pesadas:

```html
<!-- Intro.js CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.2.0/introjs.min.css">

<!-- Intro.js JS -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/intro.js/7.2.0/intro.min.js"></script>

<!-- Script Lógica Personalizada -->
<script src="{% static 'usuarios/js/tour.js' %}"></script>
```

### B. Inicialización Global
El script `tour.js` define una función global `window.startTour`, haciéndola accesible desde cualquier parte de la aplicación (específicamente desde el botón del menú).

### C. Lógica de Contexto (Ruteo)
El sistema es **sensible al contexto**. Esto significa que los pasos del tour cambian dinámicamente dependiendo de qué página esté viendo el usuario. Esto se logra evaluando `window.location.pathname`:

```javascript
const path = window.location.pathname;
let steps = [];

if (path.includes('/productos/')) {
    // Cargar pasos específicos del módulo de productos
} else if (path.includes('/ventas/registrar')) {
    // Cargar pasos del Punto de Venta (POS)
} 
// ... etc
```

### D. Definición de Pasos
Cada paso es un objeto JSON con tres propiedades clave:
1.  **element**: Selector DOM (id o clase) del elemento a resaltar.
2.  **intro**: El texto explicativo (soporta HTML básico y Emojis).
3.  **position**: Dónde debe aparecer el cuadro de diálogo (top, bottom, left, right).

Ejemplo:
```javascript
{
    element: document.querySelector('#addBtn'),
    intro: "➕ **Nuevo Producto**: Haz clic aquí para registrar un artículo.",
    position: 'left'
}
```

### E. Filtrado de Seguridad
Antes de iniciar el tour, el script ejecuta un filtro de seguridad para evitar errores si un elemento no existe en la página actual (por ejemplo, botones ocultos por permisos de usuario):

```javascript
// Elimina pasos cuyos elementos no se encuentran en el DOM
steps = steps.filter(step => step.element !== null && step.element !== undefined);
```

### F. Ejecución
Finalmente, se invoca a `introJs()` con la configuración deseada y se inicia el tour:

```javascript
introJs().setOptions({
    steps: steps,
    nextLabel: 'Siguiente',
    // ... otras opciones de localización
}).start();
```

---

## 4. Guía para Mantenimiento y Extensión

### ¿Cómo agregar un nuevo tour a una nueva página?
1.  Abra `usuarios/static/usuarios/js/tour.js`.
2.  Identifique el bloque `else if` y agregue una nueva condición verificando la URL de la nueva página.
3.  Defina el array `steps` con los selectores de los elementos que desea explicar.

### ¿Cómo ocultar un paso para ciertos usuarios?
El sistema ya lo hace automáticamente. Si un botón (ej. "Eliminar Usuario") no se renderiza en el HTML porque el usuario no tiene permisos (logica de Django templates), `document.querySelector` devolverá `null`, y el filtro de seguridad (Punto 3.E) eliminará ese paso del tour silenciosamente.

### ¿Cómo cambiar los textos?
Simplemente edite la propiedad `intro` dentro del objeto del paso correspondiente en `tour.js`.
