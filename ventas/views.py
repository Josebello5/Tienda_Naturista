from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
import json
from decimal import Decimal
from .models import Venta, DetalleVenta, Pago
from clientes.models import Cliente
from clientes.forms import ClienteForm
from productos.models import Producto
from lotes.models import Lote
from dashboard.models import TasaCambiaria
from django.db.models import Q
from datetime import datetime
import re
from django.core.files.base import ContentFile
import io
from django.utils import timezone
import pytz
from django.template.loader import render_to_string
from xhtml2pdf import pisa
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import mm, inch
from usuarios.utils import can_void_sales, can_print_reports


def menu_ventas(request):
    # Obtener todas las ventas para permitir filtrado en tiempo real en el cliente
    ventas = Venta.objects.select_related('Cedula').prefetch_related('pagos', 'detalles').all().order_by('-Fecha_Venta')
    
    # Verificar permisos del usuario
    puede_devolver_ventas = can_void_sales(request.user)
    puede_imprimir = can_print_reports(request.user)
    
    # Obtener tasa actual usando zona horaria de Venezuela
    import pytz
    tz_venezuela = pytz.timezone('America/Caracas')
    ahora_venezuela = timezone.now().astimezone(tz_venezuela)
    hoy = ahora_venezuela.date()
    
    tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')
    if tasas_hoy.exists():
        tasa_actual = tasas_hoy.first()
    else:
        tasa_actual = TasaCambiaria.objects.order_by('-fecha_creacion').first()
    
    clientes = Cliente.objects.all().values('cedula', 'nombre', 'apellido')
    clientes_json = json.dumps(list(clientes), ensure_ascii=False)
    
    total_ventas = ventas.count()
    
    # Calcular totales usando los valores guardados en USD
    total_bs = Decimal('0')
    total_usd = Decimal('0')
    subtotal_bs = Decimal('0')
    subtotal_usd = Decimal('0')
    iva_bs = Decimal('0')
    iva_usd = Decimal('0')
    
    # Totales de pagos separados por moneda
    total_pagos_bs = Decimal('0')  # Pagos en bolívares (efectivo_bs, transferencia, pago_movil, etc.)
    total_pagos_ref = Decimal('0')  # Pagos en dólares (efectivo_usd)
    
    for venta in ventas:
        # Usar los valores guardados en la venta
        total_bs += venta.Total
        total_usd += venta.Total_USD
        subtotal_bs += venta.Subtotal
        subtotal_usd += venta.Subtotal_USD
        iva_bs += venta.IVA
        iva_usd += venta.IVA_USD
        
        # Calcular totales de pagos por moneda
        for pago in venta.pagos.all():
            if pago.Monto > 0:  # Solo pagos positivos (no devoluciones)
                if pago.Metodo_Pago == 'efectivo_usd':
                    # Pagos en dólares
                    total_pagos_ref += pago.Monto
                else:
                    # Pagos en bolívares
                    total_pagos_bs += pago.Monto
    
    return render(request, 'ventas/menu_ventas.html', {
        'ventas': ventas,
        'clientes_json': clientes_json,
        'tasa_actual': tasa_actual,
        'total_ventas': total_ventas,
        'total_bs': total_bs,
        'total_usd': total_usd,
        'subtotal_bs': subtotal_bs,
        'subtotal_usd': subtotal_usd,
        'iva_bs': iva_bs,
        'iva_usd': iva_usd,
        'total_pagos_bs': total_pagos_bs,
        'total_pagos_ref': total_pagos_ref,
        'puede_devolver_ventas': puede_devolver_ventas,
        'puede_imprimir': puede_imprimir,
    })


def registrar_venta(request):
    # Obtener tasa actual usando zona horaria de Venezuela
    import pytz
    tz_venezuela = pytz.timezone('America/Caracas')
    ahora_venezuela = timezone.now().astimezone(tz_venezuela)
    hoy = ahora_venezuela.date()
    
    tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')
    if tasas_hoy.exists():
        tasa_actual = tasas_hoy.first()
    else:
        tasa_actual = TasaCambiaria.objects.order_by('-fecha_creacion').first()
    
    return render(request, 'ventas/registrar_venta.html', {
        'tasa_actual': tasa_actual
    })

@csrf_exempt
def buscar_clientes(request):
    query = request.GET.get('q', '').strip()
    
    if len(query) < 2:
        return JsonResponse({'clientes': []})
    
    clientes = Cliente.objects.filter(
        Q(cedula__icontains=query) |
        Q(nombre__icontains=query) |
        Q(apellido__icontains=query)
    )[:10]
    
    clientes_data = []
    for cliente in clientes:
        clientes_data.append({
            'cedula': cliente.cedula,
            'nombre': cliente.nombre,
            'apellido': cliente.apellido,
            'telefono': cliente.telefono or '',
            'direccion': cliente.direccion or '',
            'tipo_cliente': cliente.tipo_cliente
        })
    
    return JsonResponse({'clientes': clientes_data})

@csrf_exempt
def buscar_productos(request):
    query = request.GET.get('q', '').strip()
    
    if len(query) < 2:
        return JsonResponse({'productos': []})
    
    productos = Producto.objects.filter(
        Q(nombre_pro__icontains=query) |
        Q(serial__icontains=query),
        estado='activo'
    )[:15]
    
    productos_data = []
    for producto in productos:
        lotes_validos = Lote.objects.filter(
            id_producto=producto,
            cantidad_disponible__gt=0,
            estado='activo',
            costo_unitario__lte=producto.precio_venta
        )
        
        lotes_costo_mayor = Lote.objects.filter(
            id_producto=producto,
            cantidad_disponible__gt=0,
            estado='activo',
            costo_unitario__gt=producto.precio_venta
        )
        
        stock_total = sum(lote.cantidad_disponible for lote in lotes_validos)
        stock_costo_mayor = sum(lote.cantidad_disponible for lote in lotes_costo_mayor)
        
        if stock_total > 0:
            # CORRECCIÓN: Enviar el precio como número (no string) para evitar problemas de formato
            productos_data.append({
                'id': producto.ID_producto,
                'nombre': producto.nombre_pro,
                'precio_usd': float(producto.precio_venta),  # Convertir Decimal a float
                'precio_formateado': f"${producto.precio_venta:.2f}",  # Para mostrar en la interfaz
                'stock_total': stock_total,
                'stock_costo_mayor': stock_costo_mayor,
                'mensaje_costo_mayor': f"con costo mayor al precio de venta (${producto.precio_venta:.2f})",
                'sujeto_iva': producto.sujeto_iva
            })
    
    return JsonResponse({'productos': productos_data})

@csrf_exempt
def registrar_cliente_venta(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            form_data = {
                'cedula_tipo': data.get('cedula_tipo', 'V'),
                'cedula_numero': data.get('cedula_numero'),
                'nombre': data.get('nombre'),
                'apellido': data.get('apellido'),
                'tipo_cliente': data.get('tipo_cliente', 'particular'),
                'telefono_prefijo': data.get('telefono_prefijo', '0412'),
                'telefono_numero': data.get('telefono_numero', ''),
                'direccion': data.get('direccion', '')
            }
            
            form = ClienteForm(form_data)
            
            if form.is_valid():
                cliente = form.save()
                return JsonResponse({
                    'success': True,
                    'cliente': {
                        'cedula': cliente.cedula,
                        'nombre': cliente.nombre,
                        'apellido': cliente.apellido,
                        'telefono': cliente.telefono or '',
                        'direccion': cliente.direccion or '',
                        'tipo_cliente': cliente.tipo_cliente
                    }
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Errores en el formulario',
                    'errores': form.errors
                })
                
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@transaction.atomic
def procesar_venta(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            cedula_cliente = data.get('cliente_cedula')
            tipo_venta = data.get('tipo_venta')
            productos = data.get('productos', [])
            pagos = data.get('pagos', [])
            devoluciones = data.get('devoluciones', [])
            

# Función para limpiar números con comas - CORREGIDA
            def clean_number(value):
                if isinstance(value, (int, float, Decimal)):
                    # Si ya es un número, devolverlo como string sin formato
                    return str(value)
                elif isinstance(value, str):
                    # Eliminar espacios
                    value = value.strip()
                    # Si está vacío, devolver "0"
                    if not value:
                        return "0"
                    # Reemplazar comas decimales por punto
                    # Si hay punto y coma, eliminar puntos de miles y convertir coma a punto
                    if ',' in value and '.' in value:
                        # Formato: 1.234,56 -> eliminar puntos y reemplazar coma por punto
                        value = value.replace('.', '').replace(',', '.')
                    elif ',' in value:
                        # Formato: 1234,56 -> reemplazar coma por punto
                        # Si hay múltiples comas (miles), eliminar todas
                        if value.count(',') > 1:
                            value = value.replace(',', '')
                        else:
                            # Solo una coma, asumir que es decimal
                            value = value.replace(',', '.')
                    # Si solo tiene punto, dejarlo así (ya está en formato inglés)
                    return value
                else:
                    return str(value)
            
            # Limpiar abono_inicial
            abono_inicial_str = clean_number(str(data.get('abono_inicial', 0)))
            abono_inicial = Decimal(abono_inicial_str) if abono_inicial_str else Decimal('0')
            
            metodo_pago_abono = data.get('metodo_pago_abono', 'efectivo_bs')

            print(f"Tipo de venta recibido: {tipo_venta}")
            print(f"Abono inicial: {abono_inicial}, Método: {metodo_pago_abono}")

            if not cedula_cliente:
                return JsonResponse({'success': False, 'error': 'Cliente es requerido'})
            if not productos:
                return JsonResponse({'success': False, 'error': 'Debe agregar al menos un producto'})

            try:
                cliente = Cliente.objects.get(cedula=cedula_cliente)
            except Cliente.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Cliente no encontrado'})

            tz = pytz.timezone('America/Caracas')
            ahora = timezone.now().astimezone(tz)
            hoy = ahora.date()
            
            tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')
            tasa_actual_obj = tasas_hoy.first() if tasas_hoy.exists() else None
            
            # Si no hay tasa de hoy, usar la última registrada
            if not tasa_actual_obj:
                tasa_actual = TasaCambiaria.objects.order_by('-fecha_creacion').first()
            else:
                tasa_actual = tasa_actual_obj
            
            if not tasa_actual:
                return JsonResponse({'success': False, 'error': 'No hay tasa cambiaria configurada'})

            if tipo_venta == 'credito':
                total_estimado = Decimal('0')
                for producto_data in productos:
                    # Limpiar precio_usd
                    precio_usd_str = clean_number(str(producto_data['precio_usd']))
                    precio_bs = Decimal(precio_usd_str) * tasa_actual.valor
                    cantidad = int(producto_data['cantidad'])
                    try:
                        producto = Producto.objects.get(ID_producto=producto_data['id'])
                        if producto.sujeto_iva == 'si':
                            total_estimado += (precio_bs * cantidad) * Decimal('1.16')
                        else:
                            total_estimado += precio_bs * cantidad
                    except Producto.DoesNotExist:
                        total_estimado += precio_bs * cantidad * Decimal('1.16')
                
                abono_minimo = total_estimado * Decimal('0.20')
                if abono_inicial < abono_minimo:
                    return JsonResponse({
                        'success': False, 
                        'error': f'El abono inicial debe ser al menos el 20% del total (Bs {abono_minimo:.2f})'
                    })

            venta = Venta.objects.create(
                Cedula=cliente,
                Tipo_Venta=tipo_venta,
                Abono_Inicial=abono_inicial,
                Fecha_Venta=ahora
            )

            for producto_data in productos:
                producto_id = producto_data['id']
                cantidad = int(producto_data['cantidad'])
                
                # Limpiar precio_usd
                precio_usd_str = clean_number(str(producto_data['precio_usd']))
                precio_unitario_usd = Decimal(precio_usd_str)
                
                precio_unitario_bs = precio_unitario_usd * tasa_actual.valor
                
                producto = Producto.objects.get(ID_producto=producto_id)
                
                lotes_disponibles = Lote.objects.filter(
                    id_producto_id=producto_id,
                    cantidad_disponible__gt=0,
                    estado='activo',
                    costo_unitario__lte=precio_unitario_usd
                ).order_by('fecha_vencimiento')
                
                cantidad_restante = cantidad
                lotes_utilizados = []
                
                for lote in lotes_disponibles:
                    if cantidad_restante <= 0:
                        break
                    
                    cantidad_a_usar = min(cantidad_restante, lote.cantidad_disponible)
                    
                    DetalleVenta.objects.create(
                        ID_Ventas=venta,
                        ID_lote=lote,
                        ID_Tasa=tasa_actual,
                        Cantidad=cantidad_a_usar,
                        Precio_Unitario=precio_unitario_bs
                    )
                    
                    lote.cantidad_disponible -= cantidad_a_usar
                    if lote.cantidad_disponible == 0:
                        lote.estado = 'agotado'
                    lote.save()
                    
                    cantidad_restante -= cantidad_a_usar
                    lotes_utilizados.append(lote)
                
                if cantidad_restante > 0:
                    lotes_con_costo_mayor = Lote.objects.filter(
                        id_producto_id=producto_id,
                        cantidad_disponible__gt=0,
                        estado='active',
                        costo_unitario__gt=precio_unitario_usd
                    )
                    
                    if lotes_con_costo_mayor.exists():
                        lotes_info = []
                        for lote in lotes_con_costo_mayor:
                            lotes_info.append(f"Lote {lote.codigo_lote} (Costo: ${lote.costo_unitario:.2f} vs Precio: ${precio_unitario_usd:.2f})")
                        
                        raise Exception(
                            f'No hay suficiente stock disponible para el producto "{producto_data["nombre"]}".\n'
                            f'Se necesitan {cantidad} unidades pero solo hay {cantidad - cantidad_restante} disponibles en lotes con costo válido.\n'
                            f'Existen {len(lotes_con_costo_mayor)} lotes con costo mayor al precio de venta:\n'
                            f'{chr(10).join(lotes_info)}\n'
                            f'Actualice el precio del producto o use lotes con costo menor.'
                        )
                    else:
                        raise Exception(f'Stock insuficiente para el producto "{producto_data["nombre"]}". Solo hay {cantidad - cantidad_restante} unidades disponibles.')

            venta.calcular_totales()
            total_venta_bs = venta.Total

            if tipo_venta == 'credito' and abono_inicial > total_venta_bs:
                abono_inicial = total_venta_bs
                venta.Abono_Inicial = abono_inicial
                venta.save()

            total_pagado_bs = Decimal('0')

            for pago_data in pagos:
                metodo_pago = pago_data['metodo']
                
                # Limpiar monto
                monto_str = clean_number(str(pago_data['monto']))
                monto = Decimal(monto_str)
                
                if metodo_pago == 'efectivo_usd':
                    tasa_cambio = tasa_actual.valor
                    comprobante = pago_data.get('comprobante', '')
                    monto_bs = monto * tasa_cambio
                else:
                    tasa_cambio = None
                    comprobante = pago_data.get('comprobante', '')
                    monto_bs = monto
                
                Pago.objects.create(
                    ID_Ventas=venta,
                    Metodo_Pago=metodo_pago,
                    Monto=monto,
                    Tasa_Cambio=tasa_cambio,
                    Comprobante=comprobante,
                    Monto_Bs=monto_bs
                )
                
                total_pagado_bs += monto_bs

            total_efectivo_pagado_bs = Decimal('0')
            
            for pago_data in pagos:
                if pago_data['metodo'] in ['efectivo_bs', 'efectivo_usd']:
                    # Limpiar monto
                    monto_str = clean_number(str(pago_data['monto']))
                    monto = Decimal(monto_str)
                    
                    if pago_data['metodo'] == 'efectivo_usd':
                        total_efectivo_pagado_bs += monto * tasa_actual.valor
                    else:
                        total_efectivo_pagado_bs += monto

            excedente = total_efectivo_pagado_bs - total_venta_bs
            excedente = excedente.quantize(Decimal('0.01'))

            print(f"Validando venta: devoluciones: {devoluciones}, excedente: {excedente}, total: {total_venta_bs}, totalPagado: {total_pagado_bs}")

            total_devolucion_bs = Decimal('0')
            total_devolucion_usd = Decimal('0')
            hay_devolucion_usd = False

            if devoluciones and excedente <= Decimal('0'):
                return JsonResponse({
                    'success': False, 
                    'error': 'No hay excedente en efectivo para realizar devoluciones'
                })

            for devolucion_data in devoluciones:
                metodo_devolucion = devolucion_data['metodo']
                
                if metodo_devolucion not in ['efectivo_bs', 'efectivo_usd']:
                    return JsonResponse({
                        'success': False, 
                        'error': 'Las devoluciones solo están permitidas en efectivo (Bs o $)'
                    })
                
                # Limpiar montos
                monto_bs_str = clean_number(str(devolucion_data.get('montoBs', 0)))
                monto_usd_str = clean_number(str(devolucion_data.get('montoUsd', 0)))
                
                monto_bs = Decimal(monto_bs_str).quantize(Decimal('0.01'))
                monto_usd = Decimal(monto_usd_str).quantize(Decimal('0.01'))
                comprobante = devolucion_data.get('comprobante', '')

                if monto_bs <= Decimal('0') or monto_usd <= Decimal('0'):
                    return JsonResponse({
                        'success': False, 
                        'error': 'Los montos de devolución deben ser mayores a cero'
                    })

                if metodo_devolucion == 'efectivo_usd':
                    monto_devolucion = -monto_usd
                    tasa_cambio_devolucion = tasa_actual.valor
                    monto_bs_devolucion = -monto_bs
                    hay_devolucion_usd = True
                else:
                    monto_devolucion = -monto_bs
                    tasa_cambio_devolucion = None
                    monto_bs_devolucion = -monto_bs

                Pago.objects.create(
                    ID_Ventas=venta,
                    Metodo_Pago=metodo_devolucion,
                    Monto=monto_devolucion,
                    Tasa_Cambio=tasa_cambio_devolucion,
                    Comprobante=comprobante if comprobante else 'N/A',
                    Monto_Bs=monto_bs_devolucion
                )

                total_devolucion_bs += monto_bs
                total_devolucion_usd += monto_usd

            if devoluciones:
                diferencia = abs(total_devolucion_bs - excedente)
                if diferencia > Decimal('0.05'):
                    return JsonResponse({
                        'success': False,
                        'error': f'Las devoluciones (Bs {total_devolucion_bs:.2f}) no coinciden con el excedente en efectivo (Bs {excedente:.2f}). Diferencia: Bs {diferencia:.2f}'
                    })

            venta.calcular_totales()

            # Generar PDF del ticket
            pdf_bytes = generar_pdf_ticket_venta(venta.ID_Ventas)
            venta.comprobante.save(f'venta_{venta.ID_Ventas}.pdf', ContentFile(pdf_bytes))
            venta.save()

            return JsonResponse({
                'success': True,
                'venta_id': venta.ID_Ventas,
                'total': str(venta.Total),
                'cambio_bs': str(total_devolucion_bs),
                'cambio_usd': str(total_devolucion_usd),
                'hay_devolucion_usd': hay_devolucion_usd,
                'mensaje': 'Venta registrada exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@transaction.atomic
def devolver_venta(request, venta_id):
    if request.method == 'POST':
        try:
            venta = get_object_or_404(Venta, ID_Ventas=venta_id)
            
            if venta.anulada:
                return JsonResponse({'success': False, 'error': 'Esta venta ya fue anulada anteriormente'})
            
            detalles = venta.detalles.all()
            for detalle in detalles:
                lote = detalle.ID_lote
                lote.cantidad_disponible += detalle.Cantidad
                
                if lote.estado == 'agotado' and lote.cantidad_disponible > 0:
                    lote.estado = 'activo'
                
                lote.save()
            
            venta.anulada = True
            venta.save()
            
            messages.success(request, f'Venta #{venta_id} anulada exitosamente. Productos reintegrados al stock.')
            
            return JsonResponse({
                'success': True,
                'mensaje': f'Venta #{venta_id} anulada exitosamente. Productos reintegrados al stock.'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

def generar_pdf_ticket_venta(venta_id):
    """Genera PDF del ticket usando xhtml2pdf con tamaño fijo para impresoras térmicas - CORREGIDO"""
    try:
        venta = get_object_or_404(Venta, ID_Ventas=venta_id)
        
        # Obtener contexto CORREGIDO para el template
        context = venta.get_html_context()
        
        # Asegurar que la tasa esté en el contexto
        if 'tasa_venta' not in context:
            context['tasa_venta'] = venta.get_tasa_venta()
        
        # Renderizar el template HTML
        html_string = render_to_string('ventas/ticket_pdf.html', context)
        
        # Crear buffer para el PDF
        result = io.BytesIO()
        
        # CORRECCIÓN: Eliminar completamente el uso de @page en el CSS
        # Usar un enfoque más simple sin default_css que cause problemas
        
        # Convertir HTML a PDF - CORRECCIÓN: Sin default_css problemático
        pisa_status = pisa.CreatePDF(
            src=io.BytesIO(html_string.encode("UTF-8")),
            dest=result,
            encoding='UTF-8',
            show_error_as_pdf=True,
            link_callback=None,
            default_css=''  # Cadena vacía para evitar errores de @page
        )
        
        if pisa_status.err:
            print(f"Error de xhtml2pdf: {pisa_status.err}")
            # Generar PDF de error simple usando reportlab
            buffer = io.BytesIO()
            p = canvas.Canvas(buffer, pagesize=(227, 400))  # 80mm = 227 puntos
            p.setFont("Helvetica", 8)
            p.drawString(10, 380, "ERROR AL GENERAR TICKET")
            p.drawString(10, 360, f"Venta ID: {venta_id}")
            p.drawString(10, 340, "Contacte al administrador del sistema.")
            p.save()
            buffer.seek(0)
            return buffer.getvalue()
        
        return result.getvalue()
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error al generar PDF: {str(e)}")
        
        # Generar PDF de error simple usando reportlab
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=(227, 400))
        p.setFont("Helvetica", 8)
        p.drawString(10, 380, "ERROR AL GENERAR TICKET")
        p.drawString(10, 360, f"Venta ID: {venta_id}")
        p.drawString(10, 340, f"Error: {str(e)[:50]}...")
        p.drawString(10, 320, "Contacte al administrador del sistema.")
        p.save()
        buffer.seek(0)
        return buffer.getvalue()

def descargar_comprobante(request, venta_id):
    """Descarga el comprobante PDF de la venta - CORREGIDO"""
    try:
        venta = get_object_or_404(Venta, ID_Ventas=venta_id)
        
        if not venta.comprobante:
            # Generar PDF si no existe usando la MISMA función
            pdf_bytes = generar_pdf_ticket_venta(venta_id)
            venta.comprobante.save(f'venta_{venta_id}.pdf', ContentFile(pdf_bytes))
            venta.save()
        
        # Leer el archivo generado
        if venta.comprobante:
            venta.comprobante.open('rb')
            pdf_content = venta.comprobante.read()
            venta.comprobante.close()
        else:
            # Generar PDF en tiempo real
            pdf_content = generar_pdf_ticket_venta(venta_id)
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="venta_{venta_id}.pdf"'
        return response

    except Exception as e:
        print(f"Error al descargar comprobante: {str(e)}")
        # Generar PDF de error
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=(227, 400))
        p.setFont("Helvetica", 8)
        p.drawString(10, 380, "ERROR AL DESCARGAR TICKET")
        p.drawString(10, 360, f"Venta ID: {venta_id}")
        p.drawString(10, 340, f"Error: {str(e)[:50]}...")
        p.save()
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="error_venta_{venta_id}.pdf"'
        return response

def ver_comprobante(request, venta_id):
    """Vista previa HTML del ticket"""
    try:
        venta = get_object_or_404(Venta, ID_Ventas=venta_id)
        
        # Obtener contexto para el template
        context = venta.get_html_context()
        
        # Renderizar template HTML para vista previa
        return render(request, 'ventas/ticket_preview.html', context)
        
    except Exception as e:
        return HttpResponse(f"Error al mostrar comprobante: {str(e)}", status=500)

# Mantener la función original para reportes generales (usa reportlab)
def generar_pdf_ventas(request):
    """Función para reporte general de ventas"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        
        query = request.GET.get('q', '')
        cliente_cedula = request.GET.get('cliente', '')
        estado_pago = request.GET.get('estado_pago', '')
        tipo_venta = request.GET.get('tipo_venta', '')
        metodo_pago = request.GET.get('metodo_pago', '')
        anulada = request.GET.get('anulada', '')
        fecha_desde = request.GET.get('fecha_desde', '')
        fecha_hasta = request.GET.get('fecha_hasta', '')
        moneda = request.GET.get('moneda', 'bs')

        ventas = Venta.objects.select_related('Cedula').prefetch_related('pagos', 'detalles').all().order_by('-Fecha_Venta')

        if query:
            ventas = ventas.filter(
                Q(ID_Ventas__icontains=query) |
                Q(Cedula__nombre__icontains=query) |
                Q(Cedula__apellido__icontains=query) |
                Q(Cedula__cedula__icontains=query)
            )
        if cliente_cedula:
            ventas = ventas.filter(Cedula__cedula=cliente_cedula)
        if estado_pago:
            ventas = ventas.filter(Estado_Pago=estado_pago)
        if tipo_venta:
            ventas = ventas.filter(Tipo_Venta=tipo_venta)
        if metodo_pago:
            ventas = ventas.filter(pagos__Metodo_Pago=metodo_pago).distinct()
        if anulada:
            if anulada == 'si':
                ventas = ventas.filter(anulada=True)
            else:
                ventas = ventas.filter(anulada=False)
        
        if fecha_desde and fecha_hasta:
            ventas = ventas.filter(Fecha_Venta__date__range=[fecha_desde, fecha_hasta])
        elif fecha_desde:
            ventas = ventas.filter(Fecha_Venta__date__gte=fecha_desde)
        elif fecha_hasta:
            ventas = ventas.filter(Fecha_Venta__date__lte=fecha_hasta)

        hoy = timezone.now().date()
        tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')
        if tasas_hoy.exists():
            tasa_actual = tasas_hoy.first()
        else:
            tasa_actual = TasaCambiaria.objects.order_by('-fecha_creacion').first()

        if not ventas.exists():
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="ventas_sin_resultados.pdf"'
            p = canvas.Canvas(response, pagesize=letter)
            width, height = letter
            p.setFont("Helvetica-Bold", 16)
            p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
            p.setFont("Helvetica", 12)
            p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
            p.setFont("Helvetica", 10)
            fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
            p.drawString(1*inch, height-1.6*inch, f"Reporte de Ventas - {fecha_actual}")
            p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)
            p.setFont("Helvetica-Bold", 14)
            p.drawString(2*inch, height-3*inch, "No hay ventas con los filtros aplicados")
            p.setFont("Helvetica", 12)
            p.drawString(1.5*inch, height-3.5*inch, "Por favor, ajuste los criterios de búsqueda e intente nuevamente.")
            p.showPage()
            p.save()
            return response

        response = HttpResponse(content_type='application/pdf')
        
        filename_parts = ["ventas"]
        if query:
            filename_parts.append(f"busqueda_{query.replace(' ', '_')[:20]}")
        if cliente_cedula:
            filename_parts.append(f"cliente_{cliente_cedula}")
        if estado_pago:
            filename_parts.append(f"estado_{estado_pago}")
        if tipo_venta:
            filename_parts.append(f"tipo_{tipo_venta}")
        if metodo_pago:
            filename_parts.append(f"metodo_{metodo_pago}")
        if anulada:
            filename_parts.append(f"anulada_{anulada}")
        if fecha_desde and fecha_hasta:
            desde_str = fecha_desde.replace('-', '')
            hasta_str = fecha_hasta.replace('-', '')
            filename_parts.append(f"fecha_{desde_str}_{hasta_str}")
        elif fecha_desde:
            desde_str = fecha_desde.replace('-', '')
            filename_parts.append(f"desde_{desde_str}")
        elif fecha_hasta:
            hasta_str = fecha_hasta.replace('-', '')
            filename_parts.append(f"hasta_{hasta_str}")
        filename_parts.append(moneda)
        filename = "_".join(filename_parts) + ".pdf"
        
        if len(filename) > 100:
            filename = "ventas_filtradas.pdf"
        
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter

        p.setTitle("Reporte de Ventas - Tienda Naturista")

        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        p.setFont("Helvetica", 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        p.drawString(1*inch, height-1.6*inch, f"Reporte de Ventas - {fecha_actual}")
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)

        filtros_detalle = []
        if query:
            filtros_detalle.append(f"Búsqueda: '{query}'")
        if cliente_cedula:
            try:
                cliente = Cliente.objects.get(cedula=cliente_cedula)
                filtros_detalle.append(f"Cliente: {cliente.nombre} {cliente.apellido}")
            except Cliente.DoesNotExist:
                filtros_detalle.append(f"Cliente: {cliente_cedula}")
        if estado_pago:
            estado_display = dict(Venta.ESTADO_PAGO_CHOICES).get(estado_pago, estado_pago)
            filtros_detalle.append(f"Estado Pago: {estado_display}")
        if tipo_venta:
            tipo_display = dict(Venta.TIPO_VENTA_CHOICES).get(tipo_venta, tipo_venta)
            filtros_detalle.append(f"Tipo Venta: {tipo_display}")
        if metodo_pago:
            metodo_display = dict(Pago.METODO_PAGO_CHOICES).get(metodo_pago, metodo_pago)
            filtros_detalle.append(f"Método Pago: {metodo_display}")
        if anulada:
            anulada_display = "Anuladas" if anulada == 'si' else "No anuladas"
            filtros_detalle.append(f"Ventas: {anulada_display}")
        if fecha_desde and fecha_hasta:
            filtros_detalle.append(f"Fecha: {fecha_desde} a {fecha_hasta}")
        elif fecha_desde:
            filtros_detalle.append(f"Fecha desde: {fecha_desde}")
        elif fecha_hasta:
            filtros_detalle.append(f"Fecha hasta: {fecha_hasta}")
        filtros_detalle.append(f"Moneda: {moneda.upper()}")

        if filtros_detalle:
            y_position = height - 2.0*inch
            p.setFont("Helvetica-Bold", 9)
            p.drawString(1*inch, y_position, "Filtros aplicados:")
            p.setFont("Helvetica", 8)
            for filtro in filtros_detalle:
                y_position -= 0.15*inch
                p.drawString(1.2*inch, y_position, filtro)
            y_position -= 0.2*inch

        y_position -= 0.2*inch
        line_height = 0.2*inch

        p.setFont("Helvetica-Bold", 8)
        p.drawString(0.5*inch, y_position, "ID")
        p.drawString(0.8*inch, y_position, "CLIENTE")
        p.drawString(2.5*inch, y_position, "FECHA")
        p.drawString(3.2*inch, y_position, "TASA")
        p.drawString(3.7*inch, y_position, "SUBTOTAL")
        p.drawString(4.5*inch, y_position, "IVA")
        p.drawString(5.0*inch, y_position, "TOTAL")
        p.drawString(5.7*inch, y_position, "ESTADO")
        p.drawString(6.3*inch, y_position, "TIPO")
        p.drawString(6.8*inch, y_position, "MÉTODO")

        y_position -= line_height
        p.line(0.5*inch, y_position, 7.8*inch, y_position)
        y_position -= 0.1*inch

        p.setFont("Helvetica", 7)

        total_subtotal = 0
        total_iva = 0
        total_general = 0

        for venta in ventas:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                p.setFont("Helvetica", 7)
                p.setFont("Helvetica-Bold", 8)
                p.drawString(0.5*inch, y_position, "ID")
                p.drawString(0.8*inch, y_position, "CLIENTE")
                p.drawString(2.5*inch, y_position, "FECHA")
                p.drawString(3.2*inch, y_position, "TASA")
                p.drawString(3.7*inch, y_position, "SUBTOTAL")
                p.drawString(4.5*inch, y_position, "IVA")
                p.drawString(5.0*inch, y_position, "TOTAL")
                p.drawString(5.7*inch, y_position, "ESTADO")
                p.drawString(6.3*inch, y_position, "TIPO")
                p.drawString(6.8*inch, y_position, "MÉTODO")
                y_position -= line_height
                p.line(0.5*inch, y_position, 7.8*inch, y_position)
                y_position -= 0.1*inch
                p.setFont("Helvetica", 7)

            cliente_nombre = f"{venta.Cedula.nombre} {venta.Cedula.apellido}"
            if len(cliente_nombre) > 20:
                cliente_nombre = cliente_nombre[:17] + "..."

            fecha_venta = venta.Fecha_Venta.strftime("%d/%m/%Y %H:%M")

            if moneda == 'usd':
                # Usar los valores USD guardados en la venta
                subtotal = float(venta.Subtotal_USD) if venta.Subtotal_USD else 0
                iva = float(venta.IVA_USD) if venta.IVA_USD else 0
                total = float(venta.Total_USD) if venta.Total_USD else 0
                simbolo = "$"
            else:
                subtotal = venta.Subtotal
                iva = venta.IVA
                total = venta.Total
                simbolo = "Bs"

            total_subtotal += subtotal
            total_iva += iva
            total_general += total

            subtotal_str = f"{simbolo} {subtotal:.2f}"
            iva_str = f"{simbolo} {iva:.2f}"
            total_str = f"{simbolo} {total:.2f}"

            p.drawString(0.5*inch, y_position, str(venta.ID_Ventas))
            p.drawString(0.8*inch, y_position, cliente_nombre)
            p.drawString(2.5*inch, y_position, fecha_venta)
            p.drawString(3.2*inch, y_position, f"{venta.get_tasa_venta():.2f}")
            p.drawString(3.7*inch, y_position, subtotal_str)
            p.drawString(4.5*inch, y_position, iva_str)
            p.drawString(5.0*inch, y_position, total_str)
            p.drawString(5.7*inch, y_position, venta.get_Estado_Pago_display()[:10])
            p.drawString(6.3*inch, y_position, venta.get_Tipo_Venta_display()[:10])
            p.drawString(6.8*inch, y_position, venta.get_metodo_pago_principal()[:10])

            y_position -= line_height

        p.setFont("Helvetica-Bold", 10)
        y_position -= 0.3*inch
        p.drawString(0.5*inch, y_position, f"Total de ventas: {ventas.count()}")
        y_position -= 0.2*inch
        p.drawString(0.5*inch, y_position, f"Subtotal: {simbolo} {total_subtotal:.2f}")
        y_position -= 0.2*inch
        p.drawString(0.5*inch, y_position, f"IVA: {simbolo} {total_iva:.2f}")
        y_position -= 0.2*inch
        p.drawString(0.5*inch, y_position, f"Total General: {simbolo} {total_general:.2f}")

        p.setFont("Helvetica-Oblique", 8)
        p.drawString(0.5*inch, 0.5*inch, "Sistema de Gestión - Tienda Naturista")

        p.showPage()
        p.save()

        return response

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al generar PDF de ventas: {str(e)}")

        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="error_ventas.pdf"'
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-2*inch, "Error al generar el PDF")
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-2.5*inch, "Ocurrió un error inesperado al generar el reporte.")
        p.drawString(1*inch, height-3*inch, "Por favor, intente nuevamente.")
        p.showPage()
        p.save()
        return response