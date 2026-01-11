from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Sum
import json
from decimal import Decimal
from datetime import datetime, timedelta
import pytz
from django.views.decorators.http import require_POST
from dashboard.models import TasaCambiaria
from ventas.models import Venta, Pago
from clientes.models import Cliente
from .models import Abono
from django.utils import timezone

@login_required
def menu_cuentas_pendientes(request):
    """Vista principal para gestionar cuentas pendientes"""
    hoy = timezone.now()
    
    # Obtener todos los clientes que tienen o han tenido ventas a crédito
    clientes_credito = Cliente.objects.filter(
        venta__Tipo_Venta='credito',
        venta__anulada=False
    ).distinct()
    
    # Obtener tasa actual para mostrar equivalente en Bs (usando zona horaria de Venezuela)
    import pytz
    tz_venezuela = pytz.timezone('America/Caracas')
    ahora_venezuela = timezone.now().astimezone(tz_venezuela)
    hoy_venezuela = ahora_venezuela.date()
    
    tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy_venezuela).order_by('-fecha_creacion')
    tasa_actual = tasas_hoy.first() if tasas_hoy.exists() else TasaCambiaria.objects.order_by('-fecha_creacion').first()

    # Calcular deuda total por cliente
    clientes_deuda_detallada = []
    for cliente in clientes_credito:
        # Obtener ventas a crédito del cliente (todas, no solo pendientes)
        ventas_cliente_credito = Venta.objects.filter(
            Cedula=cliente,
            Tipo_Venta='credito',
            anulada=False
        )

        if ventas_cliente_credito.exists():
            # Obtener solo las pendientes para el cálculo de estadísticas de deuda
            ventas_pendientes = ventas_cliente_credito.filter(
                Estado_Pago__in=['pendiente', 'parcial']
            ).select_related('Cedula').prefetch_related('pagos', 'detalles')
            
            deuda_total_usd = ventas_pendientes.aggregate(
                total=Sum('Saldo_Pendiente_USD')
            )['total'] or Decimal('0')
            
            # Calcular días transcurridos desde la venta pendiente más antigua (si hay)
            dias_transcurridos = 0
            badge_class = 'badge-success'
            
            if ventas_pendientes.exists():
                venta_mas_antigua = ventas_pendientes.order_by('Fecha_Venta').first()
                diferencia = hoy - venta_mas_antigua.Fecha_Venta
                dias_transcurridos = diferencia.days
                
                # Determinar color del badge según días
                if dias_transcurridos > 30:
                    badge_class = 'badge-danger'
                elif dias_transcurridos > 15:
                    badge_class = 'badge-warning'
            
            clientes_deuda_detallada.append({
                'cliente': cliente,
                'deuda_total_usd': deuda_total_usd,
                'deuda_total_bs': deuda_total_usd * tasa_actual.valor if tasa_actual and tasa_actual.valor else Decimal('0'),
                'ventas_pendientes': ventas_pendientes.count(),
                'dias_transcurridos': dias_transcurridos,
                'badge_class': badge_class,
                'ventas_list': ventas_pendientes
            })
    
    # Ordenar por deuda total (descendente)
    clientes_deuda_detallada.sort(key=lambda x: x['deuda_total_usd'], reverse=True)
    
    # Estadísticas
    total_cuentas = sum(item['ventas_pendientes'] for item in clientes_deuda_detallada)
    total_saldo_pendiente_usd = sum(item['deuda_total_usd'] for item in clientes_deuda_detallada)
    

    
    if tasa_actual and tasa_actual.valor:
        total_saldo_pendiente_bs = total_saldo_pendiente_usd * tasa_actual.valor
    else:
        total_saldo_pendiente_bs = Decimal('0')
    
    # Top 5 clientes con mayor deuda
    clientes_top_5 = clientes_deuda_detallada[:5]
    
    # Abonos recientes (últimos 30 días) agrupados jerárquicamente
    fecha_limite = hoy - timedelta(days=30)
    abonos_query = Abono.objects.filter(
        Fecha_Abono__gte=fecha_limite,
        anulado=False
    ).select_related('ID_Ventas', 'Cliente').order_by('-Fecha_Abono')
    
    # Agrupar abonos por Cliente -> Venta
    clientes_agrupados = {}
    for abono in abonos_query:
        cliente_id = abono.Cliente.cedula
        venta_id = abono.ID_Ventas.ID_Ventas
        
        if cliente_id not in clientes_agrupados:
            clientes_agrupados[cliente_id] = {
                'cliente': abono.Cliente,
                'fecha_reciente': abono.Fecha_Abono,
                'total_bs': Decimal('0'),
                'ventas': {}
            }
        
        # Actualizar fecha reciente del cliente
        if abono.Fecha_Abono > clientes_agrupados[cliente_id]['fecha_reciente']:
            clientes_agrupados[cliente_id]['fecha_reciente'] = abono.Fecha_Abono
            
        # Agrupar dentro del cliente por venta
        if venta_id not in clientes_agrupados[cliente_id]['ventas']:
            clientes_agrupados[cliente_id]['ventas'][venta_id] = {
                'id_venta': venta_id,
                'fecha_ultimo_venta': abono.Fecha_Abono,
                'total_bs_venta': Decimal('0'),
                'abonos': []
            }
        
        clientes_agrupados[cliente_id]['ventas'][venta_id]['abonos'].append(abono)
        clientes_agrupados[cliente_id]['ventas'][venta_id]['total_bs_venta'] += abono.Monto_Abono_Bs
        clientes_agrupados[cliente_id]['total_bs'] += abono.Monto_Abono_Bs
        
    # Convertir a lista y ordenar
    abonos_recientes_lista = []
    for c_id, c_data in clientes_agrupados.items():
        # Convertir ventas a lista y ordenar por fecha reciente
        ventas_lista = list(c_data['ventas'].values())
        ventas_lista.sort(key=lambda x: x['fecha_ultimo_venta'], reverse=True)
        c_data['ventas_list'] = ventas_lista
        abonos_recientes_lista.append(c_data)
        
    abonos_recientes_lista.sort(key=lambda x: x['fecha_reciente'], reverse=True)
    
    context = {
        'clientes_deuda_detallada': clientes_deuda_detallada,
        'total_cuentas': total_cuentas,
        'total_saldo_pendiente_usd': total_saldo_pendiente_usd,
        'total_saldo_pendiente': total_saldo_pendiente_bs,
        'total_clientes_deuda': sum(1 for item in clientes_deuda_detallada if item['ventas_pendientes'] > 0),
        'clientes_top_5': clientes_top_5,
        'abonos_recientes': abonos_recientes_lista,
        'tasa_actual': tasa_actual,
    }
    
    return render(request, 'cuentas_pendientes/menu_cuentas.html', context)

@login_required
def filtrar_cuentas_ajax(request):
    """Endpoint AJAX para filtrar cuentas pendientes dinámicamente"""
    if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
        return JsonResponse({'error': 'Solicitud no válida'}, status=400)
    
    # Obtener parámetros de filtro
    query = request.GET.get('q', '').strip().lower()
    estado = request.GET.get('estado', '')
    
    hoy = timezone.now()
    
    # Obtener todos los clientes con historial de crédito
    clientes_credito = Cliente.objects.filter(
        venta__Tipo_Venta='credito',
        venta__anulada=False
    ).distinct()
    
    # Obtener tasa actual
    import pytz
    tz_venezuela = pytz.timezone('America/Caracas')
    ahora_venezuela = timezone.now().astimezone(tz_venezuela)
    hoy_venezuela = ahora_venezuela.date()
    
    tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy_venezuela).order_by('-fecha_creacion')
    tasa_actual = tasas_hoy.first() if tasas_hoy.exists() else TasaCambiaria.objects.order_by('-fecha_creacion').first()
    
    # Calcular deuda total por cliente
    clientes_deuda_detallada = []
    for cliente in clientes_credito:
        # Aplicar filtro de búsqueda por nombre/cédula
        if query:
            nombre_completo = f"{cliente.nombre} {cliente.apellido}".lower()
            cedula = cliente.cedula.lower()
            if query not in nombre_completo and query not in cedula:
                continue
        
        # Obtener todas las ventas a crédito
        ventas_cliente_credito = Venta.objects.filter(
            Cedula=cliente,
            Tipo_Venta='credito',
            anulada=False
        )
        
        if ventas_cliente_credito.exists():
            # Obtener las pendientes para cálculos
            ventas_pendientes = ventas_cliente_credito.filter(
                Estado_Pago__in=['pendiente', 'parcial']
            ).select_related('Cedula').prefetch_related('pagos', 'detalles')
            
            deuda_total_usd = ventas_pendientes.aggregate(
                total=Sum('Saldo_Pendiente_USD')
            )['total'] or Decimal('0')
            
            dias_transcurridos = 0
            badge_class = 'badge-success'
            
            if ventas_pendientes.exists():
                venta_mas_antigua = ventas_pendientes.order_by('Fecha_Venta').first()
                diferencia = hoy - venta_mas_antigua.Fecha_Venta
                dias_transcurridos = diferencia.days
                
                # Determinar color del badge
                if dias_transcurridos > 30:
                    badge_class = 'badge-danger'
                elif dias_transcurridos > 15:
                    badge_class = 'badge-warning'
            
            # Aplicar filtro de estado (sólo si se especifica y hay deuda)
            if estado:
                if not ventas_pendientes.exists():
                    continue # Si se busca por mora, ignorar los que no tienen deuda
                    
                if estado == 'alta' and dias_transcurridos <= 30:
                    continue
                elif estado == 'media' and (dias_transcurridos < 15 or dias_transcurridos > 30):
                    continue
                elif estado == 'baja' and dias_transcurridos >= 15:
                    continue
            
            clientes_deuda_detallada.append({
                'cliente': cliente,
                'deuda_total_usd': deuda_total_usd,
                'deuda_total_bs': deuda_total_usd * tasa_actual.valor if tasa_actual and tasa_actual.valor else Decimal('0'),
                'ventas_pendientes': ventas_pendientes.count(),
                'dias_transcurridos': dias_transcurridos,
                'badge_class': badge_class,
            })
    
    # Ordenar por deuda total (descendente)
    clientes_deuda_detallada.sort(key=lambda x: x['deuda_total_usd'], reverse=True)
    
    # Estadísticas filtradas
    total_cuentas = sum(item['ventas_pendientes'] for item in clientes_deuda_detallada)
    total_saldo_pendiente_usd = sum(item['deuda_total_usd'] for item in clientes_deuda_detallada)
    
    if tasa_actual and tasa_actual.valor:
        total_saldo_pendiente_bs = total_saldo_pendiente_usd * tasa_actual.valor
    else:
        total_saldo_pendiente_bs = Decimal('0')
    
    # Top 5 clientes con mayor deuda
    clientes_top_5 = clientes_deuda_detallada[:5]
    
    # Formatear datos para JSON
    def formatear_moneda(valor):
        """Formatea un número con separadores de miles y decimales"""
        if valor is None:
            return "0,00"
        valor_str = f"{float(valor):,.2f}"
        # Convertir formato inglés a venezolano (. por , y , por .)
        return valor_str.replace(',', 'X').replace('.', ',').replace('X', '.')
    
    top_5_data = []
    for item in clientes_top_5:
        cliente = item['cliente']
        top_5_data.append({
            'nombre': f"{cliente.nombre} {cliente.apellido}",
            'cedula': cliente.cedula,
            'deuda_total_bs': formatear_moneda(item['deuda_total_bs']),
            'deuda_total_usd': formatear_moneda(item['deuda_total_usd']),
            'ventas_pendientes': item['ventas_pendientes'],
            'url_abono': f"/cuentas_pendientes/gestionar_abono/{cliente.cedula}/"
        })
    
    return JsonResponse({
        'success': True,
        'total_cuentas': total_cuentas,
        'total_saldo_bs': formatear_moneda(total_saldo_pendiente_bs),
        'total_saldo_usd': formatear_moneda(total_saldo_pendiente_usd),
        'total_clientes': len(clientes_deuda_detallada),
        'total_clientes_deuda': sum(1 for item in clientes_deuda_detallada if item['ventas_pendientes'] > 0),
        'top_5': top_5_data,
    })


@login_required
def buscar_ventas_pendientes(request):
    """Búsqueda AJAX de ventas pendientes"""
    query = request.GET.get('q', '').strip()
    
    if len(query) < 2:
        return JsonResponse({'ventas': []})
    
    # Buscar clientes con deuda que coincidan con la búsqueda
    clientes = Cliente.objects.filter(
        venta__Tipo_Venta='credito',
        venta__anulada=False,
        venta__Estado_Pago__in=['pendiente', 'parcial']
    ).filter(
        Q(cedula__icontains=query) |
        Q(nombre__icontains=query) |
        Q(apellido__icontains=query)
    ).distinct()
    
    clientes_data = []
    for cliente in clientes[:20]:
        ventas_cliente = Venta.objects.filter(
            Cedula=cliente,
            Tipo_Venta='credito',
            anulada=False,
            Estado_Pago__in=['pendiente', 'parcial']
        )
        
        if ventas_cliente.exists():
            deuda_total = ventas_cliente.aggregate(
                total=Sum('Saldo_Pendiente')
            )['total'] or Decimal('0')
            
            clientes_data.append({
                'cliente_id': cliente.cedula,
                'cliente_nombre': f"{cliente.nombre} {cliente.apellido}",
                'cedula': cliente.cedula,
                'deuda_total': str(deuda_total),
                'ventas_pendientes': ventas_cliente.count(),
            })
    
    return JsonResponse({'clientes': clientes_data})

@login_required
def gestionar_abono_cliente(request, cliente_cedula):
    """Página para gestionar abonos de un cliente específico"""
    cliente = get_object_or_404(Cliente, cedula=cliente_cedula)
    
    # Obtener filtro de estado de pago desde los parámetros GET
    estado_pago_filtro = request.GET.get('estado_pago', '')
    
    # Obtener ventas del cliente según el filtro
    if estado_pago_filtro == 'completo':
        # Si se selecciona "completo", mostrar solo ventas completadas
        ventas_pendientes = Venta.objects.filter(
            Cedula=cliente,
            Tipo_Venta='credito',
            anulada=False,
            Estado_Pago='completo'
        )
    elif estado_pago_filtro == 'parcial':
        # Si se selecciona "parcial", mostrar solo ventas parciales
        ventas_pendientes = Venta.objects.filter(
            Cedula=cliente,
            Tipo_Venta='credito',
            anulada=False,
            Estado_Pago='parcial'
        )
    elif estado_pago_filtro == 'pendiente':
        # Si se selecciona "pendiente", mostrar solo ventas pendientes
        ventas_pendientes = Venta.objects.filter(
            Cedula=cliente,
            Tipo_Venta='credito',
            anulada=False,
            Estado_Pago='pendiente'
        )
    else:
        # Por defecto, mostrar TODAS las ventas a crédito (incluyendo completas)
        ventas_pendientes = Venta.objects.filter(
            Cedula=cliente,
            Tipo_Venta='credito',
            anulada=False
        )
    
    ventas_pendientes = ventas_pendientes.select_related('Cedula').prefetch_related('pagos', 'detalles').order_by('Fecha_Venta')
    
    hoy = timezone.now()
    
    # Calcular días transcurridos para cada venta
    total_abono_inicial = Decimal('0')
    ventas_atrasadas = 0
    dias_ultima_compra = 0
    
    for venta in ventas_pendientes:
        diferencia = hoy - venta.Fecha_Venta
        venta.dias_transcurridos = diferencia.days
        
        # Determinar color del badge según días
        if venta.dias_transcurridos > 30:
            venta.badge_class = 'badge-danger'
            ventas_atrasadas += 1
        elif venta.dias_transcurridos > 15:
            venta.badge_class = 'badge-warning'
        else:
            venta.badge_class = 'badge-success'
        
        # Sumar abono inicial
        total_abono_inicial += venta.Abono_Inicial
        
        # Actualizar días desde la última compra (venta más reciente)
        if venta.dias_transcurridos < dias_ultima_compra or dias_ultima_compra == 0:
            dias_ultima_compra = venta.dias_transcurridos
    
    # Calcular deuda total del cliente en USD
    deuda_total_usd = ventas_pendientes.aggregate(
        total=Sum('Saldo_Pendiente_USD')
    )['total'] or Decimal('0')
    
    # Obtener tasa cambiaria actual
    tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy.date()).order_by('-fecha_creacion')
    tasa_actual = tasas_hoy.first() if tasas_hoy.exists() else TasaCambiaria.objects.order_by('-fecha_creacion').first()
    
    # Calcular deuda en Bs (solo para referencia, usando tasa actual)
    if tasa_actual and tasa_actual.valor:
        deuda_total_bs = deuda_total_usd * tasa_actual.valor
    else:
        deuda_total_bs = Decimal('0')
    
    context = {
        'cliente': cliente,
        'ventas_pendientes': ventas_pendientes,
        'deuda_total_usd': deuda_total_usd,
        'deuda_total_bs': deuda_total_bs,
        'tasa_actual': tasa_actual,
        'hoy': hoy,
        'total_abono_inicial': total_abono_inicial,
        'ventas_atrasadas': ventas_atrasadas,
        'dias_ultima_compra': dias_ultima_compra,
        'estado_pago_filtro': estado_pago_filtro,  # Pasar el filtro actual al template
    }
    
    return render(request, 'cuentas_pendientes/gestionar_abono_cliente.html', context)

@login_required
def registrar_abono(request, venta_id=None):
    """Vista para registrar un abono a una venta pendiente"""
    venta = None
    if venta_id:
        venta = get_object_or_404(Venta, ID_Ventas=venta_id, anulada=False)
    
    # Obtener tasa cambiaria actual
    hoy = timezone.now().date()
    tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')
    tasa_actual = tasas_hoy.first() if tasas_hoy.exists() else TasaCambiaria.objects.order_by('-fecha_creacion').first()
    
    # Historial de abonos si es venta específica
    historial_abonos = []
    if venta:
        historial_abonos = Abono.objects.filter(
            ID_Ventas=venta,
            anulado=False
        ).order_by('-Fecha_Abono')
    
    context = {
        'venta': venta,
        'tasa_actual': tasa_actual,
        'historial_abonos': historial_abonos,
    }
    
    return render(request, 'cuentas_pendientes/registrar_abono.html', context)

@login_required
@csrf_exempt
@transaction.atomic
def procesar_abono(request):
    """Procesa el registro de un abono individual"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            venta_id = data.get('venta_id')
            monto_abono_str = data.get('monto_abono', '0')
            metodo_pago = data.get('metodo_pago')
            comprobante = data.get('comprobante', '')
            observaciones = data.get('observaciones', '')
            
            # Validaciones
            if not venta_id:
                return JsonResponse({'success': False, 'error': 'Venta no especificada'})
            
            venta = get_object_or_404(Venta, ID_Ventas=venta_id, anulada=False)
            
            # Validar que la venta sea a crédito
            if venta.Tipo_Venta != 'credito':
                return JsonResponse({'success': False, 'error': 'La venta no es a crédito'})
            
            # Validar que tenga saldo pendiente en USD
            if venta.Saldo_Pendiente_USD <= Decimal('0.01'):
                return JsonResponse({'success': False, 'error': 'La venta ya está pagada completamente'})
            
            # Formatear monto
            def clean_number(value):
                if isinstance(value, (int, float, Decimal)):
                    return str(value)
                elif isinstance(value, str):
                    value = value.strip()
                    if not value:
                        return "0"
                    if ',' in value and '.' in value:
                        value = value.replace('.', '').replace(',', '.')
                    elif ',' in value:
                        if value.count(',') > 1:
                            value = value.replace(',', '')
                        else:
                            value = value.replace(',', '.')
                    return value
                else:
                    return str(value)
            
            monto_abono_limpio = clean_number(monto_abono_str)
            monto_abono = Decimal(monto_abono_limpio)
            
            if monto_abono <= Decimal('0'):
                return JsonResponse({'success': False, 'error': 'El monto del abono debe ser mayor a cero'})
            
            # Obtener tasa actual del día del abono
            hoy = timezone.now().date()
            tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')
            tasa_actual = tasas_hoy.first() if tasas_hoy.exists() else TasaCambiaria.objects.order_by('-fecha_creacion').first()
            
            if not tasa_actual:
                return JsonResponse({'success': False, 'error': 'No hay tasa cambiaria configurada'})
            
            # Calcular montos según método de pago
            if metodo_pago == 'efectivo_usd':
                # Pago en USD
                monto_abono_usd = monto_abono
                monto_abono_bs = monto_abono * tasa_actual.valor
                tasa_cambio = tasa_actual.valor
            else:
                # Pago en Bs - convertir a USD usando tasa actual
                monto_abono_bs = monto_abono
                monto_abono_usd = monto_abono / tasa_actual.valor
                tasa_cambio = None
            
            # Validar que el abono no exceda el saldo pendiente en USD
            if monto_abono_usd > venta.Saldo_Pendiente_USD:
                return JsonResponse({
                    'success': False, 
                    'error': f'El abono (${monto_abono_usd:.2f}) excede el saldo pendiente (${venta.Saldo_Pendiente_USD:.2f})'
                })
            
            # Registrar el abono
            abono = Abono.objects.create(
                ID_Ventas=venta,
                Cliente=venta.Cedula,
                Monto_Abono=monto_abono,
                Metodo_Pago=metodo_pago,
                Tasa_Cambio=tasa_cambio,
                Monto_Abono_Bs=monto_abono_bs,
                Comprobante=comprobante,
                Observaciones=observaciones,
                Saldo_Anterior=venta.Saldo_Pendiente,
                Saldo_Despues=venta.Saldo_Pendiente - monto_abono_bs,
                Registrado_Por=request.user.username if request.user.is_authenticated else 'Sistema'
            )
            
            # Refrescar la venta para obtener el estado actualizado
            venta.refresh_from_db()
            
            mensaje = f'Abono de ${monto_abono_usd:.2f} (Bs {monto_abono_bs:.2f}) registrado exitosamente'
            if venta.Saldo_Pendiente_USD <= Decimal('0.01'):
                mensaje += '. ¡Venta pagada completamente!'
            
            return JsonResponse({
                'success': True,
                'abono_id': abono.ID_Abono,
                'nuevo_saldo_usd': str(venta.Saldo_Pendiente_USD),
                'nuevo_saldo_bs': str(venta.Saldo_Pendiente),
                'estado_venta': venta.get_Estado_Pago_display(),
                'estado_venta_codigo': venta.Estado_Pago,
                'mensaje': mensaje
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

@login_required
@csrf_exempt
@transaction.atomic
def procesar_pago_multiple(request):
    """Procesa el pago de múltiples ventas seleccionadas"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            ventas_ids = data.get('ventas', [])
            metodos_pago = data.get('metodos_pago', [])
            
            if not ventas_ids:
                return JsonResponse({'success': False, 'error': 'No se seleccionaron ventas'})
            
            if not metodos_pago:
                return JsonResponse({'success': False, 'error': 'No se agregaron métodos de pago'})
            
            # Obtener tasa cambiaria actual
            hoy = timezone.now().date()
            tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')
            tasa_actual_obj = tasas_hoy.first() if tasas_hoy.exists() else TasaCambiaria.objects.order_by('-fecha_creacion').first()
            
            if not tasa_actual_obj:
                return JsonResponse({'success': False, 'error': 'No hay tasa cambiaria configurada'})
            
            tasa_actual_valor = Decimal(str(tasa_actual_obj.valor))
            
            # Obtener las ventas con el cliente relacionado
            ventas = Venta.objects.filter(
                ID_Ventas__in=ventas_ids,
                anulada=False,
                Estado_Pago__in=['pendiente', 'parcial']
            ).select_related('Cedula')
            
            ventas_encontradas = list(ventas.values_list('ID_Ventas', flat=True))
            ventas_no_encontradas = [vid for vid in ventas_ids if vid not in ventas_encontradas]
            
            if ventas_no_encontradas:
                return JsonResponse({
                    'success': False, 
                    'error': f'Ventas no encontradas o ya pagadas: {ventas_no_encontradas}'
                })
            
            # Verificar que todas sean del mismo cliente
            cliente_ids = ventas.values_list('Cedula_id', flat=True).distinct()
            if len(cliente_ids) > 1:
                return JsonResponse({'success': False, 'error': 'Las ventas seleccionadas pertenecen a diferentes clientes'})
            
            # Obtener el cliente
            cliente_id = cliente_ids[0]
            cliente = Cliente.objects.get(id=cliente_id)
            
            # Calcular total a pagar EN USD (no en Bs, para evitar problemas con fluctuación de tasa)
            total_a_pagar_usd = ventas.aggregate(total=Sum('Saldo_Pendiente_USD'))['total'] or Decimal('0')
            
            # Calcular total pagado desde los métodos de pago EN USD
            total_pagado_usd = Decimal('0')
            pagos_por_venta = {}
            
            # Inicializar diccionario para cada venta
            for venta in ventas:
                pagos_por_venta[str(venta.ID_Ventas)] = []
            
            # Distribuir los pagos entre las ventas
            for metodo_pago in metodos_pago:
                monto = Decimal(str(metodo_pago['monto']))
                
                # Calcular monto en USD
                if metodo_pago['metodo'] == 'efectivo_usd':
                    # Ya está en USD
                    monto_usd = monto
                    # Usar la tasa proporcionada o la actual para calcular Bs
                    if metodo_pago.get('tasa_cambio'):
                        tasa_cambio = Decimal(str(metodo_pago['tasa_cambio']))
                    else:
                        tasa_cambio = tasa_actual_valor
                    monto_bs = monto * tasa_cambio
                else:
                    # Convertir Bs a USD usando tasa actual
                    monto_usd = monto / tasa_actual_valor
                    monto_bs = monto
                    tasa_cambio = tasa_actual_valor
                
                total_pagado_usd += monto_usd
                
                # Distribuir este pago entre las ventas pendientes
                monto_restante_usd = monto_usd
                
                # Ordenar ventas por saldo pendiente USD (de mayor a menor)
                ventas_ordenadas = sorted(ventas, key=lambda v: v.Saldo_Pendiente_USD, reverse=True)
                
                for venta in ventas_ordenadas:
                    if venta.Saldo_Pendiente_USD > Decimal('0') and monto_restante_usd > Decimal('0'):
                        # Cuánto asignar a esta venta (en USD)
                        asignar_usd = min(venta.Saldo_Pendiente_USD, monto_restante_usd)
                        
                        if asignar_usd > Decimal('0'):
                            # Calcular monto en Bs usando la tasa de la venta
                            asignar_bs = asignar_usd * Decimal(str(venta.Tasa_Venta))
                            
                            # Calcular monto original según método
                            if metodo_pago['metodo'] == 'efectivo_usd':
                                monto_original = asignar_usd
                            else:
                                monto_original = asignar_bs
                            
                            pagos_por_venta[str(venta.ID_Ventas)].append({
                                'metodo': metodo_pago['metodo'],
                                'monto': monto_original,
                                'tasa_cambio': tasa_cambio,
                                'comprobante': metodo_pago.get('comprobante', ''),
                                'monto_bs': asignar_bs,
                                'monto_usd': asignar_usd
                            })
                            
                            monto_restante_usd -= asignar_usd
                    
                    if monto_restante_usd <= Decimal('0'):
                        break
            
            # Validar que el pago cubra el total EN USD (con tolerancia de 0.01 USD)
            diferencia_usd = abs(total_a_pagar_usd - total_pagado_usd)
            if diferencia_usd > Decimal('0.01'):
                # Mostrar también en Bs para referencia
                diferencia_bs = diferencia_usd * tasa_actual_valor
                return JsonResponse({
                    'success': False, 
                    'error': f'El pago ($ {total_pagado_usd:.2f} ≈ Bs {total_pagado_usd * tasa_actual_valor:.2f}) no coincide con el total a pagar ($ {total_a_pagar_usd:.2f} ≈ Bs {total_a_pagar_usd * tasa_actual_valor:.2f}). Diferencia: $ {diferencia_usd:.2f} (≈ Bs {diferencia_bs:.2f})'
                })
            
            # Registrar los abonos y actualizar las ventas
            abonos_registrados = []
            ventas_actualizadas = []
            ventas_completas = []
            
            for venta in ventas:
                venta_id_str = str(venta.ID_Ventas)
                if venta_id_str in pagos_por_venta and pagos_por_venta[venta_id_str]:
                    # Ordenar pagos para esta venta (por monto descendente)
                    pagos_venta = sorted(pagos_por_venta[venta_id_str], key=lambda p: p['monto_bs'], reverse=True)
                    
                    for pago_info in pagos_venta:
                        # Guardar saldo anterior
                        saldo_anterior = venta.Saldo_Pendiente
                        
                        # Registrar el abono
                        abono = Abono.objects.create(
                            ID_Ventas=venta,
                            Cliente=cliente,
                            Monto_Abono=pago_info['monto'],
                            Metodo_Pago=pago_info['metodo'],
                            Tasa_Cambio=pago_info['tasa_cambio'],
                            Monto_Abono_Bs=pago_info['monto_bs'],
                            Comprobante=pago_info['comprobante'],
                            Observaciones=f'Pago múltiple - Cliente: {cliente.nombre} {cliente.apellido}',
                            Saldo_Anterior=saldo_anterior,
                            Saldo_Despues=saldo_anterior - pago_info['monto_bs'],
                            Registrado_Por=request.user.username if request.user.is_authenticated else 'Sistema'
                        )
                        abonos_registrados.append(abono.ID_Abono)
                        
                        # Refrescar la venta para obtener el estado actualizado
                        venta.refresh_from_db()
                        
                        # Si la venta se pagó completamente, añadir a la lista
                        if venta.Saldo_Pendiente <= Decimal('0'):
                            ventas_completas.append(venta.ID_Ventas)
                    
                    # Después de procesar todos los pagos de esta venta, verificar estado
                    if venta.Saldo_Pendiente <= Decimal('0'):
                        ventas_actualizadas.append(venta.ID_Ventas)
            
            # Verificar que todas las ventas seleccionadas se hayan procesado
            ventas_procesadas = len([v for v in ventas if v.Saldo_Pendiente_USD <= Decimal('0')])
            
            # Calcular total en Bs para el mensaje
            total_a_pagar_bs = total_a_pagar_usd * tasa_actual_valor
            total_pagado_bs = total_pagado_usd * tasa_actual_valor
            
            return JsonResponse({
                'success': True,
                'message': f'✅ Pago procesado exitosamente:<br>• Ventas: {len(ventas_ids)}<br>• Total: $ {total_a_pagar_usd:.2f} (≈ Bs {total_a_pagar_bs:.2f})<br>• Abonos registrados: {len(abonos_registrados)}<br>• Ventas pagadas: {ventas_procesadas}',
                'total_pagado': str(total_pagado_usd),
                'abonos_registrados': len(abonos_registrados),
                'ventas_pagadas': ventas_procesadas,
                'cliente_cedula': cliente.cedula,
                'ventas_completas': ventas_completas
            })
            
        except Cliente.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Cliente no encontrado en la base de datos'})
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error en procesar_pago_multiple: {error_details}")
            return JsonResponse({'success': False, 'error': f'Error del sistema: {str(e)}'})

@login_required
def api_historial_abonos_cliente(request, cliente_cedula):
    """API para obtener el historial de abonos de un cliente"""
    try:
        # Primero, intentar buscar exactamente como llega
        try:
            cliente = Cliente.objects.get(cedula=cliente_cedula)
        except Cliente.DoesNotExist:
            # Si no se encuentra, intentar la alternativa (agregar o quitar 'V' al inicio)
            if cliente_cedula.startswith('V'):
                # Si empieza con V, intentar sin la V
                alternativa = cliente_cedula[1:]
            else:
                # Si no empieza con V, intentar con V
                alternativa = f"V{cliente_cedula}"
            
            try:
                cliente = Cliente.objects.get(cedula=alternativa)
            except Cliente.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Cliente no encontrado'})
        
        # Obtener abonos del cliente (últimos 100)
        abonos = Abono.objects.filter(Cliente=cliente).select_related('ID_Ventas').order_by('-Fecha_Abono')[:100]
        
        # Agrupar abonos por ID de Venta
        abonos_por_venta = {}
        for abono in abonos:
            venta_id = abono.ID_Ventas.ID_Ventas
            
            # Formatear fecha
            fecha_abono = abono.Fecha_Abono
            if timezone.is_aware(fecha_abono):
                fecha_abono = timezone.localtime(fecha_abono)
            
            abono_dict = {
                'id': abono.ID_Abono,
                'monto_abono': float(abono.Monto_Abono),
                'monto_abono_bs': float(abono.Monto_Abono_Bs),
                'metodo_pago': abono.Metodo_Pago,
                'metodo_pago_display': abono.get_Metodo_Pago_display(),
                'comprobante': abono.Comprobante or '',
                'fecha_abono': fecha_abono.strftime('%d/%m/%Y %H:%M'),
                'observaciones': abono.Observaciones or '',
                'anulado': abono.anulado,
                'registrado_por': abono.Registrado_Por or 'Sistema'
            }
            
            if venta_id not in abonos_por_venta:
                abonos_por_venta[venta_id] = {
                    'venta_id': venta_id,
                    'total_bs': 0,
                    'total_usd': 0,
                    'fecha_reciente': abono_dict['fecha_abono'],
                    'abonos': []
                }
            
            abonos_por_venta[venta_id]['abonos'].append(abono_dict)
            if not abono.anulado:
                abonos_por_venta[venta_id]['total_bs'] += float(abono.Monto_Abono_Bs)
                abonos_por_venta[venta_id]['total_usd'] += float(abono.Monto_Abono)
        
        # Convertir a lista y ordenar por fecha reciente
        abonos_agrupados = list(abonos_por_venta.values())
        abonos_agrupados.sort(key=lambda x: datetime.strptime(x['fecha_reciente'], '%d/%m/%Y %H:%M'), reverse=True)
        
        # Calcular totales globales
        total_abonado = sum(item['total_bs'] for item in abonos_agrupados)
        total_abonado_usd = sum(item['total_usd'] for item in abonos_agrupados)
        
        return JsonResponse({
            'success': True,
            'abonos_agrupados': abonos_agrupados,
            'total_ventas_con_abonos': len(abonos_agrupados),
            'total_abonado_bs': total_abonado,
            'total_abonado_usd': total_abonado_usd,
            'cliente': {
                'nombre': f"{cliente.nombre} {cliente.apellido}",
                'cedula': cliente.cedula
            }
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error en api_historial_abonos_cliente: {error_details}")
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def historial_abonos(request, venta_id):
    """Muestra el historial completo de abonos de una venta"""
    venta = get_object_or_404(Venta, ID_Ventas=venta_id)
    abonos = Abono.objects.filter(ID_Ventas=venta).order_by('-Fecha_Abono')
    
    # Estadísticas
    total_abonado = abonos.filter(anulado=False).aggregate(
        total=Sum('Monto_Abono_Bs')
    )['total'] or Decimal('0')
    
    context = {
        'venta': venta,
        'abonos': abonos,
        'total_abonado': total_abonado,
        'saldo_restante': venta.Saldo_Pendiente,
    }
    
    return render(request, 'cuentas_pendientes/historial_abonos.html', context)

@login_required
def historial_abonos_cliente(request, cliente_cedula):
    """Muestra el historial completo de abonos de un cliente"""
    cliente = get_object_or_404(Cliente, cedula=cliente_cedula)
    abonos = Abono.objects.filter(Cliente=cliente).order_by('-Fecha_Abono')
    
    # Ventas pendientes del cliente (solo pendientes o parciales)
    ventas_pendientes = Venta.objects.filter(
        Cedula=cliente,
        Tipo_Venta='credito',
        anulada=False,
        Estado_Pago__in=['pendiente', 'parcial']
    )
    
    # Estadísticas
    total_abonado = abonos.filter(anulado=False).aggregate(
        total=Sum('Monto_Abono_Bs')
    )['total'] or Decimal('0')
    
    deuda_total = ventas_pendientes.aggregate(
        total=Sum('Saldo_Pendiente')
    )['total'] or Decimal('0')
    
    context = {
        'cliente': cliente,
        'abonos': abonos,
        'ventas_pendientes': ventas_pendientes,
        'total_abonado': total_abonado,
        'deuda_total': deuda_total,
        'saldo_restante': deuda_total - total_abonado,
    }
    
    return render(request, 'cuentas_pendientes/historial_cliente.html', context)

@login_required
@csrf_exempt
@transaction.atomic
def anular_abono(request, abono_id):
    """Anula un abono registrado"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            motivo = data.get('motivo', 'Sin motivo especificado')
            
            abono = get_object_or_404(Abono, ID_Abono=abono_id)
            
            if abono.anulado:
                return JsonResponse({'success': False, 'error': 'Este abono ya fue anulado anteriormente'})
            
            # Anular el abono
            success = abono.anular_abono(motivo)
            
            if success:
                venta = abono.ID_Ventas
                return JsonResponse({
                    'success': True,
                    'mensaje': f'Abono #{abono_id} anulado exitosamente',
                    'nuevo_saldo': str(venta.Saldo_Pendiente),
                    'estado_venta': venta.get_Estado_Pago_display()
                })
            else:
                return JsonResponse({'success': False, 'error': 'No se pudo anular el abono'})
                
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

@login_required
def reporte_cuentas_pendientes(request):
    """Genera reporte de cuentas pendientes"""
    # Filtrar por parámetros
    cliente_id = request.GET.get('cliente', '')
    fecha_desde = request.GET.get('fecha_desde', '')
    fecha_hasta = request.GET.get('fecha_hasta', '')
    
    # SOLO ventas pendientes o parciales
    ventas = Venta.objects.filter(
        Tipo_Venta='credito',
        anulada=False,
        Estado_Pago__in=['pendiente', 'parcial']
    ).select_related('Cedula')
    
    if cliente_id:
        ventas = ventas.filter(Cedula__cedula=cliente_id)
    
    if fecha_desde and fecha_hasta:
        ventas = ventas.filter(Fecha_Venta__date__range=[fecha_desde, fecha_hasta])
    
    # Calcular totales
    total_saldo = ventas.aggregate(total=Sum('Saldo_Pendiente'))['total'] or Decimal('0')
    total_ventas = ventas.count()
    
    # Agrupar por cliente
    clientes_data = {}
    for venta in ventas:
        cliente = venta.Cedula
        if cliente.cedula not in clientes_data:
            clientes_data[cliente.cedula] = {
                'cliente': cliente,
                'ventas_pendientes': 0,
                'saldo_total': Decimal('0'),
                'ventas': []
            }
        
        clientes_data[cliente.cedula]['ventas_pendientes'] += 1
        clientes_data[cliente.cedula]['saldo_total'] += venta.Saldo_Pendiente
        clientes_data[cliente.cedula]['ventas'].append(venta)
    
    context = {
        'ventas': ventas,
        'total_saldo': total_saldo,
        'total_ventas': total_ventas,
        'clientes_data': clientes_data,
        'fecha_reporte': timezone.now().strftime("%d/%m/%Y %H:%M"),
    }
    
    return render(request, 'cuentas_pendientes/reporte_cuentas.html', context)

# Función de depuración (opcional - para testing)
@login_required
def debug_venta(request, venta_id):
    """Función para depurar una venta específica"""
    venta = get_object_or_404(Venta, ID_Ventas=venta_id)
    
    # Calcular total pagado
    total_pagado = sum(pago.Monto_Bs for pago in venta.pagos.all() if pago.Monto_Bs > 0)
    
    # Información de depuración
    debug_info = {
        'venta_id': venta.ID_Ventas,
        'total_venta': float(venta.Total),
        'abono_inicial': float(venta.Abono_Inicial),
        'saldo_pendiente': float(venta.Saldo_Pendiente),
        'estado_pago': venta.Estado_Pago,
        'tipo_venta': venta.Tipo_Venta,
        'total_pagado_calculado': float(total_pagado),
        'saldo_calculado': float(venta.Total - total_pagado),
        'pagos': list(venta.pagos.values('ID_Pago', 'Metodo_Pago', 'Monto', 'Monto_Bs')),
        'abonos': list(venta.abonos.values('ID_Abono', 'Monto_Abono_Bs', 'anulado'))
    }
    
    return JsonResponse(debug_info)

@login_required
def imprimir_ventas_cliente(request, cliente_cedula):
    """Generar PDF con listado de ventas a crédito de un cliente"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from tienda_naturista.utils import format_venezuelan_money
    
    try:
        cliente = get_object_or_404(Cliente, cedula=cliente_cedula)
        
        # Obtener parámetros de filtro
        query = request.GET.get('q', '').strip()
        estado_pago_filtro = request.GET.get('estado_pago', '').strip()
        fecha_desde = request.GET.get('fecha_desde', '').strip()
        fecha_hasta = request.GET.get('fecha_hasta', '').strip()
        
        # Obtener todas las ventas a crédito del cliente
        ventas = Venta.objects.filter(
            Cedula=cliente,
            Tipo_Venta='credito',
            anulada=False
        ).select_related('Cedula').prefetch_related('pagos', 'detalles')
        
        # Aplicar filtros
        if estado_pago_filtro == 'completo':
            ventas = ventas.filter(Estado_Pago='completo')
        elif estado_pago_filtro == 'parcial':
            ventas = ventas.filter(Estado_Pago='parcial')
        elif estado_pago_filtro == 'pendiente':
            ventas = ventas.filter(Estado_Pago='pendiente')
        
        # Filtro por ID de venta (búsqueda)
        if query:
            try:
                venta_id = int(query)
                ventas = ventas.filter(ID_Ventas=venta_id)
            except ValueError:
                # Si no es un número, no filtrar por ID
                pass
        
        # Filtro por rango de fechas
        if fecha_desde:
            try:
                fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d')
                ventas = ventas.filter(Fecha_Venta__gte=fecha_desde_obj)
            except ValueError:
                pass
        
        if fecha_hasta:
            try:
                fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                # Agregar 1 día para incluir todo el día hasta
                fecha_hasta_obj = fecha_hasta_obj.replace(hour=23, minute=59, second=59)
                ventas = ventas.filter(Fecha_Venta__lte=fecha_hasta_obj)
            except ValueError:
                pass
        
        ventas = ventas.order_by('-Fecha_Venta')
        
        # Calcular totales
        hoy = timezone.now()
        total_deuda_bs = Decimal('0')
        total_deuda_usd = Decimal('0')
        
        ventas_data = []
        for venta in ventas:
            diferencia = hoy - venta.Fecha_Venta
            dias_transcurridos = diferencia.days
            
            ventas_data.append({
                'venta': venta,
                'dias': dias_transcurridos
            })
            
            if venta.Estado_Pago in ['pendiente', 'parcial']:
                total_deuda_bs += venta.Saldo_Pendiente
                total_deuda_usd += venta.Saldo_Pendiente_USD
        
        # Generar nombre de archivo dinámico basado en filtros
        nombre_partes = ['ventas_credito', cliente.cedula]
        
        if estado_pago_filtro:
            nombre_partes.append(estado_pago_filtro)
        
        if query:
            nombre_partes.append(f'venta{query}')
        
        if fecha_desde or fecha_hasta:
            if fecha_desde and fecha_hasta:
                nombre_partes.append(f'{fecha_desde}_a_{fecha_hasta}')
            elif fecha_desde:
                nombre_partes.append(f'desde_{fecha_desde}')
            elif fecha_hasta:
                nombre_partes.append(f'hasta_{fecha_hasta}')
        
        nombre_archivo = '_'.join(nombre_partes) + '.pdf'
        
        # Crear PDF
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{nombre_archivo}"'
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # Configuración inicial
        p.setTitle(f"Ventas a Crédito - {cliente.nombre} {cliente.apellido}")
        
        # Encabezado
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        
        p.setFont("Helvetica-Bold", 12)
        p.drawString(1*inch, height-1.6*inch, f"Reporte de Ventas a Crédito")
        
        p.setFont("Helvetica", 10)
        p.drawString(1*inch, height-1.9*inch, f"Cliente: {cliente.nombre} {cliente.apellido}")
        p.drawString(1*inch, height-2.1*inch, f"Cédula: {cliente.cedula}")
        
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        p.drawString(1*inch, height-2.3*inch, f"Fecha de impresión: {fecha_actual}")
        
        # Mostrar filtros aplicados
        y_filtros = height-2.5*inch
        if estado_pago_filtro or query or fecha_desde or fecha_hasta:
            p.setFont("Helvetica-Bold", 9)
            p.drawString(1*inch, y_filtros, "Filtros aplicados:")
            y_filtros -= 0.15*inch
            p.setFont("Helvetica", 8)
            
            if query:
                p.drawString(1.2*inch, y_filtros, f"• Venta №: {query}")
                y_filtros -= 0.12*inch
            
            if estado_pago_filtro:
                estado_display = {
                    'completo': 'Completo',
                    'pendiente': 'Pendiente',
                    'parcial': 'Parcial'
                }.get(estado_pago_filtro, estado_pago_filtro)
                p.drawString(1.2*inch, y_filtros, f"• Estado: {estado_display}")
                y_filtros -= 0.12*inch
            
            if fecha_desde or fecha_hasta:
                if fecha_desde and fecha_hasta:
                    p.drawString(1.2*inch, y_filtros, f"• Período: {fecha_desde} a {fecha_hasta}")
                elif fecha_desde:
                    p.drawString(1.2*inch, y_filtros, f"• Desde: {fecha_desde}")
                elif fecha_hasta:
                    p.drawString(1.2*inch, y_filtros, f"• Hasta: {fecha_hasta}")
                y_filtros -= 0.12*inch
            
            y_filtros -= 0.1*inch
        
        # Resumen de deuda
        p.setFont("Helvetica-Bold", 10)
        p.drawString(1*inch, y_filtros, f"Deuda Total: Bs {format_venezuelan_money(total_deuda_bs)} (${format_venezuelan_money(total_deuda_usd)})")
        
        # Línea separadora
        y_linea = y_filtros - 0.2*inch
        p.line(0.5*inch, y_linea, 8*inch, y_linea)
        
        # Configurar posición inicial para la tabla
        y_position = y_linea - 0.3*inch
        line_height = 0.22*inch
        
        # Encabezados de tabla
        p.setFont("Helvetica-Bold", 8)
        p.drawString(0.6*inch, y_position, "№")
        p.drawString(1*inch, y_position, "Fecha")
        p.drawString(1.8*inch, y_position, "Tasa")
        p.drawString(2.4*inch, y_position, "Total Venta")
        p.drawString(3.4*inch, y_position, "Abono Inicial")
        p.drawString(4.5*inch, y_position, "Saldo Pend.")
        p.drawString(5.6*inch, y_position, "Días")
        p.drawString(6.2*inch, y_position, "Estado")
        
        y_position -= line_height
        p.line(0.5*inch, y_position, 8*inch, y_position)
        y_position -= 0.15*inch
        
        # Datos de ventas
        p.setFont("Helvetica", 7)
        
        for item in ventas_data:
            venta = item['venta']
            dias = item['dias']
            
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                
                # Encabezados en nueva página
                p.setFont("Helvetica-Bold", 8)
                p.drawString(0.6*inch, y_position, "№")
                p.drawString(1*inch, y_position, "Fecha")
                p.drawString(1.8*inch, y_position, "Tasa")
                p.drawString(2.4*inch, y_position, "Total Venta")
                p.drawString(3.4*inch, y_position, "Abono Inicial")
                p.drawString(4.5*inch, y_position, "Saldo Pend.")
                p.drawString(5.6*inch, y_position, "Días")
                p.drawString(6.2*inch, y_position, "Estado")
                
                y_position -= line_height
                p.line(0.5*inch, y_position, 8*inch, y_position)
                y_position -= 0.15*inch
                p.setFont("Helvetica", 7)
            
            # Número de venta
            p.drawString(0.6*inch, y_position, str(venta.ID_Ventas))
            
            # Fecha
            fecha_str = venta.Fecha_Venta.strftime('%d/%m/%Y')
            p.drawString(1*inch, y_position, fecha_str)
            
            # Tasa
            tasa_str = format_venezuelan_money(venta.Tasa_Venta) if venta.Tasa_Venta else "N/A"
            p.drawString(1.8*inch, y_position, tasa_str)
            
            # Total Venta
            total_str = f"Bs {format_venezuelan_money(venta.Total)}"
            p.drawString(2.4*inch, y_position, total_str)
            
            # Abono Inicial
            abono_str = f"Bs {format_venezuelan_money(venta.Abono_Inicial)}"
            p.drawString(3.4*inch, y_position, abono_str)
            
            # Saldo Pendiente
            saldo_str = f"Bs {format_venezuelan_money(venta.Saldo_Pendiente)}"
            p.drawString(4.5*inch, y_position, saldo_str)
            
            # Días
            p.drawString(5.6*inch, y_position, str(dias))
            
            # Estado
            estado_display = {
                'completo': 'Completo',
                'pendiente': 'Pendiente',
                'parcial': 'Parcial'
            }.get(venta.Estado_Pago, venta.Estado_Pago)
            p.drawString(6.2*inch, y_position, estado_display)
            
            y_position -= line_height
        
        # Total
        p.setFont("Helvetica-Bold", 9)
        y_position -= 0.2*inch
        p.drawString(0.6*inch, y_position, f"Total de ventas: {ventas.count()}")
        
        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawString(1*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")
        
        p.showPage()
        p.save()
        
        return response
        
    except Exception as e:
        # En caso de error, generar PDF de error
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="error.pdf"'
        
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-2*inch, "Error al generar el PDF")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-2.5*inch, "Ocurrió un error inesperado al generar el listado.")
        p.drawString(1*inch, height-2.8*inch, f"Error: {str(e)}")
        
        p.showPage()
        p.save()
        
        return response