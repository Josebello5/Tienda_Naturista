// editar_lote.js - Versión corregida con todas las validaciones en tiempo real
document.addEventListener('DOMContentLoaded', function () {
    console.log('=== INICIANDO SCRIPT EDITAR LOTE CON VALIDACIONES EN TIEMPO REAL ===');
    
    // Referencias a elementos del DOM
    const form = document.getElementById('loteForm');
    const productoInput = document.getElementById('producto');
    const idProductoInput = document.getElementById('id_producto');
    const sugerenciasProductoContainer = document.getElementById('sugerencias-producto');
    const cantidadInput = document.getElementById('cantidad');
    const costoUnitarioInput = document.getElementById('costo_unitario');
    const proveedorInput = document.getElementById('proveedor');
    const idProveedorInput = document.getElementById('id_proveedor');
    const sugerenciasProveedorContainer = document.getElementById('sugerencias-proveedor');
    
    // Elementos del modal de proveedor
    const modalProveedor = document.getElementById('modalProveedor');
    const btnAgregarProveedor = document.getElementById('btnAgregarProveedor');
    const btnCerrarModalProveedor = document.getElementById('btnCerrarModalProveedor');
    const btnCancelarProveedor = document.getElementById('btnCancelarProveedor');
    const btnGuardarProveedor = document.getElementById('btnGuardarProveedor');
    const nombreProveedorInput = document.getElementById('nombreProveedor');
    const contactoProveedorInput = document.getElementById('contactoProveedor');
    const errorNombreProveedor = document.getElementById('error-nombreProveedor');

    // Elementos de mensajes de error
    const errorProducto = document.getElementById('error-id_producto');
    const errorCantidad = document.getElementById('error-cantidad');
    const errorCosto = document.getElementById('error-costo');
    const errorProveedor = document.getElementById('error-proveedor');

    // ===== FUNCIONES DE MANEJO DE ESTADOS =====
    
    function setInvalid(input, errorDiv, message) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    function setValid(input, errorDiv) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }

    function mostrarErrorGeneral(mensaje) {
        const errorExistente = document.getElementById('error-general');
        if (errorExistente) {
            errorExistente.remove();
        }
        
        const errorContainer = document.createElement('div');
        errorContainer.id = 'error-general';
        errorContainer.className = 'alert alert-error';
        errorContainer.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div>
                <strong>Error en el formulario</strong>
                <div style="margin-top: 5px; font-size: 0.9em;">${mensaje}</div>
            </div>
        `;
        
        const formBody = document.querySelector('.form-body');
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            formBody.insertBefore(errorContainer, messagesContainer.nextSibling);
        } else {
            const firstChild = formBody.firstChild;
            formBody.insertBefore(errorContainer, firstChild);
        }
        
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ===== VALIDACIONES EN TIEMPO REAL =====

    // Validación en tiempo real para nombre de proveedor (en el modal)
    function validarNombreProveedorTiempoReal() {
        const valor = nombreProveedorInput.value.trim();
        if (valor === '') {
            setInvalid(nombreProveedorInput, errorNombreProveedor, "El nombre del proveedor es obligatorio.");
            return false;
        }
        
        if (!/^[A-Z0-9.]+$/.test(valor)) {
            setInvalid(nombreProveedorInput, errorNombreProveedor, "Solo se permiten letras, números y puntos.");
            return false;
        }
        
        if (valor.length > 20) {
            setInvalid(nombreProveedorInput, errorNombreProveedor, "Máximo 20 caracteres.");
            return false;
        }
        
        setValid(nombreProveedorInput, errorNombreProveedor);
        return true;
    }

    // Validación en tiempo real para contacto de proveedor (en el modal) - CORREGIDA
    function validarContactoProveedorTiempoReal() {
        const valor = contactoProveedorInput.value.trim();
        
        // Campo opcional, si está vacío es válido
        if (valor === '') {
            setValid(contactoProveedorInput, errorContactoProveedor);
            return true;
        }
        
        // SOLO validar longitud máxima de 25 caracteres
        if (valor.length > 25) {
            setInvalid(contactoProveedorInput, errorContactoProveedor, "Máximo 25 caracteres.");
            return false;
        }
        
        setValid(contactoProveedorInput, errorContactoProveedor);
        return true;
    }

    // ===== BÚSQUEDA DE PRODUCTOS CON SUGERENCIAS - CORREGIDA =====
    
    function mostrarSugerenciasProductos(query) {
        if (!sugerenciasProductoContainer) return;

        sugerenciasProductoContainer.innerHTML = '';

        if (!query.trim()) {
            sugerenciasProductoContainer.style.display = 'none';
            return;
        }

        const productosData = window.productosData || [];
        const sugerencias = productosData.filter(producto =>
            producto.nombre.toLowerCase().includes(query.toLowerCase()) ||
            (producto.serial && producto.serial.toLowerCase().includes(query.toLowerCase()))
        );

        if (sugerencias.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'sugerencia-item no-results';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <div>
                    <strong>No se encontraron productos</strong>
                    <small>Intenta con otros términos de búsqueda</small>
                </div>
            `;
            sugerenciasProductoContainer.appendChild(noResults);
        } else {
            sugerencias.forEach(producto => {
                const sugerencia = document.createElement('div');
                sugerencia.className = 'sugerencia-item';
                sugerencia.innerHTML = `
                    <div>
                        <strong>${producto.nombre}</strong>
                        <small style="display: block; color: var(--natural-gray); font-size: 0.8em;">
                            ${producto.categoria} | Serial: ${producto.serial || 'N/A'}
                        </small>
                    </div>
                `;
                sugerencia.setAttribute('data-producto-id', producto.id);
                sugerencia.setAttribute('data-producto-nombre', producto.nombre);
                
                sugerencia.addEventListener('click', function() {
                    const productoId = this.getAttribute('data-producto-id');
                    const productoNombre = this.getAttribute('data-producto-nombre');
                    
                    productoInput.value = productoNombre;
                    idProductoInput.value = productoId;
                    sugerenciasProductoContainer.style.display = 'none';
                    setValid(productoInput, errorProducto);
                });

                sugerenciasProductoContainer.appendChild(sugerencia);
            });
        }

        sugerenciasProductoContainer.style.display = 'block';
    }

    // ===== BÚSQUEDA DE PROVEEDORES CON SUGERENCIAS =====
    
    function mostrarSugerenciasProveedores(query) {
        if (!sugerenciasProveedorContainer) return;

        sugerenciasProveedorContainer.innerHTML = '';

        if (!query.trim()) {
            sugerenciasProveedorContainer.style.display = 'none';
            return;
        }

        const proveedoresData = window.proveedoresData || [];
        const sugerencias = proveedoresData.filter(proveedor =>
            proveedor.nombre.toLowerCase().includes(query.toLowerCase())
        );

        if (sugerencias.length === 0) {
            // Mostrar opción para agregar nuevo proveedor
            const agregarProveedor = document.createElement('div');
            agregarProveedor.className = 'sugerencia-item agregar-proveedor';
            agregarProveedor.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                        <i class="fas fa-plus-circle" style="color: var(--primary-green); margin-right: 8px;"></i>
                        <span style="color: var(--natural-gray); font-style: italic;">Agregar nuevo proveedor:</span>
                        <strong> "${query}"</strong>
                    </div>
                    <button type="button" class="btn-agregar-proveedor-sugerencia">
                        <i class="fas fa-check"></i> Crear
                    </button>
                </div>
            `;
            
            agregarProveedor.addEventListener('click', function() {
                abrirModalProveedor(query);
            });

            sugerenciasProveedorContainer.appendChild(agregarProveedor);
        } else {
            sugerencias.forEach(proveedor => {
                const sugerencia = document.createElement('div');
                sugerencia.className = 'sugerencia-item';
                sugerencia.innerHTML = `
                    <div>
                        <strong>${proveedor.nombre}</strong>
                    </div>
                `;
                sugerencia.setAttribute('data-proveedor-id', proveedor.id);
                sugerencia.setAttribute('data-proveedor-nombre', proveedor.nombre);
                
                sugerencia.addEventListener('click', function() {
                    const proveedorId = this.getAttribute('data-proveedor-id');
                    const proveedorNombre = this.getAttribute('data-proveedor-nombre');
                    
                    proveedorInput.value = proveedorNombre;
                    idProveedorInput.value = proveedorId;
                    sugerenciasProveedorContainer.style.display = 'none';
                    setValid(proveedorInput, errorProveedor);
                });

                sugerenciasProveedorContainer.appendChild(sugerencia);
            });
        }

        sugerenciasProveedorContainer.style.display = 'block';
    }

    // ===== MODAL PARA AGREGAR NUEVO PROVEEDOR =====
    
    function abrirModalProveedor(nombreProveedor = '') {
        nombreProveedorInput.value = nombreProveedor.toUpperCase();
        contactoProveedorInput.value = '';
        errorNombreProveedor.style.display = 'none';
        modalProveedor.style.display = 'flex';
        
        setTimeout(() => {
            nombreProveedorInput.focus();
        }, 100);
    }

    function cerrarModalProveedor() {
        modalProveedor.style.display = 'none';
        nombreProveedorInput.value = '';
        contactoProveedorInput.value = '';
        errorNombreProveedor.style.display = 'none';
    }

    // Event listeners para el modal de proveedor
    if (btnAgregarProveedor) {
        btnAgregarProveedor.addEventListener('click', function() {
            abrirModalProveedor();
        });
    }

    if (btnCerrarModalProveedor) {
        btnCerrarModalProveedor.addEventListener('click', cerrarModalProveedor);
    }
    
    if (btnCancelarProveedor) {
        btnCancelarProveedor.addEventListener('click', cerrarModalProveedor);
    }

    if (modalProveedor) {
        modalProveedor.addEventListener('click', function(e) {
            if (e.target === modalProveedor) {
                cerrarModalProveedor();
            }
        });
    }

    // Validaciones en tiempo real en el modal - CORREGIDAS
    if (nombreProveedorInput) {
        nombreProveedorInput.addEventListener('input', function() {
            // SOLO PERMITE LETRAS, NÚMEROS Y PUNTOS - MÁXIMO 20 CARACTERES
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 20);
            validarNombreProveedorTiempoReal();
        });
    }

    if (contactoProveedorInput) {
        // Crear elemento de error para contacto si no existe
        let errorContactoProveedor = document.getElementById('error-contactoProveedor');
        if (!errorContactoProveedor) {
            errorContactoProveedor = document.createElement('span');
            errorContactoProveedor.className = 'error-msg';
            errorContactoProveedor.id = 'error-contactoProveedor';
            contactoProveedorInput.parentNode.appendChild(errorContactoProveedor);
        }

        contactoProveedorInput.addEventListener('input', function() {
            // CONVERTIR A MAYÚSCULAS Y LIMITAR A 25 CARACTERES - SIN RESTRICCIONES DE CARACTERES
            this.value = this.value.toUpperCase().slice(0, 25);
            validarContactoProveedorTiempoReal();
        });
    }

    if (btnGuardarProveedor) {
        btnGuardarProveedor.addEventListener('click', function() {
            const nombreValido = validarNombreProveedorTiempoReal();
            const contactoValido = validarContactoProveedorTiempoReal();

            if (nombreValido && contactoValido) {
                const nombre = nombreProveedorInput.value.trim();
                const contacto = contactoProveedorInput.value.trim();
                
                // Crear proveedor via AJAX
                fetch(CREAR_PROVEEDOR_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({ 
                        nombre: nombre,
                        contacto: contacto 
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Agregar el nuevo proveedor a la lista local
                        if (window.proveedoresData) {
                            window.proveedoresData.push({
                                id: data.proveedor.id,
                                nombre: data.proveedor.nombre
                            });
                        }
                        
                        // Actualizar el campo de proveedor
                        proveedorInput.value = data.proveedor.nombre;
                        idProveedorInput.value = data.proveedor.id;
                        setValid(proveedorInput, errorProveedor);
                        
                        cerrarModalProveedor();
                        
                        // Ocultar sugerencias
                        if (sugerenciasProveedorContainer) {
                            sugerenciasProveedorContainer.style.display = 'none';
                        }
                        
                        // Mostrar mensaje de éxito
                        if (typeof mostrarModalExito === 'function') {
                            mostrarModalExito('¡Éxito!', data.message);
                        }
                    } else {
                        setInvalid(nombreProveedorInput, errorNombreProveedor, data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    setInvalid(nombreProveedorInput, errorNombreProveedor, 'Error de conexión');
                });
            }
        });
    }

    // ===== EVENT LISTENERS PARA BÚSQUEDA =====
    
    // Búsqueda de productos
    if (productoInput) {
        productoInput.addEventListener('input', function(e) {
            mostrarSugerenciasProductos(e.target.value);
        });

        productoInput.addEventListener('focus', function() {
            if (this.value) {
                mostrarSugerenciasProductos(this.value);
            }
        });

        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (productoInput && !productoInput.contains(e.target) && 
                sugerenciasProductoContainer && !sugerenciasProductoContainer.contains(e.target)) {
                sugerenciasProductoContainer.style.display = 'none';
            }
        });
    }

    // Búsqueda de proveedores - CON VALIDACIONES APLICADAS
    if (proveedorInput) {
        proveedorInput.addEventListener('input', function(e) {
            // APLICAR VALIDACIONES AL TIPEAR EN EL CAMPO DE BÚSQUEDA DE PROVEEDOR
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 20);
            mostrarSugerenciasProveedores(e.target.value);
        });

        proveedorInput.addEventListener('focus', function() {
            if (this.value) {
                mostrarSugerenciasProveedores(this.value);
            }
        });

        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (proveedorInput && !proveedorInput.contains(e.target) && 
                sugerenciasProveedorContainer && !sugerenciasProveedorContainer.contains(e.target)) {
                sugerenciasProveedorContainer.style.display = 'none';
            }
        });
    }

    // ===== VALIDACIONES EN TIEMPO REAL =====
    
    // Validación para cantidad (solo números)
    if (cantidadInput) {
        cantidadInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            validarCantidad();
        });
        cantidadInput.addEventListener('blur', validarCantidad);
    }

    // Validación para costo unitario (permite coma y números)
    if (costoUnitarioInput) {
        costoUnitarioInput.addEventListener('keypress', function (e) {
            const char = String.fromCharCode(e.keyCode || e.which);
            const currentValue = this.value;
            
            // Permitir números y coma
            if (!/^[0-9,]$/.test(char)) {
                e.preventDefault();
                return;
            }

            // Solo una coma
            if (char === ',') {
                if (currentValue.includes(',') || currentValue === '') {
                    e.preventDefault();
                    return;
                }
            }
        });

        costoUnitarioInput.addEventListener('input', function () {
           // Solo validación en tiempo real, sin reemplazo agresivo
           // Permitimos que el usuario escriba libremente números y una coma
           let val = this.value;
           
           // Si hay más de una coma, dejar solo la primera
           const parts = val.split(',');
           if (parts.length > 2) {
               this.value = parts[0] + ',' + parts.slice(1).join('');
           }
           
            validarCostoUnitario();
        });
        
        costoUnitarioInput.addEventListener('blur', function() {
            validarCostoUnitario();
        });
    }

    // ===== FUNCIONES DE VALIDACIÓN =====
    
    function validarProducto() {
        const val = idProductoInput ? idProductoInput.value : '';
        if (!val) {
            setInvalid(productoInput, errorProducto, "Debe seleccionar un producto.");
            return false;
        }
        setValid(productoInput, errorProducto);
        return true;
    }

    function validarCantidad() {
        const val = cantidadInput.value.trim();
        if (val === '') {
            setInvalid(cantidadInput, errorCantidad, "La cantidad es obligatoria.");
            return false;
        }
        if (!/^\d+$/.test(val) || parseInt(val, 10) <= 0) {
            setInvalid(cantidadInput, errorCantidad, "La cantidad debe ser un número entero mayor a 0.");
            return false;
        }
        
        // Validar que no sea menor que la cantidad disponible
        const loteActual = window.loteActual || {};
        if (loteActual.cantidad_disponible && parseInt(val, 10) < parseInt(loteActual.cantidad_disponible, 10)) {
            setInvalid(cantidadInput, errorCantidad, `No puede reducir la cantidad a menos de ${loteActual.cantidad_disponible} unidades disponibles.`);
            return false;
        }
        
        setValid(cantidadInput, errorCantidad);
        return true;
    }

    function validarCostoUnitario() {
        const val = costoUnitarioInput.value.trim();
        
        if (val === '') {
            setInvalid(costoUnitarioInput, errorCosto, "El costo unitario es obligatorio.");
            return false;
        }
        
        // Regex para validar formato con coma (ej: 12,50 o 100)
        if (!/^\d+(,\d{0,2})?$/.test(val)) {
            setInvalid(costoUnitarioInput, errorCosto, "Formato inválido. Use números y coma decimal (ej: 25,50)");
            return false;
        }
        
        // Convertir a número para validar valor positivo
        const numericValue = parseFloat(val.replace(',', '.'));
        if (isNaN(numericValue) || numericValue <= 0) {
            setInvalid(costoUnitarioInput, errorCosto, "El costo unitario debe ser mayor a cero.");
            return false;
        }
        
        setValid(costoUnitarioInput, errorCosto);
        return true;
    }

    function validarProveedor() {
        const val = idProveedorInput ? idProveedorInput.value : '';
        if (!val) {
            setInvalid(proveedorInput, errorProveedor, "Debe seleccionar un proveedor.");
            return false;
        }
        setValid(proveedorInput, errorProveedor);
        return true;
    }

    // ===== VALIDACIÓN FINAL AL ENVIAR =====
    
    if (form) {
        form.addEventListener('submit', function (e) {
            console.log('=== VALIDANDO FORMULARIO EDICIÓN ===');
            

            
            const validaciones = [
                validarProducto(),
                validarCantidad(),
                validarCostoUnitario(),
                validarProveedor()
            ];
            
            const esValido = validaciones.every(result => result === true);
            
            console.log('Resultado validaciones:', validaciones);

            if (!esValido) {
                e.preventDefault();
                e.stopPropagation();
                
                mostrarErrorGeneral('Por favor, corrija los errores marcados en rojo antes de enviar el formulario.');
                
                const campos = [productoInput, cantidadInput, costoUnitarioInput, proveedorInput];
                for (let campo of campos) {
                    if (campo && campo.classList.contains('is-invalid')) {
                        campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => campo.focus(), 500);
                        break;
                    }
                }
            } else {
                console.log('✅ Formulario válido, enviando...');
            }
        });
    }

    // ===== FUNCIÓN AUXILIAR PARA CSRF TOKEN =====
    function getCSRFToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    console.log('=== SCRIPT EDITAR LOTE INICIALIZADO CORRECTAMENTE ===');
});