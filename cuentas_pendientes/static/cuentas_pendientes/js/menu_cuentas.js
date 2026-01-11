// menu_cuentas.js - Funcionalidad para el menú de cuentas pendientes
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const searchInput = document.getElementById('searchInput');
    const estadoPagoSelect = document.getElementById('estadoPagoSelect');
    const btnGenerarReporte = document.getElementById('btnGenerarReporte');
    const tableBody = document.getElementById('tableBody');
    
    let searchTimeout;
    
    // Función para filtrar la tabla y actualizar paneles
    function filtrarTabla() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const estado = estadoPagoSelect ? estadoPagoSelect.value : '';
        
        const filas = tableBody.querySelectorAll('tr');
        let filasVisibles = 0;
        
        // Filtrar filas de la tabla (mantener comportamiento local)
        filas.forEach(fila => {
            if (fila.classList.contains('empty-row')) {
                fila.style.display = 'none';
                return;
            }
            
            // Obtener datos de la fila
            const clienteNombre = fila.cells[0].textContent.toLowerCase();
            const dias = parseInt(fila.getAttribute('data-dias') || 0);
            
            // Verificar filtros
            const coincideBusqueda = !query || 
                clienteNombre.includes(query);
            
            let coincideEstado = true;
            if (estado === 'alta') {
                coincideEstado = dias > 30;
            } else if (estado === 'media') {
                coincideEstado = dias >= 15 && dias <= 30;
            } else if (estado === 'baja') {
                coincideEstado = dias < 15;
            }
            
            // Aplicar filtros
            if (coincideBusqueda && coincideEstado) {
                fila.style.display = '';
                filasVisibles++;
            } else {
                fila.style.display = 'none';
            }
        });
        
        // Mostrar mensaje si no hay resultados en la tabla
        const emptyRow = tableBody.querySelector('.empty-row');
        const emptyRowFilter = tableBody.querySelector('.empty-row-filter');
        const hayFiltros = query || estado;
        
        // Ocultar siempre la fila empty original del template
        if (emptyRow) {
            emptyRow.style.display = 'none';
        }
        
        if (hayFiltros && filasVisibles === 0) {
            // Mostrar mensaje de filtros sin resultados
            if (emptyRowFilter) {
                emptyRowFilter.style.display = '';
            }
        } else {
            // Ocultar mensaje de filtros
            if (emptyRowFilter) {
                emptyRowFilter.style.display = 'none';
            }
        }

        
        // Llamar AJAX para actualizar paneles
        actualizarPanelesAjax(query, estado);
        
        // Actualizar indicadores de filtro
        actualizarIndicadoresFiltro();
    }
    
    // Función para actualizar paneles mediante AJAX
    function actualizarPanelesAjax(query, estado) {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (estado) params.set('estado', estado);
        
        fetch(`/cuentas_pendientes/api/filtrar/?${params.toString()}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Actualizar paneles de resumen
                actualizarPanelesResumen(data);
                
                // Actualizar Top 5
                actualizarTop5(data.top_5);
            }
        })
        .catch(error => {
            console.error('Error al actualizar paneles:', error);
        });
    }
    
    // Función para actualizar paneles de resumen
    function actualizarPanelesResumen(data) {
        const totalCuentasEl = document.getElementById('totalCuentas');
        const totalSaldoBsEl = document.getElementById('totalSaldoBs');
        const totalSaldoUsdEl = document.getElementById('totalSaldoUsd');
        const totalClientesEl = document.getElementById('totalClientes');
        const totalClientesSubEl = document.getElementById('totalClientesSub');
        
        if (totalCuentasEl) totalCuentasEl.textContent = data.total_cuentas;
        if (totalSaldoBsEl) totalSaldoBsEl.textContent = `Bs ${data.total_saldo_bs}`;
        if (totalSaldoUsdEl) totalSaldoUsdEl.textContent = `$ ${data.total_saldo_usd}`;
        if (totalClientesEl) totalClientesEl.textContent = data.total_clientes_deuda;
        if (totalClientesSubEl) totalClientesSubEl.textContent = `De ${data.total_clientes} clientes a crédito`;
    }
    
    // Función para actualizar Top 5
    function actualizarTop5(clientes) {
        const panelTop5 = document.querySelector('.panel-deudas-clientes .clientes-lista');
        if (!panelTop5) return;
        
        // Limpiar contenido actual
        panelTop5.innerHTML = '';
        
        if (!clientes || clientes.length === 0) {
            // Mostrar mensaje de estado vacío
            panelTop5.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No hay clientes que coincidan con los filtros aplicados</p>
                </div>
            `;
        } else {
            // Renderizar clientes
            clientes.forEach(cliente => {
                const clienteHtml = `
                    <div class="cliente-deuda-item">
                        <div class="cliente-info">
                            <strong>${cliente.nombre}</strong>
                            <small>${cliente.cedula}</small>
                        </div>
                        <div class="deuda-info">
                            <span class="deuda-total">Bs ${cliente.deuda_total_bs}</span>
                            <br><small class="text-muted">$ ${cliente.deuda_total_usd}</small>
                            <small>${cliente.ventas_pendientes} venta${cliente.ventas_pendientes !== 1 ? 's' : ''} pendiente${cliente.ventas_pendientes !== 1 ? 's' : ''}</small>
                        </div>
                        <div class="acciones-cliente">
                            <a href="${cliente.url_abono}"
                                class="btn-action btn-abonar" title="Gestionar Abono">
                                <i class="fas fa-money-bill"></i>
                            </a>
                        </div>
                    </div>
                `;
                panelTop5.insertAdjacentHTML('beforeend', clienteHtml);
            });
        }
    }

    
    // Función para actualizar indicadores visuales de filtro
    function actualizarIndicadoresFiltro() {
        const estado = estadoPagoSelect ? estadoPagoSelect.value : '';
        
        // Indicador de filtro de estado
        if (estadoPagoSelect && estadoPagoSelect.parentElement) {
            if (estado) {
                estadoPagoSelect.parentElement.classList.add('filtro-activo');
            } else {
                estadoPagoSelect.parentElement.classList.remove('filtro-activo');
            }
        }
    }
    
    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(filtrarTabla, 300);
        });
    }
    
    if (estadoPagoSelect) {
        estadoPagoSelect.addEventListener('change', filtrarTabla);
    }
    
    if (btnGenerarReporte) {
        btnGenerarReporte.addEventListener('click', function() {
            // Abrir reporte en nueva pestaña
            window.open("{% url 'cuentas_pendientes:reporte_cuentas' %}", '_blank');
        });
    }
    
    // Función para limpiar todos los filtros (ahora global)
    window.limpiarFiltros = function() {
        if (searchInput) searchInput.value = '';
        if (estadoPagoSelect) estadoPagoSelect.value = '';
        filtrarTabla();
    }

    
    // Inicializar
    actualizarIndicadoresFiltro();
    console.log('Sistema de cuentas pendientes inicializado');
});