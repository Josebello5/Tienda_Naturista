// ===== INICIALIZACIÓN Y DECLARACIÓN DE VARIABLES =====
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('productoForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Elementos del formulario
    const serial = document.getElementById('serial'); // Nuevo campo serial
    const categoriaBusqueda = document.getElementById('categoria_busqueda');
    const patologiaBusqueda = document.getElementById('patologia_busqueda');
    const sujetoIva = document.getElementById('sujeto_iva');
    const nombrePro = document.getElementById('nombre_pro');
    const ubicacion = document.getElementById('ubicacion');
    const stockMinimo = document.getElementById('stock_minimo');
    const descripcion = document.getElementById('descripcion');
    const precioVenta = document.getElementById('precio_venta');

    // Contenedores de sugerencias
    const sugerenciasCategoria = document.getElementById('sugerencias-categoria');
    const sugerenciasPatologia = document.getElementById('sugerencias-patologia');

    // Elementos de mensajes de error
    const errorSerial = document.getElementById('error-serial'); // Nuevo error serial
    const errorCategoriaBusqueda = document.getElementById('error-categoria_busqueda');
    const errorPatologiaBusqueda = document.getElementById('error-patologia_busqueda');
    const errorSujetoIva = document.getElementById('error-sujeto_iva');
    const errorNombrePro = document.getElementById('error-nombre_pro');
    const errorUbicacion = document.getElementById('error-ubicacion');
    const errorStockMinimo = document.getElementById('error-stock_minimo');
    const errorDescripcion = document.getElementById('error-descripcion');
    const errorPrecioVenta = document.getElementById('error-precio_venta');

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

    function toggleSubmitButton() {
        const camposObligatorios = [
            serial, // Agregar serial a campos obligatorios
            categoriaBusqueda,
            sujetoIva,
            nombrePro,
            ubicacion,
            stockMinimo,
            precioVenta
        ];

        const esValido = camposObligatorios.every(campo => {
            if (!campo) return false;
            return campo.classList.contains('is-valid');
        });

        if (patologiaBusqueda.value.trim() !== '' && patologiaBusqueda.classList.contains('is-invalid')) {
            submitButton.disabled = true;
            return;
        }

        submitButton.disabled = !esValido;
    }

    // ===== VALIDACIÓN MEJORADA PARA SERIAL =====
    function inicializarValidacionSerial() {
        if (!serial) return;

        // Restricción de tipeo - solo números
        serial.addEventListener('keypress', function (e) {
            const char = String.fromCharCode(e.keyCode || e.which);
            // Solo permitir números
            if (!/^[0-9]$/.test(char)) {
                e.preventDefault();
                return;
            }
            // Máximo 25 caracteres
            if (this.value.length >= 25) {
                e.preventDefault();
                return;
            }
        });

        // Validación en tiempo real
        serial.addEventListener('input', function () {
            // Solo permitir números
            this.value = this.value.replace(/[^0-9]/g, '');

            // Limitar a 25 caracteres
            if (this.value.length > 25) {
                this.value = this.value.substring(0, 25);
            }

            validarSerial();
            toggleSubmitButton();
        });

        // Validación al perder foco
        serial.addEventListener('blur', function () {
            validarSerial();
            toggleSubmitButton();
        });
    }

    // ===== SUGERENCIAS PARA CATEGORÍA Y PATOLOGÍA =====

    if (categoriaBusqueda && sugerenciasCategoria) {
        categoriaBusqueda.addEventListener('input', function (e) {
            const query = categoriaBusqueda.value.trim().toUpperCase();
            sugerenciasCategoria.innerHTML = '';

            if (!query) {
                sugerenciasCategoria.style.display = 'none';
                return;
            }

            const sugerencias = window.categoriasData.filter(categoria =>
                categoria.includes(query)
            );

            if (sugerencias.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'sugerencia-item';
                noResults.textContent = 'No se encontraron categorías. Escriba para crear una nueva.';
                noResults.style.color = 'var(--natural-gray)';
                noResults.style.fontStyle = 'italic';
                sugerenciasCategoria.appendChild(noResults);
            } else {
                sugerencias.forEach(categoria => {
                    const sugerencia = document.createElement('div');
                    sugerencia.className = 'sugerencia-item';
                    sugerencia.textContent = categoria;
                    sugerencia.setAttribute('data-categoria-nombre', categoria);

                    sugerencia.addEventListener('click', function () {
                        categoriaBusqueda.value = categoria;
                        sugerenciasCategoria.style.display = 'none';
                        validarCategoriaBusqueda();
                        toggleSubmitButton();
                    });

                    sugerenciasCategoria.appendChild(sugerencia);
                });
            }

            sugerenciasCategoria.style.display = 'block';
        });

        document.addEventListener('click', function (e) {
            if (categoriaBusqueda && !categoriaBusqueda.contains(e.target) &&
                sugerenciasCategoria && !sugerenciasCategoria.contains(e.target)) {
                sugerenciasCategoria.style.display = 'none';
            }
        });

        categoriaBusqueda.addEventListener('blur', function () {
            setTimeout(() => {
                validarCategoriaBusqueda();
                toggleSubmitButton();
            }, 200);
        });
    }

    if (patologiaBusqueda && sugerenciasPatologia) {
        patologiaBusqueda.addEventListener('input', function (e) {
            const query = patologiaBusqueda.value.trim().toUpperCase();
            sugerenciasPatologia.innerHTML = '';

            if (!query) {
                sugerenciasPatologia.style.display = 'none';
                return;
            }

            const sugerencias = window.patologiasData.filter(patologia =>
                patologia.includes(query)
            );

            if (sugerencias.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'sugerencia-item';
                noResults.textContent = 'No se encontraron patologías. Escriba para crear una nueva.';
                noResults.style.color = 'var(--natural-gray)';
                noResults.style.fontStyle = 'italic';
                sugerenciasPatologia.appendChild(noResults);
            } else {
                sugerencias.forEach(patologia => {
                    const sugerencia = document.createElement('div');
                    sugerencia.className = 'sugerencia-item';
                    sugerencia.textContent = patologia;
                    sugerencia.setAttribute('data-patologia-nombre', patologia);

                    sugerencia.addEventListener('click', function () {
                        patologiaBusqueda.value = patologia;
                        sugerenciasPatologia.style.display = 'none';
                        validarPatologiaBusqueda();
                        toggleSubmitButton();
                    });

                    sugerenciasPatologia.appendChild(sugerencia);
                });
            }

            sugerenciasPatologia.style.display = 'block';
        });

        document.addEventListener('click', function (e) {
            if (patologiaBusqueda && !patologiaBusqueda.contains(e.target) &&
                sugerenciasPatologia && !sugerenciasPatologia.contains(e.target)) {
                sugerenciasPatologia.style.display = 'none';
            }
        });

        patologiaBusqueda.addEventListener('blur', function () {
            setTimeout(() => {
                validarPatologiaBusqueda();
                toggleSubmitButton();
            }, 200);
        });
    }

    // ===== RESTRICCIONES DE TIPEO =====

    categoriaBusqueda.addEventListener('keypress', function (e) {
        const char = String.fromCharCode(e.keyCode || e.which);
        if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ]$/.test(char)) {
            e.preventDefault();
            return;
        }
        if (this.value.length >= 20) {
            e.preventDefault();
            return;
        }
    });

    patologiaBusqueda.addEventListener('keypress', function (e) {
        const char = String.fromCharCode(e.keyCode || e.which);
        if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ]$/.test(char)) {
            e.preventDefault();
            return;
        }
        if (this.value.length >= 20) {
            e.preventDefault();
            return;
        }
    });

    nombrePro.addEventListener('keypress', function (e) {
        const char = String.fromCharCode(e.keyCode || e.which);
        if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]$/.test(char)) {
            e.preventDefault();
            return;
        }
        // Máximo 30 caracteres (cambiado de 100)
        if (this.value.length >= 30) {
            e.preventDefault();
            return;
        }
    });

    stockMinimo.addEventListener('keypress', function (e) {
        const char = String.fromCharCode(e.keyCode || e.which);
        if (!/^[0-9]$/.test(char)) {
            e.preventDefault();
            return;
        }
        if (this.value.length >= 2) {
            e.preventDefault();
            return;
        }
    });

    precioVenta.addEventListener('keypress', function (e) {
        const char = String.fromCharCode(e.keyCode || e.which);
        const currentValue = this.value;

        if (!/^[0-9.]$/.test(char)) {
            e.preventDefault();
            return;
        }

        if (char === '.') {
            if (currentValue.includes('.')) {
                e.preventDefault();
                return;
            }
            if (currentValue === '') {
                e.preventDefault();
                return;
            }
        }

        if (/^[0-9]$/.test(char)) {
            if (currentValue.includes('.')) {
                const decimalPart = currentValue.split('.')[1];
                if (decimalPart && decimalPart.length >= 2) {
                    e.preventDefault();
                    return;
                }
            } else {
                const integerPart = currentValue;
                if (integerPart.length >= 4) {
                    e.preventDefault();
                    return;
                }
            }
        }
    });

    // ===== VALIDACIONES DE ENTRADA EN TIEMPO REAL =====

    // Nueva validación para serial
    inicializarValidacionSerial();

    categoriaBusqueda.addEventListener('input', function () {
        this.value = this.value.toUpperCase().replace(/\s/g, '');
        validarCategoriaBusqueda();
        toggleSubmitButton();
    });

    patologiaBusqueda.addEventListener('input', function () {
        this.value = this.value.toUpperCase().replace(/\s/g, '');
        validarPatologiaBusqueda();
        toggleSubmitButton();
    });

    nombrePro.addEventListener('input', function () {
        this.value = this.value.toUpperCase();
        validarNombrePro();
        toggleSubmitButton();
    });

    ubicacion.addEventListener('input', function () {
        // CORRECCIÓN: Convertir a mayúsculas automáticamente
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '');

        // Limitar a 15 caracteres
        if (this.value.length > 15) {
            this.value = this.value.substring(0, 15);
        }
        validarUbicacion();
        toggleSubmitButton();
    });

    stockMinimo.addEventListener('input', function () {
        validarStockMinimo();
        toggleSubmitButton();
    });

    precioVenta.addEventListener('input', function () {
        validarPrecioVenta();
        toggleSubmitButton();
    });

    sujetoIva.addEventListener('change', function () {
        validarSujetoIva();
        toggleSubmitButton();
    });

    // ===== FUNCIONES DE VALIDACIÓN POR CAMPO =====

    function validarSerial() {
        const val = serial.value.trim();
        if (val === '') {
            setInvalid(serial, errorSerial, "El serial es obligatorio.");
            return false;
        }
        if (!/^[0-9]+$/.test(val)) {
            setInvalid(serial, errorSerial, "El serial solo debe contener números.");
            return false;
        }
        if (val.length > 25) {
            setInvalid(serial, errorSerial, "El serial no puede tener más de 25 caracteres.");
            return false;
        }
        setValid(serial, errorSerial);
        return true;
    }

    function validarCategoriaBusqueda() {
        const val = categoriaBusqueda.value.trim();
        if (val === '') {
            setInvalid(categoriaBusqueda, errorCategoriaBusqueda, "La categoría es obligatoria.");
            return false;
        }
        if (val.includes(' ')) {
            setInvalid(categoriaBusqueda, errorCategoriaBusqueda, "La categoría no puede contener espacios.");
            return false;
        }
        if (!/^[A-Z]+$/.test(val)) {
            setInvalid(categoriaBusqueda, errorCategoriaBusqueda, "La categoría solo debe contener letras.");
            return false;
        }
        if (val.length > 20) {
            setInvalid(categoriaBusqueda, errorCategoriaBusqueda, "La categoría no puede tener más de 20 caracteres.");
            return false;
        }
        setValid(categoriaBusqueda, errorCategoriaBusqueda);
        return true;
    }

    function validarPatologiaBusqueda() {
        const val = patologiaBusqueda.value.trim();
        if (val === '') {
            patologiaBusqueda.classList.remove('is-invalid', 'is-valid');
            errorPatologiaBusqueda.textContent = '';
            errorPatologiaBusqueda.style.display = 'none';
            return true;
        }
        if (val.includes(' ')) {
            setInvalid(patologiaBusqueda, errorPatologiaBusqueda, "La patología no puede contener espacios.");
            return false;
        }
        if (!/^[A-Z]+$/.test(val)) {
            setInvalid(patologiaBusqueda, errorPatologiaBusqueda, "La patología solo debe contener letras.");
            return false;
        }
        if (val.length > 20) {
            setInvalid(patologiaBusqueda, errorPatologiaBusqueda, "La patología no puede tener más de 20 caracteres.");
            return false;
        }
        setValid(patologiaBusqueda, errorPatologiaBusqueda);
        return true;
    }

    function validarSujetoIva() {
        const val = sujetoIva.value;
        if (val === '') {
            setInvalid(sujetoIva, errorSujetoIva, "Debe seleccionar si está sujeto a IVA.");
            return false;
        }
        setValid(sujetoIva, errorSujetoIva);
        return true;
    }

    function validarNombrePro() {
        const val = nombrePro.value.trim();
        if (val === '') {
            setInvalid(nombrePro, errorNombrePro, "El nombre del producto es obligatorio.");
            return false;
        }
        if (!/^[A-Z0-9\s]+$/.test(val)) {
            setInvalid(nombrePro, errorNombrePro, "El nombre solo debe contener letras, números y espacios.");
            return false;
        }
        // Validar longitud máxima (30 caracteres)
        if (val.length > 30) {
            setInvalid(nombrePro, errorNombrePro, "El nombre no puede tener más de 30 caracteres.");
            return false;
        }
        setValid(nombrePro, errorNombrePro);
        return true;
    }

    function validarUbicacion() {
        const val = ubicacion.value.trim();
        if (val === '') {
            setInvalid(ubicacion, errorUbicacion, "La ubicación es obligatoria.");
            return false;
        }
        // CORRECCIÓN: Permitir letras mayúsculas, números y espacios
        if (!/^[A-Z0-9\s]+$/.test(val)) {
            setInvalid(ubicacion, errorUbicacion, "La ubicación solo puede contener letras, números y espacios.");
            return false;
        }
        if (val.length > 15) {
            setInvalid(ubicacion, errorUbicacion, "La ubicación no puede tener más de 15 caracteres.");
            return false;
        }
        setValid(ubicacion, errorUbicacion);
        return true;
    }

    function validarStockMinimo() {
        const val = stockMinimo.value.trim();
        if (val === '') {
            setInvalid(stockMinimo, errorStockMinimo, "El stock mínimo es obligatorio.");
            return false;
        }
        if (!/^\d+$/.test(val) || parseInt(val, 10) < 1) {
            setInvalid(stockMinimo, errorStockMinimo, "El stock mínimo debe ser un número entero mayor o igual a 1.");
            return false;
        }
        if (parseInt(val, 10) > 99) {
            setInvalid(stockMinimo, errorStockMinimo, "El stock mínimo no puede ser mayor a 99.");
            return false;
        }
        setValid(stockMinimo, errorStockMinimo);
        return true;
    }

    function validarPrecioVenta() {
        const val = precioVenta.value.trim();

        if (val === '') {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta es obligatorio.");
            return false;
        }

        if (!/^\d+(\.\d{0,2})?$/.test(val)) {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta debe contener solo números y un punto decimal.");
            return false;
        }

        const numericValue = parseFloat(val);
        if (isNaN(numericValue) || numericValue <= 0) {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta debe ser un número positivo.");
            return false;
        }

        const parts = val.split('.');
        if (parts[0].length > 4) {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta no puede tener más de 4 dígitos enteros.");
            return false;
        }

        if (parts.length > 1 && parts[1].length > 2) {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta no puede tener más de 2 decimales.");
            return false;
        }

        if (numericValue > 9999.99) {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta no puede ser mayor a 9999.99.");
            return false;
        }

        setValid(precioVenta, errorPrecioVenta);
        return true;
    }

    function validarDescripcion() {
        setValid(descripcion, errorDescripcion);
        return true;
    }

    // ===== VALIDACIÓN FINAL AL ENVIAR EL FORMULARIO =====

    form.addEventListener('submit', function (e) {
        const esValido =
            validarSerial() && // Agregar validación de serial
            validarCategoriaBusqueda() &&
            validarPatologiaBusqueda() &&
            validarSujetoIva() &&
            validarNombrePro() &&
            validarUbicacion() &&
            validarStockMinimo() &&
            validarPrecioVenta() &&
            validarDescripcion();

        if (!esValido) {
            e.preventDefault();

            const campos = [serial, categoriaBusqueda, patologiaBusqueda, sujetoIva, nombrePro, ubicacion, stockMinimo, precioVenta];
            for (let campo of campos) {
                if (campo.classList.contains('is-invalid')) {
                    campo.focus();
                    break;
                }
            }
        }
    });

    // ===== INICIALIZACIÓN =====

    // Validar campos que ya tienen valor inicial (por defecto o recarga)
    const camposParaValidarInicialmente = [
        { campo: serial, validador: validarSerial },
        { campo: categoriaBusqueda, validador: validarCategoriaBusqueda },
        { campo: patologiaBusqueda, validador: validarPatologiaBusqueda },
        { campo: sujetoIva, validador: validarSujetoIva },
        { campo: nombrePro, validador: validarNombrePro },
        { campo: ubicacion, validador: validarUbicacion },
        { campo: stockMinimo, validador: validarStockMinimo },
        { campo: precioVenta, validador: validarPrecioVenta }
    ];

    camposParaValidarInicialmente.forEach(item => {
        if (item.campo && item.campo.value.trim() !== '') {
            item.validador();
        }
    });

    toggleSubmitButton();

    console.log('Sistema de validación de productos inicializado correctamente');
});