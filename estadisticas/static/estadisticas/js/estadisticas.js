document.addEventListener('DOMContentLoaded', function () {
    initModals();
    initSearch();
    initCurrencyToggle();
    updatePrintUrls();
});

let currentFilterContext = null; // 'prod', 'cli', 'venc'
let currentFilterType = null; // 'past', 'future'
let currentSearchProd = '';
let currentSearchCli = '';
let currentSearchVenc = '';
let currentSearchCat = '';
let currentMonedaCli = 'bs';
let currentMonedaCat = 'bs';
let tasa_actual = 1; // Se actualizará desde el contexto

function initModals() {
    const modal = document.getElementById('modalFiltroFechas');
    const btnClose = document.getElementById('btnCerrarModal');
    const btnCancel = document.getElementById('btnCancelar');
    const btnApply = document.getElementById('btnAplicar');
    const errorMsg = document.getElementById('errorFechas');

    // Inputs de fecha
    const inputDesde = document.getElementById('fechaDesde');
    const inputHasta = document.getElementById('fechaHasta');

    // Referencias para actualizar botón de print al aplicar filtro
    let currentPrintBtn = null;
    let currentSubtitle = null;

    // Botones que abren el modal
    document.querySelectorAll('.btn-filter-date').forEach(btn => {
        btn.addEventListener('click', function () {
            currentFilterContext = this.dataset.context; // 'prod', 'cli', or 'venc'
            currentFilterType = this.dataset.type; // 'past' or 'future'

            // Guardar referencias para actualizar UI luego
            const card = this.closest('.stats-card');
            currentPrintBtn = card.querySelector('.btn-icon-card[title="Descargar PDF"]');
            currentSubtitle = card.querySelector('.filter-info');

            // Configurar fechas actuales en el modal
            const fechaIni = this.dataset.ini;
            const fechaFin = this.dataset.fin;

            inputDesde.value = fechaIni;
            inputHasta.value = fechaFin;

            // Limpiar errores previos
            errorMsg.style.display = 'none';
            inputDesde.classList.remove('input-error');
            inputHasta.classList.remove('input-error');

            // Configurar Restricciones de fecha (Min/Max)
            const hoy = new Date().toISOString().split('T')[0];

            if (currentFilterType === 'past') {
                // Pasado: Max = Hoy
                inputDesde.removeAttribute('min');
                inputHasta.removeAttribute('min');
                inputDesde.setAttribute('max', hoy);
                inputHasta.setAttribute('max', hoy);

                // Mostrar opciones rápidas correspondientes
                document.getElementById('opcionesPasado').style.display = 'flex';
                document.getElementById('opcionesFuturo').style.display = 'none';

            } else if (currentFilterType === 'future') {
                // Futuro: Min = Hoy.
                inputDesde.setAttribute('min', hoy);
                inputHasta.setAttribute('min', hoy);
                inputDesde.removeAttribute('max');
                inputHasta.removeAttribute('max');

                // Mostrar opciones rápidas correspondientes
                document.getElementById('opcionesPasado').style.display = 'none';
                document.getElementById('opcionesFuturo').style.display = 'flex';
            }

            // Cambiar título del modal
            const titles = {
                'prod': 'Filtrar Productos (Ventas Pasadas)',
                'cli': 'Filtrar Clientes (Ventas Pasadas)',
                'venc': 'Filtrar Vencimientos (Fechas Futuras)'
            };
            document.getElementById('modalTitulo').textContent = titles[currentFilterContext];

            // Mostrar modal
            modal.style.display = 'flex';
        });
    });

    // Validar fechas al cambiar input
    function validarFechas() {
        if (inputDesde.value && inputHasta.value) {
            const hoy = new Date().toISOString().split('T')[0];
            
            // Validar rango
            if (inputDesde.value > inputHasta.value) {
                errorMsg.style.display = 'flex';
                errorMsg.querySelector('span').textContent = 'La fecha final debe ser posterior a la inicial';
                inputHasta.classList.add('input-error');
                return false;
            } 
            
            // Validar futuro para contextos pasados (Ventas, Clientes)
            if (currentFilterType === 'past' && (inputDesde.value > hoy || inputHasta.value > hoy)) {
                errorMsg.style.display = 'flex';
                errorMsg.querySelector('span').textContent = 'No se pueden seleccionar fechas futuras para este reporte';
                if (inputDesde.value > hoy) inputDesde.classList.add('input-error');
                if (inputHasta.value > hoy) inputHasta.classList.add('input-error');
                return false;
            }

            // Si todo está bien
            errorMsg.style.display = 'none';
            inputDesde.classList.remove('input-error');
            inputHasta.classList.remove('input-error');
            return true;
        }
        return true;
    }

    inputDesde.addEventListener('change', validarFechas);
    inputHasta.addEventListener('change', validarFechas);

    // Cerrar modal
    const closeModal = () => {
        modal.style.display = 'none';
        currentFilterContext = null;
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    // Clic fuera del modal
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Botones rápidos
    document.querySelectorAll('.btn-opcion').forEach(btn => {
        btn.addEventListener('click', function () {
            const dias = parseInt(this.dataset.dias);
            const hoy = new Date();
            let fechaInicio = new Date();
            let fechaFin = new Date();

            if (currentFilterType === 'future') {
                // Para vencimiento (futuro)
                fechaInicio = hoy;
                fechaFin.setDate(hoy.getDate() + dias);
            } else {
                // Para ventas/clientes (pasado)
                fechaFin = hoy;
                fechaInicio.setDate(hoy.getDate() - dias);
            }

            inputDesde.value = formatDate(fechaInicio);
            inputHasta.value = formatDate(fechaFin);

            // Validar inmediatamente
            validarFechas();
        });
    });

    // Aplicar filtro (AJAX)
    if (btnApply) {
        btnApply.addEventListener('click', function () {
            const fechaDesde = inputDesde.value;
            const fechaHasta = inputHasta.value;

            if (!fechaDesde || !fechaHasta) {
                alert('Por favor seleccione ambas fechas');
                return;
            }

            if (!validarFechas()) {
                return; // Detener si hay error
            }

            // Preparar parámetros URL
            const url = new URL(window.location.href);
            const params = new URLSearchParams();

            // Solo establecemos el filtro que se está aplicando activamente
            if (currentFilterContext === 'prod') {
                params.set('filtro_prod', 'si');
                params.set('fecha_ini_prod', fechaDesde);
                params.set('fecha_fin_prod', fechaHasta);
            } else if (currentFilterContext === 'cli') {
                params.set('filtro_cli', 'si');
                params.set('fecha_ini_cli', fechaDesde);
                params.set('fecha_fin_cli', fechaHasta);
            } else if (currentFilterContext === 'venc') {
                params.set('filtro_venc', 'si');
                params.set('fecha_ini_venc', fechaDesde);
                params.set('fecha_fin_venc', fechaHasta);
            } else if (currentFilterContext === 'cat') {
                params.set('filtro_cat', 'si');
                params.set('fecha_ini_cat', fechaDesde);
                params.set('fecha_fin_cat', fechaHasta);
            }

            // Realizar petición AJAX
            const requestUrl = `${window.location.pathname}?${params.toString()}`;

            fetch(requestUrl, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(response => response.json())
                .then(data => {
                    // 1. Actualizar Listas DOM
                    updateList(data.productos, 'list-productos', 'no-prod', renderProductoItem);
                    updateList(data.clientes, 'list-clientes', 'no-cli', renderClienteItem);
                    updateList(data.vencimiento, 'list-vencimiento', 'no-venc', renderVencimientoItem);
                    updateList(data.categorias, 'list-categorias-panel', 'no-cat', renderCategoriaItem);

                    // 2. Actualizar textos de fechas en tarjetas
                    if (data.fechas) {
                        if (document.getElementById('info-prod')) document.getElementById('info-prod').textContent = data.fechas.prod;
                        if (document.getElementById('info-cli')) document.getElementById('info-cli').textContent = data.fechas.cli;
                        if (document.getElementById('info-venc')) document.getElementById('info-venc').textContent = data.fechas.venc;
                        if (document.getElementById('info-cat')) document.getElementById('info-cat').textContent = data.fechas.cat;
                    }

                    // 3. Actualizar metadatos de los botones (para futuras aperturas del modal)
                    const filterBtn = document.querySelector(`.btn-filter-date[data-context="${currentFilterContext}"]`);
                    if (filterBtn) {
                        filterBtn.dataset.ini = fechaDesde;
                        filterBtn.dataset.fin = fechaHasta;
                    }

                    // 4. Actualizar link del botón de imprimir activo
                    updatePrintUrls();

                    closeModal();
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Hubo un error al aplicar el filtro. Intente recargar la página.');
                });
        });
    }
}

// === FUNCIONALIDAD DE BÚSQUEDA ===
function initSearch() {
    const searchProd = document.getElementById('search-prod');
    const searchCli = document.getElementById('search-cli');
    const searchVenc = document.getElementById('search-venc');
    
    console.log('initSearch called', {searchProd, searchCli, searchVenc});
    
    if (searchProd) {
        currentSearchProd = searchProd.value;
        console.log('Search prod initialized with value:', currentSearchProd);
        searchProd.addEventListener('input', debounce(function() {
            currentSearchProd = this.value;
            console.log('Search prod changed to:', currentSearchProd);
            applyFilters('prod');
        }, 300));
    }
    
    if (searchCli) {
        currentSearchCli = searchCli.value;
        console.log('Search cli initialized with value:', currentSearchCli);
        searchCli.addEventListener('input', debounce(function() {
            currentSearchCli = this.value;
            console.log('Search cli changed to:', currentSearchCli);
            applyFilters('cli');
        }, 300));
    }
    
    if (searchVenc) {
        currentSearchVenc = searchVenc.value;
        console.log('Search venc initialized with value:', currentSearchVenc);
        searchVenc.addEventListener('input', debounce(function() {
            currentSearchVenc = this.value;
            console.log('Search venc changed to:', currentSearchVenc);
            applyFilters('venc');
        }, 300));
    }

    const searchCat = document.getElementById('search-cat-panel');
    if (searchCat) {
        currentSearchCat = searchCat.value;
        searchCat.addEventListener('input', debounce(function() {
            currentSearchCat = this.value;
            applyFilters('cat');
        }, 300));
    }
}

// === FUNCIONALIDAD DE TOGGLE DE MONEDA ===
function initCurrencyToggle() {
    // Top Clientes Toggle
    const toggleBtnCli = document.querySelector('.btn-toggle-moneda'); // Selector original para clientes
    if (toggleBtnCli) {
        currentMonedaCli = toggleBtnCli.dataset.moneda || 'bs';
        
        toggleBtnCli.addEventListener('click', function() {
            currentMonedaCli = currentMonedaCli === 'bs' ? 'usd' : 'bs';
            this.dataset.moneda = currentMonedaCli;
            updateToggleIcon(this, currentMonedaCli);
            applyFilters('cli');
        });
        // Init inicial
        updateToggleIcon(toggleBtnCli, currentMonedaCli);
    }

    // Top Categorías Toggle
    const toggleBtnCat = document.querySelector('.btn-toggle-moneda-cat');
    if (toggleBtnCat) {
        currentMonedaCat = toggleBtnCat.dataset.moneda || 'bs';
        
        toggleBtnCat.addEventListener('click', function() {
            currentMonedaCat = currentMonedaCat === 'bs' ? 'usd' : 'bs';
            this.dataset.moneda = currentMonedaCat;
            updateToggleIcon(this, currentMonedaCat);
            applyFilters('cat');
        });
        // Init inicial
        updateToggleIcon(toggleBtnCat, currentMonedaCat);
    }
}

function updateToggleIcon(btn, moneda) {
    if (moneda === 'usd') {
        btn.innerHTML = '<i class="fas fa-dollar-sign"></i>';
        btn.style.color = '#27ae60';
    } else {
        btn.innerHTML = 'Bs';
        btn.style.color = ''; // Reset
        btn.style.fontWeight = 'bold';
    }
}

// Función para aplicar filtros (búsqueda y moneda)
function applyFilters(context) {
    console.log('applyFilters called for context:', context);
    const params = new URLSearchParams();
    
    // Obtener fechas actuales de los botones de filtro
    const filterBtn = document.querySelector(`.btn-filter-date[data-context="${context}"]`);
    if (!filterBtn) return;
    
    const fechaIni = filterBtn.dataset.ini;
    const fechaFin = filterBtn.dataset.fin;
    
    // Configurar parámetros según el contexto
    if (context === 'prod') {
        params.set('fecha_ini_prod', fechaIni);
        params.set('fecha_fin_prod', fechaFin);
        if (currentSearchProd) params.set('search_prod', currentSearchProd);
    } else if (context === 'cli') {
        params.set('fecha_ini_cli', fechaIni);
        params.set('fecha_fin_cli', fechaFin);
        if (currentSearchCli) params.set('search_cli', currentSearchCli);
        params.set('moneda_cli', currentMonedaCli);
    } else if (context === 'venc') {
        params.set('fecha_ini_venc', fechaIni);
        params.set('fecha_fin_venc', fechaFin);
        if (currentSearchVenc) params.set('search_venc', currentSearchVenc);
    } else if (context === 'cat') {
        params.set('fecha_ini_cat', fechaIni);
        params.set('fecha_fin_cat', fechaFin);
        if (currentSearchCat) params.set('search_cat', currentSearchCat);
        params.set('moneda_cat', currentMonedaCat);
    }
    
    // Realizar petición AJAX
    const requestUrl = `${window.location.pathname}?${params.toString()}`;
    
    fetch(requestUrl, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Actualizar listas
        updateList(data.productos, 'list-productos', 'no-prod', renderProductoItem);
        updateList(data.clientes, 'list-clientes', 'no-cli', renderClienteItem);
        updateList(data.vencimiento, 'list-vencimiento', 'no-venc', renderVencimientoItem);
        
        // Renderizado especial para categorías que ahora dependen de moneda
        if (data.categorias) {
             const listEl = document.getElementById('list-categorias-panel');
             const emptyEl = document.getElementById('no-cat');
             // Paso explícitamente data.filtros.moneda_cat o currentMonedaCat
             const monedaRender = data.filtros && data.filtros.moneda_cat ? data.filtros.moneda_cat : currentMonedaCat;
             
             // Wrapper para pasar moneda al callback
             const renderCatWithCurrency = (item, rank) => renderCategoriaItem(item, rank, monedaRender);
             
             updateList(data.categorias, 'list-categorias-panel', 'no-cat', renderCatWithCurrency);
        }
        
        // Actualizar textos de fechas
        if (data.fechas) {
            if (document.getElementById('info-prod')) document.getElementById('info-prod').textContent = data.fechas.prod;
            if (document.getElementById('info-cli')) document.getElementById('info-cli').textContent = data.fechas.cli;
            if (document.getElementById('info-venc')) document.getElementById('info-venc').textContent = data.fechas.venc;
            if (document.getElementById('info-cat')) document.getElementById('info-cat').textContent = data.fechas.cat;
        }
        
        // Actualizar filtros desde respuesta
        if (data.filtros) {
            currentSearchProd = data.filtros.search_prod || '';
            currentSearchCli = data.filtros.search_cli || '';
            currentSearchVenc = data.filtros.search_venc || '';
            currentSearchCat = data.filtros.search_cat || '';
            currentMonedaCli = data.filtros.moneda_cli || 'bs';
            currentMonedaCat = data.filtros.moneda_cat || 'bs';
        }
        
        // Actualizar URLs de PDF
        updatePrintUrls();
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Actualizar URLs de los botones de imprimir
function updatePrintUrls() {
    // Productos
    const btnPrintProd = document.querySelector('.btn-print-prod');
    if (btnPrintProd) {
        const filterBtnProd = document.querySelector('.btn-filter-date[data-context="prod"]');
        if (filterBtnProd) {
            const url = new URL(btnPrintProd.href);
            url.searchParams.set('fecha_ini', filterBtnProd.dataset.ini);
            url.searchParams.set('fecha_fin', filterBtnProd.dataset.fin);
            if (currentSearchProd) url.searchParams.set('search', currentSearchProd);
            else url.searchParams.delete('search');
            btnPrintProd.href = url.toString();
        }
    }
    
    // Clientes - AÑADIDO MONEDA
    const btnPrintCli = document.querySelector('.btn-print-cli');
    if (btnPrintCli) {
        const filterBtnCli = document.querySelector('.btn-filter-date[data-context="cli"]');
        if (filterBtnCli) {
            const url = new URL(btnPrintCli.href);
            url.searchParams.set('fecha_ini', filterBtnCli.dataset.ini);
            url.searchParams.set('fecha_fin', filterBtnCli.dataset.fin);
            // Asegurar que pasamos la moneda actual
            url.searchParams.set('moneda', currentMonedaCli);
            
            if (currentSearchCli) url.searchParams.set('search', currentSearchCli);
            else url.searchParams.delete('search');
            
            btnPrintCli.href = url.toString();
        }
    }
    
    // Vencimiento
    const btnPrintVenc = document.querySelector('.btn-print-venc');
    if (btnPrintVenc) {
        const filterBtnVenc = document.querySelector('.btn-filter-date[data-context="venc"]');
        if (filterBtnVenc) {
            const url = new URL(btnPrintVenc.href);
            url.searchParams.set('fecha_ini', filterBtnVenc.dataset.ini);
            url.searchParams.set('fecha_fin', filterBtnVenc.dataset.fin);
            if (currentSearchVenc) url.searchParams.set('search', currentSearchVenc);
            else url.searchParams.delete('search');
            btnPrintVenc.href = url.toString();
        }
    }

    // Panel Top Categorías - AÑADIDO MONEDA
    const btnPrintCatPanel = document.getElementById('btn-print-categorias-panel');
    if (btnPrintCatPanel) {
        const filterBtnCat = document.querySelector('.btn-filter-date[data-context="cat"]');
        if (filterBtnCat) {
            // Reconstruimos URL base para asegurar limpieza
            let url = `/estadisticas/reporte/ventas-categoria/?modo=panel`;
            
            url += `&fecha_ini=${filterBtnCat.dataset.ini}`;
            url += `&fecha_fin=${filterBtnCat.dataset.fin}`;
            url += `&moneda=${currentMonedaCat}`;
            
            if (currentSearchCat) url += `&search_cat=${encodeURIComponent(currentSearchCat)}`;
            
            btnPrintCatPanel.href = url;
        }
    }
}

// Helpers para renderizado
function updateList(items, listId, emptyId, renderCallback) {
    const listEl = document.getElementById(listId);
    const emptyEl = document.getElementById(emptyId);

    // Limpiar lista actual
    listEl.innerHTML = '';

    if (!items || items.length === 0) {
        listEl.style.display = 'none';
        if (emptyEl) {
            emptyEl.style.display = 'block';
            const oldEmpty = listEl.parentNode.querySelector('.empty-state');
            if (oldEmpty) oldEmpty.style.display = 'none';
        }
    } else {
        listEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';
        const oldEmpty = listEl.parentNode.querySelector('.empty-state');
        if (oldEmpty) oldEmpty.style.display = 'none';

        // Agregar nuevos items
        items.forEach((item, index) => {
            const html = renderCallback(item, index + 1);
            listEl.insertAdjacentHTML('beforeend', html);
        });
    }
}

function renderProductoItem(item, rank) {
    return `
    <li class="ranking-item">
        <span class="rank-badge">${rank}</span>
        <div class="item-info">
            <span class="item-name">${item.nombre}</span>
            <span class="item-meta">ID: ${item.id}</span>
        </div>
        <div class="item-value">
            ${formatNumber(item.cantidad)} un.
        </div>
    </li>`;
}

function renderClienteItem(item, rank) {
    const moneda = item.moneda || currentMonedaCli;
    const simbolo = moneda === 'usd' ? '$' : 'Bs';
    return `
    <li class="ranking-item">
        <span class="rank-badge">${rank}</span>
        <div class="item-info">
            <span class="item-name">${item.nombre}</span>
            <span class="item-meta">${item.cedula}</span>
        </div>
        <div class="text-end">
            <div class="item-value" style="font-size: 0.9rem;">${item.compras} compras</div>
            <span class="item-meta">${simbolo} ${formatCurrency(item.total)}</span>
        </div>
    </li>`;
}

function renderVencimientoItem(item, rank) {
    return `
    <li class="ranking-item">
        <div class="item-info">
            <span class="item-name">${item.producto}</span>
            <span class="item-meta">Lote: ${item.lote} | Disp: ${item.disponible}</span>
        </div>
        <div class="text-end">
            <div class="item-value text-danger" style="color: var(--error-red);">${item.fecha}</div>
            <span class="item-meta">${item.tiempo}</span>
        </div>
    </li>`;
}

function renderCategoriaItem(item, rank, moneda = 'bs') {
    const simbolo = moneda === 'usd' ? '$' : 'Bs';
    return `
    <li class="ranking-item">
        <span class="rank-badge">${rank}</span>
        <div class="item-info">
            <span class="item-name">${item.nombre}</span>
        </div>
        <div class="text-end">
            <div class="item-value" style="font-size: 0.9rem;">${formatNumber(item.cantidad)} un.</div>
            <span class="item-meta">${simbolo} ${formatCurrency(item.total)}</span>
        </div>
    </li>`;
}

function formatNumber(num) {
    return new Intl.NumberFormat('es-VE').format(num);
}

function formatCurrency(num) {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Función debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
