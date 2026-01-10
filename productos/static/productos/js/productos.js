// productos.js - Funcionalidad completa para productos
document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const ubicacionInput = document.getElementById('ubicacionInput');
    const categoriaInput = document.getElementById('categoriaInput');
    const patologiaInput = document.getElementById('patologiaInput');
    const estadoSelect = document.getElementById('estadoSelect');
    const sujetoIvaSelect = document.getElementById('sujetoIvaSelect');
    const printBtn = document.getElementById('printBtn');

    // Elementos del modal de editar precio
    const modalEditarPrecio = document.getElementById('modalEditarPrecio');
    const btnCerrarModalPrecio = document.getElementById('btnCerrarModalPrecio');
    const btnCancelarPrecio = document.getElementById('btnCancelarPrecio');
    const btnGuardarPrecio = document.getElementById('btnGuardarPrecio');
    const nuevoPrecioVentaInput = document.getElementById('nuevoPrecioVenta');
    const productoIdPrecioInput = document.getElementById('productoIdPrecio');

    // Elementos del modal ver detalles
    const modalVerDetalles = document.getElementById('modalVerDetalles');
    const btnCerrarModalDetalles = document.getElementById('btnCerrarModalDetalles');
    const btnCerrarDetallesInfo = document.getElementById('btnCerrarDetallesInfo');
    const detalleNombre = document.getElementById('detalleNombre');
    const detalleSerial = document.getElementById('detalleSerial');
    const detalleStockMinimo = document.getElementById('detalleStockMinimo');

    // Contenedores de sugerencias para filtros
    const sugerenciasCategoriaFiltro = document.getElementById('sugerencias-categoria');
    const sugerenciasPatologiaFiltro = document.getElementById('sugerencias-patologia');
    const sugerenciasUbicacionFiltro = document.getElementById('sugerencias-ubicacion');

    let searchTimeout;

    // ===== FUNCIONES AUXILIARES =====

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

    // ===== FUNCIONES DE FORMATO VENEZOLANO =====
    function formatearNumeroVenezolano(numero, decimales = 2) {
        if (numero === null || numero === undefined || numero === '' || isNaN(numero)) {
            return '0,00';
        }
        const num = parseFloat(numero);
        const partes = Math.abs(num).toFixed(decimales).split('.');
        let parteEntera = partes[0];
        let parteDecimal = partes[1] || '00';
        if (parteDecimal.length === 1) parteDecimal += '0';
        parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const signo = num < 0 ? '-' : '';
        return `${signo}${parteEntera},${parteDecimal}`;
    }

    function formatearMonto(valor, conSimbolo = true) {
        const num = formatearNumeroVenezolano(valor);
        return conSimbolo ? `$ ${num}` : num;
    }

    // ===== VALIDACIÓN PARA FILTRO UBICACIÓN =====
    function inicializarValidacionUbicacionFiltro() {
        if (!ubicacionInput) return;

        // Restricción de tipeo - letras, números y espacios
        ubicacionInput.addEventListener('input', function () {
            // Convertir a mayúsculas
            this.value = this.value.toUpperCase();

            // Limitar a 50 caracteres
            if (this.value.length > 50) {
                this.value = this.value.substring(0, 50);
            }
        });
    }

    // ===== SISTEMA DE MODALES MEJORADO =====

    function mostrarModalExito(titulo, mensaje) {
        const modal = document.getElementById('successModal');
        const tituloElement = document.getElementById('successModalTitle');
        const mensajeElement = document.getElementById('successModalMessage');

        if (!modal || !tituloElement || !mensajeElement) {
            console.error('Elementos del modal no encontrados');
            alert(`${titulo}: ${mensaje}`);
            return;
        }

        tituloElement.textContent = titulo;
        mensajeElement.textContent = mensaje;
        modal.classList.add('active');

        crearHojasFlotantes(modal.querySelector('.modal-success'));

        setTimeout(() => {
            if (modal.classList.contains('active')) {
                cerrarModalExito();
            }
        }, 4000);
    }

    function mostrarModalEliminacion(titulo, mensaje) {
        const modal = document.getElementById('deleteModal');
        const tituloElement = document.getElementById('deleteModalTitle');
        const mensajeElement = document.getElementById('deleteModalMessage');

        if (!modal || !tituloElement || !mensajeElement) {
            console.error('Elementos del modal no encontrados');
            alert(`${titulo}: ${mensaje}`);
            return;
        }

        tituloElement.textContent = titulo;
        mensajeElement.textContent = mensaje;
        modal.classList.add('active');

        setTimeout(() => {
            if (modal.classList.contains('active')) {
                cerrarModalEliminacion();
            }
        }, 4000);
    }

    function mostrarModalError(titulo, mensaje) {
        const modal = document.getElementById('errorModal');
        const tituloElement = document.getElementById('errorModalTitle');
        const mensajeElement = document.getElementById('errorModalMessage');

        if (!modal || !tituloElement || !mensajeElement) {
            console.error('Elementos del modal de error no encontrados');
            alert(`ERROR: ${titulo} - ${mensaje}`);
            return;
        }

        tituloElement.textContent = titulo;
        mensajeElement.textContent = mensaje;
        modal.classList.add('active');

        setTimeout(() => {
            if (modal.classList.contains('active')) {
                cerrarModalError();
            }
        }, 5000);
    }

    function cerrarModalError() {
        const modal = document.getElementById('errorModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function mostrarConfirmacionAccion(mensaje, titulo = 'Confirmar Acción') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmDeleteModal');
            const mensajeElement = document.getElementById('confirmDeleteMessage');
            const botonConfirmar = document.getElementById('confirmDelete');
            const tituloElement = modal.querySelector('h2');

            if (!modal || !mensajeElement || !botonConfirmar) {
                console.error('Elementos del modal de confirmación no encontrados');
                resolve(confirm(mensaje));
                return;
            }

            tituloElement.textContent = titulo;
            mensajeElement.textContent = mensaje;
            botonConfirmar.textContent = 'Aceptar';

            modal.classList.add('active');

            const btnCancelar = document.getElementById('cancelDelete');

            const limpiarEventos = () => {
                btnCancelar.removeEventListener('click', onCancel);
                botonConfirmar.removeEventListener('click', onConfirm);
                modal.removeEventListener('click', onOutsideClick);
            };

            const onCancel = () => {
                cerrarModalConfirmacion();
                limpiarEventos();
                resolve(false);
            };

            const onConfirm = () => {
                cerrarModalConfirmacion();
                limpiarEventos();
                resolve(true);
            };

            const onOutsideClick = (e) => {
                if (e.target === modal) {
                    onCancel();
                }
            };

            btnCancelar.addEventListener('click', onCancel);
            botonConfirmar.addEventListener('click', onConfirm);
            modal.addEventListener('click', onOutsideClick);
        });
    }

    function cerrarModalExito() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function cerrarModalEliminacion() {
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function cerrarModalConfirmacion() {
        const modal = document.getElementById('confirmDeleteModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function crearHojasFlotantes(modalElement) {
        if (!modalElement) return;

        const colors = ['#4caf50', '#81c784', '#a5d6a7', '#66bb6a', '#8bc34a'];

        const existingLeaves = modalElement.querySelectorAll('.leaf');
        existingLeaves.forEach(leaf => leaf.remove());

        for (let i = 0; i < 12; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            leaf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            leaf.style.left = Math.random() * 80 + 10 + '%';
            leaf.style.top = Math.random() * 80 + 10 + '%';
            leaf.style.width = Math.random() * 20 + 10 + 'px';
            leaf.style.height = Math.random() * 20 + 10 + 'px';
            leaf.style.animation = `float ${Math.random() * 2 + 2}s ease-in-out forwards`;
            leaf.style.animationDelay = Math.random() * 1 + 's';

            modalElement.appendChild(leaf);
        }
    }

    // ===== INICIALIZACIÓN DE MODALES =====
    function inicializarModales() {
        const closeSuccessModal = document.getElementById('closeSuccessModal');
        const closeDeleteModal = document.getElementById('closeDeleteModal');
        const closeErrorModal = document.getElementById('closeErrorModal');

        if (closeSuccessModal) {
            closeSuccessModal.addEventListener('click', cerrarModalExito);
        }

        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', cerrarModalEliminacion);
        }

        if (closeErrorModal) {
            closeErrorModal.addEventListener('click', cerrarModalError);
        }

        const successModal = document.getElementById('successModal');
        const deleteModal = document.getElementById('deleteModal');
        const errorModal = document.getElementById('errorModal');

        if (successModal) {
            successModal.addEventListener('click', function (e) {
                if (e.target === this) cerrarModalExito();
            });
        }

        if (deleteModal) {
            deleteModal.addEventListener('click', function (e) {
                if (e.target === this) cerrarModalEliminacion();
            });
        }

        if (errorModal) {
            errorModal.addEventListener('click', function (e) {
                if (e.target === this) cerrarModalError();
            });
        }
    }

    function mostrarConfirmacion(mensaje, titulo = 'Confirmar Acción') {
        return mostrarConfirmacionAccion(mensaje, titulo);
    }

    // ===== FUNCIONALIDAD DE SUGERENCIAS PARA FILTROS =====

    function cargarSugerenciasCategoriasFiltro(query) {
        if (!query) {
            sugerenciasCategoriaFiltro.innerHTML = '';
            sugerenciasCategoriaFiltro.style.display = 'none';
            return;
        }

        fetch(CATEGORIAS_JSON_URL)
            .then(response => response.json())
            .then(data => {
                const sugerencias = data.filter(categoria =>
                    categoria.nombre.toLowerCase().includes(query.toLowerCase())
                );

                sugerenciasCategoriaFiltro.innerHTML = '';
                if (sugerencias.length === 0) {
                    const noResults = document.createElement('div');
                    noResults.className = 'sugerencia-item';
                    noResults.textContent = 'No se encontraron categorías';
                    noResults.style.color = 'var(--natural-gray)';
                    noResults.style.fontStyle = 'italic';
                    sugerenciasCategoriaFiltro.appendChild(noResults);
                } else {
                    sugerencias.forEach(categoria => {
                        const sugerencia = document.createElement('div');
                        sugerencia.className = 'sugerencia-item';
                        sugerencia.textContent = categoria.nombre;
                        sugerencia.setAttribute('data-categoria-nombre', categoria.nombre);

                        sugerencia.addEventListener('click', function () {
                            categoriaInput.value = categoria.nombre;
                            sugerenciasCategoriaFiltro.style.display = 'none';
                            filtrarProductos();
                        });

                        sugerenciasCategoriaFiltro.appendChild(sugerencia);
                    });
                }

                sugerenciasCategoriaFiltro.style.display = 'block';
            })
            .catch(error => {
                console.error('Error al cargar categorías:', error);
            });
    }

    function cargarSugerenciasPatologiasFiltro(query) {
        if (!query) {
            sugerenciasPatologiaFiltro.innerHTML = '';
            sugerenciasPatologiaFiltro.style.display = 'none';
            return;
        }

        fetch(PATOLOGIAS_JSON_URL)
            .then(response => response.json())
            .then(data => {
                const sugerencias = data.filter(patologia =>
                    patologia.nombre.toLowerCase().includes(query.toLowerCase())
                );

                sugerenciasPatologiaFiltro.innerHTML = '';
                if (sugerencias.length === 0) {
                    const noResults = document.createElement('div');
                    noResults.className = 'sugerencia-item';
                    noResults.textContent = 'No se encontraron patologías';
                    noResults.style.color = 'var(--natural-gray)';
                    noResults.style.fontStyle = 'italic';
                    sugerenciasPatologiaFiltro.appendChild(noResults);
                } else {
                    sugerencias.forEach(patologia => {
                        const sugerencia = document.createElement('div');
                        sugerencia.className = 'sugerencia-item';
                        sugerencia.textContent = patologia.nombre;
                        sugerencia.setAttribute('data-patologia-nombre', patologia.nombre);

                        sugerencia.addEventListener('click', function () {
                            patologiaInput.value = patologia.nombre;
                            sugerenciasPatologiaFiltro.style.display = 'none';
                            filtrarProductos();
                        });

                        sugerenciasPatologiaFiltro.appendChild(sugerencia);
                    });
                }

                sugerenciasPatologiaFiltro.style.display = 'block';
            })
            .catch(error => {
                console.error('Error al cargar patologías:', error);
            });
    }

    // ===== FUNCIONALIDAD DE SUGERENCIAS PARA UBICACIÓN =====

    function cargarSugerenciasUbicacionFiltro(query) {
        if (!query) {
            sugerenciasUbicacionFiltro.innerHTML = '';
            sugerenciasUbicacionFiltro.style.display = 'none';
            return;
        }

        fetch(UBICACIONES_JSON_URL)
            .then(response => response.json())
            .then(data => {
                const sugerencias = data.filter(ubicacion =>
                    ubicacion.nombre.toLowerCase().includes(query.toLowerCase())
                );

                sugerenciasUbicacionFiltro.innerHTML = '';
                if (sugerencias.length === 0) {
                    const noResults = document.createElement('div');
                    noResults.className = 'sugerencia-item';
                    noResults.textContent = 'No se encontraron ubicaciones';
                    noResults.style.color = 'var(--natural-gray)';
                    noResults.style.fontStyle = 'italic';
                    sugerenciasUbicacionFiltro.appendChild(noResults);
                } else {
                    sugerencias.forEach(ubicacion => {
                        const sugerencia = document.createElement('div');
                        sugerencia.className = 'sugerencia-item';
                        sugerencia.textContent = ubicacion.nombre;
                        sugerencia.setAttribute('data-ubicacion-nombre', ubicacion.nombre);

                        sugerencia.addEventListener('click', function () {
                            ubicacionInput.value = ubicacion.nombre;
                            sugerenciasUbicacionFiltro.style.display = 'none';
                            filtrarProductos();
                        });

                        sugerenciasUbicacionFiltro.appendChild(sugerencia);
                    });
                }

                sugerenciasUbicacionFiltro.style.display = 'block';
            })
            .catch(error => {
                console.error('Error al cargar ubicaciones:', error);
            });
    }

    // Event listeners para los inputs de categoría, patología y ubicación en filtros
    categoriaInput.addEventListener('input', function () {
        cargarSugerenciasCategoriasFiltro(this.value);
    });

    patologiaInput.addEventListener('input', function () {
        cargarSugerenciasPatologiasFiltro(this.value);
    });

    ubicacionInput.addEventListener('input', function () {
        cargarSugerenciasUbicacionFiltro(this.value);
    });

    // Ocultar sugerencias al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (!categoriaInput.contains(e.target) && !sugerenciasCategoriaFiltro.contains(e.target)) {
            sugerenciasCategoriaFiltro.style.display = 'none';
        }
        if (!patologiaInput.contains(e.target) && !sugerenciasPatologiaFiltro.contains(e.target)) {
            sugerenciasPatologiaFiltro.style.display = 'none';
        }
        if (!ubicacionInput.contains(e.target) && !sugerenciasUbicacionFiltro.contains(e.target)) {
            sugerenciasUbicacionFiltro.style.display = 'none';
        }
    });

    // ===== INICIALIZACIÓN DEL MODAL DE EDITAR PRECIO =====
    function inicializarModalPrecio() {
        function abrirModalEditarPrecio(productoId, precioActual) {
            productoIdPrecioInput.value = productoId;
            // Convert dot to comma for display
            nuevoPrecioVentaInput.value = precioActual.toString().replace('.', ',');
            modalEditarPrecio.style.display = 'flex';
            setTimeout(() => {
                modalEditarPrecio.style.opacity = '1';
            }, 10);
            nuevoPrecioVentaInput.focus();
            nuevoPrecioVentaInput.select();
        }

        function cerrarModalEditarPrecio() {
            modalEditarPrecio.style.opacity = '0';
            setTimeout(() => {
                modalEditarPrecio.style.display = 'none';
            }, 300);
            nuevoPrecioVentaInput.value = '';
            productoIdPrecioInput.value = '';
        }

        btnCerrarModalPrecio.addEventListener('click', cerrarModalEditarPrecio);
        btnCancelarPrecio.addEventListener('click', cerrarModalEditarPrecio);

        modalEditarPrecio.addEventListener('click', function (e) {
            if (e.target === modalEditarPrecio) {
                cerrarModalEditarPrecio();
            }
        });

        btnGuardarPrecio.addEventListener('click', function () {
            const productoId = productoIdPrecioInput.value;
            // Convert comma to dot before parsing for validation
            const nuevoPrecio = parseFloat(nuevoPrecioVentaInput.value.replace(',', '.'));

            if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
                mostrarModalError('Error', 'Por favor, ingrese un precio válido (mayor a 0).');
                return;
            }

            if (nuevoPrecio > 99999999.99) {
                mostrarModalError('Error', 'El precio no puede ser mayor a 99,999,999.99.');
                return;
            }

            fetch(`${ACTUALIZAR_PRECIO_URL}${productoId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    precio_venta: nuevoPrecio
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const celdaPrecio = document.querySelector(`.editable-precio[data-producto-id="${productoId}"]`);
                        if (celdaPrecio) {
                            celdaPrecio.textContent = formatearMonto(data.precio_venta);
                            celdaPrecio.setAttribute('data-precio-actual', data.precio_venta);
                        }

                        cerrarModalEditarPrecio();
                        mostrarModalExito('¡Éxito!', 'Precio actualizado correctamente');
                    } else {
                        mostrarModalError('Error', data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    mostrarModalError('Error', 'Error al actualizar el precio');
                });
        });

        document.addEventListener('click', function (e) {
            if (e.target.closest('.btn-edit-precio')) {
                const button = e.target.closest('.btn-edit-precio');
                const productoId = button.getAttribute('data-producto-id');
                const precioActual = button.closest('tr').querySelector('.editable-precio').getAttribute('data-precio-actual');
                abrirModalEditarPrecio(productoId, precioActual);
            }
        });
    }

    // ===== FUNCIONALIDAD PARA CAMBIAR ESTADO =====
    function inicializarCambioEstado() {
        async function cambiarEstadoProducto(productoId, estadoActual) {
            let mensajeConfirmacion;
            let accion;

            if (estadoActual === 'agotado') {
                accion = 'activar';
                mensajeConfirmacion = '¿Estás seguro de que deseas activar este producto?';
            } else if (estadoActual === 'activo') {
                accion = 'desactivar';
                mensajeConfirmacion = '¿Estás seguro de que deseas desactivar este producto?';
            } else {
                accion = 'activar';
                mensajeConfirmacion = '¿Estás seguro de que deseas activar este producto?';
            }

            const confirmado = await mostrarConfirmacion(mensajeConfirmacion, `Confirmar ${accion.charAt(0).toUpperCase() + accion.slice(1)}`);
            if (!confirmado) {
                return;
            }

            try {
                const response = await fetch(`${CAMBIAR_ESTADO_URL}${productoId}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    }
                });

                const data = await response.json();

                if (data.success) {
                    const fila = document.querySelector(`tr[data-producto-id="${productoId}"]`);
                    if (fila) {
                        const celdaEstado = fila.querySelector('td:nth-child(11) .status');
                        const botonEstado = fila.querySelector('.btn-cambiar-estado');
                        const iconoEstado = botonEstado.querySelector('i');

                        fila.setAttribute('data-estado', data.nuevo_estado);

                        celdaEstado.className = 'status ' +
                            (data.nuevo_estado === 'activo' ? 'status-active' :
                                data.nuevo_estado === 'inactivo' ? 'status-inactive' : 'status-agotado');
                        celdaEstado.textContent = data.nuevo_estado_display;

                        if (data.nuevo_estado === 'activo') {
                            iconoEstado.className = 'fas fa-toggle-on';
                        } else {
                            iconoEstado.className = 'fas fa-toggle-off';
                        }
                        botonEstado.setAttribute('data-estado-actual', data.nuevo_estado);

                        filtrarProductos();

                        mostrarModalExito('¡Éxito!', `Producto ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente`);
                    }
                } else {
                    mostrarModalError('Error', data.error);
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarModalError('Error', 'Error al cambiar el estado del producto');
            }
        }

        document.addEventListener('click', function (e) {
            const btnCambiarEstado = e.target.closest('.btn-cambiar-estado');
            if (btnCambiarEstado) {
                const productoId = btnCambiarEstado.getAttribute('data-producto-id');
                const estadoActual = btnCambiarEstado.getAttribute('data-estado-actual');
                cambiarEstadoProducto(productoId, estadoActual);
            }
        });
    }

    // ===== FUNCIONALIDAD DE BÚSQUEDA Y FILTROS =====
    function manejarFiltros() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filtrarProductos(); // Usar filtrado local en lugar de buscarProductos()
        }, 300);
    }

    searchInput.addEventListener('input', manejarFiltros);
    ubicacionInput.addEventListener('input', manejarFiltros);
    categoriaInput.addEventListener('input', manejarFiltros);
    patologiaInput.addEventListener('input', manejarFiltros);
    estadoSelect.addEventListener('change', manejarFiltros);
    sujetoIvaSelect.addEventListener('change', manejarFiltros);

    function buscarProductos() {
        const query = searchInput.value.trim();
        const ubicacion = ubicacionInput.value.trim();
        const categoria = categoriaInput.value.trim();
        const patologia = patologiaInput.value.trim();
        const estado = estadoSelect.value;
        const sujetoIva = sujetoIvaSelect.value;

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin"></i> Buscando productos...
                </td>
            </tr>
        `;

        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (ubicacion) params.append('ubicacion', ubicacion);
        if (categoria) params.append('categoria', categoria);
        if (patologia) params.append('patologia', patologia);
        if (estado) params.append('estado', estado);
        if (sujetoIva) params.append('sujeto_iva', sujetoIva);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `?${params.toString()}`, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    actualizarTabla(response.productos);
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                    location.reload();
                }
            } else {
                console.error('Error en la búsqueda:', xhr.status);
                location.reload();
            }
        };

        xhr.onerror = function () {
            console.error('Error de conexión');
            location.reload();
        };

        xhr.send();
    }

    function actualizarTabla(productos) {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (productos.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9">
                        <div class="no-results">
                            <i class="fas fa-search"></i>
                            <h3>No se encontraron productos</h3>
                            <p>Intenta con otros términos de búsqueda o ajusta los filtros</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        productos.forEach(producto => {
            const estadoClass = producto.estado_valor === 'activo' ? 'status-active' :
                producto.estado_valor === 'inactivo' ? 'status-inactive' : 'status-agotado';
            const stockActClass = producto.stock_actual === 0 ? 'status-inactive' :
                producto.stock_actual < 5 ? 'status-low' : 'status-active';

            const tr = document.createElement('tr');
            tr.setAttribute('data-producto-id', producto.id);
            tr.setAttribute('data-estado', producto.estado_valor);

            tr.innerHTML = `
                <td>${producto.nombre}</td>
                <td>${producto.categoria}</td>
                <td>${producto.patologia}</td>
                <td>${producto.sujeto_iva}</td>
                <td class="editable-precio" data-producto-id="${producto.id}" data-precio-actual="${producto.precio.replace('$', '')}">
                    ${producto.precio}
                </td>
                <td>${producto.ubicacion || '-'}</td>
                <td><span class="status ${stockActClass}">${producto.stock_actual} unidades</span></td>
                <td><span class="status ${estadoClass}">${producto.estado}</span></td>
                <td class="actions">
                    <a href="/productos/editar/${producto.id}/" class="btn-action btn-editar" title="Editar Producto">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button class="btn-action btn-ver-detalles" title="Ver Detalles" 
                        data-nombre="${producto.nombre}" 
                        data-serial="${producto.serial || ''}" 
                        data-ubicacion="${producto.ubicacion || '-'}"
                        data-stock-minimo="${producto.stock_minimo}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit-precio" title="Editar Precio" data-producto-id="${producto.id}">
                        <i class="fas fa-dollar-sign"></i>
                    </button>
                    <button class="btn-action btn-cambiar-estado" title="Cambiar Estado" data-producto-id="${producto.id}" data-estado-actual="${producto.estado_valor}">
                        <i class="fas fa-toggle-${producto.estado_valor === 'activo' ? 'on' : 'off'}"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });
    }

    function filtrarProductos() {
        const query = searchInput.value.trim().toLowerCase();
        const ubicacion = ubicacionInput.value.trim().toLowerCase();
        const categoria = categoriaInput.value.trim().toLowerCase();
        const patologia = patologiaInput.value.trim().toLowerCase();
        const estado = estadoSelect.value;
        const sujetoIva = sujetoIvaSelect.value;

        const rows = tableBody.querySelectorAll('tr');
        let visibleRows = 0;

        rows.forEach(row => {
            if (row.classList.contains('empty-row')) {
                row.style.display = visibleRows === 0 ? '' : 'none';
                return;
            }

            const nombre = row.cells[0].textContent.toLowerCase();
            const categoriaFila = row.cells[1].textContent.toLowerCase();
            const patologiaFila = row.cells[2].textContent.toLowerCase();
            const estadoFila = row.getAttribute('data-estado');
            const sujetoIvaFila = row.cells[3].textContent.trim();

            // ⚠️ IMPORTANTE: NO BORRAR ESTE CÓDIGO - Es necesario para los filtros
            // Obtener serial y ubicación del botón ver-detalles
            const btnDetalles = row.querySelector('.btn-ver-detalles');
            const serialFila = btnDetalles ? btnDetalles.getAttribute('data-serial').toLowerCase() : '';
            const ubicacionFila = btnDetalles ? btnDetalles.getAttribute('data-ubicacion').toLowerCase() : '';

            // Buscar en nombre o serial (query unificada)
            const coincideQuery = !query || nombre.includes(query) || serialFila.includes(query);

            // ⚠️ IMPORTANTE: Esta línea filtra por ubicación - NO CAMBIAR
            const coincideUbicacion = !ubicacion || (ubicacionFila && ubicacionFila !== '-' && ubicacionFila.includes(ubicacion));

            const coincideCategoria = !categoria || categoriaFila.includes(categoria);
            const coincidePatologia = !patologia || patologiaFila.includes(patologia);
            const coincideEstado = !estado || estadoFila === estado;
            const coincideSujetoIva = !sujetoIva ||
                (sujetoIva === 'si' && sujetoIvaFila === 'Sí') ||
                (sujetoIva === 'no' && sujetoIvaFila === 'No');

            if (coincideQuery && coincideUbicacion && coincideCategoria && coincidePatologia && coincideEstado && coincideSujetoIva) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });

        let emptyRow = tableBody.querySelector('.empty-row');

        if (visibleRows === 0) {
            if (!emptyRow) {
                emptyRow = document.createElement('tr');
                emptyRow.className = 'empty-row';
                emptyRow.innerHTML = `
                    <td colspan="9">
                        <div class="no-results">
                            <i class="fas fa-search-minus"></i>
                            <h3>No se encontraron productos</h3>
                            <p>Intenta ajustar los filtros de búsqueda para encontrar lo que necesitas</p>
                        </div>
                    </td>
                `;
                tableBody.appendChild(emptyRow);
            }
            emptyRow.style.display = '';
        } else {
            if (emptyRow) {
                emptyRow.style.display = 'none';
            }
        }
    }

    printBtn.addEventListener('click', function () {
        const query = searchInput.value.trim();
        const ubicacion = ubicacionInput.value.trim();
        const categoria = categoriaInput.value.trim();
        const patologia = patologiaInput.value.trim();
        const estado = estadoSelect.value;
        const sujetoIva = sujetoIvaSelect.value;

        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (ubicacion) params.append('ubicacion', ubicacion);
        if (categoria) params.append('categoria', categoria);
        if (patologia) params.append('patologia', patologia);
        if (estado) params.append('estado', estado);
        if (sujetoIva) params.append('sujeto_iva', sujetoIva);

        const pdfUrl = `/productos/generar-pdf/?${params.toString()}`;
        window.open(pdfUrl, '_blank');
    });

    // ===== FUNCIONALIDAD PARA VER DETALLES =====
    function inicializarVerDetalles() {
        function abrirModalDetalles(nombre, serial, stockMinimo) {
            detalleNombre.textContent = nombre;
            detalleSerial.textContent = serial || '-';

            // Usar singular o plural según la cantidad
            if (stockMinimo) {
                const cantidad = parseInt(stockMinimo);
                const texto = cantidad === 1 ? 'unidad' : 'unidades';
                detalleStockMinimo.textContent = `${cantidad} ${texto}`;
            } else {
                detalleStockMinimo.textContent = '-';
            }

            modalVerDetalles.classList.add('active');
        }

        function cerrarModalDetalles() {
            modalVerDetalles.classList.remove('active');
        }

        // Event delegation para botones de detalles
        document.addEventListener('click', function (e) {
            const btnDetalles = e.target.closest('.btn-ver-detalles');
            if (btnDetalles) {
                const nombre = btnDetalles.getAttribute('data-nombre');
                const serial = btnDetalles.getAttribute('data-serial');
                const stockMinimo = btnDetalles.getAttribute('data-stock-minimo');

                abrirModalDetalles(nombre, serial, stockMinimo);
            }
        });

        // Event listening para cerrar modal
        if (btnCerrarModalDetalles) {
            btnCerrarModalDetalles.addEventListener('click', cerrarModalDetalles);
        }

        if (btnCerrarDetallesInfo) {
            btnCerrarDetallesInfo.addEventListener('click', cerrarModalDetalles);
        }

        // Cerrar al hacer clic fuera
        if (modalVerDetalles) {
            modalVerDetalles.addEventListener('click', function (e) {
                if (e.target === this) {
                    cerrarModalDetalles();
                }
            });
        }
    }

    // ===== INICIALIZACIÓN =====
    function inicializar() {
        inicializarValidacionUbicacionFiltro();
        inicializarModalPrecio();
        inicializarCambioEstado();
        inicializarVerDetalles();
        inicializarModales();

        if (searchInput) {
            searchInput.focus();
        }

        console.log('Sistema de gestión de productos inicializado correctamente');
    }

    // Hacer funciones globales
    window.mostrarModalExito = mostrarModalExito;
    window.mostrarModalEliminacion = mostrarModalEliminacion;
    window.mostrarModalError = mostrarModalError;
    window.mostrarConfirmacion = mostrarConfirmacion;

    inicializar();
});