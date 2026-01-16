document.addEventListener('DOMContentLoaded', function() {
    window.startTour = function() {
        const path = window.location.pathname;
        let steps = [];

        // ---------------------------------------------------------
        // TOUR: PRODUCTOS
        // ---------------------------------------------------------
        if (path.includes('/productos/')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "📦 **Módulo de Productos**: Aquí gestionas todo tu inventario centralizado.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#searchInput'),
                    intro: "🔍 **Búsqueda**: Encuentra productos escribiendo su nombre o código serial.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.filtros-container'),
                    intro: "🚦 **Filtros**: Utiliza estos desplegables para filtrar por ubicación, categoría, patología o estado.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#addBtn'),
                    intro: "➕ **Nuevo Producto**: Haz clic aquí para registrar un nuevo artículo en el sistema.",
                    position: 'left'
                },
                {
                    element: document.querySelector('#categoriasBtn'),
                    intro: "🏷️ **Gestión**: Administra tus categorías, patologías y ubicaciones desde estos botones.",
                    position: 'bottom'
                },
                 {
                    element: document.querySelector('#printBtn'),
                    intro: "🖨️ **Reportes**: Genera un PDF del inventario actual o filtrado.",
                    position: 'left'
                },
                {
                    element: document.querySelector('#dataTable thead'),
                    intro: "📋 **Tabla**: Aquí verás la información clave como Precio, Stock y ubicación.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-edit-precio'),
                    intro: "💲 **Edición Rápida**: Cambia el precio de venta directamente desde aquí sin entrar al formulario completo.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.btn-cambiar-estado'),
                    intro: "y **Estado**: Activa o desactiva productos con un solo clic.",
                    position: 'left'
                }
            ];
        } 
        // ---------------------------------------------------------
        // TOUR: CLIENTES 
        // ---------------------------------------------------------
        else if (path.includes('/clientes/')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "👥 **Módulo de Clientes**: Gestiona la base de datos de tus compradores.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#searchInput'),
                    intro: "🔍 **Búsqueda**: Encuentra clientes rápidamente por nombre o número de cédula.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#filterCedulaTipo'),
                    intro: "📑 **Filtro de ID**: Filtra clientes según su tipo de documento (V/E/J).",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#addBtn'),
                    intro: "➕ **Nuevo Cliente**: Registra un nuevo cliente para historial y créditos.",
                    position: 'left'
                },
                {
                     element: document.querySelector('#printBtn'),
                     intro: "🖨️ **Listado PDF**: Genera un reporte imprimible de tus clientes.",
                     position: 'left'
                 },
                 {
                    element: document.querySelector('#dataTable thead'),
                    intro: "📋 **Listado**: Información detallada de contacto y tipo de cliente.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-edit'),
                    intro: "✏️ **Editar**: Modifica los datos personales de un cliente.",
                    position: 'left'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: VENTAS MENU (HISTORIAL)
        // ---------------------------------------------------------
        else if (path.includes('/ventas/menu')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "🛒 **Historial de Ventas**: Aquí visualizas todas las transacciones realizadas.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.resumen-totales'),
                    intro: "📈 **Indicadores**: Resumen financiero rápido (Total ventas, IVA, Totales en divisas).",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#searchInput'),
                    intro: "🔍 **Buscador**: Rastrea ventas por número de recibo o datos del cliente.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.btn-primary[href*="registrar"]'),
                    intro: "⚡ **Nueva Venta**: Acceso directo al Punto de Venta (POS).",
                    position: 'left'
                },
                {
                    element: document.querySelector('#monedaSelect'),
                    intro: "💱 **Moneda**: Alterna la visualización de montos entre Bolívares y Dólares.",
                    position: 'left'
                },
                {
                    element: document.querySelector('#dataTable'),
                    intro: "🧾 **Registro**: Detalle de cada venta con estado de pago y métodos utilizados.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-ver'),
                    intro: "👁️ **Comprobante**: Visualiza el recibo digital de la venta.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.btn-devolucion'),
                    intro: "↩️ **Anular Venta**: Permite cancelar una venta y revertir los cambios en inventario y caja (Solo Dueño).",
                    position: 'left'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: REGISTRAR VENTA (POS)
        // ---------------------------------------------------------
        else if (path.includes('/ventas/registrar')) {
            steps = [
                {
                    element: document.querySelector('.venta-header'),
                    intro: "⚡ **Punto de Venta**: Proceso de facturación rápido. Sigue el orden de los bloques.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#cedulaCliente'),
                    intro: "1️⃣ **Cliente**: Busca un cliente existente o registra uno nuevo si no aparece.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#buscarProducto'),
                    intro: "2️⃣ **Productos**: Escanea el código o escribe el nombre para agregar items al carrito.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.radio-group'),
                    intro: "3️⃣ **Tipo de Venta**: Elige entre Contado o Crédito (fiado).",
                    position: 'right'
                },
                {
                    element: document.querySelector('#btnAgregarMetodo'),
                    intro: "4️⃣ **Pago**: Agrega uno o varios métodos de pago (Efectivo, Pago Móvil, etc.) hasta cubrir el total.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.resumen'),
                    intro: "📝 **Totales**: Verifica los montos finales en Bs y Divisas antes de procesar.",
                    position: 'left'
                },
                {
                    element: document.querySelector('#btnProcesarVenta'),
                    intro: "✅ **Finalizar**: Una vez completado el pago, procesa la venta para generar el recibo.",
                    position: 'top'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: LOTES (BATCHES)
        // ---------------------------------------------------------
        else if (path.includes('/lotes/')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "🏗️ **Gestión de Lotes**: Aquí controlas las entradas de mercancía, fechas de vencimiento y costos.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#searchInput'),
                    intro: "🔍 **Búsqueda Avanzada**: Filtra por código de lote, nombre de producto o proveedor.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#btnFiltroVencimiento'),
                    intro: "📅 **Alerta de Vencimiento**: Encuentra rápidamente qué lotes están por caducar.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#addBtn'),
                    intro: "➕ **Nuevo Lote**: Registra la entrada de nueva mercancía al inventario.",
                    position: 'left'
                },
                {
                    element: document.querySelector('#proveedoresBtn'),
                    intro: "🚛 **Proveedores**: Administra tu base de datos de proveedores y contactos.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#dataTable thead'),
                    intro: "📋 **Inventario de Lotes**: Visualiza cantidades, costos unitarios y estados de cada lote.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-ver-detalles'),
                    intro: "👁️ **Detalles**: Consulta la información completa del lote, incluyendo costos totales y proveedor.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.btn-edit-costo'),
                    intro: "💲 **Costo Unitario**: Ajusta el costo de adquisición si hubo errores (solo en lotes activos).",
                    position: 'left'
                },
                {
                    element: document.querySelector('.btn-editar-lote'),
                    intro: "✏️ **Editar Lote**: Modifica datos como la fecha de vencimiento o cantidad (si está permitido).",
                    position: 'left'
                },
                {
                    element: document.querySelector('.btn-cambiar-estado'),
                    intro: "🔄 **Cambiar Estado**: Activa o desactiva un lote manualmente para pausar su venta.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.status'),
                    intro: "🚦 **Estado**: El sistema marca automáticamente si un lote está Vencido o Agotado.",
                    position: 'left'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: CUENTAS PENDIENTES (MENU)
        // ---------------------------------------------------------
        else if (path.includes('/cuentas_pendientes/menu')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "💸 **Cuentas por Cobrar**: Gestión centralizada de créditos y deudas de clientes.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.resumen-totales'),
                    intro: "📊 **Resumen Global**: Visualiza el total de dinero pendiente por cobrar en Bs y Divisas.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.panel-deudas-clientes'),
                    intro: "⚠️ **Top Deudores**: Acceso rápido a los 5 clientes con mayor deuda acumulada.",
                    position: 'right'
                },
                {
                    element: document.querySelector('#searchInput'),
                    intro: "🔍 **Búsqueda**: Encuentra clientes con deuda por nombre o cédula.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#estadoPagoSelect'),
                    intro: "📅 **Filtro de Antigüedad**: Identifica deudas críticas (> 30 días) o recientes.",
                    position: 'bottom'
                },
                {
                     element: document.querySelector('#btnGenerarReporte'),
                     intro: "🖨️ **Reporte General**: Genera un PDF de todas las cuentas por cobrar para control administrativo.",
                     position: 'left'
                 },
                 {
                    element: document.querySelector('#dataTable'),
                    intro: "📋 **Listado de Clientes**: Tabla detallada con el saldo pendiente y días de mora de cada cliente.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-abonar'),
                    intro: "💵 **Abonar**: Haz clic aquí para registrar pagos o ver el detalle de ventas de este cliente.",
                    position: 'left'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: GESTIONAR ABONOS (DETALLE CLIENTE)
        // ---------------------------------------------------------
        else if (path.includes('/cuentas_pendientes/gestionar-abono')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "👤 **Gestión Individual**: Aquí administras los pagos específicos de este cliente.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.resumen-totales'),
                    intro: "💰 **Estado de Cuenta**: Resumen de lo que debe este cliente específico.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#dataTable'),
                    intro: "🧾 **Ventas Pendientes**: Selecciona una o varias ventas usando las casillas ☑️ para abonar a ellas.",
                    position: 'top'
                },
                {
                    element: document.querySelector('#btnPagarSeleccionadas'),
                    intro: "✅ **Procesar Pago**: Una vez seleccionadas las ventas, usa este botón para registrar el abono.",
                    position: 'left'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: CIERRE DE CAJA
        // ---------------------------------------------------------
        // ---------------------------------------------------------
        // TOUR: CIERRE DE CAJA
        // ---------------------------------------------------------
        else if (path.includes('/cierre_caja/menu')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "💵 **Cierre Diario**: Proceso de conciliación entre lo que dice el sistema y lo que tienes en caja físicamente.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.date-selector'),
                    intro: "📅 **Fecha**: Selecciona el día que deseas cerrar. Por defecto es la fecha actual.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.cierre-table thead'),
                    intro: "📊 **Tabla de Conciliación**: Compara columna por columna.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.amount-system'),
                    intro: "🖥️ **Sistema**: Muestra cuánto se vendió según el software.",
                    position: 'right'
                },
                {
                    element: document.querySelector('.amount-input'),
                    intro: "💰 **Real (Caja)**: Ingresa aquí cuánto dinero tienes FÍSICAMENTE en tus manos.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.difference-display'),
                    intro: "⚖️ **Diferencia**: El sistema calculará si falta o sobra dinero automáticamente.",
                    position: 'left'
                },
                 {
                    element: document.querySelector('.notes-input'),
                    intro: "📝 **Notas**: Escribe cualquier justificación si hay diferencias de dinero.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-save'),
                    intro: "💾 **Guardar Cierre**: Finaliza el día. Una vez guardado, se genera un recibo inalterable.",
                    position: 'top'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: ESTADÍSTICAS
        // ---------------------------------------------------------
        else if (path.includes('/estadisticas/')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "📈 **Panel de Control**: Visión general del rendimiento de tu negocio.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.stats-grid'),
                    intro: "📊 **Indicadores Clave**: Aquí verás 4 tarjetas con información vital: Top Productos, Top Clientes, Productos Por Vencer y Top Categorías.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.btn-filter-date'),
                    intro: "🗓️ **Filtros**: Cada tarjeta tiene su propio filtro de fechas.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.btn-icon-card[href*="reporte"]'),
                    intro: "🖨️ **Reportes PDF**: Descarga reportes detallados de cada sección individualmente.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.btn-toggle-moneda'),
                    intro: "💱 **Moneda**: Alterna entre Bolívares y Dólares para ver tus ingresos.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.charts-section'),
                    intro: "📉 **Gráficos Interactivos**: Visualización avanzada de tendencias.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.chart-tabs'),
                    intro: "📑 **Pestañas**: Navega entre análisis de Ventas, Productos y Categorías.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.quick-filters'),
                    intro: "⚡ **Filtros Rápidos**: Visualiza Hoy, Semana, Mes o Año con un solo clic.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.btn-print-chart'),
                    intro: "🖼️ **Exportar**: Imprime el gráfico actual tal como lo ves en pantalla.",
                    position: 'left'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: CONFIGURACIÓN
        // ---------------------------------------------------------
        else if (path.includes('/configuracion/')) {
             steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "⚙️ **Panel de Administración**: Gestión de usuarios y roles del sistema.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.filtros-container'),
                    intro: "🔍 **Filtros Avanzados**: Encuentra usuarios por nombre, rol (Dueño, Admin, Cajero) o estado.",
                    position: 'bottom'
                },
                {
                     element: document.querySelector('.btn-primary[href*="crear-usuario"]'),
                     intro: "➕ **Nuevo Usuario**: Crea nuevas cuentas de acceso para tu personal.",
                     position: 'left'
                },
                {
                    element: document.querySelector('#dataTable'),
                    intro: "👥 **Listado de Personal**: Visualiza todos los usuarios registrados, sus roles y estados.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-edit'),
                    intro: "✏️ **Editar**: Modifica datos personales como nombre, email o rol asignado.",
                    position: 'left'
                },
                {
                     element: document.querySelector('.btn-toggle-status'),
                     intro: "🔌 **Activar/Desactivar**: Bloquea o permite el acceso de un usuario al sistema sin eliminarlo.",
                     position: 'left'
                }
            ];
        }
        
        // ---------------------------------------------------------
        // TOUR: DEFAULT (SIDEBAR / DASHBOARD)
        // ---------------------------------------------------------
        else {
            steps = [
                {
                    element: document.querySelector('.sidebar'),
                    intro: "👋 ¡Hola! Bienvenido al sistema. Este es tu menú principal donde encontrarás todas las herramientas.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="dashboard"]'),
                    intro: "📊 **Panel de Control**: Aquí verás un resumen rápido de las ventas del día y estadísticas clave.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="ventas"]'),
                    intro: "🛒 **Ventas**: Punto de venta rápido. Úsalo para registrar las compras de tus clientes.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="productos"]'),
                    intro: "📦 **Productos**: Administra tu inventario, precios y categorías desde aquí.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="clientes"]'),
                    intro: "👥 **Clientes**: Registra a tus clientes fieles para seguimiento y créditos.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="lotes"]'),
                    intro: "🏗️ **Lotes**: Gestiona entradas de mercancía, fechas de vencimiento y proveedores.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="cuentas_pendientes"]'),
                    intro: "💸 **Cuentas por Cobrar**: Control de ventas a crédito, deudas de clientes y registro de abonos.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="cierre_caja"]'),
                    intro: "💰 **Cierre de Caja**: Al final del día, realiza el arqueo y cierre de ventas aquí.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="estadisticas"]'),
                    intro: "📈 **Estadísticas**: Visualiza gráficos y reportes detallados del rendimiento de tu negocio.",
                    position: 'right'
                },
                {
                    element: document.querySelector('a[href*="configuracion"]'),
                    intro: "⚙️ **Configuración**: Administra usuarios, roles y permisos del sistema.",
                    position: 'right'
                },
                {
                    element: document.querySelector('.logout-form'),
                    intro: "🔒 **Salir**: No olvides cerrar sesión cuando termines tu turno.",
                    position: 'right'
                },
                {
                    element: document.querySelector('#tour-btn'),
                    intro: "❓ **Ayuda**: El tour se adapta a la sección donde estés. ¡Pruébalo en Productos, Ventas o Lotes!",
                    position: 'right'
                }
            ];
        }

        // Filtramos pasos cuyos elementos no existen en la página actual (para evitar errores)
        steps = steps.filter(step => step.element !== null && step.element !== undefined);

        if (steps.length === 0) {
            alert("No hay un tour disponible para esta sección aún. Intenta en el Panel Principal o Productos.");
            return;
        }

        introJs().setOptions({
            steps: steps,
            nextLabel: 'Siguiente',
            prevLabel: 'Atrás',
            doneLabel: '¡Entendido!',
            showProgress: true,
            showStepNumbers: true,
            exitOnOverlayClick: false,
            scrollToElement: true
        }).start();
    };
});
