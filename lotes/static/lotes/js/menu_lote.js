// menu_lote.js - Sistema de filtros para lotes
document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const productoSearchInput = document.getElementById('productoSearchInput');
    const productoSuggestions = document.getElementById('productoSuggestions');
    const proveedorSearchInput = document.getElementById('proveedorSearchInput');
    const proveedorSuggestions = document.getElementById('proveedorSuggestions');
    const estadoSelect = document.getElementById('estadoSelect');

    let searchTimeout;
    let productoSeleccionado = '';
    let proveedorSeleccionado = '';

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

    // ===== RESTAURAR FILTROS DESDE URL =====
    function restaurarFiltrosDesdeURL() {
        const params = new URLSearchParams(window.location.search);

        // Restaurar búsqueda
        const query = params.get('q');
        if (query && searchInput) {
            searchInput.value = query;
        }

        // Restaurar estado
        const estado = params.get('estado');
        if (estado && estadoSelect) {
            estadoSelect.value = estado;
        }

        // Restaurar producto
        const productoId = params.get('producto');
        if (productoId) {
            productoSeleccionado = productoId;
            const productosData = window.productosData || [];
            const producto = productosData.find(p => p.id === productoId);
            if (producto && productoSearchInput) {
                productoSearchInput.value = producto.nombre;
            }
        }

        // Restaurar proveedor
        const proveedorId = params.get('proveedor');
        if (proveedorId) {
            proveedorSeleccionado = proveedorId;
            const proveedoresData = window.proveedoresData || [];
            const proveedor = proveedoresData.find(p => p.id === proveedorId);
            if (proveedor && proveedorSearchInput) {
                proveedorSearchInput.value = proveedor.nombre;
            }
        }
    }

    // ===== FUNCIÓN PARA REGRESAR A PÁGINA 1 Y APLICAR FILTROS =====
    function aplicarFiltrosYRegresarPagina1() {
        const params = new URLSearchParams();

        // Agregar filtros activos
        const query = searchInput ? searchInput.value.trim() : '';
        const estado = estadoSelect ? estadoSelect.value : '';

        if (query) params.append('q', query);
        if (productoSeleccionado) params.append('producto', productoSeleccionado);
        if (proveedorSeleccionado) params.append('proveedor', proveedorSeleccionado);
        if (estado) params.append('estado', estado);

        // Siempre regresar a página 1 (no agregar parámetro page)
        const nuevaURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.location.href = nuevaURL;
    }

    // ===== BÚSQUEDA POR CÓDIGO EN TIEMPO REAL (CLIENT-SIDE) =====
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filtrarLotesEnTiempoReal();
            }, 200); // Filtrado rápido en tiempo real
        });
    }

    // Función para filtrar lotes en tiempo real sin recargar la página
    function filtrarLotesEnTiempoReal() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const rows = tableBody.querySelectorAll('tr');
        let visibleRows = 0;

        rows.forEach(row => {
            if (row.classList.contains('empty-row') || row.classList.contains('no-resultados')) {
                row.style.display = 'none';
                return;
            }

            const btnDetalles = row.querySelector('.btn-ver-detalles');
            const codigoLote = btnDetalles ? btnDetalles.getAttribute('data-codigo').toLowerCase() : '';

            if (!query || codigoLote.includes(query)) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });

        // Mostrar/ocultar mensaje de no resultados
        const emptyRow = tableBody.querySelector('.empty-row:not(.no-resultados)');
        if (visibleRows === 0 && query) {
            mostrarMensajeNoResultados();
            if (emptyRow) emptyRow.style.display = 'none';
        } else {
            ocultarMensajeNoResultados();
            if (emptyRow && visibleRows === 0) {
                emptyRow.style.display = '';
            }
        }
    }

    function mostrarMensajeNoResultados() {
        let mensajeNoResultados = tableBody.querySelector('.no-resultados');
        if (!mensajeNoResultados) {
            mensajeNoResultados = document.createElement('tr');
            mensajeNoResultados.className = 'empty-row no-resultados';
            mensajeNoResultados.innerHTML = `
                <td colspan="7">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron lotes</h3>
                    <p>Intenta con otros términos de búsqueda</p>
                </td>
            `;
            tableBody.appendChild(mensajeNoResultados);
        }
        mensajeNoResultados.style.display = '';
    }

    function ocultarMensajeNoResultados() {
        const mensajeNoResultados = tableBody.querySelector('.no-resultados');
        if (mensajeNoResultados) {
            mensajeNoResultados.style.display = 'none';
        }
    }

    // ===== FILTRO POR ESTADO =====
    if (estadoSelect) {
        estadoSelect.addEventListener('change', function () {
            aplicarFiltrosYRegresarPagina1();
        });
    }

    // ===== SUGERENCIAS DE PRODUCTOS =====
    if (productoSearchInput && productoSuggestions) {
        productoSearchInput.addEventListener('input', function (e) {
            const query = e.target.value.trim();
            if (!query) {
                productoSuggestions.style.display = 'none';
                productoSeleccionado = '';
                aplicarFiltrosYRegresarPagina1();
                return;
            }

            const productosData = window.productosData || [];
            const sugerencias = productosData.filter(p =>
                p.nombre.toLowerCase().includes(query.toLowerCase())
            );

            productoSuggestions.innerHTML = '';

            if (sugerencias.length === 0) {
                productoSuggestions.innerHTML = '<div class="producto-suggestion no-results">No se encontraron productos</div>';
            } else {
                sugerencias.forEach(producto => {
                    const div = document.createElement('div');
                    div.className = 'producto-suggestion';
                    div.textContent = producto.nombre;
                    div.addEventListener('click', function () {
                        productoSearchInput.value = producto.nombre;
                        productoSeleccionado = producto.id;
                        productoSuggestions.style.display = 'none';
                        aplicarFiltrosYRegresarPagina1();
                    });
                    productoSuggestions.appendChild(div);
                });
            }

            productoSuggestions.style.display = 'block';
        });

        // Cerrar sugerencias al hacer clic fuera
        document.addEventListener('click', function (e) {
            if (!productoSearchInput.contains(e.target) && !productoSuggestions.contains(e.target)) {
                productoSuggestions.style.display = 'none';
            }
        });
    }

    // ===== SUGERENCIAS DE PROVEEDORES =====
    if (proveedorSearchInput && proveedorSuggestions) {
        proveedorSearchInput.addEventListener('input', function (e) {
            const query = e.target.value.trim();
            if (!query) {
                proveedorSuggestions.style.display = 'none';
                proveedorSeleccionado = '';
                aplicarFiltrosYRegresarPagina1();
                return;
            }

            const proveedoresData = window.proveedoresData || [];
            const sugerencias = proveedoresData.filter(p =>
                p.nombre.toLowerCase().includes(query.toLowerCase())
            );

            proveedorSuggestions.innerHTML = '';

            if (sugerencias.length === 0) {
                proveedorSuggestions.innerHTML = '<div class="proveedor-suggestion no-results">No se encontraron proveedores</div>';
            } else {
                sugerencias.forEach(proveedor => {
                    const div = document.createElement('div');
                    div.className = 'proveedor-suggestion';
                    div.textContent = proveedor.nombre;
                    div.addEventListener('click', function () {
                        proveedorSearchInput.value = proveedor.nombre;
                        proveedorSeleccionado = proveedor.id;
                        proveedorSuggestions.style.display = 'none';
                        aplicarFiltrosYRegresarPagina1();
                    });
                    proveedorSuggestions.appendChild(div);
                });
            }

            proveedorSuggestions.style.display = 'block';
        });

        // Cerrar sugerencias al hacer clic fuera
        document.addEventListener('click', function (e) {
            if (!proveedorSearchInput.contains(e.target) && !proveedorSuggestions.contains(e.target)) {
                proveedorSuggestions.style.display = 'none';
            }
        });
    }

    // ===== BOTÓN CAMBIAR ESTADO =====
    document.addEventListener('click', function (e) {
        if (e.target.closest('.btn-cambiar-estado')) {
            const button = e.target.closest('.btn-cambiar-estado');
            const loteId = button.getAttribute('data-lote-id');
            const estadoActual = button.getAttribute('data-estado-actual');

            const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
            const mensaje = `¿Estás seguro de que deseas ${nuevoEstado === 'inactivo' ? 'desactivar' : 'activar'} este lote?`;

            mostrarModalConfirmacion(mensaje, function (confirmado) {
                if (confirmado) {
                    fetch(`${CAMBIAR_ESTADO_URL}${loteId}/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCSRFToken()
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                location.reload();
                            } else {
                                mostrarModalError('Error', data.error);
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            mostrarModalError('Error', 'Error al cambiar el estado del lote');
                        });
                }
            });
        }
    });

    // ===== BOTÓN EDITAR COSTO =====
    document.addEventListener('click', function (e) {
        if (e.target.closest('.btn-edit-costo')) {
            const button = e.target.closest('.btn-edit-costo');
            const loteId = button.getAttribute('data-lote-id');
            const costoActual = button.closest('tr').querySelector('.editable-costo').getAttribute('data-costo-actual');

            mostrarModalEditarCosto(loteId, costoActual);
        }
    });

    // ===== BOTÓN VER DETALLES =====
    document.addEventListener('click', function (e) {
        if (e.target.closest('.btn-ver-detalles')) {
            const button = e.target.closest('.btn-ver-detalles');
            const codigo = button.getAttribute('data-codigo');
            const proveedor = button.getAttribute('data-proveedor');
            const costoTotal = button.getAttribute('data-costo-total');
            const producto = button.getAttribute('data-producto');

            mostrarModalDetalles(codigo, producto, proveedor, costoTotal);
        }
    });

    // ===== FUNCIONES DE MODALES =====
    function mostrarModalConfirmacion(mensaje, callback) {
        const modal = document.getElementById('confirmModal');
        const mensajeElement = document.getElementById('confirmModalMessage');
        const btnConfirmar = document.getElementById('confirmAction');
        const btnCancelar = document.getElementById('cancelConfirm');

        if (!modal || !mensajeElement || !btnConfirmar) {
            callback(confirm(mensaje));
            return;
        }

        mensajeElement.textContent = mensaje;
        modal.classList.add('active');

        const onConfirm = () => {
            modal.classList.remove('active');
            btnConfirmar.removeEventListener('click', onConfirm);
            btnCancelar.removeEventListener('click', onCancel);
            callback(true);
        };

        const onCancel = () => {
            modal.classList.remove('active');
            btnConfirmar.removeEventListener('click', onConfirm);
            btnCancelar.removeEventListener('click', onCancel);
            callback(false);
        };

        btnConfirmar.addEventListener('click', onConfirm);
        btnCancelar.addEventListener('click', onCancel);
    }

    function mostrarModalError(titulo, mensaje) {
        const modal = document.getElementById('errorModal');
        const tituloElement = document.getElementById('errorModalTitle');
        const mensajeElement = document.getElementById('errorModalMessage');
        const btnCerrar = document.getElementById('closeErrorModal');

        if (!modal || !tituloElement || !mensajeElement) {
            alert(`ERROR: ${titulo} - ${mensaje}`);
            return;
        }

        tituloElement.textContent = titulo;
        mensajeElement.textContent = mensaje;
        modal.classList.add('active');

        if (btnCerrar) {
            btnCerrar.addEventListener('click', () => modal.classList.remove('active'));
        }

        setTimeout(() => modal.classList.remove('active'), 5000);
    }

    function mostrarModalEditarCosto(loteId, costoActual) {
        const modal = document.getElementById('modalEditarCosto');
        const inputCosto = document.getElementById('nuevoCostoUnitario');
        const inputLoteId = document.getElementById('loteIdCosto');
        const btnGuardar = document.getElementById('btnGuardarCosto');
        const btnCancelar = document.getElementById('btnCancelarCosto');
        const btnCerrar = document.getElementById('btnCerrarModalCosto');

        if (!modal || !inputCosto) {
            const nuevoCosto = prompt('Ingrese el nuevo costo unitario:', costoActual);
            if (nuevoCosto !== null && nuevoCosto.trim() !== '') {
                actualizarCosto(loteId, parseFloat(nuevoCosto));
            }
            return;
        }

        inputLoteId.value = loteId;
        inputCosto.value = parseFloat(costoActual).toFixed(2);
        modal.style.display = 'flex';
        inputCosto.focus();
        inputCosto.select();

        const guardar = () => {
            const costo = parseFloat(inputCosto.value);
            if (isNaN(costo) || costo <= 0) {
                mostrarModalError('Error', 'Por favor, ingrese un costo válido mayor a 0');
                return;
            }
            modal.style.display = 'none';
            actualizarCosto(loteId, costo);
        };

        const cerrar = () => {
            modal.style.display = 'none';
        };

        btnGuardar.onclick = guardar;
        btnCancelar.onclick = cerrar;
        if (btnCerrar) btnCerrar.onclick = cerrar;
    }

    function actualizarCosto(loteId, costo) {
        fetch(`${ACTUALIZAR_COSTO_URL}${loteId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ costo_unitario: costo })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    mostrarModalError('Error', data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarModalError('Error', 'Error al actualizar el costo');
            });
    }

    function mostrarModalDetalles(codigo, producto, proveedor, costoTotal) {
        const modal = document.getElementById('modalVerDetalles');
        const detalleCodigo = document.getElementById('detalleCodigo');
        const detalleProducto = document.getElementById('detalleProducto');
        const detalleProveedor = document.getElementById('detalleProveedor');
        const detalleCostoTotal = document.getElementById('detalleCostoTotal');
        const btnCerrar = document.getElementById('btnCerrarModalDetalles');
        const btnCerrarInfo = document.getElementById('btnCerrarDetallesInfo');

        if (!modal) {
            alert(`Detalles del Lote\n\nCódigo: ${codigo}\nProducto: ${producto}\nProveedor: ${proveedor}\nCosto Total: $${costoTotal}`);
            return;
        }

        if (detalleCodigo) detalleCodigo.textContent = codigo;
        if (detalleProducto) detalleProducto.textContent = producto;
        if (detalleProveedor) detalleProveedor.textContent = proveedor;
        if (detalleCostoTotal) detalleCostoTotal.textContent = `$${costoTotal}`;

        modal.style.display = 'flex';

        const cerrar = () => {
            modal.style.display = 'none';
        };

        if (btnCerrar) btnCerrar.onclick = cerrar;
        if (btnCerrarInfo) btnCerrarInfo.onclick = cerrar;
        modal.onclick = (e) => {
            if (e.target === modal) cerrar();
        };
    }

    // ===== BOTÓN IMPRIMIR REPORTE =====
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            const params = new URLSearchParams();

            // Agregar filtros activos al PDF
            const query = searchInput ? searchInput.value.trim() : '';
            const estado = estadoSelect ? estadoSelect.value : '';

            if (query) params.append('q', query);
            if (productoSeleccionado) params.append('producto', productoSeleccionado);
            if (proveedorSeleccionado) params.append('proveedor', proveedorSeleccionado);
            if (estado) params.append('estado', estado);

            // Abrir PDF en nueva pestaña
            const pdfUrl = `/lotes/generar-pdf/?${params.toString()}`;
            window.open(pdfUrl, '_blank');
        });
    }

    // ===== INICIALIZACIÓN =====
    restaurarFiltrosDesdeURL();
    console.log('Sistema de filtros de lotes inicializado');
});
