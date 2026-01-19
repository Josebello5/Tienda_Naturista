// registrar_venta.js - SISTEMA COMPLETO CON FORMATO VENEZOLANO DE NÚMEROS - CORREGIDO
document.addEventListener('DOMContentLoaded', function() {
    // ===== ELEMENTOS DEL DOM =====
    const cedulaClienteInput = document.getElementById('cedulaCliente');
    const clienteResult = document.getElementById('clienteResult');
    const clienteInfo = document.getElementById('clienteInfo');
    const clienteNombre = document.getElementById('clienteNombre');
    const btnCambiarCliente = document.getElementById('btnCambiarCliente');
    const clienteFormContainer = document.getElementById('clienteFormContainer');
    const btnCancelarCliente = document.getElementById('btnCancelarCliente');
    const btnRegistrarCliente = document.getElementById('btnRegistrarCliente');
    const buscarProductoInput = document.getElementById('buscarProducto');
    const productosResult = document.getElementById('productosResult');
    const tbodyProductos = document.getElementById('tbodyProductos');
    const btnAgregarMetodo = document.getElementById('btnAgregarMetodo');
    const listaMetodosPago = document.getElementById('listaMetodosPago');
    const btnProcesarVenta = document.getElementById('btnProcesarVenta');
    const modalMetodoPago = document.getElementById('modalMetodoPago');
    const btnCerrarModal = document.querySelector('.btn-cerrar');
    const btnCancelarModal = document.querySelector('.btn-cancelar-modal');
    const btnAgregarPago = document.getElementById('btnAgregarPago');
    const selectMetodoPago = document.getElementById('selectMetodoPago');
    const montoPagoInput = document.getElementById('montoPago');
    const tasaCambioInput = document.getElementById('tasaCambio');
    const comprobantePagoInput = document.getElementById('comprobantePago');
    const divTasaCambio = document.getElementById('divTasaCambio');
    const divComprobante = document.getElementById('divComprobante');
    const radioContado = document.getElementById('radioContado');
    const radioCredito = document.getElementById('radioCredito');
    const totalPagadoSpan = document.getElementById('totalPagado');
    const restantePagarSpan = document.getElementById('restantePagar');
    const subtotalSpan = document.getElementById('subtotal');
    const ivaSpan = document.getElementById('iva');
    const totalSpan = document.getElementById('total');
    const totalUsdSpan = document.getElementById('total_usd');

    // ===== ELEMENTOS NUEVOS PARA CRÉDITO =====
    const abonoInfoSection = document.getElementById('abonoInfoSection');
    const abonoMinimoSpan = document.getElementById('abonoMinimo');
    const abonoMaximoSpan = document.getElementById('abonoMaximo');
    const abonoActualSpan = document.getElementById('abonoActual');
    const saldoPendienteSpan = document.getElementById('saldoPendiente');
    const infoPagoModal = document.getElementById('infoPagoModal');
    const textoInfoModal = document.getElementById('textoInfoModal');

    // ===== ELEMENTOS DE DEVOLUCIÓN =====
    const seccionDevolucion = document.getElementById('seccionDevolucion');
    const selectMetodoDevolucion = document.getElementById('selectMetodoDevolucion');
    const totalDevolverBs = document.getElementById('totalDevolverBs');
    const totalDevolverUsd = document.getElementById('totalDevolverUsd');
    const restanteDevolverBs = document.getElementById('restanteDevolverBs');
    const restanteDevolverUsd = document.getElementById('restanteDevolverUsd');
    const btnAgregarDevolucion = document.getElementById('btnAgregarDevolucion');
    const listaDevoluciones = document.getElementById('listaDevoluciones');

    // Campos de devolución
    const montoDevolucionBs = document.getElementById('montoDevolucionBs');
    const montoDevolucionUsd = document.getElementById('montoDevolucionUsd');
    const comprobanteDevolucionTransferencia = document.getElementById('comprobanteDevolucionTransferencia');
    const montoDevolucionTransferencia = document.getElementById('montoDevolucionTransferencia');
    const comprobanteDevolucionPagoMovil = document.getElementById('comprobanteDevolucionPagoMovil');
    const montoDevolucionPagoMovil = document.getElementById('montoDevolucionPagoMovil');

    // ===== ELEMENTOS DEL FORMULARIO DE CLIENTE =====
    const cedulaTipo = document.getElementById('cedula_tipo');
    const cedulaNumero = document.getElementById('cedula_numero');
    const tipoCliente = document.getElementById('tipo_cliente');
    const telefonoPrefijo = document.getElementById('telefono_prefijo');
    const telefonoNumero = document.getElementById('telefono_numero');
    const nombre = document.getElementById('nombre');
    const apellido = document.getElementById('apellido');
    const direccion = document.getElementById('direccion');
    const direccionCounter = document.getElementById('direccion-counter');

    // ===== VARIABLES DE ESTADO =====
    let clienteSeleccionado = null;
    let productosEnVenta = [];
    let metodosPago = [];
    let devoluciones = [];
    let searchTimeout;
    let mensajeClienteMostrado = false;
    let lastMontoInput = '';

    // Variables para controlar si el usuario ha empezado a escribir
    let cedulaTouched = false;
    let direccionTouched = false;

    // Tasa actual desde Django
    const tasaActual = window.TASA_ACTUAL || 0;
    // URL de redirección
    const menuVentasUrl = window.MENU_VENTAS_URL;

    // ===== FUNCIONES DE FORMATO Y VALIDACIÓN DE NÚMEROS VENEZOLANOS =====
    
    /**
     * Formatea un número con formato venezolano: puntos para miles, coma para decimales
     * @param {string|number} value - Valor a formatear
     * @returns {string} - Valor formateado con formato venezolano
     */
    function formatNumberVenezolano(value) {
        if (value === null || value === undefined || value === '') return '';
        
        // Si ya es string con formato venezolano, validar primero
        if (typeof value === 'string' && value.includes(',') && !value.includes('.')) {
            return value; // Ya está en formato venezolano
        }
        
        // Convertir a string y limpiar
        let str = value.toString();
        
        // Reemplazar punto decimal inglés por coma venezolana
        str = str.replace('.', '|TEMP|').replace(',', '.').replace('|TEMP|', '.');
        
        // Separar parte entera y decimal
        let parts = str.split('.');
        let integerPart = parts[0];
        let decimalPart = parts[1] || '00';
        
        // Asegurar que la parte decimal tenga 2 dígitos
        if (decimalPart.length === 1) {
            decimalPart += '0';
        } else if (decimalPart.length > 2) {
            decimalPart = decimalPart.substring(0, 2);
        }
        
        // Formatear parte entera con puntos cada 3 dígitos
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        return `${integerPart},${decimalPart}`;
    }

    /**
     * Convierte un número con formato venezolano a número decimal para cálculos
     * @param {string} formattedValue - Valor formateado (ej: "1.234,56")
     * @returns {number} - Valor numérico
     */
    function parseNumberVenezolano(formattedValue) {
        if (!formattedValue) return 0;
        
        // Eliminar puntos de miles y reemplazar coma decimal por punto
        const cleanValue = formattedValue.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanValue);
        
        return isNaN(num) ? 0 : num;
    }

    /**
     * Configura el formateo automático de números con formato venezolano en un input
     * @param {HTMLInputElement} input - Elemento input a formatear
     * @param {Function} onInputCallback - Función a ejecutar después del formateo
     */
    function setupNumberFormatting(input, onInputCallback = null) {
        let lastValue = input.value;
        
        input.addEventListener('input', function(e) {
            // Guardar posición del cursor
            const cursorPosition = this.selectionStart;
            const originalValue = this.value;
            
            // Permitir solo números y coma decimal
            let cleanValue = originalValue.replace(/[^\d,]/g, '');
            
            // Asegurar solo una coma decimal
            const parts = cleanValue.split(',');
            if (parts.length > 2) {
                cleanValue = parts[0] + ',' + parts.slice(1).join('');
            }
            
            // Limitar decimales a 2
            if (parts.length === 2 && parts[1].length > 2) {
                cleanValue = parts[0] + ',' + parts[1].substring(0, 2);
            }
            
            // Separar parte entera y decimal
            const [integerPart, decimalPart] = cleanValue.split(',');
            
            // Formatear parte entera con puntos
            let formattedInteger = '';
            if (integerPart) {
                formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            }
            
            // Reconstruir valor
            let formattedValue = decimalPart !== undefined ? 
                formattedInteger + ',' + decimalPart : 
                formattedInteger;
            
            // Actualizar valor si cambió
            if (formattedValue !== originalValue) {
                this.value = formattedValue;
                
                // Calcular nueva posición del cursor
                let newCursorPosition = cursorPosition;
                
                // Ajustar posición del cursor basado en la diferencia de puntos
                const pointCountBefore = (originalValue.substring(0, cursorPosition).match(/\./g) || []).length;
                const pointCountAfter = (formattedValue.substring(0, cursorPosition).match(/\./g) || []).length;
                
                newCursorPosition += pointCountAfter - pointCountBefore;
                newCursorPosition = Math.max(0, Math.min(newCursorPosition, formattedValue.length));
                
                // Restaurar posición del cursor
                this.setSelectionRange(newCursorPosition, newCursorPosition);
            }
            
            lastValue = formattedValue;
            
            // Ejecutar callback si existe
            if (onInputCallback && typeof onInputCallback === 'function') {
                onInputCallback();
            }
        });
        
        input.addEventListener('blur', function() {
            // Asegurar formato correcto al perder foco
            const value = parseNumberVenezolano(this.value);
            if (value > 0) {
                this.value = formatNumberVenezolano(value.toFixed(2));
            } else if (this.value.trim() !== '') {
                this.value = '0,00';
            }
        });
        
        input.addEventListener('focus', function() {
            // Seleccionar todo el texto al enfocar para fácil edición
            setTimeout(() => {
                this.select();
            }, 100);
        });
    }

    /**
     * Configura el formateo para el campo montoPagoInput específicamente
     */
    function setupMontoPagoFormatting() {
        let lastValue = montoPagoInput.value;
        
        montoPagoInput.addEventListener('input', function(e) {
            // Guardar posición del cursor
            const cursorPosition = this.selectionStart;
            const originalValue = this.value;
            
            // Permitir solo números y coma
            let newValue = originalValue.replace(/[^\d,]/g, '');
            
            // Asegurar que solo haya una coma decimal
            const parts = newValue.split(',');
            if (parts.length > 2) {
                newValue = parts[0] + ',' + parts.slice(1).join('');
            }
            
            // Limitar decimales a 2
            if (parts.length === 2 && parts[1].length > 2) {
                newValue = parts[0] + ',' + parts[1].substring(0, 2);
            }
            
            // Formatear con puntos (solo parte entera)
            const [integerPart, decimalPart] = newValue.split(',');
            
            let formattedInteger = '';
            if (integerPart) {
                formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            }
            
            const formattedValue = decimalPart !== undefined ? 
                formattedInteger + ',' + decimalPart : 
                formattedInteger;
            
            // Actualizar valor
            if (formattedValue !== originalValue) {
                this.value = formattedValue;
                
                // Calcular nueva posición del cursor
                let newCursorPosition = cursorPosition;
                const pointDiff = (formattedValue.match(/\./g) || []).length - (originalValue.match(/\./g) || []).length;
                newCursorPosition = Math.max(0, Math.min(cursorPosition + pointDiff, formattedValue.length));
                
                this.setSelectionRange(newCursorPosition, newCursorPosition);
            }
            
            lastValue = formattedValue;
            lastMontoInput = formattedValue;
            actualizarValidacionModal();
        });
        
        montoPagoInput.addEventListener('blur', function() {
            const value = parseNumberVenezolano(this.value);
            if (value > 0) {
                this.value = formatNumberVenezolano(value.toFixed(2));
            } else if (this.value.trim() !== '') {
                this.value = '0,00';
            }
        });
    }

    // ===== FUNCIONES DE VALIDACIÓN DEL FORMULARIO DE CLIENTE =====
    /**
     * Marca un campo como inválido y muestra mensaje de error
     */
    function setInvalid(input, errorDiv, message) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * Marca un campo como válido y limpia mensaje de error
     */
    function setValid(input, errorDiv) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Actualiza el placeholder y maxlength según el tipo de cédula
     */
    function actualizarValidacionCedula() {
        const tipo = cedulaTipo.value;
        const apellidoContainer = apellido.closest('.form-col');
        const labelNombre = document.querySelector('label[for="nombre"]');

        // Limpiar campo nombre/razón social al cambiar de tipo
        nombre.value = '';

        if (tipo === 'J') {
            cedulaNumero.setAttribute('maxlength', '9');
            cedulaNumero.setAttribute('placeholder', '9 dígitos');
            
            // Ocultar Apellido y renombrar Nombre
            if (apellidoContainer) apellidoContainer.style.display = 'none';
            if (labelNombre) labelNombre.textContent = 'Razón Social';
            
            // Auto-llenar apellido para validar
            apellido.value = '.';
            
        } else {
            cedulaNumero.setAttribute('maxlength', '8');
            cedulaNumero.setAttribute('placeholder', '7-8 dígitos');
            
            // Mostrar Apellido y restaurar Nombre
            if (apellidoContainer) apellidoContainer.style.display = 'block';
            if (labelNombre) labelNombre.textContent = 'Nombre';
            
            // Limpiar apellido si tiene el punto automático
            if (apellido.value === '.') apellido.value = '';
        }
        // Limpiar campo al cambiar tipo
        cedulaNumero.value = '';
        cedulaTouched = false;
        
        // Limpiar validaciones visuales previas
        setValid(cedulaNumero, document.getElementById('error-cedula-numero'));
        setValid(nombre, document.getElementById('error-nombre'));
        
        validarCedula();
    }

    /**
     * Valida el campo cédula según el tipo
     */
    function validarCedula() {
        const valor = cedulaNumero.value.trim();
        const tipo = cedulaTipo.value;
        const errorDiv = document.getElementById('error-cedula-numero');
        
        if (valor === '') {
            if (cedulaTouched) {
                setInvalid(cedulaNumero, errorDiv, "Este campo es obligatorio.");
            } else {
                setValid(cedulaNumero, errorDiv);
            }
            return false;
        }
        
        if (tipo === 'J') {
            if (!/^\d{9}$/.test(valor)) {
                setInvalid(cedulaNumero, errorDiv, "La cédula jurídica debe tener exactamente 9 dígitos.");
                return false;
            }
        } else {
            if (!/^\d{7,8}$/.test(valor)) {
                setInvalid(cedulaNumero, errorDiv, `La cédula ${tipo} debe tener entre 7 y 8 dígitos numéricos.`);
                return false;
            }
        }
        
        setValid(cedulaNumero, errorDiv);
        return true;
    }

    /**
     * Valida el campo nombre (solo letras y espacios, máximo 10)
     */
    function validarNombre() {
        const valor = nombre.value.trim();
        const tipo = cedulaTipo.value;
        const errorDiv = document.getElementById('error-nombre');
        
        // Regex diferenciado
        const regex = tipo === 'J' ? /^[A-ZÁÉÍÓÚÑÜ0-9\s.&]+$/ : /^[A-ZÁÉÍÓÚÑÜ\s]+$/;
        
        if (valor === '') {
            setInvalid(nombre, errorDiv, "Este campo es obligatorio.");
            return false;
        }
        
        if (!regex.test(valor)) {
            setInvalid(nombre, errorDiv, tipo === 'J' ? "Carácter inválido." : "El nombre solo debe contener letras y espacios.");
            return false;
        }
        
        if (valor.length < 2) {
            setInvalid(nombre, errorDiv, "El nombre debe tener al menos 2 caracteres.");
            return false;
        }
        
        setValid(nombre, errorDiv);
        return true;
    }

    /**
     * Valida el campo apellido (solo letras y espacios, máximo 10)
     */
    function validarApellido() {
        // Si es Jurídico, asumimos válido (punto automático)
        if (cedulaTipo.value === 'J') {
            setValid(apellido, document.getElementById('error-apellido'));
            return true;
        }

        const valor = apellido.value.trim();
        const regex = /^[A-ZÁÉÍÓÚÑÜ\s]+$/;
        const errorDiv = document.getElementById('error-apellido');
        
        if (valor === '') {
            setInvalid(apellido, errorDiv, "Este campo es obligatorio.");
            return false;
        }
        
        if (!regex.test(valor)) {
            setInvalid(apellido, errorDiv, "El apellido solo debe contener letras y espacios.");
            return false;
        }
        
        if (valor.length < 2) {
            setInvalid(apellido, errorDiv, "El apellido debe tener al menos 2 caracteres.");
            return false;
        }
        
        setValid(apellido, errorDiv);
        return true;
    }

    /**
     * Valida el campo teléfono (exactamente 7 dígitos)
     */
    function validarTelefono() {
        const valor = telefonoNumero.value.trim();
        const regex = /^\d{7}$/;
        const errorDiv = document.getElementById('error-telefono-numero');
        
        if (valor === '') {
            setInvalid(telefonoNumero, errorDiv, "Este campo es obligatorio.");
            return false;
        }
        
        if (!regex.test(valor)) {
            setInvalid(telefonoNumero, errorDiv, "El teléfono debe tener exactamente 7 dígitos numéricos.");
            return false;
        }
        
        setValid(telefonoNumero, errorDiv);
        return true;
    }

    /**
     * Valida el campo dirección (entre 10 y 20 caracteres)
     */
    function validarDireccion() {
        const valor = direccion.value.trim();
        const errorDiv = document.getElementById('error-direccion');
        
        if (valor === '') {
            if (direccionTouched) {
                setInvalid(direccion, errorDiv, "Este campo es obligatorio.");
            } else {
                setValid(direccion, errorDiv);
            }
            return false;
        }
        
        if (valor.length < 10) {
            setInvalid(direccion, errorDiv, `La dirección debe tener al menos 10 caracteres. Faltan ${10 - valor.length}.`);
            return false;
        }
        
        if (valor.length > 20) {
            setInvalid(direccion, errorDiv, "La dirección no puede tener más de 20 caracteres.");
            return false;
        }
        
        setValid(direccion, errorDiv);
        return true;
    }

    // ===== INICIALIZACIÓN DE VALIDACIONES =====
    function inicializarValidacionCliente() {
        // Inicializar validación de cédula
        actualizarValidacionCedula();

        // Event listener para cambio de tipo de cédula
        cedulaTipo.addEventListener('change', actualizarValidacionCedula);

        // ===== VALIDACIÓN DE CÉDULA (SOLO NÚMEROS) =====
        cedulaNumero.addEventListener('keypress', function (e) {
            const maxLength = cedulaTipo.value === 'J' ? 9 : 8;
            // Solo permitir números
            if (!/[0-9]/.test(e.key) || cedulaNumero.value.length >= maxLength) {
                e.preventDefault();
            }
        });

        cedulaNumero.addEventListener('input', function () {
            if (!cedulaTouched) {
                cedulaTouched = true;
            }
            // Solo permitir números (por si copia y pega)
            this.value = this.value.replace(/\D/g, '');
            validarCedula();
        });

        cedulaNumero.addEventListener('blur', validarCedula);

        // ===== VALIDACIÓN DE NOMBRE (SOLO LETRAS, MAYÚSCULAS, MÁXIMO 10, O ALFANUMERICO SI J) =====
        nombre.addEventListener('input', function () {
            // Guardar posición del cursor
            const start = this.selectionStart;
            const end = this.selectionEnd;
            
            // Convertir a mayúsculas y limitar a 10 caracteres
            this.value = this.value.toUpperCase();
            
            // Permitir caracteres según tipo
            if (cedulaTipo.value === 'J') {
                 this.value = this.value.replace(/[^A-ZÁÉÍÓÚÑÜ0-9\s.&]/g, '');
            } else {
                 this.value = this.value.replace(/[^A-ZÁÉÍÓÚÑÜ\s]/g, '');
            }
            
            // Limitar a 10 caracteres
            if (this.value.length > 10) {
                this.value = this.value.substring(0, 10);
            }
            
            // Restaurar posición del cursor
            this.setSelectionRange(Math.min(start, this.value.length), Math.min(end, this.value.length));
            
            validarNombre();
        });

        nombre.addEventListener('keypress', function (e) {
            // Prevenir entrada de números y caracteres especiales en tiempo real
            // (Esta validación básica puede bloquearse para J si no la relajamos, 
            //  así que mejor dependemos del input event sanitizer o la hacemos condicional)
            if (cedulaTipo.value === 'J') return; // Dejar pasar para J, el input event limpia

            const key = e.key;
            const allowedKeys = /[A-Za-záéíóúÁÉÍÓÚñÑüÜ\s]/.test(key) || 
                              key === 'Backspace' || key === 'Delete' || 
                              key === 'ArrowLeft' || key === 'ArrowRight' ||
                              key === 'Tab' || key === 'Enter';
            
            if (!allowedKeys) {
                e.preventDefault();
            }
        });

        nombre.addEventListener('blur', validarNombre);

        // ===== VALIDACIÓN DE APELLIDO (SOLO LETRAS, MAYÚSCULAS, MÁXIMO 10) =====
        apellido.addEventListener('input', function () {
            // Guardar posición del cursor
            const start = this.selectionStart;
            const end = this.selectionEnd;
            
            // Convertir a mayúsculas y limitar a 10 caracteres
            this.value = this.value.toUpperCase();
            
            // Permitir solo letras y espacios
            this.value = this.value.replace(/[^A-ZÁÉÍÓÚÑÜ\s]/g, '');
            
            // Limitar a 10 caracteres
            if (this.value.length > 10) {
                this.value = this.value.substring(0, 10);
            }
            
            // Restaurar posición del cursor
            this.setSelectionRange(Math.min(start, this.value.length), Math.min(end, this.value.length));
            
            validarApellido();
        });

        apellido.addEventListener('keypress', function (e) {
            if (cedulaTipo.value === 'J') return; // Ignorar validación de teclas para J en apellido oculto

            const key = e.key;
            const allowedKeys = /[A-Za-záéíóúÁÉÍÓÚñÑüÜ\s]/.test(key) || 
                              key === 'Backspace' || key === 'Delete' || 
                              key === 'ArrowLeft' || key === 'ArrowRight' ||
                              key === 'Tab' || key === 'Enter';
            
            if (!allowedKeys) {
                e.preventDefault();
            }
        });

        apellido.addEventListener('blur', validarApellido);

        // ... (resto codigo)

    /**
     * Valida el campo nombre (solo letras y espacios, máximo 10)
     */
    function validarNombre() {
        const valor = nombre.value.trim();
        const tipo = cedulaTipo.value;
        const errorDiv = document.getElementById('error-nombre');
        
        // Regex diferenciado
        const regex = tipo === 'J' ? /^[A-ZÁÉÍÓÚÑÜ0-9\s.&]+$/ : /^[A-ZÁÉÍÓÚÑÜ\s]+$/;
        
        if (valor === '') {
            setInvalid(nombre, errorDiv, "Este campo es obligatorio.");
            return false;
        }
        
        if (!regex.test(valor)) {
            setInvalid(nombre, errorDiv, tipo === 'J' ? "Carácter inválido." : "El nombre solo debe contener letras y espacios.");
            return false;
        }
        
        if (valor.length < 2) {
            setInvalid(nombre, errorDiv, "El nombre debe tener al menos 2 caracteres.");
            return false;
        }
        
        setValid(nombre, errorDiv);
        return true;
    }

    /**
     * Valida el campo apellido (solo letras y espacios, máximo 10)
     */
    function validarApellido() {
        // Si es Jurídico, asumimos válido (punto automático)
        if (cedulaTipo.value === 'J') {
            setValid(apellido, document.getElementById('error-apellido'));
            return true;
        }

        const valor = apellido.value.trim();
        const regex = /^[A-ZÁÉÍÓÚÑÜ\s]+$/;
        const errorDiv = document.getElementById('error-apellido');
        
        if (valor === '') {
            setInvalid(apellido, errorDiv, "Este campo es obligatorio.");
            return false;
        }
        
        if (!regex.test(valor)) {
            setInvalid(apellido, errorDiv, "El apellido solo debe contener letras y espacios.");
            return false;
        }
        
        if (valor.length < 2) {
            setInvalid(apellido, errorDiv, "El apellido debe tener al menos 2 caracteres.");
            return false;
        }
        
        setValid(apellido, errorDiv);
        return true;
    }
        // ===== VALIDACIÓN DE TELÉFONO (SOLO NÚMEROS, EXACTAMENTE 7 DÍGITOS) =====
        telefonoNumero.addEventListener('keypress', function (e) {
            // Solo permitir números
            if (!/[0-9]/.test(e.key) || telefonoNumero.value.length >= 7) {
                e.preventDefault();
            }
        });

        telefonoNumero.addEventListener('input', function () {
            // Solo permitir números (por si copia y pega)
            this.value = this.value.replace(/\D/g, '').slice(0, 7);
            
            // Mostrar mensaje en tiempo real si no tiene 7 dígitos
            const errorDiv = document.getElementById('error-telefono-numero');
            if (this.value.length > 0 && this.value.length < 7) {
                setInvalid(this, errorDiv, "El teléfono debe tener exactamente 7 dígitos. Faltan " + (7 - this.value.length));
            } else if (this.value.length === 7) {
                setValid(this, errorDiv);
            }
            
            validarTelefono();
        });

        telefonoNumero.addEventListener('blur', validarTelefono);

        // ===== VALIDACIÓN DE DIRECCIÓN (ENTRE 10 Y 20 CARACTERES, MAYÚSCULAS) =====
        direccion.addEventListener('input', function () {
            if (!direccionTouched) {
                direccionTouched = true;
            }
            
            // Guardar posición del cursor
            const start = this.selectionStart;
            const end = this.selectionEnd;
            
            // Convertir a mayúsculas
            this.value = this.value.toUpperCase();
            
            const length = this.value.length;
            direccionCounter.textContent = `${length}/20 caracteres`;
            
            if (length > 20) {
                this.value = this.value.slice(0, 20);
                direccionCounter.textContent = '20/20 caracteres';
            }
            
            // Restaurar posición del cursor
            this.setSelectionRange(Math.min(start, this.value.length), Math.min(end, this.value.length));
            
            // Actualizar clase del contador
            direccionCounter.className = 'char-counter';
            if (length >= 18 && length <= 20) {
                direccionCounter.classList.add('warning');
            }
            if (length > 20) {
                direccionCounter.classList.add('error');
            }
            
            // Validación en tiempo real
            const errorDiv = document.getElementById('error-direccion');
            if (length < 10 && length > 0) {
                setInvalid(this, errorDiv, `Mínimo 10 caracteres. Faltan ${10 - length}`);
            } else if (length === 0) {
                setValid(this, errorDiv);
            } else if (length >= 10) {
                setValid(this, errorDiv);
            }
        });

        direccion.addEventListener('blur', validarDireccion);

        // Inicializar contador de dirección
        direccionCounter.textContent = '0/20 caracteres';
    }

    // ===== REGISTRO DE CLIENTE - FUNCIÓN PRINCIPAL =====
    function registrarCliente() {
        // Forzar validación de todos los campos
        cedulaTouched = true;
        direccionTouched = true;
        
        // Disparar eventos de validación
        cedulaNumero.dispatchEvent(new Event('input'));
        direccion.dispatchEvent(new Event('input'));
        
        // Validaciones individuales
        const esCedulaValida = validarCedula();
        const esNombreValido = validarNombre();
        const esApellidoValido = validarApellido();
        const esTelefonoValido = validarTelefono();
        const esDireccionValida = validarDireccion();
        
        const esValido = esCedulaValida && esNombreValido && esApellidoValido && 
                         esTelefonoValido && esDireccionValida;
        
        if (!esValido) {
            mostrarMensaje('Por favor complete todos los campos correctamente', 'error');
            
            // Encontrar el primer campo con error y hacer scroll
            const campos = [
                {elem: cedulaNumero, valido: esCedulaValida},
                {elem: nombre, valido: esNombreValido},
                {elem: apellido, valido: esApellidoValido},
                {elem: telefonoNumero, valido: esTelefonoValido},
                {elem: direccion, valido: esDireccionValida}
            ];
            
            for (let campo of campos) {
                if (!campo.valido && campo.elem) {
                    campo.elem.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center'
                    });
                    campo.elem.focus();
                    break;
                }
            }
            
            return;
        }
        
        const formData = {
            cedula_tipo: cedulaTipo.value,
            cedula_numero: cedulaNumero.value.trim(),
            nombre: nombre.value.trim(),
            apellido: apellido.value.trim(),
            tipo_cliente: tipoCliente.value,
            telefono_prefijo: telefonoPrefijo.value,
            telefono_numero: telefonoNumero.value.trim(),
            direccion: direccion.value.trim()
        };

        btnRegistrarCliente.disabled = true;
        btnRegistrarCliente.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

        fetch('/ventas/registrar-cliente-venta/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                seleccionarCliente(data.cliente);
                clienteFormContainer.style.display = 'none';
                mostrarMensaje('Cliente registrado exitosamente', 'success');
            } else {
                let mensajeError = 'Error al registrar cliente';
                if (data.errores) {
                    mensajeError += ': ' + Object.values(data.errores).join(', ');
                } else if (data.error) {
                    mensajeError = data.error;
                }
                mostrarMensaje(mensajeError, 'error');
            }
        })
        .catch(error => {
            console.error('Error registrando cliente:', error);
            mostrarMensaje('Error al registrar cliente: ' + error.message, 'error');
        })
        .finally(() => {
            btnRegistrarCliente.disabled = false;
            btnRegistrarCliente.innerHTML = '<i class="fas fa-user-plus"></i> Registrar Cliente';
        });
    }

    // ===== CONFIGURAR EVENTOS AL CARGAR LA PÁGINA =====
    function configurarEventos() {
        // Búsqueda de clientes
        cedulaClienteInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                buscarClientes(e.target.value);
            }, 300);
        });

        // Cambiar cliente
        btnCambiarCliente.addEventListener('click', function() {
            clienteSeleccionado = null;
            clienteInfo.style.display = 'none';
            cedulaClienteInput.value = '';
            cedulaClienteInput.focus();
            mensajeClienteMostrado = false;
            actualizarEstadoBotonProcesar();
        });

        // Búsqueda de productos
        buscarProductoInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                buscarProductos(e.target.value);
            }, 300);
        });

        // Manejo de Scanner (Enter Key)
        buscarProductoInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                if (query.length > 0) {
                    clearTimeout(searchTimeout); // Cancelar búsqueda por input normal
                    buscarProductos(query, true); // Buscar con flag de auto-agregar
                }
            }
        });

        // Formulario de cliente
        btnCancelarCliente.addEventListener('click', function() {
            clienteFormContainer.style.display = 'none';
            cedulaClienteInput.value = '';
            cedulaClienteInput.focus();
        });

        // Event listener para el botón de registrar cliente
        btnRegistrarCliente.addEventListener('click', registrarCliente);

        // ===== TIPO DE VENTA =====
        document.querySelectorAll('input[name="tipoVenta"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'credito') {
                    radioCredito.classList.add('selected');
                    radioContado.classList.remove('selected');
                    abonoInfoSection.style.display = 'block';
                    
                    // Limpiar métodos de pago al cambiar a crédito
                    metodosPago = [];
                    actualizarListaMetodosPago();
                    
                } else {
                    radioContado.classList.add('selected');
                    radioCredito.classList.remove('selected');
                    abonoInfoSection.style.display = 'none';
                    
                    // Limpiar métodos de pago al cambiar a contado
                    metodosPago = [];
                    actualizarListaMetodosPago();
                }
                actualizarResumen();
            });
        });

        // Métodos de pago
        btnAgregarMetodo.addEventListener('click', function() {
            abrirModalMetodoPago();
        });

        // ===== MODAL MÉTODO DE PAGO CON FORMATO VENEZOLANO =====
        selectMetodoPago.addEventListener('change', function() {
            const metodo = this.value;
            divTasaCambio.style.display = metodo === 'efectivo_usd' ? 'block' : 'none';
            divComprobante.style.display = (metodo === 'transferencia' || metodo === 'pago_movil' || metodo === 'punto_venta') ? 'block' : 'none';
            
            if (!divComprobante.style.display || divComprobante.style.display === 'none') {
                comprobantePagoInput.value = '';
            }
            
            // Limpiar campo monto al cambiar método
            montoPagoInput.value = '';
            lastMontoInput = '';
            
            // Actualizar validación cuando cambia el método
            actualizarValidacionModal();
        });

        // Configurar formateo especial para montoPagoInput
        setupMontoPagoFormatting();
        
        // Configurar tasaCambioInput (solo lectura, formateado)
        tasaCambioInput.value = formatNumberVenezolano(tasaActual.toFixed(2));
        tasaCambioInput.readOnly = true;
        setupNumberFormatting(tasaCambioInput);

        comprobantePagoInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });

        btnAgregarPago.addEventListener('click', agregarMetodoPago);

        // Modal método de pago
        btnCerrarModal.addEventListener('click', cerrarModalMetodoPago);
        btnCancelarModal.addEventListener('click', cerrarModalMetodoPago);

        // ===== EVENTOS DE DEVOLUCIÓN CON FORMATO VENEZOLANO =====
        selectMetodoDevolucion.addEventListener('change', function() {
            actualizarCamposDevolucion();
        });

        // Configurar formateo de números para todos los campos de devolución
        setupNumberFormatting(montoDevolucionBs, function() {
            const montoBs = parseNumberVenezolano(montoDevolucionBs.value);
            if (tasaActual > 0 && montoBs > 0) {
                montoDevolucionUsd.value = formatNumberVenezolano((montoBs / tasaActual).toFixed(2));
            } else {
                montoDevolucionUsd.value = '0,00';
            }
            validarMontoDevolucionEnTiempoReal(montoBs);
        });
        
        setupNumberFormatting(montoDevolucionUsd, function() {
            const montoUsd = parseNumberVenezolano(montoDevolucionUsd.value);
            if (tasaActual > 0 && montoUsd > 0) {
                montoDevolucionBs.value = formatNumberVenezolano((montoUsd * tasaActual).toFixed(2));
            } else {
                montoDevolucionBs.value = '0,00';
            }
            validarMontoDevolucionEnTiempoReal(montoUsd * tasaActual);
        });
        
        setupNumberFormatting(montoDevolucionTransferencia, function() {
            const montoBs = parseNumberVenezolano(montoDevolucionTransferencia.value);
            validarMontoDevolucionEnTiempoReal(montoBs);
        });
        
        setupNumberFormatting(montoDevolucionPagoMovil, function() {
            const montoBs = parseNumberVenezolano(montoDevolucionPagoMovil.value);
            validarMontoDevolucionEnTiempoReal(montoBs);
        });

        // Validar comprobantes de devolución
        comprobanteDevolucionTransferencia.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length > 0) {
                this.classList.remove('is-invalid');
            }
        });

        comprobanteDevolucionPagoMovil.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length > 0) {
                this.classList.remove('is-invalid');
            }
        });

        // Botón para agregar devolución
        btnAgregarDevolucion.addEventListener('click', agregarDevolucion);

        // Procesar venta
        btnProcesarVenta.addEventListener('click', procesarVenta);
    }

    // ===== BÚSQUEDA DE CLIENTES =====
    function buscarClientes(query) {
        if (query.length < 2) {
            clienteResult.innerHTML = '';
            return;
        }

        fetch(`/ventas/buscar-clientes/?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                mostrarResultadosClientes(data.clientes);
            })
            .catch(error => {
                console.error('Error buscando clientes:', error);
                mostrarMensaje('Error al buscar clientes', 'error');
            });
    }

    function mostrarResultadosClientes(clientes) {
        clienteResult.innerHTML = '';

        if (clientes.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'result-item';
            noResults.innerHTML = `
                <div class="text-center py-2">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron clientes</p>
                    <button class="btn-nuevo-cliente" onclick="mostrarFormularioCliente()">
                        <i class="fas fa-plus"></i> Registrar Nuevo Cliente
                    </button>
                </div>
            `;
            clienteResult.appendChild(noResults);
            return;
        }

        clientes.forEach(cliente => {
            const item = document.createElement('div');
            item.className = 'result-item';
            
            item.innerHTML = `
                <strong>${cliente.nombre} ${cliente.apellido}</strong>
                <br>
                <small>Cédula: ${cliente.cedula} | Tel: ${cliente.telefono || 'N/A'} | Tipo: ${cliente.tipo_cliente}</small>
            `;
            item.addEventListener('click', function() {
                seleccionarCliente(cliente);
            });
            clienteResult.appendChild(item);
        });

        const nuevoClienteItem = document.createElement('div');
        nuevoClienteItem.className = 'result-item';
        nuevoClienteItem.innerHTML = `
            <button class="btn-nuevo-cliente" onclick="mostrarFormularioCliente()">
                <i class="fas fa-plus"></i> Registrar Nuevo Cliente
            </button>
        `;
        clienteResult.appendChild(nuevoClienteItem);
    }

    window.mostrarFormularioCliente = function() {
        clienteFormContainer.style.display = 'block';
        clienteResult.innerHTML = '';
        cedulaClienteInput.value = '';
        
        // Limpiar formulario y validaciones
        cedulaTipo.value = 'V';
        cedulaNumero.value = '';
        nombre.value = '';
        apellido.value = '';
        tipoCliente.value = 'particular';
        telefonoPrefijo.value = '0412';
        telefonoNumero.value = '';
        direccion.value = '';
        
        // Remover clases de validación
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid', 'is-valid');
        });
        
        // Ocultar mensajes de error
        document.querySelectorAll('.error-msg').forEach(error => {
            error.textContent = '';
            error.style.display = 'none';
        });
        
        // Ocultar contenedor de error general
        document.getElementById('clienteErrorContainer').style.display = 'none';
        
        // Resetear estados de toque
        cedulaTouched = false;
        direccionTouched = false;
        
        // Actualizar contador de dirección
        direccionCounter.textContent = '0/20 caracteres';
        direccionCounter.className = 'char-counter';
        
        // Actualizar validación de cédula
        cedulaTipo.dispatchEvent(new Event('change'));
        
        // Enfocar primer campo
        setTimeout(() => {
            cedulaNumero.focus();
        }, 100);
    }

    function seleccionarCliente(cliente) {
        clienteSeleccionado = cliente;
        clienteNombre.textContent = `${cliente.nombre} ${cliente.apellido} - ${cliente.cedula}`;
        clienteInfo.style.display = 'block';
        clienteResult.innerHTML = '';
        cedulaClienteInput.value = '';
        mensajeClienteMostrado = false;
        actualizarEstadoBotonProcesar();
        mostrarMensaje(`Cliente seleccionado: ${cliente.nombre} ${cliente.apellido}`, 'success');
    }

    // ===== BÚSQUEDA DE PRODUCTOS =====
    // ===== BÚSQUEDA DE PRODUCTOS =====
    function buscarProductos(query, autoAdd = false) {
        if (query.length < 2) {
            productosResult.innerHTML = '';
            return;
        }

        fetch(`/ventas/buscar-productos/?q=${encodeURIComponent(query)}&_t=${new Date().getTime()}`)
            .then(response => response.json())
            .then(data => {
                // Lógica de Autoscan
                if (autoAdd) {
                    // Buscar coincidencia exacta por serial o código
                    const exactMatch = data.productos.find(p => 
                        (p.serial && p.serial.toUpperCase() === query.toUpperCase()) || 
                        p.nombre.toUpperCase() === query.toUpperCase() // Fallback por nombre exacto
                    );

                    if (exactMatch) {
                        agregarProductoAVenta(exactMatch);
                        // Limpiar input y resultados
                        buscarProductoInput.value = '';
                        productosResult.innerHTML = '';
                        buscarProductoInput.focus();
                        return; // Detener flujo aquí si se agrego
                    } else if (data.productos.length === 1) {
                         // Si solo hay un resultado (aunque no sea match exacto de texto), agregarlo también?
                         // Mejor ser conservador: Solo match exacto de serial.
                         // Pero si el usuario escanea un código y solo sale un producto, probablemente sea ese.
                         // Vamos a asumir que si hay un solo resultado y vino de Enter, es ese.
                         agregarProductoAVenta(data.productos[0]);
                         buscarProductoInput.value = '';
                         productosResult.innerHTML = '';
                         buscarProductoInput.focus();
                         return;
                    }
                }

                mostrarResultadosProductos(data.productos);
            })
            .catch(error => {
                console.error('Error buscando productos:', error);
                mostrarMensaje('Error al buscar productos', 'error');
            });
    }

    function mostrarResultadosProductos(productos) {
        productosResult.innerHTML = '';

        if (productos.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'result-item';
            noResults.innerHTML = `
                <div class="text-center py-2">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron productos</p>
                </div>
            `;
            productosResult.appendChild(noResults);
            return;
        }

        productos.forEach(producto => {
            const item = document.createElement('div');
            item.className = 'result-item';
            
            let stockClass = 'disponible';
            let stockText = 'Disponible';
            if (producto.stock_total <= 0) {
                stockClass = 'agotado';
                stockText = 'Agotado';
            } else if (producto.stock_total <= 5) {
                stockClass = 'limitado';
                stockText = 'Stock limitado';
            }
            
            let infoAdicional = '';
            if (producto.stock_costo_mayor > 0) {
                infoAdicional = `<div class="stock-advertencia">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${producto.stock_costo_mayor} unidades con costo mayor al precio de venta ($${producto.precio_usd.toFixed(2)})
                </div>`;
            }

            const ivaInfo = producto.sujeto_iva === 'si' ? ' (IVA 16%)' : ' (Exento)';
            
            // CORREGIDO: Usar producto.precio_usd directamente (ya es número del backend)
            item.innerHTML = `
                <strong>${producto.nombre}</strong>
                <br>
                <small>Precio: $${formatNumberVenezolano(producto.precio_usd.toFixed(2))}${ivaInfo} | Stock disponible: ${formatNumberVenezolano(producto.stock_total)}</small>
                <div class="stock-indicator">
                    <span class="stock-badge ${stockClass}">${stockText}</span>
                </div>
                ${infoAdicional}
            `;
            
            if (producto.stock_total > 0) {
                item.addEventListener('click', function() {
                    agregarProductoAVenta(producto);
                });
            } else {
                item.style.opacity = '0.6';
                item.style.cursor = 'not-allowed';
            }
            
            productosResult.appendChild(item);
        });
    }

    function agregarProductoAVenta(producto) {
        if (producto.stock_total <= 0) {
            mostrarMensaje('No hay stock disponible para este producto', 'error');
            return;
        }

        // Mostrar advertencia si hay lotes con costo mayor
        if (producto.stock_costo_mayor > 0) {
            mostrarMensaje(
                `Advertencia: Este producto tiene ${producto.stock_costo_mayor} unidades en lotes con costo mayor al precio de venta. ` +
                `Solo se pueden vender ${producto.stock_total} unidades de lotes con costo válido.`,
                'warning'
            );
        }

        const productoExistente = productosEnVenta.find(p => p.id === producto.id);
        if (productoExistente) {
            if (productoExistente.cantidad < producto.stock_total) {
                productoExistente.cantidad += 1;
            } else {
                mostrarMensaje(`No hay suficiente stock disponible. Máximo: ${formatNumberVenezolano(producto.stock_total)} unidades`, 'error');
                return;
            }
        } else {
            // CORREGIDO: producto.precio_usd ya es número del backend
            productosEnVenta.push({
                id: producto.id,
                nombre: producto.nombre,
                precio_usd: producto.precio_usd,  // Ya es número directamente
                cantidad: 1,
                stock_total: producto.stock_total,
                stock_costo_mayor: producto.stock_costo_mayor,
                sujeto_iva: producto.sujeto_iva
            });
        }

        actualizarTablaProductos();
        actualizarResumen();
        buscarProductoInput.value = '';
        productosResult.innerHTML = '';
        buscarProductoInput.focus();
    }

    function actualizarTablaProductos() {
        tbodyProductos.innerHTML = '';

        if (productosEnVenta.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fas fa-box-open fa-2x mb-2"></i>
                    <p>No hay productos en la venta</p>
                </td>
            `;
            tbodyProductos.appendChild(tr);
            metodosPago = [];
            devoluciones = [];
            actualizarListaMetodosPago();
            actualizarListaDevoluciones();
            return;
        }

        productosEnVenta.forEach((producto, index) => {
            // CORREGIDO: producto.precio_usd ya es número
            const precioBs = producto.precio_usd * tasaActual;
            const subtotal = precioBs * producto.cantidad;
            const ivaProducto = producto.sujeto_iva === 'si' ? subtotal * 0.16 : 0;

            let stockClass = 'disponible';
            let stockText = 'Disponible';
            if (producto.cantidad >= producto.stock_total) {
                stockClass = 'agotado';
                stockText = 'Stock máximo';
            } else if (producto.stock_total - producto.cantidad <= 5) {
                stockClass = 'limitado';
                stockText = 'Stock limitado';
            }

            let infoAdicional = '';
            if (producto.stock_costo_mayor > 0) {
                infoAdicional = `<div class="stock-advertencia">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${formatNumberVenezolano(producto.stock_costo_mayor)} unidades con costo mayor al precio de venta ($${formatNumberVenezolano(producto.precio_usd.toFixed(2))})
                </div>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${producto.nombre}</strong>
                    <br>
                    <small class="iva-info">${producto.sujeto_iva === 'si' ? 'Con IVA' : 'Exento de IVA'}</small>
                    ${infoAdicional}
                </td>
                <td>$${formatNumberVenezolano(producto.precio_usd.toFixed(2))}</td>
                <td>Bs ${formatNumberVenezolano(precioBs.toFixed(2))}</td>
                <td class="cantidad-cell">
                    <input type="number" class="input-cantidad ${producto.cantidad >= producto.stock_total ? 'error' : ''}" 
                           value="${producto.cantidad}" 
                           min="1" max="${producto.stock_total}" 
                           data-index="${index}" onchange="actualizarCantidadProducto(this)">
                    <span class="stock-info ${stockClass}">${stockText} - Máx: ${formatNumberVenezolano(producto.stock_total)}</span>
                </td>
                <td>Bs ${formatNumberVenezolano(subtotal.toFixed(2))}</td>
                <td>${producto.sujeto_iva === 'si' ? `Bs ${formatNumberVenezolano(ivaProducto.toFixed(2))}` : 'Exento'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbodyProductos.appendChild(tr);
        });
    }

    window.actualizarCantidadProducto = function(input) {
        const index = parseInt(input.dataset.index);
        let nuevaCantidad = parseInt(input.value);

        // Validar que no sea negativo
        if (isNaN(nuevaCantidad) || nuevaCantidad < 0) {
            input.value = 1;
            nuevaCantidad = 1;
        }

        if (nuevaCantidad > productosEnVenta[index].stock_total) {
            input.value = productosEnVenta[index].stock_total;
            productosEnVenta[index].cantidad = productosEnVenta[index].stock_total;
            mostrarMensaje(`No hay suficiente stock disponible. Máximo: ${formatNumberVenezolano(productosEnVenta[index].stock_total)} unidades`, 'error');
        } else {
            productosEnVenta[index].cantidad = nuevaCantidad;
        }

        actualizarTablaProductos();
        actualizarResumen();
    }

    window.eliminarProducto = function(index) {
        const producto = productosEnVenta[index];
        productosEnVenta.splice(index, 1);
        actualizarTablaProductos();
        actualizarResumen();
        
        if (productosEnVenta.length === 0) {
            metodosPago = [];
            devoluciones = [];
            actualizarListaMetodosPago();
            actualizarListaDevoluciones();
            mostrarMensaje('Se han removido todos los productos. Los métodos de pago y devoluciones se han limpiado.', 'info');
        }
    }

    // ===== MÉTODOS DE PAGO - SISTEMA CON FORMATO VENEZOLANO =====
    function abrirModalMetodoPago() {
        selectMetodoPago.value = '';
        montoPagoInput.value = '';
        tasaCambioInput.value = formatNumberVenezolano(tasaActual.toFixed(2));
        comprobantePagoInput.value = '';
        divTasaCambio.style.display = 'none';
        divComprobante.style.display = 'none';
        infoPagoModal.style.display = 'none';
        lastMontoInput = '';
        
        // Mostrar información específica según el tipo de venta
        actualizarInfoModal();
        
        modalMetodoPago.style.display = 'block';
        
        setTimeout(() => {
            selectMetodoPago.focus();
        }, 100);
    }

    function actualizarInfoModal() {
        const total = parseNumberVenezolano(totalSpan.textContent.replace('Bs', '').trim()) || 0;
        const totalPagado = parseNumberVenezolano(totalPagadoSpan.textContent.replace('Bs', '').trim()) || 0;
        
        if (radioCredito.classList.contains('selected')) {
            // Para crédito: mostrar información del abono
            const abonoMinimo = total * 0.20;
            const abonoMaximo = total * 0.80;
            const abonoActual = totalPagado;
            const restanteAbono = abonoMaximo - abonoActual;
            
            infoPagoModal.className = 'alert alert-info';
            infoPagoModal.style.display = 'block';
            infoPagoModal.className = 'alert alert-info';
            infoPagoModal.style.display = 'block';
            
            // Cálculos en USD
            const abonoMinimoUsd = abonoMinimo / tasaActual;
            const abonoMaximoUsd = abonoMaximo / tasaActual;
            const abonoActualUsd = abonoActual / tasaActual;
            const restanteAbonoUsd = restanteAbono / tasaActual;

            textoInfoModal.innerHTML = `
                <div style="margin-bottom: 5px;">
                    <strong>Abono Inicial (20% - 80%):</strong><br>
                    <span>Min: Bs ${formatNumberVenezolano(abonoMinimo.toFixed(2))} ($ ${formatNumberVenezolano(abonoMinimoUsd.toFixed(2))})</span><br>
                    <span>Max: Bs ${formatNumberVenezolano(abonoMaximo.toFixed(2))} ($ ${formatNumberVenezolano(abonoMaximoUsd.toFixed(2))})</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Abono Actual:</strong> Bs ${formatNumberVenezolano(abonoActual.toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(abonoActualUsd.toFixed(2))})</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 5px;">
                    <span><strong>Máximo a abonar:</strong> Bs ${formatNumberVenezolano(restanteAbono.toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(restanteAbonoUsd.toFixed(2))})</strong></span>
                </div>
            `;
        } else {
            // Para contado: mostrar información normal
            const restante = total - totalPagado;
            infoPagoModal.className = 'alert alert-info';
            infoPagoModal.style.display = 'block';
            textoInfoModal.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Total:</strong> Bs ${formatNumberVenezolano(total.toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano((total / tasaActual).toFixed(2))})</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Pagado:</strong> Bs ${formatNumberVenezolano(totalPagado.toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano((totalPagado / tasaActual).toFixed(2))})</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 5px;">
                    <span><strong>Restante:</strong> Bs ${formatNumberVenezolano(restante.toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano((restante / tasaActual).toFixed(2))})</strong></span>
                </div>
            `;
        }
    }

    function actualizarValidacionModal() {
        const total = parseNumberVenezolano(totalSpan.textContent.replace('Bs', '').trim()) || 0;
        const totalPagado = parseNumberVenezolano(totalPagadoSpan.textContent.replace('Bs', '').trim()) || 0;
        const monto = parseNumberVenezolano(montoPagoInput.value);
        const metodo = selectMetodoPago.value;

        // Calcular monto en BS según el método
        let montoBs = monto;
        if (metodo === 'efectivo_usd') {
            montoBs = monto * tasaActual;
        }

        if (radioCredito.classList.contains('selected')) {
            // Validación para CRÉDITO
            const abonoMinimo = total * 0.20;
            const abonoMaximo = total * 0.80;
            const nuevoAbono = totalPagado + montoBs;
            
            // Cálculos en USD
            const abonoMinimoUsd = abonoMinimo / tasaActual;
            const abonoMaximoUsd = abonoMaximo / tasaActual;
            const nuevoAbonoUsd = nuevoAbono / tasaActual;
            const maximoAbonar = abonoMaximo - totalPagado;
            const maximoAbonarUsd = maximoAbonar / tasaActual;

            let contenidoHTML = `
                <div style="margin-bottom: 5px;">
                    <strong>Abono Inicial (20% - 80%):</strong><br>
                    <span>Min: Bs ${formatNumberVenezolano(abonoMinimo.toFixed(2))} ($ ${formatNumberVenezolano(abonoMinimoUsd.toFixed(2))})</span><br>
                    <span>Max: Bs ${formatNumberVenezolano(abonoMaximo.toFixed(2))} ($ ${formatNumberVenezolano(abonoMaximoUsd.toFixed(2))})</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Abono Actual (+Nuevo):</strong> Bs ${formatNumberVenezolano(nuevoAbono.toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(nuevoAbonoUsd.toFixed(2))})</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 5px;">
                    <span><strong>Máximo a abonar:</strong> Bs ${formatNumberVenezolano(Math.max(0, maximoAbonar - montoBs).toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(Math.max(0, maximoAbonarUsd - (montoBs / tasaActual)).toFixed(2))})</strong></span>
                </div>
            `;

            if (metodo === 'efectivo_usd' && monto > 0) {
                const equivalenteBs = monto * tasaActual;
                contenidoHTML += `<br><strong>Equivalente en Bs:</strong> Bs ${formatNumberVenezolano(equivalenteBs.toFixed(2))}`;
            }

            textoInfoModal.innerHTML = contenidoHTML;

            if (nuevoAbono > abonoMaximo) {
                montoPagoInput.classList.add('is-invalid');
                btnAgregarPago.disabled = true;
                btnAgregarPago.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Excede el 80%';
                infoPagoModal.className = 'alert alert-danger';
            } else if (nuevoAbono < abonoMinimo && nuevoAbono > 0) {
                montoPagoInput.classList.remove('is-invalid');
                btnAgregarPago.disabled = false;
                btnAgregarPago.innerHTML = 'Agregar';
                infoPagoModal.className = 'alert alert-warning';
            } else if (montoBs > 0) {
                montoPagoInput.classList.remove('is-invalid');
                btnAgregarPago.disabled = false;
                btnAgregarPago.innerHTML = 'Agregar';
                infoPagoModal.className = 'alert alert-info';
            } else {
                montoPagoInput.classList.remove('is-invalid');
                btnAgregarPago.disabled = true;
                btnAgregarPago.innerHTML = 'Agregar';
                infoPagoModal.className = 'alert alert-info';
            }
        } else {
            // Validación para CONTADO
            const restante = total - totalPagado;
            
            let nuevoTotalPagadoUsd = totalPagado / tasaActual;
            if (metodo === 'efectivo_usd') {
                nuevoTotalPagadoUsd += monto;
            } else {
                nuevoTotalPagadoUsd += (monto / tasaActual);
            }
            
            let totalUsd = total / tasaActual;
            let nuevoRestanteUsd = totalUsd - nuevoTotalPagadoUsd;
            if (nuevoRestanteUsd < 0) nuevoRestanteUsd = 0;

            let contenidoHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Total:</strong> Bs ${formatNumberVenezolano(total.toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(totalUsd.toFixed(2))})</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Pagado (+Actual):</strong> Bs ${formatNumberVenezolano((totalPagado + montoBs).toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(nuevoTotalPagadoUsd.toFixed(2))})</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 5px;">
                    <span><strong>Restante:</strong> Bs ${formatNumberVenezolano(Math.max(0, restante - montoBs).toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(nuevoRestanteUsd.toFixed(2))})</strong></span>
                </div>
            `;

            if (metodo === 'efectivo_usd' && monto > 0) {
                 contenidoHTML += `<div style="margin-top: 5px; font-size: 0.9em; color: var(--success);">
                    <i class="fas fa-exchange-alt"></i> Equivalente: Bs ${formatNumberVenezolano(montoBs.toFixed(2))}
                </div>`;
            } else if (monto > 0) {
                 contenidoHTML += `<div style="margin-top: 5px; font-size: 0.9em; color: var(--info);">
                    <i class="fas fa-exchange-alt"></i> Equivalente: $ ${formatNumberVenezolano((monto / tasaActual).toFixed(2))}
                </div>`;
            }

            textoInfoModal.innerHTML = contenidoHTML;

            if (montoBs > restante && !['efectivo_bs', 'efectivo_usd'].includes(metodo)) {
                montoPagoInput.classList.add('is-invalid');
                btnAgregarPago.disabled = true;
                btnAgregarPago.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Monto excede';
                infoPagoModal.className = 'alert alert-danger';
            } else if (montoBs > 0) {
                montoPagoInput.classList.remove('is-invalid');
                btnAgregarPago.disabled = false;
                btnAgregarPago.innerHTML = 'Agregar';
                infoPagoModal.className = 'alert alert-info';
            } else {
                montoPagoInput.classList.remove('is-invalid');
                btnAgregarPago.disabled = true;
                btnAgregarPago.innerHTML = 'Agregar';
                infoPagoModal.className = 'alert alert-info';
            }
        }
    }

    function cerrarModalMetodoPago() {
        modalMetodoPago.style.display = 'none';
        lastMontoInput = '';
    }

    function agregarMetodoPago() {
        const metodo = selectMetodoPago.value;
        const monto = parseNumberVenezolano(montoPagoInput.value);
        let tasaCambio = metodo === 'efectivo_usd' ? parseNumberVenezolano(tasaCambioInput.value) : null;
        const comprobante = comprobantePagoInput.value;

        // Validaciones básicas
        if (!metodo) {
            mostrarMensaje('Seleccione un método de pago', 'error');
            return;
        }

        if (monto <= 0) {
            mostrarMensaje('El monto debe ser mayor a cero', 'error');
            return;
        }

        // Calcular monto en BS para validación
        let montoBs = monto;
        if (metodo === 'efectivo_usd') {
            montoBs = monto * tasaActual;
        }

        const total = parseNumberVenezolano(totalSpan.textContent.replace('Bs', '').trim()) || 0;
        const totalPagado = parseNumberVenezolano(totalPagadoSpan.textContent.replace('Bs', '').trim()) || 0;
        
        // Validación específica para CRÉDITO
        if (radioCredito.classList.contains('selected')) {
            const abonoMinimo = total * 0.20;
            const abonoMaximo = total * 0.80;
            const nuevoAbono = totalPagado + montoBs;

            if (nuevoAbono > abonoMaximo) {
                mostrarMensaje(`El abono no puede superar el 80% del total (Bs ${formatNumberVenezolano(abonoMaximo.toFixed(2))})`, 'error');
                return;
            }
        } else {
            // Para contado: validaciones normales
            const restante = total - totalPagado;
            if (!['efectivo_bs', 'efectivo_usd'].includes(metodo) && montoBs > restante) {
                mostrarMensaje(`El monto no puede exceder el restante por pagar (Bs ${formatNumberVenezolano(restante.toFixed(2))})`, 'error');
                return;
            }
        }

        if ((metodo === 'transferencia' || metodo === 'pago_movil' || metodo === 'punto_venta') && !comprobante) {
            mostrarMensaje('El número de comprobante es obligatorio para este método de pago', 'error');
            comprobantePagoInput.classList.add('is-invalid');
            return;
        }

        if (comprobante && !/^\d+$/.test(comprobante)) {
            mostrarMensaje('El comprobante debe contener solo números', 'error');
            comprobantePagoInput.classList.add('is-invalid');
            return;
        }

        // Usar siempre la tasa actual para efectivo en dólares
        if (metodo === 'efectivo_usd') {
            tasaCambio = tasaActual;
        }

        // Verificación para evitar duplicados
        const pagoExistente = metodosPago.find(p => 
            p.metodo === metodo && 
            p.monto === monto && 
            p.comprobante === comprobante
        );
        
        if (pagoExistente) {
            mostrarMensaje('Este método de pago ya fue agregado', 'error');
            return;
        }

        metodosPago.push({
            metodo: metodo,
            monto: monto,
            tasa_cambio: tasaCambio,
            comprobante: comprobante
        });

        actualizarListaMetodosPago();
        actualizarResumen();
        cerrarModalMetodoPago();
        mostrarMensaje('Método de pago agregado correctamente', 'success');
    }

    function actualizarListaMetodosPago() {
        listaMetodosPago.innerHTML = '';

        if (metodosPago.length === 0) {
            listaMetodosPago.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-money-bill-wave fa-2x mb-2"></i>
                    <p>No hay métodos de pago agregados</p>
                </div>
            `;
            return;
        }

        metodosPago.forEach((pago, index) => {
            const item = document.createElement('div');
            item.className = 'pago-item';
            
            const metodoDisplay = {
                'efectivo_bs': 'Efectivo Bs',
                'efectivo_usd': 'Efectivo $',
                'transferencia': 'Transferencia',
                'pago_movil': 'Pago Móvil',
                'punto_venta': 'Punto de Venta'
            }[pago.metodo];

            const montoStr = pago.metodo === 'efectivo_usd' ? 
                `$${formatNumberVenezolano(pago.monto.toFixed(2))}` : 
                `Bs ${formatNumberVenezolano(pago.monto.toFixed(2))}`;
                
            const tasaStr = pago.tasa_cambio ? `Tasa: ${formatNumberVenezolano(pago.tasa_cambio.toFixed(2))}` : '';
            const comprobanteStr = pago.comprobante || 'Sin comprobante';

            item.innerHTML = `
                <span><strong>${metodoDisplay}</strong></span>
                <span class="monto-pago">${montoStr}</span>
                <span class="tasa-pago">${tasaStr}</span>
                <span>${comprobanteStr}</span>
                <button class="btn btn-danger btn-sm" onclick="eliminarMetodoPago(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            listaMetodosPago.appendChild(item);
        });
    }

    window.eliminarMetodoPago = function(index) {
        metodosPago.splice(index, 1);
        actualizarListaMetodosPago();
        actualizarResumen();
    }

    // ===== SISTEMA DE DEVOLUCIÓN =====
    function actualizarCamposDevolucion() {
        const metodo = selectMetodoDevolucion.value;
        
        // Ocultar todos los campos primero
        document.querySelectorAll('.devolucion-campos').forEach(div => {
            div.style.display = 'none';
        });
        
        // Mostrar campos según el método seleccionado
        if (metodo === 'efectivo_bs') {
            document.getElementById('divDevolucionEfectivoBs').style.display = 'block';
            montoDevolucionBs.value = '0,00';
            setTimeout(() => montoDevolucionBs.focus(), 100);
        } else if (metodo === 'efectivo_usd') {
            document.getElementById('divDevolucionEfectivoUsd').style.display = 'block';
            montoDevolucionUsd.value = '0,00';
            setTimeout(() => montoDevolucionUsd.focus(), 100);
        } else if (metodo === 'transferencia') {
            document.getElementById('divDevolucionTransferencia').style.display = 'block';
            comprobanteDevolucionTransferencia.value = '';
            montoDevolucionTransferencia.value = '0,00';
            setTimeout(() => comprobanteDevolucionTransferencia.focus(), 100);
        } else if (metodo === 'pago_movil') {
            document.getElementById('divDevolucionPagoMovil').style.display = 'block';
            comprobanteDevolucionPagoMovil.value = '';
            montoDevolucionPagoMovil.value = '0,00';
            setTimeout(() => comprobanteDevolucionPagoMovil.focus(), 100);
        }
    }

    function validarMontoDevolucionEnTiempoReal(montoBs) {
        const restanteActual = parseNumberVenezolano(restanteDevolverBs.textContent.replace('Bs', '').trim()) || 0;
        
        if (montoBs > restanteActual + 0.05) {
            btnAgregarDevolucion.disabled = true;
            btnAgregarDevolucion.style.backgroundColor = '#dc3545';
            btnAgregarDevolucion.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Monto excede el cambio';
        } else {
            btnAgregarDevolucion.disabled = false;
            btnAgregarDevolucion.style.backgroundColor = '';
            btnAgregarDevolucion.innerHTML = '<i class="fas fa-plus"></i> Agregar Devolución';
        }
    }

    function agregarDevolucion() {
        const metodo = selectMetodoDevolucion.value;
        let montoBs = 0;
        let montoUsd = 0;
        let comprobante = '';

        // Obtener valores según el método
        if (metodo === 'efectivo_bs') {
            montoBs = parseNumberVenezolano(montoDevolucionBs.value);
            montoUsd = montoBs / tasaActual;
        } else if (metodo === 'efectivo_usd') {
            montoUsd = parseNumberVenezolano(montoDevolucionUsd.value);
            montoBs = montoUsd * tasaActual;
        } else if (metodo === 'transferencia') {
            montoBs = parseNumberVenezolano(montoDevolucionTransferencia.value);
            montoUsd = montoBs / tasaActual;
            comprobante = comprobanteDevolucionTransferencia.value;
        } else if (metodo === 'pago_movil') {
            montoBs = parseNumberVenezolano(montoDevolucionPagoMovil.value);
            montoUsd = montoBs / tasaActual;
            comprobante = comprobanteDevolucionPagoMovil.value;
        }

        // Validaciones completas para todos los métodos
        if (!metodo) {
            mostrarMensaje('Seleccione un método de devolución', 'error');
            return;
        }

        if (montoBs <= 0) {
            mostrarMensaje('Ingrese un monto válido mayor a cero', 'error');
            return;
        }

        if ((metodo === 'transferencia' || metodo === 'pago_movil') && !comprobante) {
            mostrarMensaje('El número de comprobante es obligatorio para este método de devolución', 'error');
            if (metodo === 'transferencia') {
                comprobanteDevolucionTransferencia.classList.add('is-invalid');
            } else {
                comprobanteDevolucionPagoMovil.classList.add('is-invalid');
            }
            return;
        }

        if (comprobante && !/^\d+$/.test(comprobante)) {
            mostrarMensaje('El comprobante debe contener solo números', 'error');
            if (metodo === 'transferencia') {
                comprobanteDevolucionTransferencia.classList.add('is-invalid');
            } else {
                comprobanteDevolucionPagoMovil.classList.add('is-invalid');
            }
            return;
        }

        // Validación del monto
        const restanteActual = parseNumberVenezolano(restanteDevolverBs.textContent.replace('Bs', '').trim()) || 0;
        
        if (montoBs > restanteActual + 0.05) {
            mostrarMensaje('El monto no puede ser mayor al cambio disponible', 'error');
            return;
        }

        // Agregar a la lista de devoluciones
        devoluciones.push({
            metodo: metodo,
            montoBs: montoBs,
            montoUsd: montoUsd,
            comprobante: comprobante
        });

        // Limpiar campos
        selectMetodoDevolucion.value = '';
        montoDevolucionBs.value = '0,00';
        montoDevolucionUsd.value = '0,00';
        montoDevolucionTransferencia.value = '0,00';
        montoDevolucionPagoMovil.value = '0,00';
        comprobanteDevolucionTransferencia.value = '';
        comprobanteDevolucionPagoMovil.value = '';
        document.querySelectorAll('.devolucion-campos').forEach(div => {
            div.style.display = 'none';
        });

        // Restablecer botón
        btnAgregarDevolucion.disabled = false;
        btnAgregarDevolucion.style.backgroundColor = '';
        btnAgregarDevolucion.innerHTML = '<i class="fas fa-plus"></i> Agregar Devolución';

        actualizarListaDevoluciones();
        mostrarMensaje('Devolución agregada correctamente', 'success');
    }

    function actualizarListaDevoluciones() {
        listaDevoluciones.innerHTML = '';

        if (devoluciones.length === 0) {
            listaDevoluciones.innerHTML = `
                <div class="text-center py-3 text-muted">
                    <i class="fas fa-exchange-alt fa-2x mb-2"></i>
                    <p>No hay devoluciones agregadas</p>
                </div>
            `;
            const cambioTotal = parseNumberVenezolano(totalDevolverBs.textContent.replace('Bs', '').trim()) || 0;
            restanteDevolverBs.textContent = `Bs ${formatNumberVenezolano(cambioTotal.toFixed(2))}`;
            restanteDevolverUsd.textContent = `$ ${formatNumberVenezolano((cambioTotal / tasaActual).toFixed(2))}`;
            return;
        }

        let totalDevolucionBs = 0;
        let totalDevolucionUsd = 0;

        devoluciones.forEach((devolucion, index) => {
            const item = document.createElement('div');
            item.className = 'devolucion-item';
            
            const metodoDisplay = {
                'efectivo_bs': 'Efectivo Bs',
                'efectivo_usd': 'Efectivo $',
                'transferencia': 'Transferencia',
                'pago_movil': 'Pago Móvil'
            }[devolucion.metodo];

            const montoBs = devolucion.montoBs;
            const montoUsd = devolucion.montoUsd;
            
            const montoDisplay = devolucion.metodo === 'efectivo_usd' ? 
                `$${formatNumberVenezolano(montoUsd.toFixed(2))}` : 
                `Bs ${formatNumberVenezolano(montoBs.toFixed(2))}`;

            totalDevolucionBs += montoBs;
            totalDevolucionUsd += montoUsd;

            let comprobanteInfo = '';
            if (devolucion.comprobante) {
                comprobanteInfo = ` - Comprobante: ${devolucion.comprobante}`;
            }

            item.innerHTML = `
                <div class="devolucion-info">
                    <strong>${metodoDisplay}</strong>: ${montoDisplay}${comprobanteInfo}
                </div>
                <button class="btn btn-danger btn-sm" onclick="eliminarDevolucion(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            listaDevoluciones.appendChild(item);
        });

        // Actualizar restante
        const cambioTotal = parseNumberVenezolano(totalDevolverBs.textContent.replace('Bs', '').trim());
        const restante = Math.max(0, cambioTotal - totalDevolucionBs);

        restanteDevolverBs.textContent = `Bs ${formatNumberVenezolano(restante.toFixed(2))}`;
        restanteDevolverUsd.textContent = `$ ${formatNumberVenezolano((restante / tasaActual).toFixed(2))}`;
        
        actualizarEstadoBotonProcesar();
    }

    window.eliminarDevolucion = function(index) {
        if (index >= 0 && index < devoluciones.length) {
            devoluciones.splice(index, 1);
            actualizarListaDevoluciones();
            mostrarMensaje('Devolución eliminada', 'success');
        }
    }

    function actualizarSeccionDevolucion(total, totalPagado) {
        const excedente = totalPagado - total;
        
        if (excedente > 0.01) {
            seccionDevolucion.style.display = 'block';
            totalDevolverBs.textContent = `Bs ${formatNumberVenezolano(excedente.toFixed(2))}`;
            totalDevolverUsd.textContent = `$ ${formatNumberVenezolano((excedente / tasaActual).toFixed(2))}`;
            
            // Actualizar restante inmediatamente
            const totalDevoluciones = devoluciones.reduce((sum, dev) => sum + dev.montoBs, 0);
            const restante = Math.max(0, excedente - totalDevoluciones);
            restanteDevolverBs.textContent = `Bs ${formatNumberVenezolano(restante.toFixed(2))}`;
            restanteDevolverUsd.textContent = `$ ${formatNumberVenezolano((restante / tasaActual).toFixed(2))}`;
            
            // Si las devoluciones existentes exceden el nuevo cambio, mostrar advertencia y limpiar
            if (totalDevoluciones > excedente + 0.05) {
                mostrarMensaje('Las devoluciones configuradas exceden el nuevo cambio disponible. Se han reiniciado las devoluciones.', 'warning');
                devoluciones = [];
                actualizarListaDevoluciones();
            }
        } else {
            seccionDevolucion.style.display = 'none';
            devoluciones = [];
            actualizarListaDevoluciones();
        }
    }

    // ===== CÁLCULOS Y RESUMEN CON FORMATO VENEZOLANO =====
    function actualizarResumen() {
        let subtotalConIva = 0;
        let subtotalSinIva = 0;
        
        // CORREGIDO: producto.precio_usd ya es número, no string
        productosEnVenta.forEach(producto => {
            const precioBs = producto.precio_usd * tasaActual;
            const subtotalProducto = precioBs * producto.cantidad;
            
            if (producto.sujeto_iva === 'si') {
                subtotalConIva += subtotalProducto;
            } else {
                subtotalSinIva += subtotalProducto;
            }
        });

        const iva = subtotalConIva * 0.16;
        const subtotal = subtotalConIva + subtotalSinIva;
        const total = subtotal + iva;

        let totalPagado = 0;
        metodosPago.forEach(pago => {
            if (pago.metodo === 'efectivo_usd') {
                totalPagado += pago.monto * pago.tasa_cambio;
            } else {
                totalPagado += pago.monto;
            }
        });

        // Cálculos para ambos tipos de venta
        let restantePagar = 0;
        let saldoPendiente = 0;

        if (radioCredito.classList.contains('selected')) {
            // PARA CRÉDITO: El abono inicial es el total pagado
            const abonoInicial = totalPagado;
            saldoPendiente = Math.max(0, total - abonoInicial);
            restantePagar = saldoPendiente;

            // Actualizar información de crédito con formato venezolano
            const abonoMinimo = total * 0.20;
            const abonoMaximo = total * 0.80;
            
            abonoMinimoSpan.textContent = `Bs ${formatNumberVenezolano(abonoMinimo.toFixed(2))}`;
            abonoMaximoSpan.textContent = `Bs ${formatNumberVenezolano(abonoMaximo.toFixed(2))}`;
            abonoActualSpan.textContent = `Bs ${formatNumberVenezolano(abonoInicial.toFixed(2))}`;
            saldoPendienteSpan.textContent = `Bs ${formatNumberVenezolano(saldoPendiente.toFixed(2))}`;

            // Deshabilitar botón si se alcanza el tope del abono máximo
            if (abonoInicial >= abonoMaximo - 0.01) {
                btnAgregarMetodo.disabled = true;
                btnAgregarMetodo.title = 'Se ha alcanzado el abono máximo (80%)';
                btnAgregarMetodo.innerHTML = '<i class="fas fa-ban"></i> Abono Máximo Alcanzado';
            } else {
                btnAgregarMetodo.disabled = false;
                btnAgregarMetodo.title = '';
                btnAgregarMetodo.innerHTML = '<i class="fas fa-plus"></i> Agregar Método de Pago';
            }

        } else {
            // PARA CONTADO: restante es el total menos lo pagado
            restantePagar = Math.max(0, total - totalPagado);
            saldoPendiente = 0;
            
            // Habilitar/deshabilitar botón para contado
            btnAgregarMetodo.disabled = totalPagado >= total - 0.01;
            btnAgregarMetodo.title = '';
            btnAgregarMetodo.innerHTML = '<i class="fas fa-plus"></i> Agregar Método de Pago';
        }

        // Actualizar resumen con formato venezolano
        subtotalSpan.textContent = `Bs ${formatNumberVenezolano(subtotal.toFixed(2))}`;
        ivaSpan.textContent = `Bs ${formatNumberVenezolano(iva.toFixed(2))}`;
        totalSpan.textContent = `Bs ${formatNumberVenezolano(total.toFixed(2))}`;
        totalUsdSpan.textContent = tasaActual > 0 ? 
            `$ ${formatNumberVenezolano((total / tasaActual).toFixed(2))}` : 
            '$ 0,00';
        
        totalPagadoSpan.textContent = `Bs ${formatNumberVenezolano(totalPagado.toFixed(2))}`;
        restantePagarSpan.textContent = `Bs ${formatNumberVenezolano(restantePagar.toFixed(2))}`;

        // Actualizar sección de devolución
        actualizarSeccionDevolucion(total, totalPagado);
        actualizarEstadoBotonProcesar();
    }

    function actualizarEstadoBotonProcesar() {
        const hayCliente = clienteSeleccionado !== null;
        const hayProductos = productosEnVenta.length > 0;
        const hayTasa = tasaActual > 0;

        let esValido = hayCliente && hayProductos && hayTasa;

        if (esValido) {
            const total = parseNumberVenezolano(totalSpan.textContent.replace('Bs', '').trim()) || 0;
            const totalPagado = parseNumberVenezolano(totalPagadoSpan.textContent.replace('Bs', '').trim()) || 0;

            if (radioCredito.classList.contains('selected')) {
                const abonoMinimo = total * 0.20;
                const abonoMaximo = total * 0.80;
                
                // Validaciones específicas para crédito
                esValido = totalPagado >= abonoMinimo && 
                          totalPagado <= abonoMaximo;
                
                if (totalPagado < abonoMinimo) {
                    mostrarMensaje(`El abono inicial debe ser al menos el 20% del total (Bs ${formatNumberVenezolano(abonoMinimo.toFixed(2))})`, 'error');
                    esValido = false;
                }
                
                if (totalPagado > abonoMaximo) {
                    mostrarMensaje(`El abono inicial no puede superar el 80% del total (Bs ${formatNumberVenezolano(abonoMaximo.toFixed(2))})`, 'error');
                    esValido = false;
                }

            } else {
                esValido = totalPagado >= total - 0.01;
            }

            // Validación de devoluciones SOLO si hay excedente
            const excedente = totalPagado - total;
            if (excedente > 0.01) {
                const totalDevoluciones = devoluciones.reduce((sum, dev) => sum + dev.montoBs, 0);
                esValido = esValido && Math.abs(totalDevoluciones - excedente) <= 0.05;
            }
        }

        btnProcesarVenta.disabled = !esValido;
    }

    // ===== PROCESAR VENTA =====
    function procesarVenta() {
        const total = parseNumberVenezolano(totalSpan.textContent.replace('Bs', '').trim()) || 0;
        const totalPagado = parseNumberVenezolano(totalPagadoSpan.textContent.replace('Bs', '').trim()) || 0;

        console.log('Validando venta:', { total, totalPagado, devoluciones });

        // Validación para venta al contado
        if (radioContado.classList.contains('selected')) {
            if (totalPagado < total - 0.01) {
                mostrarMensaje(`El pago es insuficiente. Total: Bs ${formatNumberVenezolano(total.toFixed(2))}, Pagado: Bs ${formatNumberVenezolano(totalPagado.toFixed(2))}`, 'error');
                return;
            }
        }

        // Validación específica para venta a crédito
        if (radioCredito.classList.contains('selected')) {
            const abonoMinimo = total * 0.20;
            const abonoMaximo = total * 0.80;
            
            if (totalPagado < abonoMinimo) {
                mostrarMensaje(`El abono inicial debe ser al menos el 20% del total (Bs ${formatNumberVenezolano(abonoMinimo.toFixed(2))})`, 'error');
                return;
            }
            
            if (totalPagado > abonoMaximo) {
                mostrarMensaje(`El abono inicial no puede superar el 80% del total (Bs ${formatNumberVenezolano(abonoMaximo.toFixed(2))})`, 'error');
                return;
            }
        }

        // Validación de devoluciones SOLO si hay excedente
        const excedente = totalPagado - total;
        if (excedente > 0.01) {
            if (devoluciones.length === 0) {
                mostrarMensaje('Debe agregar al menos un método de devolución para el cambio', 'error');
                return;
            }

            const totalDevoluciones = devoluciones.reduce((sum, dev) => sum + dev.montoBs, 0);
            if (Math.abs(totalDevoluciones - excedente) > 0.05) {
                mostrarMensaje(`La suma de las devoluciones (Bs ${formatNumberVenezolano(totalDevoluciones.toFixed(2))}) debe ser igual al cambio a devolver (Bs ${formatNumberVenezolano(excedente.toFixed(2))})`, 'error');
                return;
            }
        } else {
            // Si no hay excedente, no debería haber devoluciones
            if (devoluciones.length > 0) {
                mostrarMensaje('No hay excedente para devolver. Por favor, elimine las devoluciones configuradas.', 'error');
                return;
            }
        }

        procesarVentaConDatos();
    }

    function procesarVentaConDatos() {
        const tipoVentaRadio = document.querySelector('input[name="tipoVenta"]:checked');
        if (!tipoVentaRadio) {
            mostrarMensaje('Error: No se pudo determinar el tipo de venta', 'error');
            return;
        }
        
        const tipoVenta = tipoVentaRadio.value;
        const totalPagado = parseNumberVenezolano(totalPagadoSpan.textContent.replace('Bs', '').trim()) || 0;

        // Preparar datos de productos (convertir formato venezolano a decimal para envío)
        const productosParaEnviar = productosEnVenta.map(producto => ({
            id: producto.id,
            nombre: producto.nombre,
            precio_usd: producto.precio_usd, // Ya es número decimal
            cantidad: producto.cantidad
        }));

        // Preparar datos de pagos (convertir formato venezolano a decimal para envío)
        const pagosParaEnviar = metodosPago.map(pago => ({
            metodo: pago.metodo,
            monto: pago.monto, // Ya es número decimal (parseNumberVenezolano)
            tasa_cambio: pago.tasa_cambio,
            comprobante: pago.comprobante
        }));

        // Preparar datos de devoluciones (convertir formato venezolano a decimal para envío)
        const devolucionesParaEnviar = devoluciones.map(devolucion => ({
            metodo: devolucion.metodo,
            montoBs: devolucion.montoBs, // Ya es número decimal (parseNumberVenezolano)
            montoUsd: devolucion.montoUsd, // Ya es número decimal (parseNumberVenezolano)
            comprobante: devolucion.comprobante
        }));

        const ventaData = {
            cliente_cedula: clienteSeleccionado.cedula,
            tipo_venta: tipoVenta,
            productos: productosParaEnviar,
            pagos: pagosParaEnviar,
            devoluciones: devolucionesParaEnviar,
            abono_inicial: formatNumberVenezolano(totalPagado.toFixed(2)),
            metodo_pago_abono: 'efectivo_bs'
        };

        console.log('Enviando datos de venta:', ventaData);

        btnProcesarVenta.disabled = true;
        btnProcesarVenta.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        fetch('/ventas/procesar-venta/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(ventaData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let mensaje = '¡Venta registrada exitosamente!';
                
                if (parseFloat(data.cambio_bs) > 0) {
                    mensaje += `\nCambio devuelto: Bs ${formatNumberVenezolano(parseFloat(data.cambio_bs).toFixed(2))}`;
                    if (data.hay_devolucion_usd) {
                        mensaje += ` ($${formatNumberVenezolano(parseFloat(data.cambio_usd).toFixed(2))})`;
                    }
                }
                
                mostrarMensaje(mensaje, 'success');
                
                setTimeout(() => {
                    window.open(`/ventas/ver-comprobante/${data.venta_id}/`, '_blank');
                    setTimeout(() => {
                        window.location.href = menuVentasUrl;
                    }, 2000);
                }, 1000);
            } else {
                mostrarMensaje('Error: ' + data.error, 'error');
                btnProcesarVenta.disabled = false;
                btnProcesarVenta.innerHTML = '<i class="fas fa-check"></i> Procesar Venta';
            }
        })
        .catch(error => {
            console.error('Error procesando venta:', error);
            mostrarMensaje('Error al procesar la venta: ' + error.message, 'error');
            btnProcesarVenta.disabled = false;
            btnProcesarVenta.innerHTML = '<i class="fas fa-check"></i> Procesar Venta';
        });
    }

    // ===== UTILIDADES =====
    function mostrarMensaje(mensaje, tipo) {
        const messagesContainer = document.getElementById('messagesContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo === 'success' ? 'success' : tipo === 'warning' ? 'warning' : 'error'}`;
        alert.innerHTML = `
            <i class="fas fa-${tipo === 'success' ? 'check' : tipo === 'warning' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
            ${mensaje}
            <button class="close" onclick="this.parentElement.remove()">&times;</button>
        `;
        messagesContainer.appendChild(alert);

        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    function getCookie(name) {
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

    // ===== INICIALIZACIÓN =====
    function inicializar() {
        actualizarResumen();
        actualizarEstadoBotonProcesar();
        configurarEventos();
        inicializarValidacionCliente();
        
        console.log('Sistema de registro de ventas inicializado');
        console.log('Formato venezolano activado: puntos para miles, comas para decimales');
        console.log('Tasa actual:', tasaActual);
        
        if (!tasaActual || tasaActual <= 0) {
            mostrarMensaje('No hay tasa cambiaria configurada. No se pueden procesar ventas.', 'warning');
        }
    }

    // ===== INICIALIZAR LA APLICACIÓN =====
    inicializar();
});