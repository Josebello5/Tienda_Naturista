// editar_producto.js - Validación del formulario de edición de productos
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('productoForm');

    // Elementos del formulario
    const categoriaBusqueda = document.getElementById('categoria_busqueda');
    const patologiaBusqueda = document.getElementById('patologia_busqueda');
    const sujetoIva = document.getElementById('sujeto_iva');
    const nombrePro = document.getElementById('nombre_pro');
    const ubicacionBusqueda = document.getElementById('ubicacion_busqueda');
    const stockMinimo = document.getElementById('stock_minimo');
    const descripcion = document.getElementById('descripcion');
    const precioVenta = document.getElementById('precio_venta');

    // Contenedores de sugerencias
    const sugerenciasCategoria = document.getElementById('sugerencias-categoria');
    const sugerenciasPatologia = document.getElementById('sugerencias-patologia');
    const sugerenciasUbicacion = document.getElementById('sugerencias-ubicacion');

    // Elementos de mensajes de error
    const errorCategoriaBusqueda = document.getElementById('error-categoria_busqueda');
    const errorPatologiaBusqueda = document.getElementById('error-patologia_busqueda');
    const errorSujetoIva = document.getElementById('error-sujeto_iva');
    const errorNombrePro = document.getElementById('error-nombre_pro');
    const errorUbicacionBusqueda = document.getElementById('error-ubicacion_busqueda');
    const errorStockMinimo = document.getElementById('error-stock_minimo');
    const errorDescripcion = document.getElementById('error-descripcion');
    const errorPrecioVenta = document.getElementById('error-precio_venta');

    // ===== INICIALIZACIÓN =====

    // CORRECCIÓN: Asegurar que el precio se cargue correctamente al inicio
    function inicializarPrecio() {
        if (precioVenta && !precioVenta.value) {
            if (window.precioActual) {
                // Convert to string and replace dot with comma for display
                precioVenta.value = window.precioActual.toString().replace('.', ',');
            }
        }
    }

    // Inicializar al cargar la página
    inicializarPrecio();

    // ===== FUNCIONES DE MANEJO DE ESTADOS =====

    function setInvalid(input, errorDiv, message) {
        if (input && errorDiv) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    function setValid(input, errorDiv) {
        if (input && errorDiv) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
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
            }, 200);
        });
    }

    // ===== SUGERENCIAS PARA UBICACIÓN =====

    if (ubicacionBusqueda && sugerenciasUbicacion) {
        ubicacionBusqueda.addEventListener('input', function (e) {
            const query = ubicacionBusqueda.value.trim().toUpperCase();
            sugerenciasUbicacion.innerHTML = '';

            if (!query) {
                sugerenciasUbicacion.style.display = 'none';
                return;
            }

            const sugerencias = window.ubicacionesData.filter(ubicacion =>
                ubicacion.includes(query)
            );

            if (sugerencias.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'sugerencia-item';
                noResults.textContent = 'No se encontraron ubicaciones. Escriba para crear una nueva.';
                noResults.style.color = 'var(--natural-gray)';
                noResults.style.fontStyle = 'italic';
                sugerenciasUbicacion.appendChild(noResults);
            } else {
                sugerencias.forEach(ubicacion => {
                    const sugerencia = document.createElement('div');
                    sugerencia.className = 'sugerencia-item';
                    sugerencia.textContent = ubicacion;
                    sugerencia.setAttribute('data-ubicacion-nombre', ubicacion);

                    sugerencia.addEventListener('click', function () {
                        ubicacionBusqueda.value = ubicacion;
                        sugerenciasUbicacion.style.display = 'none';
                        validarUbicacionBusqueda();
                    });

                    sugerenciasUbicacion.appendChild(sugerencia);
                });
            }

            sugerenciasUbicacion.style.display = 'block';
        });

        document.addEventListener('click', function (e) {
            if (ubicacionBusqueda && !ubicacionBusqueda.contains(e.target) &&
                sugerenciasUbicacion && !sugerenciasUbicacion.contains(e.target)) {
                sugerenciasUbicacion.style.display = 'none';
            }
        });

        ubicacionBusqueda.addEventListener('blur', function () {
            setTimeout(() => {
                validarUbicacionBusqueda();
            }, 200);
        });
    }

    // ===== RESTRICCIONES DE TIPEO =====

    if (categoriaBusqueda) {
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
    }

    if (patologiaBusqueda) {
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
    }

    if (nombrePro) {
        nombrePro.addEventListener('keypress', function (e) {
            const char = String.fromCharCode(e.keyCode || e.which);
            if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]$/.test(char)) {
                e.preventDefault();
                return;
            }
            // Máximo 30 caracteres
            if (this.value.length >= 30) {
                e.preventDefault();
                return;
            }
        });
    }

    if (stockMinimo) {
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
    }

    if (precioVenta) {
        precioVenta.addEventListener('keypress', function (e) {
            const char = String.fromCharCode(e.keyCode || e.which);
            const currentValue = this.value;

            if (!/^[0-9,]$/.test(char)) {
                e.preventDefault();
                return;
            }

            if (char === ',') {
                if (currentValue.includes(',')) {
                    e.preventDefault();
                    return;
                }
                if (currentValue === '') {
                    e.preventDefault();
                    return;
                }
            }

            if (/^[0-9]$/.test(char)) {
                if (currentValue.includes(',')) {
                    const decimalPart = currentValue.split(',')[1];
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
    }

    // ===== VALIDACIONES DE ENTRADA EN TIEMPO REAL =====

    if (categoriaBusqueda) {
        categoriaBusqueda.addEventListener('input', function () {
            this.value = this.value.toUpperCase().replace(/\s/g, '');
            validarCategoriaBusqueda();
        });
    }

    if (patologiaBusqueda) {
        patologiaBusqueda.addEventListener('input', function () {
            this.value = this.value.toUpperCase().replace(/\s/g, '');
            validarPatologiaBusqueda();
        });
    }

    if (nombrePro) {
        nombrePro.addEventListener('input', function () {
            this.value = this.value.toUpperCase();
            validarNombrePro();
        });
    }

    if (ubicacionBusqueda) {
        ubicacionBusqueda.addEventListener('input', function () {
            this.value = this.value.toUpperCase();
            validarUbicacionBusqueda();
        });
    }

    if (stockMinimo) {
        stockMinimo.addEventListener('input', function () {
            validarStockMinimo();
        });
    }

    if (precioVenta) {
        precioVenta.addEventListener('input', function () {
            validarPrecioVenta();
        });
    }

    if (sujetoIva) {
        sujetoIva.addEventListener('change', function () {
            validarSujetoIva();
        });
    }

    // ===== FUNCIONES DE VALIDACIÓN POR CAMPO =====

    function validarCategoriaBusqueda() {
        if (!categoriaBusqueda || !errorCategoriaBusqueda) return true;

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
        if (!patologiaBusqueda || !errorPatologiaBusqueda) return true;

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
        if (!sujetoIva || !errorSujetoIva) return true;

        const val = sujetoIva.value;
        if (val === '') {
            setInvalid(sujetoIva, errorSujetoIva, "Debe seleccionar si está sujeto a IVA.");
            return false;
        }
        setValid(sujetoIva, errorSujetoIva);
        return true;
    }

    function validarNombrePro() {
        if (!nombrePro || !errorNombrePro) return true;

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

    function validarUbicacionBusqueda() {
        if (!ubicacionBusqueda || !errorUbicacionBusqueda) return true;

        const val = ubicacionBusqueda.value.trim();
        if (val === '') {
            setInvalid(ubicacionBusqueda, errorUbicacionBusqueda, "La ubicación es obligatoria.");
            return false;
        }
        // Permitir letras mayúsculas, números, espacios y guiones
        if (!/^[A-Z0-9\s\-]+$/.test(val)) {
            setInvalid(ubicacionBusqueda, errorUbicacionBusqueda, "La ubicación solo puede contener letras, números, espacios y guiones.");
            return false;
        }
        if (val.length > 50) {
            setInvalid(ubicacionBusqueda, errorUbicacionBusqueda, "La ubicación no puede tener más de 50 caracteres.");
            return false;
        }
        setValid(ubicacionBusqueda, errorUbicacionBusqueda);
        return true;
    }

    function validarStockMinimo() {
        if (!stockMinimo || !errorStockMinimo) return true;

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
        if (!precioVenta || !errorPrecioVenta) return true;

        const val = precioVenta.value.trim();

        if (val === '') {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta es obligatorio.");
            return false;
        }

        // CORRECCIÓN: Mejorar validación de precio
        const numericValue = parseFloat(val.replace(',', '.'));
        if (isNaN(numericValue) || numericValue <= 0) {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta debe ser un número positivo.");
            return false;
        }

        if (numericValue > 9999.99) {
            setInvalid(precioVenta, errorPrecioVenta, "El precio de venta no puede ser mayor a 9999,99.");
            return false;
        }

        // Validar formato decimal
        if (!/^\d+(,\d{0,2})?$/.test(val)) {
            setInvalid(precioVenta, errorPrecioVenta, "Formato de precio inválido. Use máximo 2 decimales.");
            return false;
        }

        setValid(precioVenta, errorPrecioVenta);
        return true;
    }

    function validarDescripcion() {
        if (!descripcion || !errorDescripcion) return true;

        setValid(descripcion, errorDescripcion);
        return true;
    }

    // ===== VALIDACIÓN FINAL AL ENVIAR EL FORMULARIO =====

    if (form) {
        form.addEventListener('submit', function (e) {
            // CORRECCIÓN: Asegurar que el precio esté presente antes de validar
            inicializarPrecio();

            const esValido =
                validarCategoriaBusqueda() &&
                validarPatologiaBusqueda() &&
                validarSujetoIva() &&
                validarNombrePro() &&
                validarUbicacionBusqueda() &&
                validarStockMinimo() &&
                validarPrecioVenta() &&
                validarDescripcion();

            if (!esValido) {
                e.preventDefault();

                // Enfocar el primer campo con error
                const campos = [categoriaBusqueda, patologiaBusqueda, sujetoIva, nombrePro, ubicacionBusqueda, stockMinimo, precioVenta];
                for (let campo of campos) {
                    if (campo && campo.classList.contains('is-invalid')) {
                        campo.focus();
                        break;
                    }
                }

                // Mostrar mensaje general de error
                const firstError = document.querySelector('.is-invalid');
                if (firstError) {
                    firstError.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }
        });
    }

    // ===== VALIDACIONES INICIALES =====

    // Realizar validaciones iniciales si hay valores cargados
    setTimeout(() => {
        if (categoriaBusqueda && categoriaBusqueda.value) validarCategoriaBusqueda();
        if (patologiaBusqueda && patologiaBusqueda.value) validarPatologiaBusqueda();
        if (sujetoIva && sujetoIva.value) validarSujetoIva();
        if (nombrePro && nombrePro.value) validarNombrePro();
        if (ubicacionBusqueda && ubicacionBusqueda.value) validarUbicacionBusqueda();
        if (stockMinimo && stockMinimo.value) validarStockMinimo();
        if (precioVenta && precioVenta.value) validarPrecioVenta();
    }, 100);

    console.log('Sistema de validación de edición de productos inicializado correctamente');
});