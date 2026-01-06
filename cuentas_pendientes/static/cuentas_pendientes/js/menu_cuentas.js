// menu_cuentas.js - Funcionalidad para el menú de cuentas pendientes
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const searchInput = document.getElementById('searchInput');
    const estadoPagoSelect = document.getElementById('estadoPagoSelect');
    const btnGenerarReporte = document.getElementById('btnGenerarReporte');
    const tableBody = document.getElementById('tableBody');
    
    let searchTimeout;
    
    // Función para filtrar la tabla
    function filtrarTabla() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const estado = estadoPagoSelect ? estadoPagoSelect.value : '';
        
        const filas = tableBody.querySelectorAll('tr');
        let filasVisibles = 0;
        
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
        
        // Mostrar mensaje si no hay resultados
        const emptyRow = tableBody.querySelector('.empty-row');
        const hayFiltros = query || estado;
        
        if (hayFiltros && filasVisibles === 0) {
            if (emptyRow) {
                emptyRow.style.display = '';
                emptyRow.innerHTML = `
                    <td colspan="5">
                        <i class="fas fa-search"></i>
                        <h3>No se encontraron clientes</h3>
                        <p>Intenta con otros términos de búsqueda</p>
                    </td>
                `;
            }
        } else if (emptyRow) {
            emptyRow.style.display = 'none';
        }
        
        // Actualizar indicadores de filtro
        actualizarIndicadoresFiltro();
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
    
    // Función para limpiar todos los filtros
    function limpiarFiltros() {
        if (searchInput) searchInput.value = '';
        if (estadoPagoSelect) estadoPagoSelect.value = '';
        filtrarTabla();
    }
    
    // Agregar botón de limpiar filtros (opcional)
    const toolbar = document.querySelector('.filtros-container');
    if (toolbar) {
        const limpiarBtn = document.createElement('button');
        limpiarBtn.className = 'btn btn-outline-secondary';
        limpiarBtn.innerHTML = '<i class="fas fa-times"></i> Limpiar';
        limpiarBtn.addEventListener('click', limpiarFiltros);
        toolbar.appendChild(limpiarBtn);
    }
    
    // Inicializar
    actualizarIndicadoresFiltro();
    console.log('Sistema de cuentas pendientes inicializado');
});