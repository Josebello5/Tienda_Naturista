# Vistas temporales para ubicaciones - se agregarán a views.py

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from datetime import datetime
import json
import re
import logging

logger = logging.getLogger(__name__)

# ===== VISTAS PARA UBICACIONES =====

def lista_ubicaciones_json(request):
    """Devuelve lista de ubicaciones en formato JSON"""
    from .models import Ubicacion
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
    from .models import Ubicacion
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
    from .models import Ubicacion, Producto
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

def imprimir_ubicaciones(request):
    """Generar PDF con listado de ubicaciones"""
    from .models import Ubicacion
    try:
        ubicaciones = Ubicacion.objects.all().order_by('nombre')
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="listado_ubicaciones.pdf"'
        
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
