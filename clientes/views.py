from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.urls import reverse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from datetime import datetime
from .forms import ClienteForm, EditarClienteForm
from .models import Cliente
from django.db.models import Q
import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib import messages
from usuarios.decorators import admin_or_owner_required

def registrar_cliente(request):
    if request.method == 'POST':
        form = ClienteForm(request.POST)
        if form.is_valid():
            try:
                cliente = form.save()
                return redirect(f"{reverse('clientes:menu_clientes')}?registro_exitoso=1")
            except Exception as e:
                messages.error(request, f'No se pudo registrar el cliente. Error: {str(e)}')
        else:
            # No mostrar mensaje general, los errores se mostrarán en los campos
            pass
    else:
        form = ClienteForm()

    context = {
        'form': form,
    }
    return render(request, 'clientes/registro_cliente.html', context)

def menu_clientes(request):
    clientes = Cliente.objects.all().order_by('nombre')
    
    # Verificar si viene de acciones exitosas
    registro_exitoso = request.GET.get('registro_exitoso')
    edicion_exitosa = request.GET.get('edicion_exitosa')
    eliminacion_exitosa = request.GET.get('eliminacion_exitosa')
    error_eliminacion = request.GET.get('error_eliminacion')
    
    context = {
        'clientes': clientes,
        'registro_exitoso': registro_exitoso,
        'edicion_exitosa': edicion_exitosa,
        'eliminacion_exitosa': eliminacion_exitosa,
        'error_eliminacion': error_eliminacion,
    }
    return render(request, 'clientes/menu_clientes.html', context)

def editar_cliente(request, id):
    cliente = get_object_or_404(Cliente, id=id)
    
    if request.method == 'POST':
        form = EditarClienteForm(request.POST, instance=cliente)
        if form.is_valid():
            try:
                form.save()
                return redirect(f"{reverse('clientes:menu_clientes')}?edicion_exitosa=1")
            except Exception as e:
                messages.error(request, f'No se pudo actualizar el cliente. Error: {str(e)}')
        else:
            # Los errores se mostrarán en el formulario
            # No agregamos mensaje general para que los errores se muestren en los campos específicos
            pass
    else:
        form = EditarClienteForm(instance=cliente)

    return render(request, 'clientes/editar_cliente.html', {'form': form, 'cliente': cliente})

@require_POST
@admin_or_owner_required
def eliminar_cliente(request, id):
    cliente = get_object_or_404(Cliente, id=id)
    try:
        # Validación: No eliminar si tiene ventas asociadas
        if cliente.venta_set.exists():
             return redirect(f"{reverse('clientes:menu_clientes')}?error_eliminacion=1")

        cliente_nombre = f"{cliente.nombre} {cliente.apellido}"
        cliente.delete()
        messages.success(request, f'Cliente {cliente_nombre} eliminado exitosamente')
        return redirect(f"{reverse('clientes:menu_clientes')}?eliminacion_exitosa=1")
    except Exception as e:
        messages.error(request, f'No se pudo eliminar el cliente. Error: {str(e)}')
        return redirect('clientes:menu_clientes')



def generar_pdf_clientes(request):
    try:
        # Obtener parámetros de filtrado
        tipo_cedula = request.GET.get('tipo_cedula', '')
        tipo_cliente = request.GET.get('tipo_cliente', '')
        busqueda = request.GET.get('busqueda', '')
        
        # Aplicar los mismos filtros
        clientes = Cliente.objects.all().order_by('nombre')
        
        if tipo_cedula:
            clientes = clientes.filter(cedula__startswith=tipo_cedula)
        
        if tipo_cliente:
            clientes = clientes.filter(tipo_cliente=tipo_cliente)
        
        if busqueda:
            clientes = clientes.filter(
                Q(cedula__icontains=busqueda) |
                Q(nombre__icontains=busqueda) |
                Q(apellido__icontains=busqueda) |
                Q(telefono__icontains=busqueda) |
                Q(direccion__icontains=busqueda)
            )

        # Crear respuesta HTTP
        response = HttpResponse(content_type='application/pdf')
        
        # Generar nombre de archivo descriptivo basado en filtros
        filename_parts = ["clientes"]
        
        if busqueda:
            # Limpiar el texto de búsqueda para el nombre del archivo
            busqueda_limpia = busqueda.replace(' ', '_').replace('/', '_')[:20]
            filename_parts.append(f"busqueda_{busqueda_limpia}")
        if tipo_cedula:
            filename_parts.append(f"cedula_{tipo_cedula}")
        if tipo_cliente:
            tipo_cliente_limpio = "particular" if tipo_cliente == "particular" else "mayorista"
            filename_parts.append(f"tipo_{tipo_cliente_limpio}")
        
        filename = "_".join(filename_parts) + ".pdf"
        
        # Limitar longitud del nombre del archivo
        if len(filename) > 100:
            filename = "clientes_filtrados.pdf"
        
        # Asegurar que el filename sea seguro
        filename = filename.replace(' ', '_').replace('/', '_')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        # Crear el PDF
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # Configuración inicial
        p.setTitle("Listado de Clientes - Tienda Naturista")
        
        # Encabezado
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        
        p.setFont("Helvetica", 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        
        # Información de filtros aplicados
        filtros_info = "Listado Completo de Clientes"
        filtros_detalle = []
        if busqueda:
            filtros_detalle.append(f"Búsqueda: '{busqueda}'")
        if tipo_cedula:
            filtros_detalle.append(f"Tipo cédula: {tipo_cedula}")
        if tipo_cliente:
            tipo_cliente_display = "Particular" if tipo_cliente == "particular" else "Mayorista"
            filtros_detalle.append(f"Tipo cliente: {tipo_cliente_display}")
        
        if filtros_detalle:
            filtros_info = "Clientes Filtrados - " + ", ".join(filtros_detalle)
        
        p.drawString(1*inch, height-1.6*inch, f"{filtros_info} - {fecha_actual}")
        
        # Línea separadora
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
        
        # Configurar posición inicial para la tabla
        y_position = height - 2.2*inch
        line_height = 0.25*inch
        
        # Encabezados de tabla
        p.setFont("Helvetica-Bold", 10)
        p.drawString(1*inch, y_position, "CÉDULA")
        p.drawString(2*inch, y_position, "NOMBRE")
        p.drawString(3.5*inch, y_position, "APELLIDO")
        p.drawString(5*inch, y_position, "TELÉFONO")
        p.drawString(6*inch, y_position, "TIPO")
        
        y_position -= line_height
        p.line(1*inch, y_position, 7.5*inch, y_position)
        y_position -= 0.1*inch
        
        # Datos de clientes
        p.setFont("Helvetica", 9)
        
        for cliente in clientes:
            if y_position < 1*inch:  # Si queda poco espacio, nueva página
                p.showPage()
                y_position = height - 1*inch
                p.setFont("Helvetica", 9)
            
            p.drawString(1*inch, y_position, cliente.cedula)
            p.drawString(2*inch, y_position, cliente.nombre)
            p.drawString(3.5*inch, y_position, cliente.apellido)
            p.drawString(5*inch, y_position, cliente.telefono)
            p.drawString(6*inch, y_position, cliente.get_tipo_cliente_display())
            
            y_position -= line_height
        
        # Total
        p.setFont("Helvetica-Bold", 10)
        p.drawString(1*inch, y_position - 0.5*inch, f"Total de clientes: {clientes.count()}")
        
        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawString(1*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
        
        # Finalizar PDF
        p.showPage()
        p.save()
        
        return response
        
    except Exception as e:
        error_message = f"Error al generar el PDF: {str(e)}"
        return HttpResponse(error_message, status=500)