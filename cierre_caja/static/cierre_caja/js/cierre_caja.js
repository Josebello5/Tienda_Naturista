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
        input.addEventListener('blur', calculateTotals);   // Calcular totales al salir
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
            const sysVal = parseFloat(systemElem.dataset.raw);
            const realVal = parseNumber(inputElem.value);

            // Determinar moneda por el símbolo de moneda en la fila
            const currencySymbol = row.querySelector('.currency-symbol');
            const isUsd = currencySymbol && currencySymbol.textContent.trim() === '$';

            if (isUsd) {
                totalSystemUsd += sysVal;
                totalRealUsd += realVal;
            } else {
                totalSystemBs += sysVal;
                totalRealBs += realVal;
            }
        }
    });

    // Actualizar fila de totales
    const totalRealElem = document.getElementById('totalRealDisplay');
    const totalDiffElem = document.getElementById('totalDiffDisplay');

    if (totalRealElem) {
        // Mostrar totales separados
        totalRealElem.innerHTML = `
            <div>Bs ${formatNumber(totalRealBs)}</div>
            <div style="color: #28a745;">$ ${formatNumber(totalRealUsd)}</div>
        `;
    }

    if (totalDiffElem) {
        const diffBs = totalRealBs - totalSystemBs;
        const diffUsd = totalRealUsd - totalSystemUsd;

        let html = '';

        // Diferencia en Bs
        let classBs = 'diff-neutral';
        let signBs = '';
        if (diffBs > 0.01) { classBs = 'diff-positive'; signBs = '+'; }
        else if (diffBs < -0.01) { classBs = 'diff-negative'; }

        html += `<div class="${classBs}">Bs ${signBs}${formatNumber(diffBs)}</div>`;

        // Diferencia en USD
        let classUsd = 'diff-neutral';
        let signUsd = '';
        if (diffUsd > 0.01) { classUsd = 'diff-positive'; signUsd = '+'; }
        else if (diffUsd < -0.01) { classUsd = 'diff-negative'; }

        html += `<div class="${classUsd}">$ ${signUsd}${formatNumber(diffUsd)}</div>`;

        totalDiffElem.innerHTML = html;
        totalDiffElem.className = 'difference-display';
    }
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
