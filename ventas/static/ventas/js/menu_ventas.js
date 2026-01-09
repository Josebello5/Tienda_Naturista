// menu_ventas.js - Sistema completo corregido para manejo de ventas
document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const clienteSearchInput = document.getElementById('clienteSearchInput');
    const clienteSuggestions = document.getElementById('clienteSuggestions');
    const estadoPagoSelect = document.getElementById('estadoPagoSelect');
    const tipoVentaSelect = document.getElementById('tipoVentaSelect');
    const metodoPagoSelect = document.getElementById('metodoPagoSelect');
    const anuladaSelect = document.getElementById('anuladaSelect');
    const monedaSelect = document.getElementById('monedaSelect');
    const printBtn = document.getElementById('printBtn');
    
    // Elementos del modal de fechas
    const modalFiltroFechas = document.getElementById('modalFiltroFechas');
    const btnFiltroFechaVenta = document.getElementById('btnFiltroFechaVenta');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnAplicar = document.getElementById('btnAplicar');
    const modalTitulo = document.getElementById('modalTitulo');
    const fechaDesde = document.getElementById('fechaDesde');
    const fechaHasta = document.getElementById('fechaHasta');
    const fechaError = document.getElementById('fechaError');
    const botonesOpciones = document.querySelector('.botones-opciones');
    
    let searchTimeout;
    let clienteSeleccionado = '';
    let clienteSeleccionadoNombre = '';
    let monedaActual = 'bs';
    let filtroMetodoPagoActivo = false;
    
    // Filtros actuales
    let filtroFechaVenta = { desde: null, hasta: null };

    // ===== FUNCIONES DE FORMATO DE NÚMEROS VENEZOLANOS =====
    
    /**
     * Formatea un número con separadores venezolanos: punto para miles, coma para decimales
     */
    function formatearNumeroVenezolano(numero, decimales = 2) {
        if (numero === null || numero === undefined || numero === '' || isNaN(numero)) {
            return '0,00';
        }
        
        // Asegurar que sea número
        const num = parseFloat(numero);
        if (isNaN(num)) return '0,00';
        
        // Redondear a los decimales especificados
        const partes = Math.abs(num).toFixed(decimales).split('.');
        let parteEntera = partes[0];
        let parteDecimal = partes[1] || '00';
        
        // Asegurar que la parte decimal tenga 2 dígitos
        if (parteDecimal.length === 1) parteDecimal += '0';
        if (parteDecimal.length > 2) parteDecimal = parteDecimal.substring(0, 2);
        
        // Agregar puntos cada 3 dígitos de derecha a izquierda
        parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        // Agregar signo negativo si el número es negativo
        const signo = num < 0 ? '-' : '';
        
        return `${signo}${parteEntera},${parteDecimal}`;
    }
    
    /**
     * Formatea un monto con símbolo de moneda
     */
    function formatearMonto(valor, moneda = 'bs', decimales = 2) {
        const numeroFormateado = formatearNumeroVenezolano(valor, decimales);
        if (moneda === 'usd') {
            return `$ ${numeroFormateado}`;
        } else {
            return `Bs ${numeroFormateado}`;
        }
    }

    /**
     * Convierte un número formateado venezolano a número decimal
     */
    function parsearNumeroVenezolano(numeroFormateado) {
        if (!numeroFormateado) return 0;
        
        // Eliminar símbolos de moneda y espacios
        let limpio = numeroFormateado.toString()
            .replace('Bs', '')
            .replace('$', '')
            .replace(/\s/g, '')
            .trim();
        
        // Reemplazar punto de miles por nada y coma decimal por punto
        limpio = limpio.replace(/\./g, '').replace(',', '.');
        
        const numero = parseFloat(limpio);
        return isNaN(numero) ? 0 : numero;
    }

    // ===== FUNCIONES AUXILIARES =====
    
    /**
     * Obtiene la fecha actual en formato YYYY-MM-DD
     */
    function getFechaActual() {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
    
    /**
     * Convierte una fecha de DD/MM/YYYY HH:MM a objeto Date
     */
    function parseFechaDDMMYYYYHHMM(fechaTexto) {
        try {
            const [fechaParte, horaParte] = fechaTexto.split(' ');
            const [dia, mes, anio] = fechaParte.split('/');
            const fecha = new Date(anio, mes - 1, dia);
            
            if (horaParte) {
                const [hora, minuto] = horaParte.split(':');
                fecha.setHours(parseInt(hora), parseInt(minuto), 0, 0);
            }
            
            return fecha;
        } catch (error) {
            console.error('Error al parsear fecha:', error);
            return null;
        }
    }

    /**
     * Validar fechas en tiempo real
     */
    function validarFechas() {
        const desde = fechaDesde.value;
        const hasta = fechaHasta.value;
        
        if (desde && hasta) {
            const fechaDesdeObj = new Date(desde);
            const fechaHastaObj = new Date(hasta);
            
            if (fechaHastaObj < fechaDesdeObj) {
                // Fecha inválida
                fechaError.style.display = 'block';
                btnAplicar.disabled = true;
                btnAplicar.style.opacity = '0.6';
                btnAplicar.style.cursor = 'not-allowed';
                return false;
            } else {
                // Fecha válida
                fechaError.style.display = 'none';
                btnAplicar.disabled = false;
                btnAplicar.style.opacity = '1';
                btnAplicar.style.cursor = 'pointer';
                return true;
            }
        } else {
            // Si alguna fecha está vacía, ocultar error y habilitar botón
            fechaError.style.display = 'none';
            btnAplicar.disabled = false;
            btnAplicar.style.opacity = '1';
            btnAplicar.style.cursor = 'pointer';
            return true;
        }
    }

    /**
     * Muestra mensaje de no resultados encontrados
     */
    function mostrarMensajeNoResultados() {
        let mensajeNoResultados = tableBody.querySelector('.no-resultados');
        if (!mensajeNoResultados) {
            mensajeNoResultados = document.createElement('tr');
            mensajeNoResultados.className = 'empty-row no-resultados';
            mensajeNoResultados.innerHTML = `
                <td colspan="8">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron ventas</h3>
                    <p>Intenta con otros términos de búsqueda</p>
                </td>
            `;
            tableBody.appendChild(mensajeNoResultados);
        }
        mensajeNoResultados.style.display = '';
    }

    /**
     * Oculta el mensaje de no resultados
     */
    function ocultarMensajeNoResultados() {
        const mensajeNoResultados = tableBody.querySelector('.no-resultados');
        if (mensajeNoResultados) {
            mensajeNoResultados.style.display = 'none';
        }
    }

    // ===== ACTUALIZACIÓN DE RESUMEN DE TOTALES CORREGIDA =====
    
    /**
     * Actualiza los totales en el resumen según los filtros aplicados
     */
    function actualizarResumenTotales() {
        const filasVisibles = tableBody.querySelectorAll('tr:not([style*="display: none"]):not(.empty-row):not(.no-resultados)');
        
        let totalVentas = 0;
        let totalBs = 0;
        let totalUsd = 0;
        let subtotalBs = 0;
        let subtotalUsd = 0;
        let ivaBs = 0;
        let ivaUsd = 0;

        filasVisibles.forEach(fila => {
            if (fila.classList.contains('empty-row') || fila.classList.contains('no-resultados')) {
                return;
            }

            totalVentas++;
            
            // Obtener datos básicos de la venta
            const totalVentaBs = parsearNumeroVenezolano(fila.getAttribute('data-total-bs'));
            const totalVentaUsd = parsearNumeroVenezolano(fila.getAttribute('data-total-usd'));
            const tasaVenta = parseFloat(fila.getAttribute('data-tasa')) || 1;
            
            // Obtener información de si la venta tiene productos con IVA
            const tieneProductosConIva = fila.hasAttribute('data-tiene-iva') 
                ? fila.getAttribute('data-tiene-iva') === 'true' 
                : true;
            
            let subtotalVentaBs = 0;
            let ivaVentaBs = 0;
            let subtotalVentaUsd = 0;
            let ivaVentaUsd = 0;
            
            // Si tenemos filtro por método de pago, usar los datos de pagos
            if (filtroMetodoPagoActivo && metodoPagoSelect.value) {
                try {
                    const pagosData = JSON.parse(fila.getAttribute('data-pagos-metodo') || '{}');
                    const metodo = metodoPagoSelect.value;
                    
                    if (pagosData[metodo]) {
                        const pagoBs = parseFloat(pagosData[metodo].bs) || 0;
                        const pagoUsd = parseFloat(pagosData[metodo].usd) || 0;
                        
                        // Para pagos, no podemos calcular subtotal/IVA exacto, 
                        // así que distribuimos proporcionalmente
                        if (totalVentaBs > 0) {
                            const proporcion = pagoBs / totalVentaBs;
                            
                            if (tieneProductosConIva) {
                                // Aproximación: 86.21% subtotal, 13.79% IVA (16% sobre subtotal)
                                subtotalVentaBs = pagoBs * 0.8621;
                                ivaVentaBs = pagoBs * 0.1379;
                                subtotalVentaUsd = pagoUsd * 0.8621;
                                ivaVentaUsd = pagoUsd * 0.1379;
                            } else {
                                subtotalVentaBs = pagoBs;
                                ivaVentaBs = 0;
                                subtotalVentaUsd = pagoUsd;
                                ivaVentaUsd = 0;
                            }
                        }
                        
                        totalBs += pagoBs;
                        totalUsd += pagoUsd;
                        subtotalBs += subtotalVentaBs;
                        subtotalUsd += subtotalVentaUsd;
                        ivaBs += ivaVentaBs;
                        ivaUsd += ivaVentaUsd;
                    }
                } catch (e) {
                    console.error('Error al procesar datos de pagos:', e);
                }
            } else {
                // Sin filtro por método, usar el total de la venta
                totalBs += totalVentaBs;
                totalUsd += totalVentaUsd;
                
                // Calcular subtotal e IVA aproximados
                if (tieneProductosConIva) {
                    // Si tiene IVA: subtotal = total / 1.16, IVA = total - subtotal
                    subtotalVentaBs = totalVentaBs / 1.16;
                    ivaVentaBs = totalVentaBs - subtotalVentaBs;
                    subtotalVentaUsd = totalVentaUsd / 1.16;
                    ivaVentaUsd = totalVentaUsd - subtotalVentaUsd;
                } else {
                    // Si no tiene IVA: subtotal = total, IVA = 0
                    subtotalVentaBs = totalVentaBs;
                    ivaVentaBs = 0;
                    subtotalVentaUsd = totalVentaUsd;
                    ivaVentaUsd = 0;
                }
                
                subtotalBs += subtotalVentaBs;
                subtotalUsd += subtotalVentaUsd;
                ivaBs += ivaVentaBs;
                ivaUsd += ivaVentaUsd;
            }
        });

        // Actualizar elementos del DOM
        document.getElementById('totalVentas').textContent = totalVentas;
        
        if (monedaActual === 'bs') {
            document.getElementById('totalGeneralBs').textContent = formatearMonto(totalBs, 'bs');
            document.getElementById('subtotalGeneralBs').textContent = formatearMonto(subtotalBs, 'bs');
            document.getElementById('ivaGeneralBs').textContent = formatearMonto(ivaBs, 'bs');
            
            // Ocultar versiones en USD
            document.getElementById('totalGeneralUsd').style.display = 'none';
            document.getElementById('subtotalGeneralUsd').style.display = 'none';
            document.getElementById('ivaGeneralUsd').style.display = 'none';
        } else {
            document.getElementById('totalGeneralBs').textContent = formatearMonto(totalUsd, 'usd');
            document.getElementById('subtotalGeneralBs').textContent = formatearMonto(subtotalUsd, 'usd');
            document.getElementById('ivaGeneralBs').textContent = formatearMonto(ivaUsd, 'usd');
            
            // Mostrar equivalencias en Bs en pequeños
            document.getElementById('totalGeneralUsd').style.display = 'block';
            document.getElementById('totalGeneralUsd').textContent = formatearMonto(totalBs, 'bs');
            document.getElementById('subtotalGeneralUsd').style.display = 'block';
            document.getElementById('subtotalGeneralUsd').textContent = formatearMonto(subtotalBs, 'bs');
            document.getElementById('ivaGeneralUsd').style.display = 'block';
            document.getElementById('ivaGeneralUsd').textContent = formatearMonto(ivaBs, 'bs');
        }
    }

    /**
     * Actualiza la moneda mostrada en la tabla
     */
    function actualizarMonedaEnTabla() {
        const filas = tableBody.querySelectorAll('tr');
        const metodoFiltro = metodoPagoSelect ? metodoPagoSelect.value : '';
        filtroMetodoPagoActivo = !!metodoFiltro;
        
        filas.forEach(fila => {
            if (fila.classList.contains('empty-row') || fila.classList.contains('no-resultados')) {
                return;
            }

            const totalCell = fila.querySelector('.total');
            const totalBsElem = totalCell.querySelector('.total-bs');
            const totalUsdElem = totalCell.querySelector('.total-usd');
            const totalMetodoElem = totalCell.querySelector('.total-metodo');
            
            // Ocultar elementos por defecto
            totalMetodoElem.style.display = 'none';
            totalBsElem.style.display = 'block';
            totalUsdElem.style.display = 'block';

            // Obtener datos de pagos
            const pagosData = JSON.parse(fila.getAttribute('data-pagos-metodo') || '{}');
            
            // Si hay filtro por método de pago, mostrar el total de ese método
            if (filtroMetodoPagoActivo && metodoFiltro && pagosData[metodoFiltro]) {
                const totalMetodoBs = pagosData[metodoFiltro].bs || 0;
                const totalMetodoUsd = pagosData[metodoFiltro].usd || 0;
                
                if (monedaActual === 'bs') {
                    totalBsElem.innerHTML = `<strong>${formatearMonto(totalMetodoBs, 'bs')}</strong>`;
                    totalUsdElem.innerHTML = `<small>${formatearMonto(totalMetodoUsd, 'usd')}</small>`;
                    totalMetodoElem.innerHTML = `<small>Pago con ${getNombreMetodo(metodoFiltro)}</small>`;
                } else {
                    totalBsElem.innerHTML = `<strong>${formatearMonto(totalMetodoUsd, 'usd')}</strong>`;
                    totalUsdElem.innerHTML = `<small>${formatearMonto(totalMetodoBs, 'bs')}</small>`;
                    totalMetodoElem.innerHTML = `<small>Pago con ${getNombreMetodo(metodoFiltro)}</small>`;
                }
                totalMetodoElem.style.display = 'block';
            } else {
                // Sin filtro por método, mostrar el total de la venta
                const totalBs = parsearNumeroVenezolano(fila.getAttribute('data-total-bs'));
                const totalUsd = parsearNumeroVenezolano(fila.getAttribute('data-total-usd'));
                
                if (monedaActual === 'bs') {
                    totalBsElem.innerHTML = `<strong>${formatearMonto(totalBs, 'bs')}</strong>`;
                    totalUsdElem.innerHTML = `<small>${formatearMonto(totalUsd, 'usd')}</small>`;
                } else {
                    totalBsElem.innerHTML = `<strong>${formatearMonto(totalUsd, 'usd')}</strong>`;
                    totalUsdElem.innerHTML = `<small>${formatearMonto(totalBs, 'bs')}</small>`;
                }
            }
        });

        // Actualizar encabezados de moneda
        const totalMoneda = document.getElementById('totalMoneda');
        totalMoneda.textContent = monedaActual === 'bs' ? 'Bs' : '$';

        // Actualizar resumen de totales
        actualizarResumenTotales();
    }

    /**
     * Obtiene el nombre legible del método de pago
     */
    function getNombreMetodo(codigoMetodo) {
        const metodos = {
            'efectivo_bs': 'Efectivo Bs',
            'efectivo_usd': 'Efectivo $',
            'transferencia': 'Transferencia',
            'pago_movil': 'Pago Móvil',
            'punto_venta': 'Punto de Venta',
            'tarjeta': 'Tarjeta'
        };
        return metodos[codigoMetodo] || codigoMetodo;
    }

    // ===== MODAL PERSONALIZADO PARA ANULAR VENTA =====
    function crearModalConfirmacion() {
        // Crear el modal si no existe
        if (!document.getElementById('confirmModal')) {
            const modalHTML = `
                <div id="confirmModal" class="confirm-modal">
                    <div class="confirm-contenido">
                        <div class="confirm-header">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Confirmar Anulación de Venta</h3>
                        </div>
                        <div class="confirm-body">
                            <p>¿Está seguro de que desea anular esta venta?</p>
                            <div class="confirm-venta-info">
                                <strong id="ventaInfo">Venta #</strong>
                            </div>
                            <p><small><i class="fas fa-info-circle"></i> Esta acción no se puede deshacer y los productos se reintegrarán al stock.</small></p>
                        </div>
                        <div class="confirm-footer">
                            <button class="btn btn-cancelar" id="btnCancelarAnular">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button class="btn btn-confirmar" id="btnConfirmarAnular">
                                <i class="fas fa-check"></i> Sí, Anular
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const confirmModal = document.getElementById('confirmModal');
        const btnCancelarAnular = document.getElementById('btnCancelarAnular');
        const btnConfirmarAnular = document.getElementById('btnConfirmarAnular');
        const ventaInfo = document.getElementById('ventaInfo');

        function mostrarModal(ventaId) {
            ventaInfo.textContent = `Venta #${ventaId}`;
            confirmModal.style.display = 'flex';
            
            // Enfocar el botón de cancelar por defecto
            setTimeout(() => {
                btnCancelarAnular.focus();
            }, 100);
        }

        function cerrarModal() {
            confirmModal.style.display = 'none';
        }

        // Event listeners
        btnCancelarAnular.addEventListener('click', cerrarModal);
        
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) {
                cerrarModal();
            }
        });

        // Tecla Escape para cerrar
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && confirmModal.style.display === 'flex') {
                cerrarModal();
            }
        });

        return {
            mostrar: mostrarModal,
            cerrar: cerrarModal,
            setConfirmCallback: (callback) => {
                btnConfirmarAnular.addEventListener('click', callback);
            }
        };
    }

    // Inicializar modal de confirmación
    const modalConfirmacion = crearModalConfirmacion();

    // ===== FUNCIÓN PARA DEVOLUCIÓN DE VENTA CON MODAL PERSONALIZADO =====
    window.devolverVenta = function(ventaId) {
        modalConfirmacion.mostrar(ventaId);
        
        // Configurar el callback de confirmación
        modalConfirmacion.setConfirmCallback(function() {
            fetch(`${DEVOLVER_VENTA_URL}${ventaId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Mostrar mensaje de éxito
                    mostrarMensajeExito(data.mensaje);
                    // Cerrar modal de confirmación
                    modalConfirmacion.cerrar();
                    // Recargar la página después de un breve delay
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    // Mostrar mensaje de error
                    mostrarMensajeError('Error: ' + data.error);
                    modalConfirmacion.cerrar();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarMensajeError('Error al procesar la devolución');
                modalConfirmacion.cerrar();
            });
        });
    }

    // Función para mostrar mensajes de éxito
    function mostrarMensajeExito(mensaje) {
        // Crear contenedor de mensajes si no existe
        let mensajesContainer = document.querySelector('.messages-container');
        if (!mensajesContainer) {
            mensajesContainer = document.createElement('div');
            mensajesContainer.className = 'messages-container';
            document.querySelector('.welcome-card').after(mensajesContainer);
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success';
        alertDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${mensaje}
        `;

        mensajesContainer.appendChild(alertDiv);

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Función para mostrar mensajes de error
    function mostrarMensajeError(mensaje) {
        let mensajesContainer = document.querySelector('.messages-container');
        if (!mensajesContainer) {
            mensajesContainer = document.createElement('div');
            mensajesContainer.className = 'messages-container';
            document.querySelector('.welcome-card').after(mensajesContainer);
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            ${mensaje}
        `;

        mensajesContainer.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // ===== INICIALIZACIÓN DEL MODAL DE FECHAS =====
    function inicializarModalFechas() {
        function actualizarOpcionesRapidas() {
            botonesOpciones.innerHTML = `
                <button type="button" class="btn-opcion" data-dias="1">Hoy</button>
                <button type="button" class="btn-opcion" data-dias="8">Última semana</button>
                <button type="button" class="btn-opcion" data-dias="31">Último mes</button>
                <button type="button" class="btn-opcion" data-dias="365">Último año</button>
                <button type="button" class="btn-opcion btn-limpiar">Limpiar</button>
            `;

            document.querySelectorAll('.btn-opcion').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (this.classList.contains('btn-limpiar')) {
                        fechaDesde.value = '';
                        fechaHasta.value = '';
                        validarFechas();
                        return;
                    }
                    const dias = parseInt(this.getAttribute('data-dias'));
                    aplicarRangoFecha(dias);
                    validarFechas();
                });
            });
        }

        function aplicarRangoFecha(dias) {
            const hoy = new Date();
            const fechaInicio = new Date();
            const fechaFin = new Date();
            
            if (dias === 1) {
                const fechaHoy = getFechaActual();
                fechaDesde.value = fechaHoy;
                fechaHasta.value = fechaHoy;
            } else {
                fechaInicio.setDate(hoy.getDate() - (dias - 1));
                fechaFin.setDate(hoy.getDate());
                fechaDesde.value = fechaInicio.toISOString().split('T')[0];
                fechaHasta.value = fechaFin.toISOString().split('T')[0];
            }
        }

        btnFiltroFechaVenta.addEventListener('click', function() {
            modalTitulo.textContent = 'Filtrar por Fecha de Venta';
            // Establecer las fechas actuales del filtro en el modal
            fechaDesde.value = filtroFechaVenta.desde || '';
            fechaHasta.value = filtroFechaVenta.hasta || '';
            actualizarOpcionesRapidas();
            validarFechas();
            modalFiltroFechas.style.display = 'flex';
        });

        function cerrarModal() {
            modalFiltroFechas.style.display = 'none';
        }

        btnCerrarModal.addEventListener('click', cerrarModal);
        btnCancelar.addEventListener('click', cerrarModal);

        modalFiltroFechas.addEventListener('click', function(e) {
            if (e.target === modalFiltroFechas) {
                cerrarModal();
            }
        });

        btnAplicar.addEventListener('click', function() {
            if (!validarFechas()) {
                return;
            }
            
            filtroFechaVenta.desde = fechaDesde.value;
            filtroFechaVenta.hasta = fechaHasta.value;
            filtrarVentas();
            actualizarIndicadoresFiltro();
            cerrarModal();
        });

        // Event listeners para validación en tiempo real
        fechaDesde.addEventListener('change', validarFechas);
        fechaHasta.addEventListener('change', validarFechas);
        fechaDesde.addEventListener('input', validarFechas);
        fechaHasta.addEventListener('input', validarFechas);

        actualizarOpcionesRapidas();
    }

    // ===== ACTUALIZAR INDICADORES DE FILTRO =====
    function actualizarIndicadoresFiltro() {
        if (filtroFechaVenta.desde || filtroFechaVenta.hasta) {
            btnFiltroFechaVenta.classList.add('filtro-activo');
            btnFiltroFechaVenta.innerHTML = `<i class="fas fa-calendar-day"></i> Fecha de Venta ✓`;
        } else {
            btnFiltroFechaVenta.classList.remove('filtro-activo');
            btnFiltroFechaVenta.innerHTML = `<i class="fas fa-calendar-day"></i> Fecha de Venta`;
        }

        if (estadoPagoSelect.value) {
            estadoPagoSelect.parentElement.classList.add('filtro-activo');
        } else {
            estadoPagoSelect.parentElement.classList.remove('filtro-activo');
        }
        
        if (tipoVentaSelect.value) {
            tipoVentaSelect.parentElement.classList.add('filtro-activo');
        } else {
            tipoVentaSelect.parentElement.classList.remove('filtro-activo');
        }

        if (metodoPagoSelect.value) {
            metodoPagoSelect.parentElement.classList.add('filtro-activo');
        } else {
            metodoPagoSelect.parentElement.classList.remove('filtro-activo');
        }

        if (anuladaSelect.value) {
            anuladaSelect.parentElement.classList.add('filtro-activo');
        } else {
            anuladaSelect.parentElement.classList.remove('filtro-activo');
        }

        if (monedaSelect.value) {
            monedaSelect.parentElement.classList.add('filtro-activo');
        } else {
            monedaSelect.parentElement.classList.remove('filtro-activo');
        }
    }

    // ===== FUNCIONALIDAD DE BÚSQUEDA Y FILTROS =====
    function manejarFiltros() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filtrarVentas();
        }, 300);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', manejarFiltros);
    }
    
    if (estadoPagoSelect) {
        estadoPagoSelect.addEventListener('change', function() {
            manejarFiltros();
            actualizarIndicadoresFiltro();
        });
    }
    
    if (tipoVentaSelect) {
        tipoVentaSelect.addEventListener('change', function() {
            manejarFiltros();
            actualizarIndicadoresFiltro();
        });
    }

    if (metodoPagoSelect) {
        metodoPagoSelect.addEventListener('change', function() {
            manejarFiltros();
            actualizarIndicadoresFiltro();
            actualizarMonedaEnTabla(); // Actualizar para mostrar total por método
        });
    }

    if (anuladaSelect) {
        anuladaSelect.addEventListener('change', function() {
            manejarFiltros();
            actualizarIndicadoresFiltro();
        });
    }

    // ===== CAMBIO DE MONEDA =====
    if (monedaSelect) {
        monedaSelect.addEventListener('change', function() {
            monedaActual = this.value;
            actualizarMonedaEnTabla();
            actualizarIndicadoresFiltro();
        });
    }

    // ===== BÚSQUEDA DE CLIENTES CON SUGERENCIAS =====
    if (clienteSearchInput && clienteSuggestions) {
        clienteSearchInput.addEventListener('input', function(e) {
            mostrarSugerenciasClientes(e.target.value);
        });

        clienteSearchInput.addEventListener('focus', function() {
            if (this.value && this.value !== clienteSeleccionadoNombre) {
                mostrarSugerenciasClientes(this.value);
            }
        });

        document.addEventListener('click', function(e) {
            if (clienteSearchInput && !clienteSearchInput.contains(e.target) && 
                clienteSuggestions && !clienteSuggestions.contains(e.target)) {
                clienteSuggestions.style.display = 'none';
            }
        });

        clienteSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '') {
                clienteSeleccionado = '';
                clienteSeleccionadoNombre = '';
                filtrarVentas();
            }
        });
    }

    // ===== MOSTRAR SUGERENCIAS DE CLIENTES =====
    function mostrarSugerenciasClientes(query) {
        if (!clienteSuggestions) return;

        const suggestionsContainer = clienteSuggestions;
        suggestionsContainer.innerHTML = '';

        if (!query.trim()) {
            suggestionsContainer.style.display = 'none';
            clienteSeleccionado = '';
            clienteSeleccionadoNombre = '';
            filtrarVentas();
            return;
        }

        const clientesData = window.clientesData || [];

        const sugerencias = clientesData.filter(cliente => {
            const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.toLowerCase();
            return nombreCompleto.includes(query.toLowerCase()) ||
                   cliente.cedula.includes(query);
        });

        if (sugerencias.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'cliente-suggestion no-results';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <div>
                    <strong>No se encontraron clientes</strong>
                    <small>Intenta con otros términos de búsqueda</small>
                </div>
            `;
            suggestionsContainer.appendChild(noResults);
        } else {
            sugerencias.forEach(cliente => {
                const suggestion = document.createElement('div');
                suggestion.className = 'cliente-suggestion';
                suggestion.textContent = `${cliente.nombre} ${cliente.apellido} - ${cliente.cedula}`;
                suggestion.setAttribute('data-cliente-cedula', cliente.cedula);
                suggestion.setAttribute('data-cliente-nombre', `${cliente.nombre} ${cliente.apellido}`);
                
                suggestion.addEventListener('click', function() {
                    const clienteCedula = this.getAttribute('data-cliente-cedula');
                    const clienteNombre = this.getAttribute('data-cliente-nombre');
                    
                    clienteSearchInput.value = clienteNombre;
                    clienteSeleccionado = clienteCedula;
                    clienteSeleccionadoNombre = clienteNombre;
                    suggestionsContainer.style.display = 'none';
                    filtrarVentas();
                });

                suggestionsContainer.appendChild(suggestion);
            });
        }

        suggestionsContainer.style.display = 'block';
    }

    // ===== FILTRAR VENTAS EN LA TABLA =====
    function filtrarVentas() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const estadoPago = estadoPagoSelect ? estadoPagoSelect.value : '';
        const tipoVenta = tipoVentaSelect ? tipoVentaSelect.value : '';
        const metodoPago = metodoPagoSelect ? metodoPagoSelect.value : '';
        const anulada = anuladaSelect ? anuladaSelect.value : '';
        
        const rows = tableBody.querySelectorAll('tr');
        let visibleRows = 0;

        ocultarMensajeNoResultados();

        rows.forEach(row => {
            if (row.classList.contains('empty-row') || row.classList.contains('no-resultados')) {
                row.style.display = 'none';
                return;
            }

            const idVenta = row.cells[0].textContent.toLowerCase();
            const clienteText = row.cells[1].textContent.toLowerCase();
            const clienteCedula = row.getAttribute('data-cliente-id');
            const fechaVentaText = row.cells[2].textContent.trim();
            const estadoPagoVenta = row.getAttribute('data-estado-pago');
            const tipoVentaVenta = row.getAttribute('data-tipo-venta');
            const metodoPagoVenta = row.getAttribute('data-metodo-pago');
            const anuladaVenta = row.getAttribute('data-anulada');
            const pagosData = JSON.parse(row.getAttribute('data-pagos-metodo') || '{}');
            
            const coincideId = !query || idVenta.includes(query) || clienteText.includes(query);
            const coincideCliente = !clienteSeleccionado || clienteCedula === clienteSeleccionado;
            const coincideEstadoPago = !estadoPago || estadoPagoVenta === estadoPago;
            const coincideTipoVenta = !tipoVenta || tipoVentaVenta === tipoVenta;
            const coincideMetodoPago = !metodoPago || (pagosData[metodoPago] && parseFloat(pagosData[metodoPago].bs) > 0);
            const coincideAnulada = !anulada || anuladaVenta === anulada;
            
            const coincideFechaVenta = fechaEnRango(fechaVentaText, filtroFechaVenta.desde, filtroFechaVenta.hasta);
            
            if (coincideId && coincideCliente && coincideFechaVenta && 
                coincideEstadoPago && coincideTipoVenta && coincideMetodoPago && coincideAnulada) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });

        const emptyRow = tableBody.querySelector('.empty-row:not(.no-resultados)');
        
        if (visibleRows === 0) {
            const hayFiltrosActivos = query || clienteSeleccionado || estadoPago || 
                                    tipoVenta || metodoPago || anulada || filtroFechaVenta.desde || 
                                    filtroFechaVenta.hasta;
            
            if (hayFiltrosActivos) {
                mostrarMensajeNoResultados();
            } else if (emptyRow) {
                emptyRow.style.display = '';
            }
        } else {
            if (emptyRow) {
                emptyRow.style.display = 'none';
            }
        }

        // Actualizar resumen de totales después de filtrar
        actualizarResumenTotales();
        // Actualizar moneda en tabla
        actualizarMonedaEnTabla();
    }

    function fechaEnRango(fechaTexto, fechaInicio, fechaFin) {
        if (!fechaInicio && !fechaFin) return true;

        try {
            const fecha = parseFechaDDMMYYYYHHMM(fechaTexto);
            if (!fecha) return true;

            let inicio = null;
            let fin = null;

            if (fechaInicio) {
                const [anioInicio, mesInicio, diaInicio] = fechaInicio.split('-');
                inicio = new Date(anioInicio, mesInicio - 1, diaInicio);
                inicio.setHours(0, 0, 0, 0);
            }

            if (fechaFin) {
                const [anioFin, mesFin, diaFin] = fechaFin.split('-');
                fin = new Date(anioFin, mesFin - 1, diaFin);
                fin.setHours(23, 59, 59, 999);
            }

            if (inicio && fin) {
                return fecha >= inicio && fecha <= fin;
            } else if (inicio) {
                return fecha >= inicio;
            } else if (fin) {
                return fecha <= fin;
            }

            return true;
        } catch (error) {
            console.error('Error al comparar fechas:', error);
            return true;
        }
    }

    // Función auxiliar para obtener el token CSRF
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

    // ===== IMPRIMIR PDF CON FILTROS =====
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            const query = searchInput ? searchInput.value.trim() : '';
            const cliente = clienteSeleccionado ? clienteSeleccionado : '';
            const estadoPago = estadoPagoSelect ? estadoPagoSelect.value : '';
            const tipoVenta = tipoVentaSelect ? tipoVentaSelect.value : '';
            const metodoPago = metodoPagoSelect ? metodoPagoSelect.value : '';
            const anulada = anuladaSelect ? anuladaSelect.value : '';
            const fechaDesde = filtroFechaVenta.desde ? filtroFechaVenta.desde : '';
            const fechaHasta = filtroFechaVenta.hasta ? filtroFechaVenta.hasta : '';
            const moneda = monedaActual;

            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (cliente) params.append('cliente', cliente);
            if (estadoPago) params.append('estado_pago', estadoPago);
            if (tipoVenta) params.append('tipo_venta', tipoVenta);
            if (metodoPago) params.append('metodo_pago', metodoPago);
            if (anulada) params.append('anulada', anulada);
            if (fechaDesde) params.append('fecha_desde', fechaDesde);
            if (fechaHasta) params.append('fecha_hasta', fechaHasta);
            params.append('moneda', moneda);

            const pdfUrl = `${GENERAR_PDF_URL}?${params.toString()}`;
            window.open(pdfUrl, '_blank');
        });
    }

    // ===== LIMPIAR FILTROS =====
    function limpiarFiltros() {
        filtroFechaVenta = { desde: null, hasta: null };
        filtroMetodoPagoActivo = false;
        
        if (searchInput) searchInput.value = '';
        if (estadoPagoSelect) estadoPagoSelect.value = '';
        if (tipoVentaSelect) tipoVentaSelect.value = '';
        if (metodoPagoSelect) metodoPagoSelect.value = '';
        if (anuladaSelect) anuladaSelect.value = '';
        if (clienteSearchInput) clienteSearchInput.value = '';
        if (monedaSelect) monedaSelect.value = 'bs';
        
        clienteSeleccionado = '';
        clienteSeleccionadoNombre = '';
        monedaActual = 'bs';
        
        actualizarIndicadoresFiltro();
        actualizarMonedaEnTabla();
        filtrarVentas();
    }

    document.querySelector('.productos-toolbar').addEventListener('dblclick', function(e) {
        if (e.ctrlKey) {
            limpiarFiltros();
        }
    });

    // ===== INICIALIZACIÓN =====
    function inicializar() {
        // Establecer filtro por defecto: ventas de hoy
        const hoy = getFechaActual();
        filtroFechaVenta.desde = hoy;
        filtroFechaVenta.hasta = hoy;

        inicializarModalFechas();
        actualizarIndicadoresFiltro();
        actualizarMonedaEnTabla();
        
        if (searchInput) searchInput.focus();
        filtrarVentas(); // Aplicar filtro de fecha por defecto
        
        console.log('Sistema de gestión de ventas inicializado correctamente');
        console.log('Formato venezolano activado: punto para miles, coma para decimales');
    }

    inicializar();
    
    // ===== ACTUALIZACIÓN DINÁMICA DE SALDO PENDIENTE EN BS =====
    
    /**
     * Actualiza los saldos pendientes en Bs usando la tasa actual
     */
    function actualizarSaldosPendientesBs() {
        const tasaActual = window.TASA_ACTUAL || 0;
        
        if (tasaActual === 0) {
            console.warn('Tasa actual no disponible');
            return;
        }
        
        // Buscar todas las celdas de saldo pendiente
        document.querySelectorAll('.saldo-bs-equiv').forEach(elem => {
            const saldoUsd = parseFloat(elem.dataset.saldoUsd);
            
            if (!isNaN(saldoUsd) && saldoUsd > 0) {
                const saldoBs = saldoUsd * tasaActual;
                const spanCalc = elem.querySelector('.calc-bs');
                
                if (spanCalc) {
                    spanCalc.textContent = formatearNumeroVenezolano(saldoBs);
                }
            }
        });
    }
    
    // Ejecutar al cargar la página
    actualizarSaldosPendientesBs();
});