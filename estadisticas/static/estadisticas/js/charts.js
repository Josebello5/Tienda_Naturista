// charts.js - Manejo de gráficos interactivos con Chart.js

let chartVentas = null;
let chartProductos = null;
let chartCategorias = null;

document.addEventListener('DOMContentLoaded', function() {
    initChartTabs();
    initChartControls();
    loadInitialCharts();
    setupChartPdfButtons();
});

// ===== TABS DE GRÁFICOS =====
function initChartTabs() {
    const tabs = document.querySelectorAll('.chart-tab');
    const containers = document.querySelectorAll('.chart-container');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const chartType = this.dataset.chart;
            
            // Actualizar tabs activos
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar contenedor correspondiente
            containers.forEach(c => c.classList.remove('active'));
            document.getElementById(`chart-${chartType}`).classList.add('active');
        });
    });
}

// ===== CONTROLES DE GRÁFICOS =====
function initChartControls() {
    // Control de período para ventas (ya no auto-actualiza)
    const periodoSelect = document.getElementById('periodo-ventas');
    
    // Toggle de moneda para ventas
    const toggleVentas = document.getElementById('toggle-moneda-ventas');
    if (toggleVentas) {
        // Inicializar estado visual
        updateCurrencyButtonState(toggleVentas, toggleVentas.dataset.moneda);

        toggleVentas.addEventListener('click', function() {
            const currentMoneda = this.dataset.moneda;
            const newMoneda = currentMoneda === 'bs' ? 'usd' : 'bs';
            this.dataset.moneda = newMoneda;
            
            updateCurrencyButtonState(this, newMoneda);

            // Recargar gráfico y actualizar URLs
            loadChartVentas();
        });
    }
    
    // Botón actualizar ventas
    const btnVentas = document.getElementById('apply-ventas');
    if (btnVentas) {
        btnVentas.addEventListener('click', () => loadChartVentas());
    }
    
    // Botón actualizar productos
    const btnProductos = document.getElementById('apply-productos');
    if (btnProductos) {
        btnProductos.addEventListener('click', () => loadChartProductos());
    }
    
    // Toggle de moneda para categorías
    const toggleCategorias = document.getElementById('toggle-moneda-categorias');
    if (toggleCategorias) {
        // Inicializar estado visual
        updateCurrencyButtonState(toggleCategorias, toggleCategorias.dataset.moneda);

        toggleCategorias.addEventListener('click', function() {
            const currentMoneda = this.dataset.moneda;
            const newMoneda = currentMoneda === 'bs' ? 'usd' : 'bs';
            this.dataset.moneda = newMoneda;
            
            updateCurrencyButtonState(this, newMoneda);

            // Recargar gráfico inmediatamente
            loadChartCategorias();
        });
    }
    
    // Botón actualizar categorías
    const btnCategorias = document.getElementById('apply-categorias');
    if (btnCategorias) {
        btnCategorias.addEventListener('click', () => loadChartCategorias());
    }
    
    // Sincronizar período con fechas
    if (periodoSelect) {
        periodoSelect.addEventListener('change', function() {
            syncPeriodDates(this.value);
        });
    }

    // Agregar validaciones de fecha onchange
    setupDateValidations();
    
    // Inicializar fechas por defecto
    initDefaultDates();
}

/**
 * Actualiza el estado visual del botón de moneda
 * Oculta el icono de dólar si es Bs
 */
function updateCurrencyButtonState(button, moneda) {
    const icon = button.querySelector('i');
    const span = button.querySelector('span');
    
    if (moneda === 'bs') {
        if (icon) icon.style.display = 'none';
        if (span) span.textContent = 'Bs';
    } else {
        if (icon) icon.style.display = 'inline-block';
        if (span) span.textContent = 'USD';
    }
}

function setupDateValidations() {
    const dateInputs = document.querySelectorAll('.chart-date');
    const today = new Date().toISOString().split('T')[0];

    dateInputs.forEach(input => {
        // Restringir a máximo hoy para todos los gráficos de ventas/pasados
        input.setAttribute('max', today);

        input.addEventListener('change', function() {
            const container = this.closest('.chart-controls');
            if (!container) return;

            const ini = container.querySelector('input[id^="fecha-ini"]');
            const fin = container.querySelector('input[id^="fecha-fin"]');

            if (ini && fin && ini.value && fin.value) {
                if (ini.value > fin.value) {
                    if (this === ini) {
                        fin.value = ini.value;
                    } else {
                        ini.value = fin.value;
                    }
                }
            }
            
            // Si es el gráfico de ventas, quitar selección de período si no coincide?
            // Por ahora solo validamos que sea coherente
        });
    });
}

function syncPeriodDates(periodo) {
    const today = new Date();
    let startDate = new Date();

    if (periodo === 'dia') {
        startDate.setDate(today.getDate() - 7); // 7 días para ver x día
    } else if (periodo === 'semana') {
        startDate.setDate(today.getDate() - 30); // 30 días para ver x semana
    } else if (periodo === 'mes') {
        startDate.setMonth(today.getMonth() - 6); // 6 meses para ver x mes
    }

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const iniVentas = document.getElementById('fecha-ini-ventas');
    const finVentas = document.getElementById('fecha-fin-ventas');

    if (iniVentas) iniVentas.value = formatDate(startDate);
    if (finVentas) finVentas.value = formatDate(today);
    
    // Recargar gráfico si cambian las fechas por el periodo
    loadChartVentas();
}

function initDefaultDates() {
    // Ya no inicializamos fechas por defecto, usuario decide.
    // Solo configuramos los botones rápidos
    const quickButtons = document.querySelectorAll('.btn-quick');
    quickButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.dataset.target;
            const range = this.dataset.range;
            applyQuickFilter(target, range);
        });
    });
}

function applyQuickFilter(target, range) {
    const today = new Date();
    const iniInput = document.getElementById(`fecha-ini-${target}`);
    const finInput = document.getElementById(`fecha-fin-${target}`);
    
    if (!iniInput || !finInput) return;
    
    let startDate = new Date(today);
    
    if (range === 'hoy') {
        // Mismo día
    } else if (range === 'semana') {
        startDate.setDate(today.getDate() - 7);
    } else if (range === 'mes') {
        startDate.setMonth(today.getMonth() - 1);
    } else if (range === 'anio') {
        startDate.setFullYear(today.getFullYear() - 1);
    }
    
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    
    iniInput.value = formatDate(startDate);
    finInput.value = formatDate(today);
    
    // Disparar evento change para validaciones
    iniInput.dispatchEvent(new Event('change'));
    finInput.dispatchEvent(new Event('change'));
    
    // Recargar gráfico específico
    if (target === 'ventas') loadChartVentas();
    if (target === 'productos') loadChartProductos();
    if (target === 'categorias') loadChartCategorias();
}

// ===== CARGAR GRÁFICOS INICIALES =====
function loadInitialCharts() {
    loadChartVentas();
    loadChartProductos();
    loadChartCategorias();
}

// ===== GRÁFICO DE VENTAS EN EL TIEMPO =====
function loadChartVentas() {
    const periodo = document.getElementById('periodo-ventas').value;
    const moneda = document.getElementById('toggle-moneda-ventas').dataset.moneda;
    const fechaIni = document.getElementById('fecha-ini-ventas').value;
    const fechaFin = document.getElementById('fecha-fin-ventas').value;
    
    
    let url = `/estadisticas/api/ventas-tiempo/?periodo=${periodo}&moneda=${moneda}`;
    if (fechaIni && fechaFin) {
        url += `&fecha_ini=${fechaIni}&fecha_fin=${fechaFin}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                return;
            }
            renderChartVentas(data);
        })
        .catch(error => console.error('Error:', error));
}

function renderChartVentas(data) {
    const ctx = document.getElementById('canvas-ventas');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (chartVentas) {
        chartVentas.destroy();
    }
    
    const monedaLabel = data.moneda === 'usd' ? 'USD' : 'Bs';
    const color = data.moneda === 'usd' ? '#3498B5' : '#3A8C6E';
    
    // Asegurar que el dataset tenga datos válidos
    const chartData = data.data.map(val => val !== null ? val : 0);
    
    chartVentas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: `Ventas (${monedaLabel})`,
                data: chartData,
                borderColor: color,
                backgroundColor: color + '40', // Aumentar opacidad a 40 hex (aprox 25%)
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `${monedaLabel} ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: Math.max(...data.data) * 1.1,
                    ticks: {
                        callback: function(value) {
                            return monedaLabel + ' ' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== GRÁFICO DE TOP PRODUCTOS =====
function loadChartProductos() {
    const fechaIni = document.getElementById('fecha-ini-productos').value;
    const fechaFin = document.getElementById('fecha-fin-productos').value;
    
    
    const url = `/estadisticas/api/top-productos/?fecha_ini=${fechaIni}&fecha_fin=${fechaFin}&limit=10`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                return;
            }
            renderChartProductos(data);
        })
        .catch(error => console.error('Error:', error));
}

function renderChartProductos(data) {
    const ctx = document.getElementById('canvas-productos');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (chartProductos) {
        chartProductos.destroy();
    }
    
    // Generar colores en gradiente verde
    const colors = data.data.map((_, index) => {
        const intensity = 1 - (index / data.data.length) * 0.5;
        return `rgba(58, 140, 110, ${intensity})`;
    });
    
    chartProductos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Cantidad Vendida',
                data: data.data,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.', '1.')),
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.x} unidades`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== GRÁFICO DE VENTAS POR CATEGORÍA =====
function loadChartCategorias() {
    const fechaIni = document.getElementById('fecha-ini-categorias').value;
    const fechaFin = document.getElementById('fecha-fin-categorias').value;
    const moneda = document.getElementById('toggle-moneda-categorias').dataset.moneda;
    
    
    const url = `/estadisticas/api/ventas-categoria/?fecha_ini=${fechaIni}&fecha_fin=${fechaFin}&moneda=${moneda}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                return;
            }
            renderChartCategorias(data);
        })
        .catch(error => console.error('Error:', error));
}

function renderChartCategorias(data) {
    const ctx = document.getElementById('canvas-categorias');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (chartCategorias) {
        chartCategorias.destroy();
    }
    
    const monedaLabel = data.moneda === 'usd' ? 'USD' : 'Bs';
    
    // Paleta de colores naturales
    const colorPalette = [
        '#3A8C6E', // Verde principal
        '#5CB85C', // Verde claro
        '#8DC26F', // Verde lima
        '#3498B5', // Azul
        '#F39C12', // Naranja
        '#E74C3C', // Rojo
        '#9B59B6', // Púrpura
        '#1ABC9C', // Turquesa
        '#34495E', // Gris oscuro
        '#16A085'  // Verde azulado
    ];
    
    const colors = data.labels.map((_, index) => colorPalette[index % colorPalette.length]);
    
    // Calcular el máximo para ajustar el eje Y
    const maxValue = Math.max(...data.data);
    const suggestedMax = maxValue * 1.1; // 10% más que el máximo
    
    chartCategorias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: `Ventas (${monedaLabel})`,
                data: data.data,
                backgroundColor: colors.map(c => c + '80'),
                borderColor: colors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `${monedaLabel} ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: suggestedMax,
                    ticks: {
                        callback: function(value) {
                            return monedaLabel + ' ' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== CONFIGURAR BOTONES DE PDF CON GRÁFICOS =====
function setupChartPdfButtons() {
    // Botón de Ventas en el Tiempo
    const btnPrintVentas = document.getElementById('btn-print-ventas');
    if (btnPrintVentas) {
        // Remover listeners anteriores
        const newBtn = btnPrintVentas.cloneNode(true);
        btnPrintVentas.parentNode.replaceChild(newBtn, btnPrintVentas);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generateChartPdf('ventas', chartVentas);
        });
    }
    
    // Botón de Top Productos
    const btnPrintProd = document.getElementById('btn-print-productos');
    if (btnPrintProd) {
        const newBtn = btnPrintProd.cloneNode(true);
        btnPrintProd.parentNode.replaceChild(newBtn, btnPrintProd);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generateChartPdf('productos', chartProductos);
        });
    }
    
    // Botón de Categorías
    const btnPrintCat = document.getElementById('btn-print-categorias');
    if (btnPrintCat) {
        const newBtn = btnPrintCat.cloneNode(true);
        btnPrintCat.parentNode.replaceChild(newBtn, btnPrintCat);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generateChartPdf('categorias', chartCategorias);
        });
    }
}

// ===== GENERAR PDF CON GRÁFICO =====
function generateChartPdf(chartType, chartInstance) {
    if (!chartInstance) {
        alert('Por favor, genera el gráfico primero antes de imprimir.');
        return;
    }
    
    // Crear un canvas temporal para asegurar fondo blanco
    // (Chart.js usa fondo transparente por defecto, que puede verse negro en PDF)
    const originalCanvas = chartInstance.canvas;
    const width = originalCanvas.width;
    const height = originalCanvas.height;
    
    const newCanvas = document.createElement('canvas');
    newCanvas.width = width;
    newCanvas.height = height;
    const ctx = newCanvas.getContext('2d');
    
    // Rellenar fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Dibujar el gráfico original sobre el fondo blanco
    ctx.drawImage(originalCanvas, 0, 0);
    
    // Convertir a imagen base64
    const chartImage = newCanvas.toDataURL('image/png');
    
    // Obtener parámetros según el tipo de gráfico
    let params = {};
    
    if (chartType === 'ventas') {
        params = {
            periodo: document.getElementById('periodo-ventas').value,
            moneda: document.getElementById('toggle-moneda-ventas').dataset.moneda,
            fecha_ini: document.getElementById('fecha-ini-ventas').value,
            fecha_fin: document.getElementById('fecha-fin-ventas').value
        };
    } else if (chartType === 'productos') {
        params = {
            fecha_ini: document.getElementById('fecha-ini-productos').value,
            fecha_fin: document.getElementById('fecha-fin-productos').value,
            limit: 10
        };
    } else if (chartType === 'categorias') {
        params = {
            fecha_ini: document.getElementById('fecha-ini-categorias').value,
            fecha_fin: document.getElementById('fecha-fin-categorias').value,
            moneda: document.getElementById('toggle-moneda-categorias').dataset.moneda
        };
    }
    
    // Agregar la imagen al FormData
    params.chart_image = chartImage;
    
    // Crear FormData y agregar CSRF token
    const formData = new FormData();
    for (let key in params) {
        formData.append(key, params[key]);
    }
    
    // Obtener CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                      getCookie('csrftoken');
    
    // URL del endpoint según el tipo
    let url = '';
    if (chartType === 'ventas') {
        url = '/estadisticas/reporte/ventas-tiempo/';
    } else if (chartType === 'productos') {
        url = '/estadisticas/reporte/top-productos/';
    } else if (chartType === 'categorias') {
        url = '/estadisticas/reporte/ventas-categoria/';
    }
    
    // Enviar petición POST
    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Error en el servidor');
            });
        }
        return response.blob();
    })
    .then(blob => {
        // Crear URL temporal y descargar el PDF
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grafico_${chartType}_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al generar el PDF: ' + error.message);
    });
}

// ===== FUNCIÓN AUXILIAR PARA OBTENER COOKIE =====
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
