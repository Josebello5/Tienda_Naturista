from django.shortcuts import render, redirect, get_object_or_404
from .models import Lote, Proveedor
from productos.models import Producto
from .forms import LoteForm, EditarLoteForm
from django.utils import timezone
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from datetime import datetime, timedelta
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.exceptions import ValidationError
from django.urls import reverse
import json
import re
import logging

# Configurar logger
logger = logging.getLogger(__name__)

def menu_lote(request):
    """
    Vista para mostrar el listado de lotes con búsqueda, filtros y paginación
    """
    query = request.GET.get('q', '')
    producto_id = request.GET.get('producto', '')
    estado = request.GET.get('estado', '')
    proveedor_id = request.GET.get('proveedor', '')  # Cambiado a proveedor_id
    fecha_recibimiento_desde = request.GET.get('fecha_recibimiento_desde', '')
    fecha_recibimiento_hasta = request.GET.get('fecha_recibimiento_hasta', '')
    fecha_vencimiento_desde = request.GET.get('fecha_vencimiento_desde', '')
    fecha_vencimiento_hasta = request.GET.get('fecha_vencimiento_hasta', '')
    rango_recibimiento = request.GET.get('rango_recibimiento', '')
    rango_vencimiento = request.GET.get('rango_vencimiento', '')
    
    # Verificar si viene de acciones exitosas
    registro_exitoso = request.GET.get('registro_exitoso')
    edicion_exitosa = request.GET.get('edicion_exitosa')
    codigo_lote = request.GET.get('codigo_lote', '')
    
    # Obtener lotes con información relacionada
    lotes = Lote.objects.select_related('id_producto', 'proveedor').all().order_by('-fecha_creacion')
    
    # Aplicar filtros
    if query:
        lotes = lotes.filter(
            Q(codigo_lote__icontains=query) |
            Q(id_producto__nombre_pro__icontains=query)
        )
    if producto_id:
        lotes = lotes.filter(id_producto_id=producto_id)
    if estado:
        lotes = lotes.filter(estado=estado)
    if proveedor_id:  # Cambiado para usar ID
        lotes = lotes.filter(proveedor_id=proveedor_id)
    
    # Aplicar filtros de fecha por rango
    hoy = timezone.localdate()
    
    # Filtro de recibimiento por rango
    if rango_recibimiento:
        if rango_recibimiento == 'hoy':
            lotes = lotes.filter(fecha_recibimiento=hoy)
        elif rango_recibimiento == 'semana':
            inicio_semana = hoy - timedelta(days=hoy.weekday())
            fin_semana = inicio_semana + timedelta(days=6)
            lotes = lotes.filter(fecha_recibimiento__range=[inicio_semana, fin_semana])
        elif rango_recibimiento == 'mes':
            inicio_mes = hoy.replace(day=1)
            fin_mes = (inicio_mes + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            lotes = lotes.filter(fecha_recibimiento__range=[inicio_mes, fin_mes])
        elif rango_recibimiento == 'año':
            inicio_año = hoy.replace(month=1, day=1)
            fin_año = hoy.replace(month=12, day=31)
            lotes = lotes.filter(fecha_recibimiento__range=[inicio_año, fin_año])
    elif fecha_recibimiento_desde and fecha_recibimiento_hasta:
        lotes = lotes.filter(fecha_recibimiento__range=[fecha_recibimiento_desde, fecha_recibimiento_hasta])
    
    # Filtro de vencimiento por rango
    if rango_vencimiento:
        if rango_vencimiento == 'hoy':
            lotes = lotes.filter(fecha_vencimiento=hoy)
        elif rango_vencimiento == 'semana':
            inicio_semana = hoy - timedelta(days=hoy.weekday())
            fin_semana = inicio_semana + timedelta(days=6)
            lotes = lotes.filter(fecha_vencimiento__range=[inicio_semana, fin_semana])
        elif rango_vencimiento == 'mes':
            inicio_mes = hoy.replace(day=1)
            fin_mes = (inicio_mes + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            lotes = lotes.filter(fecha_vencimiento__range=[inicio_mes, fin_mes])
        elif rango_vencimiento == 'año':
            inicio_año = hoy.replace(month=1, day=1)
            fin_año = hoy.replace(month=12, day=31)
            lotes = lotes.filter(fecha_vencimiento__range=[inicio_año, fin_año])
    elif fecha_vencimiento_desde and fecha_vencimiento_hasta:
        lotes = lotes.filter(fecha_vencimiento__range=[fecha_vencimiento_desde, fecha_vencimiento_hasta])
    
    # Obtener productos para el filtro
    productos = Producto.objects.filter(estado='activo')
    
    # Obtener proveedores para el filtro (desde la tabla Proveedor)
    proveedores = Proveedor.objects.all().order_by('nombre')
    
    # PAGINACIÓN - 5 registros por página
    page = request.GET.get('page', 1)
    paginator = Paginator(lotes, 5)  # 5 registros por página
    
    try:
        lotes_paginados = paginator.page(page)
    except PageNotAnInteger:
        lotes_paginados = paginator.page(1)
    except EmptyPage:
        lotes_paginados = paginator.page(paginator.num_pages)
    
    # Si es una petición AJAX, devolvemos JSON (PARA FILTRADO EN TIEMPO REAL)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        lotes_data = []
        for lote in lotes:
            lotes_data.append({
                'id': lote.id_lote,
                'codigo': lote.codigo_lote,
                'producto': lote.id_producto.nombre_pro,
                'producto_id': lote.id_producto.ID_producto,
                'proveedor': lote.proveedor.nombre,  # Cambiado a nombre del proveedor
                'proveedor_id': lote.proveedor.id_proveedor,  # Agregado ID del proveedor
                'costo_unitario': f"${lote.costo_unitario}",
                'costo_total': f"${lote.costo_total}",
                'cantidad': lote.cantidad,
                'cantidad_disponible': lote.cantidad_disponible,
                'fecha_recibimiento': lote.fecha_recibimiento.strftime("%d/%m/%Y"),
                'fecha_vencimiento': lote.fecha_vencimiento.strftime("%d/%m/%Y"),
                'estado': lote.get_estado_display(),
                'estado_raw': lote.estado,
            })
        return JsonResponse({'lotes': lotes_data})
    
    context = {
        'lotes': lotes_paginados,
        'productos': productos,
        'proveedores': proveedores,  # Cambiado a objeto Proveedor
        'query': query,
        'producto_filtro': producto_id,
        'estado_filtro': estado,
        'proveedor_filtro': proveedor_id,  # Cambiado a ID
        'fecha_recibimiento_desde': fecha_recibimiento_desde,
        'fecha_recibimiento_hasta': fecha_recibimiento_hasta,
        'fecha_vencimiento_desde': fecha_vencimiento_desde,
        'fecha_vencimiento_hasta': fecha_vencimiento_hasta,
        'rango_recibimiento': rango_recibimiento,
        'rango_vencimiento': rango_vencimiento,
        'registro_exitoso': registro_exitoso,
        'edicion_exitosa': edicion_exitosa,
        'codigo_lote': codigo_lote,
    }
    return render(request, 'lotes/menu_lote.html', context)

def registrar_lote(request):
    if request.method == 'POST':
        form = LoteForm(request.POST)
        if form.is_valid():
            try:
                lote = form.save(commit=False)
                lote.cantidad_disponible = lote.cantidad
                lote.save()
                
                return redirect(f"{reverse('lotes:menu_lote')}?registro_exitoso=true&codigo_lote={lote.codigo_lote}")
                
            except ValidationError as e:
                messages.error(request, f'Error de validación: {e}')
            except Exception as e:
                messages.error(request, f'No se pudo registrar el lote. Error: {str(e)}')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    if field == '__all__':
                        messages.error(request, error)
                    else:
                        messages.error(request, f'{field}: {error}')
    else:
        form = LoteForm()

    # Obtener productos activos Y agotados
    productos = Producto.objects.filter(estado__in=['activo', 'agotado'])
    
    # Obtener proveedores desde la tabla Proveedor
    proveedores = Proveedor.objects.all().order_by('nombre')

    context = {
        'form': form,
        'productos': productos,
        'proveedores': proveedores,
    }
    return render(request, 'lotes/registrar_lote.html', context)

def editar_lote(request, id_lote):
    lote = get_object_or_404(Lote, id_lote=id_lote)
    
    # VERIFICAR SI EL LOTE ESTÁ VENCIDO O AGOTADO - NO PERMITIR EDICIÓN
    if lote.estado in ['vencido', 'agotado']:
        messages.error(request, f'No se puede editar un lote {lote.get_estado_display().lower()}.')
        return redirect('lotes:menu_lote')
    
    # Obtener productos y proveedores
    productos = Producto.objects.filter(estado__in=['activo', 'agotado'])
    proveedores = Proveedor.objects.all().order_by('nombre')
    
    if request.method == 'POST':
        form = EditarLoteForm(request.POST, instance=lote)
        if form.is_valid():
            try:
                # Guardar sin modificar el estado automáticamente
                lote_editado = form.save(commit=False)
                
                # Preservar el estado actual - NO calcular automáticamente durante edición
                estado_original = lote.estado
                lote_editado.save()
                
                # Si después de guardar la cantidad disponible es 0, actualizar estado a agotado
                if lote_editado.cantidad_disponible <= 0 and estado_original != 'agotado':
                    lote_editado.estado = 'agotado'
                    lote_editado.save(update_fields=['estado'])
                # Si la cantidad disponible es mayor a 0 y estaba agotado, volver a activo
                elif lote_editado.cantidad_disponible > 0 and estado_original == 'agotado':
                    lote_editado.estado = 'activo'
                    lote_editado.save(update_fields=['estado'])
                
                return redirect(f"{reverse('lotes:menu_lote')}?edicion_exitosa=true&codigo_lote={lote_editado.codigo_lote}")
            except Exception as e:
                messages.error(request, f'No se pudo actualizar el lote. Error: {str(e)}')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{field}: {error}')
    else:
        form = EditarLoteForm(instance=lote)

    return render(request, 'lotes/editar_lote.html', {
        'form': form,
        'lote': lote,
        'productos': productos,
        'proveedores': proveedores
    })

@csrf_exempt
@require_POST
def actualizar_costo_unitario(request, id_lote):
    try:
        data = json.loads(request.body)
        nuevo_costo = data.get('costo_unitario')
        
        if not nuevo_costo:
            return JsonResponse({'success': False, 'error': 'El costo unitario es requerido'})
        
        # Convertir a Decimal para manejar correctamente los decimales
        from decimal import Decimal
        nuevo_costo = Decimal(str(nuevo_costo))
        
        lote = Lote.objects.get(id_lote=id_lote)
        
        # Verificar si el lote está vencido O AGOTADO
        if lote.estado in ['vencido', 'agotado']:
            return JsonResponse({
                'success': False, 
                'error': f'No se puede modificar el costo de un lote {lote.get_estado_display().lower()}'
            })
            
        lote.costo_unitario = nuevo_costo
        lote.save()
        
        return JsonResponse({
            'success': True, 
            'costo_unitario': str(lote.costo_unitario),
            'costo_total': str(lote.costo_total),
            'message': 'Costo unitario actualizado correctamente'
        })
        
    except Lote.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Lote no encontrado'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def cambiar_estado_lote(request, id_lote):
    try:
        lote = Lote.objects.get(id_lote=id_lote)
        
        # VERIFICAR SI EL LOTE ESTÁ VENCIDO O AGOTADO - NO PERMITIR CAMBIOS
        if lote.estado in ['vencido', 'agotado']:
            return JsonResponse({
                'success': False, 
                'error': f'No se puede modificar el estado de lotes {lote.get_estado_display().lower()}'
            })
        
        # Solo permitir cambiar entre activo e inactivo
        if lote.estado in ['activo', 'inactivo']:
            nuevo_estado = 'inactivo' if lote.estado == 'activo' else 'activo'
            lote.estado = nuevo_estado
            lote.save()
            
            return JsonResponse({
                'success': True, 
                'nuevo_estado': lote.estado,
                'nuevo_estado_display': lote.get_estado_display(),
                'message': f'Estado del lote cambiado a {lote.get_estado_display().lower()} correctamente'
            })
        else:
            return JsonResponse({
                'success': False, 
                'error': 'Estado no permitido para modificación'
            })
            
    except Lote.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Lote no encontrado'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

def lista_proveedores_json(request):
    """Devuelve lista de proveedores en formato JSON para AJAX"""
    proveedores = Proveedor.objects.all().order_by('nombre')
    proveedores_data = []
    for proveedor in proveedores:
        proveedores_data.append({
            'id': proveedor.id_proveedor,
            'nombre': proveedor.nombre,
            'contacto': proveedor.contacto or '',
            'fecha_creacion': proveedor.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            'fecha_actualizacion': proveedor.fecha_actualizacion.strftime('%d/%m/%Y %H:%M')
        })
    return JsonResponse(proveedores_data, safe=False)

@csrf_exempt
@require_POST
def crear_proveedor(request):
    """Crear nuevo proveedor desde AJAX"""
    try:
        data = json.loads(request.body)
        nombre = data.get('nombre', '').strip()
        contacto = data.get('contacto', '').strip()
        
        if not nombre:
            return JsonResponse({'success': False, 'error': 'El nombre del proveedor es obligatorio.'})
        
        # Validar formato
        if not re.match(r'^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.]+$', nombre):
            return JsonResponse({'success': False, 'error': 'El nombre del proveedor solo puede contener letras, números y puntos.'})
        
        # Convertir a mayúsculas
        nombre = nombre.upper()
        
        # Verificar si ya existe
        if Proveedor.objects.filter(nombre=nombre).exists():
            return JsonResponse({'success': False, 'error': 'Ya existe un proveedor con este nombre.'})
        
        # Crear el proveedor
        proveedor = Proveedor(nombre=nombre, contacto=contacto)
        proveedor.save()
        
        return JsonResponse({
            'success': True, 
            'message': '¡Proveedor creado correctamente!',
            'proveedor': {
                'id': proveedor.id_proveedor,
                'nombre': proveedor.nombre,
                'contacto': proveedor.contacto or ''
            }
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def editar_proveedor(request, id_proveedor):
    """Editar proveedor existente"""
    try:
        proveedor = Proveedor.objects.get(id_proveedor=id_proveedor)
        data = json.loads(request.body)
        nombre = data.get('nombre', '').strip()
        contacto = data.get('contacto', '').strip()
        
        if not nombre:
            return JsonResponse({'success': False, 'error': 'El nombre del proveedor es obligatorio.'})
        
        # Validar formato
        if not re.match(r'^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.]+$', nombre):
            return JsonResponse({'success': False, 'error': 'El nombre del proveedor solo puede contener letras, números y puntos.'})
        
        # Convertir a mayúsculas
        nombre = nombre.upper()
        
        # Verificar si ya existe (excluyendo el actual)
        if Proveedor.objects.filter(nombre=nombre).exclude(id_proveedor=id_proveedor).exists():
            return JsonResponse({'success': False, 'error': 'Ya existe un proveedor con este nombre.'})
        
        # Actualizar el proveedor
        proveedor.nombre = nombre
        proveedor.contacto = contacto
        proveedor.save()
        
        return JsonResponse({
            'success': True, 
            'message': '¡Proveedor actualizado correctamente!',
            'proveedor': {
                'id': proveedor.id_proveedor,
                'nombre': proveedor.nombre,
                'contacto': proveedor.contacto or ''
            }
        })
        
    except Proveedor.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Proveedor no encontrado.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def eliminar_proveedor(request, id_proveedor):
    """Eliminar proveedor"""
    try:
        proveedor = Proveedor.objects.get(id_proveedor=id_proveedor)
        nombre_proveedor = proveedor.nombre
        
        # Verificar si hay lotes asociados a este proveedor
        if Lote.objects.filter(proveedor=proveedor).exists():
            return JsonResponse({
                'success': False, 
                'error': 'No se puede eliminar el proveedor porque tiene lotes asociados.'
            })
        
        proveedor.delete()
        return JsonResponse({
            'success': True, 
            'message': f'¡Proveedor "{nombre_proveedor}" eliminado correctamente!'
        })
        
    except Proveedor.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Proveedor no encontrado.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

def imprimir_proveedores(request):
    """Generar PDF con listado de proveedores"""
    try:
        proveedores = Proveedor.objects.all().order_by('nombre')
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="listado_proveedores.pdf"'
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # Configuración inicial
        p.setTitle("Listado de Proveedores - Tienda Naturista")
        
        # Encabezado
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        
        p.setFont("Helvetica", 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        p.drawString(1*inch, height-1.6*inch, f"Listado de Proveedores - {fecha_actual}")
        
        # Línea separadora
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
        
        # Configurar posición inicial para la tabla
        y_position = height - 2.2*inch
        line_height = 0.25*inch
        
        # Encabezados de tabla
        p.setFont("Helvetica-Bold", 10)
        p.drawString(1*inch, y_position, "ID")
        p.drawString(1.5*inch, y_position, "NOMBRE")
        p.drawString(4*inch, y_position, "CONTACTO")
        p.drawString(6*inch, y_position, "FECHA CREACIÓN")
        
        y_position -= line_height
        p.line(1*inch, y_position, 7.5*inch, y_position)
        y_position -= 0.1*inch
        
        # Datos de proveedores
        p.setFont("Helvetica", 9)
        
        for proveedor in proveedores:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                
                # Encabezados en nueva página
                p.setFont("Helvetica-Bold", 10)
                p.drawString(1*inch, y_position, "ID")
                p.drawString(1.5*inch, y_position, "NOMBRE")
                p.drawString(4*inch, y_position, "CONTACTO")
                p.drawString(6*inch, y_position, "FECHA CREACIÓN")
                
                y_position -= line_height
                p.line(1*inch, y_position, 7.5*inch, y_position)
                y_position -= 0.1*inch
                p.setFont("Helvetica", 9)
            
            p.drawString(1*inch, y_position, str(proveedor.id_proveedor))
            p.drawString(1.5*inch, y_position, proveedor.nombre)
            
            # Truncar contacto si es muy largo
            contacto_display = proveedor.contacto or ""
            if len(contacto_display) > 25:
                contacto_display = contacto_display[:22] + "..."
            p.drawString(4*inch, y_position, contacto_display)
            
            p.drawString(6*inch, y_position, proveedor.fecha_creacion.strftime('%d/%m/%Y %H:%M'))
            
            y_position -= line_height
        
        # Total
        p.setFont("Helvetica-Bold", 10)
        y_position -= 0.3*inch
        p.drawString(1*inch, y_position, f"Total de proveedores: {proveedores.count()}")
        
        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawString(1*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
        
        p.showPage()
        p.save()
        
        return response
        
    except Exception as e:
        logger.error(f"Error al generar PDF de proveedores: {str(e)}")
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="error.pdf"'
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-2*inch, "Error al generar el PDF")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-2.5*inch, "Ocurrió un error inesperado al generar el listado.")
        
        p.showPage()
        p.save()
        
        return response


def generar_pdf_lotes(request):
    try:
        # Obtener parámetros de filtro de la URL
        query = request.GET.get('q', '')
        producto_id = request.GET.get('producto', '')
        estado = request.GET.get('estado', '')
        proveedor_id = request.GET.get('proveedor', '')
        fecha_recibimiento_desde = request.GET.get('fecha_recibimiento_desde', '')
        fecha_recibimiento_hasta = request.GET.get('fecha_recibimiento_hasta', '')
        fecha_vencimiento_desde = request.GET.get('fecha_vencimiento_desde', '')
        fecha_vencimiento_hasta = request.GET.get('fecha_vencimiento_hasta', '')
        
        # Obtener lotes con información relacionada
        lotes = Lote.objects.select_related('id_producto', 'proveedor').all().order_by('-fecha_creacion')
        
        # Aplicar filtros (misma lógica que menu_lote)
        if query:
            lotes = lotes.filter(
                Q(codigo_lote__icontains=query) |
                Q(id_producto__nombre_pro__icontains=query)
            )
        if producto_id:
            lotes = lotes.filter(id_producto_id=producto_id)
        if estado:
            lotes = lotes.filter(estado=estado)
        if proveedor_id:
            lotes = lotes.filter(proveedor_id=proveedor_id)
        
        # Aplicar filtros de fecha
        if fecha_recibimiento_desde and fecha_recibimiento_hasta:
            lotes = lotes.filter(fecha_recibimiento__range=[fecha_recibimiento_desde, fecha_recibimiento_hasta])
        elif fecha_recibimiento_desde:
            lotes = lotes.filter(fecha_recibimiento__gte=fecha_recibimiento_desde)
        elif fecha_recibimiento_hasta:
            lotes = lotes.filter(fecha_recibimiento__lte=fecha_recibimiento_hasta)
            
        if fecha_vencimiento_desde and fecha_vencimiento_hasta:
            lotes = lotes.filter(fecha_vencimiento__range=[fecha_vencimiento_desde, fecha_vencimiento_hasta])
        elif fecha_vencimiento_desde:
            lotes = lotes.filter(fecha_vencimiento__gte=fecha_vencimiento_desde)
        elif fecha_vencimiento_hasta:
            lotes = lotes.filter(fecha_vencimiento__lte=fecha_vencimiento_hasta)

        # Diccionarios para las opciones de choices
        ESTADOS_DICT = {
            'activo': 'Activo',
            'inactivo': 'Inactivo',
            'vencido': 'Vencido',
            'agotado': 'Agotado'
        }

        # Verificar si hay lotes después de aplicar filtros
        if not lotes.exists():
            # Crear respuesta HTTP para mensaje de error
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="sin_lotes.pdf"'
            
            # Crear PDF con mensaje de error
            p = canvas.Canvas(response, pagesize=letter)
            width, height = letter
            
            # Configuración inicial
            p.setTitle("Listado de Lotes - Tienda Naturista")
            
            # Encabezado
            p.setFont("Helvetica-Bold", 16)
            p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
            
            p.setFont("Helvetica", 12)
            p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
            
            p.setFont("Helvetica", 10)
            fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
            p.drawString(1*inch, height-1.6*inch, f"Listado de Lotes - {fecha_actual}")
            
            # Línea separadora
            p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
            
            # Mensaje de no lotes
            p.setFont("Helvetica-Bold", 14)
            p.drawString(2*inch, height-3*inch, "No hay lotes con los filtros aplicados")
            
            p.setFont("Helvetica", 12)
            p.drawString(1.5*inch, height-3.5*inch, "Por favor, ajuste los criterios de búsqueda e intente nuevamente.")
            
            # Información de filtros aplicados
            filtros_info = "Filtros aplicados: "
            filtros = []
            if query:
                filtros.append(f"Búsqueda: '{query}'")
            if producto_id:
                try:
                    producto = Producto.objects.get(ID_producto=producto_id)
                    filtros.append(f"Producto: {producto.nombre_pro}")
                except Producto.DoesNotExist:
                    filtros.append(f"Producto ID: {producto_id}")
            if estado:
                estado_display = ESTADOS_DICT.get(estado, estado)
                filtros.append(f"Estado: {estado_display}")
            if proveedor_id:
                try:
                    proveedor = Proveedor.objects.get(id_proveedor=proveedor_id)
                    filtros.append(f"Proveedor: {proveedor.nombre}")
                except Proveedor.DoesNotExist:
                    filtros.append(f"Proveedor ID: {proveedor_id}")
            if fecha_recibimiento_desde and fecha_recibimiento_hasta:
                filtros.append(f"Recibimiento: {fecha_recibimiento_desde} a {fecha_recibimiento_hasta}")
            elif fecha_recibimiento_desde:
                filtros.append(f"Recibimiento desde: {fecha_recibimiento_desde}")
            elif fecha_recibimiento_hasta:
                filtros.append(f"Recibimiento hasta: {fecha_recibimiento_hasta}")
            if fecha_vencimiento_desde and fecha_vencimiento_hasta:
                filtros.append(f"Vencimiento: {fecha_vencimiento_desde} a {fecha_vencimiento_hasta}")
            elif fecha_vencimiento_desde:
                filtros.append(f"Vencimiento desde: {fecha_vencimiento_desde}")
            elif fecha_vencimiento_hasta:
                filtros.append(f"Vencimiento hasta: {fecha_vencimiento_hasta}")
            
            if filtros:
                filtros_info += ", ".join(filtros)
                p.setFont("Helvetica", 10)
                # Dividir texto largo en múltiples líneas
                lines = []
                words = filtros_info.split()
                current_line = ""
                for word in words:
                    test_line = current_line + word + " "
                    if len(test_line) > 80:
                        lines.append(current_line)
                        current_line = word + " "
                    else:
                        current_line = test_line
                if current_line:
                    lines.append(current_line)
                
                y_position = height - 4*inch
                for line in lines:
                    p.drawString(1*inch, y_position, line)
                    y_position -= 0.2*inch
            
            # Pie de página
            p.setFont("Helvetica-Oblique", 8)
            p.drawString(1*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
            
            # Finalizar PDF
            p.showPage()
            p.save()
            
            return response
        
        # Crear respuesta HTTP para lotes encontrados
        response = HttpResponse(content_type='application/pdf')
        
        # Generar nombre de archivo descriptivo basado en filtros
        filename_parts = ["lotes"]
        
        if query:
            filename_parts.append(f"busqueda_{query.replace(' ', '_')[:20]}")
        if producto_id:
            try:
                producto = Producto.objects.get(ID_producto=producto_id)
                filename_parts.append(f"producto_{producto.nombre_pro.replace(' ', '_')[:15]}")
            except Producto.DoesNotExist:
                filename_parts.append(f"producto_{producto_id}")
        if estado:
            filename_parts.append(f"estado_{estado}")
        if proveedor_id:
            try:
                proveedor = Proveedor.objects.get(id_proveedor=proveedor_id)
                filename_parts.append(f"proveedor_{proveedor.nombre.replace(' ', '_')[:15]}")
            except Proveedor.DoesNotExist:
                filename_parts.append(f"proveedor_{proveedor_id}")
        
        # Fechas de recibimiento
        if fecha_recibimiento_desde and fecha_recibimiento_hasta:
            desde_str = fecha_recibimiento_desde.replace('-', '')
            hasta_str = fecha_recibimiento_hasta.replace('-', '')
            filename_parts.append(f"recib_{desde_str}_{hasta_str}")
        elif fecha_recibimiento_desde:
            desde_str = fecha_recibimiento_desde.replace('-', '')
            filename_parts.append(f"recib_desde_{desde_str}")
        elif fecha_recibimiento_hasta:
            hasta_str = fecha_recibimiento_hasta.replace('-', '')
            filename_parts.append(f"recib_hasta_{hasta_str}")
            
        # Fechas de vencimiento
        if fecha_vencimiento_desde and fecha_vencimiento_hasta:
            desde_str = fecha_vencimiento_desde.replace('-', '')
            hasta_str = fecha_vencimiento_hasta.replace('-', '')
            filename_parts.append(f"venc_{desde_str}_{hasta_str}")
        elif fecha_vencimiento_desde:
            desde_str = fecha_vencimiento_desde.replace('-', '')
            filename_parts.append(f"venc_desde_{desde_str}")
        elif fecha_vencimiento_hasta:
            hasta_str = fecha_vencimiento_hasta.replace('-', '')
            filename_parts.append(f"venc_hasta_{hasta_str}")
        
        filename = "_".join(filename_parts) + ".pdf"
        
        # Limitar longitud del nombre del archivo
        if len(filename) > 100:
            filename = "lotes_filtrados.pdf"
        
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        # Resto del código para generar el PDF
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # Configuración inicial
        p.setTitle("Listado de Lotes - Tienda Naturista")
        
        # Encabezado
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        
        p.setFont("Helvetica", 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        
        # Información de filtros aplicados
        filtros_info = "Listado Completo de Lotes"
        filtros_detalle = []
        if query:
            filtros_detalle.append(f"Búsqueda: '{query}'")
        if producto_id:
            try:
                producto = Producto.objects.get(ID_producto=producto_id)
                filtros_detalle.append(f"Producto: {producto.nombre_pro}")
            except Producto.DoesNotExist:
                filtros_detalle.append(f"Producto ID: {producto_id}")
        if estado:
            estado_display = ESTADOS_DICT.get(estado, estado)
            filtros_detalle.append(f"Estado: {estado_display}")
        if proveedor_id:
            try:
                proveedor = Proveedor.objects.get(id_proveedor=proveedor_id)
                filtros_detalle.append(f"Proveedor: {proveedor.nombre}")
            except Proveedor.DoesNotExist:
                filtros_detalle.append(f"Proveedor ID: {proveedor_id}")
        if fecha_recibimiento_desde and fecha_recibimiento_hasta:
            filtros_detalle.append(f"Recibimiento: {fecha_recibimiento_desde} a {fecha_recibimiento_hasta}")
        elif fecha_recibimiento_desde:
            filtros_detalle.append(f"Recibimiento desde: {fecha_recibimiento_desde}")
        elif fecha_recibimiento_hasta:
            filtros_detalle.append(f"Recibimiento hasta: {fecha_recibimiento_hasta}")
        if fecha_vencimiento_desde and fecha_vencimiento_hasta:
            filtros_detalle.append(f"Vencimiento: {fecha_vencimiento_desde} a {fecha_vencimiento_hasta}")
        elif fecha_vencimiento_desde:
            filtros_detalle.append(f"Vencimiento desde: {fecha_vencimiento_desde}")
        elif fecha_vencimiento_hasta:
            filtros_detalle.append(f"Vencimiento hasta: {fecha_vencimiento_hasta}")
        
        if filtros_detalle:
            filtros_info = "Lotes Filtrados - " + ", ".join(filtros_detalle)
        
        p.drawString(1*inch, height-1.6*inch, f"{filtros_info} - {fecha_actual}")
        
        # Línea separadora
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
        
        # Configurar posición inicial para la tabla
        y_position = height - 2.2*inch
        line_height = 0.2*inch
        
        # Encabezados de tabla (SIN ID)
        p.setFont("Helvetica-Bold", 7)
        p.drawString(0.5*inch, y_position, "CÓDIGO")
        p.drawString(1.3*inch, y_position, "PRODUCTO")
        p.drawString(2.8*inch, y_position, "PROVEEDOR")
        p.drawString(4.0*inch, y_position, "C.UNIT")
        p.drawString(4.7*inch, y_position, "C.TOTAL")
        p.drawString(5.4*inch, y_position, "CANT.")
        p.drawString(5.9*inch, y_position, "DISP.")
        p.drawString(6.4*inch, y_position, "F.REC.")
        p.drawString(7.0*inch, y_position, "F.VENC.")
        p.drawString(7.6*inch, y_position, "ESTADO")
        
        y_position -= line_height
        p.line(0.5*inch, y_position, 8.0*inch, y_position)
        y_position -= 0.1*inch
        
        # Datos de lotes
        p.setFont("Helvetica", 6)
        
        for lote in lotes:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                p.setFont("Helvetica", 6)
                
                # Encabezados en nueva página (SIN ID)
                p.setFont("Helvetica-Bold", 7)
                p.drawString(0.5*inch, y_position, "CÓDIGO")
                p.drawString(1.3*inch, y_position, "PRODUCTO")
                p.drawString(2.8*inch, y_position, "PROVEEDOR")
                p.drawString(4.0*inch, y_position, "C.UNIT")
                p.drawString(4.7*inch, y_position, "C.TOTAL")
                p.drawString(5.4*inch, y_position, "CANT.")
                p.drawString(5.9*inch, y_position, "DISP.")
                p.drawString(6.4*inch, y_position, "F.REC.")
                p.drawString(7.0*inch, y_position, "F.VENC.")
                p.drawString(7.6*inch, y_position, "ESTADO")
                
                y_position -= line_height
                p.line(0.5*inch, y_position, 8.0*inch, y_position)
                y_position -= 0.1*inch
                p.setFont("Helvetica", 6)
            
            # Truncar nombres largos
            producto_nombre = lote.id_producto.nombre_pro
            if len(producto_nombre) > 18:
                producto_nombre = producto_nombre[:15] + "..."
            
            proveedor_nombre = lote.proveedor.nombre
            if len(proveedor_nombre) > 14:
                proveedor_nombre = proveedor_nombre[:11] + "..."
            
            # Formatear fechas
            fecha_recibimiento = lote.fecha_recibimiento.strftime("%d/%m/%y")
            fecha_vencimiento = lote.fecha_vencimiento.strftime("%d/%m/%y")
            
            # Dibujar datos (SIN ID)
            p.drawString(0.5*inch, y_position, lote.codigo_lote)
            p.drawString(1.3*inch, y_position, producto_nombre)
            p.drawString(2.8*inch, y_position, proveedor_nombre)
            p.drawString(4.0*inch, y_position, f"${lote.costo_unitario}")
            p.drawString(4.7*inch, y_position, f"${lote.costo_total}")
            p.drawString(5.4*inch, y_position, str(lote.cantidad))
            p.drawString(5.9*inch, y_position, str(lote.cantidad_disponible))
            p.drawString(6.4*inch, y_position, fecha_recibimiento)
            p.drawString(7.0*inch, y_position, fecha_vencimiento)
            p.drawString(7.6*inch, y_position, lote.get_estado_display())
            
            y_position -= line_height
        
        # Totales
        p.setFont("Helvetica-Bold", 10)
        y_position -= 0.3*inch
        p.drawString(0.5*inch, y_position, f"Total de lotes: {lotes.count()}")
        
        # Información adicional sobre filtros
        if filtros_detalle:
            y_position -= 0.2*inch
            p.setFont("Helvetica-Oblique", 8)
            p.drawString(0.5*inch, y_position, f"Filtros aplicados: {', '.join(filtros_detalle)}")
        
        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawString(0.5*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
        
        # Finalizar PDF
        p.showPage()
        p.save()
        
        return response
        
    except Exception as e:
        # Log del error para debugging
        logger.error(f"Error al generar PDF: {str(e)}")
        
        # Crear PDF de error
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="error.pdf"'
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-2*inch, "Error al generar el PDF")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-2.5*inch, "Ocurrió un error inesperado al generar el listado.")
        p.drawString(1*inch, height-3*inch, "Por favor, intente nuevamente.")
        
        p.showPage()
        p.save()
        
        return response