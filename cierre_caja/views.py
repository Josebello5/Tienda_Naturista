from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.db.models import Sum, Q, F
from django.contrib import messages
from django.core.paginator import Paginator
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
            tz = pytz.timezone('America/Caracas')
            fecha = timezone.now().astimezone(tz).date()
    else:
        # Usar hora de Venezuela para definir "hoy"
        tz = pytz.timezone('America/Caracas')
        fecha = timezone.now().astimezone(tz).date()
    
    # Verificar si ya existe un cierre para esta fecha
    cierre_existente = CierreCaja.objects.filter(Fecha_Cierre=fecha).first()
    
    # Calcular montos del sistema desde las ventas
    montos_sistema = calcular_montos_sistema(fecha)
    
    # Verificar si es admin o dueño
    es_admin_o_dueno = request.user.groups.filter(name__in=['Dueño', 'Administrador']).exists() or request.user.is_superuser

    if request.method == 'POST':
        # Procesar el formulario de cierre
        try:
            # Validar si el cierre está bloqueado y el usuario no tiene permisos
            if cierre_existente and cierre_existente.Cerrado and not es_admin_o_dueno:
                messages.error(request, 'El cierre de caja ya ha sido finalizado. Solo administradores y dueños pueden modificarlo.')
                return redirect(f"{request.path}?fecha={fecha.strftime('%Y-%m-%d')}")

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
            
            # Marcar como cerrado/bloqueado una vez guardado
            cierre.Cerrado = True
            
            # Guardar y calcular totales
            cierre.save()
            cierre.calcular_totales()
            
            messages.success(request, 'Cierre de caja guardado correctamente')
            return redirect('cierre_caja:ver_recibo_cierre', cierre_id=cierre.ID_Cierre)
            
        except Exception as e:
            messages.error(request, f'Error al guardar el cierre de caja: {str(e)}')
    
    # Determinar si la vista debe estar bloqueada
    bloqueado = False
    if cierre_existente and cierre_existente.Cerrado:
        if not es_admin_o_dueno:
            bloqueado = True

    # Preparar contexto para el template
    context = {
        'fecha': fecha,
        'fecha_str': fecha.strftime('%Y-%m-%d'),
        'montos_sistema': montos_sistema,
        'cierre_existente': cierre_existente,
        'es_hoy': fecha == timezone.now().astimezone(pytz.timezone('America/Caracas')).date(),
        'bloqueado': bloqueado,
        'es_admin_o_dueno': es_admin_o_dueno,
    }
    
    # Si hay cierre existente, agregar sus datos
    if cierre_existente:
        context.update(cierre_existente.get_html_context())
    
    return render(request, 'cierre_caja/menu_cierre_caja.html', context)


@login_required
def ver_recibo_cierre(request, cierre_id):
    """Vista para ver el recibo de un cierre de caja"""
    cierre = get_object_or_404(CierreCaja, ID_Cierre=cierre_id)
    
    # Verificar permisos
    es_admin_o_dueno = request.user.groups.filter(name__in=['Dueño', 'Administrador']).exists() or request.user.is_superuser
    
    context = cierre.get_html_context()
    context['es_admin_o_dueno'] = es_admin_o_dueno
    
    return render(request, 'cierre_caja/recibo_cierre.html', context)


@login_required
def descargar_recibo_cierre(request, cierre_id):
    """Descarga el recibo de cierre como PDF usando xhtml2pdf"""
    cierre = get_object_or_404(CierreCaja, ID_Cierre=cierre_id)
    
    try:
        import os
        from django.conf import settings
        
        # Generar el HTML del recibo
        context = cierre.get_html_context()
        
        # Agregar logo URL
        context['logo_url'] = os.path.join(settings.BASE_DIR, 'usuarios', 'static', 'usuarios', 'img', 'logo_redondo_sin_fondo.png')
        
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
    
    cierres = CierreCaja.objects.select_related('Usuario').prefetch_related('Usuario__groups').all()
    
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
        # Both Bs and USD must be exactly 0
        cierres = cierres.annotate(
            dif_bs=F('Real_Efectivo_Bs') + F('Real_Transferencia') + F('Real_Pago_Movil') + F('Real_Tarjeta') + F('Real_Punto_Venta') - F('Sistema_Efectivo_Bs') - F('Sistema_Transferencia') - F('Sistema_Pago_Movil') - F('Sistema_Tarjeta') - F('Sistema_Punto_Venta'),
            dif_usd=F('Real_Efectivo_USD') - F('Sistema_Efectivo_USD')
        ).filter(dif_bs=0, dif_usd=0)
    elif estado == 'sobra':
        # Show if EITHER Bs OR USD has excess (positive difference)
        cierres = cierres.annotate(
            dif_bs=F('Real_Efectivo_Bs') + F('Real_Transferencia') + F('Real_Pago_Movil') + F('Real_Tarjeta') + F('Real_Punto_Venta') - F('Sistema_Efectivo_Bs') - F('Sistema_Transferencia') - F('Sistema_Pago_Movil') - F('Sistema_Tarjeta') - F('Sistema_Punto_Venta'),
            dif_usd=F('Real_Efectivo_USD') - F('Sistema_Efectivo_USD')
        ).filter(Q(dif_bs__gt=0) | Q(dif_usd__gt=0))
    elif estado == 'falta':
        # Show if EITHER Bs OR USD has shortage (negative difference)
        cierres = cierres.annotate(
            dif_bs=F('Real_Efectivo_Bs') + F('Real_Transferencia') + F('Real_Pago_Movil') + F('Real_Tarjeta') + F('Real_Punto_Venta') - F('Sistema_Efectivo_Bs') - F('Sistema_Transferencia') - F('Sistema_Pago_Movil') - F('Sistema_Tarjeta') - F('Sistema_Punto_Venta'),
            dif_usd=F('Real_Efectivo_USD') - F('Sistema_Efectivo_USD')
        ).filter(Q(dif_bs__lt=0) | Q(dif_usd__lt=0))
    
    # Ordenar por fecha descendente
    cierres = cierres.order_by('-Fecha_Cierre')
    
    # Paginación: 8 items por página
    paginator = Paginator(cierres, 8)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    context = {
        'cierres': page_obj,
        'page_obj': page_obj,
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
    """Genera reporte PDF del historial de cierres usando xhtml2pdf con template HTML"""
    try:
        import os
        from django.conf import settings
        from xhtml2pdf import pisa
        import io
        
        # Filtros
        fecha_desde = request.GET.get('fecha_desde', None)
        fecha_hasta = request.GET.get('fecha_hasta', None)
        estado = request.GET.get('estado', '')
        
        cierres = CierreCaja.objects.select_related('Usuario').prefetch_related('Usuario__groups').all()
        
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
                cierres = cierres.annotate(
                    dif_bs=F('Real_Efectivo_Bs') + F('Real_Transferencia') + F('Real_Pago_Movil') + F('Real_Tarjeta') + F('Real_Punto_Venta') - F('Sistema_Efectivo_Bs') - F('Sistema_Transferencia') - F('Sistema_Pago_Movil') - F('Sistema_Tarjeta') - F('Sistema_Punto_Venta'),
                    dif_usd=F('Real_Efectivo_USD') - F('Sistema_Efectivo_USD')
                ).filter(dif_bs=0, dif_usd=0)
                filtros_texto.append("Estado: Cuadre Exacto")
            elif estado == 'sobra':
                cierres = cierres.annotate(
                    dif_bs=F('Real_Efectivo_Bs') + F('Real_Transferencia') + F('Real_Pago_Movil') + F('Real_Tarjeta') + F('Real_Punto_Venta') - F('Sistema_Efectivo_Bs') - F('Sistema_Transferencia') - F('Sistema_Pago_Movil') - F('Sistema_Tarjeta') - F('Sistema_Punto_Venta'),
                    dif_usd=F('Real_Efectivo_USD') - F('Sistema_Efectivo_USD')
                ).filter(Q(dif_bs__gt=0) | Q(dif_usd__gt=0))
                filtros_texto.append("Estado: Sobra Dinero")
            elif estado == 'falta':
                cierres = cierres.annotate(
                    dif_bs=F('Real_Efectivo_Bs') + F('Real_Transferencia') + F('Real_Pago_Movil') + F('Real_Tarjeta') + F('Real_Punto_Venta') - F('Sistema_Efectivo_Bs') - F('Sistema_Transferencia') - F('Sistema_Pago_Movil') - F('Sistema_Tarjeta') - F('Sistema_Punto_Venta'),
                    dif_usd=F('Real_Efectivo_USD') - F('Sistema_Efectivo_USD')
                ).filter(Q(dif_bs__lt=0) | Q(dif_usd__lt=0))
                filtros_texto.append("Estado: Falta Dinero")
        
        # Ordenar por fecha descendente
        cierres = cierres.order_by('-Fecha_Cierre')
        
        # Función para formatear números en formato venezolano
        def fmt(val):
            return f"{val:,.2f}".replace('.', '#').replace(',', '.').replace('#', ',')
        
        def get_estado(dif):
            if dif == 0:
                return 'cuadre'
            elif dif > 0:
                return 'sobra'
            else:
                return 'falta'
        
        # Preparar datos para el template
        cierres_data = []
        tot_sis_bs = Decimal('0')
        tot_sis_usd = Decimal('0')
        tot_real_bs = Decimal('0')
        tot_real_usd = Decimal('0')
        
        for cierre in cierres:
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
            
            # Determinar rol del usuario
            rol = cierre.Usuario.groups.first().name if cierre.Usuario and cierre.Usuario.groups.exists() else ''
            if rol == 'Dueño':
                rol_class = 'dueno'
                inicial = 'D'
            elif rol == 'Administrador':
                rol_class = 'admin'
                inicial = 'A'
            elif rol == 'Cajero':
                rol_class = 'cajero'
                inicial = 'C'
            else:
                rol_class = 'default'
                inicial = cierre.Usuario.username[0].upper() if cierre.Usuario else '?'
            
            cierres_data.append({
                'fecha': cierre.Fecha_Cierre.strftime('%d/%m/%Y'),
                'usuario': cierre.Usuario.username if cierre.Usuario else 'N/A',
                'rol_class': rol_class,
                'inicial': inicial,
                'sistema_bs': fmt(sis_bs),
                'sistema_usd': fmt(sis_usd),
                'real_bs': fmt(real_bs),
                'real_usd': fmt(real_usd),
                'dif_bs': dif_bs,
                'dif_usd': dif_usd,
                'dif_bs_fmt': fmt(dif_bs),
                'dif_usd_fmt': fmt(dif_usd),
                'estado_bs': get_estado(dif_bs),
                'estado_usd': get_estado(dif_usd),
                'notas': cierre.Notas or '',
            })
        
        # Calcular totales
        tot_dif_bs = tot_real_bs - tot_sis_bs
        tot_dif_usd = tot_real_usd - tot_sis_usd
        
        # Logo URL
        logo_url = os.path.join(settings.BASE_DIR, 'usuarios', 'static', 'usuarios', 'img', 'logo_redondo_sin_fondo.png')
        
        # Filtros info
        filtros_info = " | ".join(filtros_texto) if filtros_texto else None
        
        context = {
            'cierres': cierres_data,
            'fecha_generacion': datetime.now(),
            'filtros_info': filtros_info,
            'logo_url': logo_url,
            'total_sistema_bs': fmt(tot_sis_bs),
            'total_sistema_usd': fmt(tot_sis_usd),
            'total_real_bs': fmt(tot_real_bs),
            'total_real_usd': fmt(tot_real_usd),
            'total_dif_bs': tot_dif_bs,
            'total_dif_usd': tot_dif_usd,
            'total_dif_bs_fmt': fmt(tot_dif_bs),
            'total_dif_usd_fmt': fmt(tot_dif_usd),
            'total_estado_bs': get_estado(tot_dif_bs),
            'total_estado_usd': get_estado(tot_dif_usd),
        }
        
        # Renderizar template a string
        html_string = render_to_string('cierre_caja/reporte_historial_pdf.html', context)
        
        # Configurar PDF
        response = HttpResponse(content_type='application/pdf')
        filename = f"historial_cierres_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        # Generar PDF
        result = io.BytesIO()
        pdf = pisa.pisaDocument(io.BytesIO(html_string.encode("UTF-8")), result)
        
        if not pdf.err:
            response.write(result.getvalue())
            return response
        
        return HttpResponse(f"Error al generar PDF: {pdf.err}", status=500)
        
    except Exception as e:
        print(f"Error generando reporte de cierres: {e}")
        return HttpResponse(f"Error generando reporte: {str(e)}", status=500)

