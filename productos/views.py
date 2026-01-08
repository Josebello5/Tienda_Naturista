from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import ProductoForm
from .models import Producto, Categoria, Patologia, Ubicacion
from django.http import HttpResponse, JsonResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from datetime import datetime
from django.db.models import Sum, Q
from lotes.models import Lote
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
import json
from decimal import Decimal
from django.shortcuts import get_object_or_404
import re  
import logging
from django.urls import reverse

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
                'precio': f"${producto.precio_venta}",
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
    })

def registrar_producto(request):
    """
    Vista para registrar nuevos productos
    Los productos se crean con estado 'activo' por defecto
    """
    # Obtener categorías y patologías para las sugerencias
    categorias = Categoria.objects.all().values_list('nombre', flat=True)
    patologias = Patologia.objects.all().values_list('nombre', flat=True)
    
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
        'patologias': list(patologias)
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
            'precio_venta': str(producto.precio_venta)
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
        
        # Solo permitir cambiar entre activo e inactivo manualmente
        # El estado 'agotado' se maneja automáticamente por stock
        if producto.estado == 'agotado':
            # Si está agotado, solo permitir activar manualmente
            nuevo_estado = 'activo'
        else:
            # Cambiar entre activo e inactivo
            nuevo_estado = 'inactivo' if producto.estado == 'activo' else 'activo'
        
        producto.estado = nuevo_estado
        producto.save()
        
        return JsonResponse({
            'success': True, 
            'nuevo_estado': producto.estado,
            'nuevo_estado_display': producto.get_estado_display()
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
    
    # Obtener categorías y patologías para las sugerencias
    categorias = Categoria.objects.all().values_list('nombre', flat=True)
    patologias = Patologia.objects.all().values_list('nombre', flat=True)
    
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
        'patologias': list(patologias)
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
        ).order_by('nombre_pro')
        
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
        
        # Crear el objeto PDF
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
        
        # Información de filtros aplicados
        filtros_info = "Listado Completo de Productos"
        if query or categoria_nombre or patologia_nombre or estado or sujeto_iva or serial:
            filtros_info = "Productos Filtrados - "
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
            filtros_info += ", ".join(filtros)
        
        p.drawString(1*inch, height-1.6*inch, f"{filtros_info} - {fecha_actual}")
        
        # Línea separadora
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
        
        # Configurar posición inicial para la tabla
        y_position = height - 2.2*inch
        line_height = 0.25*inch
        
        # Encabezados de tabla - Sin ID, centrados
        p.setFont("Helvetica-Bold", 7)
        p.drawCentredString(0.8*inch, y_position, "SERIAL")
        p.drawCentredString(1.85*inch, y_position, "NOMBRE")
        p.drawCentredString(3.0*inch, y_position, "CATEGORÍA")
        p.drawCentredString(4.0*inch, y_position, "PATOLOGÍA")
        p.drawCentredString(5.05*inch, y_position, "UBICACIÓN")
        p.drawCentredString(5.8*inch, y_position, "IVA")
        p.drawCentredString(6.3*inch, y_position, "PRECIO")
        p.drawCentredString(6.85*inch, y_position, "ST.MIN")
        p.drawCentredString(7.35*inch, y_position, "ST.ACT")
        p.drawCentredString(7.85*inch, y_position, "ESTADO")
        
        y_position -= line_height
        p.line(0.4*inch, y_position, 8.1*inch, y_position)
        y_position -= 0.1*inch
        
        # Datos de productos
        p.setFont("Helvetica", 6)
        
        for producto in productos:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                p.setFont("Helvetica", 6)
                
                # Encabezados en nueva página - Sin ID, centrados
                p.setFont("Helvetica-Bold", 7)
                p.drawCentredString(0.8*inch, y_position, "SERIAL")
                p.drawCentredString(1.85*inch, y_position, "NOMBRE")
                p.drawCentredString(3.0*inch, y_position, "CATEGORÍA")
                p.drawCentredString(4.0*inch, y_position, "PATOLOGÍA")
                p.drawCentredString(5.05*inch, y_position, "UBICACIÓN")
                p.drawCentredString(5.8*inch, y_position, "IVA")
                p.drawCentredString(6.3*inch, y_position, "PRECIO")
                p.drawCentredString(6.85*inch, y_position, "ST.MIN")
                p.drawCentredString(7.35*inch, y_position, "ST.ACT")
                p.drawCentredString(7.85*inch, y_position, "ESTADO")
                
                y_position -= line_height
                p.line(0.4*inch, y_position, 8.1*inch, y_position)
                y_position -= 0.1*inch
                p.setFont("Helvetica", 6)
            
            # Truncar nombres largos
            nombre = producto.nombre_pro
            if len(nombre) > 25:
                nombre = nombre[:22] + "..."
            
            # Serial completo - sin truncar
            serial_display = producto.serial
            
            categoria_display = producto.categoria.nombre if producto.categoria else ""
            # Mostrar completo - sin truncar
            
            patologia_display = producto.patologia.nombre if producto.patologia else ""
            # Mostrar completo - sin truncar
            
            ubicacion_display = producto.ubicacion or ""
            if len(ubicacion_display) > 12:
                ubicacion_display = ubicacion_display[:12] + "..."
            
            # Stock actual (puede ser None si no hay lotes activos)
            stock_actual = producto.stock_actual or 0
            
            # Datos centrados - Sin ID
            p.drawCentredString(0.8*inch, y_position, serial_display)
            p.drawCentredString(1.85*inch, y_position, nombre)
            p.drawCentredString(3.0*inch, y_position, categoria_display)
            p.drawCentredString(4.0*inch, y_position, patologia_display)
            p.drawCentredString(5.05*inch, y_position, ubicacion_display)
            p.drawCentredString(5.8*inch, y_position, "SI" if producto.sujeto_iva == 'si' else "NO")
            p.drawCentredString(6.3*inch, y_position, f"${producto.precio_venta}")
            p.drawCentredString(6.85*inch, y_position, str(producto.stock_minimo))
            p.drawCentredString(7.35*inch, y_position, str(stock_actual))
            
            # Estado con colores
            estado_display = producto.get_estado_display()
            if producto.estado == 'activo':
                p.setFillColorRGB(0, 0.5, 0)  # Verde
            elif producto.estado == 'inactivo':
                p.setFillColorRGB(0.8, 0, 0)  # Rojo
            else:  # agotado
                p.setFillColorRGB(0.9, 0.5, 0)  # Naranja
            
            p.drawCentredString(7.85*inch, y_position, estado_display)
            p.setFillColorRGB(0, 0, 0)  # Volver a negro
            
            y_position -= line_height
        
        # Totales
        p.setFont("Helvetica-Bold", 10)
        y_position -= 0.3*inch
        p.drawString(0.4*inch, y_position, f"Total de productos: {productos.count()}")
        
        # Información adicional sobre filtros
        if query or categoria_nombre or patologia_nombre or estado or sujeto_iva or serial:
            y_position -= 0.2*inch
            p.setFont("Helvetica-Oblique", 8)
            p.drawString(0.4*inch, y_position, f"Filtros aplicados: {filtros_info.replace('Productos Filtrados - ', '')}")
        
        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawString(0.4*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
        
        p.showPage()
        p.save()
        
        return response
        
    except Exception as e:
        logger.error(f"Error al generar PDF de productos: {str(e)}")
        
        # Crear PDF de error
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = get_pdf_content_disposition('error.pdf')
        
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
    
def lista_categorias_json(request):
    """Devuelve lista de categorías en formato JSON"""
    categorias = Categoria.objects.all().order_by('nombre')
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
        categorias = Categoria.objects.all().order_by('nombre')
        
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
        p.drawString(1*inch, y_position, "ID")
        p.drawString(1.5*inch, y_position, "NOMBRE")
        p.drawString(4*inch, y_position, "FECHA CREACIÓN")
        
        y_position -= line_height
        p.line(1*inch, y_position, 7.5*inch, y_position)
        y_position -= 0.1*inch
        
        # Datos de categorías
        p.setFont("Helvetica", 9)
        
        for categoria in categorias:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                
                # Encabezados en nueva página
                p.setFont("Helvetica-Bold", 10)
                p.drawString(1*inch, y_position, "ID")
                p.drawString(1.5*inch, y_position, "NOMBRE")
                p.drawString(4*inch, y_position, "FECHA CREACIÓN")
                
                y_position -= line_height
                p.line(1*inch, y_position, 7.5*inch, y_position)
                y_position -= 0.1*inch
                p.setFont("Helvetica", 9)
            
            p.drawString(1*inch, y_position, str(categoria.id))
            p.drawString(1.5*inch, y_position, categoria.nombre)
            p.drawString(4*inch, y_position, categoria.fecha_creacion.strftime('%d/%m/%Y %H:%M'))
            
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
    patologias = Patologia.objects.all().order_by('nombre')
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
        patologias = Patologia.objects.all().order_by('nombre')
        
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
        p.drawString(1*inch, y_position, "ID")
        p.drawString(1.5*inch, y_position, "NOMBRE")
        p.drawString(4*inch, y_position, "FECHA CREACIÓN")
        
        y_position -= line_height
        p.line(1*inch, y_position, 7.5*inch, y_position)
        y_position -= 0.1*inch
        
        # Datos de patologías
        p.setFont("Helvetica", 9)
        
        for patologia in patologias:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                
                # Encabezados en nueva página
                p.setFont("Helvetica-Bold", 10)
                p.drawString(1*inch, y_position, "ID")
                p.drawString(1.5*inch, y_position, "NOMBRE")
                p.drawString(4*inch, y_position, "FECHA CREACIÓN")
                
                y_position -= line_height
                p.line(1*inch, y_position, 7.5*inch, y_position)
                y_position -= 0.1*inch
                p.setFont("Helvetica", 9)
            
            p.drawString(1*inch, y_position, str(patologia.id))
            p.drawString(1.5*inch, y_position, patologia.nombre)
            p.drawString(4*inch, y_position, patologia.fecha_creacion.strftime('%d/%m/%Y %H:%M'))
            
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
        ubicaciones = Ubicacion.objects.all().order_by('nombre')
        
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
        p.drawString(1*inch, y_position, "ID")
        p.drawString(1.5*inch, y_position, "NOMBRE")
        p.drawString(4*inch, y_position, "FECHA CREACIÓN")
        
        y_position -= line_height
        p.line(1*inch, y_position, 7.5*inch, y_position)
        y_position -= 0.1*inch
        
        # Datos de ubicaciones
        p.setFont("Helvetica", 9)
        
        for ubicacion in ubicaciones:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                
                # Encabezados en nueva página
                p.setFont("Helvetica-Bold", 10)
                p.drawString(1*inch, y_position, "ID")
                p.drawString(1.5*inch, y_position, "NOMBRE")
                p.drawString(4*inch, y_position, "FECHA CREACIÓN")
                
                y_position -= line_height
                p.line(1*inch, y_position, 7.5*inch, y_position)
                y_position -= 0.1*inch
                p.setFont("Helvetica", 9)
            
            p.drawString(1*inch, y_position, str(ubicacion.id))
            p.drawString(1.5*inch, y_position, ubicacion.nombre)
            p.drawString(4*inch, y_position, ubicacion.fecha_creacion.strftime('%d/%m/%Y %H:%M'))
            
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
