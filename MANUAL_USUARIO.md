# Manual de Usuario - Sistema Tienda Naturista

Bienvenido al manual oficial del sistema de gestión para la Tienda Naturista. Este documento detalla todas las funcionalidades, roles de usuario y flujos de trabajo disponibles en la aplicación.

---

## 1. Roles y Permisos

El sistema cuenta con tres niveles de acceso, diseñados para garantizar la seguridad y el control de las operaciones.

### 👑 Dueño (Superusuario)
*   **Acceso Total**: Tiene control absoluto sobre todos los módulos del sistema.
*   **Exclusividad**: Único rol que puede acceder al módulo de **Configuración** (crear usuarios, editar roles).
*   **Gestión de Caja**: Puede anular ventas (requiere confirmación) y ver todos los cierres.
*   **Módulos visibles**: Panel, Clientes, Productos, Lotes, Ventas, Cuentas Pendientes, Cierre de Caja, Estadísticas, Configuración.

![📸 Captura sugerida: Vista de la tabla de usuarios con los roles (color rojo/azul) visibles](ruta/a/imagen_roles.png)

### 🛡️ Administrador
*   **Gestión Operativa**: Diseñado para encargados de tienda.
*   **Inventario Avanzado**: Puede gestionar **Lotes** (entradas de mercancía, proveedores, vencimientos).
*   **Análisis**: Acceso al módulo de **Estadísticas** y reportes gerenciales.
*   **Restricciones**: No puede acceder a Configuración ni gestionar otros usuarios.
*   **Módulos visibles**: Panel, Clientes, Productos, Lotes, Ventas, Cuentas Pendientes, Cierre de Caja, Estadísticas.

### 💼 Cajero
*   **Enfoque en Ventas**: Rol limitado para el procesamiento diario de operaciones.
*   **Funciones Principales**: Registrar ventas, gestionar clientes y realizar cierre de caja.
*   **Restricciones**:
    *   **SIN Acceso** a: Lotes (Inventario avanzado), Estadísticas, Configuración.
    *   No puede anular ventas sin autorización (si aplica).
*   **Módulos visibles**: Panel, Clientes, Productos, Ventas, Cuentas Pendientes, Cierre de Caja.

---

## 2. Descripción de Módulos

### 📊 Panel de Control (Dashboard)
*   **Acceso**: Todos los roles.
*   **Función**: Vista rápida del estado actual del negocio.
*   **Contenido**:
    *   **Tarjetas de Resumen**: Ventas del día (Bs y $), Ganancias estimadas.
    *   **Gráficos Rápidos**: Tendencia de ventas semanal.
    *   **Alertas**: Productos bajos en stock o por vencer pronto.

![📸 Captura sugerida: Pantalla principal del Dashboard mostrando tarjetas de resumen y gráfico semanal](ruta/a/imagen_dashboard.png)

### 👥 Clientes
*   **Acceso**: Todos los roles.
*   **Funcionalidades**:
    *   **Registro**: Agregar nuevos clientes con datos personales (Cédula, Nombre, Teléfono).
    *   **Búsqueda**: Filtrar por cédula o nombre.
    *   **Edición**: Modificar datos de contacto.
    *   **Historial**: Ver compras previas y deudas asociadas.

![📸 Captura sugerida: Formulario de registro de cliente nuevo o tabla de búsqueda](ruta/a/imagen_clientes.png)

### 📦 Productos
*   **Acceso**: Todos los roles.
*   **Funcionalidades**:
    *   **Inventario General**: Listado de todos los productos registrados.
    *   **Gestión**: Crear, editar y cambiar estado (Activo/Inactivo) de productos.
    *   **Precios**: Actualización rápida de precios en Bs y Divisas.
    *   **Búsqueda**: Por código de barras o nombre.

![📸 Captura sugerida: Tabla de productos con el botón de Edición resaltado](ruta/a/imagen_productos.png)

### 🏗️ Lotes (Inventario Avanzado)
*   **Acceso**: 👑 Dueño y 🛡️ Administrador.
*   **Restricción**: 🚫 No visible para Cajeros.
*   **Funcionalidades**:
    *   **Entradas**: Registrar nuevas compras a proveedores.
    *   **Vencimientos**: Control estricto de fechas de caducidad.
    *   **Proveedores**: Gestión de la base de datos de proveedores.
    *   **Costos**: Edición de costos de adquisición para cálculo de ganancias.

![📸 Captura sugerida: Visualización de un Lote con fecha de vencimiento marcada](ruta/a/imagen_lotes.png)

### 🛒 Ventas
*   **Acceso**: Todos los roles.
*   **Módulos**:
    1.  **Menú de Ventas (Historial)**:
        *   Ver listado de todas las facturas emitidas.
        *   Reimprimir recibos/comprobantes.
        *   **Anular Venta**: Revertir una operación (Devuelve stock y dinero). *Nota: Puede requerir permisos superiores.*
    
    ![📸 Captura sugerida: Historial de ventas mostrando el botón de Anular e Imprimir](ruta/a/imagen_historial_ventas.png)

    2.  **Registrar Venta (POS)**:
        *   Interfaz rápida para cobro.
        *   **Carrito**: Escaneo de productos o búsqueda manual.
        *   **Cliente**: Asignación de venta a cliente registrado o genérico.
        *   **Pagos**: Soporte para múltiples métodos (Efectivo Bs/$, Punto, Pago Móvil, Crédito).
        *   **⚠️ Solución de Problemas: Producto No Aparece**
            Si tienes unidades físicas pero el producto no sale en la búsqueda, verifica estas 3 condiciones obligatorias:
            1.  **Estado del Producto**: Debe estar marcado como **"Activo"** en el módulo de Productos.
            2.  **Lotes Disponibles**: Debe tener al menos un lote con `Cantidad > 0` y estado **"Activo"**. (Revisa en *Lotes*).
            3.  **Protección de Precio (Importante)**: El sistema **oculta automáticamente** los productos si el *Costo de Compra* del lote es MAYOR al *Precio de Venta* actual.
                *   *¿Qué hacer?*: Ve al módulo de **Productos**, actualiza el precio de venta para que cubra el costo nuevo y genere ganancia. Inmediatamente aparecerá disponible.

    ![📸 Captura sugerida: Pantalla de POS con productos en carritos y modal de pago abierto](ruta/a/imagen_pos.png)

### 💸 Cuentas Pendientes (Créditos)
*   **Acceso**: Todos los roles.
*   **Funcionalidades**:
    *   **Monitoreo**: Ver quién debe dinero y cuánto tiempo lleva la deuda.
    *   **Abonos**: Registrar pagos parciales o totales a una deuda.
    *   **Estado de Cuenta**: Generar reporte detallado por cliente.
    *   **Historial**: Ver récord de pagos anteriores.

![📸 Captura sugerida: Tabla de deudores con los indicadores de antigüedad](ruta/a/imagen_cuentas.png)

### 💰 Cierre de Caja
*   **Acceso**: Todos los roles.
*   **Funcionalidades**:
    *   **Arqueo Diario**: Comparar lo que dice el sistema (Ventas registradas) vs. el dinero físico en caja.
    *   **Registro**: Ingresar montos reales contados.
    *   **Diferencias**: El sistema calcula automáticamente si sobra o falta dinero.
    *   **Historial**: Consultar cierres de días anteriores.

![📸 Captura sugerida: Pantalla de Cierre de Caja comparando columna Sistema vs Real](ruta/a/imagen_cierre.png)

### 📈 Estadísticas
*   **Acceso**: 👑 Dueño y 🛡️ Administrador.
*   **Restricción**: 🚫 No visible para Cajeros.
*   **Funcionalidades**:
    *   **Reportes Gerenciales**: Top productos vendidos, Mejores clientes, Categorías más rentables.
    *   **Gráficos Interactivos**: Visualización de ventas en el tiempo (Semanal, Mensual, Anual).
    *   **Exportación**: Generar PDFs de todos los reportes.
    *   **Análisis**: Filtros por rango de fechas personalizado.

![📸 Captura sugerida: Gráfico de Ventas mensual](ruta/a/imagen_estadisticas.png)

### ⚙️ Configuración
*   **Acceso**: 👑 Exclusivo Dueño.
*   **Restricción**: 🚫 No visible para Administradores ni Cajeros.
*   **Funcionalidades**:
    *   **Gestión de Usuarios**: Crear nuevas cuentas para empleados.
    *   **Roles**: Asignar permisos (Admin, Cajero) a los usuarios.
    *   **Estado**: Activar o desactivar el acceso al sistema de un empleado (sin borrar sus registros).
    *   **Datos del Negocio**: (Si aplica) Configurar nombre de la tienda, tasa de cambio base, etc.

![📸 Captura sugerida: Lista de usuarios en configuración](ruta/a/imagen_config.png)


---

## 3. Ayuda Interactiva

El sistema cuenta con un botón de **"Ayuda / Tour"** en la barra lateral izquierda. Al presionarlo, se activará una guía paso a paso interactiva que le explicará las funciones específicas de la pantalla en la que se encuentre.
*   *Recomendación*: Úselo cada vez que entre a un módulo nuevo o tenga dudas sobre un botón.

---
*Generado automáticamente por el Asistente de Desarrollo - Tienda Naturista*
