// ===== FUNCIONALIDAD DE CLIENTES =====
document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const printBtn = document.getElementById('printBtn');
    const filterCedulaTipo = document.getElementById('filterCedulaTipo');
    const filterTipoCliente = document.getElementById('filterTipoCliente');
    
    // Elementos del modal de eliminar cliente
    const modalEliminarCliente = document.getElementById('modalEliminarCliente');
    const btnCerrarModalEliminar = document.getElementById('btnCerrarModalEliminar');
    const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');
    const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
    const nombreClienteEliminar = document.getElementById('nombreClienteEliminar');
    const formEliminarCliente = document.getElementById('formEliminarCliente');
    
    // Elementos del modal de éxito
    const successModal = document.getElementById('successModal');
    const closeSuccessModalBtn = document.getElementById('closeSuccessModal');
    const successModalTitle = document.getElementById('successModalTitle');
    const successModalMessage = document.getElementById('successModalMessage');
    
    let searchTimeout;
    let clienteAEliminar = null;

    // ===== MODAL DE ÉXITO MEJORADO =====
    function inicializarModalExito() {
        // Función para mostrar el modal con mensajes personalizados
        function showSuccessModal(title, message) {
            successModalTitle.textContent = title;
            successModalMessage.textContent = message;
            successModal.classList.add('active');
            createFloatingLeaves();
        }
        
        // Función para cerrar el modal
        function closeSuccessModal() {
            successModal.classList.remove('active');
            // Limpiar hojas flotantes
            document.querySelectorAll('.leaf').forEach(el => el.remove());
        }
        
        // Cerrar modal al hacer clic en el botón
        closeSuccessModalBtn.addEventListener('click', closeSuccessModal);
        
        // Cerrar modal al hacer clic fuera del contenido
        successModal.addEventListener('click', function(e) {
            if (e.target === successModal) {
                closeSuccessModal();
            }
        });
        
        // Función para crear el efecto de hojas flotantes
        function createFloatingLeaves() {
            const modal = document.querySelector('.modal-success');
            const colors = ['#4caf50', '#81c784', '#a5d6a7', '#66bb6a'];
            
            for (let i = 0; i < 15; i++) {
                const leaf = document.createElement('div');
                leaf.className = 'leaf';
                leaf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                leaf.style.left = Math.random() * 100 + '%';
                leaf.style.top = Math.random() * 100 + '%';
                leaf.style.width = Math.random() * 20 + 15 + 'px';
                leaf.style.height = Math.random() * 20 + 15 + 'px';
                leaf.style.animation = `float ${Math.random() * 3 + 2}s ease-in-out forwards`;
                leaf.style.animationDelay = Math.random() * 1 + 's';
                
                modal.appendChild(leaf);
            }
        }
        
        // Mostrar modal según el tipo de acción exitosa
        if (REGISTRO_EXITOSO) {
            setTimeout(() => showSuccessModal('¡Cliente Registrado Exitosamente!', 'El cliente ha sido registrado correctamente en el sistema.'), 500);
        } else if (EDICION_EXITOSA) {
            setTimeout(() => showSuccessModal('¡Cliente Actualizado Exitosamente!', 'Los datos del cliente han sido actualizados correctamente.'), 500);
        } else if (ELIMINACION_EXITOSA) {
            setTimeout(() => showSuccessModal('¡Cliente Eliminado Exitosamente!', 'El cliente ha sido eliminado correctamente del sistema.'), 500);
        }
    }

    // ===== MODAL DE ELIMINACIÓN =====
    function inicializarModalEliminacion() {
        function abrirModalEliminar(clienteId, nombreCliente) {
            clienteAEliminar = clienteId;
            nombreClienteEliminar.textContent = nombreCliente;
            // Configurar la acción del formulario
            formEliminarCliente.action = `/clientes/eliminar/${clienteId}/`;
            modalEliminarCliente.style.display = 'flex';
        }

        function cerrarModalEliminar() {
            modalEliminarCliente.style.display = 'none';
            clienteAEliminar = null;
            nombreClienteEliminar.textContent = '';
        }

        btnCerrarModalEliminar.addEventListener('click', cerrarModalEliminar);
        btnCancelarEliminar.addEventListener('click', cerrarModalEliminar);

        modalEliminarCliente.addEventListener('click', function(e) {
            if (e.target === modalEliminarCliente) {
                cerrarModalEliminar();
            }
        });

        // Asignar evento a los botones de eliminar
        document.addEventListener('click', function(e) {
            if (e.target.closest('.btn-delete')) {
                const button = e.target.closest('.btn-delete');
                const clienteId = button.getAttribute('data-id');
                const nombreCliente = button.getAttribute('data-nombre');
                abrirModalEliminar(clienteId, nombreCliente);
            }
        });
    }

    // ===== FUNCIÓN DE FILTRADO EN TIEMPO REAL MEJORADA =====
    function filtrarClientes() {
        const query = searchInput.value.trim().toLowerCase();
        const tipoCedula = filterCedulaTipo.value;
        const tipoCliente = filterTipoCliente.value;
        
        const filas = tableBody.querySelectorAll('tr:not(.empty-row)');
        const emptyRowInitial = tableBody.querySelector('.empty-row.initial-empty');
        const emptyRowNoResults = tableBody.querySelector('.empty-row.no-results');
        
        let resultadosEncontrados = 0;
        
        // Recorrer todas las filas de clientes (excluyendo las filas de mensajes)
        for (let i = 0; i < filas.length; i++) {
            const fila = filas[i];
            
            // Saltar filas que no son de clientes
            if (fila.classList.contains('empty-row')) {
                continue;
            }
            
            const celdas = fila.getElementsByTagName('td');
            let coincide = true;
            
            // Filtro por búsqueda
            if (query !== '') {
                let coincideBusqueda = false;
                // Buscar en todas las celdas excepto la última (acciones)
                for (let j = 0; j < celdas.length - 1; j++) {
                    const textoCelda = celdas[j].textContent || celdas[j].innerText;
                    if (textoCelda.toLowerCase().includes(query)) {
                        coincideBusqueda = true;
                        break;
                    }
                }
                coincide = coincide && coincideBusqueda;
            }
            
            // Filtro por tipo de cédula
            if (tipoCedula !== '') {
                const cedula = celdas[0].textContent || celdas[0].innerText;
                if (!cedula.startsWith(tipoCedula)) {
                    coincide = false;
                }
            }
            
            // Filtro por tipo de cliente
            if (tipoCliente !== '') {
                const badge = celdas[5].querySelector('.badge');
                const tipoClienteFila = badge ? badge.textContent.trim().toLowerCase() : '';
                // Convertir a valor interno
                let valorTipoCliente = tipoClienteFila === 'particular' ? 'particular' : 
                                     tipoClienteFila === 'mayorista' ? 'mayorista' : '';
                
                if (valorTipoCliente !== tipoCliente) {
                    coincide = false;
                }
            }
            
            if (coincide) {
                fila.style.display = '';
                resultadosEncontrados++;
            } else {
                fila.style.display = 'none';
            }
        }
        
        // Manejar la visibilidad de los mensajes
        if (resultadosEncontrados === 0) {
            // No hay resultados
            // Si hay una búsqueda activa (query o filtros) mostramos "no resultados", sino mostramos "inicial"
            if (query !== '' || tipoCedula !== '' || tipoCliente !== '') {
                // Hay filtros activos, mostramos no resultados
                if (emptyRowInitial) emptyRowInitial.style.display = 'none';
                if (emptyRowNoResults) emptyRowNoResults.style.display = '';
            } else {
                // No hay filtros, mostramos el estado inicial (si no hay clientes)
                if (emptyRowInitial) emptyRowInitial.style.display = '';
                if (emptyRowNoResults) emptyRowNoResults.style.display = 'none';
            }
        } else {
            // Hay resultados, ocultamos ambos mensajes
            if (emptyRowInitial) emptyRowInitial.style.display = 'none';
            if (emptyRowNoResults) emptyRowNoResults.style.display = 'none';
        }
    }
    
    // ===== EVENTOS DE FILTROS EN TIEMPO REAL =====
    function manejarFiltros() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filtrarClientes, 300);
    }
    
    searchInput.addEventListener('input', manejarFiltros);
    filterCedulaTipo.addEventListener('change', manejarFiltros);
    filterTipoCliente.addEventListener('change', manejarFiltros);
    
    // ===== IMPRIMIR PDF CON FILTROS =====
    function imprimirPDF() {
        // Mostrar mensaje de carga
        const originalText = printBtn.innerHTML;
        printBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        printBtn.disabled = true;
        
        // Obtener valores actuales de los filtros
        const busqueda = searchInput.value;
        const tipoCedula = filterCedulaTipo.value;
        const tipoCliente = filterTipoCliente.value;
        
        // Construir URL con parámetros de filtro
        const params = new URLSearchParams();
        
        if (busqueda) params.append('busqueda', busqueda);
        if (tipoCedula) params.append('tipo_cedula', tipoCedula);
        if (tipoCliente) params.append('tipo_cliente', tipoCliente);
        
        // Construir la URL directamente
        const pdfUrl = `/clientes/generar-pdf/?${params.toString()}`;
        
        console.log('Generando PDF con URL:', pdfUrl);
        
        // Abrir en nueva pestaña
        window.open(pdfUrl, '_blank');
        
        // Restaurar el botón después de un breve delay
        setTimeout(() => {
            printBtn.innerHTML = originalText;
            printBtn.disabled = false;
        }, 2000);
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
    
    function mostrarMensaje(mensaje, tipo) {
        // Crear contenedor de mensajes si no existe
        let messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) {
            messagesContainer = document.createElement('div');
            messagesContainer.className = 'messages-container';
            document.querySelector('.clientes-container').insertBefore(messagesContainer, document.querySelector('.clientes-main'));
        }
        
        // Crear mensaje
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo}`;
        alert.innerHTML = `
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${mensaje}
        `;
        
        messagesContainer.appendChild(alert);
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 500);
        }, 5000);
    }
    
    // ===== AUTO-OCULTAR MENSAJES EXISTENTES =====
    function inicializarAutoOcultarMensajes() {
        const messages = document.querySelectorAll('.alert');
        messages.forEach(function(message) {
            setTimeout(function() {
                message.style.opacity = '0';
                message.style.transition = 'opacity 0.5s ease';
                setTimeout(function() {
                    if (message.parentNode) {
                        message.remove();
                    }
                }, 500);
            }, 5000);
        });
    }
    
    // ===== INICIALIZACIÓN =====
    function inicializar() {
        inicializarModalExito();
        inicializarModalEliminacion();
        inicializarAutoOcultarMensajes();
        
        // Configurar eventos
        if (printBtn) {
            printBtn.addEventListener('click', imprimirPDF);
        }
        
        // Focus en el campo de búsqueda al cargar la página
        if (searchInput) {
            searchInput.focus();
        }
        
        // Ejecutar filtrado inicial para mostrar todos los clientes
        filtrarClientes();
        
        console.log('Menú de clientes cargado correctamente');
        console.log('Registro exitoso:', REGISTRO_EXITOSO);
        console.log('Edición exitosa:', EDICION_EXITOSA);
        console.log('Eliminación exitosa:', ELIMINACION_EXITOSA);
    }
    
    inicializar();
});