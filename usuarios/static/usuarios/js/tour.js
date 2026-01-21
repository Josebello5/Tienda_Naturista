document.addEventListener('DOMContentLoaded', function () {
    window.startTour = function () {
        const path = window.location.pathname;
        let steps = [];

        // Helper function to check visibility
        const isVisible = (selector) => {
            const el = document.querySelector(selector);
            return el && (el.offsetParent !== null || window.getComputedStyle(el).display !== 'none');
        };

        // ---------------------------------------------------------
        // TOUR: PRODUCTOS (MENU Y MODALES)
        // ---------------------------------------------------------
        if (path.includes('/productos/menu/')) {
            // -- MODAL: Gestión de Categorías --
            if (isVisible('#modalCategorias') && document.querySelector('#modalCategorias').style.display !== 'none') {
                steps = [
                    {
                        element: document.querySelector('#modalCategorias .modal-content'),
                        intro: "🏷️ <b>Gestión de Categorías</b>: Aquí puedes administrar las categorías para organizar tus productos.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('#searchCategorias'),
                        intro: "🔍 <b>Buscar</b>: Encuentra una categoría específica rápidamente.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnAgregarCategoria'),
                        intro: "➕ <b>Agregar</b>: Crea una nueva categoría para tus productos.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#tablaCategorias'),
                        intro: "📋 <b>Listado</b>: Ve todas tus categorías registradas aquí.",
                        position: 'top'
                    }
                ];
            } 
            // -- MODAL: Agregar/Editar Categoría --
            else if (isVisible('#modalEditarCategoria') && document.querySelector('#modalEditarCategoria').style.display !== 'none') {
                steps = [
                    {
                        element: document.querySelector('#modalEditarCategoria .modal-content'),
                        intro: "✏️ <b>Editar Categoría</b>: Ingresa o modifica el nombre de la categoría.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('#nombreCategoria'),
                        intro: "📝 <b>Nombre</b>: Escribe el nombre de la categoría (Solo letras).",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnGuardarCategoria'),
                        intro: "💾 <b>Guardar</b>: Guarda los cambios realizados.",
                        position: 'top'
                    }
                ];
            }
            // -- MODAL: Gestión de Patologías --
            else if (isVisible('#modalPatologias') && document.querySelector('#modalPatologias').style.display !== 'none') {
                steps = [
                     {
                        element: document.querySelector('#modalPatologias .modal-content'),
                        intro: "⚕️ <b>Gestión de Patologías</b>: Administra las condiciones de salud asociadas a tus productos.",
                        position: 'left'
                    },
                     {
                        element: document.querySelector('#searchPatologias'),
                        intro: "🔍 <b>Buscar</b>: Filtra las patologías registradas.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnAgregarPatologia'),
                        intro: "➕ <b>Agregar</b>: Registra una nueva patología.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#tablaPatologias'),
                        intro: "📋 <b>Listado</b>: Tabla con todas las patologías del sistema.",
                        position: 'top'
                    }
                ];
            }
            // -- MODAL: Agregar/Editar Patología --
            else if (isVisible('#modalEditarPatologia') && document.querySelector('#modalEditarPatologia').style.display !== 'none') {
                 steps = [
                    {
                        element: document.querySelector('#nombrePatologia'),
                        intro: "📝 <b>Nombre</b>: Escribe el nombre de la patología.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnGuardarPatologia'),
                        intro: "💾 <b>Guardar</b>: Confirma el registro.",
                        position: 'top'
                    }
                ];
            }
            // -- MODAL: Gestión de Ubicaciones --
            else if (isVisible('#modalUbicaciones') && document.querySelector('#modalUbicaciones').style.display !== 'none') {
                 steps = [
                     {
                        element: document.querySelector('#modalUbicaciones .modal-content'),
                        intro: "📍 <b>Ubicaciones</b>: Gestiona los estantes o lugares donde guardas la mercancía.",
                        position: 'left'
                    },
                     {
                        element: document.querySelector('#searchUbicaciones'),
                        intro: "🔍 <b>Buscar</b>: Localiza rápidamente una ubicación física.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnAgregarUbicacion'),
                        intro: "➕ <b>Agregar</b>: Define una nueva ubicación física.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#tablaUbicaciones'),
                        intro: "📋 <b>Listado</b>: Muestra todas las ubicaciones y estantes registrados.",
                        position: 'top'
                    }
                ];
            }
            // -- MODAL: Agregar/Editar Ubicación --
             else if (isVisible('#modalEditarUbicacion') && document.querySelector('#modalEditarUbicacion').style.display !== 'none') {
                 steps = [
                    {
                        element: document.querySelector('#nombreUbicacion'),
                        intro: "📝 <b>Nombre</b>: Escribe la identificación del estante o lugar (Ej: Estante A-1).",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnGuardarUbicacion'),
                        intro: "💾 <b>Guardar</b>: Registra la ubicación.",
                        position: 'top'
                    }
                ];
            }
            // -- MENU PRINCIPAL PRODUCTOS (Default) --
            else {
                steps = [
                    {
                        element: document.querySelector('.welcome-card'),
                        intro: "📦 <b>Módulo de Productos</b>: Aquí gestionas todo tu inventario centralizado.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#searchInput'),
                        intro: "🔍 <b>Búsqueda</b>: Encuentra productos escribiendo su nombre o código serial.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.filtros-container'),
                        intro: "🚦 <b>Filtros</b>: Utiliza estos desplegables para filtrar por ubicación, categoría, patología o estado.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#addBtn'),
                        intro: "➕ <b>Nuevo Producto</b>: Haz clic aquí para registrar un nuevo artículo en el sistema.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('#categoriasBtn'),
                        intro: "🏷️ <b>Gestión</b>: Administra tus categorías, patologías y ubicaciones desde estos botones.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#printBtn'),
                        intro: "🖨️ <b>Reportes</b>: Genera un PDF del inventario actual o filtrado.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('#dataTable thead'),
                        intro: "📋 <b>Tabla</b>: Aquí verás la información clave como Precio, Stock y ubicación.",
                        position: 'top'
                    },
                    {
                        element: document.querySelector('.btn-edit-precio'),
                        intro: "💲 <b>Edición Rápida</b>: Cambia el precio de venta directamente desde aquí sin entrar al formulario completo.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('.btn-cambiar-estado'),
                        intro: "🔄 <b>Estado</b>: Activa o desactiva productos con un solo clic.",
                        position: 'left'
                    }
                ];
            }
        }
        // ---------------------------------------------------------
        // TOUR: REGISTRAR PRODUCTO
        // ---------------------------------------------------------
        else if (path.includes('/productos/registrar') || path.includes('/productos/editar')) {
            steps = [
                {
                    element: document.querySelector('.form-header'),
                    intro: "📝 <b>Formulario de Producto</b>: Completa los datos para registrar un ítem en el inventario.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#serial'),
                    intro: "🔢 <b>Serial</b>: Código único del producto (escaneado o manual).",
                    position: 'right'
                },
                {
                    element: document.querySelector('#nombre_pro'),
                    intro: "📦 <b>Nombre</b>: Título descriptivo del producto.",
                    position: 'right'
                },
                {
                    element: document.querySelector('#categoria_busqueda'),
                    intro: "🏷️ <b>Categoría</b>: Escribe para buscar una categoría existente. Si no existe, debes crearla primero en el menú.",
                    position: 'right'
                },
                {
                    element: document.querySelector('#precio_venta'),
                    intro: "💲 <b>Precio</b>: Valor de venta al público (en Divisas según configuración).",
                    position: 'right'
                },
                {
                    element: document.querySelector('#stock_minimo'),
                    intro: "⚠️ <b>Stock Mínimo</b>: Cantidad donde el sistema te avisará que se está agotando.",
                    position: 'right'
                },
                {
                    element: document.querySelector('.btn-submit'),
                    intro: "💾 <b>Guardar</b>: Finaliza el registro del producto.",
                    position: 'top'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: CLIENTES (MENU)
        // ---------------------------------------------------------
        else if (path.includes('/clientes/menu')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "👥 <b>Módulo de Clientes</b>: Gestiona la base de datos de tus compradores.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#searchInput'),
                    intro: "🔍 <b>Búsqueda</b>: Encuentra clientes rápidamente por nombre o número de cédula.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#filterCedulaTipo'),
                    intro: "📑 <b>Filtro de ID</b>: Filtra clientes según su tipo de documento (V/E/J).",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#addBtn'),
                    intro: "➕ <b>Nuevo Cliente</b>: Registra un nuevo cliente para historial y créditos.",
                    position: 'left'
                },
                {
                    element: document.querySelector('#printBtn'),
                    intro: "🖨️ <b>Listado PDF</b>: Genera un reporte imprimible de tus clientes.",
                    position: 'left'
                },
                {
                    element: document.querySelector('#dataTable thead'),
                    intro: "📋 <b>Listado</b>: Información detallada de contacto y tipo de cliente.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-edit'),
                    intro: "✏️ <b>Editar</b>: Modifica los datos personales de un cliente.",
                    position: 'left'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: REGISTRAR CLIENTE
        // ---------------------------------------------------------
        else if (path.includes('/clientes/registrar') || path.includes('/clientes/editar')) {
             steps = [
                {
                    element: document.querySelector('.form-header'),
                    intro: "👤 <b>Datos del Cliente</b>: Ingresa la información personal y de contacto.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#cedula_numero'),
                    intro: "🆔 <b>Cédula</b>: Identificación única del cliente.",
                    position: 'right'
                },
                {
                    element: document.querySelector('#tipo_cliente'),
                    intro: "⭐ <b>Tipo</b>: Define si es cliente Particular o Mayorista (puede afectar precios/créditos).",
                    position: 'right'
                },
                {
                    element: document.querySelector('#telefono_numero'),
                    intro: "📱 <b>Contacto</b>: Número telefónico principal.",
                    position: 'right'
                },
                {
                    element: document.querySelector('.btn-submit'),
                    intro: "💾 <b>Registrar</b>: Guarda al cliente en la base de datos.",
                    position: 'top'
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
                    intro: "🛒 <b>Historial de Ventas</b>: Visualiza todas las transacciones realizadas.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.resumen-totales'),
                    intro: "📈 <b>Indicadores</b>: Resumen financiero rápido del día.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.btn-primary[href*="registrar"]'),
                    intro: "⚡ <b>Nueva Venta</b>: Acceso directo al Punto de Venta (POS).",
                    position: 'left'
                },
                {
                    element: document.querySelector('#searchInput'),
                    intro: "🔍 <b>Buscador</b>: Rastrea ventas por recibo o cliente.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#monedaSelect'),
                    intro: "💱 <b>Moneda</b>: Alterna entre Bs y USD.",
                    position: 'left'
                },
                {
                    element: document.querySelector('#dataTable'),
                    intro: "🧾 <b>Registro</b>: Tabla de ventas.",
                    position: 'top'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: REGISTRAR VENTA (POS)
        // ---------------------------------------------------------
        else if (path.includes('/ventas/registrar')) {
            // -- SUB-TOUR: REGISTRAR NUEVO CLIENTE (FORMULARIO DESPLEGADO) --
            if (isVisible('#clienteFormContainer') && document.querySelector('#clienteFormContainer').style.display !== 'none') {
                 steps = [
                    {
                        element: document.querySelector('#clienteFormContainer'),
                        intro: "👤 <b>Nuevo Cliente Rápido</b>: Registra al cliente sin salir de la venta.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#formClienteVenta #cedula_numero'),
                        intro: "🆔 <b>Identificación</b>: Cédula del cliente.",
                        position: 'right'
                    },
                    {
                        element: document.querySelector('#formClienteVenta #nombre'),
                        intro: "📝 <b>Datos Personales</b>: Nombre y Apellido.",
                        position: 'right'
                    },
                    {
                        element: document.querySelector('#btnRegistrarCliente'),
                        intro: "✅ <b>Registrar y Usar</b>: Guarda el cliente y lo asigna automáticamente a esta venta.",
                        position: 'top'
                    }
                ];
            } 
            // -- TOUR POS NORMAL --
            else {
                steps = [
                    {
                        element: document.querySelector('.venta-header'),
                        intro: "⚡ <b>Punto de Venta</b>: Proceso de facturación rápido.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#cedulaCliente'),
                        intro: "1️⃣ <b>Cliente</b>: Busca un cliente. Si no existe, aparecerá opción para registrarlo.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#buscarProducto'),
                        intro: "2️⃣ <b>Productos</b>: Escanea o busca items para el carrito.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.radio-group'),
                        intro: "3️⃣ <b>Condición</b>: Contado o Crédito.",
                        position: 'right'
                    },
                    {
                        element: document.querySelector('#btnAgregarMetodo'),
                        intro: "4️⃣ <b>Pago</b>: Registra los métodos de pago.",
                        position: 'top'
                    },
                    {
                        element: document.querySelector('#btnProcesarVenta'),
                        intro: "✅ <b>Finalizar</b>: Genera la factura.",
                        position: 'top'
                    }
                ];
            }
        }
        // ---------------------------------------------------------
        // TOUR: LOTES MENU
        // ---------------------------------------------------------
        else if (path.includes('/lotes/menu')) {
            // -- MODAL: GESTIÓN DE PROVEEDORES --
            if (isVisible('#modalProveedores') && document.querySelector('#modalProveedores').style.display !== 'none') {
                 steps = [
                     {
                        element: document.querySelector('#modalProveedores .modal-content'),
                        intro: "🚚 <b>Gestión de Proveedores</b>: Administra las empresas que te surten mercancía.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('#searchProveedores'),
                        intro: "🔍 <b>Buscar</b>: Filtra la lista de proveedores.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnAgregarProveedor'),
                        intro: "➕ <b>Agregar</b>: Registra un nuevo proveedor.",
                        position: 'bottom'
                    }
                 ];
            }
             // -- MODAL: EDITAR PROVEEDOR --
            else if (isVisible('#modalEditarProveedor') && document.querySelector('#modalEditarProveedor').style.display !== 'none') {
                 steps = [
                     {
                        element: document.querySelector('#nombreProveedor'),
                        intro: "📝 <b>Empresa</b>: Nombre del proveedor.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnGuardarProveedor'),
                        intro: "💾 <b>Guardar</b>: Confirma los datos.",
                        position: 'top'
                    }
                 ];
            }
            // -- DEFAULT LOTES MENU --
            else {
                steps = [
                    {
                        element: document.querySelector('.welcome-card'),
                        intro: "🏗️ <b>Control de Lotes</b>: Gestión de inventario entrante y vencimientos.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnFiltroVencimiento'),
                        intro: "📅 <b>Vencimientos</b>: Alerta rápida de productos por caducar.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#addBtn'),
                        intro: "➕ <b>Entrada</b>: Registra nuevo lote de mercancía.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('#proveedoresBtn'),
                        intro: "🚛 <b>Proveedores</b>: Base de datos de proveedores.",
                        position: 'bottom'
                    }
                ];
            }
        }
        // ---------------------------------------------------------
        // TOUR: REGISTRAR LOTE
        // ---------------------------------------------------------
        else if (path.includes('/lotes/registrar')) {
             // -- MODAL PROVEEDOR (DESDE FORMULARIO) --
            if (isVisible('#modalProveedor') && document.querySelector('#modalProveedor').style.display !== 'none') {
                steps = [
                    {
                        element: document.querySelector('#modalProveedor .modal-content'),
                        intro: "🚚 <b>Nuevo Proveedor</b>: Registra un proveedor al vuelo.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('#nombreProveedor'),
                        intro: "📝 <b>Nombre</b>: Nombre de la empresa o distribuidor.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#btnGuardarProveedor'),
                        intro: "💾 <b>Guardar</b>: Lo guarda y lo selecciona automáticamente.",
                        position: 'top'
                    }
                ];
            } else {
                steps = [
                    {
                        element: document.querySelector('.form-header'),
                        intro: "📦 <b>Entrada de Inventario</b>: Registra los detalles del lote recibido.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#producto'),
                        intro: "🔍 <b>Producto</b>: Busca el producto al que pertenece este lote.",
                        position: 'right'
                    },
                    {
                        element: document.querySelector('#codigo_lote'),
                        intro: "🔢 <b>Código Lote</b>: Identificador único del lote (impreso en empaque).",
                        position: 'right'
                    },
                    {
                        element: document.querySelector('#proveedor'),
                        intro: "🚛 <b>Proveedor</b>: Quién suministró la mercancía. Puedes crear uno nuevo con botón (+).",
                        position: 'right'
                    },
                    {
                        element: document.querySelector('#btnAgregarProveedor'),
                        intro: "➕ <b>Nuevo</b>: Atajo para crear proveedor.",
                        position: 'left'
                    },
                    {
                        element: document.querySelector('#fecha_recibimiento'),
                        intro: "📅 <b>Fecha de Recibimiento</b>: Cuándo llegó la mercancía al almacén.",
                        position: 'right'
                    },
                    {
                        element: document.querySelector('#fecha_vencimiento'),
                        intro: "📅 <b>Vencimiento</b>: Fecha crítica para el control de pérdidas.",
                        position: 'right'
                    }
                ];
            }
        }
        // ---------------------------------------------------------
        // TOUR: CUENTAS PENDIENTES (MENU)
        // ---------------------------------------------------------
        else if (path.includes('/cuentas_pendientes/menu')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "💸 <b>Cuentas por Cobrar</b>: Gestión de créditos.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.resumen-totales'),
                    intro: "📊 <b>Deuda Total</b>: Cuánto dinero hay en la calle.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.panel-deudas-clientes'),
                    intro: "⚠️ <b>Top Deudores</b>: Clientes con mayor mora.",
                    position: 'right'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: CIERRE DE CAJA (MENU)
        // ---------------------------------------------------------
        else if (path.includes('/cierre_caja/menu')) {
             steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "💵 <b>Cierre Diario</b>: Arqueo de caja.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.amount-input'),
                    intro: "💰 <b>Real</b>: Ingresa lo que cuentas físicamente.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.difference-display'),
                    intro: "⚖️ <b>Diferencia</b>: El sistema compara real vs esperado.",
                    position: 'left'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: HISTORIAL DE CIERRES
        // ---------------------------------------------------------
        else if (path.includes('/cierre_caja/historial')) {
            steps = [
                {
                    element: document.querySelector('.welcome-card'),
                    intro: "📜 <b>Historial de Cierres</b>: Consulta todos los arqueos de caja realizados anteriormente.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#filterForm'),
                    intro: "📅 <b>Filtros</b>: Busca cierres por rango de fechas o estado (Faltante/Sobrante/Exacto).",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.table-container'),
                    intro: "📋 <b>Tabla de Registros</b>: Muestra detalladamente los montos del sistema vs. reales.",
                    position: 'top'
                },
                {
                    element: document.querySelector('.btn-ver-detalles') || document.querySelector('.btn-editar'),
                    intro: "👁️ <b>Ver Detalle</b>: Consulta el recibo completo en pantalla.",
                    position: 'left'
                },
                {
                    element: document.querySelector('.btn-edit-precio') || document.querySelector('a[href*="descargar-recibo"]'),
                    intro: "💾 <b>Descargar PDF</b>: Guarda una copia digital del cierre.",
                    position: 'left'
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
                    intro: "📈 <b>Estadísticas</b>: Análisis del negocio.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.stats-grid'),
                    intro: "📊 <b>KPIs</b>: Indicadores principales.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.charts-section'),
                    intro: "📉 <b>Gráficos</b>: Tendencias visuales.",
                    position: 'top'
                }
            ];
        }
        // ---------------------------------------------------------
        // TOUR: CONFIGURACIÓN / USUARIOS
        // ---------------------------------------------------------
        else if (path.includes('/configuracion/')) {
            // -- REGISTRAR USUARIO INTERNO --
            if (path.includes('crear-usuario')) {
                steps = [
                     {
                        element: document.querySelector('.register-header'),
                        intro: "👤 <b>Nuevo Usuario</b>: Crea credenciales para personal.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('#rol'),
                        intro: "🔑 <b>Rol</b>: Define permisos (Admin total, Cajero limitado, etc).",
                        position: 'right'
                    },
                    {
                        element: document.querySelector('#password1'),
                        intro: "🔒 <b>Seguridad</b>: Asigna una contraseña segura.",
                        position: 'right'
                    }
                ];
            } else {
                 steps = [
                    {
                        element: document.querySelector('.welcome-card'),
                        intro: "⚙️ <b>Administración</b>: Usuarios y permisos.",
                        position: 'bottom'
                    },
                    {
                        element: document.querySelector('.btn-primary[href*="crear-usuario"]'),
                        intro: "➕ <b>Nuevo</b>: Agregar personal.",
                        position: 'left'
                    }
                ];
            }
        }
        // ---------------------------------------------------------
        // TOUR: DEFAULT
        // ---------------------------------------------------------
        else {
            steps = [
                {
                    element: document.querySelector('.sidebar'),
                    intro: "👋 ¡Hola! Usa el menú lateral para navegar.",
                    position: 'right'
                },
                {
                    element: document.querySelector('#tour-btn'),
                    intro: "❓ <b>Ayuda</b>: Haz clic aquí en cada sección para ver un tour específico.",
                    position: 'right'
                }
            ];
        }

        // Filtramos pasos cuyos elementos no existen en la página actual o no son visibles
        // Nota: Para los modales, ya filtramos lógicamente arriba, pero esto limpia cualquier residuo
        steps = steps.filter(step => step.element !== null && step.element !== undefined);

        if (steps.length === 0) {
            alert("No hay un tour disponible para esta sección específica o estado visual.");
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
