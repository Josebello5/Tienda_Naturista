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
import pytz
from usuarios.decorators import role_required

from ventas.models import Venta, DetalleVenta
from productos.models import Producto
from clientes.models import Cliente
from lotes.models import Lote

@role_required('Dueño', 'Administrador')
def menu_estadisticas(request):
    """
    Vista principal del dashboard de estadísticas.
    Muestra 3 paneles: Productos más vendidos, Clientes frecuentes, Lotes por vencer.
    Permite filtrar cada panel por fechas independientemente y búsqueda por nombre.
    """
    
    # Obtener tasa actual para conversión USD
    from django.db.models import Q
    tz_venezuela = pytz.timezone('America/Caracas')
    ahora_venezuela = timezone.now().astimezone(tz_venezuela)
    hoy = ahora_venezuela.date()
    
    from dashboard.models import TasaCambiaria
    tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')
    if tasas_hoy.exists():
        tasa_actual = tasas_hoy.first()
    else:
        tasa_actual = TasaCambiaria.objects.order_by('-fecha_creacion').first()
    
    # === PANEL 1: PRODUCTOS MÁS VENDIDOS (Pasado) ===
    # Por defecto: Últimos 30 días
    fecha_fin_prod = timezone.now().date()
    fecha_ini_prod = fecha_fin_prod - timedelta(days=30)
    search_prod = request.GET.get('search_prod', '').strip()
    
    # Filtro opcional por URL/AJAX - detectar si hay parámetros de fecha o búsqueda
    if request.GET.get('filtro_prod') == 'si' or search_prod or request.GET.get('fecha_ini_prod'):
         fecha_ini_str = request.GET.get('fecha_ini_prod')
         fecha_fin_str = request.GET.get('fecha_fin_prod')
         if fecha_ini_str: fecha_ini_prod = datetime.strptime(fecha_ini_str, '%Y-%m-%d').date()
         if fecha_fin_str: fecha_fin_prod = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

    top_productos_query = (
        DetalleVenta.objects
        .filter(
            ID_Ventas__Fecha_Venta__date__range=[fecha_ini_prod, fecha_fin_prod],
            ID_Ventas__anulada=False
        )
    )
    
    # Aplicar filtro de búsqueda si existe
    if search_prod:
        top_productos_query = top_productos_query.filter(
            ID_lote__id_producto__nombre_pro__icontains=search_prod
        )
    
    top_productos = (
        top_productos_query
        .values('ID_lote__id_producto__nombre_pro', 'ID_lote__id_producto__ID_producto')
        .annotate(total_cantidad=Sum('Cantidad'))
        .order_by('-total_cantidad')[:10]
    )

    # === PANEL 2: CLIENTES FRECUENTES (Pasado) ===
    # Por defecto: Últimos 30 días
    fecha_fin_cli = timezone.now().date()
    fecha_ini_cli = fecha_fin_cli - timedelta(days=30)
    search_cli = request.GET.get('search_cli', '').strip()
    moneda_cli = request.GET.get('moneda_cli', 'bs')  # 'bs' o 'usd'
    
    # Filtro opcional por URL/AJAX - detectar si hay parámetros de fecha, búsqueda o moneda
    if request.GET.get('filtro_cli') == 'si' or search_cli or moneda_cli != 'bs' or request.GET.get('fecha_ini_cli'):
         fecha_ini_str = request.GET.get('fecha_ini_cli')
         fecha_fin_str = request.GET.get('fecha_fin_cli')
         if fecha_ini_str: fecha_ini_cli = datetime.strptime(fecha_ini_str, '%Y-%m-%d').date()
         if fecha_fin_str: fecha_fin_cli = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

    top_clientes_query = (
        Venta.objects
        .filter(
            Fecha_Venta__date__range=[fecha_ini_cli, fecha_fin_cli],
            anulada=False
        )
    )
    
    # Aplicar filtro de búsqueda si existe
    if search_cli:
        top_clientes_query = top_clientes_query.filter(
            Q(Cedula__nombre__icontains=search_cli) |
            Q(Cedula__apellido__icontains=search_cli)
        )
    
    # Seleccionar campo de total según moneda
    if moneda_cli == 'usd':
        total_field = 'Total_USD'
    else:
        total_field = 'Total'
    
    top_clientes = (
        top_clientes_query
        .values('Cedula__nombre', 'Cedula__apellido', 'Cedula__cedula')
        .annotate(
            total_compras=Count('ID_Ventas'),
            total_gastado=Sum(total_field)
        )
        .order_by('-total_compras')[:10]
    )

    # === PANEL 3: PRODUCTOS POR VENCER (Futuro) ===
    # Por defecto: Próximos 30 días
    fecha_ini_venc = timezone.now().date()
    fecha_fin_venc = fecha_ini_venc + timedelta(days=30)
    search_venc = request.GET.get('search_venc', '').strip()
    
    # Filtro opcional por URL/AJAX - detectar si hay parámetros de fecha o búsqueda
    if request.GET.get('filtro_venc') == 'si' or search_venc or request.GET.get('fecha_ini_venc'):
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
    )
    
    # Aplicar filtro de búsqueda si existe
    if search_venc:
        lotes_por_vencer_qs = lotes_por_vencer_qs.filter(
            id_producto__nombre_pro__icontains=search_venc
        )
    
    lotes_por_vencer_qs = lotes_por_vencer_qs.order_by('fecha_vencimiento')
    
    # Calcular tiempo restante (para coincidir con lógica JS)
    lotes_por_vencer = []
    now = timezone.now().date()
    for lote in lotes_por_vencer_qs:
        delta = lote.fecha_vencimiento - now
        dias = delta.days
        lote.tiempo_restante = f"{dias} días" if dias > 0 else "Vence hoy"
        lotes_por_vencer.append(lote)

    # === PANEL 4: TOP CATEGORÍAS (Pasado) ===
    # Por defecto: Últimos 30 días
    fecha_fin_cat = timezone.now().date()
    fecha_ini_cat = fecha_fin_cat - timedelta(days=30)
    search_cat = request.GET.get('search_cat', '').strip()
    moneda_cat = request.GET.get('moneda_cat', 'bs')
    
    # Filtro opcional por URL/AJAX
    if request.GET.get('filtro_cat') == 'si' or search_cat or moneda_cat != 'bs' or request.GET.get('fecha_ini_cat'):
         fecha_ini_str = request.GET.get('fecha_ini_cat')
         fecha_fin_str = request.GET.get('fecha_fin_cat')
         if fecha_ini_str: fecha_ini_cat = datetime.strptime(fecha_ini_str, '%Y-%m-%d').date()
         if fecha_fin_str: fecha_fin_cat = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
    
    # Seleccionar campo de precio según moneda
    if moneda_cat == 'bs':
        campo_precio = F('Precio_Unitario')
    else:
        campo_precio = F('Precio_Unitario') / F('ID_Tasa__valor')

    top_categorias_query = (
        DetalleVenta.objects
        .filter(
            ID_Ventas__Fecha_Venta__date__range=[fecha_ini_cat, fecha_fin_cat],
            ID_Ventas__anulada=False
        )
    )
    
    # Aplicar filtro de búsqueda si existe
    if search_cat:
        top_categorias_query = top_categorias_query.filter(
            ID_lote__id_producto__categoria__nombre__icontains=search_cat
        )
    
    top_categorias = (
        top_categorias_query
        .values('ID_lote__id_producto__categoria__nombre')
        .annotate(
            total_cantidad=Sum('Cantidad'),
            total_ventas=Sum(ExpressionWrapper(F('Cantidad') * campo_precio, output_field=DecimalField(max_digits=15, decimal_places=2)))
        )
        .order_by('-total_cantidad')[:10]
    )

    # === PANEL 5: PRODUCTOS POR TERMINARSE (Bajo Stock) ===
    search_stock = request.GET.get('search_stock', '').strip()
    
    # Filtro opcional por URL/AJAX
    if request.GET.get('filtro_stock') == 'si' or search_stock:
        # El filtro de bajo stock es instantáneo, no depende de fechas, pero mantenemos estructura
        pass

    # Lógica: Total stock (suma lotes activos) <= stock_minimo
    productos_bajo_stock_query = Producto.objects.filter(estado='activo').annotate(
        total_stock=Coalesce(
            Sum('lote__cantidad_disponible', filter=Q(lote__estado='activo')), 
            0
        )
    ).filter(total_stock__lte=F('stock_minimo'))

    # Aplicar filtro de búsqueda
    if search_stock:
        productos_bajo_stock_query = productos_bajo_stock_query.filter(
            nombre_pro__icontains=search_stock
        )
    
    productos_bajo_stock = productos_bajo_stock_query.order_by('total_stock', 'nombre_pro')

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
                'total': float(item['total_gastado']),
                'moneda': moneda_cli
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

        categorias_data = []
        for item in top_categorias:
            categorias_data.append({
                'nombre': item['ID_lote__id_producto__categoria__nombre'],
                'cantidad': float(item['total_cantidad']),
                'total': float(item['total_ventas'])
            })
            
        bajo_stock_data = []
        for item in productos_bajo_stock:
            bajo_stock_data.append({
                'nombre': item.nombre_pro,
                'stock': item.total_stock,
                'minimo': item.stock_minimo
            })

        return JsonResponse({
            'productos': productos_data,
            'clientes': clientes_data,
            'vencimiento': vencimiento_data,
            'categorias': categorias_data,
            'bajo_stock': bajo_stock_data,
            'fechas': {
                'prod': f"Del {fecha_ini_prod.strftime('%d/%m/%Y')} al {fecha_fin_prod.strftime('%d/%m/%Y')}",
                'cli': f"Del {fecha_ini_cli.strftime('%d/%m/%Y')} al {fecha_fin_cli.strftime('%d/%m/%Y')}",
                'venc': f"Del {fecha_ini_venc.strftime('%d/%m/%Y')} al {fecha_fin_venc.strftime('%d/%m/%Y')}",
                'cat': f"Del {fecha_ini_cat.strftime('%d/%m/%Y')} al {fecha_fin_cat.strftime('%d/%m/%Y')}"
            },
            'filtros': {
                'search_prod': search_prod,
                'search_cli': search_cli,
                'search_venc': search_venc,
                'search_cat': search_cat,
                'search_stock': search_stock,
                'moneda_cli': moneda_cli,
                'moneda_cat': moneda_cat,
            }
        })

    context = {
        'top_productos': top_productos,
        'fecha_ini_prod': fecha_ini_prod,
        'fecha_fin_prod': fecha_fin_prod,
        'search_prod': search_prod,
        
        'top_clientes': top_clientes,
        'fecha_ini_cli': fecha_ini_cli,
        'fecha_fin_cli': fecha_fin_cli,
        'search_cli': search_cli,
        'moneda_cli': moneda_cli,
        'tasa_actual': tasa_actual,
        
        'lotes_por_vencer': lotes_por_vencer,
        'fecha_ini_venc': fecha_ini_venc,
        'fecha_fin_venc': fecha_fin_venc,
        'search_venc': search_venc,

        'top_categorias': top_categorias,
        'fecha_ini_cat': fecha_ini_cat,
        'fecha_fin_cat': fecha_fin_cat,
        'search_cat': search_cat,

        'productos_bajo_stock': productos_bajo_stock,
        'search_stock': search_stock,
    }
    
    return render(request, 'estadisticas/menu_estadisticas.html', context)


@login_required
def reporte_productos_mas_vendidos(request):
    """Genera PDF de productos más vendidos en un rango de fechas"""
    try:
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        search = request.GET.get('search', '').strip()
        
        if not fecha_ini or not fecha_fin:
             return HttpResponse("Fechas requeridas", status=400)
        
        productos_query = (
            DetalleVenta.objects
            .filter(
                ID_Ventas__Fecha_Venta__date__range=[fecha_ini, fecha_fin],
                ID_Ventas__anulada=False
            )
        )
        
        # Aplicar filtro de búsqueda si existe
        if search:
            productos_query = productos_query.filter(
                ID_lote__id_producto__nombre_pro__icontains=search
            )
        
        productos = (
            productos_query
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
            'fecha_generacion': timezone.now(),
            'filtro_busqueda': search
        }
        
        # Generar nombre de archivo dinámico
        filename_parts = ["productos"]
        if search:
            search_clean = search.replace(' ', '_')[:20]
            filename_parts.append(f"busqueda_{search_clean}")
        filename_parts.append(f"{fecha_ini}_{fecha_fin}")
        filename = "_".join(filename_parts) + ".pdf"
        
        return generar_pdf_generico('estadisticas/reporte_pdf.html', context, filename)
        
    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)


@login_required
def reporte_clientes_frecuentes(request):
    """Genera PDF de clientes frecuentes en un rango de fechas"""
    try:
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        search = request.GET.get('search', '').strip()
        moneda = request.GET.get('moneda', 'bs')
        
        if not fecha_ini or not fecha_fin:
             return HttpResponse("Fechas requeridas", status=400)
        
        from django.db.models import Q
        clientes_query = (
            Venta.objects
            .filter(
                Fecha_Venta__date__range=[fecha_ini, fecha_fin],
                anulada=False
            )
        )
        
        # Aplicar filtro de búsqueda si existe
        if search:
            clientes_query = clientes_query.filter(
                Q(Cedula__nombre__icontains=search) |
                Q(Cedula__apellido__icontains=search)
            )
        
        # Seleccionar campo de total según moneda
        if moneda == 'usd':
            total_field = 'Total_USD'
        else:
            total_field = 'Total'
        
        clientes = (
            clientes_query
            .values('Cedula__nombre', 'Cedula__apellido', 'Cedula__cedula')
            .annotate(
                total_compras=Count('ID_Ventas'),
                total_gastado=Sum(total_field)
            )
            .order_by('-total_compras')
        )

        context = {
            'titulo': 'Reporte de Clientes Frecuentes',
            'fecha_ini': datetime.strptime(fecha_ini, '%Y-%m-%d').date(),
            'fecha_fin': datetime.strptime(fecha_fin, '%Y-%m-%d').date(),
            'datos': clientes,
            'tipo_reporte': 'clientes',
            'fecha_generacion': timezone.now(),
            'filtro_busqueda': search,
            'moneda': moneda
        }
        
        # Generar nombre de archivo dinámico
        filename_parts = ["clientes"]
        if search:
            search_clean = search.replace(' ', '_')[:20]
            filename_parts.append(f"busqueda_{search_clean}")
        filename_parts.append(f"{fecha_ini}_{fecha_fin}")
        filename_parts.append(moneda)
        filename = "_".join(filename_parts) + ".pdf"
        
        return generar_pdf_generico('estadisticas/reporte_pdf.html', context, filename)

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)


@login_required
def reporte_por_vencer(request):
    """Genera PDF de productos por vencer en un rango de fechas (futuro)"""
    try:
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        search = request.GET.get('search', '').strip()
        
        if not fecha_ini or not fecha_fin:
             return HttpResponse("Fechas requeridas", status=400)
        
        lotes_query = (
            Lote.objects
            .filter(
                fecha_vencimiento__range=[fecha_ini, fecha_fin],
                cantidad_disponible__gt=0,
                estado='activo'
            )
            .select_related('id_producto')
        )
        
        # Aplicar filtro de búsqueda si existe
        if search:
            lotes_query = lotes_query.filter(
                id_producto__nombre_pro__icontains=search
            )
        
        lotes = lotes_query.order_by('fecha_vencimiento')

        context = {
            'titulo': 'Reporte de Productos por Vencer',
            'fecha_ini': datetime.strptime(fecha_ini, '%Y-%m-%d').date(),
            'fecha_fin': datetime.strptime(fecha_fin, '%Y-%m-%d').date(),
            'datos': lotes,
            'tipo_reporte': 'vencimiento',
            'fecha_generacion': timezone.now(),
            'filtro_busqueda': search
        }
        
        # Generar nombre de archivo dinámico
        filename_parts = ["vencimiento"]
        if search:
            search_clean = search.replace(' ', '_')[:20]
            filename_parts.append(f"busqueda_{search_clean}")
        filename_parts.append(f"{fecha_ini}_{fecha_fin}")
        filename = "_".join(filename_parts) + ".pdf"
        
        return generar_pdf_generico('estadisticas/reporte_pdf.html', context, filename)

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)


@login_required
def reporte_bajo_stock(request):
    """Genera PDF de productos con bajo stock"""
    try:
        search = request.GET.get('search', '').strip()
        fecha_ini_str = request.GET.get('fecha_ini')
        fecha_fin_str = request.GET.get('fecha_fin')
        
        from django.db.models import Q
        
        # Simular fechas para el template (hoy por defecto)
        fecha_ini = timezone.now().date()
        fecha_fin = timezone.now().date()
        
        if fecha_ini_str:
            try:
                fecha_ini = datetime.strptime(fecha_ini_str, '%Y-%m-%d').date()
            except ValueError:
                pass
                
        if fecha_fin_str:
            try:
                fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        # Lógica: Total stock (suma lotes activos) <= stock_minimo
        # Aquí no hay filtro de fechas para la QUERY porque es estado actual
        
        productos_query = Producto.objects.filter(estado='activo').annotate(
            total_stock=Coalesce(
                Sum('lote__cantidad_disponible', filter=Q(lote__estado='activo')), 
                0
            )
        ).filter(total_stock__lte=F('stock_minimo'))
        
        # Aplicar filtro de búsqueda si existe
        if search:
            productos_query = productos_query.filter(
                nombre_pro__icontains=search
            )
        
        productos = productos_query.order_by('total_stock', 'nombre_pro')

        context = {
            'titulo': 'Reporte de Productos por Terminarse',
            'fecha_ini': fecha_ini,
            'fecha_fin': fecha_fin,
            'datos': productos,
            'tipo_reporte': 'bajo_stock',
            'fecha_generacion': timezone.now(),
            'filtro_busqueda': search
        }
        
        # Generar nombre de archivo dinámico
        filename_parts = ["bajo_stock"]
        if search:
            search_clean = search.replace(' ', '_')[:20]
            filename_parts.append(f"busqueda_{search_clean}")
        filename_parts.append(f"{timezone.now().strftime('%Y-%m-%d')}")
        filename = "_".join(filename_parts) + ".pdf"
        
        return generar_pdf_generico('estadisticas/reporte_pdf.html', context, filename)

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)


def generar_pdf_generico(template_src, context_dict, filename):
    """Función auxiliar para generar PDFs usando xhtml2pdf"""
    # Agregar logo_url si no existe
    if 'logo_url' not in context_dict:
        import os
        from django.conf import settings
        context_dict['logo_url'] = os.path.join(settings.BASE_DIR, 'usuarios', 'static', 'usuarios', 'img', 'logo_redondo_sin_fondo.png')
        
    html_string = render_to_string(template_src, context_dict)
    result = io.BytesIO()
    
    pdf = pisa.pisaDocument(io.BytesIO(html_string.encode("UTF-8")), result)
    
    if not pdf.err:
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"' # Changed to inline for better preview
        return response
    
    return HttpResponse(f"Error al generar PDF: {pdf.err}", status=500)


# ===== ENDPOINTS PARA GRÁFICOS =====

@login_required
def datos_ventas_tiempo(request):
    """Endpoint para datos del gráfico de ventas en el tiempo"""
    try:
        from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
        from decimal import Decimal
        
        periodo = request.GET.get('periodo', 'mes')  # dia, semana, mes
        moneda = request.GET.get('moneda', 'bs')  # bs o usd
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        
        # Determinar rango de fechas
        if fecha_ini and fecha_fin:
            fecha_inicio = datetime.strptime(fecha_ini, '%Y-%m-%d').date()
            fecha_final = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        else:
            # Por defecto: últimos 30 días
            fecha_final = timezone.now().date()
            fecha_inicio = fecha_final - timedelta(days=30)
        
        # Determinar función de truncado según período
        if periodo == 'dia':
            trunc_func = TruncDate
        elif periodo == 'semana':
            trunc_func = TruncWeek
        else:  # mes
            trunc_func = TruncMonth
        
        # Seleccionar campo según moneda
        campo_total = 'Total_USD' if moneda == 'usd' else 'Total'
        
        # Obtener ventas agrupadas por fecha
        ventas = (
            Venta.objects
            .filter(
                Fecha_Venta__date__gte=fecha_inicio,
                Fecha_Venta__date__lte=fecha_final,
                anulada=False
            )
            .annotate(fecha=trunc_func('Fecha_Venta'))
            .values('fecha')
            .annotate(total=Sum(campo_total))
            .order_by('fecha')
        )
        
        # Formatear datos para Chart.js
        labels = []
        data = []
        
        for venta in ventas:
            fecha_venta = venta['fecha']
            # Asegurar que sea date o datetime para evitar errores
            if not hasattr(fecha_venta, 'strftime'):
                continue

            if periodo == 'mes':
                # Para mes, mostrar mes/año (ej. Ene 2026)
                labels.append(fecha_venta.strftime('%b %Y'))
            elif periodo == 'semana':
                # Para semana, mostrar inicio de semana
                labels.append(f"Sem {fecha_venta.strftime('%W')} - {fecha_venta.strftime('%d/%m')}")
            else:
                # Para día, mostrar día/mes
                labels.append(fecha_venta.strftime('%d/%m'))
            data.append(float(venta['total'] or 0))
        
        return JsonResponse({
            'labels': labels,
            'data': data,
            'moneda': moneda,
            'periodo': periodo
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def datos_top_productos(request):
    """Endpoint para datos del gráfico de top productos"""
    try:
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        limit = int(request.GET.get('limit', 10))
        
        # Si no hay fechas, usar últimos 30 días
        if not fecha_ini or not fecha_fin:
            fecha_fin = timezone.now().date()
            fecha_ini = fecha_fin - timedelta(days=30)
        else:
            fecha_ini = datetime.strptime(fecha_ini, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        
        # Obtener top productos
        top_productos = (
            DetalleVenta.objects
            .filter(
                ID_Ventas__Fecha_Venta__date__range=[fecha_ini, fecha_fin],
                ID_Ventas__anulada=False
            )
            .values('ID_lote__id_producto__nombre_pro')
            .annotate(total_cantidad=Sum('Cantidad'))
            .order_by('-total_cantidad')[:limit]
        )
        
        # Formatear datos
        labels = []
        data = []
        
        for item in top_productos:
            labels.append(item['ID_lote__id_producto__nombre_pro'])
            data.append(float(item['total_cantidad']))
        
        return JsonResponse({
            'labels': labels,
            'data': data,
            'fecha_ini': fecha_ini.strftime('%d/%m/%Y'),
            'fecha_fin': fecha_fin.strftime('%d/%m/%Y')
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def datos_ventas_categoria(request):
    """Endpoint para datos del gráfico de ventas por categoría"""
    try:
        fecha_ini = request.GET.get('fecha_ini')
        fecha_fin = request.GET.get('fecha_fin')
        moneda = request.GET.get('moneda', 'bs')
        
        # Si no hay fechas, usar últimos 30 días
        if not fecha_ini or not fecha_fin:
            fecha_fin = timezone.now().date()
            fecha_ini = fecha_fin - timedelta(days=30)
        else:
            fecha_ini = datetime.strptime(fecha_ini, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        
        # Seleccionar campo según moneda
        if moneda == 'bs':
            # Usar F('Precio_Unitario') explícitamente como expresión
            campo_precio = F('Precio_Unitario')
        else:
            # Calcular USD: Precio_Bs / Tasa
            campo_precio = F('Precio_Unitario') / F('ID_Tasa__valor')
        
        # Obtener ventas por categoría
        ventas_categoria = (
            DetalleVenta.objects
            .filter(
                ID_Ventas__Fecha_Venta__date__range=[fecha_ini, fecha_fin],
                ID_Ventas__anulada=False
            )
            .values('ID_lote__id_producto__categoria__nombre')
            .annotate(
                total=Sum(
                    ExpressionWrapper(
                        F('Cantidad') * campo_precio,
                        output_field=DecimalField(max_digits=15, decimal_places=2)
                    )
                )
            )
            .order_by('-total')[:10]
        )
        
        # Formatear datos
        labels = []
        data = []
        
        for item in ventas_categoria:
            categoria = item['ID_lote__id_producto__categoria__nombre']
            if categoria:  # Solo incluir si tiene categoría
                labels.append(categoria)
                data.append(float(item['total'] or 0))
        
        return JsonResponse({
            'labels': labels,
            'data': data,
            'moneda': moneda,
            'fecha_ini': fecha_ini.strftime('%d/%m/%Y'),
            'fecha_fin': fecha_fin.strftime('%d/%m/%Y')
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ===== VISTAS PARA GENERAR REPORTES PDF DE GRÁFICOS =====
@login_required
def reporte_ventas_tiempo(request):
    """Genera PDF del gráfico de Ventas en el Tiempo con imagen del gráfico"""
    try:
        # Soportar tanto GET (legacy) como POST (con imagen)
        if request.method == 'POST':
            periodo = request.POST.get('periodo', 'mes')
            moneda = request.POST.get('moneda', 'bs')
            fecha_ini = request.POST.get('fecha_ini')
            fecha_fin = request.POST.get('fecha_fin')
            chart_image = request.POST.get('chart_image', '')
        else:
            periodo = request.GET.get('periodo', 'mes')
            moneda = request.GET.get('moneda', 'bs')
            fecha_ini = request.GET.get('fecha_ini')
            fecha_fin = request.GET.get('fecha_fin')
            chart_image = None
        
        if fecha_ini and fecha_fin:
            fecha_inicio = datetime.strptime(fecha_ini, '%Y-%m-%d').date()
            fecha_final = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        else:
            fecha_final = timezone.now().date()
            fecha_inicio = fecha_final - timedelta(days=30)
        
        context = {
            'titulo': f'Ventas por {periodo.capitalize()}',
            'fecha_ini': fecha_inicio,
            'fecha_fin': fecha_final,
            'moneda': moneda,
            'periodo': periodo,
            'fecha_generacion': timezone.now(),
            'chart_image': chart_image
        }
        
        # Usar template apropiado según si hay imagen o no
        template = 'estadisticas/reporte_chart_pdf.html' if chart_image else 'estadisticas/reporte_pdf.html'
        filename = f"ventas_{periodo}_{fecha_inicio}_{fecha_final}.pdf"
        return generar_pdf_generico(template, context, filename)
        
    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)

@login_required
def reporte_top_productos(request):
    """Genera PDF del gráfico de Top Productos con imagen del gráfico"""
    try:
        # Soportar tanto GET (legacy) como POST (con imagen)
        if request.method == 'POST':
            limit = int(request.POST.get('limit', 10))
            fecha_ini = request.POST.get('fecha_ini')
            fecha_fin = request.POST.get('fecha_fin')
            chart_image = request.POST.get('chart_image', '')
        else:
            limit = int(request.GET.get('limit', 10))
            fecha_ini = request.GET.get('fecha_ini')
            fecha_fin = request.GET.get('fecha_fin')
            chart_image = None
        
        if fecha_ini and fecha_fin:
            fecha_inicio = datetime.strptime(fecha_ini, '%Y-%m-%d').date()
            fecha_final = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
        else:
            fecha_final = timezone.now().date()
            fecha_inicio = fecha_final - timedelta(days=30)
        
        context = {
            'titulo': 'Top Productos',
            'fecha_ini': fecha_inicio,
            'fecha_fin': fecha_final,
            'fecha_generacion': timezone.now(),
            'chart_image': chart_image
        }
        
        # Usar template apropiado según si hay imagen o no
        template = 'estadisticas/reporte_chart_pdf.html' if chart_image else 'estadisticas/reporte_pdf.html'
        filename = f"top_productos_{fecha_inicio}_{fecha_final}.pdf"
        return generar_pdf_generico(template, context, filename)

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)

@login_required
def reporte_ventas_categoria(request):
    """Genera PDF del gráfico/panel de Categorías con imagen del gráfico"""
    try:
        # Soportar tanto GET (legacy/panel) como POST (con imagen de gráfico)
        if request.method == 'POST':
            fecha_ini = request.POST.get('fecha_ini')
            fecha_fin = request.POST.get('fecha_fin')
            moneda = request.POST.get('moneda', 'bs')
            chart_image = request.POST.get('chart_image', '')
            search_cat = ''
            modo = 'chart'
        else:
            fecha_ini = request.GET.get('fecha_ini')
            fecha_fin = request.GET.get('fecha_fin')
            moneda = request.GET.get('moneda', 'bs')
            search_cat = request.GET.get('search_cat', '').strip()
            modo = request.GET.get('modo', '')
            chart_image = None
        
        if fecha_ini and fecha_fin:
            try:
                fecha_inicio = datetime.strptime(fecha_ini, '%Y-%m-%d').date()
                fecha_final = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
            except ValueError:
                fecha_final = timezone.now().date()
                fecha_inicio = fecha_final - timedelta(days=30)
        else:
            fecha_final = timezone.now().date()
            fecha_inicio = fecha_final - timedelta(days=30)
        
        # Si es modo panel (legacy), generar datos tabulares
        if modo == 'panel':
            if moneda == 'bs':
                campo_precio = F('Precio_Unitario')
            else:
                campo_precio = F('Precio_Unitario') / F('ID_Tasa__valor')
                
            query = (
                DetalleVenta.objects
                .filter(
                    ID_Ventas__Fecha_Venta__date__range=[fecha_inicio, fecha_final],
                    ID_Ventas__anulada=False
                )
            )
            
            if search_cat:
                query = query.filter(ID_lote__id_producto__categoria__nombre__icontains=search_cat)
                
            ventas_categoria = (
                query
                .values('ID_lote__id_producto__categoria__nombre')
                .annotate(
                    total=Sum(
                        ExpressionWrapper(
                            F('Cantidad') * campo_precio,
                            output_field=DecimalField(max_digits=15, decimal_places=2)
                        )
                    ),
                    total_cantidad=Sum('Cantidad')
                )
                .order_by('-total')[:20]
            )

            context = {
                'titulo': 'Reporte de Ventas por Categoría',
                'fecha_ini': fecha_inicio,
                'fecha_fin': fecha_final,
                'datos': ventas_categoria,
                'tipo_reporte': 'categorias',
                'moneda': moneda,
                'fecha_generacion': timezone.now(),
                'filtro_busqueda': search_cat
            }
            template = 'estadisticas/reporte_pdf.html'
        else:
            # Modo gráfico - usar imagen
            context = {
                'titulo': 'Ventas por Categoría',
                'fecha_ini': fecha_inicio,
                'fecha_fin': fecha_final,
                'moneda': moneda,
                'fecha_generacion': timezone.now(),
                'chart_image': chart_image
            }
            template = 'estadisticas/reporte_chart_pdf.html' if chart_image else 'estadisticas/reporte_pdf.html'
        
        filename = f"categorias_{fecha_inicio}_{fecha_final}.pdf"
        return generar_pdf_generico(template, context, filename)

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)
