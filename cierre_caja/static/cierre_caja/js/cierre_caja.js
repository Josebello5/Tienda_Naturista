document.addEventListener('DOMContentLoaded', function () {
    initModales();
    initFormatters();
    initCalculations();
    initDateNavigation();
    checkDjangoMessages();
});

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

function initModales() {
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
        successModal.addEventListener('click', function (e) {
            if (e.target === this) cerrarModalExito();
        });
    }

    if (errorModal) {
        errorModal.addEventListener('click', function (e) {
            if (e.target === this) cerrarModalError();
        });
    }
}

function checkDjangoMessages() {
    const messagesContainer = document.getElementById('djangoMessages');
    if (!messagesContainer) return;

    const messages = messagesContainer.querySelectorAll('.alert');
    messages.forEach(message => {
        const tag = message.getAttribute('data-message-tag');
        const text = message.textContent.trim();

        if (tag === 'success') {
            setTimeout(() => {
                mostrarModalExito('¡Éxito!', text);
            }, 300);
        } else if (tag === 'error' || tag === 'danger') {
            setTimeout(() => {
                mostrarModalError('Error', text);
            }, 300);
        }
    });
}

// Inicializar formateadores de input
function initFormatters() {
    const inputs = document.querySelectorAll('.amount-input');

    inputs.forEach(input => {
        // Formato inicial cuando carga la página
        formatInput(input);

        // Event listeners para formato en tiempo real
        input.addEventListener('input', function (e) {
            // Permitir solo números y coma
            let value = this.value.replace(/[^0-9,]/g, '');

            // Asegurar solo una coma
            const parts = value.split(',');
            if (parts.length > 2) {
                value = parts[0] + ',' + parts.slice(1).join('');
            }

            this.value = value;
        });

        input.addEventListener('blur', function () {
            formatInput(this);
            calculateTotals();
        });
    });
}

// Formatear valor del input (1.234,56)
function formatInput(input) {
    let value = input.value;
    if (!value) return;

    // Limpiar formato existente para obtener valor crudo
    let rawValue = value.replace(/\./g, '').replace(',', '.');
    let num = parseFloat(rawValue);

    if (isNaN(num)) return;

    // Convertir de nuevo a formato venezolano
    input.value = formatNumber(num);
}

// Función auxiliar para formatear números estrictamente (1.234,56)
function formatNumber(num) {
    if (num === null || num === undefined) return '0,00';

    // Asegurar 2 decimales y convertir a string con punto decimal estándar
    let parts = parseFloat(num).toFixed(2).split('.');
    let integerPart = parts[0];
    let decimalPart = parts[1];

    // Agregar separador de miles (punto)
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${integerPart},${decimalPart}`;
}

// Parsear número desde formato venezolano
function parseNumber(str) {
    if (!str) return 0;
    // Si viene del backend como "1234,56" o "1.234,56"
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

// Inicializar cálculos automáticos
function initCalculations() {
    const inputs = document.querySelectorAll('.amount-input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateRowDiff); // Calcular diferencia al escribir
        input.addEventListener('input', calculateTotals);  // Calcular totales al escribir (Real-time)
        input.addEventListener('blur', calculateTotals);   // Calcular totales al salir (asegurar format)
    });

    // Cálculo inicial
    document.querySelectorAll('.amount-input').forEach(input => {
        calculateRowDiff({ target: input });
    });
    calculateTotals();
}

// Calcular diferencia de una fila
function calculateRowDiff(event) {
    const input = event.target;
    // La variable input.name es como 'real_efectivo_bs'
    // El sistema tiene montos en data-attrs en la fila
    const row = input.closest('tr');

    // Obtener monto del sistema
    const systemAmountElem = row.querySelector('.amount-system');
    const systemAmount = parseFloat(systemAmountElem.dataset.raw);

    // Obtener monto real
    const realAmount = parseNumber(input.value);

    // Calcular diferencia
    const diff = realAmount - systemAmount;

    // Actualizar elemento de diferencia en la fila
    const diffElem = row.querySelector('.difference-display');
    diffElem.textContent = formatNumber(diff);

    // Aplicar clases de color
    diffElem.className = 'difference-display';
    if (diff > 0.01) {
        diffElem.classList.add('diff-positive');
        diffElem.textContent = '+' + diffElem.textContent;
    } else if (diff < -0.01) {
        diffElem.classList.add('diff-negative');
    } else {
        diffElem.classList.add('diff-neutral');
    }
}

// Calcular totales generales
function calculateTotals() {
    let totalRealBs = 0;
    let totalRealUsd = 0;
    let totalSystemBs = 0;
    let totalSystemUsd = 0;

    document.querySelectorAll('tbody tr:not(.total-row)').forEach(row => {
        const systemElem = row.querySelector('.amount-system');
        const inputElem = row.querySelector('.amount-input');

        if (systemElem && inputElem) {
            // Asegurar que el formato crudo 1234,56 se parsee bien a 1234.56 para JS
            let rawStr = systemElem.dataset.raw || '0';
            rawStr = rawStr.replace(',', '.');
            const sysVal = parseFloat(rawStr);

            const realVal = parseNumber(inputElem.value);
            const isUsd = inputElem.name === 'real_efectivo_usd';

            if (isUsd) {
                totalSystemUsd += sysVal;
                totalRealUsd += realVal;
            } else {
                totalSystemBs += sysVal;
                totalRealBs += realVal;
            }
        }
    });

    // Actualizar Totales del Sistema
    const sysBsElem = document.getElementById('totalSystemBs');
    const sysUsdElem = document.getElementById('totalSystemUsd');
    if (sysBsElem) sysBsElem.textContent = 'Bs ' + formatNumber(totalSystemBs);
    if (sysUsdElem) sysUsdElem.textContent = '$ ' + formatNumber(totalSystemUsd);

    // Actualizar Totales Reales
    const realBsElem = document.getElementById('totalRealBs');
    const realUsdElem = document.getElementById('totalRealUsd');
    if (realBsElem) realBsElem.textContent = 'Bs ' + formatNumber(totalRealBs);
    if (realUsdElem) realUsdElem.textContent = '$ ' + formatNumber(totalRealUsd);

    // Actualizar Diferencias
    updateDifferenceDisplay('totalDiffBs', totalRealBs - totalSystemBs, 'Bs');
    updateDifferenceDisplay('totalDiffUsd', totalRealUsd - totalSystemUsd, '$');
}

function updateDifferenceDisplay(elementId, diff, currencySymbol) {
    const elem = document.getElementById(elementId);
    if (!elem) return;

    let className = 'difference-display';
    let content = '';

    if (diff > 0.01) {
        className += ' diff-positive';
        content = `${currencySymbol} ${formatNumber(diff)} <small>(Sobra)</small>`;
    } else if (diff < -0.01) {
        className += ' diff-negative';
        content = `${currencySymbol} ${formatNumber(diff)} <small>(Falta)</small>`;
    } else {
        className += ' diff-neutral';
        content = `${currencySymbol} ${formatNumber(diff)} <small>(Cuadre)</small>`;
    }

    elem.className = className;
    elem.innerHTML = content;
}

// Navegación de fechas
function initDateNavigation() {
    const dateInput = document.getElementById('fechaCierre');
    const btnPrev = document.getElementById('btnPrevDate');
    const btnNext = document.getElementById('btnNextDate');

    if (dateInput) {
        dateInput.addEventListener('change', function () {
            window.location.href = `?fecha=${this.value}`;
        });
    }

    if (btnPrev && dateInput) {
        btnPrev.addEventListener('click', function () {
            const currentDate = new Date(dateInput.value);
            currentDate.setDate(currentDate.getDate() + 1); // +1 porque el timezone offset puede restar
            // Ajuste simple: usar string manipulation
            // Mejor: parsear la fecha string 'YYYY-MM-DD'
            const parts = dateInput.value.split('-');
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            d.setDate(d.getDate() - 1);

            const newDate = formatDate(d);
            window.location.href = `?fecha=${newDate}`;
        });
    }

    if (btnNext && dateInput) {
        btnNext.addEventListener('click', function () {
            const parts = dateInput.value.split('-');
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            d.setDate(d.getDate() + 1);

            const newDate = formatDate(d);

            // No ir al futuro
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d <= today) {
                window.location.href = `?fecha=${newDate}`;
            }
        });
    }

    // Validación al enviar
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function (e) {
            // Desformatear números antes de enviar (quitar puntos de miles)
            // O mejor: Django clean_number ya maneja el formato venezolano
            // Así que enviamos tal cual (1.234,56)
        });
    }
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
