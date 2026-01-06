// gestionar_abono.js - Gestión de la página de abonos por cliente con selección múltiple - CORREGIDO
document.addEventListener('DOMContentLoaded', function () {
    // ===== FUNCIÓN PARA OBTENER URLs =====
    function getAppUrl(path) {
        // CORRECCIÓN: Usar la ruta base correcta
        return `/cuentas_pendientes${path}`;
    }

    // ===== VARIABLES GLOBALES =====
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const estadoPagoSelect = document.getElementById('estadoPagoSelect');
    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
    const btnPagarSeleccionadas = document.getElementById('btnPagarSeleccionadas');
    const selectAllCheckbox = document.getElementById('selectAll');
    const resumenPagoContainer = document.getElementById('resumenPagoContainer');
    const btnCerrarResumen = document.getElementById('btnCerrarResumen');
    const btnProcesarPago = document.getElementById('btnProcesarPago');
    const btnAgregarMetodo = document.getElementById('btnAgregarMetodo');
    const btnToggleHistorial = document.getElementById('btnToggleHistorial');
    const historialBody = document.getElementById('historialBody');
    const listaHistorialAbonos = document.getElementById('listaHistorialAbonos');
    const filterHistorial = document.getElementById('filterHistorial');
    const fechaHistorial = document.getElementById('fechaHistorial');

    // Variables del modal de método de pago
    const modalMetodoPago = document.getElementById('modalMetodoPago');
    const selectMetodoPago = document.getElementById('selectMetodoPago');
    const montoPagoInput = document.getElementById('montoPago');
    const tasaCambioInput = document.getElementById('tasaCambio');
    const comprobantePagoInput = document.getElementById('comprobantePago');
    const divTasaCambio = document.getElementById('divTasaCambio');
    const divComprobante = document.getElementById('divComprobante');
    const btnAgregarPago = document.getElementById('btnAgregarPago');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelarModal = document.querySelector('.btn-cancelar-modal');
    const infoPagoModal = document.getElementById('infoPagoModal');
    const textoInfoModal = document.getElementById('textoInfoModal');

    // Variables del modal de fechas
    const modalFiltroFechas = document.getElementById('modalFiltroFechas');
    const btnFiltroFechaVenta = document.getElementById('btnFiltroFechaVenta');
    const btnCerrarModalFecha = document.getElementById('btnCerrarModalFecha');
    const btnCancelarFecha = document.getElementById('btnCancelarFecha');
    const btnAplicarFecha = document.getElementById('btnAplicarFecha');
    const fechaDesde = document.getElementById('fechaDesde');
    const fechaHasta = document.getElementById('fechaHasta');
    const fechaError = document.getElementById('fechaError');

    // Variables de estado
    let searchTimeout;
    let filtroFechaVenta = { desde: null, hasta: null };
    let ventasSeleccionadas = [];
    let metodosPago = [];
    let totalAPagar = 0;
    let totalPagado = 0;
    let restantePagar = 0;
    let tasaActual = window.TASA_ACTUAL || 0;
    let clienteCedula = window.CLIENTE_CEDULA;
    let lastMontoInput = '';

    // ===== FUNCIONES DE FORMATO NUMÉRICO =====

    function formatNumberVenezolano(value) {
        if (value === null || value === undefined || value === '') return '';

        let str = value.toString();

        // Reemplazar punto decimal inglés por coma venezolana
        str = str.replace('.', '|TEMP|').replace(',', '.').replace('|TEMP|', '.');

        let parts = str.split('.');
        let integerPart = parts[0];
        let decimalPart = parts[1] || '00';

        if (decimalPart.length === 1) {
            decimalPart += '0';
        } else if (decimalPart.length > 2) {
            decimalPart = decimalPart.substring(0, 2);
        }

        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        return `${integerPart},${decimalPart}`;
    }

    function parseNumberVenezolano(formattedValue) {
        if (!formattedValue) return 0;

        const cleanValue = formattedValue.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanValue);

        return isNaN(num) ? 0 : num;
    }

    function setupNumberFormatting(input, onInputCallback = null) {
        let lastValue = input.value;

        input.addEventListener('input', function (e) {
            const cursorPosition = this.selectionStart;
            const originalValue = this.value;

            let cleanValue = originalValue.replace(/[^\d,]/g, '');

            const parts = cleanValue.split(',');
            if (parts.length > 2) {
                cleanValue = parts[0] + ',' + parts.slice(1).join('');
            }

            if (parts.length === 2 && parts[1].length > 2) {
                cleanValue = parts[0] + ',' + parts[1].substring(0, 2);
            }

            const [integerPart, decimalPart] = cleanValue.split(',');

            let formattedInteger = '';
            if (integerPart) {
                formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            }

            let formattedValue = decimalPart !== undefined ?
                formattedInteger + ',' + decimalPart :
                formattedInteger;

            if (formattedValue !== originalValue) {
                this.value = formattedValue;

                let newCursorPosition = cursorPosition;
                const pointCountBefore = (originalValue.substring(0, cursorPosition).match(/\./g) || []).length;
                const pointCountAfter = (formattedValue.substring(0, cursorPosition).match(/\./g) || []).length;

                newCursorPosition += pointCountAfter - pointCountBefore;
                newCursorPosition = Math.max(0, Math.min(newCursorPosition, formattedValue.length));

                this.setSelectionRange(newCursorPosition, newCursorPosition);
            }

            lastValue = formattedValue;

            if (onInputCallback && typeof onInputCallback === 'function') {
                onInputCallback();
            }
        });

        input.addEventListener('blur', function () {
            const value = parseNumberVenezolano(this.value);
            if (value > 0) {
                this.value = formatNumberVenezolano(value.toFixed(2));
            } else if (this.value.trim() !== '') {
                this.value = '0,00';
            }
        });

        input.addEventListener('focus', function () {
            setTimeout(() => {
                this.select();
            }, 100);
        });
    }

    function setupMontoPagoFormatting() {
        let lastValue = montoPagoInput.value;

        montoPagoInput.addEventListener('input', function (e) {
            const cursorPosition = this.selectionStart;
            const originalValue = this.value;

            let newValue = originalValue.replace(/[^\d,]/g, '');

            const parts = newValue.split(',');
            if (parts.length > 2) {
                newValue = parts[0] + ',' + parts.slice(1).join('');
            }

            if (parts.length === 2 && parts[1].length > 2) {
                newValue = parts[0] + ',' + parts[1].substring(0, 2);
            }

            const [integerPart, decimalPart] = newValue.split(',');

            let formattedInteger = '';
            if (integerPart) {
                formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            }

            const formattedValue = decimalPart !== undefined ?
                formattedInteger + ',' + decimalPart :
                formattedInteger;

            if (formattedValue !== originalValue) {
                this.value = formattedValue;

                let newCursorPosition = cursorPosition;
                const pointDiff = (formattedValue.match(/\./g) || []).length - (originalValue.match(/\./g) || []).length;
                newCursorPosition = Math.max(0, Math.min(cursorPosition + pointDiff, formattedValue.length));

                this.setSelectionRange(newCursorPosition, newCursorPosition);
            }

            lastValue = formattedValue;
            lastMontoInput = formattedValue;
            actualizarValidacionModal();
        });

        montoPagoInput.addEventListener('blur', function () {
            const value = parseNumberVenezolano(this.value);
            if (value > 0) {
                this.value = formatNumberVenezolano(value.toFixed(2));
            } else if (this.value.trim() !== '') {
                this.value = '0,00';
            }
        });
    }

    // ===== FUNCIONES DE MENSAJES =====

    function mostrarMensaje(mensaje, tipo) {
        const messagesContainer = document.getElementById('messagesContainer');

        // Limpiar mensajes anteriores después de 5 segundos
        const mensajesExistentes = messagesContainer.querySelectorAll('.alert');
        mensajesExistentes.forEach(msg => {
            if (Date.now() - msg.dataset.timestamp > 5000) {
                msg.remove();
            }
        });

        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo === 'success' ? 'success' : tipo === 'warning' ? 'warning' : 'error'}`;
        alert.dataset.timestamp = Date.now();

        // Icono según tipo
        let icono = '';
        if (tipo === 'success') {
            icono = 'check-circle';
        } else if (tipo === 'warning') {
            icono = 'exclamation-triangle';
        } else {
            icono = 'exclamation-circle';
        }

        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-${icono}"></i>
                <div class="alert-message">${mensaje}</div>
            </div>
            <button class="btn-close-alert" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        messagesContainer.appendChild(alert);

        // Auto-eliminar después de 7 segundos
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 7000);

        // Scroll suave al mensaje
        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ===== FUNCIONES DE SELECCIÓN DE VENTAS =====

    function inicializarSeleccionVentas() {
        // Seleccionar todos
        selectAllCheckbox.addEventListener('change', function () {
            const checkboxes = document.querySelectorAll('.venta-checkbox:not(:disabled)');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
                checkbox.dispatchEvent(new Event('change'));
            });
        });

        // Selección individual
        document.addEventListener('change', function (e) {
            if (e.target.classList.contains('venta-checkbox')) {
                actualizarVentasSeleccionadas();
            }
        });
    }

    function actualizarVentasSeleccionadas() {
        ventasSeleccionadas = [];
        const checkboxes = document.querySelectorAll('.venta-checkbox:checked');

        checkboxes.forEach(checkbox => {
            const ventaId = parseInt(checkbox.getAttribute('data-venta-id'));
            const saldo = parseNumberVenezolano(checkbox.getAttribute('data-saldo'));

            if (ventaId && saldo > 0) {
                ventasSeleccionadas.push({
                    id: ventaId,
                    saldo: saldo
                });
            }
        });

        // Actualizar botón de pagar seleccionadas
        btnPagarSeleccionadas.disabled = ventasSeleccionadas.length === 0;

        // Actualizar selección total
        const totalCheckboxes = document.querySelectorAll('.venta-checkbox:not(:disabled)');
        const checkedCount = document.querySelectorAll('.venta-checkbox:checked').length;
        selectAllCheckbox.checked = totalCheckboxes.length > 0 && checkedCount === totalCheckboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCheckboxes.length;
    }

    function mostrarResumenPago() {
        if (ventasSeleccionadas.length === 0) {
            resumenPagoContainer.style.display = 'none';
            return;
        }

        // Calcular total a pagar
        totalAPagar = ventasSeleccionadas.reduce((sum, venta) => sum + venta.saldo, 0);
        totalPagado = metodosPago.reduce((sum, pago) => sum + pago.montoBs, 0);
        restantePagar = Math.max(0, totalAPagar - totalPagado);

        // Actualizar valores en el resumen
        document.getElementById('totalAPagar').textContent = `Bs ${formatNumberVenezolano(totalAPagar.toFixed(2))}`;
        document.getElementById('totalPagado').textContent = `Bs ${formatNumberVenezolano(totalPagado.toFixed(2))}`;
        document.getElementById('restantePagar').textContent = `Bs ${formatNumberVenezolano(restantePagar.toFixed(2))}`;

        // Actualizar lista de métodos de pago
        const metodosPagoLista = document.getElementById('metodosPagoLista');
        metodosPagoLista.innerHTML = '';

        if (metodosPago.length === 0) {
            metodosPagoLista.innerHTML = `
                <div class="text-center py-3 text-muted">
                    <i class="fas fa-money-bill-wave fa-2x mb-2"></i>
                    <p>No hay métodos de pago agregados</p>
                    <small>Agregue métodos de pago para completar el abono</small>
                </div>
            `;
        } else {
            metodosPago.forEach((pago, index) => {
                const item = document.createElement('div');
                item.className = 'metodo-pago-item';

                const metodoDisplay = {
                    'efectivo_bs': 'Efectivo Bs',
                    'efectivo_usd': 'Efectivo $',
                    'transferencia': 'Transferencia',
                    'pago_movil': 'Pago Móvil',
                    'tarjeta': 'Tarjeta'
                }[pago.metodo];

                const montoStr = pago.metodo === 'efectivo_usd' ?
                    `$${formatNumberVenezolano(pago.monto.toFixed(2))}` :
                    `Bs ${formatNumberVenezolano(pago.monto.toFixed(2))}`;

                item.innerHTML = `
                    <div>
                        <strong>${metodoDisplay}</strong>
                        ${pago.comprobante ? `<br><small>Comprobante: ${pago.comprobante}</small>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="text-success" style="font-weight: bold;">${montoStr}</span>
                        <button class="btn btn-danger btn-sm" onclick="eliminarMetodoPago(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                metodosPagoLista.appendChild(item);
            });
        }

        // Actualizar estado del botón procesar pago
        btnProcesarPago.disabled = restantePagar > 0.01; // Tolerancia de 0.01 Bs
        if (btnProcesarPago.disabled) {
            btnProcesarPago.title = `Faltan Bs ${formatNumberVenezolano(restantePagar.toFixed(2))} por pagar`;
        } else {
            btnProcesarPago.title = 'Procesar pago';
        }

        // Mostrar resumen con animación
        resumenPagoContainer.style.display = 'block';
        resumenPagoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    window.eliminarMetodoPago = function (index) {
        if (index >= 0 && index < metodosPago.length) {
            metodosPago.splice(index, 1);
            mostrarResumenPago();
            mostrarMensaje('Método de pago eliminado', 'success');
        }
    };

    // ===== FUNCIONES DEL MODAL DE MÉTODO DE PAGO =====

    function abrirModalMetodoPago() {
        selectMetodoPago.value = '';
        montoPagoInput.value = '';
        comprobantePagoInput.value = '';
        divTasaCambio.style.display = 'none';
        divComprobante.style.display = 'none';
        infoPagoModal.style.display = 'none';
        lastMontoInput = '';

        actualizarInfoModal();
        modalMetodoPago.style.display = 'flex';

        setTimeout(() => {
            selectMetodoPago.focus();
        }, 100);
    }

    function actualizarInfoModal() {
        if (ventasSeleccionadas.length === 0) {
            infoPagoModal.style.display = 'none';
            return;
        }

        infoPagoModal.className = 'alert alert-info';
        infoPagoModal.style.display = 'block';
        textoInfoModal.innerHTML = `
            <strong>Total a pagar:</strong> Bs ${formatNumberVenezolano(totalAPagar.toFixed(2))}<br>
            <strong>Pagado:</strong> Bs ${formatNumberVenezolano(totalPagado.toFixed(2))}<br>
            <strong>Restante:</strong> Bs ${formatNumberVenezolano(restantePagar.toFixed(2))}
        `;
    }

    function actualizarValidacionModal() {
        const metodo = selectMetodoPago.value;
        const monto = parseNumberVenezolano(montoPagoInput.value);
        let montoBs = monto;

        if (metodo === 'efectivo_usd') {
            montoBs = monto * tasaActual;
        }

        const nuevoTotalPagado = totalPagado + montoBs;
        const excedente = nuevoTotalPagado - totalAPagar;

        if (montoBs <= 0) {
            montoPagoInput.classList.remove('is-invalid');
            btnAgregarPago.disabled = true;
            btnAgregarPago.innerHTML = 'Agregar';
            infoPagoModal.className = 'alert alert-info';
        } else if (excedente > 0.05) {
            montoPagoInput.classList.add('is-invalid');
            btnAgregarPago.disabled = true;
            btnAgregarPago.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Excede';
            infoPagoModal.className = 'alert alert-danger';
            textoInfoModal.innerHTML = `
                <strong>¡Atención!</strong> El monto excede el total a pagar por Bs ${formatNumberVenezolano(excedente.toFixed(2))}<br>
                <small>Máximo permitido: Bs ${formatNumberVenezolano((totalAPagar - totalPagado).toFixed(2))}</small>
            `;
        } else {
            montoPagoInput.classList.remove('is-invalid');
            btnAgregarPago.disabled = false;
            btnAgregarPago.innerHTML = 'Agregar';
            infoPagoModal.className = 'alert alert-info';

            let contenidoHTML = `
                <strong>Total a pagar:</strong> Bs ${formatNumberVenezolano(totalAPagar.toFixed(2))}<br>
                <strong>Pagado:</strong> Bs ${formatNumberVenezolano(totalPagado.toFixed(2))}<br>
                <strong>Restante:</strong> Bs ${formatNumberVenezolano(restantePagar.toFixed(2))}
            `;

            if (metodo === 'efectivo_usd' && monto > 0) {
                contenidoHTML += `<br><strong>Equivalente en Bs:</strong> Bs ${formatNumberVenezolano(montoBs.toFixed(2))}`;
            }

            textoInfoModal.innerHTML = contenidoHTML;
        }
    }

    function cerrarModalMetodoPago() {
        modalMetodoPago.style.display = 'none';
        lastMontoInput = '';
    }

    function agregarMetodoPago() {
        const metodo = selectMetodoPago.value;
        const monto = parseNumberVenezolano(montoPagoInput.value);
        let tasaCambio = metodo === 'efectivo_usd' ? tasaActual : null;
        const comprobante = comprobantePagoInput.value;

        // Validaciones básicas
        if (!metodo) {
            mostrarMensaje('❌ Seleccione un método de pago', 'error');
            return;
        }

        if (monto <= 0) {
            mostrarMensaje('❌ El monto debe ser mayor a cero', 'error');
            return;
        }

        // Calcular monto en BS para validación
        let montoBs = monto;
        if (metodo === 'efectivo_usd') {
            montoBs = monto * tasaActual;
        }

        // Validar que no se exceda el total a pagar
        if (totalPagado + montoBs > totalAPagar + 0.05) {
            mostrarMensaje(`❌ El monto excede el total a pagar por Bs ${formatNumberVenezolano((totalPagado + montoBs - totalAPagar).toFixed(2))}`, 'error');
            return;
        }

        if ((metodo === 'transferencia' || metodo === 'pago_movil' || metodo === 'tarjeta') && !comprobante) {
            mostrarMensaje('❌ El número de comprobante es obligatorio para este método de pago', 'error');
            comprobantePagoInput.classList.add('is-invalid');
            return;
        }

        if (comprobante && !/^\d+$/.test(comprobante)) {
            mostrarMensaje('❌ El comprobante debe contener solo números', 'error');
            comprobantePagoInput.classList.add('is-invalid');
            return;
        }

        // Verificar duplicados
        const pagoExistente = metodosPago.find(p =>
            p.metodo === metodo &&
            p.monto === monto &&
            p.comprobante === comprobante
        );

        if (pagoExistente) {
            mostrarMensaje('⚠️ Este método de pago ya fue agregado', 'warning');
            return;
        }

        // Agregar a la lista de métodos de pago
        metodosPago.push({
            metodo: metodo,
            monto: monto,
            tasa_cambio: tasaCambio,
            comprobante: comprobante,
            montoBs: montoBs
        });

        mostrarResumenPago();
        cerrarModalMetodoPago();
        mostrarMensaje('✅ Método de pago agregado correctamente', 'success');
    }

    // ===== FUNCIONES DEL HISTORIAL =====

    function cargarHistorialAbonos() {
        // Mostrar loading
        listaHistorialAbonos.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
                <p>Cargando historial...</p>
            </div>
        `;

        // CORRECCIÓN: Usar la URL correcta
        fetch(getAppUrl(`/api-historial-abonos-cliente/${clienteCedula}/`))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    mostrarHistorialAbonos(data.abonos);
                    mostrarMensaje(`✅ Historial cargado: ${data.abonos.length} abonos`, 'success');
                } else {
                    mostrarHistorialAbonos([]);
                    mostrarMensaje(`⚠️ ${data.error || 'Error al cargar el historial'}`, 'warning');
                }
            })
            .catch(error => {
                console.error('Error cargando historial:', error);
                mostrarHistorialAbonos([]);
                mostrarMensaje('❌ Error al cargar el historial. Intente nuevamente.', 'error');
            });
    }

    function mostrarHistorialAbonos(abonos) {
        listaHistorialAbonos.innerHTML = '';

        if (abonos.length === 0) {
            listaHistorialAbonos.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-history fa-2x mb-2"></i>
                    <p>No hay historial de abonos</p>
                    <small>Este cliente no tiene abonos registrados</small>
                </div>
            `;
            return;
        }

        abonos.forEach(abono => {
            const item = document.createElement('div');
            item.className = 'historial-item';

            const metodoDisplay = abono.metodo_pago_display ||
                (abono.metodo_pago === 'efectivo_bs' ? 'Efectivo Bs' :
                    abono.metodo_pago === 'efectivo_usd' ? 'Efectivo $' :
                        abono.metodo_pago === 'transferencia' ? 'Transferencia' :
                            abono.metodo_pago === 'pago_movil' ? 'Pago Móvil' :
                                abono.metodo_pago === 'tarjeta' ? 'Tarjeta' : abono.metodo_pago);

            item.innerHTML = `
                <div class="historial-info">
                    <strong>Venta #${abono.venta_id}</strong>
                    <br>
                    <small>${abono.fecha_abono} - ${metodoDisplay}</small>
                    ${abono.comprobante ? `<br><small><i class="fas fa-receipt"></i> ${abono.comprobante}</small>` : ''}
                    ${abono.observaciones ? `<br><small><i class="fas fa-sticky-note"></i> ${abono.observaciones.substring(0, 50)}${abono.observaciones.length > 50 ? '...' : ''}</small>` : ''}
                </div>
                <div>
                    <span class="historial-monto">Bs ${formatNumberVenezolano(abono.monto_abono_bs.toFixed(2))}</span>
                    <br>
                    <span class="badge ${abono.anulado ? 'badge-danger' : 'badge-success'}">
                        ${abono.anulado ? 'Anulado' : 'Registrado'}
                    </span>
                </div>
            `;
            listaHistorialAbonos.appendChild(item);
        });
    }

    function filtrarHistorial() {
        const filtro = filterHistorial.value.toLowerCase();
        const fecha = fechaHistorial.value;

        const items = listaHistorialAbonos.querySelectorAll('.historial-item');
        let visibleCount = 0;

        items.forEach(item => {
            const texto = item.textContent.toLowerCase();
            const fechaItem = item.querySelector('small')?.textContent?.split(' ')[0] || '';

            const coincideTexto = !filtro || texto.includes(filtro);
            const coincideFecha = !fecha || fechaItem.includes(fecha.replace(/-/g, '/'));

            item.style.display = coincideTexto && coincideFecha ? '' : 'none';
            if (coincideTexto && coincideFecha) visibleCount++;
        });

        // Mostrar mensaje si no hay resultados
        if (visibleCount === 0 && items.length > 0) {
            listaHistorialAbonos.innerHTML += `
                <div class="text-center py-3 text-muted">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron resultados</p>
                </div>
            `;
        }
    }

    // ===== FUNCIONES DE FILTRADO =====

    function filtrarVentas() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const estadoPago = estadoPagoSelect ? estadoPagoSelect.value : '';

        const rows = tableBody.querySelectorAll('tr');
        let visibleRows = 0;

        rows.forEach(row => {
            if (row.classList.contains('empty-row')) {
                row.style.display = 'none';
                return;
            }

            const idVenta = row.cells[1]?.textContent?.toLowerCase() || '';
            const fechaVentaText = row.cells[2]?.textContent?.trim() || '';
            const estadoPagoVenta = row.getAttribute('data-estado-pago');

            const coincideId = !query || idVenta.includes(query);
            const coincideEstadoPago = !estadoPago || estadoPagoVenta === estadoPago;
            const coincideFechaVenta = fechaEnRango(fechaVentaText, filtroFechaVenta.desde, filtroFechaVenta.hasta);

            if (coincideId && coincideEstadoPago && coincideFechaVenta) {
                row.style.display = '';
                visibleRows++;

                // Habilitar/deshabilitar checkbox según disponibilidad
                const checkbox = row.querySelector('.venta-checkbox');
                if (checkbox) {
                    checkbox.disabled = false;
                }
            } else {
                row.style.display = 'none';

                // Deshabilitar checkbox en filas ocultas
                const checkbox = row.querySelector('.venta-checkbox');
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.disabled = true;
                }
            }
        });

        // Actualizar selección después de filtrar
        actualizarVentasSeleccionadas();
        actualizarResumenTotales();
    }

    function fechaEnRango(fechaTexto, fechaInicio, fechaFin) {
        if (!fechaInicio && !fechaFin) return true;

        try {
            const [dia, mes, anio] = fechaTexto.split('/');
            const fecha = new Date(anio, mes - 1, dia);

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

    function actualizarResumenTotales() {
        const filasVisibles = tableBody.querySelectorAll('tr:not([style*="display: none"]):not(.empty-row)');

        let totalVentasPendientes = 0;
        let totalDeuda = 0;
        let diasUltimaCompra = 0;
        let ventasAtrasadas = 0;

        filasVisibles.forEach(fila => {
            totalVentasPendientes++;

            const saldo = parseNumberVenezolano(fila.getAttribute('data-saldo')) || 0;
            const dias = parseInt(fila.getAttribute('data-dias')) || 0;
            const badgeClass = fila.getAttribute('data-badge-class');

            totalDeuda += saldo;

            if (diasUltimaCompra === 0 || dias < diasUltimaCompra) {
                diasUltimaCompra = dias;
            }

            if (badgeClass === 'badge-danger') {
                ventasAtrasadas++;
            }
        });

        document.getElementById('totalVentasPendientes').textContent = totalVentasPendientes;
        document.getElementById('totalDeudaCliente').textContent = 'Bs ' + formatNumberVenezolano(totalDeuda.toFixed(2));
        document.getElementById('diasUltimaCompra').textContent = diasUltimaCompra;
        document.getElementById('ventasAtrasadas').textContent = ventasAtrasadas;
    }

    function actualizarIndicadoresFiltro() {
        if (filtroFechaVenta.desde || filtroFechaVenta.hasta) {
            btnFiltroFechaVenta.classList.add('filtro-activo');
            btnFiltroFechaVenta.innerHTML = `<i class="fas fa-calendar-day"></i> Fecha de Venta <span class="badge badge-light">✓</span>`;
        } else {
            btnFiltroFechaVenta.classList.remove('filtro-activo');
            btnFiltroFechaVenta.innerHTML = `<i class="fas fa-calendar-day"></i> Fecha de Venta`;
        }

        if (estadoPagoSelect.value) {
            estadoPagoSelect.parentElement.classList.add('filtro-activo');
        } else {
            estadoPagoSelect.parentElement.classList.remove('filtro-activo');
        }
    }

    // ===== FUNCIONES DEL MODAL DE FECHAS =====

    function inicializarModalFechas() {
        function actualizarOpcionesRapidas() {
            const botonesOpciones = document.querySelector('.botones-opciones');
            botonesOpciones.innerHTML = `
                <button type="button" class="btn-opcion" data-dias="1">Hoy</button>
                <button type="button" class="btn-opcion" data-dias="8">Última semana</button>
                <button type="button" class="btn-opcion" data-dias="31">Último mes</button>
                <button type="button" class="btn-opcion" data-dias="365">Último año</button>
                <button type="button" class="btn-opcion btn-limpiar">Limpiar</button>
            `;

            document.querySelectorAll('.btn-opcion').forEach(btn => {
                btn.addEventListener('click', function (e) {
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

        function getFechaActual() {
            const hoy = new Date();
            const año = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const dia = String(hoy.getDate()).padStart(2, '0');
            return `${año}-${mes}-${dia}`;
        }

        function validarFechas() {
            const desde = fechaDesde.value;
            const hasta = fechaHasta.value;

            if (desde && hasta) {
                const fechaDesdeObj = new Date(desde);
                const fechaHastaObj = new Date(hasta);

                if (fechaHastaObj < fechaDesdeObj) {
                    fechaError.style.display = 'block';
                    btnAplicarFecha.disabled = true;
                    btnAplicarFecha.style.opacity = '0.6';
                    btnAplicarFecha.style.cursor = 'not-allowed';
                    return false;
                } else {
                    fechaError.style.display = 'none';
                    btnAplicarFecha.disabled = false;
                    btnAplicarFecha.style.opacity = '1';
                    btnAplicarFecha.style.cursor = 'pointer';
                    return true;
                }
            } else {
                fechaError.style.display = 'none';
                btnAplicarFecha.disabled = false;
                btnAplicarFecha.style.opacity = '1';
                btnAplicarFecha.style.cursor = 'pointer';
                return true;
            }
        }

        btnFiltroFechaVenta.addEventListener('click', function () {
            fechaDesde.value = filtroFechaVenta.desde || '';
            fechaHasta.value = filtroFechaVenta.hasta || '';
            actualizarOpcionesRapidas();
            validarFechas();
            modalFiltroFechas.style.display = 'flex';
        });

        function cerrarModalFechas() {
            modalFiltroFechas.style.display = 'none';
        }

        btnCerrarModalFecha.addEventListener('click', cerrarModalFechas);
        btnCancelarFecha.addEventListener('click', cerrarModalFechas);

        modalFiltroFechas.addEventListener('click', function (e) {
            if (e.target === modalFiltroFechas) {
                cerrarModalFechas();
            }
        });

        btnAplicarFecha.addEventListener('click', function () {
            if (!validarFechas()) {
                return;
            }

            filtroFechaVenta.desde = fechaDesde.value;
            filtroFechaVenta.hasta = fechaHasta.value;
            filtrarVentas();
            actualizarIndicadoresFiltro();
            cerrarModalFechas();
        });

        fechaDesde.addEventListener('change', validarFechas);
        fechaHasta.addEventListener('change', validarFechas);

        actualizarOpcionesRapidas();
    }

    // ===== PROCESAR PAGO =====

    function procesarPago() {
        if (ventasSeleccionadas.length === 0) {
            mostrarMensaje('❌ No hay ventas seleccionadas', 'error');
            return;
        }

        if (metodosPago.length === 0) {
            mostrarMensaje('❌ Agregue al menos un método de pago', 'error');
            return;
        }

        // Validar que el pago cubra el total (con tolerancia de 0.01 Bs)
        if (restantePagar > 0.01) {
            mostrarMensaje(`❌ El pago no cubre el total a pagar. Faltan Bs ${formatNumberVenezolano(restantePagar.toFixed(2))}`, 'error');
            return;
        }

        // Confirmar antes de procesar
        const confirmMessage = `¿Está seguro de procesar el pago de ${ventasSeleccionadas.length} venta(s) por un total de Bs ${formatNumberVenezolano(totalAPagar.toFixed(2))}?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        btnProcesarPago.disabled = true;
        btnProcesarPago.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        const data = {
            ventas: ventasSeleccionadas.map(v => v.id),
            metodos_pago: metodosPago.map(p => ({
                metodo: p.metodo,
                monto: p.monto,
                tasa_cambio: p.tasa_cambio,
                comprobante: p.comprobante
            }))
        };

        // CORRECCIÓN: Usar la URL correcta con getAppUrl
        fetch(getAppUrl('/procesar-pago-multiple/'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    mostrarMensaje(data.message, 'success');

                    // Limpiar todo
                    ventasSeleccionadas = [];
                    metodosPago = [];
                    resumenPagoContainer.style.display = 'none';

                    // Recargar la página después de 3 segundos
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                } else {
                    mostrarMensaje(`❌ ${data.error}`, 'error');
                    btnProcesarPago.disabled = false;
                    btnProcesarPago.innerHTML = '<i class="fas fa-check"></i> Procesar Pago';
                }
            })
            .catch(error => {
                console.error('Error procesando pago:', error);
                mostrarMensaje('❌ Error al procesar el pago. Verifique su conexión.', 'error');
                btnProcesarPago.disabled = false;
                btnProcesarPago.innerHTML = '<i class="fas fa-check"></i> Procesar Pago';
            });
    }

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

    // ===== EVENT LISTENERS =====

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
        estadoPagoSelect.addEventListener('change', function () {
            // Reload page with the selected filter
            const selectedValue = this.value;
            const currentUrl = new URL(window.location.href);

            if (selectedValue) {
                currentUrl.searchParams.set('estado_pago', selectedValue);
            } else {
                currentUrl.searchParams.delete('estado_pago');
            }

            window.location.href = currentUrl.toString();
        });
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', function () {
            filtroFechaVenta = { desde: null, hasta: null };

            if (searchInput) searchInput.value = '';
            if (estadoPagoSelect) estadoPagoSelect.value = '';

            fechaDesde.value = '';
            fechaHasta.value = '';

            actualizarIndicadoresFiltro();
            filtrarVentas();
            mostrarMensaje('✅ Filtros limpiados', 'success');
        });
    }

    // Botón pagar seleccionadas
    btnPagarSeleccionadas.addEventListener('click', function () {
        mostrarResumenPago();
    });

    // Cerrar resumen
    btnCerrarResumen.addEventListener('click', function () {
        resumenPagoContainer.style.display = 'none';
        mostrarMensaje('✅ Resumen de pago cerrado', 'success');
    });

    // Agregar método de pago
    btnAgregarMetodo.addEventListener('click', abrirModalMetodoPago);

    // Procesar pago
    btnProcesarPago.addEventListener('click', procesarPago);

    // Toggle historial
    btnToggleHistorial.addEventListener('click', function () {
        const isOpen = historialBody.style.display === 'block';
        historialBody.style.display = isOpen ? 'none' : 'block';
        this.classList.toggle('open', !isOpen);
        this.querySelector('i').className = isOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-up';

        if (!isOpen) {
            cargarHistorialAbonos();
        }
    });

    // Filtrar historial
    filterHistorial.addEventListener('input', filtrarHistorial);
    fechaHistorial.addEventListener('change', filtrarHistorial);

    // Modal método de pago
    selectMetodoPago.addEventListener('change', function () {
        const metodo = this.value;
        divTasaCambio.style.display = metodo === 'efectivo_usd' ? 'block' : 'none';
        divComprobante.style.display = (metodo === 'transferencia' || metodo === 'pago_movil' || metodo === 'tarjeta') ? 'block' : 'none';

        if (!divComprobante.style.display || divComprobante.style.display === 'none') {
            comprobantePagoInput.value = '';
        }

        montoPagoInput.value = '';
        lastMontoInput = '';
        actualizarValidacionModal();
    });

    setupMontoPagoFormatting();
    tasaCambioInput.value = formatNumberVenezolano(tasaActual.toFixed(2));
    tasaCambioInput.readOnly = true;
    setupNumberFormatting(tasaCambioInput);

    comprobantePagoInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
        this.classList.remove('is-invalid');
    });

    btnAgregarPago.addEventListener('click', agregarMetodoPago);
    btnCerrarModal.addEventListener('click', cerrarModalMetodoPago);
    btnCancelarModal.addEventListener('click', cerrarModalMetodoPago);

    modalMetodoPago.addEventListener('click', function (e) {
        if (e.target === modalMetodoPago) {
            cerrarModalMetodoPago();
        }
    });

    // ===== INICIALIZACIÓN =====

    function inicializar() {
        console.log('✅ Sistema de gestión de abonos por cliente inicializado');
        console.log('Cliente:', clienteCedula);
        console.log('Tasa actual:', tasaActual);

        // Verificar que las variables globales estén definidas
        if (!clienteCedula) {
            console.error('❌ ERROR: CLIENTE_CEDULA no está definida');
            mostrarMensaje('❌ Error: No se pudo cargar la información del cliente', 'error');
        }

        inicializarModalFechas();
        inicializarSeleccionVentas();
        actualizarIndicadoresFiltro();
        actualizarResumenTotales();

        if (searchInput) searchInput.focus();
        filtrarVentas();

        // Mostrar mensaje de bienvenida
        setTimeout(() => {
            mostrarMensaje('✅ Sistema de pago múltiple listo. Seleccione ventas para pagar.', 'success');
        }, 1000);
    }

    inicializar();
});