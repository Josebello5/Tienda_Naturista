document.addEventListener('DOMContentLoaded', function() {
    initFormatters();
    initCalculations();
    initDateNavigation();
});

// Inicializar formateadores de input
function initFormatters() {
    const inputs = document.querySelectorAll('.amount-input');
    
    inputs.forEach(input => {
        // Formato inicial cuando carga la página
        formatInput(input);
        
        // Event listeners para formato en tiempo real
        input.addEventListener('input', function(e) {
            // Permitir solo números y coma
            let value = this.value.replace(/[^0-9,]/g, '');
            
            // Asegurar solo una coma
            const parts = value.split(',');
            if (parts.length > 2) {
                value = parts[0] + ',' + parts.slice(1).join('');
            }
            
            this.value = value;
        });
        
        input.addEventListener('blur', function() {
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

// Función auxiliar para formatear números
function formatNumber(num) {
    return num.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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
    const systemAmount = parseNumber(systemAmountElem.dataset.raw);
    
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
    let totalReal = 0;
    
    // Sumar todos los inputs de Monto Real (excepto los de USD que se suman aparte si se quisiera)
    // En este caso sumamos todo al total general para la vista simple
    // NOTA: Para ser precisos, deberíamos normalizar monedas, pero aquí asumimos 
    // que el cierre es una vista consolidada o que el usuario sabe qué suma
    // Por simplicidad, sumamos lo que hay en los inputs
    
    // Sin embargo, el modelo suma todo. Vamos a replicar la lógica del modelo
    // pero en el frontend es complejo si mezclamos BS y USD.
    // Lo mejor es sumar las diferencias.
    
    let totalSystem = 0;
    let totalRealCalc = 0;
    
    document.querySelectorAll('tbody tr:not(.total-row)').forEach(row => {
        const systemElem = row.querySelector('.amount-system');
        const inputElem = row.querySelector('.amount-input');
        
        if (systemElem && inputElem) {
            // Nota: Aquí estamos sumando peras con manzanas (Bs y USD) si mezclamos
            // Pero seguimos la lógica del backend que suma todo en Total_Sistema
            const sysVal = parseNumber(systemElem.dataset.raw);
            const realVal = parseNumber(inputElem.value);
            
            totalSystem += sysVal;
            totalRealCalc += realVal;
        }
    });
    
    // Actualizar fila de totales
    const totalRealElem = document.getElementById('totalRealDisplay');
    const totalDiffElem = document.getElementById('totalDiffDisplay');
    
    if (totalRealElem) totalRealElem.textContent = formatNumber(totalRealCalc);
    
    const totalDiff = totalRealCalc - totalSystem;
    if (totalDiffElem) {
        totalDiffElem.textContent = formatNumber(totalDiff);
        
        totalDiffElem.className = 'difference-display';
        if (totalDiff > 0.01) {
            totalDiffElem.classList.add('diff-positive');
            totalDiffElem.textContent = '+' + totalDiffElem.textContent;
        } else if (totalDiff < -0.01) {
            totalDiffElem.classList.add('diff-negative');
        } else {
            totalDiffElem.classList.add('diff-neutral');
        }
    }
}

// Navegación de fechas
function initDateNavigation() {
    const dateInput = document.getElementById('fechaCierre');
    const btnPrev = document.getElementById('btnPrevDate');
    const btnNext = document.getElementById('btnNextDate');
    
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            window.location.href = `?fecha=${this.value}`;
        });
    }
    
    if (btnPrev && dateInput) {
        btnPrev.addEventListener('click', function() {
            const currentDate = new Date(dateInput.value);
            currentDate.setDate(currentDate.getDate() + 1); // +1 porque el timezone offset puede restar
            // Ajuste simple: usar string manipulation
            // Mejor: parsear la fecha string 'YYYY-MM-DD'
            const parts = dateInput.value.split('-');
            const d = new Date(parts[0], parts[1]-1, parts[2]);
            d.setDate(d.getDate() - 1);
            
            const newDate = formatDate(d);
            window.location.href = `?fecha=${newDate}`;
        });
    }
    
    if (btnNext && dateInput) {
        btnNext.addEventListener('click', function() {
            const parts = dateInput.value.split('-');
            const d = new Date(parts[0], parts[1]-1, parts[2]);
            d.setDate(d.getDate() + 1);
            
            const newDate = formatDate(d);
            
            // No ir al futuro
            const today = new Date();
            today.setHours(0,0,0,0);
            if (d <= today) {
                window.location.href = `?fecha=${newDate}`;
            }
        });
    }
    
    // Validación al enviar
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
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
