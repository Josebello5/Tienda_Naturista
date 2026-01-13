// menu_cuentas.js - Funcionalidad para el menú de cuentas pendientes
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const searchInput = document.getElementById('searchInput');
    const estadoPagoSelect = document.getElementById('estadoPagoSelect');
    const tipoClienteSelect = document.getElementById('tipoClienteSelect');
    const btnGenerarReporte = document.getElementById('btnGenerarReporte');
    const tableBody = document.getElementById('tableBody');
    
    let searchTimeout;
    
    // Función para filtrar la tabla y actualizar paneles
    function filtrarTabla() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const estado = estadoPagoSelect ? estadoPagoSelect.value : '';
        const tipoCliente = tipoClienteSelect ? tipoClienteSelect.value : '';
        
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
            const tipoClienteFila = fila.getAttribute('data-tipo-cliente') || '';
            
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
            
            const coincideTipoCliente = !tipoCliente || tipoClienteFila === tipoCliente;
            
            // Aplicar filtros
            if (coincideBusqueda && coincideEstado && coincideTipoCliente) {
                // fila.style.display = ''; // DELEGADO A PAGINACIÓN
                fila.classList.remove('filtro-oculto');
                filasVisibles++;
            } else {
                // fila.style.display = 'none'; // DELEGADO A PAGINACIÓN
                fila.classList.add('filtro-oculto');
                fila.style.display = 'none'; // Ocultar inmediatamente, paginación re-mostrará si es necesario (pero mejor ocultar aquí para evitar flash)
            }
        });
        
        // Mostrar mensaje si no hay resultados en la tabla
        const emptyRow = tableBody.querySelector('.empty-row');
        const emptyRowFilter = tableBody.querySelector('.empty-row-filter');
        const hayFiltros = query || estado || tipoCliente;
        
        // Ocultar siempre la fila empty original del template
        if (emptyRow) {
            emptyRow.style.display = 'none';
        }
        
        if (hayFiltros && filasVisibles === 0) {
            // Mostrar mensaje de filtros sin resultados
            if (emptyRowFilter) {
                emptyRowFilter.style.display = '';
            }
            if (paginationContainer) paginationContainer.style.display = 'none';
        } else {
            // Ocultar mensaje de filtros
            if (emptyRowFilter) {
                emptyRowFilter.style.display = 'none';
            }
            // Actualizar paginación
            paginaActual = 1; // Resetear a primera página al filtrar
            actualizarPaginacion();
        }

        
        // Llamar AJAX para actualizar paneles
        actualizarPanelesAjax(query, estado, tipoCliente);
        
        // Actualizar indicadores de filtro
        actualizarIndicadoresFiltro();
    }
    
    // Función para actualizar paneles mediante AJAX
    function actualizarPanelesAjax(query, estado, tipoCliente) {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (estado) params.set('estado', estado);
        if (tipoCliente) params.set('tipo_cliente', tipoCliente);
        
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
        const tipoCliente = tipoClienteSelect ? tipoClienteSelect.value : '';
        
        // Indicador de filtro de estado
        if (estadoPagoSelect && estadoPagoSelect.parentElement) {
            if (estado) {
                estadoPagoSelect.parentElement.classList.add('filtro-activo');
            } else {
                estadoPagoSelect.parentElement.classList.remove('filtro-activo');
            }
        }
        
        // Indicador de filtro de tipo de cliente
        if (tipoClienteSelect && tipoClienteSelect.parentElement) {
            if (tipoCliente) {
                tipoClienteSelect.parentElement.classList.add('filtro-activo');
            } else {
                tipoClienteSelect.parentElement.classList.remove('filtro-activo');
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
    
    if (tipoClienteSelect) {
        tipoClienteSelect.addEventListener('change', filtrarTabla);
    }
    
    if (btnGenerarReporte) {
        btnGenerarReporte.addEventListener('click', function() {
            // Capturar filtros actuales
            const query = searchInput ? searchInput.value.trim() : '';
            const estado = estadoPagoSelect ? estadoPagoSelect.value : '';
            const tipoCliente = tipoClienteSelect ? tipoClienteSelect.value : '';
            
            // Construir URL con parámetros
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (estado) params.append('estado', estado);
            if (tipoCliente) params.append('tipo_cliente', tipoCliente);
            
            // Abrir PDF en nueva pestaña
            const pdfUrl = `/cuentas_pendientes/generar-reporte/?${params.toString()}`;
            window.open(pdfUrl, '_blank');
        });
    }
    
    // Función para limpiar todos los filtros (ahora global)
    window.limpiarFiltros = function() {
        if (searchInput) searchInput.value = '';
        if (estadoPagoSelect) estadoPagoSelect.value = '';
        if (tipoClienteSelect) tipoClienteSelect.value = '';
        filtrarTabla();
    }

    // ===== PAGINACIÓN DEL LADO DEL CLIENTE =====
    const REGISTROS_POR_PAGINA = 6;
    let paginaActual = 1;
    let totalPaginas = 1;
    
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const btnPrimeraP = document.getElementById('btnPrimeraP');
    const btnAnteriorP = document.getElementById('btnAnteriorP');
    const btnSiguienteP = document.getElementById('btnSiguienteP');
    const btnUltimaP = document.getElementById('btnUltimaP');

    function actualizarPaginacion() {
        const todasLasFilas = tableBody.querySelectorAll('tr:not(.empty-row):not(.empty-row-filter)');
        // Filtrar solo las que son visibles por filtro (marcamos las visibles con data-filtro-visible)
        const filasVisibles = Array.from(todasLasFilas).filter(fila => !fila.classList.contains('filtro-oculto'));
        
        const totalRegistros = filasVisibles.length;
        totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA);
        
        if (totalPaginas <= 1) {
            if (paginationContainer) paginationContainer.style.display = 'none';
            filasVisibles.forEach(fila => fila.style.display = '');
            return;
        }
        
        if (paginationContainer) paginationContainer.style.display = 'flex';
        
        // Ajustar página actual
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;
        if (paginaActual < 1) paginaActual = 1;
        
        // Mostrar info
        if (paginationInfo) {
            paginationInfo.textContent = `Mostrando página ${paginaActual} de ${totalPaginas} (Total: ${totalRegistros} registros)`;
        }
        
        // Mostrar filas de la página actual
        const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
        const fin = inicio + REGISTROS_POR_PAGINA;
        
        filasVisibles.forEach((fila, index) => {
            if (index >= inicio && index < fin) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
        
        actualizarBotonesPaginacion();
    }

    function actualizarBotonesPaginacion() {
        if (btnPrimeraP) btnPrimeraP.style.display = paginaActual > 1 ? 'inline-block' : 'none';
        if (btnAnteriorP) btnAnteriorP.style.display = paginaActual > 1 ? 'inline-block' : 'none';
        if (btnSiguienteP) btnSiguienteP.style.display = paginaActual < totalPaginas ? 'inline-block' : 'none';
        if (btnUltimaP) btnUltimaP.style.display = paginaActual < totalPaginas ? 'inline-block' : 'none';
        
        if (paginationNumbers) {
            paginationNumbers.innerHTML = '';
            let inicio = Math.max(1, paginaActual - 2);
            let fin = Math.min(totalPaginas, paginaActual + 2);
            
            if (paginaActual <= 3) fin = Math.min(5, totalPaginas);
            if (paginaActual >= totalPaginas - 2) inicio = Math.max(1, totalPaginas - 4);
            
            for (let i = inicio; i <= fin; i++) {
                const btn = document.createElement('a');
                btn.href = '#';
                btn.innerText = i;
                btn.style.padding = '6px 12px';
                btn.style.border = '1px solid #dee2e6';
                btn.style.borderRadius = '4px';
                btn.style.textDecoration = 'none';
                btn.style.color = i === paginaActual ? 'white' : '#3A8C6E';
                btn.style.background = i === paginaActual ? '#3A8C6E' : 'white';
                
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    paginaActual = i;
                    actualizarPaginacion();
                });
                paginationNumbers.appendChild(btn);
            }
        }
    }

    // Listeners de navegación
    if (btnPrimeraP) btnPrimeraP.addEventListener('click', (e) => { e.preventDefault(); paginaActual = 1; actualizarPaginacion(); });
    if (btnAnteriorP) btnAnteriorP.addEventListener('click', (e) => { e.preventDefault(); paginaActual--; actualizarPaginacion(); });
    if (btnSiguienteP) btnSiguienteP.addEventListener('click', (e) => { e.preventDefault(); paginaActual++; actualizarPaginacion(); });
    if (btnUltimaP) btnUltimaP.addEventListener('click', (e) => { e.preventDefault(); paginaActual = totalPaginas; actualizarPaginacion(); });

    
    // Inicializar
    actualizarIndicadoresFiltro();
    filtrarTabla(); // Esto activará la paginación inicial
    console.log('Sistema de cuentas pendientes inicializado con paginación');
});