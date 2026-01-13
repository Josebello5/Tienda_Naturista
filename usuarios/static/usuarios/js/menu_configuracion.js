document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;

    // ===== ESTADO DE PAGINACIÓN =====
    let paginacionUsuarios = {
        paginaActual: 1,
        itemsPorPagina: 10
    };

    // ===== FUNCIONES DE PAGINACIÓN =====
    function paginarTablaUsuarios() {
        if (!tableBody) return;

        // Get all rows except empty messages
        const todasLasFilas = Array.from(tableBody.querySelectorAll('tr:not(.empty-row)'));

        // Filter to only get rows that are visible (not hidden by FILTERS)
        const filasVisibles = todasLasFilas.filter(fila => {
            const displayStyle = fila.style.display;
            const isPaginationHidden = fila.hasAttribute('data-pagination-hidden');
            return displayStyle !== 'none' || isPaginationHidden;
        });

        const totalFilasVisibles = filasVisibles.length;
        const totalPaginas = Math.ceil(totalFilasVisibles / paginacionUsuarios.itemsPorPagina) || 1;

        // Ensure current page is within valid range
        if (paginacionUsuarios.paginaActual > totalPaginas) {
            paginacionUsuarios.paginaActual = totalPaginas;
        }

        const paginaActual = paginacionUsuarios.paginaActual;
        const inicio = (paginaActual - 1) * paginacionUsuarios.itemsPorPagina;
        const fin = inicio + paginacionUsuarios.itemsPorPagina;

        filasVisibles.forEach((fila, index) => {
            if (index >= inicio && index < fin) {
                fila.removeAttribute('data-pagination-hidden');
                fila.style.display = '';
            } else {
                fila.setAttribute('data-pagination-hidden', 'true');
                fila.style.display = 'none';
            }
        });

        renderizarControlesPaginacion(paginaActual, totalPaginas, totalFilasVisibles, inicio, fin);
    }

    function renderizarControlesPaginacion(paginaActual, totalPaginas, totalFilas, inicio, fin) {
        const container = document.getElementById('paginationUsuarios');
        if (!container) return;

        if (totalFilas === 0 || totalPaginas <= 1) {
            container.innerHTML = '';
            return;
        }

        const mostrandoDesde = totalFilas > 0 ? inicio + 1 : 0;
        const mostrandoHasta = Math.min(fin, totalFilas);

        let html = `
            <button class="pagination-btn" ${paginaActual === 1 ? 'disabled' : ''} 
                    onclick="cambiarPaginaUsuarios(${paginaActual - 1})">
                Anterior
            </button>
        `;

        let startPage = Math.max(1, paginaActual - 2);
        let endPage = Math.min(totalPaginas, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        if (startPage > 1) {
            html += `<button class="pagination-btn" onclick="cambiarPaginaUsuarios(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-info">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination-btn ${i === paginaActual ? 'active' : ''}" 
                        onclick="cambiarPaginaUsuarios(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPaginas) {
            if (endPage < totalPaginas - 1) {
                html += `<span class="pagination-info">...</span>`;
            }
            html += `<button class="pagination-btn" onclick="cambiarPaginaUsuarios(${totalPaginas})">Última</button>`;
        }

        html += `
            <button class="pagination-btn" ${paginaActual === totalPaginas ? 'disabled' : ''} 
                    onclick="cambiarPaginaUsuarios(${paginaActual + 1})">
                Siguiente
            </button>
            <span class="pagination-info">
                ${mostrandoDesde}-${mostrandoHasta} de ${totalFilas}
            </span>
        `;

        container.innerHTML = html;
    }

    // Export function to global scope
    window.cambiarPaginaUsuarios = function(nuevaPagina) {
        paginacionUsuarios.paginaActual = nuevaPagina;
        paginarTablaUsuarios();
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // ===== FUNCIONES DE FILTRADO =====
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');

    function filtrarUsuarios() {
        const query = searchInput.value.trim().toLowerCase();
        const roleValue = roleFilter ? roleFilter.value : '';
        const statusValue = statusFilter ? statusFilter.value : '';
        const rows = tableBody.querySelectorAll('tr');
        let visibleRows = 0;

        rows.forEach(row => {
            if (row.classList.contains('empty-row')) {
                row.style.display = visibleRows === 0 ? '' : 'none';
                return;
            }

            row.removeAttribute('data-pagination-hidden');

            const cedula = row.cells[0].textContent.toLowerCase();
            const nombre = row.cells[1].textContent.toLowerCase();
            const apellido = row.cells[2].textContent.toLowerCase();
            const email = row.cells[4].textContent.toLowerCase();
            const rowRole = row.getAttribute('data-rol');
            const rowStatus = row.querySelector('.btn-toggle-status') ? row.querySelector('.btn-toggle-status').getAttribute('data-estado') : '';

            const matchQuery = !query || 
                          cedula.includes(query) || 
                          nombre.includes(query) || 
                          apellido.includes(query) || 
                          email.includes(query);
            
            const matchRole = !roleValue || (rowRole === roleValue);
            
            // Status comparison: "True" vs "True" or "False" vs "False"
            const matchStatus = !statusValue || (rowStatus === statusValue);

            if (matchQuery && matchRole && matchStatus) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });

        // Handle empty results
        let emptyRow = tableBody.querySelector('.empty-row');
        if (visibleRows === 0) {
            if (!emptyRow) {
                emptyRow = document.createElement('tr');
                emptyRow.className = 'empty-row';
                emptyRow.innerHTML = `
                    <td colspan="7">
                        <div class="no-results">
                            <i class="fas fa-search-minus"></i>
                            <h3>No se encontraron usuarios</h3>
                            <p>Intenta con otros términos de búsqueda o filtros</p>
                        </div>
                    </td>
                `;
                tableBody.appendChild(emptyRow);
            }
            emptyRow.style.display = '';
        } else {
            if (emptyRow) {
                emptyRow.style.display = 'none';
            }
        }

        paginacionUsuarios.paginaActual = 1;
        paginarTablaUsuarios();
    }

    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filtrarUsuarios, 300);
    });

    if (roleFilter) roleFilter.addEventListener('change', filtrarUsuarios);
    if (statusFilter) statusFilter.addEventListener('change', filtrarUsuarios);

    // ===== FUNCIONALIDAD DE IMPRESIÓN =====
    const btnImprimir = document.getElementById('btnImprimirUsuarios');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            const query = searchInput.value.trim();
            const role = roleFilter ? roleFilter.value : '';
            const status = statusFilter ? statusFilter.value : '';
            
            let url = '/usuarios/configuracion/generar-pdf/?';
            const params = new URLSearchParams();
            
            if (query) params.append('q', query);
            if (role) params.append('rol', role);
            if (status) params.append('estado', status);
            
            window.open(url + params.toString(), '_blank');
        });
    }

    // ===== GESTIÓN DE EDICIÓN DE USUARIO =====
    const modalEditar = document.getElementById('modalEditarUsuario');
    const btnCerrarEditar = document.getElementById('btnCerrarModalEditar');
    const btnCancelarEditar = document.getElementById('btnCancelarEditar');
    const btnGuardarEditar = document.getElementById('btnGuardarEditar');
    
    // Abrir modal editar
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.hasAttribute('disabled')) return;

            const id = this.getAttribute('data-id');
            const firstName = this.getAttribute('data-firstname');
            const lastName = this.getAttribute('data-lastname');
            const email = this.getAttribute('data-email');
            const rol = this.getAttribute('data-rol');
            
            document.getElementById('editUserId').value = id;
            document.getElementById('editFirstName').value = firstName;
            document.getElementById('editLastName').value = lastName;
            document.getElementById('editEmail').value = email;
            document.getElementById('editRol').value = rol;
            
            if (modalEditar) modalEditar.style.display = 'flex';
        });
    });

    function cerrarModalEditar() {
        if (modalEditar) modalEditar.style.display = 'none';
    }

    // ===== VALIDACIONES EDICIÓN DE USUARIO =====
    const editFirstName = document.getElementById('editFirstName');
    const editLastName = document.getElementById('editLastName');
    const editEmail = document.getElementById('editEmail');

    // Convertir nombre y apellido a mayúsculas automáticamente
    function setupUppercase(input) {
        if(input) {
            input.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        }
    }
    setupUppercase(editFirstName);
    setupUppercase(editLastName);
    
    // Validar solo letras en Nombre
    if(editFirstName) {
        editFirstName.addEventListener('input', function() {
             this.value = this.value.toUpperCase().slice(0, 10);
             this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        });
    }

    // Validar solo letras en Apellido
    if(editLastName) {
        editLastName.addEventListener('input', function() {
             this.value = this.value.toUpperCase().slice(0, 10);
             this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        });
    }

    function validarEmailEditar(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }


    if (btnCerrarEditar) btnCerrarEditar.addEventListener('click', cerrarModalEditar);
    if (btnCancelarEditar) btnCancelarEditar.addEventListener('click', cerrarModalEditar);

    if (btnGuardarEditar) {
        btnGuardarEditar.addEventListener('click', function() {
            const id = document.getElementById('editUserId').value;
            const firstName = document.getElementById('editFirstName').value.trim();
            const lastName = document.getElementById('editLastName').value.trim();
            const email = document.getElementById('editEmail').value.trim();
            const rol = document.getElementById('editRol').value;
            
            // Validaciones
            if (!firstName || !lastName || !email || !rol) {
                alert("Todos los campos son obligatorios.");
                return;
            }
            if (firstName.length < 3) {
                 alert("El nombre debe tener al menos 3 letras.");
                 return;
            }
            if (lastName.length < 3) {
                 alert("El apellido debe tener al menos 3 letras.");
                 return;
            }
            if (!validarEmailEditar(email)) {
                alert("Por favor, introduce un correo electrónico válido.");
                return;
            }

            fetch('/usuarios/configuracion/editar-usuario/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ 
                    id: id, 
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    rol: rol
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    mostrarExito('Usuario Actualizado', 'La información del usuario ha sido actualizada correctamente.');
                    cerrarModalEditar();
                    setTimeout(() => location.reload(), 1500);
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }

    // ===== GESTIÓN DE ESTADO =====
    const modalConfirmStatus = document.getElementById('confirmStatusModal');
    const confirmStatusBtn = document.getElementById('confirmStatusBtn');
    const cancelStatusBtn = document.getElementById('cancelStatusBtn');
    let userIdToToggle = null;

    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
        btn.addEventListener('click', function() {
            // Verificar si está deshabilitado
            if (this.hasAttribute('disabled')) return;
            
            userIdToToggle = this.getAttribute('data-id');
            const currentState = this.getAttribute('data-estado') === 'True';
            const userName = this.getAttribute('data-nombre');
            
            const message = currentState 
                ? `¿Estás seguro de que deseas DESACTIVAR al usuario ${userName}? No podrá iniciar sesión.`
                : `¿Estás seguro de que deseas ACTIVAR al usuario ${userName}?`;
            
            document.getElementById('confirmStatusMessage').textContent = message;
            
            if (modalConfirmStatus) {
                modalConfirmStatus.classList.add('active');
                modalConfirmStatus.style.visibility = 'visible';
                modalConfirmStatus.style.opacity = '1'; 
            }
        });
    });

    if (cancelStatusBtn) {
        cancelStatusBtn.addEventListener('click', function() {
            if (modalConfirmStatus) {
                modalConfirmStatus.classList.remove('active');
                modalConfirmStatus.style.visibility = 'hidden';
                modalConfirmStatus.style.opacity = '0';
            }
            userIdToToggle = null;
        });
    }

    if (confirmStatusBtn) {
        confirmStatusBtn.addEventListener('click', function() {
            if (!userIdToToggle) return;
            
            fetch('/usuarios/configuracion/cambiar-estado/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ id: userIdToToggle })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update UI locally or reload
                    mostrarExito('Estado Actualizado', 'El estado del usuario ha sido modificado.');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    alert('Error: ' + data.error);
                }
                if (modalConfirmStatus) {
                    modalConfirmStatus.classList.remove('active');
                    modalConfirmStatus.style.visibility = 'hidden';
                    modalConfirmStatus.style.opacity = '0';   
                }
            })
            .catch(error => console.error('Error:', error));
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

    // Modal Exito Helper reuse
    function mostrarExito(titulo, mensaje) {
        const modal = document.getElementById('successModal');
        if (modal) {
            document.getElementById('successModalTitle').textContent = titulo;
            document.getElementById('successModalMessage').textContent = mensaje;
            modal.classList.add('active');
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
        }
    }

    // Initialize
    // Initialize close button for success modal
    const closeSuccessBtn = document.getElementById('closeSuccessModal');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', function() {
            const modal = document.getElementById('successModal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.visibility = 'hidden';
                modal.style.opacity = '0';
            }
        });
    }

    paginarTablaUsuarios();
    // inicializarModalExito(); // This function was undefined, removed.

    // Check for success parameter in URL (from internal user creation)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registro_exitoso') === '1') {
        mostrarExito('¡Usuario Registrado!', 'El nuevo usuario ha sido agregado correctamente al sistema.');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
