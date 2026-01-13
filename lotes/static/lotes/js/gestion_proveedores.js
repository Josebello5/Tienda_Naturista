// gestion_proveedores.js - Versión corregida con acciones de editar y eliminar
document.addEventListener('DOMContentLoaded', function () {
    console.log('=== INICIANDO GESTIÓN DE PROVEEDORES CORREGIDA ===');

    // ===== ELEMENTOS DEL DOM =====
    const proveedoresBtn = document.getElementById('proveedoresBtn');

    if (!proveedoresBtn) {
        console.error('❌ Botón de proveedores no encontrado');
        return;
    }

    console.log('✅ Botón de proveedores encontrado');

    // Modales
    const modalProveedores = document.getElementById('modalProveedores');
    const modalEditarProveedor = document.getElementById('modalEditarProveedor');

    // Verificar que las modales existan
    if (!modalProveedores || !modalEditarProveedor) {
        console.error('❌ Modales no encontradas');
        return;
    }

    // ===== FUNCIONES PRINCIPALES =====

    function abrirModalProveedores() {
        console.log('🎯 Abriendo modal de proveedores');
        if (modalProveedores) {
            modalProveedores.style.display = 'flex';
            // Forzar reflow para la animación
            modalProveedores.offsetHeight;
            modalProveedores.style.opacity = '1';
            cargarProveedores();
        }
    }

    function cerrarModalProveedores() {
        if (modalProveedores) {
            modalProveedores.style.opacity = '0';
            setTimeout(() => {
                modalProveedores.style.display = 'none';
            }, 300);
        }
    }

    function abrirModalEditarProveedor(id = null, nombre = '', contacto = '') {
        if (modalEditarProveedor) {
            const titulo = document.getElementById('tituloModalProveedor');
            const idInput = document.getElementById('proveedorId');
            const nombreInput = document.getElementById('nombreProveedor');
            const contactoInput = document.getElementById('contactoProveedor');
            const errorElement = document.getElementById('errorNombreProveedor');

            if (titulo) titulo.textContent = id ? 'Editar Proveedor' : 'Agregar Proveedor';
            if (idInput) idInput.value = id || '';
            if (nombreInput) nombreInput.value = nombre || '';
            if (contactoInput) contactoInput.value = contacto || '';

            // Limpiar errores
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
            if (nombreInput) {
                nombreInput.classList.remove('is-invalid', 'is-valid');
            }

            modalEditarProveedor.style.display = 'flex';
            modalEditarProveedor.offsetHeight;
            modalEditarProveedor.style.opacity = '1';

            if (nombreInput) nombreInput.focus();
        }
    }

    function cerrarModalEditarProveedor() {
        if (modalEditarProveedor) {
            modalEditarProveedor.style.opacity = '0';
            setTimeout(() => {
                modalEditarProveedor.style.display = 'none';
                const form = document.getElementById('formEditarProveedor');
                if (form) form.reset();
            }, 300);
        }
    }

    function cargarProveedores() {
        console.log('📥 Cargando proveedores desde:', PROVEEDORES_JSON_URL);
        fetch(PROVEEDORES_JSON_URL)
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(data => {
                console.log('✅ Proveedores cargados:', data.length);
                const tbody = document.getElementById('tbodyProveedores');
                if (!tbody) {
                    console.error('❌ tbodyProveedores no encontrado');
                    return;
                }

                tbody.innerHTML = '';

                if (data.length === 0) {
                    tbody.innerHTML = `
                        <tr class="empty-message">
                            <td colspan="5" style="text-align: center; padding: 40px; color: var(--natural-gray);">
                                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                                <h3 style="margin-bottom: 10px;">No hay proveedores registrados</h3>
                                <p>Utilice el botón "Agregar" para crear un nuevo proveedor.</p>
                            </td>
                        </tr>
                    `;
                    return;
                }

                data.forEach(proveedor => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${proveedor.id}</td>
                        <td>${proveedor.nombre}</td>
                        <td>${proveedor.contacto || ''}</td>
                        <td>${proveedor.fecha_creacion}</td>
                        <td class="actions">
                            <button class="btn-action btn-editar-proveedor" 
                                    data-id="${proveedor.id}" 
                                    data-nombre="${proveedor.nombre}" 
                                    data-contacto="${proveedor.contacto || ''}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-eliminar-proveedor" 
                                    data-id="${proveedor.id}" 
                                    data-nombre="${proveedor.nombre}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Aplicar filtro si hay búsqueda activa
                const searchInput = document.getElementById('searchProveedores');
                if (searchInput && searchInput.value) {
                    filtrarTablaProveedores();
                }
            })
            .catch(error => {
                console.error('❌ Error al cargar proveedores:', error);
                if (typeof mostrarModalError === 'function') {
                    mostrarModalError('Error', 'No se pudieron cargar los proveedores: ' + error.message);
                }
            });
    }

    // ===== FUNCIONALIDAD PARA GUARDAR PROVEEDOR =====

    function guardarProveedor() {
        const id = document.getElementById('proveedorId').value;
        const nombre = document.getElementById('nombreProveedor').value.trim();
        const contacto = document.getElementById('contactoProveedor').value.trim();

        // Validación básica
        if (!nombre) {
            const errorElement = document.getElementById('errorNombreProveedor');
            mostrarErrorCampo(document.getElementById('nombreProveedor'), errorElement, 'El nombre del proveedor es obligatorio.');
            return;
        }

        const url = id ? `${EDITAR_PROVEEDOR_URL}${id}/` : CREAR_PROVEEDOR_URL;

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                nombre: nombre,
                contacto: contacto
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    cerrarModalEditarProveedor();
                    cargarProveedores();
                    if (window.mostrarModalExito) {
                        window.mostrarModalExito('¡Éxito!', data.message);
                    } else {
                        alert('¡Éxito!: ' + data.message);
                    }
                } else {
                    const errorElement = document.getElementById('errorNombreProveedor');
                    mostrarErrorCampo(document.getElementById('nombreProveedor'), errorElement, data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                const errorElement = document.getElementById('errorNombreProveedor');
                mostrarErrorCampo(document.getElementById('nombreProveedor'), errorElement, 'Error de conexión al guardar el proveedor');
            });
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

    function mostrarErrorCampo(input, errorElement, mensaje) {
        if (input && errorElement) {
            input.classList.add('is-invalid');
            errorElement.textContent = mensaje;
            errorElement.style.display = 'block';
        }
    }

    function mostrarConfirmacionAccion(mensaje, titulo = 'Confirmar Acción') {
        return new Promise((resolve) => {
            if (window.mostrarModalConfirmacion) {
                window.mostrarModalConfirmacion(mensaje, resolve);
            } else {
                resolve(confirm(mensaje));
            }
        });
    }

    // ===== EVENT LISTENERS =====

    // Botón principal de proveedores
    proveedoresBtn.addEventListener('click', abrirModalProveedores);

    // Cerrar modales
    document.getElementById('btnCerrarModalProveedores')?.addEventListener('click', cerrarModalProveedores);
    document.getElementById('btnCancelarProveedores')?.addEventListener('click', cerrarModalProveedores);
    document.getElementById('btnCerrarModalEditarProveedor')?.addEventListener('click', cerrarModalEditarProveedor);
    document.getElementById('btnCancelarProveedor')?.addEventListener('click', cerrarModalEditarProveedor);

    // Agregar proveedor
    document.getElementById('btnAgregarProveedor')?.addEventListener('click', () => abrirModalEditarProveedor());

    // Guardar proveedor
    document.getElementById('btnGuardarProveedor')?.addEventListener('click', guardarProveedor);

    // Imprimir proveedores
    document.getElementById('btnImprimirProveedores')?.addEventListener('click', () => {
        window.open(IMPRIMIR_PROVEEDORES_URL, '_blank');
    });

    // Cerrar modales al hacer clic fuera
    modalProveedores.addEventListener('click', function (e) {
        if (e.target === modalProveedores) {
            cerrarModalProveedores();
        }
    });

    modalEditarProveedor.addEventListener('click', function (e) {
        if (e.target === modalEditarProveedor) {
            cerrarModalEditarProveedor();
        }
    });

    // Buscador de proveedores
    document.getElementById('searchProveedores')?.addEventListener('input', function () {
        const filtro = this.value.toLowerCase();
        const tbody = document.getElementById('tbodyProveedores');
        if (!tbody) return;

        const filas = tbody.querySelectorAll('tr');
        let visibleRows = 0;

        filas.forEach(fila => {
            if (fila.classList.contains('empty-message')) {
                fila.style.display = 'none';
                return;
            }

            const nombre = fila.cells[1].textContent.toLowerCase();
            if (nombre.includes(filtro)) {
                fila.style.display = '';
                visibleRows++;
            } else {
                fila.style.display = 'none';
            }
        });

        // Mostrar mensaje si no hay resultados
        const emptyMessage = tbody.querySelector('.empty-message');
        if (visibleRows === 0 && filtro !== '') {
            if (!emptyMessage) {
                const tr = document.createElement('tr');
                tr.className = 'empty-message';
                tr.innerHTML = `
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--natural-gray);">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <h3 style="margin-bottom: 10px;">No se encontraron proveedores</h3>
                        <p>Intente con otros términos de búsqueda.</p>
                    </td>
                `;
                tbody.appendChild(tr);
            } else {
                emptyMessage.style.display = '';
            }
        } else if (emptyMessage) {
            emptyMessage.style.display = 'none';
        }
    });

    // ===== FUNCIONALIDAD PARA EDITAR Y ELIMINAR =====

    // Editar proveedor
    document.addEventListener('click', function (e) {
        if (e.target.closest('.btn-editar-proveedor')) {
            const button = e.target.closest('.btn-editar-proveedor');
            const id = button.getAttribute('data-id');
            const nombre = button.getAttribute('data-nombre');
            const contacto = button.getAttribute('data-contacto');
            abrirModalEditarProveedor(id, nombre, contacto);
        }
    });

    // Eliminar proveedor
    document.addEventListener('click', async function (e) {
        if (e.target.closest('.btn-eliminar-proveedor')) {
            const button = e.target.closest('.btn-eliminar-proveedor');
            const id = button.getAttribute('data-id');
            const nombre = button.getAttribute('data-nombre');

            const confirmado = await mostrarConfirmacionAccion(
                `¿Está seguro de que desea eliminar el proveedor "${nombre}"? Esta acción no se puede deshacer.`,
                'Confirmar Eliminación'
            );

            if (confirmado) {
                try {
                    const response = await fetch(`${ELIMINAR_PROVEEDOR_URL}${id}/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCSRFToken()
                        }
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Eliminar la fila de la tabla
                        const fila = button.closest('tr');
                        fila.style.opacity = '0';
                        setTimeout(() => {
                            fila.remove();
                            // Si no quedan filas, mostrar mensaje
                            const tbody = document.getElementById('tbodyProveedores');
                            if (tbody && tbody.children.length === 0) {
                                tbody.innerHTML = `
                                    <tr class="empty-message">
                                        <td colspan="5" style="text-align: center; padding: 40px; color: var(--natural-gray);">
                                            <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                                            <h3 style="margin-bottom: 10px;">No hay proveedores registrados</h3>
                                            <p>Utilice el botón "Agregar" para crear un nuevo proveedor.</p>
                                        </td>
                                    </tr>
                                `;
                            }
                        }, 300);

                        if (window.mostrarModalExito) {
                            window.mostrarModalExito('¡Éxito!', data.message);
                        }
                    } else {
                        if (window.mostrarModalError) {
                            window.mostrarModalError('Error', data.error);
                        } else { alert('Error: ' + data.error); }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    if (window.mostrarModalError) {
                        window.mostrarModalError('Error', 'Error al eliminar el proveedor');
                    } else { alert('Error al eliminar el proveedor'); }
                }
            }
        }
    });

    // ===== VALIDACIONES EN TIEMPO REAL CORREGIDAS =====

    // Validación en tiempo real para el nombre del proveedor
    const nombreProveedorInput = document.getElementById('nombreProveedor');
    const errorNombreProveedor = document.getElementById('errorNombreProveedor');

    if (nombreProveedorInput && errorNombreProveedor) {
        nombreProveedorInput.addEventListener('input', function () {
            // SOLO PERMITE LETRAS, NÚMEROS Y PUNTOS - MÁXIMO 20 CARACTERES
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 20);
            const valor = this.value.trim();

            if (!valor) {
                mostrarErrorCampo(this, errorNombreProveedor, 'El nombre del proveedor es obligatorio.');
            } else if (!/^[A-Z0-9.]+$/.test(valor)) {
                mostrarErrorCampo(this, errorNombreProveedor, 'Solo se permiten letras, números y puntos.');
            } else if (valor.length > 20) {
                mostrarErrorCampo(this, errorNombreProveedor, 'Máximo 20 caracteres.');
            } else {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
                errorNombreProveedor.textContent = '';
                errorNombreProveedor.style.display = 'none';
            }
        });
    }

    // Validación en tiempo real para el contacto del proveedor - CORREGIDA
    const contactoProveedorInput = document.getElementById('contactoProveedor');

    if (contactoProveedorInput) {
        // Crear elemento de error si no existe
        let errorContactoProveedor = document.getElementById('error-contactoProveedor');
        if (!errorContactoProveedor) {
            errorContactoProveedor = document.createElement('span');
            errorContactoProveedor.className = 'error-msg';
            errorContactoProveedor.id = 'error-contactoProveedor';
            contactoProveedorInput.parentNode.appendChild(errorContactoProveedor);
        }

        contactoProveedorInput.addEventListener('input', function () {
            // CONVERTIR A MAYÚSCULAS Y SOLO 25 CARACTERES MÁXIMO - SIN RESTRICCIONES DE TIPO
            this.value = this.value.toUpperCase().slice(0, 25);
            const valor = this.value.trim();

            // Campo opcional
            if (valor === '') {
                this.classList.remove('is-invalid', 'is-valid');
                errorContactoProveedor.textContent = '';
                errorContactoProveedor.style.display = 'none';
            } else if (valor.length > 25) {
                mostrarErrorCampo(this, errorContactoProveedor, 'Máximo 25 caracteres.');
            } else {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
                errorContactoProveedor.textContent = '';
                errorContactoProveedor.style.display = 'none';
            }
        });
    }

    console.log('✅ Gestión de proveedores inicializada correctamente');
});