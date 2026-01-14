/**
 * Validación del formulario de registro de clientes
 * Archivo: registro_cliente.js
 * Ubicación: static/clientes/js/
 */

document.addEventListener('DOMContentLoaded', function () {
  // Referencias a elementos del DOM
  const form = document.getElementById('clienteForm');
  const cedulaTipo = document.getElementById('cedula_tipo');
  const cedulaNumero = document.getElementById('cedula_numero');
  const tipoCliente = document.getElementById('tipo_cliente');
  const telefonoPrefijo = document.getElementById('telefono_prefijo');
  const telefonoNumero = document.getElementById('telefono_numero');
  const nombre = document.getElementById('nombre');
  const apellido = document.getElementById('apellido');
  const direccion = document.getElementById('direccion');
  const cedulaCompleta = document.getElementById('cedula_completa');
  const telefonoCompleto = document.getElementById('telefono_completo');
  const direccionCounter = document.getElementById('direccion-counter');
  
  const errorCedula = document.getElementById('error-cedula');
  const errorNombre = document.getElementById('error-nombre');
  const errorApellido = document.getElementById('error-apellido');
  const errorTelefono = document.getElementById('error-telefono');
  const errorDireccion = document.getElementById('error-direccion');

  // Variables para controlar si el usuario ha empezado a escribir
  let cedulaTouched = false;
  let direccionTouched = false;

  /**
   * Marca un campo como inválido y muestra mensaje de error
   */
  function setInvalid(input, errorDiv, message) {
    input.classList.add('is-invalid');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  /**
   * Marca un campo como válido y limpia mensaje de error
   */
  function setValid(input, errorDiv) {
    input.classList.remove('is-invalid');
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    }
  }

  /**
   * Actualiza el placeholder y maxlength según el tipo de cédula
   */
  function actualizarValidacionCedula() {
    const tipo = cedulaTipo.value;
    const apellidoContainer = apellido.closest('.form-col');
    const labelNombre = document.querySelector('label[for="nombre"]');

    // Limpiar campo nombre/razón social al cambiar tipo
    nombre.value = '';
    
    if (tipo === 'J') {
      cedulaNumero.setAttribute('maxlength', '9');
      cedulaNumero.setAttribute('placeholder', '9 dígitos');
      
      // Ocultar Apellido y renombrar Nombre
      if (apellidoContainer) apellidoContainer.style.display = 'none';
      if (labelNombre) labelNombre.textContent = 'Razón Social';
      
      // Auto-llenar apellido para validar
      apellido.value = '.';
      
    } else {
      cedulaNumero.setAttribute('maxlength', '8');
      cedulaNumero.setAttribute('placeholder', '7-8 dígitos');
      
      // Mostrar Apellido y restaurar Nombre
      if (apellidoContainer) apellidoContainer.style.display = 'block';
      if (labelNombre) labelNombre.textContent = 'Nombre';
      
      // Limpiar apellido si tiene el punto automático
      if (apellido.value === '.') apellido.value = '';
    }
    // Limpiar campo al cambiar tipo
    cedulaNumero.value = '';
    cedulaTouched = false;
    setValid(cedulaNumero, errorCedula);
    setValid(nombre, errorNombre); // Limpiar error de nombre previo
    validarCedula();
  }

  // Inicializar validación de cédula
  actualizarValidacionCedula();

  // Event listener para cambio de tipo de cédula
  cedulaTipo.addEventListener('change', actualizarValidacionCedula);

  // Validación de entrada por tecla para cédula (solo números)
  cedulaNumero.addEventListener('keypress', function (e) {
    const maxLength = cedulaTipo.value === 'J' ? 9 : 8;
    if (!/[0-9]/.test(e.key) || cedulaNumero.value.length >= maxLength) {
      e.preventDefault();
    }
  });

  // Marcar que el usuario ha empezado a escribir en cédula
  cedulaNumero.addEventListener('input', function () {
    if (!cedulaTouched) {
      cedulaTouched = true;
    }
    validarCedula();
  });

  // Validación de entrada por tecla para nombre (solo letras y espacios, máximo 10)
  nombre.addEventListener('input', function () {
    // Convertir a mayúsculas y limitar a 10 caracteres
    this.value = this.value.toUpperCase().slice(0, 10);
    
    // Si es jurídico, permitir números y caracter especial (.) y (&)
    if (cedulaTipo.value === 'J') {
         this.value = this.value.replace(/[^A-ZÁÉÍÓÚÑ0-9\s.&]/g, '');
    } else {
         // Permitir solo letras y espacios
         this.value = this.value.replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '');
    }
    
    validarNombre();
  });

  // Validación de entrada por tecla para apellido (solo letras y espacios, máximo 10)
  apellido.addEventListener('input', function () {
    // Convertir a mayúsculas y limitar a 10 caracteres
    this.value = this.value.toUpperCase().slice(0, 10);
    
    // Permitir solo letras y espacios
    this.value = this.value.replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '');
    
    validarApellido();
  });

  // Validación y formato de teléfono (solo números, máximo 7 dígitos)
  telefonoNumero.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 7);
    validarTelefono();
  });

  // Contador de caracteres para dirección
  direccion.addEventListener('input', function () {
    if (!direccionTouched) {
      direccionTouched = true;
    }
    
    // Convertir a mayúsculas
    this.value = this.value.toUpperCase();
    
    const length = this.value.length;
    direccionCounter.textContent = `${length}/20 caracteres`;
    
    if (length > 20) {
      this.value = this.value.slice(0, 20);
      direccionCounter.textContent = '20/20 caracteres';
    }
    
    // Actualizar clase del contador
    direccionCounter.className = 'char-counter'; 
    if (length >= 18) {
      direccionCounter.classList.add('warning');
    }
    if (length >= 20) {
      direccionCounter.classList.add('error');
    }
    
    validarDireccion();
  });

  /**
   * Valida el campo cédula según el tipo
   */
  function validarCedula() {
    const valor = cedulaNumero.value.trim();
    const tipo = cedulaTipo.value;
    
    if (valor === '') {
      if (cedulaTouched) {
        setInvalid(cedulaNumero, errorCedula, "Este campo es obligatorio.");
      } else {
        setValid(cedulaNumero, errorCedula);
      }
      return false;
    }
    
    if (tipo === 'J') {
      if (!/^\d{9}$/.test(valor)) {
        setInvalid(cedulaNumero, errorCedula, "La cédula jurídica debe tener exactamente 9 dígitos.");
        return false;
      }
    } else {
      if (!/^\d{7,8}$/.test(valor)) {
        setInvalid(cedulaNumero, errorCedula, "La cédula debe tener entre 7 y 8 dígitos numéricos.");
        return false;
      }
    }
    
    setValid(cedulaNumero, errorCedula);
    return true;
  }

  /**
   * Valida el campo nombre (solo letras y espacios, máximo 10, o alfanumérico si es J)
   */
  function validarNombre() {
    const valor = nombre.value.trim();
    const tipo = cedulaTipo.value;
    
    // Regex diferenciado
    const regex = tipo === 'J' ? /^[A-ZÁÉÍÓÚÑ0-9\s.&]+$/ : /^[A-ZÁÉÍÓÚÑ\s]+$/;
    
    if (valor === '') {
      setInvalid(nombre, errorNombre, "Este campo es obligatorio.");
      return false;
    }
    
    if (!regex.test(valor)) {
      setInvalid(nombre, errorNombre, tipo === 'J' ? "Carácter inválido en Razón Social." : "El nombre solo debe contener letras y espacios.");
      return false;
    }
    
    if (valor.length < 3) {
      setInvalid(nombre, errorNombre, tipo === 'J' ? "La razón social es muy corta" : "El nombre debe tener al menos 3 caracteres.");
      return false;
    }
    
    setValid(nombre, errorNombre);
    return true;
  }

  /**
   * Valida el campo apellido (solo letras y espacios, máximo 10)
   */
  function validarApellido() {
    // Si es Jurídico, asumimos válido (se auto-llena con punto)
    if (cedulaTipo.value === 'J') {
        setValid(apellido, errorApellido);
        return true;
    }

    const valor = apellido.value.trim();
    const regex = /^[A-ZÁÉÍÓÚÑ\s]+$/;
    
    if (valor === '') {
      setInvalid(apellido, errorApellido, "Este campo es obligatorio.");
      return false;
    }
    
    if (!regex.test(valor)) {
      setInvalid(apellido, errorApellido, "El apellido solo debe contener letras y espacios.");
      return false;
    }
    
    if (valor.length < 3) {
      setInvalid(apellido, errorApellido, "El apellido debe tener al menos 3 caracteres.");
      return false;
    }
    
    setValid(apellido, errorApellido);
    return true;
  }

  /**
   * Valida el campo teléfono (exactamente 7 dígitos)
   */
  function validarTelefono() {
    const valor = telefonoNumero.value.trim();
    const regex = /^\d{7}$/;
    
    if (valor === '') {
      setInvalid(telefonoNumero, errorTelefono, "Este campo es obligatorio.");
      return false;
    }
    
    if (!regex.test(valor)) {
      setInvalid(telefonoNumero, errorTelefono, "El teléfono debe tener exactamente 7 dígitos numéricos.");
      return false;
    }
    
    setValid(telefonoNumero, errorTelefono);
    return true;
  }

  /**
   * Valida el campo dirección (entre 10 y 20 caracteres)
   */
  function validarDireccion() {
    const valor = direccion.value.trim();
    
    if (valor === '') {
      if (direccionTouched) {
        setInvalid(direccion, errorDireccion, "Este campo es obligatorio.");
      } else {
        setValid(direccion, errorDireccion);
      }
      return false;
    }
    
    if (valor.length < 10) {
      setInvalid(direccion, errorDireccion, "La dirección debe tener al menos 10 caracteres.");
      return false;
    }
    
    if (valor.length > 20) {
      setInvalid(direccion, errorDireccion, "La dirección no puede tener más de 20 caracteres.");
      return false;
    }
    
    setValid(direccion, errorDireccion);
    return true;
  }

  /**
   * Combina los campos separados en los campos completos para enviar al servidor
   */
  function combinarCampos() {
    // Combinar tipo de cédula + número de cédula
    cedulaCompleta.value = cedulaTipo.value + cedulaNumero.value;
    
    // Combinar prefijo + número de teléfono
    telefonoCompleto.value = telefonoPrefijo.value + telefonoNumero.value;
  }

  // Event listeners para validación en tiempo real
  cedulaNumero.addEventListener('input', validarCedula);
  nombre.addEventListener('input', validarNombre);
  apellido.addEventListener('input', validarApellido);
  telefonoNumero.addEventListener('input', validarTelefono);
  direccion.addEventListener('input', validarDireccion);

  // Event listeners para combinar campos cuando cambien
  cedulaTipo.addEventListener('change', combinarCampos);
  cedulaNumero.addEventListener('input', combinarCampos);
  telefonoPrefijo.addEventListener('change', combinarCampos);
  telefonoNumero.addEventListener('input', combinarCampos);

  /**
   * Validación completa antes del envío del formulario
   */
  form.addEventListener('submit', function (e) {
    // Forzar que se marquen como tocados todos los campos al enviar
    cedulaTouched = true;
    direccionTouched = true;
    
    // Combinar campos antes de enviar
    combinarCampos();

    const valid =
      validarCedula() &&
      validarNombre() &&
      validarApellido() &&
      validarTelefono() &&
      validarDireccion();

    if (!valid) {
      e.preventDefault();
      // Enfocar el primer campo con error
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
        firstInvalid.focus();
      }
    }
  });

  // Combinar campos inicialmente
  combinarCampos();
  
  // Inicializar contador de dirección
  direccion.dispatchEvent(new Event('input'));
});