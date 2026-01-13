from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.db.models import Sum, Q
from django.contrib import messages
from decimal import Decimal
from datetime import datetime, date
import pytz

from .models import CierreCaja
from ventas.models import Pago, Venta
from dashboard.models import TasaCambiaria
from usuarios.decorators import role_required

from xhtml2pdf import pisa
import io
from django.template.loader import render_to_string
from django.core.files.base import ContentFile

@login_required(login_url='usuarios:login')
@never_cache
def menu_cierre_caja(request):
    """Vista principal del menú de cierre de caja"""
    
    # Obtener fecha desde el request o usar hoy
    fecha_str = request.GET.get('fecha', None)
    if fecha_str:
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            fecha = timezone.now().date()
    else:
        fecha = timezone.now().date()
    
    # Verificar si ya existe un cierre para esta fecha
    cierre_existente = CierreCaja.objects.filter(Fecha_Cierre=fecha).first()
    
    # Calcular montos del sistema desde las ventas
    montos_sistema = calcular_montos_sistema(fecha)
    
    if request.method == 'POST':
        # Procesar el formulario de cierre
        try:
            # Si existe, actualizar; si no, crear nuevo
            if cierre_existente:
                cierre = cierre_existente
            else:
                cierre = CierreCaja()
                cierre.Fecha_Cierre = fecha
                cierre.Usuario = request.user
            
            # Guardar montos del sistema
            cierre.Sistema_Efectivo_Bs = montos_sistema.get('efectivo_bs', Decimal('0'))
            cierre.Sistema_Efectivo_USD = montos_sistema.get('efectivo_usd', Decimal('0'))
            cierre.Sistema_Transferencia = montos_sistema.get('transferencia', Decimal('0'))
            cierre.Sistema_Pago_Movil = montos_sistema.get('pago_movil', Decimal('0'))
            cierre.Sistema_Tarjeta = montos_sistema.get('tarjeta', Decimal('0'))
            cierre.Sistema_Punto_Venta = montos_sistema.get('punto_venta', Decimal('0'))
            
            # Obtener y guardar montos reales desde el formulario
            cierre.Real_Efectivo_Bs = parse_decimal_venezuelan(request.POST.get('real_efectivo_bs', '0'))
            cierre.Real_Efectivo_USD = parse_decimal_venezuelan(request.POST.get('real_efectivo_usd', '0'))
            cierre.Real_Transferencia = parse_decimal_venezuelan(request.POST.get('real_transferencia', '0'))
            cierre.Real_Pago_Movil = parse_decimal_venezuelan(request.POST.get('real_pago_movil', '0'))
            cierre.Real_Tarjeta = parse_decimal_venezuelan(request.POST.get('real_tarjeta', '0'))
            cierre.Real_Punto_Venta = parse_decimal_venezuelan(request.POST.get('real_punto_venta', '0'))
            
            # Guardar notas
            cierre.Notas = request.POST.get('notas', '')
            
            # Guardar y calcular totales
            cierre.save()
            cierre.calcular_totales()
            
            messages.success(request, 'Cierre de caja guardado correctamente')
            return redirect('cierre_caja:ver_recibo_cierre', cierre_id=cierre.ID_Cierre)
            
        except Exception as e:
            messages.error(request, f'Error al guardar el cierre de caja: {str(e)}')
    
    # Preparar contexto para el template
    context = {
        'fecha': fecha,
        'fecha_str': fecha.strftime('%Y-%m-%d'),
        'montos_sistema': montos_sistema,
        'cierre_existente': cierre_existente,
        'es_hoy': fecha == timezone.now().date(),
    }
    
    # Si hay cierre existente, agregar sus datos
    if cierre_existente:
        context.update(cierre_existente.get_html_context())
    
    return render(request, 'cierre_caja/menu_cierre_caja.html', context)


@login_required
def ver_recibo_cierre(request, cierre_id):
    """Vista para ver el recibo de un cierre de caja"""
    cierre = get_object_or_404(CierreCaja, ID_Cierre=cierre_id)
    context = cierre.get_html_context()
    return render(request, 'cierre_caja/recibo_cierre.html', context)


@login_required
def descargar_recibo_cierre(request, cierre_id):
    """Descarga el recibo de cierre como PDF usando xhtml2pdf"""
    cierre = get_object_or_404(CierreCaja, ID_Cierre=cierre_id)
    
    try:
        # Generar el HTML del recibo
        context = cierre.get_html_context()
        html_string = render_to_string('cierre_caja/recibo_cierre_pdf.html', context)
        
        # Crear buffer para el PDF
        result = io.BytesIO()
        
        # Convertir HTML a PDF
        pisa_status = pisa.CreatePDF(
            src=io.BytesIO(html_string.encode("UTF-8")),
            dest=result,
            encoding='UTF-8',
            show_error_as_pdf=True,
            default_css=''
        )
        
        if pisa_status.err:
            return HttpResponse(f"Error al generar PDF: {pisa_status.err}", status=500)
            
        # Crear respuesta HTTP
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="cierre_caja_{cierre.Fecha_Cierre.strftime("%Y%m%d")}.pdf"'
        
        return response
        
    except Exception as e:
        return HttpResponse(f"Error al generar PDF: {str(e)}", status=500)


@login_required
def historial_cierres(request):
    """Vista para ver el historial de cierres de caja"""
    # Filtros opcionales
    fecha_desde = request.GET.get('fecha_desde', None)
    fecha_hasta = request.GET.get('fecha_hasta', None)
    
    cierres = CierreCaja.objects.all()
    
    # Validar y convertir fechas
    fecha_desde_obj = None
    fecha_hasta_obj = None

    if fecha_desde:
        try:
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            cierres = cierres.filter(Fecha_Cierre__gte=fecha_desde_obj)
        except ValueError:
            pass
    
    if fecha_hasta:
        try:
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            cierres = cierres.filter(Fecha_Cierre__lte=fecha_hasta_obj)
        except ValueError:
            pass
    
    estado = request.GET.get('estado', '')
    
    if estado == 'completo':
        cierres = cierres.filter(Diferencia_Total=0)
    elif estado == 'sobra':
        cierres = cierres.filter(Diferencia_Total__gt=0)
    elif estado == 'falta':
        cierres = cierres.filter(Diferencia_Total__lt=0)
    
    context = {
        'cierres': cierres,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'fecha_desde_obj': fecha_desde_obj,
        'fecha_hasta_obj': fecha_hasta_obj,
        'estado': estado,
    }
    
    return render(request, 'cierre_caja/historial_cierres.html', context)


# Funciones auxiliares

def calcular_montos_sistema(fecha):
    """Calcula los montos del sistema para una fecha específica"""
    
    # Obtener pagos de ventas no anuladas para la fecha
    pagos = Pago.objects.filter(
        Fecha_Pago__date=fecha,
        Monto__gt=0,  # Solo pagos positivos (excluir devoluciones)
        ID_Ventas__anulada=False  # Excluir ventas anuladas
    )
    
    montos = {
        'efectivo_bs': Decimal('0'),
        'efectivo_usd': Decimal('0'),
        'transferencia': Decimal('0'),
        'pago_movil': Decimal('0'),
        'tarjeta': Decimal('0'),
        'punto_venta': Decimal('0'),
    }
    
    # Agrupar por método de pago
    for pago in pagos:
        if pago.Metodo_Pago == 'efectivo_bs':
            montos['efectivo_bs'] += pago.Monto_Bs
        elif pago.Metodo_Pago == 'efectivo_usd':
            # Para USD guardamos el monto en USD, no en Bs
            montos['efectivo_usd'] += pago.Monto
        elif pago.Metodo_Pago == 'transferencia':
            montos['transferencia'] += pago.Monto_Bs
        elif pago.Metodo_Pago == 'pago_movil':
            montos['pago_movil'] += pago.Monto_Bs
        elif pago.Metodo_Pago == 'tarjeta':
            montos['tarjeta'] += pago.Monto_Bs
        elif pago.Metodo_Pago == 'punto_venta':
            montos['punto_venta'] += pago.Monto_Bs
    
    return montos


def parse_decimal_venezuelan(value):
    """Convierte un número en formato venezolano (1.234,56) a Decimal"""
    if not value or value == '':
        return Decimal('0')
    
    try:
        # Eliminar espacios
        value = value.strip()
        
        # Reemplazar punto (separador de miles) por nada
        value = value.replace('.', '')
        
        # Reemplazar coma (separador decimal) por punto
        value = value.replace(',', '.')
        
        return Decimal(value)
    except:
        return Decimal('0')


def generar_reporte_cierres(request):
    """Genera reporte PDF del historial de cierres usando reportlab (Separado Bs y Ref)"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        
        # Filtros
        fecha_desde = request.GET.get('fecha_desde', None)
        fecha_hasta = request.GET.get('fecha_hasta', None)
        estado = request.GET.get('estado', '')
        
        cierres = CierreCaja.objects.all()
        
        filtros_texto = []
        
        if fecha_desde:
            try:
                fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
                cierres = cierres.filter(Fecha_Cierre__gte=fecha_desde_obj)
                filtros_texto.append(f"Desde: {fecha_desde_obj.strftime('%d/%m/%Y')}")
            except ValueError:
                pass
        
        if fecha_hasta:
            try:
                fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
                cierres = cierres.filter(Fecha_Cierre__lte=fecha_hasta_obj)
                filtros_texto.append(f"Hasta: {fecha_hasta_obj.strftime('%d/%m/%Y')}")
            except ValueError:
                pass
        
        if estado:
            if estado == 'completo':
                cierres = cierres.filter(Diferencia_Total=0)
                filtros_texto.append("Estado: Cuadre Exacto")
            elif estado == 'sobra':
                cierres = cierres.filter(Diferencia_Total__gt=0)
                filtros_texto.append("Estado: Sobra Dinero")
            elif estado == 'falta':
                cierres = cierres.filter(Diferencia_Total__lt=0)
                filtros_texto.append("Estado: Falta Dinero")
        
        # Ordenar por fecha descendente
        cierres = cierres.order_by('-Fecha_Cierre')
        
        # Configurar PDF
        response = HttpResponse(content_type='application/pdf')
        filename = f"reporte_cierres_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # --- HEADER ---
        def draw_header(c, page_filters=None):
            c.setFont("Helvetica-Bold", 16)
            c.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
            c.setFont("Helvetica", 12)
            c.drawString(1*inch, height-1.3*inch, "Historial de Cierres de Caja")
            c.setFont("Helvetica", 10)
            fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
            c.drawString(1*inch, height-1.6*inch, f"Generado: {fecha_actual}")
            
            if page_filters:
                c.setFont("Helvetica-Oblique", 9)
                c.drawString(1*inch, height-1.9*inch, " | ".join(page_filters))
            
            c.line(1*inch, height-2.1*inch, 7.5*inch, height-2.1*inch)
            
            # Encabezados de tabla
            y_cols = height - 2.4*inch
            c.setFont("Helvetica-Bold", 9)
            c.drawString(0.5*inch, y_cols, "FECHA")
            c.drawString(1.5*inch, y_cols, "USUARIO")
            c.drawString(3.0*inch, y_cols, "TOTAL SISTEMA")
            c.drawString(4.5*inch, y_cols, "TOTAL REAL")
            c.drawString(6.0*inch, y_cols, "DIFERENCIA")
            c.line(0.5*inch, y_cols-0.1*inch, 7.5*inch, y_cols-0.1*inch)
            return y_cols - 0.3*inch

        y = draw_header(p, filtros_texto)
        
        # --- BODY ---
        p.setFont("Helvetica", 8)
        
        # Acumuladores
        tot_sis_bs = Decimal('0')
        tot_sis_usd = Decimal('0')
        tot_real_bs = Decimal('0')
        tot_real_usd = Decimal('0')
        tot_dif_bs = Decimal('0')
        tot_dif_usd = Decimal('0')
        
        def fmt(val, prefix=""):
            s = f"{val:,.2f}".replace('.', '#').replace(',', '.').replace('#', ',')
            return f"{prefix} {s}"
        
        for cierre in cierres:
            if y < 1.5*inch:
                p.showPage()
                y = draw_header(p, filtros_texto)
                p.setFont("Helvetica", 8)
            
            # Calcular subtotales por moneda
            sis_bs = (cierre.Sistema_Efectivo_Bs + cierre.Sistema_Transferencia + 
                      cierre.Sistema_Pago_Movil + cierre.Sistema_Tarjeta + 
                      cierre.Sistema_Punto_Venta)
            sis_usd = (cierre.Sistema_Efectivo_USD or Decimal('0'))
            
            real_bs = (cierre.Real_Efectivo_Bs + cierre.Real_Transferencia + 
                       cierre.Real_Pago_Movil + cierre.Real_Tarjeta + 
                       cierre.Real_Punto_Venta)
            real_usd = (cierre.Real_Efectivo_USD or Decimal('0'))
            
            dif_bs = real_bs - sis_bs
            dif_usd = real_usd - sis_usd
            
            # Acumular
            tot_sis_bs += sis_bs
            tot_sis_usd += sis_usd
            tot_real_bs += real_bs
            tot_real_usd += real_usd
            tot_dif_bs += dif_bs
            tot_dif_usd += dif_usd
            
            # Datos básicos
            fecha_str = cierre.Fecha_Cierre.strftime("%d/%m/%Y")
            usuario_str = cierre.Usuario.username if cierre.Usuario else "N/A"
            
            # Dibujar Fecha y Usuario (centrados verticalmente en el bloque de 2 líneas)
            p.setFillColorRGB(0, 0, 0)
            p.drawString(0.5*inch, y - 6, fecha_str)
            p.drawString(1.5*inch, y - 6, usuario_str[:15])
            
            # Columna Sistema
            p.drawRightString(4.0*inch, y, fmt(sis_bs, "Bs"))
            p.drawRightString(4.0*inch, y - 10, fmt(sis_usd, "Ref $"))
            
            # Columna Real
            p.drawRightString(5.5*inch, y, fmt(real_bs, "Bs"))
            p.drawRightString(5.5*inch, y - 10, fmt(real_usd, "Ref $"))
            
            # Columna Diferencia (Bs)
            if dif_bs == 0:
                p.setFillColorRGB(0, 0.5, 0) # Verde
            elif dif_bs > 0:
                p.setFillColorRGB(0, 0, 1) # Azul
            else:
                p.setFillColorRGB(0.8, 0, 0) # Rojo
            p.drawRightString(7.0*inch, y, fmt(dif_bs, "Bs"))
            
            # Columna Diferencia (USD)
            if dif_usd == 0:
                p.setFillColorRGB(0, 0.5, 0) # Verde
            elif dif_usd > 0:
                p.setFillColorRGB(0, 0, 1) # Azul
            else:
                p.setFillColorRGB(0.8, 0, 0) # Rojo
            p.drawRightString(7.0*inch, y - 10, fmt(dif_usd, "Ref $"))
            
            p.setFillColorRGB(0, 0, 0) # Reset color
            p.setLineWidth(0.5)
            p.setStrokeColorRGB(0.9, 0.9, 0.9)
            p.line(0.5*inch, y - 15, 7.5*inch, y - 15)
            
            y -= 0.35*inch

        # --- FOOTER TOTALS ---
        y -= 0.1*inch
        p.setStrokeColorRGB(0, 0, 0)
        p.line(0.5*inch, y, 7.5*inch, y)
        y -= 0.2*inch
        
        p.setFont("Helvetica-Bold", 8)
        p.drawString(0.5*inch, y-5, "TOTALES:")
        
        def draw_total_pair(x_pos, val_bs, val_usd):
            # Bs
            p.setFillColorRGB(0, 0, 0)
            p.drawRightString(x_pos, y, fmt(val_bs, "Bs"))
            # USD
            p.setFillColorRGB(0, 0, 0)
            p.drawRightString(x_pos, y - 10, fmt(val_usd, "Ref $"))

        draw_total_pair(4.0*inch, tot_sis_bs, tot_sis_usd)
        draw_total_pair(5.5*inch, tot_real_bs, tot_real_usd)
        
        # Diferencia Totales con color
        # Bs
        if tot_dif_bs == 0:
            p.setFillColorRGB(0, 0.5, 0)
        elif tot_dif_bs > 0:
            p.setFillColorRGB(0, 0, 1)
        else:
            p.setFillColorRGB(0.8, 0, 0)
        p.drawRightString(7.0*inch, y, fmt(tot_dif_bs, "Bs"))
        
        # USD
        if tot_dif_usd == 0:
            p.setFillColorRGB(0, 0.5, 0)
        elif tot_dif_usd > 0:
            p.setFillColorRGB(0, 0, 1)
        else:
            p.setFillColorRGB(0.8, 0, 0)
        p.drawRightString(7.0*inch, y - 10, fmt(tot_dif_usd, "Ref $"))
        
        p.showPage()
        p.save()
        
        return response

    except Exception as e:
        print(f"Error generando reporte de cierres: {e}")
        return HttpResponse(f"Error generando reporte: {str(e)}", status=500)
