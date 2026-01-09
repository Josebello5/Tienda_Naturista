// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    const tasaForm = document.getElementById('tasaForm');
    const valorInput = document.getElementById('id_valor');
    const errorElement = document.getElementById('valor-error');
    
    if (!valorInput) return;

    // ===== VALIDACIÓN EN TIEMPO REAL CON COMA DECIMAL =====
    let previousValue = '';
    
    valorInput.addEventListener('input', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        
        let value = this.value;
        
        // Guardar el valor anterior para comparación
        previousValue = value;
        
        // Permitir solo números y una coma
        value = value.replace(/[^\d,]/g, '');
        
        // Si hay más de una coma, mantener solo la primera
        const parts = value.split(',');
        if (parts.length > 2) {
            value = parts[0] + ',' + parts.slice(1).join('');
        }
        
        // Limitar a 2 decimales después de la coma
        if (parts.length === 2 && parts[1].length > 2) {
            value = parts[0] + ',' + parts[1].substring(0, 2);
        }
        
        // No permitir coma al inicio
        if (value.startsWith(',')) {
            value = '';
        }
        
        // Solo actualizar si el valor cambió
        if (value !== this.value) {
            this.value = value;
            // Restaurar la posición del cursor
            const newPosition = Math.max(0, start - (previousValue.length - value.length));
            this.setSelectionRange(newPosition, newPosition);
        }
        
        validarTasa();
    });

    // Validación al perder el foco (formato final)
    valorInput.addEventListener('blur', function() {
        validarTasa();
        
        // Formatear el valor al perder el foco
        const value = this.value.trim();
        if (value && value !== '') {
            // Reemplazar punto por coma por si acaso
            let valueWithComma = value.replace('.', ',');
            
            // Asegurar que tenga dos decimales
            const parts = valueWithComma.split(',');
            if (parts.length === 1) {
                // Si no tiene decimales, agregar ",00"
                valueWithComma = parts[0] + ',00';
            } else if (parts.length === 2) {
                if (parts[1].length === 0) {
                    // Si tiene coma pero no decimales
                    valueWithComma = parts[0] + ',00';
                } else if (parts[1].length === 1) {
                    // Si tiene solo un decimal
                    valueWithComma = parts[0] + ',' + parts[1] + '0';
                }
                // Si tiene dos decimales, dejarlo como está
            }
            
            this.value = valueWithComma;
        }
    });

    // Validación al obtener el foco
    valorInput.addEventListener('focus', function() {
        this.select();
    });

    // ===== FUNCIÓN DE VALIDACIÓN MEJORADA PARA COMA DECIMAL =====
    function validarTasa() {
        const value = valorInput.value.trim();
        errorElement.textContent = '';
        errorElement.classList.remove('show');
        valorInput.classList.remove('input-error');

        // Validar que no esté vacío
        if (value === '') {
            mostrarError('El valor de la tasa es obligatorio');
            return false;
        }

        // Validar formato básico (números y una coma opcional)
        if (!/^\d+([,]\d{1,2})?$/.test(value)) {
            mostrarError('Formato inválido. Use números y coma decimal (ej: 35,50)');
            return false;
        }

        // Validar que no tenga puntos (solo coma decimal)
        if (value.includes('.')) {
            mostrarError('Use coma (,) en lugar de punto para decimales');
            return false;
        }

        // Validar que no empiece con coma
        if (value.startsWith(',')) {
            mostrarError('El valor no puede empezar con coma');
            return false;
        }

        // Validar que la coma no esté mal ubicada
        if (value.includes(',')) {
            const parts = value.split(',');
            if (parts[0] === '' || parts[1] === '') {
                mostrarError('Formato incompleto. Ejemplo: 35,50');
                return false;
            }
        }

        // Validar que el número no sea demasiado grande
        const numeroStr = value.replace(',', '.');
        const numero = parseFloat(numeroStr);
        if (isNaN(numero)) {
            mostrarError('Debe ser un número válido');
            return false;
        }

        // Validar que sea mayor a 0
        if (numero <= 0) {
            mostrarError('El valor debe ser mayor a 0');
            return false;
        }

        // Validar rango razonable (1 a 1000)
        if (numero > 1000) {
            mostrarError('El valor es demasiado alto');
            return false;
        }

        return true;
    }

    function mostrarError(mensaje) {
        errorElement.textContent = mensaje;
        errorElement.classList.add('show');
        valorInput.classList.add('input-error');
        valorInput.focus();
    }

    // ===== ENVÍO DEL FORMULARIO =====
    if (tasaForm) {
        tasaForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!validarTasa()) {
                return;
            }
            
            // Formatear para envío (asegurar que tenga formato correcto)
            let value = valorInput.value.trim();
            
            // Asegurar formato de dos decimales
            const parts = value.split(',');
            if (parts.length === 1) {
                value = parts[0] + ',00';
            } else if (parts[1].length === 1) {
                value = parts[0] + ',' + parts[1] + '0';
            }
            
            // Crear FormData
            const formData = new FormData(this);
            
            // Mostrar loading
            const submitBtn = document.getElementById('btnGuardar');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            submitBtn.disabled = true;
            
            // Enviar con AJAX
            fetch(this.action || window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Actualizar tabla y tarjeta
                    document.getElementById('tablaTasasContainer').innerHTML = data.html_tabla;
                    document.getElementById('tarjetaCompactaContainer').innerHTML = data.html_tarjeta;
                    
                    // Limpiar formulario
                    tasaForm.reset();
                    
                    // Mostrar mensaje de éxito
                    mostrarMensajeExito('Tasa guardada exitosamente');
                } else {
                    // Mostrar errores del servidor
                    if (data.errors && data.errors.valor) {
                        mostrarError(data.errors.valor[0]);
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarError('Error al guardar la tasa');
            })
            .finally(() => {
                // Restaurar botón
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        });
    }

    // Función para mostrar mensaje de éxito
    function mostrarMensajeExito(mensaje) {
        // Crear o actualizar mensaje de éxito
        let successMsg = document.getElementById('success-message');
        if (!successMsg) {
            successMsg = document.createElement('div');
            successMsg.id = 'success-message';
            successMsg.className = 'alert alert-success mt-3';
            successMsg.style.animation = 'fadeIn 0.3s ease';
            tasaForm.parentNode.insertBefore(successMsg, tasaForm.nextSibling);
        }
        
        successMsg.innerHTML = `<i class="fas fa-check-circle"></i> ${mensaje}`;
        successMsg.classList.add('show');
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            successMsg.classList.remove('show');
            setTimeout(() => {
                if (successMsg.parentNode) {
                    successMsg.parentNode.removeChild(successMsg);
                }
            }, 300);
        }, 3000);
    }

    // ===== FUNCIÓN PARA ACTUALIZAR TABLA Y TARJETA =====
    window.actualizarTabla = function(event) {
        const refreshBtn = event?.target?.closest('button');
        
        if (refreshBtn) {
            const originalHtml = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;
        }

        fetch(window.OBTENER_TASAS_URL || '/dashboard/obtener-tasas/')
            .then(response => response.json())
            .then(data => {
                document.getElementById('tablaTasasContainer').innerHTML = data.html_tabla;
                document.getElementById('tarjetaCompactaContainer').innerHTML = data.html_tarjeta;
                
                if (refreshBtn) {
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                    refreshBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if (refreshBtn) {
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                    refreshBtn.disabled = false;
                }
            });
    };

    // Actualizar automáticamente cada 30 segundos
    setInterval(() => window.actualizarTabla(), 30000);
});