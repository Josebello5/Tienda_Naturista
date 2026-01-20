from django.shortcuts import render, redirect
from django.utils.formats import number_format
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import ProductoForm
from .models import Producto, Categoria, Patologia, Ubicacion
from django.http import HttpResponse, JsonResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from datetime import datetime
from django.db.models import Sum, Q, Count, OuterRef, Subquery, IntegerField
from django.db.models.functions import Coalesce
from lotes.models import Lote
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
import json
from decimal import Decimal
from django.shortcuts import get_object_or_404
import re  
import logging
from django.urls import reverse
from usuarios.utils import can_manage_products, can_print_reports
from django.template.loader import render_to_string
from django.conf import settings
import os

# Helper function to generate proper Content-Disposition header
def get_pdf_content_disposition(filename):
    """
    Genera un header Content-Disposition compatible con RFC 5987
    para asegurar que los nombres de archivo se muestren correctamente
    """
    from urllib.parse import quote
    # Usar tanto filename como filename* para máxima compatibilidad
    return f'inline; filename="{filename}"; filename*=UTF-8\'\'{quote(filename)}'



# Configurar logger
logger = logging.getLogger(__name__)

def menu_productos(request):
    """
    Vista para mostrar el listado de productos con búsqueda
    """
    query = request.GET.get('q', '')
    categoria_nombre = request.GET.get('categoria', '')
    patologia_nombre = request.GET.get('patologia', '')
    estado = request.GET.get('estado', '')
    sujeto_iva = request.GET.get('sujeto_iva', '')
    serial = request.GET.get('serial', '')  # Nuevo filtro por serial
    
    # Verificar permisos del usuario
    puede_gestionar = can_manage_products(request.user)
    puede_imprimir = can_print_reports(request.user)
    
    # Obtener productos con stock actual calculado (suma de cantidad_disponible de lotes activos)
    productos_con_stock = Producto.objects.annotate(
        stock_actual=Sum(
            'lote__cantidad_disponible',
            filter=Q(lote__estado='activo')
        )
    ).order_by('nombre_pro')
    
    # Actualizar estados automáticamente basado en stock - CORREGIDO
    for producto in productos_con_stock:
        stock_actual = producto.stock_actual or 0
        if producto.estado != 'inactivo':  # Solo actualizar si no está inactivo manualmente
            estado_original = producto.estado
            producto.actualizar_estado_por_stock(stock_actual)
            if producto.estado != estado_original:
                # SOLUCIÓN: Usar update() para evitar validaciones
                try:
                    Producto.objects.filter(ID_producto=producto.ID_producto).update(estado=producto.estado)
                except Exception as e:
                    logger.error(f"Error al actualizar estado del producto {producto.ID_producto}: {str(e)}")
                    continue
    
    # Aplicar filtros
    if query:
        productos_con_stock = productos_con_stock.filter(nombre_pro__icontains=query)
    if categoria_nombre:
        productos_con_stock = productos_con_stock.filter(categoria__nombre__icontains=categoria_nombre)
    if patologia_nombre:
        productos_con_stock = productos_con_stock.filter(patologia__nombre__icontains=patologia_nombre)
    if estado:
        productos_con_stock = productos_con_stock.filter(estado=estado)
    if sujeto_iva:
        productos_con_stock = productos_con_stock.filter(sujeto_iva=sujeto_iva)
    if serial:  # Nuevo filtro por serial
        productos_con_stock = productos_con_stock.filter(serial__icontains=serial)
    
    # Obtener categorías para el filtro
    categorias_list = Categoria.objects.all()
    
    # Si es una petición AJAX, devolvemos JSON
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        productos_data = []
        for producto in productos_con_stock:
            productos_data.append({
                'id': producto.ID_producto,
                'serial': producto.serial,
                'nombre': producto.nombre_pro,
                'categoria': producto.categoria.nombre if producto.categoria else '',
                'patologia': producto.patologia.nombre if producto.patologia else '',
                'ubicacion': producto.ubicacion or '',
                'sujeto_iva': 'Sí' if producto.sujeto_iva == 'si' else 'No',
                'precio': f"${number_format(producto.precio_venta, decimal_pos=2, force_grouping=True)}",
                'stock_minimo': producto.stock_minimo,
                'stock_actual': producto.stock_actual or 0,
                'estado': producto.get_estado_display(),
                'estado_valor': producto.estado,
            })
        return JsonResponse({'productos': productos_data})
    
    # Verificar si viene de acciones exitosas
    registro_exitoso = request.GET.get('registro_exitoso')
    edicion_exitosa = request.GET.get('edicion_exitosa')
    nombre_producto = request.GET.get('nombre_producto', '')
    
    return render(request, 'productos/menu_productos.html', {
        'productos': productos_con_stock,
        'query': query,
        'categoria_filtro': categoria_nombre,
        'patologia_filtro': patologia_nombre,
        'estado_filtro': estado,
        'sujeto_iva_filtro': sujeto_iva,
        'serial_filtro': serial,
        'categorias_list': categorias_list,
        'registro_exitoso': registro_exitoso,
        'edicion_exitosa': edicion_exitosa,
        'nombre_producto': nombre_producto,
        'puede_gestionar': puede_gestionar,
        'puede_imprimir': puede_imprimir,
    })

def registrar_producto(request):
    """
    Vista para registrar nuevos productos
    Los productos se crean con estado 'activo' por defecto
    """
    # Obtener categorías, patologías y ubicaciones para las sugerencias
    categorias = Categoria.objects.all().values_list('nombre', flat=True)
    patologias = Patologia.objects.all().values_list('nombre', flat=True)
    ubicaciones = Ubicacion.objects.all().values_list('nombre', flat=True)
    
    if request.method == 'POST':
        form = ProductoForm(request.POST)
        if form.is_valid():
            try:
                producto = form.save()
                # En lugar de messages.success, pasamos parámetro en la URL para el modal
                return redirect(f"{reverse('productos:menu_productos')}?registro_exitoso=true&nombre_producto={producto.nombre_pro}")
            except Exception as e:
                messages.error(request, f'No se pudo registrar el producto. Error: {str(e)}')
        else:
            # Mostrar errores específicos del formulario
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{field}: {error}')
    else:
        form = ProductoForm()

    return render(request, 'productos/registro_producto.html', {
        'form': form,
        'categorias': list(categorias),
        'patologias': list(patologias),
        'ubicaciones': list(ubicaciones)
    })

@csrf_exempt
@require_POST
def actualizar_precio_producto(request, id_producto):
    try:
        data = json.loads(request.body)
        nuevo_precio = data.get('precio_venta')
        
        if not nuevo_precio:
            return JsonResponse({'success': False, 'error': 'El precio de venta es requerido'})
        
        # Convertir a Decimal para manejar correctamente los decimales
        nuevo_precio = Decimal(str(nuevo_precio))
        
        producto = Producto.objects.get(ID_producto=id_producto)
        producto.precio_venta = nuevo_precio
        producto.save()
        
        return JsonResponse({
            'success': True, 
            'precio_venta': number_format(producto.precio_venta, decimal_pos=2, force_grouping=True)
        })
        
    except Producto.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Producto no encontrado'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def cambiar_estado_producto(request, id_producto):
    try:
        producto = Producto.objects.get(ID_producto=id_producto)
        
        # Calcular el stock actual del producto
        stock_actual = producto.lote_set.filter(estado='activo').aggregate(
            total=Sum('cantidad_disponible')
        )['total'] or 0
        
        # Lógica de cambio de estado:
        # - Si está INACTIVO → intentar activar (activo si hay stock, agotado si no)
        # - Si está ACTIVO o AGOTADO → cambiar a INACTIVO
        
        if producto.estado == 'inactivo':
            # Intentar activar desde inactivo
            if stock_actual > 0:
                nuevo_estado = 'activo'
            else:
                nuevo_estado = 'agotado'
        else:
            # Desde activo o agotado → siempre ir a inactivo
            nuevo_estado = 'inactivo'
        
        producto.estado = nuevo_estado
        producto.save()
        
        return JsonResponse({
            'success': True, 
            'nuevo_estado': producto.estado,
            'nuevo_estado_display': producto.get_estado_display(),
            'stock_actual': stock_actual  # Enviar el stock para información
        })
            
    except Producto.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Producto no encontrado'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

def editar_producto(request, id):
    """
    Vista para editar productos existentes - CORREGIDA
    """
    producto = get_object_or_404(Producto, ID_producto=id)
    
    # Obtener categorías, patologías y ubicaciones para las sugerencias
    categorias = Categoria.objects.all().values_list('nombre', flat=True)
    patologias = Patologia.objects.all().values_list('nombre', flat=True)
    ubicaciones = Ubicacion.objects.all().values_list('nombre', flat=True)
    
    if request.method == 'POST':
        form = ProductoForm(request.POST, instance=producto)
        if form.is_valid():
            try:
                producto_editado = form.save()
                # Redirigir con parámetro de éxito - CORREGIDO
                return redirect(f"{reverse('productos:menu_productos')}?edicion_exitosa=true&nombre_producto={producto_editado.nombre_pro}")
            except Exception as e:
                messages.error(request, f'No se pudo actualizar el producto. Error: {str(e)}')
        else:
            # Mostrar errores específicos del formulario
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{field}: {error}')
    else:
        # CORRECCIÓN: Asegurarse de que el formulario se inicializa con todos los datos del producto
        form = ProductoForm(instance=producto)

    return render(request, 'productos/editar_producto.html', {
        'form': form,
        'producto': producto,
        'categorias': list(categorias),
        'patologias': list(patologias),
        'ubicaciones': list(ubicaciones)
    })

def generar_pdf_productos(request):
    """
    Genera un PDF con el listado de productos aplicando los filtros
    """
    try:
        # Obtener parámetros de filtro de la URL
        query = request.GET.get('q', '')
        categoria_nombre = request.GET.get('categoria', '')
        patologia_nombre = request.GET.get('patologia', '')
        estado = request.GET.get('estado', '')
        sujeto_iva = request.GET.get('sujeto_iva', '')
        serial = request.GET.get('serial', '')  # Nuevo filtro por serial
        
        # Obtener productos con stock actual calculado
        productos = Producto.objects.annotate(
            stock_actual=Sum(
                'lote__cantidad_disponible',
                filter=Q(lote__estado='activo')
            )
        ).select_related('categoria', 'patologia').order_by('nombre_pro')
        
        # Aplicar filtros
        if query:
            productos = productos.filter(nombre_pro__icontains=query)
        if categoria_nombre:
            productos = productos.filter(categoria__nombre__icontains=categoria_nombre)
        if patologia_nombre:
            productos = productos.filter(patologia__nombre__icontains=patologia_nombre)
        if estado:
            productos = productos.filter(estado=estado)
        if sujeto_iva:
            productos = productos.filter(sujeto_iva=sujeto_iva)
        if serial:  # Nuevo filtro por serial
            productos = productos.filter(serial__icontains=serial)
            


        # Diccionarios para las opciones
        SUJETO_IVA_DICT = {
            'si': 'Sujeto a IVA',
            'no': 'Exento de IVA'
        }
        
        ESTADOS_DICT = {
            'activo': 'Activo',
            'inactivo': 'Inactivo',
            'agotado': 'Agotado'
        }

        # Verificar si hay productos después de aplicar filtros
        if not productos.exists():
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = get_pdf_content_disposition('sin_productos.pdf')
            
            p = canvas.Canvas(response, pagesize=letter)
            width, height = letter
            
            # Configuración inicial
            p.setTitle("Listado de Productos - Tienda Naturista")
            
            # Encabezado
            p.setFont("Helvetica-Bold", 16)
            p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
            
            p.setFont("Helvetica", 12)
            p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
            
            p.setFont("Helvetica", 10)
            fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
            p.drawString(1*inch, height-1.6*inch, f"Listado de Productos - {fecha_actual}")
            
            # Línea separadora
            p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
            
            # Mensaje de no productos
            p.setFont("Helvetica-Bold", 14)
            p.drawString(2*inch, height-3*inch, "No hay productos con los filtros aplicados")
            
            p.setFont("Helvetica", 12)
            p.drawString(1.5*inch, height-3.5*inch, "Por favor, ajuste los criterios de búsqueda e intente nuevamente.")
            
            # Información de filtros aplicados
            filtros_info = "Filtros aplicados: "
            filtros = []
            if query:
                filtros.append(f"Búsqueda: '{query}'")
            if categoria_nombre:
                filtros.append(f"Categoría: {categoria_nombre}")
            if patologia_nombre:
                filtros.append(f"Patología: {patologia_nombre}")
            if estado:
                estado_display = ESTADOS_DICT.get(estado, estado)
                filtros.append(f"Estado: {estado_display}")
            if sujeto_iva:
                sujeto_iva_display = SUJETO_IVA_DICT.get(sujeto_iva, sujeto_iva)
                filtros.append(f"Sujeto a IVA: {sujeto_iva_display}")
            if serial:  # Nuevo filtro por serial
                filtros.append(f"Serial: {serial}")
            
            if filtros:
                filtros_info += ", ".join(filtros)
                p.setFont("Helvetica", 10)
                p.drawString(1*inch, height-4*inch, filtros_info)
            
            # Pie de página
            p.setFont("Helvetica-Oblique", 8)
            p.drawString(1*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
            
            p.showPage()
            p.save()
            
            return response
        
        # Crear respuesta HTTP para productos encontrados
        response = HttpResponse(content_type='application/pdf')
        
        # PROCESAMIENTO MANUAL DE SERIALES LARGOS - Moved here after exists() check
        productos_list = []
        for p in productos:
            s = p.serial
            p.serial_display = " ".join([s[i:i+10] for i in range(0, len(s), 10)])
            productos_list.append(p)
        productos = productos_list
        
        # Nombre del archivo con filtros aplicados
        filename_parts = ["listado_productos"]
        if query:
            # Limpiar query para nombre de archivo
            clean_query = re.sub(r'[^\w\s-]', '', query)
            clean_query = re.sub(r'[-\s]+', '_', clean_query)
            filename_parts.append(clean_query[:20])
        if categoria_nombre:
            clean_categoria = re.sub(r'[^\w\s-]', '', categoria_nombre)
            clean_categoria = re.sub(r'[-\s]+', '_', clean_categoria)
            filename_parts.append(f"categoria_{clean_categoria}"[:20])
        if patologia_nombre:
            clean_patologia = re.sub(r'[^\w\s-]', '', patologia_nombre)
            clean_patologia = re.sub(r'[-\s]+', '_', clean_patologia)
            filename_parts.append(f"patologia_{clean_patologia}"[:20])
        if estado:
            filename_parts.append(estado)
        if sujeto_iva:
            filename_parts.append("con_iva" if sujeto_iva == 'si' else "sin_iva")
        if serial:  # Nuevo filtro por serial
            clean_serial = re.sub(r'[^\w\s-]', '', serial)
            clean_serial = re.sub(r'[-\s]+', '_', clean_serial)
            filename_parts.append(f"serial_{clean_serial}"[:20])
        
        filename = "_".join(filename_parts) + ".pdf"
        response['Content-Disposition'] = get_pdf_content_disposition(filename)
        
        # Información de filtros aplicados
        filtros_info = None
        if query or categoria_nombre or patologia_nombre or estado or sujeto_iva or serial:
            filtros = []
            if query:
                filtros.append(f"Búsqueda: '{query}'")
            if categoria_nombre:
                filtros.append(f"Categoría: {categoria_nombre}")
            if patologia_nombre:
                filtros.append(f"Patología: {patologia_nombre}")
            if estado:
                estado_display = ESTADOS_DICT.get(estado, estado)
                filtros.append(f"Estado: {estado_display}")
            if sujeto_iva:
                sujeto_iva_display = SUJETO_IVA_DICT.get(sujeto_iva, sujeto_iva)
                filtros.append(f"Sujeto a IVA: {sujeto_iva_display}")
            if serial:
                filtros.append(f"Serial: {serial}")
            filtros_info = "Filtros: " + ", ".join(filtros)
        
        # Obtener url del logo 
        logo_url = os.path.join(settings.BASE_DIR, 'usuarios', 'static', 'usuarios', 'img', 'logo_redondo_sin_fondo.png')
        
        context = {
            'productos': productos,
            'fecha_generacion': datetime.now(),
            'filtros_info': filtros_info,
            'logo_url': logo_url,
        }
        
        # Renderizar template a string
        html_string = render_to_string('productos/reporte_pdf.html', context)
        
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
        logger.error(f"Error al generar PDF de productos: {str(e)}")
        return HttpResponse(f"Error al generar PDF: {str(e)}", status=500)
    
def lista_categorias_json(request):
    """Devuelve lista de categorías en formato JSON"""
    categorias = Categoria.objects.all().order_by('id')
    categorias_data = []
    for categoria in categorias:
        categorias_data.append({
            'id': categoria.id,
            'nombre': categoria.nombre,
            'fecha_creacion': categoria.fecha_creacion.strftime('%d/%m/%Y %H:%M')
        })
    return JsonResponse(categorias_data, safe=False)

@csrf_exempt
@require_POST
def editar_categoria(request, id=None):
    """Crear o editar categoría"""
    try:
        data = json.loads(request.body)
        nombre = data.get('nombre', '').strip().upper()
        
        if not nombre:
            return JsonResponse({'success': False, 'error': 'El nombre de la categoría es obligatorio.'})
        
        # Validar que solo contenga letras
        if not re.match(r'^[A-Z]+$', nombre):
            return JsonResponse({'success': False, 'error': 'La categoría solo debe contener letras.'})
        
        # Validar longitud máxima
        if len(nombre) > 20:
            return JsonResponse({'success': False, 'error': 'La categoría no puede tener más de 20 caracteres.'})
        
        if id:
            # Editar categoría existente
            categoria = Categoria.objects.get(id=id)
            # Verificar si el nombre ya existe (excluyendo la actual)
            if Categoria.objects.filter(nombre=nombre).exclude(id=id).exists():
                return JsonResponse({'success': False, 'error': 'Ya existe una categoría con ese nombre.'})
            categoria.nombre = nombre
            categoria.save()
            return JsonResponse({'success': True, 'message': '¡Categoría actualizada correctamente!'})
        else:
            # Crear nueva categoría
            if Categoria.objects.filter(nombre=nombre).exists():
                return JsonResponse({'success': False, 'error': 'Ya existe una categoría con ese nombre.'})
            categoria = Categoria(nombre=nombre)
            categoria.save()
            return JsonResponse({'success': True, 'message': '¡Categoría creada correctamente!'})
            
    except Categoria.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Categoría no encontrada.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def eliminar_categoria(request, id):
    """Eliminar categoría"""
    try:
        categoria = Categoria.objects.get(id=id)
        nombre_categoria = categoria.nombre
        
        # Verificar si hay productos asociados a esta categoría
        if Producto.objects.filter(categoria=categoria).exists():
            return JsonResponse({
                'success': False, 
                'error': 'No se puede eliminar la categoría porque tiene productos asociados.'
            })
        
        categoria.delete()
        return JsonResponse({'success': True, 'message': f'¡Categoría "{nombre_categoria}" eliminada correctamente!'})
        
    except Categoria.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Categoría no encontrada.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

def imprimir_categorias(request):
    """Generar PDF con listado de categorías"""
    try:
        categorias = Categoria.objects.annotate(num_productos=Count('producto')).order_by('nombre')
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = get_pdf_content_disposition('listado_categorias.pdf')
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # Configuración inicial
        p.setTitle("Listado de Categorías - Tienda Naturista")
        
        # Encabezado
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        
        p.setFont("Helvetica", 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        p.drawString(1*inch, height-1.6*inch, f"Listado de Categorías - {fecha_actual}")
        
        # Línea separadora
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
        
        # Configurar posición inicial para la tabla
        y_position = height - 2.2*inch
        line_height = 0.25*inch
        
        # Encabezados de tabla
        p.setFont("Helvetica-Bold", 10)
        p.drawString(1*inch, y_position, "NOMBRE")
        p.drawString(4*inch, y_position, "N° PRODUCTOS")
        p.drawString(6*inch, y_position, "FECHA CREACIÓN")
        
        y_position -= line_height
        p.line(0.5*inch, y_position, 8*inch, y_position)
        y_position -= 0.25*inch
        
        # Datos de categorías
        p.setFont("Helvetica", 9)
        
        for categoria in categorias:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                
                # Encabezados en nueva página
                p.setFont("Helvetica-Bold", 10)
                p.drawString(1*inch, y_position, "NOMBRE")
                p.drawString(4*inch, y_position, "N° PRODUCTOS")
                p.drawString(6*inch, y_position, "FECHA CREACIÓN")
                
                y_position -= line_height
                p.line(0.5*inch, y_position, 8*inch, y_position)
                y_position -= 0.25*inch
                p.setFont("Helvetica", 9)
            
            p.drawString(1*inch, y_position, categoria.nombre)
            p.drawString(4*inch, y_position, str(categoria.num_productos))
            p.drawString(6*inch, y_position, categoria.fecha_creacion.strftime('%d/%m/%Y %H:%M'))
            
            y_position -= line_height
        
        # Total
        p.setFont("Helvetica-Bold", 10)
        y_position -= 0.3*inch
        p.drawString(1*inch, y_position, f"Total de categorías: {categorias.count()}")
        
        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawString(1*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
        
        p.showPage()
        p.save()
        
        return response
        
    except Exception as e:
        logger.error(f"Error al generar PDF de categorías: {str(e)}")
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = get_pdf_content_disposition('error.pdf')
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-2*inch, "Error al generar el PDF")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-2.5*inch, "Ocurrió un error inesperado al generar el listado.")
        
        p.showPage()
        p.save()
        
        return response

# ===== VISTAS PARA PATOLOGÍAS =====

def lista_patologias_json(request):
    """Devuelve lista de patologías en formato JSON"""
    patologias = Patologia.objects.all().order_by('id')
    patologias_data = []
    for patologia in patologias:
        patologias_data.append({
            'id': patologia.id,
            'nombre': patologia.nombre,
            'fecha_creacion': patologia.fecha_creacion.strftime('%d/%m/%Y %H:%M')
        })
    return JsonResponse(patologias_data, safe=False)

@csrf_exempt
@require_POST
def editar_patologia(request, id=None):
    """Crear o editar patología"""
    try:
        data = json.loads(request.body)
        nombre = data.get('nombre', '').strip().upper()
        
        if not nombre:
            return JsonResponse({'success': False, 'error': 'El nombre de la patología es obligatorio.'})
        
        # Validar que solo contenga letras
        if not re.match(r'^[A-Z]+$', nombre):
            return JsonResponse({'success': False, 'error': 'La patología solo debe contener letras.'})
        
        # Validar longitud máxima
        if len(nombre) > 20:
            return JsonResponse({'success': False, 'error': 'La patología no puede tener más de 20 caracteres.'})
        
        if id:
            # Editar patología existente
            patologia = Patologia.objects.get(id=id)
            # Verificar si el nombre ya existe (excluyendo la actual)
            if Patologia.objects.filter(nombre=nombre).exclude(id=id).exists():
                return JsonResponse({'success': False, 'error': 'Ya existe una patología con ese nombre.'})
            patologia.nombre = nombre
            patologia.save()
            return JsonResponse({'success': True, 'message': '¡Patología actualizada correctamente!'})
        else:
            # Crear nueva patología
            if Patologia.objects.filter(nombre=nombre).exists():
                return JsonResponse({'success': False, 'error': 'Ya existe una patología con ese nombre.'})
            patologia = Patologia(nombre=nombre)
            patologia.save()
            return JsonResponse({'success': True, 'message': '¡Patología creada correctamente!'})
            
    except Patologia.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Patología no encontrada.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def eliminar_patologia(request, id):
    """Eliminar patología"""
    try:
        patologia = Patologia.objects.get(id=id)
        nombre_patologia = patologia.nombre
        
        # Verificar si hay productos asociados a esta patología
        if Producto.objects.filter(patologia=patologia).exists():
            return JsonResponse({
                'success': False, 
                'error': 'No se puede eliminar la patología porque tiene productos asociados.'
            })
        
        patologia.delete()
        return JsonResponse({'success': True, 'message': f'¡Patología "{nombre_patologia}" eliminada correctamente!'})
        
    except Patologia.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Patología no encontrada.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

def imprimir_patologias(request):
    """Generar PDF con listado de patologías"""
    try:
        patologias = Patologia.objects.annotate(num_productos=Count('producto')).order_by('nombre')
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = get_pdf_content_disposition('listado_patologias.pdf')
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # Configuración inicial
        p.setTitle("Listado de Patologías - Tienda Naturista")
        
        # Encabezado
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        
        p.setFont("Helvetica", 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        p.drawString(1*inch, height-1.6*inch, f"Listado de Patologías - {fecha_actual}")
        
        # Línea separadora
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
        
        # Configurar posición inicial para la tabla
        y_position = height - 2.2*inch
        line_height = 0.25*inch
        
        # Encabezados de tabla
        p.setFont("Helvetica-Bold", 10)
        p.drawString(1*inch, y_position, "NOMBRE")
        p.drawString(4*inch, y_position, "N° PRODUCTOS")
        p.drawString(6*inch, y_position, "FECHA CREACIÓN")
        
        y_position -= line_height
        p.line(0.5*inch, y_position, 8*inch, y_position)
        y_position -= 0.25*inch
        
        # Datos de patologías
        p.setFont("Helvetica", 9)
        
        for patologia in patologias:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                
                # Encabezados en nueva página
                p.setFont("Helvetica-Bold", 10)
                p.drawString(1*inch, y_position, "NOMBRE")
                p.drawString(4*inch, y_position, "N° PRODUCTOS")
                p.drawString(6*inch, y_position, "FECHA CREACIÓN")
                
                y_position -= line_height
                p.line(0.5*inch, y_position, 8*inch, y_position)
                y_position -= 0.25*inch
                p.setFont("Helvetica", 9)
            
            p.drawString(1*inch, y_position, patologia.nombre)
            p.drawString(4*inch, y_position, str(patologia.num_productos))
            p.drawString(6*inch, y_position, patologia.fecha_creacion.strftime('%d/%m/%Y %H:%M'))
            
            y_position -= line_height
        
        # Total
        p.setFont("Helvetica-Bold", 10)
        y_position -= 0.3*inch
        p.drawString(1*inch, y_position, f"Total de patologías: {patologias.count()}")
        
        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawString(1*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
        
        p.showPage()
        p.save()
        
        return response
        
    except Exception as e:
        logger.error(f"Error al generar PDF de patologías: {str(e)}")
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = get_pdf_content_disposition('error.pdf')
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-2*inch, "Error al generar el PDF")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-2.5*inch, "Ocurrió un error inesperado al generar el listado.")
        
        p.showPage()
        p.save()
        
        return response


# ===== VISTAS PARA UBICACIONES =====

def lista_ubicaciones_json(request):
    """Devuelve lista de ubicaciones en formato JSON"""
    ubicaciones = Ubicacion.objects.all().order_by('nombre')
    ubicaciones_data = []
    for ubicacion in ubicaciones:
        ubicaciones_data.append({
            'id': ubicacion.id,
            'nombre': ubicacion.nombre,
            'fecha_creacion': ubicacion.fecha_creacion.strftime('%d/%m/%Y %H:%M')
        })
    return JsonResponse(ubicaciones_data, safe=False)

@csrf_exempt
@require_POST
def editar_ubicacion(request, id=None):
    """Crear o editar ubicación"""
    try:
        data = json.loads(request.body)
        nombre = data.get('nombre', '').strip().upper()
        
        if not nombre:
            return JsonResponse({'success': False, 'error': 'El nombre de la ubicación es obligatorio.'})
        
        # Validar que solo contenga letras, números, espacios y guiones
        if not re.match(r'^[A-Z0-9\s\-]+$', nombre):
            return JsonResponse({'success': False, 'error': 'La ubicación solo puede contener letras, números, espacios y guiones.'})
        
        # Validar longitud máxima
        if len(nombre) > 50:
            return JsonResponse({'success': False, 'error': 'La ubicación no puede tener más de 50 caracteres.'})
        
        if id:
            # Editar ubicación existente
            ubicacion = Ubicacion.objects.get(id=id)
            # Verificar si el nombre ya existe (excluyendo la actual)
            if Ubicacion.objects.filter(nombre=nombre).exclude(id=id).exists():
                return JsonResponse({'success': False, 'error': 'Ya existe una ubicación con ese nombre.'})
            ubicacion.nombre = nombre
            ubicacion.save()
            return JsonResponse({'success': True, 'message': '¡Ubicación actualizada correctamente!'})
        else:
            # Crear nueva ubicación
            if Ubicacion.objects.filter(nombre=nombre).exists():
                return JsonResponse({'success': False, 'error': 'Ya existe una ubicación con ese nombre.'})
            ubicacion = Ubicacion(nombre=nombre)
            ubicacion.save()
            return JsonResponse({'success': True, 'message': '¡Ubicación creada correctamente!'})
            
    except Ubicacion.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Ubicación no encontrada.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def eliminar_ubicacion(request, id):
    """Eliminar ubicación"""
    try:
        ubicacion = Ubicacion.objects.get(id=id)
        nombre_ubicacion = ubicacion.nombre
        
        # Verificar si hay productos asociados a esta ubicación
        if Producto.objects.filter(ubicacion=nombre_ubicacion).exists():
            return JsonResponse({
                'success': False, 
                'error': 'No se puede eliminar la ubicación porque tiene productos asociados.'
            })
        
        ubicacion.delete()
        return JsonResponse({'success': True, 'message': f'¡Ubicación "{nombre_ubicacion}" eliminada correctamente!'})
        
    except Ubicacion.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Ubicación no encontrada.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def lista_ubicaciones_json(request):
    """Devuelve listado de ubicaciones en JSON"""
    ubicaciones = Ubicacion.objects.all().order_by('nombre')
    data = [{
        'id': u.id,
        'nombre': u.nombre,
        'fecha_creacion': u.fecha_creacion.strftime('%d/%m/%Y')
    } for u in ubicaciones]
    return JsonResponse(data, safe=False)

def imprimir_ubicaciones(request):
    """Generar PDF con listado de ubicaciones"""
    try:
        # Subquery para contar productos por ubicación (ya que la relación es por nombre)
        productos_por_ubicacion = Producto.objects.filter(
            ubicacion=OuterRef('nombre')
        ).values('ubicacion').annotate(
            count=Count('ID_producto')
        ).values('count')
        
        ubicaciones = Ubicacion.objects.annotate(
            num_productos=Coalesce(Subquery(productos_por_ubicacion, output_field=IntegerField()), 0)
        ).order_by('nombre')
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = get_pdf_content_disposition('listado_ubicaciones.pdf')
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # Configuración inicial
        p.setTitle("Listado de Ubicaciones - Tienda Naturista")
        
        # Encabezado
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        
        p.setFont("Helvetica", 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        p.drawString(1*inch, height-1.6*inch, f"Listado de Ubicaciones - {fecha_actual}")
        
        # Línea separadora
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
        
        # Configurar posición inicial para la tabla
        y_position = height - 2.2*inch
        line_height = 0.25*inch
        
        # Encabezados de tabla
        p.setFont("Helvetica-Bold", 10)
        p.drawString(1*inch, y_position, "NOMBRE")
        p.drawString(4*inch, y_position, "N° PRODUCTOS")
        p.drawString(6*inch, y_position, "FECHA CREACIÓN")
        
        y_position -= line_height
        p.line(0.5*inch, y_position, 8*inch, y_position)
        y_position -= 0.25*inch
        
        # Datos de ubicaciones
        p.setFont("Helvetica", 9)
        
        for ubicacion in ubicaciones:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                
                # Encabezados en nueva página
                p.setFont("Helvetica-Bold", 10)
                p.drawString(1*inch, y_position, "NOMBRE")
                p.drawString(4*inch, y_position, "N° PRODUCTOS")
                p.drawString(6*inch, y_position, "FECHA CREACIÓN")
                
                y_position -= line_height
                p.line(0.5*inch, y_position, 8*inch, y_position)
                y_position -= 0.25*inch
                p.setFont("Helvetica", 9)
            
            p.drawString(1*inch, y_position, ubicacion.nombre)
            p.drawString(4*inch, y_position, str(ubicacion.num_productos))
            p.drawString(6*inch, y_position, ubicacion.fecha_creacion.strftime('%d/%m/%Y %H:%M'))
            
            y_position -= line_height
        
        # Total
        p.setFont("Helvetica-Bold", 10)
        y_position -= 0.3*inch
        p.drawString(1*inch, y_position, f"Total de ubicaciones: {ubicaciones.count()}")
        
        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawString(1*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
        
        p.showPage()
        p.save()
        
        return response
        
    except Exception as e:
        logger.error(f"Error al generar PDF de ubicaciones: {str(e)}")
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = get_pdf_content_disposition('error.pdf')
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-2*inch, "Error al generar el PDF")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-2.5*inch, "Ocurrió un error inesperado al generar el listado.")
        
        p.showPage()
        p.save()
        
        return response
