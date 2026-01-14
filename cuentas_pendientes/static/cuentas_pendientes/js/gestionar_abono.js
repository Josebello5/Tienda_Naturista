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
    let totalAPagarUsd = 0; // CORREGIDO: Definir variable faltante
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
        // Si es mensaje de éxito, usar el modal
        if (tipo === 'success') {
            const successModal = document.getElementById('successModal');
            const successModalTitle = document.getElementById('successModalTitle');
            const successModalMessage = document.getElementById('successModalMessage');
            const closeSuccessModal = document.getElementById('closeSuccessModal');
            
            if (successModal) {
                if (successModalTitle) successModalTitle.textContent = '¡Éxito!';
                if (successModalMessage) successModalMessage.textContent = mensaje;
                
                successModal.classList.add('active');
                
                // Configurar botón cerrar
                closeSuccessModal.onclick = function() {
                    successModal.classList.remove('active');
                };
                
                // Cerrar al hacer click fuera
                successModal.onclick = function(e) {
                    if (e.target === successModal) {
                        successModal.classList.remove('active');
                    }
                };
                return;
            }
        }

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
            const isChecked = this.checked;
            const checkboxes = document.querySelectorAll('.venta-checkbox:not(:disabled)');
            
            // Actualizar todos los checkboxes primero
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            
            // Actualizar el estado de selección una sola vez después de cambiar todos
            actualizarVentasSeleccionadas();
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
            const saldoUsd = parseNumberVenezolano(checkbox.getAttribute('data-saldo-usd'));

            if (ventaId && saldoUsd > 0) {
                // Convertir USD a Bs usando tasa actual
                const saldoBs = saldoUsd * tasaActual;
                ventasSeleccionadas.push({
                    id: ventaId,
                    saldo: saldoBs,  // Guardar en Bs para compatibilidad
                    saldoUsd: saldoUsd
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
        totalAPagarUsd = ventasSeleccionadas.reduce((sum, venta) => sum + venta.saldoUsd, 0); // CORREGIDO: Calcular USD
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
        
        let restanteUsd = totalAPagarUsd - (totalPagado / tasaActual);
        if (restanteUsd < 0) restanteUsd = 0;

        textoInfoModal.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span><strong>Total:</strong> Bs ${formatNumberVenezolano(totalAPagar.toFixed(2))}</span>
                <span><strong>($ ${formatNumberVenezolano(totalAPagarUsd.toFixed(2))})</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span><strong>Pagado:</strong> Bs ${formatNumberVenezolano(totalPagado.toFixed(2))}</span>
                <span><strong>($ ${formatNumberVenezolano((totalPagado / tasaActual).toFixed(2))})</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 5px;">
                <span><strong>Restante:</strong> Bs ${formatNumberVenezolano(restantePagar.toFixed(2))}</span>
                <span><strong>($ ${formatNumberVenezolano(restanteUsd.toFixed(2))})</strong></span>
            </div>
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

            let nuevoTotalPagadoUsd = totalPagado / tasaActual;
            if (metodo === 'efectivo_usd') {
                nuevoTotalPagadoUsd += monto;
            } else {
                nuevoTotalPagadoUsd += (monto / tasaActual);
            }
            
            let nuevoRestanteUsd = totalAPagarUsd - nuevoTotalPagadoUsd;
            if (nuevoRestanteUsd < 0) nuevoRestanteUsd = 0;

            let contenidoHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Total:</strong> Bs ${formatNumberVenezolano(totalAPagar.toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(totalAPagarUsd.toFixed(2))})</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span><strong>Pagado (+Actual):</strong> Bs ${formatNumberVenezolano((totalPagado + montoBs).toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(nuevoTotalPagadoUsd.toFixed(2))})</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 5px;">
                    <span><strong>Restante:</strong> Bs ${formatNumberVenezolano(Math.max(0, restantePagar - montoBs).toFixed(2))}</span>
                    <span><strong>($ ${formatNumberVenezolano(nuevoRestanteUsd.toFixed(2))})</strong></span>
                </div>
            `;

            if (metodo === 'efectivo_usd' && monto > 0) {
                contenidoHTML += `<div style="margin-top: 5px; font-size: 0.9em; color: var(--success);">
                    <i class="fas fa-exchange-alt"></i> Equivalente: Bs ${formatNumberVenezolano(montoBs.toFixed(2))}
                </div>`;
            } else if (monto > 0) {
                 contenidoHTML += `<div style="margin-top: 5px; font-size: 0.9em; color: var(--info);">
                    <i class="fas fa-exchange-alt"></i> Equivalente: $ ${formatNumberVenezolano((monto / tasaActual).toFixed(2))}
                </div>`;
            }

            textoInfoModal.innerHTML = contenidoHTML;

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

        fetch(getAppUrl(`/api-historial-abonos-cliente/${clienteCedula}/`))
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Manejar tanto el formato agrupado como el plano por si acaso
                    if (data.abonos_agrupados) {
                        mostrarHistorialAbonos(data.abonos_agrupados);
                    } else if (data.abonos) {
                        // Si viene plano, agruparlo aquí o mostrar aviso
                        console.warn('API devolvió abonos no agrupados');
                        mostrarHistorialAbonosPlano(data.abonos);
                    } else {
                        mostrarHistorialAbonos([]);
                    }
                } else {
                    mostrarHistorialAbonos([]);
                    console.error('API Error:', data.error);
                }
            })
            .catch(error => {
                console.error('Error cargando historial:', error);
                mostrarHistorialAbonos([]);
            });
    }

    function mostrarHistorialAbonos(grupos) {
        listaHistorialAbonos.innerHTML = '';

        if (!grupos || grupos.length === 0) {
            listaHistorialAbonos.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-history fa-2x mb-2"></i>
                    <p>No hay historial de abonos</p>
                </div>
            `;
            return;
        }

        grupos.forEach(grupo => {
            const container = document.createElement('div');
            container.className = 'historial-grupo';
            container.setAttribute('data-venta-id', grupo.venta_id);
            
            container.innerHTML = `
                <div class="historial-header" onclick="this.nextElementSibling.classList.toggle('active'); this.querySelector('.btn-toggle-icon').classList.toggle('open')">
                    <div class="historial-header-info">
                        <strong>Venta #${grupo.venta_id}</strong>
                        <br><small><i class="fas fa-calendar-alt"></i> Último: ${grupo.fecha_reciente}</small>
                    </div>
                    <div class="historial-header-monto">
                        <span class="historial-sub-monto">Bs ${formatNumberVenezolano(grupo.total_bs.toFixed(2))}</span>
                        <br><small>(${grupo.abonos.length} pago${grupo.abonos.length > 1 ? 's' : ''})</small>
                    </div>
                    <div class="btn-toggle-icon">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="historial-detalles">
                    ${grupo.abonos.map(abono => `
                        <div class="historial-sub-item ${abono.anulado ? 'text-muted' : ''}" data-busqueda="${abono.metodo_pago_display.toLowerCase()} ${abono.comprobante}">
                            <div class="historial-sub-info">
                                <strong>${abono.fecha_abono.split(' ')[1]}</strong> - ${abono.metodo_pago_display}
                                ${abono.comprobante ? `<br><small>#${abono.comprobante}</small>` : ''}
                                ${abono.anulado ? '<br><span class="badge badge-danger">Anulado</span>' : ''}
                            </div>
                            <div class="historial-sub-monto">
                                Bs ${formatNumberVenezolano(abono.monto_abono_bs.toFixed(2))}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            listaHistorialAbonos.appendChild(container);
        });
    }

    // Por si la API devuelve el formato viejo temporalmente (Cache)
    function mostrarHistorialAbonosPlano(abonos) {
        listaHistorialAbonos.innerHTML = `
            <div class="alert alert-warning mb-3">
                <i class="fas fa-exclamation-triangle"></i> Formato de historial antiguo. Por favor recargue la página (Ctrl+F5).
            </div>
        `;
        abonos.forEach(abono => {
            const item = document.createElement('div');
            item.className = 'historial-item';
            item.innerHTML = `
                <div class="historial-info">
                    <strong>Venta #${abono.venta_id}</strong><br>
                    <small>${abono.fecha_abono}</small>
                </div>
                <div class="historial-monto">Bs ${formatNumberVenezolano(abono.monto_abono_bs.toFixed(2))}</div>
            `;
            listaHistorialAbonos.appendChild(item);
        });
    }

    function filtrarHistorial() {
        const filtro = filterHistorial.value.toLowerCase().trim();
        const fecha = fechaHistorial.value;

        const grupos = listaHistorialAbonos.querySelectorAll('.historial-grupo');
        let visibleCount = 0;

        grupos.forEach(grupo => {
            const ventaId = grupo.getAttribute('data-venta-id').toLowerCase();
            const headerInfo = grupo.querySelector('.historial-header-info').textContent.toLowerCase();
            const subItems = grupo.querySelectorAll('.historial-sub-item');
            
            let coincideGrupo = ventaId.includes(filtro) || headerInfo.includes(filtro);
            let algunSubitemCoincide = false;

            subItems.forEach(item => {
                const searchData = item.getAttribute('data-busqueda') || '';
                if (searchData.includes(filtro)) {
                    algunSubitemCoincide = true;
                }
            });

            if (coincideGrupo || algunSubitemCoincide) {
                grupo.style.display = '';
                visibleCount++;
                // Si la coincidencia es en un subitem, desplegar el grupo
                if (algunSubitemCoincide && filtro.length > 0) {
                    grupo.querySelector('.historial-detalles').classList.add('active');
                    grupo.querySelector('.btn-toggle-icon').classList.add('open');
                }
            } else {
                grupo.style.display = 'none';
            }
        });

        // Limpiar mensaje previo si existe
        const msgPrevio = listaHistorialAbonos.querySelector('.no-results-msg');
        if (msgPrevio) msgPrevio.remove();

        if (visibleCount === 0 && grupos.length > 0) {
            const div = document.createElement('div');
            div.className = 'text-center py-3 text-muted no-results-msg';
            div.innerHTML = `<i class="fas fa-search"></i><p>No se encontraron resultados</p>`;
            listaHistorialAbonos.appendChild(div);
        }
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
            // Mostrar todas las filas visibles
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
                // row.style.display = ''; // DELEGADO A PAGINACIÓN
                row.classList.remove('filtro-oculto');
                visibleRows++;

                // Habilitar/deshabilitar checkbox según disponibilidad
                const checkbox = row.querySelector('.venta-checkbox');
                if (checkbox) {
                    checkbox.disabled = false;
                }
            } else {
                // row.style.display = 'none'; // DELEGADO A PAGINACIÓN
                row.classList.add('filtro-oculto');
                row.style.display = 'none'; // Ocultar inmediatamente

                // Deshabilitar checkbox en filas ocultas
                const checkbox = row.querySelector('.venta-checkbox');
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.disabled = true;
                }
            }
        });

        // Mostrar mensaje si no hay resultados
        const emptyRow = tableBody.querySelector('.empty-row');
        const emptyRowFilter = tableBody.querySelector('.empty-row-filter');
        
        // Verificar si hay filtros activos
        const hayFiltrosActivos = query || estadoPago || filtroFechaVenta.desde || filtroFechaVenta.hasta;
        
        // Contar total de filas de ventas (excluyendo las filas de mensaje)
        const totalFilasVentas = Array.from(rows).filter(row => 
            !row.classList.contains('empty-row') && !row.classList.contains('empty-row-filter')
        ).length;
        
        if (totalFilasVentas === 0) {
            // No hay ventas en absoluto - mostrar mensaje original de Django
            if (emptyRow) emptyRow.style.display = '';
            if (emptyRowFilter) emptyRowFilter.style.display = 'none';
        } else if (hayFiltrosActivos && visibleRows === 0) {
            // Hay ventas pero los filtros no devuelven resultados
            if (emptyRow) emptyRow.style.display = 'none';
            if (emptyRowFilter) emptyRowFilter.style.display = '';
            if (paginationContainer) paginationContainer.style.display = 'none';
        } else {
            // Hay resultados visibles
            if (emptyRow) emptyRow.style.display = 'none';
            if (emptyRowFilter) emptyRowFilter.style.display = 'none';
            
            // Actualizar paginación
            paginaActual = 1;
            actualizarPaginacion();
        }

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
        // CORREGIDO: Usar TODAS las filas para el conteo de parciales, independiente del filtro visible
        const todasLasFilas = Array.from(tableBody.querySelectorAll('tr:not(.empty-row):not(.empty-row-filter)'));
        
        let totalVentasParciales = 0;
        let totalDeudaUsd = 0;
        let diasUltimaCompra = 0;
        let ventasAtrasadas = 0;

        todasLasFilas.forEach(fila => {
            // Conteo específico: solo estado 'parcial'
            const estadoPago = fila.getAttribute('data-estado-pago');
            if (estadoPago === 'parcial') {
                totalVentasParciales++;
            }

            // Para los otros totales, seguimos usando la lógica de visibles si se desea, 
            // PERO el usuario pidió corrección específica en "que solo contabilice las ventas que tenga como estado pago parcial indiferentemente de los filtros"
            // Asumiré que DEUDA y otros datos deben reflejar lo visible (filtrado), pero el CONTEO pidió explícitamente "indiferentemente de los filtros".
            // Sin embargo, si filtro por FECHA, ¿debo sumar deuda de fechas ocultas? 
            // La solicitud fue específica: "en el panel que cuenta cuantas ventas pendientes hay que solo contabilice las ventas que tenga como estado pago parcial indiferentemente de los filtros pero solo en ese panel"
            
            // Si la fila está oculta por filtro, ¿la incluimos en la deuda total mostrada? 
            // Normalmente los paneles de resumen reflejan lo que se ve. Pero el usuario pidió una excepción para el conteo.
            // Mantendré la lógica de deuda basada en VISIBLES (filtro activo), pero el conteo será TOTAL PARCIAL.
            
            if (!fila.classList.contains('filtro-oculto')) {
                const saldoUsd = parseNumberVenezolano(fila.getAttribute('data-saldo-usd')) || 0;
                const dias = parseInt(fila.getAttribute('data-dias')) || 0;
                const badgeClass = fila.getAttribute('data-badge-class');

                totalDeudaUsd += saldoUsd;

                if (diasUltimaCompra === 0 || dias < diasUltimaCompra) {
                    diasUltimaCompra = dias;
                }

                if (badgeClass === 'badge-danger') {
                    ventasAtrasadas++;
                }
            }
        });

        // Calcular equivalente en Bs
        const totalDeudaBs = totalDeudaUsd * tasaActual;

        // Actualizar paneles
        // NOTA: El ID se llama totalVentasPendientes pero ahora muestra Parciales
        document.getElementById('totalVentasPendientes').textContent = totalVentasParciales;
        document.getElementById('totalDeudaCliente').textContent = 'Bs ' + formatNumberVenezolano(totalDeudaBs.toFixed(2));
        document.getElementById('totalDeudaClienteUsd').textContent = '$ ' + formatNumberVenezolano(totalDeudaUsd.toFixed(2));
        document.getElementById('diasUltimaCompra').textContent = diasUltimaCompra;
        document.getElementById('ventasAtrasadas').textContent = ventasAtrasadas;
    }

    function actualizarIndicadoresFiltro() {
        if (filtroFechaVenta.desde || filtroFechaVenta.hasta) {
            btnFiltroFechaVenta.classList.add('filtro-activo');
            btnFiltroFechaVenta.innerHTML = `<i class="fas fa-calendar-check"></i> Fecha de Venta <span class="badge badge-light">Activo</span>`;
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

    // Event Listeners para el modal de confirmación
    const modalConfirmacionPago = document.getElementById('modalConfirmacionPago');
    const btnConfirmarProcesarPago = document.getElementById('btnConfirmarProcesarPago');
    const btnCancelarConfirmacion = document.getElementById('btnCancelarConfirmacion');
    const btnCerrarModalConfirmacion = document.getElementById('btnCerrarModalConfirmacion');
    const confirmTotalBs = document.getElementById('confirmTotalBs');
    const confirmTotalUsd = document.getElementById('confirmTotalUsd');

    function cerrarModalConfirmacion() {
        modalConfirmacionPago.style.display = 'none';
        btnProcesarPago.disabled = false;
        btnProcesarPago.innerHTML = '<i class="fas fa-check"></i> Procesar Pago';
    }

    btnCancelarConfirmacion.addEventListener('click', cerrarModalConfirmacion);
    btnCerrarModalConfirmacion.addEventListener('click', cerrarModalConfirmacion);
    modalConfirmacionPago.addEventListener('click', (e) => {
        if (e.target === modalConfirmacionPago) cerrarModalConfirmacion();
    });

    function procesarPago() {
        if (ventasSeleccionadas.length === 0) {
            mostrarMensaje('❌ No hay ventas seleccionadas', 'error');
            return;
        }

        if (metodosPago.length === 0) {
            mostrarMensaje('❌ Agregue al menos un método de pago', 'error');
            return;
        }

        if (restantePagar > 0.01) {
            mostrarMensaje(`❌ El pago no cubre el total a pagar. Faltan Bs ${formatNumberVenezolano(restantePagar.toFixed(2))}`, 'error');
            return;
        }

        // Mostrar modal de confirmación en lugar de confirm()
        confirmTotalBs.textContent = `Bs ${formatNumberVenezolano(totalAPagar.toFixed(2))}`;
        confirmTotalUsd.textContent = `($ ${formatNumberVenezolano(totalAPagarUsd.toFixed(2))})`;
        modalConfirmacionPago.style.display = 'flex';
    }

    // El evento real de procesar pago ahora está en el botón del modal
    btnConfirmarProcesarPago.addEventListener('click', function() {
        btnConfirmarProcesarPago.disabled = true;
        btnConfirmarProcesarPago.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
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

        fetch(getAppUrl('/procesar-pago-multiple/'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarMensaje('✅ Pago procesado exitosamente', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                mostrarMensaje(`❌ ${data.error}`, 'error');
                cerrarModalConfirmacion();
                btnConfirmarProcesarPago.disabled = false;
                btnConfirmarProcesarPago.innerHTML = '<i class="fas fa-check"></i> Sí, Procesar';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarMensaje('❌ Error al procesar el pago', 'error');
            cerrarModalConfirmacion();
            btnConfirmarProcesarPago.disabled = false;
        });
    });

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
        estadoPagoSelect.addEventListener('change', filtrarVentas);
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

    function actualizarSaldosPendientesBs() {
        if (tasaActual === 0) {
            console.warn('Tasa actual no disponible');
            return;
        }
        
        // Buscar todas las celdas de saldo pendiente
        document.querySelectorAll('.saldo-bs-equiv').forEach(elem => {
            const saldoUsd = parseFloat(elem.dataset.saldoUsd);
            
            if (!isNaN(saldoUsd) && saldoUsd > 0) {
                // Reemplazar punto decimal para cálculo
                // El formato viene asegurado como float estándar (punto decimal) desde backend
                const saldoUsdClean = parseFloat(saldoUsd);
                
                const saldoBs = saldoUsdClean * tasaActual;
                const spanCalc = elem.querySelector('.calc-bs-dynamic');
                
                if (spanCalc) {
                    spanCalc.textContent = formatNumberVenezolano(saldoBs.toFixed(2));
                }
            }
        });
    }

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
        actualizarSaldosPendientesBs(); // Calcular saldos individuales

        if (searchInput) searchInput.focus();
        filtrarVentas();

        // Mostrar mensaje de bienvenida
        setTimeout(() => {
            mostrarMensaje('✅ Sistema de pago múltiple listo. Seleccione ventas para pagar.', 'success');
        }, 1000);
    }

    inicializar();
});