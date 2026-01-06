// menu_lote.js - Funcionalidad completa para lotes con sistema de modales
document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const productoSearchInput = document.getElementById('productoSearchInput');
    const productoSuggestions = document.getElementById('productoSuggestions');
    const proveedorSearchInput = document.getElementById('proveedorSearchInput');
    const proveedorSuggestions = document.getElementById('proveedorSuggestions');
    const estadoSelect = document.getElementById('estadoSelect');
    const printBtn = document.getElementById('printBtn');
    
    // Elementos del modal de fechas
    const modalFiltroFechas = document.getElementById('modalFiltroFechas');
    const btnFiltroRecibimiento = document.getElementById('btnFiltroRecibimiento');
    const btnFiltroVencimiento = document.getElementById('btnFiltroVencimiento');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnAplicar = document.getElementById('btnAplicar');
    const modalTitulo = document.getElementById('modalTitulo');
    const fechaDesde = document.getElementById('fechaDesde');
    const fechaHasta = document.getElementById('fechaHasta');
    const botonesOpciones = document.querySelector('.botones-opciones');
    
    // Elementos del modal de editar costo
    const modalEditarCosto = document.getElementById('modalEditarCosto');
    const btnCerrarModalCosto = document.getElementById('btnCerrarModalCosto');
    const btnCancelarCosto = document.getElementById('btnCancelarCosto');
    const btnGuardarCosto = document.getElementById('btnGuardarCosto');
    const nuevoCostoUnitarioInput = document.getElementById('nuevoCostoUnitario');
    const loteIdCostoInput = document.getElementById('loteIdCosto');
    
    let searchTimeout;
    let productoSeleccionado = '';
    let productoSeleccionadoNombre = '';
    let proveedorSeleccionado = '';
    let proveedorSeleccionadoNombre = '';
    let tipoFiltroActual = ''; // 'recibimiento' o 'vencimiento'
    
    // Filtros actuales
    let filtroRecibimiento = { desde: null, hasta: null };
    let filtroVencimiento = { desde: null, hasta: null };

    // ===== SISTEMA DE MODALES =====
    
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

    function cerrarModalExito() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function cerrarModalError() {
        const modal = document.getElementById('errorModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function cerrarModalConfirmacion() {
        const modal = document.getElementById('confirmModal');
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

    function mostrarConfirmacionAccion(mensaje, titulo = 'Confirmar Acción') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const mensajeElement = document.getElementById('confirmModalMessage');
            const botonConfirmar = document.getElementById('confirmAction');
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
            
            const btnCancelar = document.getElementById('cancelConfirm');
            
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

    // ===== INICIALIZACIÓN DE MODALES =====
    function inicializarModales() {
        const closeSuccessModal = document.getElementById('closeSuccessModal');
        const closeErrorModal = document.getElementById('closeErrorModal');
        
        if (closeSuccessModal) {
            closeSuccessModal.addEventListener('click', cerrarModalExito);
        }
        
        if (closeErrorModal) {
            closeErrorModal.addEventListener('click', cerrarModalError);
        }
        
        const successModal = document.getElementById('successModal');
        const errorModal = document.getElementById('errorModal');
        
        if (successModal) {
            successModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    cerrarModalExito();
                }
            });
        }
        
        if (errorModal) {
            errorModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    cerrarModalError();
                }
            });
        }
    }

    function mostrarConfirmacion(mensaje, titulo = 'Confirmar Acción') {
        return mostrarConfirmacionAccion(mensaje, titulo);
    }

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

    /**
     * Obtiene la fecha actual en formato YYYY-MM-DD sin problemas de zona horaria
     */
    function getFechaActual() {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
    
    /**
     * Convierte una fecha de DD/MM/YYYY a objeto Date sin problemas de zona horaria
     */
    function parseFechaDDMMYYYY(fechaTexto) {
        try {
            const [dia, mes, anio] = fechaTexto.split('/');
            return new Date(anio, mes - 1, dia);
        } catch (error) {
            console.error('Error al parsear fecha:', error);
            return null;
        }
    }

    /**
     * Configura los límites de fecha según el tipo de filtro
     */
    function configurarLimitesFechas() {
        const hoy = getFechaActual();
        
        // Limpiar límites anteriores
        fechaDesde.removeAttribute('max');
        fechaHasta.removeAttribute('max');
        
        if (tipoFiltroActual === 'recibimiento') {
            // Para recibimiento, no se permiten fechas futuras
            fechaDesde.setAttribute('max', hoy);
            fechaHasta.setAttribute('max', hoy);
        } else if (tipoFiltroActual === 'vencimiento' && estadoSelect.value === 'vencido') {
            // Para vencimiento con estado vencido, no se permiten fechas futuras
            fechaDesde.setAttribute('max', hoy);
            fechaHasta.setAttribute('max', hoy);
        }
        // Para vencimiento sin estado vencido, no hay restricción de fechas futuras
    }

    /**
     * Valida las fechas en tiempo real
     */
    function validarFechas() {
        const desde = fechaDesde.value;
        const hasta = fechaHasta.value;
        const hoy = getFechaActual();
        
        // Limpiar mensajes de error anteriores
        limpiarMensajesError();
        
        // Validación básica: fecha hasta no puede ser menor que fecha desde
        if (desde && hasta) {
            const fechaDesdeObj = new Date(desde);
            const fechaHastaObj = new Date(hasta);
            
            if (fechaHastaObj < fechaDesdeObj) {
                mostrarErrorFechaHasta('La fecha "Hasta" no puede ser menor que la fecha "Desde"');
                btnAplicar.disabled = true;
                return false;
            }
        }
        
        // Validaciones específicas por tipo de filtro
        if (tipoFiltroActual === 'recibimiento') {
            // Para recibimiento: no se permiten fechas futuras
            if (desde && new Date(desde) > new Date(hoy)) {
                mostrarErrorFechaDesde('La fecha de recibimiento no puede ser futura');
                btnAplicar.disabled = true;
                return false;
            }
            if (hasta && new Date(hasta) > new Date(hoy)) {
                mostrarErrorFechaHasta('La fecha de recibimiento no puede ser futura');
                btnAplicar.disabled = true;
                return false;
            }
        } else if (tipoFiltroActual === 'vencimiento' && estadoSelect.value === 'vencido') {
            // Para vencimiento con estado vencido: no se permiten fechas futuras
            if (desde && new Date(desde) > new Date(hoy)) {
                mostrarErrorFechaDesde('Para lotes vencidos, la fecha no puede ser futura');
                btnAplicar.disabled = true;
                return false;
            }
            if (hasta && new Date(hasta) > new Date(hoy)) {
                mostrarErrorFechaHasta('Para lotes vencidos, la fecha no puede ser futura');
                btnAplicar.disabled = true;
                return false;
            }
        }
        
        btnAplicar.disabled = false;
        return true;
    }

    /**
     * Muestra mensaje de error en fecha desde
     */
    function mostrarErrorFechaDesde(mensaje) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.id = 'errorFechaDesde';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensaje}`;
        
        const fechaGroup = fechaDesde.closest('.fecha-group');
        fechaGroup.appendChild(errorDiv);
        fechaDesde.classList.add('input-error');
    }

    /**
     * Muestra mensaje de error en fecha hasta
     */
    function mostrarErrorFechaHasta(mensaje) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.id = 'errorFechaHasta';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensaje}`;
        
        const fechaGroup = fechaHasta.closest('.fecha-group');
        fechaGroup.appendChild(errorDiv);
        fechaHasta.classList.add('input-error');
    }

    /**
     * Limpia todos los mensajes de error
     */
    function limpiarMensajesError() {
        const errores = document.querySelectorAll('.error-message');
        errores.forEach(error => error.remove());
        
        fechaDesde.classList.remove('input-error');
        fechaHasta.classList.remove('input-error');
    }

    /**
     * Muestra mensaje de no resultados encontrados
     */
    function mostrarMensajeNoResultados() {
        // Verificar si ya existe un mensaje de no resultados
        let mensajeNoResultados = tableBody.querySelector('.no-resultados');
        if (!mensajeNoResultados) {
            mensajeNoResultados = document.createElement('tr');
            mensajeNoResultados.className = 'empty-row no-resultados';
            mensajeNoResultados.innerHTML = `
                <td colspan="11">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron lotes</h3>
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

    // ===== INICIALIZACIÓN DEL MODAL DE FECHAS =====
    function inicializarModalFechas() {
        function actualizarOpcionesRapidas() {
            const estado = estadoSelect.value;
            const esVencido = estado === 'vencido';
            const hoy = getFechaActual();
            
            if (esVencido && tipoFiltroActual === 'vencimiento') {
                botonesOpciones.innerHTML = `
                    <button type="button" class="btn-opcion" data-dias="1">Hoy</button>
                    <button type="button" class="btn-opcion" data-dias="8">Última semana</button>
                    <button type="button" class="btn-opcion" data-dias="31">Último mes</button>
                    <button type="button" class="btn-opcion" data-dias="365">Último año</button>
                    <button type="button" class="btn-opcion btn-limpiar">Limpiar</button>
                `;
            } else if (tipoFiltroActual === 'vencimiento') {
                botonesOpciones.innerHTML = `
                    <button type="button" class="btn-opcion" data-dias="1">Hoy</button>
                    <button type="button" class="btn-opcion" data-dias="8">Próxima semana</button>
                    <button type="button" class="btn-opcion" data-dias="31">Próximo mes</button>
                    <button type="button" class="btn-opcion" data-dias="365">Próximo año</button>
                    <button type="button" class="btn-opcion btn-limpiar">Limpiar</button>
                `;
            } else {
                // Para recibimiento, solo opciones pasadas
                botonesOpciones.innerHTML = `
                    <button type="button" class="btn-opcion" data-dias="1">Hoy</button>
                    <button type="button" class="btn-opcion" data-dias="8">Última semana</button>
                    <button type="button" class="btn-opcion" data-dias="31">Último mes</button>
                    <button type="button" class="btn-opcion" data-dias="365">Último año</button>
                    <button type="button" class="btn-opcion btn-limpiar">Limpiar</button>
                `;
            }

            document.querySelectorAll('.btn-opcion').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (this.classList.contains('btn-limpiar')) {
                        fechaDesde.value = '';
                        fechaHasta.value = '';
                        limpiarMensajesError();
                        btnAplicar.disabled = false;
                        return;
                    }
                    const dias = parseInt(this.getAttribute('data-dias'));
                    aplicarRangoFecha(dias);
                    // Validar después de aplicar el rango
                    setTimeout(validarFechas, 100);
                });
            });
        }

        function aplicarRangoFecha(dias) {
            const hoy = new Date();
            const fechaInicio = new Date();
            const fechaFin = new Date();
            
            const estado = estadoSelect.value;
            const esVencido = estado === 'vencido';
            const esVencimiento = tipoFiltroActual === 'vencimiento';
            const esRecibimiento = tipoFiltroActual === 'recibimiento';
            
            if (dias === 1) {
                const fechaHoy = getFechaActual();
                fechaDesde.value = fechaHoy;
                fechaHasta.value = fechaHoy;
            } else if (esVencido && esVencimiento) {
                // Para vencidos: rangos en el pasado
                fechaInicio.setDate(hoy.getDate() - (dias - 1));
                fechaFin.setDate(hoy.getDate());
                fechaDesde.value = fechaInicio.toISOString().split('T')[0];
                fechaHasta.value = fechaFin.toISOString().split('T')[0];
            } else if (esVencimiento) {
                // Para vencimiento normal: puede ser futuro
                fechaInicio.setDate(hoy.getDate());
                fechaFin.setDate(hoy.getDate() + (dias - 1));
                fechaDesde.value = fechaInicio.toISOString().split('T')[0];
                fechaHasta.value = fechaFin.toISOString().split('T')[0];
            } else if (esRecibimiento) {
                // Para recibimiento: solo pasado
                fechaInicio.setDate(hoy.getDate() - (dias - 1));
                fechaFin.setDate(hoy.getDate());
                fechaDesde.value = fechaInicio.toISOString().split('T')[0];
                fechaHasta.value = fechaFin.toISOString().split('T')[0];
            }
        }

        // Event listeners para abrir modales de fecha
        btnFiltroRecibimiento.addEventListener('click', function() {
            tipoFiltroActual = 'recibimiento';
            modalTitulo.textContent = 'Filtrar por Fecha de Recibimiento';
            fechaDesde.value = filtroRecibimiento.desde || '';
            fechaHasta.value = filtroRecibimiento.hasta || '';
            limpiarMensajesError();
            btnAplicar.disabled = false;
            configurarLimitesFechas();
            actualizarOpcionesRapidas();
            modalFiltroFechas.style.display = 'flex';
        });

        btnFiltroVencimiento.addEventListener('click', function() {
            tipoFiltroActual = 'vencimiento';
            modalTitulo.textContent = 'Filtrar por Fecha de Vencimiento';
            fechaDesde.value = filtroVencimiento.desde || '';
            fechaHasta.value = filtroVencimiento.hasta || '';
            limpiarMensajesError();
            btnAplicar.disabled = false;
            configurarLimitesFechas();
            actualizarOpcionesRapidas();
            modalFiltroFechas.style.display = 'flex';
        });

        function cerrarModal() {
            modalFiltroFechas.style.display = 'none';
            limpiarMensajesError();
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

            if (tipoFiltroActual === 'recibimiento') {
                filtroRecibimiento.desde = fechaDesde.value;
                filtroRecibimiento.hasta = fechaHasta.value;
            } else {
                filtroVencimiento.desde = fechaDesde.value;
                filtroVencimiento.hasta = fechaHasta.value;
            }
            filtrarLotes();
            actualizarIndicadoresFiltro();
            cerrarModal();
        });

        // Event listeners para validación en tiempo real
        fechaDesde.addEventListener('change', validarFechas);
        fechaDesde.addEventListener('input', validarFechas);
        fechaHasta.addEventListener('change', validarFechas);
        fechaHasta.addEventListener('input', validarFechas);

        // También validar cuando cambia el estado (puede afectar a vencimiento)
        estadoSelect.addEventListener('change', function() {
            if (modalFiltroFechas.style.display === 'flex' && tipoFiltroActual === 'vencimiento') {
                configurarLimitesFechas();
                validarFechas();
            }
        });

        actualizarOpcionesRapidas();
    }

    // ===== INICIALIZACIÓN DEL MODAL DE EDITAR COSTO =====
    function inicializarModalCosto() {
        function abrirModalEditarCosto(loteId, costoActual) {
            loteIdCostoInput.value = loteId;
            // Usar parseFloat para manejar correctamente los decimales
            nuevoCostoUnitarioInput.value = parseFloat(costoActual).toFixed(2);
            modalEditarCosto.style.display = 'flex';
            nuevoCostoUnitarioInput.focus();
            nuevoCostoUnitarioInput.select();
        }

        function cerrarModalEditarCosto() {
            modalEditarCosto.style.display = 'none';
            nuevoCostoUnitarioInput.value = '';
            loteIdCostoInput.value = '';
        }

        btnCerrarModalCosto.addEventListener('click', cerrarModalEditarCosto);
        btnCancelarCosto.addEventListener('click', cerrarModalEditarCosto);

        modalEditarCosto.addEventListener('click', function(e) {
            if (e.target === modalEditarCosto) {
                cerrarModalEditarCosto();
            }
        });

        btnGuardarCosto.addEventListener('click', function() {
            const loteId = loteIdCostoInput.value;
            // Usar parseFloat para manejar correctamente los decimales
            const nuevoCosto = parseFloat(nuevoCostoUnitarioInput.value);
            
            if (isNaN(nuevoCosto) || nuevoCosto <= 0) {
                mostrarModalError('Error', 'Por favor, ingrese un costo unitario válido (mayor a 0).');
                return;
            }

            fetch(`${ACTUALIZAR_COSTO_URL}${loteId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    costo_unitario: nuevoCosto
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const celdaCosto = document.querySelector(`.editable-costo[data-lote-id="${loteId}"]`);
                    const celdaCostoTotal = document.querySelector(`.costo-total[data-lote-id="${loteId}"]`);
                    
                    if (celdaCosto) {
                        celdaCosto.textContent = `$${parseFloat(data.costo_unitario).toFixed(2)}`;
                        celdaCosto.setAttribute('data-costo-actual', data.costo_unitario);
                    }
                    if (celdaCostoTotal) {
                        celdaCostoTotal.textContent = `$${parseFloat(data.costo_total).toFixed(2)}`;
                    }
                    
                    cerrarModalEditarCosto();
                    mostrarModalExito('¡Éxito!', data.message || 'Costo unitario actualizado correctamente');
                } else {
                    mostrarModalError('Error', data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarModalError('Error', 'Error al actualizar el costo unitario');
            });
        });

        document.addEventListener('click', function(e) {
            if (e.target.closest('.btn-edit-costo')) {
                const button = e.target.closest('.btn-edit-costo');
                const loteId = button.getAttribute('data-lote-id');
                const costoActual = button.closest('tr').querySelector('.editable-costo').getAttribute('data-costo-actual');
                abrirModalEditarCosto(loteId, costoActual);
            }
        });
    }

    // ===== FUNCIONALIDAD PARA CAMBIAR ESTADO =====
    function inicializarCambioEstado() {
        async function cambiarEstadoLote(loteId, estadoActual) {
            const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
            const mensajeConfirmacion = `¿Estás seguro de que deseas ${nuevoEstado === 'inactivo' ? 'desactivar' : 'activar'} este lote?`;
            
            const confirmado = await mostrarConfirmacion(mensajeConfirmacion);
            if (!confirmado) {
                return;
            }

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
                    const fila = document.querySelector(`tr[data-lote-id="${loteId}"]`);
                    const celdaEstado = fila.querySelector('.status');
                    const botonEstado = fila.querySelector('.btn-cambiar-estado');
                    const iconoEstado = botonEstado.querySelector('i');
                    
                    // Actualizar atributo data-estado de la fila
                    fila.setAttribute('data-estado', data.nuevo_estado);
                    
                    // Actualizar clases y texto del estado
                    celdaEstado.className = 'status ' + (data.nuevo_estado === 'activo' ? 'status-active' : 'status-inactive');
                    celdaEstado.textContent = data.nuevo_estado_display;
                    
                    // Actualizar icono del botón
                    iconoEstado.className = data.nuevo_estado === 'activo' ? 'fas fa-toggle-on' : 'fas fa-toggle-off';
                    botonEstado.setAttribute('data-estado-actual', data.nuevo_estado);
                    
                    // Re-aplicar filtros para actualizar la tabla según el estado actual
                    filtrarLotes();
                    
                    mostrarModalExito('¡Éxito!', data.message || 'Estado del lote actualizado correctamente');
                } else {
                    mostrarModalError('Error', data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarModalError('Error', 'Error al cambiar el estado del lote');
            });
        }

        document.addEventListener('click', function(e) {
            if (e.target.closest('.btn-cambiar-estado')) {
                const button = e.target.closest('.btn-cambiar-estado');
                const loteId = button.getAttribute('data-lote-id');
                const estadoActual = button.getAttribute('data-estado-actual');
                cambiarEstadoLote(loteId, estadoActual);
            }
        });
    }

    // ===== ACTUALIZAR INDICADORES DE FILTRO =====
    function actualizarIndicadoresFiltro() {
        if (filtroRecibimiento.desde || filtroRecibimiento.hasta) {
            btnFiltroRecibimiento.classList.add('filtro-activo');
            btnFiltroRecibimiento.innerHTML = `<i class="fas fa-calendar-day"></i> Recibimiento ✓`;
        } else {
            btnFiltroRecibimiento.classList.remove('filtro-activo');
            btnFiltroRecibimiento.innerHTML = `<i class="fas fa-calendar-day"></i> Fecha Recibimiento`;
        }

        if (filtroVencimiento.desde || filtroVencimiento.hasta) {
            btnFiltroVencimiento.classList.add('filtro-activo');
            btnFiltroVencimiento.innerHTML = `<i class="fas fa-calendar-times"></i> Vencimiento ✓`;
        } else {
            btnFiltroVencimiento.classList.remove('filtro-activo');
            btnFiltroVencimiento.innerHTML = `<i class="fas fa-calendar-times"></i> Fecha Vencimiento`;
        }

        if (estadoSelect.value) {
            estadoSelect.parentElement.classList.add('filtro-activo');
        } else {
            estadoSelect.parentElement.classList.remove('filtro-activo');
        }
    }

    // ===== FUNCIONALIDAD DE BÚSQUEDA Y FILTROS =====
    function manejarFiltros() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filtrarLotes();
        }, 300);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', manejarFiltros);
    }
    
    if (estadoSelect) {
        estadoSelect.addEventListener('change', function() {
            manejarFiltros();
            actualizarIndicadoresFiltro();
        });
    }

    // ===== BÚSQUEDA DE PRODUCTOS CON SUGERENCIAS - CORREGIDA =====
    if (productoSearchInput && productoSuggestions) {
        productoSearchInput.addEventListener('input', function(e) {
            mostrarSugerenciasProductos(e.target.value);
        });

        productoSearchInput.addEventListener('focus', function() {
            if (this.value && this.value !== productoSeleccionadoNombre) {
                mostrarSugerenciasProductos(this.value);
            }
        });

        document.addEventListener('click', function(e) {
            if (productoSearchInput && !productoSearchInput.contains(e.target) && 
                productoSuggestions && !productoSuggestions.contains(e.target)) {
                productoSuggestions.style.display = 'none';
            }
        });

        productoSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '') {
                productoSeleccionado = '';
                productoSeleccionadoNombre = '';
                filtrarLotes();
            }
        });
    }

    // ===== BÚSQUEDA DE PROVEEDORES CON SUGERENCIAS =====
    if (proveedorSearchInput && proveedorSuggestions) {
        proveedorSearchInput.addEventListener('input', function(e) {
            mostrarSugerenciasProveedores(e.target.value);
        });

        proveedorSearchInput.addEventListener('focus', function() {
            if (this.value && this.value !== proveedorSeleccionadoNombre) {
                mostrarSugerenciasProveedores(this.value);
            }
        });

        document.addEventListener('click', function(e) {
            if (proveedorSearchInput && !proveedorSearchInput.contains(e.target) && 
                proveedorSuggestions && !proveedorSuggestions.contains(e.target)) {
                proveedorSuggestions.style.display = 'none';
            }
        });

        proveedorSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '') {
                proveedorSeleccionado = '';
                proveedorSeleccionadoNombre = '';
                filtrarLotes();
            }
        });
    }

    // ===== MOSTRAR SUGERENCIAS DE PRODUCTOS - CORREGIDA =====
    function mostrarSugerenciasProductos(query) {
        if (!productoSuggestions) return;

        const suggestionsContainer = productoSuggestions;
        suggestionsContainer.innerHTML = '';

        if (!query.trim()) {
            suggestionsContainer.style.display = 'none';
            productoSeleccionado = '';
            productoSeleccionadoNombre = '';
            filtrarLotes();
            return;
        }

        const productosData = window.productosData || [];

        const sugerencias = productosData.filter(producto =>
            producto.nombre.toLowerCase().includes(query.toLowerCase()) ||
            (producto.serial && producto.serial.toLowerCase().includes(query.toLowerCase()))
        );

        if (sugerencias.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'producto-suggestion no-results';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <div>
                    <strong>No se encontraron productos</strong>
                    <small>Intenta con otros términos de búsqueda</small>
                </div>
            `;
            suggestionsContainer.appendChild(noResults);
        } else {
            sugerencias.forEach(producto => {
                const suggestion = document.createElement('div');
                suggestion.className = 'producto-suggestion';
                suggestion.innerHTML = `
                    <div>
                        <strong>${producto.nombre}</strong>
                        <small style="display: block; color: var(--natural-gray); font-size: 0.8em;">
                            Serial: ${producto.serial || 'N/A'}
                        </small>
                    </div>
                `;
                suggestion.setAttribute('data-producto-id', producto.id);
                suggestion.setAttribute('data-producto-nombre', producto.nombre);
                
                suggestion.addEventListener('click', function() {
                    const productoId = this.getAttribute('data-producto-id');
                    const productoNombre = this.getAttribute('data-producto-nombre');
                    
                    productoSearchInput.value = productoNombre;
                    productoSeleccionado = productoId;
                    productoSeleccionadoNombre = productoNombre;
                    suggestionsContainer.style.display = 'none';
                    filtrarLotes();
                });

                suggestionsContainer.appendChild(suggestion);
            });
        }

        suggestionsContainer.style.display = 'block';
    }

    // ===== MOSTRAR SUGERENCIAS DE PROVEEDORES =====
    function mostrarSugerenciasProveedores(query) {
        if (!proveedorSuggestions) return;

        const suggestionsContainer = proveedorSuggestions;
        suggestionsContainer.innerHTML = '';

        if (!query.trim()) {
            suggestionsContainer.style.display = 'none';
            proveedorSeleccionado = '';
            proveedorSeleccionadoNombre = '';
            filtrarLotes();
            return;
        }

        const proveedoresData = window.proveedoresData || [];

        const sugerencias = proveedoresData.filter(proveedor =>
            proveedor.nombre.toLowerCase().includes(query.toLowerCase())
        );

        if (sugerencias.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'proveedor-suggestion no-results';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <div>
                    <strong>No se encontraron proveedores</strong>
                    <small>Intenta con otros términos de búsqueda</small>
                </div>
            `;
            suggestionsContainer.appendChild(noResults);
        } else {
            sugerencias.forEach(proveedor => {
                const suggestion = document.createElement('div');
                suggestion.className = 'proveedor-suggestion';
                suggestion.textContent = proveedor.nombre;
                suggestion.setAttribute('data-proveedor-id', proveedor.id);
                suggestion.setAttribute('data-proveedor-nombre', proveedor.nombre);
                
                suggestion.addEventListener('click', function() {
                    const proveedorId = this.getAttribute('data-proveedor-id');
                    const proveedorNombre = this.getAttribute('data-proveedor-nombre');
                    
                    proveedorSearchInput.value = proveedorNombre;
                    proveedorSeleccionado = proveedorId;
                    proveedorSeleccionadoNombre = proveedorNombre;
                    suggestionsContainer.style.display = 'none';
                    filtrarLotes();
                });

                suggestionsContainer.appendChild(suggestion);
            });
        }

        suggestionsContainer.style.display = 'block';
    }

    // ===== FILTRAR LOTES EN LA TABLA =====
    function filtrarLotes() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const estado = estadoSelect ? estadoSelect.value : '';
        const proveedorId = proveedorSeleccionado ? proveedorSeleccionado : '';
        
        const rows = tableBody.querySelectorAll('tr');
        let visibleRows = 0;

        // Ocultar mensaje de no resultados al inicio del filtrado
        ocultarMensajeNoResultados();

        rows.forEach(row => {
            if (row.classList.contains('empty-row') || row.classList.contains('no-resultados')) {
                row.style.display = 'none';
                return;
            }

            const codigoLote = row.cells[1].textContent.toLowerCase();
            const productoId = row.getAttribute('data-producto-id');
            const proveedorIdFila = row.getAttribute('data-proveedor-id');
            const fechaRecibimientoText = row.cells[7].textContent.trim();
            const fechaVencimientoText = row.cells[8].textContent.trim();
            const estadoLote = row.getAttribute('data-estado');
            
            const coincideCodigo = !query || codigoLote.includes(query);
            const coincideProducto = !productoSeleccionado || productoId === productoSeleccionado;
            const coincideProveedor = !proveedorId || proveedorIdFila === proveedorId;
            const coincideEstado = !estado || estadoLote === estado;
            
            const coincideFechaRecibimiento = fechaEnRango(fechaRecibimientoText, filtroRecibimiento.desde, filtroRecibimiento.hasta);
            const coincideFechaVencimiento = fechaEnRango(fechaVencimientoText, filtroVencimiento.desde, filtroVencimiento.hasta);
            
            if (coincideCodigo && coincideProducto && coincideProveedor && coincideFechaRecibimiento && coincideFechaVencimiento && coincideEstado) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });

        const emptyRow = tableBody.querySelector('.empty-row:not(.no-resultados)');
        
        // Mostrar mensaje apropiado según los resultados
        if (visibleRows === 0) {
            // Verificar si hay filtros activos
            const hayFiltrosActivos = query || productoSeleccionado || proveedorId || estado || 
                                filtroRecibimiento.desde || filtroRecibimiento.hasta || 
                                filtroVencimiento.desde || filtroVencimiento.hasta;
            
            if (hayFiltrosActivos) {
                // Mostrar mensaje de no resultados con filtros
                mostrarMensajeNoResultados();
            } else if (emptyRow) {
                // Mostrar mensaje de no hay lotes registrados
                emptyRow.style.display = '';
            }
        } else {
            // Ocultar mensaje de no hay lotes registrados si hay resultados
            if (emptyRow) {
                emptyRow.style.display = 'none';
            }
        }
    }

    function fechaEnRango(fechaTexto, fechaInicio, fechaFin) {
        if (!fechaInicio && !fechaFin) return true;

        try {
            const fecha = parseFechaDDMMYYYY(fechaTexto);
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
                fin.setHours(0, 0, 0, 0);
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

    // ===== GENERAR PDF CON FILTROS ACTUALES =====
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            const query = searchInput ? searchInput.value.trim() : '';
            const estado = estadoSelect ? estadoSelect.value : '';
            const proveedor = proveedorSeleccionado ? proveedorSeleccionado : '';
            
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (productoSeleccionado) params.append('producto', productoSeleccionado);
            if (estado) params.append('estado', estado);
            if (proveedor) params.append('proveedor', proveedor);
            
            if (filtroRecibimiento.desde) params.append('fecha_recibimiento_desde', filtroRecibimiento.desde);
            if (filtroRecibimiento.hasta) params.append('fecha_recibimiento_hasta', filtroRecibimiento.hasta);
            if (filtroVencimiento.desde) params.append('fecha_vencimiento_desde', filtroVencimiento.desde);
            if (filtroVencimiento.hasta) params.append('fecha_vencimiento_hasta', filtroVencimiento.hasta);
            
            const pdfUrl = `/lotes/generar-pdf/?${params.toString()}`;
            window.open(pdfUrl, '_blank');
        });
    }

    // ===== LIMPIAR FILTROS =====
    function limpiarFiltros() {
        filtroRecibimiento = { desde: null, hasta: null };
        filtroVencimiento = { desde: null, hasta: null };
        
        if (searchInput) searchInput.value = '';
        if (estadoSelect) estadoSelect.value = '';
        if (productoSearchInput) productoSearchInput.value = '';
        if (proveedorSearchInput) proveedorSearchInput.value = '';
        
        productoSeleccionado = '';
        productoSeleccionadoNombre = '';
        proveedorSeleccionado = '';
        proveedorSeleccionadoNombre = '';
        
        actualizarIndicadoresFiltro();
        filtrarLotes();
    }

    document.querySelector('.productos-toolbar').addEventListener('dblclick', function(e) {
        if (e.ctrlKey) {
            limpiarFiltros();
        }
    });

    // ===== DETECCIÓN DE PARÁMETROS URL PARA MODALES =====
    function verificarParametrosURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const registroExitoso = urlParams.get('registro_exitoso');
        const edicionExitosa = urlParams.get('edicion_exitosa');
        const codigoLote = urlParams.get('codigo_lote');

        if (registroExitoso === 'true' && codigoLote) {
            // Mostrar modal de éxito después de cargar la página
            setTimeout(function() {
                mostrarModalExito(
                    '¡Lote Registrado!', 
                    `El lote "${codigoLote}" ha sido registrado exitosamente.`
                );
            }, 500);
        }

        if (edicionExitosa === 'true' && codigoLote) {
            // Mostrar modal de éxito después de cargar la página
            setTimeout(function() {
                mostrarModalExito(
                    '¡Lote Actualizado!', 
                    `El lote "${codigoLote}" ha sido actualizado exitosamente.`
                );
            }, 500);
        }
    }

    // ===== INICIALIZACIÓN =====
    function inicializar() {
        inicializarModalFechas();
        inicializarModalCosto();
        inicializarCambioEstado();
        inicializarModales();
        actualizarIndicadoresFiltro();
        verificarParametrosURL();
        
        if (searchInput) searchInput.focus();
        filtrarLotes();
        
        console.log('Sistema de gestión de lotes inicializado correctamente');
    }

    // Hacer funciones globales para que puedan ser llamadas desde otros scripts
    window.mostrarModalExito = mostrarModalExito;
    window.mostrarModalError = mostrarModalError;
    window.mostrarConfirmacion = mostrarConfirmacion;

    inicializar();
});