// gestion_categorias_patologias.js - Funcionalidad para categorías y patologías
document.addEventListener('DOMContentLoaded', function () {
    // ===== ELEMENTOS DEL DOM =====
    const categoriasBtn = document.getElementById('categoriasBtn');
    const patologiasBtn = document.getElementById('patologiasBtn');
    const ubicacionesBtn = document.getElementById('ubicacionesBtn');

    // Modales
    const modalCategorias = document.getElementById('modalCategorias');
    const modalPatologias = document.getElementById('modalPatologias');
    const modalUbicaciones = document.getElementById('modalUbicaciones');
    const modalEditarCategoria = document.getElementById('modalEditarCategoria');
    const modalEditarPatologia = document.getElementById('modalEditarPatologia');
    const modalEditarUbicacion = document.getElementById('modalEditarUbicacion');

    // Botones de cierre
    const btnCerrarModalCategorias = document.getElementById('btnCerrarModalCategorias');
    const btnCerrarModalPatologias = document.getElementById('btnCerrarModalPatologias');
    const btnCerrarModalUbicaciones = document.getElementById('btnCerrarModalUbicaciones');
    const btnCerrarModalEditarCategoria = document.getElementById('btnCerrarModalEditarCategoria');
    const btnCerrarModalEditarPatologia = document.getElementById('btnCerrarModalEditarPatologia');
    const btnCerrarModalEditarUbicacion = document.getElementById('btnCerrarModalEditarUbicacion');

    // Botones de cierre en footer
    const btnCerrarCategorias = document.getElementById('btnCerrarCategorias');
    const btnCerrarPatologias = document.getElementById('btnCerrarPatologias');
    const btnCerrarUbicaciones = document.getElementById('btnCerrarUbicaciones');

    // Botones de cancelar
    const btnCancelarCategoria = document.getElementById('btnCancelarCategoria');
    const btnCancelarPatologia = document.getElementById('btnCancelarPatologia');
    const btnCancelarUbicacion = document.getElementById('btnCancelarUbicacion');

    // Botones de guardar
    const btnGuardarCategoria = document.getElementById('btnGuardarCategoria');
    const btnGuardarPatologia = document.getElementById('btnGuardarPatologia');
    const btnGuardarUbicacion = document.getElementById('btnGuardarUbicacion');

    // Formularios
    const formEditarCategoria = document.getElementById('formEditarCategoria');
    const formEditarPatologia = document.getElementById('formEditarPatologia');
    const formEditarUbicacion = document.getElementById('formEditarUbicacion');

    // Inputs
    const nombreCategoria = document.getElementById('nombreCategoria');
    const nombrePatologia = document.getElementById('nombrePatologia');
    const nombreUbicacion = document.getElementById('nombreUbicacion');
    const categoriaId = document.getElementById('categoriaId');
    const patologiaId = document.getElementById('patologiaId');
    const ubicacionId = document.getElementById('ubicacionId');

    // Botones de agregar
    const btnAgregarCategoria = document.getElementById('btnAgregarCategoria');
    const btnAgregarPatologia = document.getElementById('btnAgregarPatologia');
    const btnAgregarUbicacion = document.getElementById('btnAgregarUbicacion');

    // Botones de imprimir
    const btnImprimirCategorias = document.getElementById('btnImprimirCategorias');
    const btnImprimirPatologias = document.getElementById('btnImprimirPatologias');
    const btnImprimirUbicaciones = document.getElementById('btnImprimirUbicaciones');

    // Buscadores
    const searchCategorias = document.getElementById('searchCategorias');
    const searchPatologias = document.getElementById('searchPatologias');
    const searchUbicaciones = document.getElementById('searchUbicaciones');

    // Títulos modales
    const tituloModalCategoria = document.getElementById('tituloModalCategoria');
    const tituloModalPatologia = document.getElementById('tituloModalPatologia');
    const tituloModalUbicacion = document.getElementById('tituloModalUbicacion');

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

    // ===== FUNCIONES PARA MOSTRAR ERRORES EN CAMPOS =====

    function mostrarErrorCampo(input, errorElement, mensaje) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        errorElement.textContent = mensaje;
        errorElement.style.display = 'block';
        input.focus();
    }

    function limpiarErrorCampo(input, errorElement) {
        input.classList.remove('is-invalid', 'is-valid');
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }

    function mostrarErrorValidacion(input, errorElement, mensaje) {
        mostrarErrorCampo(input, errorElement, mensaje);
    }

    function mostrarErrorGeneral(mensaje) {
        if (typeof mostrarModalError === 'function') {
            mostrarModalError('Error', mensaje);
        } else {
            alert('Error: ' + mensaje);
        }
    }

    // ===== VALIDACIONES EN TIEMPO REAL =====

    function validarCategoria(nombre) {
        const val = nombre.trim().toUpperCase();

        if (val === '') {
            return { valido: false, error: 'El nombre de la categoría es obligatorio.' };
        }

        if (val.includes(' ')) {
            return { valido: false, error: 'La categoría no puede contener espacios.' };
        }

        if (!/^[A-Z]+$/.test(val)) {
            return { valido: false, error: 'La categoría solo debe contener letras.' };
        }

        if (val.length > 20) {
            return { valido: false, error: 'La categoría no puede tener más de 20 caracteres.' };
        }

        return { valido: true, error: '' };
    }

    function validarPatologia(nombre) {
        const val = nombre.trim().toUpperCase();

        if (val === '') {
            return { valido: false, error: 'El nombre de la patología es obligatorio.' };
        }

        if (val.includes(' ')) {
            return { valido: false, error: 'La patología no puede contener espacios.' };
        }

        if (!/^[A-Z]+$/.test(val)) {
            return { valido: false, error: 'La patología solo debe contener letras.' };
        }

        if (val.length > 20) {
            return { valido: false, error: 'La patología no puede tener más de 20 caracteres.' };
        }

        return { valido: true, error: '' };
    }

    function validarUbicacion(nombre) {
        const val = nombre.trim().toUpperCase();

        if (val === '') {
            return { valido: false, error: 'El nombre de la ubicación es obligatorio.' };
        }

        // Permitir letras, números, espacios y guiones
        if (!/^[A-Z0-9\s\-]+$/.test(val)) {
            return { valido: false, error: 'La ubicación solo puede contener letras, números, espacios y guiones.' };
        }

        if (val.length > 50) {
            return { valido: false, error: 'La ubicación no puede tener más de 50 caracteres.' };
        }

        return { valido: true, error: '' };
    }

    function aplicarValidacionEnTiempoReal(input, funcionValidacion, errorElement) {
        // Validar solo letras en tiempo real
        input.addEventListener('keypress', function (e) {
            const char = String.fromCharCode(e.keyCode);
            if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ]$/.test(char)) {
                e.preventDefault();
                return;
            }
            if (this.value.length >= 20) {
                e.preventDefault();
                return;
            }
        });

        input.addEventListener('input', function () {
            // Convertir a mayúsculas y eliminar espacios
            this.value = this.value.toUpperCase().replace(/\s/g, '');

            const validacion = funcionValidacion(this.value);

            if (!validacion.valido && this.value !== '') {
                mostrarErrorCampo(this, errorElement, validacion.error);
            } else {
                limpiarErrorCampo(this, errorElement);
                if (this.value !== '') {
                    this.classList.add('is-valid');
                }
            }
        });

        input.addEventListener('blur', function () {
            const validacion = funcionValidacion(this.value);
            if (!validacion.valido && this.value !== '') {
                mostrarErrorCampo(this, errorElement, validacion.error);
            }
        });
    }

    // ===== FUNCIONALIDAD PARA CATEGORÍAS =====

    function abrirModalCategorias() {
        modalCategorias.style.display = 'flex';
        setTimeout(() => {
            modalCategorias.style.opacity = '1';
        }, 10);
        cargarCategorias();
    }

    function cerrarModalCategorias() {
        modalCategorias.style.opacity = '0';
        setTimeout(() => {
            modalCategorias.style.display = 'none';
        }, 300);
    }

    function abrirModalEditarCategoria(id = null, nombre = '') {
        if (id) {
            tituloModalCategoria.textContent = 'Editar Categoría';
            categoriaId.value = id;
            nombreCategoria.value = nombre;
        } else {
            tituloModalCategoria.textContent = 'Agregar Categoría';
            categoriaId.value = '';
            nombreCategoria.value = '';
        }

        // Limpiar estados de validación
        nombreCategoria.classList.remove('is-invalid', 'is-valid');
        const errorElement = document.getElementById('errorNombreCategoria');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }

        modalEditarCategoria.style.display = 'flex';
        setTimeout(() => {
            modalEditarCategoria.style.opacity = '1';
        }, 10);
        nombreCategoria.focus();
    }

    function cerrarModalEditarCategoria() {
        modalEditarCategoria.style.opacity = '0';
        setTimeout(() => {
            modalEditarCategoria.style.display = 'none';
        }, 300);
        formEditarCategoria.reset();
        nombreCategoria.classList.remove('is-invalid', 'is-valid');
        const errorElement = document.getElementById('errorNombreCategoria');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    function cargarCategorias() {
        fetch(CATEGORIAS_JSON_URL)
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById('tbodyCategorias');
                if (!tbody) return;

                tbody.innerHTML = '';

                if (data.length === 0) {
                    mostrarMensajeTablaVacia('tbodyCategorias', 'categorías');
                    return;
                }

                data.forEach(categoria => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${categoria.id}</td>
                        <td>${categoria.nombre}</td>
                        <td>${categoria.fecha_creacion}</td>
                        <td class="actions">
                            <button class="btn-action btn-editar-categoria" data-id="${categoria.id}" data-nombre="${categoria.nombre}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-eliminar-categoria" data-id="${categoria.id}" data-nombre="${categoria.nombre}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                if (searchCategorias.value) {
                    filtrarTablaCategorias();
                }
            })
            .catch(error => {
                console.error('Error al cargar categorías:', error);
                mostrarErrorGeneral('No se pudieron cargar las categorías');
            });
    }

    function filtrarTablaCategorias() {
        const filtro = searchCategorias.value.toLowerCase();
        const tbody = document.getElementById('tbodyCategorias');
        if (!tbody) return;

        const filas = tbody.querySelectorAll('tr');
        let visibleRows = 0;

        filas.forEach(fila => {
            if (fila.classList.contains('empty-message')) {
                if (filtro === '') {
                    fila.remove();
                }
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

        if (visibleRows === 0) {
            if (filtro !== '') {
                mostrarMensajeTablaVacia('tbodyCategorias', 'categorías');
            } else {
                cargarCategorias();
            }
        }
    }

    function guardarCategoria() {
        const id = categoriaId.value;
        const nombre = nombreCategoria.value.trim().toUpperCase();

        const validacion = validarCategoria(nombre);
        if (!validacion.valido) {
            const errorElement = document.getElementById('errorNombreCategoria');
            mostrarErrorValidacion(nombreCategoria, errorElement, validacion.error);
            return;
        }

        const url = id ? `${EDITAR_CATEGORIA_URL}${id}/` : EDITAR_CATEGORIA_URL;

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ nombre: nombre })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    cerrarModalEditarCategoria();
                    cargarCategorias();
                    if (typeof mostrarModalExito === 'function') {
                        mostrarModalExito('¡Éxito!', data.message);
                    }
                } else {
                    // Mostrar error del servidor en el campo
                    const errorElement = document.getElementById('errorNombreCategoria');
                    mostrarErrorValidacion(nombreCategoria, errorElement, data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                const errorElement = document.getElementById('errorNombreCategoria');
                mostrarErrorValidacion(nombreCategoria, errorElement, 'Error de conexión al guardar la categoría');
            });
    }

    // ===== FUNCIONALIDAD PARA PATOLOGÍAS =====

    function abrirModalPatologias() {
        modalPatologias.style.display = 'flex';
        setTimeout(() => {
            modalPatologias.style.opacity = '1';
        }, 10);
        cargarPatologias();
    }

    function cerrarModalPatologias() {
        modalPatologias.style.opacity = '0';
        setTimeout(() => {
            modalPatologias.style.display = 'none';
        }, 300);
    }

    function abrirModalEditarPatologia(id = null, nombre = '') {
        if (id) {
            tituloModalPatologia.textContent = 'Editar Patología';
            patologiaId.value = id;
            nombrePatologia.value = nombre;
        } else {
            tituloModalPatologia.textContent = 'Agregar Patología';
            patologiaId.value = '';
            nombrePatologia.value = '';
        }

        // Limpiar estados de validación
        nombrePatologia.classList.remove('is-invalid', 'is-valid');
        const errorElement = document.getElementById('errorNombrePatologia');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }

        modalEditarPatologia.style.display = 'flex';
        setTimeout(() => {
            modalEditarPatologia.style.opacity = '1';
        }, 10);
        nombrePatologia.focus();
    }

    function cerrarModalEditarPatologia() {
        modalEditarPatologia.style.opacity = '0';
        setTimeout(() => {
            modalEditarPatologia.style.display = 'none';
        }, 300);
        formEditarPatologia.reset();
        nombrePatologia.classList.remove('is-invalid', 'is-valid');
        const errorElement = document.getElementById('errorNombrePatologia');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    function cargarPatologias() {
        fetch(PATOLOGIAS_JSON_URL)
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById('tbodyPatologias');
                if (!tbody) return;

                tbody.innerHTML = '';

                if (data.length === 0) {
                    mostrarMensajeTablaVacia('tbodyPatologias', 'patologías');
                    return;
                }

                data.forEach(patologia => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${patologia.id}</td>
                        <td>${patologia.nombre}</td>
                        <td>${patologia.fecha_creacion}</td>
                        <td class="actions">
                            <button class="btn-action btn-editar-patologia" data-id="${patologia.id}" data-nombre="${patologia.nombre}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-eliminar-patologia" data-id="${patologia.id}" data-nombre="${patologia.nombre}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                if (searchPatologias.value) {
                    filtrarTablaPatologias();
                }
            })
            .catch(error => {
                console.error('Error al cargar patologías:', error);
                mostrarErrorGeneral('No se pudieron cargar las patologías');
            });
    }

    function filtrarTablaPatologias() {
        const filtro = searchPatologias.value.toLowerCase();
        const tbody = document.getElementById('tbodyPatologias');
        if (!tbody) return;

        const filas = tbody.querySelectorAll('tr');
        let visibleRows = 0;

        filas.forEach(fila => {
            if (fila.classList.contains('empty-message')) {
                if (filtro === '') {
                    fila.remove();
                }
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

        if (visibleRows === 0) {
            if (filtro !== '') {
                mostrarMensajeTablaVacia('tbodyPatologias', 'patologías');
            } else {
                cargarPatologias();
            }
        }
    }

    function guardarPatologia() {
        const id = patologiaId.value;
        const nombre = nombrePatologia.value.trim().toUpperCase();

        const validacion = validarPatologia(nombre);
        if (!validacion.valido) {
            const errorElement = document.getElementById('errorNombrePatologia');
            mostrarErrorValidacion(nombrePatologia, errorElement, validacion.error);
            return;
        }

        const url = id ? `${EDITAR_PATOLOGIA_URL}${id}/` : EDITAR_PATOLOGIA_URL;

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ nombre: nombre })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    cerrarModalEditarPatologia();
                    cargarPatologias();
                    if (typeof mostrarModalExito === 'function') {
                        mostrarModalExito('¡Éxito!', data.message);
                    }
                } else {
                    // Mostrar error del servidor en el campo
                    const errorElement = document.getElementById('errorNombrePatologia');
                    mostrarErrorValidacion(nombrePatologia, errorElement, data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                const errorElement = document.getElementById('errorNombrePatologia');
                mostrarErrorValidacion(nombrePatologia, errorElement, 'Error de conexión al guardar la patología');
            });
    }

    // ===== FUNCIONALIDAD PARA UBICACIONES =====

    function abrirModalUbicaciones() {
        modalUbicaciones.style.display = 'flex';
        setTimeout(() => {
            modalUbicaciones.style.opacity = '1';
        }, 10);
        cargarUbicaciones();
    }

    function cerrarModalUbicaciones() {
        modalUbicaciones.style.opacity = '0';
        setTimeout(() => {
            modalUbicaciones.style.display = 'none';
        }, 300);
    }

    function abrirModalEditarUbicacion(id = null, nombre = '') {
        if (id) {
            tituloModalUbicacion.textContent = 'Editar Ubicación';
            ubicacionId.value = id;
            nombreUbicacion.value = nombre;
        } else {
            tituloModalUbicacion.textContent = 'Agregar Ubicación';
            ubicacionId.value = '';
            nombreUbicacion.value = '';
        }

        // Limpiar estados de validación
        nombreUbicacion.classList.remove('is-invalid', 'is-valid');
        const errorElement = document.getElementById('errorNombreUbicacion');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }

        modalEditarUbicacion.style.display = 'flex';
        setTimeout(() => {
            modalEditarUbicacion.style.opacity = '1';
        }, 10);
        nombreUbicacion.focus();
    }

    function cerrarModalEditarUbicacion() {
        modalEditarUbicacion.style.opacity = '0';
        setTimeout(() => {
            modalEditarUbicacion.style.display = 'none';
        }, 300);
        formEditarUbicacion.reset();
        nombreUbicacion.classList.remove('is-invalid', 'is-valid');
        const errorElement = document.getElementById('errorNombreUbicacion');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    function cargarUbicaciones() {
        fetch(UBICACIONES_JSON_URL)
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById('tbodyUbicaciones');
                if (!tbody) return;

                tbody.innerHTML = '';

                // Manejar respuesta de error
                if (data.error) {
                    mostrarErrorGeneral(data.error);
                    return;
                }

                // Verificar si es un array
                if (!Array.isArray(data)) {
                    console.error('Formato de respuesta inválido:', data);
                    mostrarErrorGeneral('Error al procesar datos de ubicaciones');
                    return;
                }

                if (data.length === 0) {
                    mostrarMensajeTablaVacia('tbodyUbicaciones', 'ubicaciones');
                    return;
                }

                data.forEach(ubicacion => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${ubicacion.id}</td>
                        <td>${ubicacion.nombre}</td>
                        <td>${ubicacion.fecha_creacion}</td>
                        <td class="actions">
                            <button class="btn-action btn-editar-ubicacion" data-id="${ubicacion.id}" data-nombre="${ubicacion.nombre}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-eliminar-ubicacion" data-id="${ubicacion.id}" data-nombre="${ubicacion.nombre}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                if (searchUbicaciones.value) {
                    filtrarTablaUbicaciones();
                }
            })
            .catch(error => {
                console.error('Error al cargar ubicaciones:', error);
                mostrarErrorGeneral('No se pudieron cargar las ubicaciones');
            });
    }

    function filtrarTablaUbicaciones() {
        const filtro = searchUbicaciones.value.toLowerCase();
        const tbody = document.getElementById('tbodyUbicaciones');
        if (!tbody) return;

        const filas = tbody.querySelectorAll('tr');
        let visibleRows = 0;

        filas.forEach(fila => {
            if (fila.classList.contains('empty-message')) {
                if (filtro === '') {
                    fila.remove();
                }
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

        if (visibleRows === 0) {
            if (filtro !== '') {
                mostrarMensajeTablaVacia('tbodyUbicaciones', 'ubicaciones');
            } else {
                cargarUbicaciones();
            }
        }
    }

    function guardarUbicacion() {
        const id = ubicacionId.value;
        const nombre = nombreUbicacion.value.trim().toUpperCase();

        const validacion = validarUbicacion(nombre);
        if (!validacion.valido) {
            const errorElement = document.getElementById('errorNombreUbicacion');
            mostrarErrorValidacion(nombreUbicacion, errorElement, validacion.error);
            return;
        }

        const url = id ? `${EDITAR_UBICACION_URL}${id}/` : EDITAR_UBICACION_URL;

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ nombre: nombre })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    cerrarModalEditarUbicacion();
                    cargarUbicaciones();
                    if (typeof mostrarModalExito === 'function') {
                        mostrarModalExito('¡Éxito!', data.message);
                    }
                } else {
                    // Mostrar error del servidor en el campo
                    const errorElement = document.getElementById('errorNombreUbicacion');
                    mostrarErrorValidacion(nombreUbicacion, errorElement, data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                const errorElement = document.getElementById('errorNombreUbicacion');
                mostrarErrorValidacion(nombreUbicacion, errorElement, 'Error de conexión al guardar la ubicación');
            });
    }

    // ===== FUNCIONALIDAD PARA ELIMINAR =====
    function inicializarEliminacionCategorias() {
        document.addEventListener('click', async function (e) {
            if (e.target.closest('.btn-eliminar-categoria')) {
                const button = e.target.closest('.btn-eliminar-categoria');
                const categoriaId = button.getAttribute('data-id');
                const categoriaNombre = button.getAttribute('data-nombre');

                let confirmado;
                if (typeof mostrarConfirmacion === 'function') {
                    confirmado = await mostrarConfirmacion(
                        `¿Está seguro de que desea eliminar la categoría "${categoriaNombre}"? Esta acción no se puede deshacer.`,
                        'Confirmar Eliminación'
                    );
                } else {
                    confirmado = confirm(`¿Está seguro de que desea eliminar la categoría "${categoriaNombre}"?`);
                }

                if (confirmado) {
                    try {
                        const response = await fetch(`${ELIMINAR_CATEGORIA_URL}${categoriaId}/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': getCSRFToken(),
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });

                        const data = await response.json();

                        if (data.success) {
                            const fila = button.closest('tr');
                            if (fila) {
                                fila.style.opacity = '0';
                                setTimeout(() => {
                                    fila.remove();
                                    const tbody = document.getElementById('tbodyCategorias');
                                    if (tbody && !tbody.querySelector('tr:not(.empty-message)')) {
                                        mostrarMensajeTablaVacia('tbodyCategorias', 'categorías');
                                    }
                                }, 300);
                            }

                            if (typeof mostrarModalEliminacion === 'function') {
                                mostrarModalEliminacion('¡Categoría Eliminada!', data.message);
                            }
                        } else {
                            mostrarErrorGeneral(data.error);
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        mostrarErrorGeneral('Error al eliminar la categoría');
                    }
                }
            }
        });
    }

    function inicializarEliminacionPatologias() {
        document.addEventListener('click', async function (e) {
            if (e.target.closest('.btn-eliminar-patologia')) {
                const button = e.target.closest('.btn-eliminar-patologia');
                const patologiaId = button.getAttribute('data-id');
                const patologiaNombre = button.getAttribute('data-nombre');

                let confirmado;
                if (typeof mostrarConfirmacion === 'function') {
                    confirmado = await mostrarConfirmacion(
                        `¿Está seguro de que desea eliminar la patología "${patologiaNombre}"? Esta acción no se puede deshacer.`,
                        'Confirmar Eliminación'
                    );
                } else {
                    confirmado = confirm(`¿Está seguro de que desea eliminar la patología "${patologiaNombre}"?`);
                }

                if (confirmado) {
                    try {
                        const response = await fetch(`${ELIMINAR_PATOLOGIA_URL}${patologiaId}/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': getCSRFToken(),
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });

                        const data = await response.json();

                        if (data.success) {
                            const fila = button.closest('tr');
                            if (fila) {
                                fila.style.opacity = '0';
                                setTimeout(() => {
                                    fila.remove();
                                    const tbody = document.getElementById('tbodyPatologias');
                                    if (tbody && !tbody.querySelector('tr:not(.empty-message)')) {
                                        mostrarMensajeTablaVacia('tbodyPatologias', 'patologías');
                                    }
                                }, 300);
                            }

                            if (typeof mostrarModalEliminacion === 'function') {
                                mostrarModalEliminacion('¡Patología Eliminada!', data.message);
                            }
                        } else {
                            mostrarErrorGeneral(data.error);
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        mostrarErrorGeneral('Error al eliminar la patología');
                    }
                }
            }
        });
    }

    function inicializarEliminacionUbicaciones() {
        document.addEventListener('click', async function (e) {
            if (e.target.closest('.btn-eliminar-ubicacion')) {
                const button = e.target.closest('.btn-eliminar-ubicacion');
                const ubicacionId = button.getAttribute('data-id');
                const ubicacionNombre = button.getAttribute('data-nombre');

                let confirmado;
                if (typeof mostrarConfirmacion === 'function') {
                    confirmado = await mostrarConfirmacion(
                        `¿Está seguro de que desea eliminar la ubicación "${ubicacionNombre}"? Esta acción no se puede deshacer.`,
                        'Confirmar Eliminación'
                    );
                } else {
                    confirmado = confirm(`¿Está seguro de que desea eliminar la ubicación "${ubicacionNombre}"?`);
                }

                if (confirmado) {
                    try {
                        const response = await fetch(`${ELIMINAR_UBICACION_URL}${ubicacionId}/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': getCSRFToken(),
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });

                        const data = await response.json();

                        if (data.success) {
                            const fila = button.closest('tr');
                            if (fila) {
                                fila.style.opacity = '0';
                                setTimeout(() => {
                                    fila.remove();
                                    const tbody = document.getElementById('tbodyUbicaciones');
                                    if (tbody && !tbody.querySelector('tr:not(.empty-message)')) {
                                        mostrarMensajeTablaVacia('tbodyUbicaciones', 'ubicaciones');
                                    }
                                }, 300);
                            }

                            if (typeof mostrarModalEliminacion === 'function') {
                                mostrarModalEliminacion('¡Ubicación Eliminada!', data.message);
                            }
                        } else {
                            mostrarErrorGeneral(data.error);
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        mostrarErrorGeneral('Error al eliminar la ubicación');
                    }
                }
            }
        });
    }

    // ===== FUNCIONES AUXILIARES =====
    function mostrarMensajeTablaVacia(tbodyId, tipo) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        tr.className = 'empty-message';
        tr.innerHTML = `
            <td colspan="4" style="text-align: center; padding: 40px; color: var(--natural-gray);">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3 style="margin-bottom: 10px;">No hay ${tipo} registradas</h3>
                <p>Utilice el botón "Agregar" para crear una nueva ${tipo.slice(0, -1)}.</p>
            </td>
        `;
        tbody.appendChild(tr);
    }

    // ===== EVENT LISTENERS =====

    // Categorías
    categoriasBtn.addEventListener('click', abrirModalCategorias);
    btnCerrarModalCategorias.addEventListener('click', cerrarModalCategorias);
    btnCerrarCategorias.addEventListener('click', cerrarModalCategorias);
    btnAgregarCategoria.addEventListener('click', () => abrirModalEditarCategoria());
    btnGuardarCategoria.addEventListener('click', guardarCategoria);
    btnCancelarCategoria.addEventListener('click', cerrarModalEditarCategoria);
    btnCerrarModalEditarCategoria.addEventListener('click', cerrarModalEditarCategoria);
    searchCategorias.addEventListener('input', filtrarTablaCategorias);

    // Patologías
    patologiasBtn.addEventListener('click', abrirModalPatologias);
    btnCerrarModalPatologias.addEventListener('click', cerrarModalPatologias);
    btnCerrarPatologias.addEventListener('click', cerrarModalPatologias);
    btnAgregarPatologia.addEventListener('click', () => abrirModalEditarPatologia());
    btnGuardarPatologia.addEventListener('click', guardarPatologia);
    btnCancelarPatologia.addEventListener('click', cerrarModalEditarPatologia);
    btnCerrarModalEditarPatologia.addEventListener('click', cerrarModalEditarPatologia);
    searchPatologias.addEventListener('input', filtrarTablaPatologias);

    // Ubicaciones
    ubicacionesBtn.addEventListener('click', abrirModalUbicaciones);
    btnCerrarModalUbicaciones.addEventListener('click', cerrarModalUbicaciones);
    btnCerrarUbicaciones.addEventListener('click', cerrarModalUbicaciones);
    btnAgregarUbicacion.addEventListener('click', () => abrirModalEditarUbicacion());
    btnGuardarUbicacion.addEventListener('click', guardarUbicacion);
    btnCancelarUbicacion.addEventListener('click', cerrarModalEditarUbicacion);
    btnCerrarModalEditarUbicacion.addEventListener('click', cerrarModalEditarUbicacion);
    searchUbicaciones.addEventListener('input', filtrarTablaUbicaciones);

    // Imprimir
    btnImprimirCategorias.addEventListener('click', () => {
        window.open(IMPRIMIR_CATEGORIAS_URL, '_blank');
    });

    btnImprimirPatologias.addEventListener('click', () => {
        window.open(IMPRIMIR_PATOLOGIAS_URL, '_blank');
    });

    btnImprimirUbicaciones.addEventListener('click', () => {
        window.open(IMPRIMIR_UBICACIONES_URL, '_blank');
    });

    // Cerrar modales al hacer clic fuera
    modalCategorias.addEventListener('click', function (e) {
        if (e.target === modalCategorias) {
            cerrarModalCategorias();
        }
    });

    modalPatologias.addEventListener('click', function (e) {
        if (e.target === modalPatologias) {
            cerrarModalPatologias();
        }
    });

    modalEditarCategoria.addEventListener('click', function (e) {
        if (e.target === modalEditarCategoria) {
            cerrarModalEditarCategoria();
        }
    });

    modalEditarPatologia.addEventListener('click', function (e) {
        if (e.target === modalEditarPatologia) {
            cerrarModalEditarPatologia();
        }
    });

    modalUbicaciones.addEventListener('click', function (e) {
        if (e.target === modalUbicaciones) {
            cerrarModalUbicaciones();
        }
    });

    modalEditarUbicacion.addEventListener('click', function (e) {
        if (e.target === modalEditarUbicacion) {
            cerrarModalEditarUbicacion();
        }
    });

    // Editar categoría/patología al hacer clic en el botón correspondiente
    document.addEventListener('click', function (e) {
        if (e.target.closest('.btn-editar-categoria')) {
            const button = e.target.closest('.btn-editar-categoria');
            const id = button.getAttribute('data-id');
            const nombre = button.getAttribute('data-nombre');
            abrirModalEditarCategoria(id, nombre);
        }

        if (e.target.closest('.btn-editar-patologia')) {
            const button = e.target.closest('.btn-editar-patologia');
            const id = button.getAttribute('data-id');
            const nombre = button.getAttribute('data-nombre');
            abrirModalEditarPatologia(id, nombre);
        }

        if (e.target.closest('.btn-editar-ubicacion')) {
            const button = e.target.closest('.btn-editar-ubicacion');
            const id = button.getAttribute('data-id');
            const nombre = button.getAttribute('data-nombre');
            abrirModalEditarUbicacion(id, nombre);
        }
    });

    // ===== INICIALIZACIÓN =====
    function inicializar() {
        // Aplicar validaciones en tiempo real
        const errorCategoria = document.getElementById('errorNombreCategoria');
        const errorPatologia = document.getElementById('errorNombrePatologia');
        const errorUbicacion = document.getElementById('errorNombreUbicacion');

        if (nombreCategoria && errorCategoria) {
            aplicarValidacionEnTiempoReal(nombreCategoria, validarCategoria, errorCategoria);
        }

        if (nombrePatologia && errorPatologia) {
            aplicarValidacionEnTiempoReal(nombrePatologia, validarPatologia, errorPatologia);
        }

        if (nombreUbicacion && errorUbicacion) {
            // Validación especial para ubicaciones (permite números, espacios y guiones)
            nombreUbicacion.addEventListener('input', function () {
                this.value = this.value.toUpperCase();

                const validacion = validarUbicacion(this.value);

                if (!validacion.valido && this.value !== '') {
                    this.classList.add('is-invalid');
                    this.classList.remove('is-valid');
                    errorUbicacion.textContent = validacion.error;
                    errorUbicacion.style.display = 'block';
                } else {
                    this.classList.remove('is-invalid');
                    errorUbicacion.textContent = '';
                    errorUbicacion.style.display = 'none';
                    if (this.value !== '') {
                        this.classList.add('is-valid');
                    }
                }
            });
        }

        inicializarEliminacionCategorias();
        inicializarEliminacionPatologias();
        inicializarEliminacionUbicaciones();
        console.log('Gestión de categorías, patologías y ubicaciones inicializada');
    }

    inicializar();
});