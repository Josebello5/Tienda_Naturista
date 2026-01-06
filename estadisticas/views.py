from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from xhtml2pdf import pisa
import io

from ventas.models import Venta, DetalleVenta
from productos.models import Producto
from clientes.models import Cliente
from lotes.models import Lote

@login_required
def menu_estadisticas(request):
    """
    Vista principal del dashboard de estadísticas.
    Muestra 3 paneles: Productos más vendidos, Clientes frecuentes, Lotes por vencer.
    Permite filtrar cada panel por fechas independientemente.
    """
    
    # === PANEL 1: PRODUCTOS MÁS VENDIDOS (Pasado) ===
    # Por defecto: Últimos 30 días
    fecha_fin_prod = timezone.now().date()
    fecha_ini_prod = fecha_fin_prod - timedelta(days=30)
    
    # Filtro opcional por URL/AJAX
    if request.GET.get('filtro_prod') == 'si':
         fecha_ini_str = request.GET.get('fecha_ini_prod')
         fecha_fin_str = request.GET.get('fecha_fin_prod')
         if fecha_ini_str: fecha_ini_prod = datetime.strptime(fecha_ini_str, '%Y-%m-%d').date()
         if fecha_fin_str: fecha_fin_prod = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

    top_productos = (
        DetalleVenta.objects
        .filter(
            ID_Ventas__Fecha_Venta__date__range=[fecha_ini_prod, fecha_fin_prod],
            ID_Ventas__anulada=False
        )
        .values('ID_lote__id_producto__nombre_pro', 'ID_lote__id_producto__ID_producto')
        .annotate(total_cantidad=Sum('Cantidad'))
        .order_by('-total_cantidad')[:10]
    )

    # === PANEL 2: CLIENTES FRECUENTES (Pasado) ===
    # Por defecto: Últimos 30 días
    fecha_fin_cli = timezone.now().date()
    fecha_ini_cli = fecha_fin_cli - timedelta(days=30)
    
    if request.GET.get('filtro_cli') == 'si':
         fecha_ini_str = request.GET.get('fecha_ini_cli')
         fecha_fin_str = request.GET.get('fecha_fin_cli')
         if fecha_ini_str: fecha_ini_cli = datetime.strptime(fecha_ini_str, '%Y-%m-%d').date()
         if fecha_fin_str: fecha_fin_cli = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

    top_clientes = (
        Venta.objects
        .filter(
            Fecha_Venta__date__range=[fecha_ini_cli, fecha_fin_cli],
            anulada=False
        )
        .values('Cedula__nombre', 'Cedula__apellido', 'Cedula__cedula')
        .annotate(
            total_compras=Count('ID_Ventas'),
            total_gastado=Sum('Total')
        )
        .order_by('-total_compras')[:10]
    )

    # === PANEL 3: PRODUCTOS POR VENCER (Futuro) ===
    # Por defecto: Próximos 30 días
    fecha_ini_venc = timezone.now().date()
    fecha_fin_venc = fecha_ini_venc + timedelta(days=30)
    
    if request.GET.get('filtro_venc') == 'si':
         fecha_ini_str = request.GET.get('fecha_ini_venc')
         fecha_fin_str = request.GET.get('fecha_fin_venc')
         if fecha_ini_str: fecha_ini_venc = datetime.strptime(fecha_ini_str, '%Y-%m-%d').date()
         if fecha_fin_str: fecha_fin_venc = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

    lotes_por_vencer_qs = (
        Lote.objects
        .filter(
            fecha_vencimiento__range=[fecha_ini_venc, fecha_fin_venc],
            cantidad_disponible__gt=0,
            estado='activo'
        )
        .select_related('id_producto')
        .order_by('fecha_vencimiento')
    )
    
    # Calcular tiempo restante (para coincidir con lógica JS)
    lotes_por_vencer = []
    now = timezone.now().date()
    for lote in lotes_por_vencer_qs:
        delta = lote.fecha_vencimiento - now
        dias = delta.days
        lote.tiempo_restante = f"{dias} días" if dias > 0 else "Vence hoy"
        lotes_por_vencer.append(lote)

    # RESPUESTA AJAX JSON
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        # Serializar datos
        productos_data = []
        for item in top_productos:
             productos_data.append({
                 'nombre': item['ID_lote__id_producto__nombre_pro'],
                 'id': item['ID_lote__id_producto__ID_producto'],
                 'cantidad': float(item['total_cantidad'])
             })
             
        clientes_data = []
        for item in top_clientes:
            clientes_data.append({
                'nombre': f"{item['Cedula__nombre']} {item['Cedula__apellido']}",
                'cedula': item['Cedula__cedula'],
                'compras': item['total_compras'],
                'total': float(item['total_gastado'])
            })
            
        vencimiento_data = []
        now = timezone.now().date()
        for item in lotes_por_vencer:
            # Calcular tiempo restante simple
            delta = item.fecha_vencimiento - now
            dias = delta.days
            tiempo_restante = f"{dias} días" if dias > 0 else "Vence hoy"
            
            vencimiento_data.append({
                'producto': item.id_producto.nombre_pro,
                'lote': item.codigo_lote,
                'disponible': item.cantidad_disponible,
                'fecha': item.fecha_vencimiento.strftime('%d/%m/%Y'),
                'tiempo': tiempo_restante
            })

        return JsonResponse({
            'productos': productos_data,
            'clientes': clientes_data,
            'vencimiento': vencimiento_data,
            'fechas': {
                'prod': f"Del {fecha_ini_prod.strftime('%d/%m/%Y')} al {fecha_fin_prod.strftime('%d/%m/%Y')}",
                'cli': f"Del {fecha_ini_cli.strftime('%d/%m/%Y')} al {fecha_fin_cli.strftime('%d/%m/%Y')}",
                'venc': f"Del {fecha_ini_venc.strftime('%d/%m/%Y')} al {fecha_fin_venc.strftime('%d/%m/%Y')}"
            }
        })

    context = {
        'top_productos': top_productos,
        'fecha_ini_prod': fecha_ini_prod,
        'fecha_fin_prod': fecha_fin_prod,
        
        'top_clientes': top_clientes,
        'fecha_ini_cli': fecha_ini_cli,
        'fecha_fin_cli': fecha_fin_cli,
        
        'lotes_por_vencer': lotes_por_vencer,
        'fecha_ini_venc': fecha_ini_venc,
        'fecha_fin_venc': fecha_fin_venc,
    }
    
    return render(request, 'estadisticas/menu_estadisticas.html', context)


@login_required
def reporte_productos_mas_vendidos(request):
    """Genera PDF de productos más vendidos en un rango de fechas"""
    try:
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        
        if not fecha_ini or not fecha_fin:
             return HttpResponse("Fechas requeridas", status=400)
             
        productos = (
            DetalleVenta.objects
            .filter(
                ID_Ventas__Fecha_Venta__date__range=[fecha_ini, fecha_fin],
                ID_Ventas__anulada=False
            )
            .values(
                'ID_lote__id_producto__nombre_pro', 
                'ID_lote__id_producto__ID_producto'
            )
            .annotate(total_cantidad=Sum('Cantidad'))
            .order_by('-total_cantidad')
        )
        
        context = {
            'titulo': 'Reporte de Productos Más Vendidos',
            'fecha_ini': datetime.strptime(fecha_ini, '%Y-%m-%d').date(),
            'fecha_fin': datetime.strptime(fecha_fin, '%Y-%m-%d').date(),
            'datos': productos,
            'tipo_reporte': 'productos',
            'fecha_generacion': timezone.now()
        }
        
        return generar_pdf_generico('estadisticas/reporte_pdf.html', context, f"productos_top_{fecha_ini}_{fecha_fin}.pdf")
        
    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)


@login_required
def reporte_clientes_frecuentes(request):
    """Genera PDF de clientes frecuentes en un rango de fechas"""
    try:
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        
        if not fecha_ini or not fecha_fin:
             return HttpResponse("Fechas requeridas", status=400)

        clientes = (
            Venta.objects
            .filter(
                Fecha_Venta__date__range=[fecha_ini, fecha_fin],
                anulada=False
            )
            .values('Cedula__nombre', 'Cedula__apellido', 'Cedula__cedula')
            .annotate(
                total_compras=Count('ID_Ventas'),
                total_gastado=Sum('Total')
            )
            .order_by('-total_compras')
        )

        context = {
            'titulo': 'Reporte de Clientes Frecuentes',
            'fecha_ini': datetime.strptime(fecha_ini, '%Y-%m-%d').date(),
            'fecha_fin': datetime.strptime(fecha_fin, '%Y-%m-%d').date(),
            'datos': clientes,
            'tipo_reporte': 'clientes',
            'fecha_generacion': timezone.now()
        }
        
        return generar_pdf_generico('estadisticas/reporte_pdf.html', context, f"clientes_top_{fecha_ini}_{fecha_fin}.pdf")

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)


@login_required
def reporte_por_vencer(request):
    """Genera PDF de productos por vencer en un rango de fechas (futuro)"""
    try:
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        
        if not fecha_ini or not fecha_fin:
             return HttpResponse("Fechas requeridas", status=400)

        lotes = (
            Lote.objects
            .filter(
                fecha_vencimiento__range=[fecha_ini, fecha_fin],
                cantidad_disponible__gt=0,
                estado='activo'
            )
            .select_related('id_producto')
            .order_by('fecha_vencimiento')
        )

        context = {
            'titulo': 'Reporte de Productos por Vencer',
            'fecha_ini': datetime.strptime(fecha_ini, '%Y-%m-%d').date(),
            'fecha_fin': datetime.strptime(fecha_fin, '%Y-%m-%d').date(),
            'datos': lotes,
            'tipo_reporte': 'vencimiento',
            'fecha_generacion': timezone.now()
        }
        
        return generar_pdf_generico('estadisticas/reporte_pdf.html', context, f"vencimiento_{fecha_ini}_{fecha_fin}.pdf")

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)


def generar_pdf_generico(template_src, context_dict, filename):
    """Función auxiliar para generar PDFs usando xhtml2pdf"""
    html_string = render_to_string(template_src, context_dict)
    result = io.BytesIO()
    
    pdf = pisa.pisaDocument(io.BytesIO(html_string.encode("UTF-8")), result)
    
    if not pdf.err:
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    
    return HttpResponse(f"Error al generar PDF: {pdf.err}", status=500)
