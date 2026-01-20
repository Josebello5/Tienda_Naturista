from django.conf import settings
import os
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.urls import reverse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import inch
from datetime import datetime
from django.template.loader import render_to_string
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

        # Preparar contexto para la plantilla
        filtros_detalle = []
        if busqueda:
            filtros_detalle.append(f"Búsqueda: '{busqueda}'")
        if tipo_cedula:
            filtros_detalle.append(f"Tipo cédula: {tipo_cedula}")
        if tipo_cliente:
            tipo_cliente_display = "Particular" if tipo_cliente == "particular" else "Mayorista"
            filtros_detalle.append(f"Tipo cliente: {tipo_cliente_display}")
            
        filtros_info = ", ".join(filtros_detalle) if filtros_detalle else None
        
        # Obtener url del logo 
        logo_url = os.path.join(settings.BASE_DIR, 'usuarios', 'static', 'usuarios', 'img', 'logo_redondo_sin_fondo.png')
        
        context = {
            'clientes': clientes,
            'fecha_generacion': datetime.now(),
            'filtros_info': filtros_info,
            'logo_url': logo_url,
        }
        
        # Renderizar template a string
        html_string = render_to_string('clientes/reporte_pdf.html', context)
        
        # Generar PDF
        from xhtml2pdf import pisa
        import io
        
        result = io.BytesIO()
        pdf = pisa.pisaDocument(io.BytesIO(html_string.encode("UTF-8")), result)
        
        if not pdf.err:
            response.write(result.getvalue())
            return response
        
        return HttpResponse(f"Error al generar PDF: {pdf.err}", status=500)
        
    except Exception as e:
        error_message = f"Error al generar el PDF: {str(e)}"
        return HttpResponse(error_message, status=500)