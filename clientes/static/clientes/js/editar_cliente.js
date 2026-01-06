/**
 * Validación del formulario de edición de clientes
 * Archivo: editar_cliente.js
 * Ubicación: static/clientes/js/
 */

document.addEventListener('DOMContentLoaded', function () {
  // Referencias a elementos del DOM
  const form = document.getElementById('clienteForm');
  const tipoCliente = document.getElementById('id_tipo_cliente');
  const telefonoPrefijo = document.getElementById('telefono_prefijo_editar');
  const telefonoNumero = document.getElementById('telefono_numero_editar');
  const nombre = document.getElementById('id_nombre');
  const apellido = document.getElementById('id_apellido');
  const direccion = document.getElementById('id_direccion');
  const telefonoCompleto = document.getElementById('telefono_completo');
  const direccionCounter = document.getElementById('direccion-counter');

  // Variables para controlar si el usuario ha empezado a escribir
  let nombreTouched = false;
  let apellidoTouched = false;
  let telefonoTouched = false;
  let direccionTouched = false;

  /**
   * Marca un campo como inválido y muestra mensaje de error
   */
  function setInvalid(input, message) {
    input.classList.add('is-invalid');
    // Buscar el span de error correspondiente
    const errorSpan = input.parentElement.parentElement.nextElementSibling;
    if (errorSpan && errorSpan.classList.contains('error-msg')) {
      errorSpan.textContent = message;
      errorSpan.style.display = 'block';
    }
  }

  /**
   * Marca un campo como válido y limpia mensaje de error
   */
  function setValid(input) {
    input.classList.remove('is-invalid');
    // Buscar el span de error correspondiente
    const errorSpan = input.parentElement.parentElement.nextElementSibling;
    if (errorSpan && errorSpan.classList.contains('error-msg')) {
      errorSpan.textContent = '';
      errorSpan.style.display = 'none';
    }
  }

  // Marcar que el usuario ha empezado a escribir en nombre
  nombre.addEventListener('input', function () {
    if (!nombreTouched) {
      nombreTouched = true;
    }
    validarNombre();
  });

  // Marcar que el usuario ha empezado a escribir en apellido
  apellido.addEventListener('input', function () {
    if (!apellidoTouched) {
      apellidoTouched = true;
    }
    validarApellido();
  });

  // Marcar que el usuario ha empezado a escribir en teléfono
  telefonoNumero.addEventListener('input', function () {
    if (!telefonoTouched) {
      telefonoTouched = true;
    }
    validarTelefono();
  });

  // Validación de entrada por tecla para nombre (solo letras y espacios, máximo 10)
  nombre.addEventListener('input', function () {
    // Convertir a mayúsculas y limitar a 10 caracteres
    this.value = this.value.toUpperCase().slice(0, 10);
    
    // Permitir solo letras y espacios
    this.value = this.value.replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '');
    
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
    telefonoNumero.value = telefonoNumero.value.replace(/\D/g, '').slice(0, 7);
    validarTelefono();
  });

  // Contador de caracteres para dirección
  direccion.addEventListener('input', function () {
    if (!direccionTouched) {
      direccionTouched = true;
    }
    
    const length = this.value.length;
    direccionCounter.textContent = `${length}/20 caracteres`;
    
    if (length > 20) {
      this.value = this.value.slice(0, 20);
      direccionCounter.textContent = '20/20 caracteres';
    }
    
    // Actualizar clase del contador
    if (length >= 18) {
      direccionCounter.classList.add('warning');
    } else {
      direccionCounter.classList.remove('warning');
    }
    
    if (length > 20) {
      direccionCounter.classList.add('error');
    } else {
      direccionCounter.classList.remove('error');
    }
    
    validarDireccion();
  });

  /**
   * Valida el campo nombre (solo letras y espacios, máximo 10)
   */
  function validarNombre() {
    const valor = nombre.value.trim();
    const regex = /^[A-ZÁÉÍÓÚÑ\s]+$/;
    
    if (valor === '') {
      if (nombreTouched) {
        setInvalid(nombre, "Este campo es obligatorio.");
      } else {
        setValid(nombre);
      }
      return false;
    }
    
    if (!regex.test(valor)) {
      setInvalid(nombre, "El nombre solo debe contener letras y espacios.");
      return false;
    }
    
    if (valor.length < 2) {
      setInvalid(nombre, "El nombre debe tener al menos 2 caracteres.");
      return false;
    }
    
    setValid(nombre);
    return true;
  }

  /**
   * Valida el campo apellido (solo letras y espacios, máximo 10)
   */
  function validarApellido() {
    const valor = apellido.value.trim();
    const regex = /^[A-ZÁÉÍÓÚÑ\s]+$/;
    
    if (valor === '') {
      if (apellidoTouched) {
        setInvalid(apellido, "Este campo es obligatorio.");
      } else {
        setValid(apellido);
      }
      return false;
    }
    
    if (!regex.test(valor)) {
      setInvalid(apellido, "El apellido solo debe contener letras y espacios.");
      return false;
    }
    
    if (valor.length < 2) {
      setInvalid(apellido, "El apellido debe tener al menos 2 caracteres.");
      return false;
    }
    
    setValid(apellido);
    return true;
  }

  /**
   * Valida el campo teléfono (exactamente 7 dígitos)
   */
  function validarTelefono() {
    const valor = telefonoNumero.value.trim();
    const regex = /^\d{7}$/;
    
    if (valor === '') {
      if (telefonoTouched) {
        setInvalid(telefonoNumero, "Este campo es obligatorio.");
      } else {
        setValid(telefonoNumero);
      }
      return false;
    }
    
    if (!regex.test(valor)) {
      setInvalid(telefonoNumero, "El teléfono debe tener exactamente 7 dígitos numéricos.");
      return false;
    }
    
    setValid(telefonoNumero);
    return true;
  }

  /**
   * Valida el campo dirección (entre 10 y 20 caracteres)
   */
  function validarDireccion() {
    const valor = direccion.value.trim();
    
    if (valor === '') {
      if (direccionTouched) {
        setInvalid(direccion, "Este campo es obligatorio.");
      } else {
        setValid(direccion);
      }
      return false;
    }
    
    if (valor.length < 10) {
      setInvalid(direccion, "La dirección debe tener al menos 10 caracteres.");
      return false;
    }
    
    if (valor.length > 20) {
      setInvalid(direccion, "La dirección no puede tener más de 20 caracteres.");
      return false;
    }
    
    setValid(direccion);
    return true;
  }

  /**
   * Combina los campos separados en los campos completos para enviar al servidor
   */
  function combinarTelefono() {
    // Combinar prefijo + número de teléfono
    telefonoCompleto.value = telefonoPrefijo.value + telefonoNumero.value;
  }

  // Event listeners para validación en tiempo real
  nombre.addEventListener('input', validarNombre);
  apellido.addEventListener('input', validarApellido);
  telefonoNumero.addEventListener('input', validarTelefono);
  direccion.addEventListener('input', validarDireccion);

  // Event listeners para combinar teléfono cuando cambien
  telefonoPrefijo.addEventListener('change', combinarTelefono);
  telefonoNumero.addEventListener('input', combinarTelefono);

  /**
   * Validación completa antes del envío del formulario
   */
  form.addEventListener('submit', function (e) {
    // Forzar que se marquen como tocados todos los campos al enviar
    nombreTouched = true;
    apellidoTouched = true;
    telefonoTouched = true;
    direccionTouched = true;
    
    // Combinar teléfono antes de enviar
    combinarTelefono();

    const valid =
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

  // Combinar teléfono inicialmente
  combinarTelefono();
  
  // Inicializar contador de dirección
  if (direccion.value) {
    const length = direccion.value.length;
    direccionCounter.textContent = `${length}/20 caracteres`;
    
    if (length >= 18) {
      direccionCounter.classList.add('warning');
    }
  }
});