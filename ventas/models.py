from django.db import models
from clientes.models import Cliente
from lotes.models import Lote
from dashboard.models import TasaCambiaria
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
import pytz
import json

class Venta(models.Model):
    ESTADO_PAGO_CHOICES = [
        ('completo', 'Completo'),
        ('pendiente', 'Pendiente'),
        ('parcial', 'Pago Parcial'),
    ]
    
    TIPO_VENTA_CHOICES = [
        ('contado', 'Contado'),
        ('credito', 'Crédito'),
    ]
    
    ID_Ventas = models.AutoField(primary_key=True)
    Cedula = models.ForeignKey(Cliente, on_delete=models.CASCADE, db_column='Cedula')
    
    def default_fecha_venezuela():
        tz = pytz.timezone('America/Caracas')
        return timezone.now().astimezone(tz)
    
    Fecha_Venta = models.DateTimeField(default=default_fecha_venezuela)
    
    # Campos en Bolívares
    Subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    IVA = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Abono_Inicial = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Saldo_Pendiente = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Campos en USD (calculados con la tasa de la venta)
    Tasa_Venta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    Subtotal_USD = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    IVA_USD = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Total_USD = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Saldo_Pendiente_USD = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    Estado_Pago = models.CharField(max_length=10, choices=ESTADO_PAGO_CHOICES, default='pendiente')
    Tipo_Venta = models.CharField(max_length=10, choices=TIPO_VENTA_CHOICES, default='contado')
    comprobante = models.FileField(upload_to='comprobantes/', null=True, blank=True)
    anulada = models.BooleanField(default=False)

    class Meta:
        db_table = 'ventas'
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'

    def __str__(self):
        return f"Venta {self.ID_Ventas} - {self.Cedula.nombre} {self.Cedula.apellido}"
    
    def calcular_totales(self):
        detalles = self.detalles.all()
        
        subtotal_con_iva = Decimal('0')
        subtotal_sin_iva = Decimal('0')
        
        # Obtener la tasa de la venta (de los detalles)
        if detalles.exists() and not self.Tasa_Venta:
            self.Tasa_Venta = detalles.first().ID_Tasa.valor
        
        for detalle in detalles:
            producto = detalle.ID_lote.id_producto
            subtotal_detalle = detalle.Precio_Unitario * detalle.Cantidad
            
            if producto.sujeto_iva == 'si':
                subtotal_con_iva += subtotal_detalle
            else:
                subtotal_sin_iva += subtotal_detalle
        
        # Calcular totales en Bs
        self.Subtotal = subtotal_con_iva + subtotal_sin_iva
        self.IVA = subtotal_con_iva * Decimal('0.16')
        self.Total = self.Subtotal + self.IVA
        
        # Calcular totales en USD usando la tasa de la venta
        if self.Tasa_Venta and self.Tasa_Venta > 0:
            self.Subtotal_USD = self.Subtotal / self.Tasa_Venta
            self.IVA_USD = self.IVA / self.Tasa_Venta
            self.Total_USD = self.Total / self.Tasa_Venta
        else:
            self.Subtotal_USD = Decimal('0')
            self.IVA_USD = Decimal('0')
            self.Total_USD = Decimal('0')
        
        # Calcular total pagado desde todos los pagos (en Bs)
        total_pagado_bs = sum(pago.Monto_Bs for pago in self.pagos.all() if pago.Monto_Bs > 0)
        
        # Calcular total pagado en USD (sumando los pagos según su método)
        total_pagado_usd = Decimal('0')
        for pago in self.pagos.all():
            if pago.Monto > 0:
                if pago.Metodo_Pago == 'efectivo_usd':
                    # Para pagos en USD, usar el monto directo
                    total_pagado_usd += pago.Monto
                else:
                    # Para pagos en Bs, convertir a USD usando la tasa de la venta
                    if self.Tasa_Venta and self.Tasa_Venta > 0:
                        total_pagado_usd += pago.Monto / self.Tasa_Venta
        
        if self.Tipo_Venta == 'credito':
            # Para crédito, establecer abono inicial si no existe
            if self.Abono_Inicial <= Decimal('0'):
                abono_minimo = self.Total * Decimal('0.20')
                abono_maximo = self.Total * Decimal('0.80')
                
                if self.Abono_Inicial < abono_minimo:
                    self.Abono_Inicial = abono_minimo
                
                if self.Abono_Inicial > abono_maximo:
                    self.Abono_Inicial = abono_maximo
            
            # Calcular saldo pendiente en Bs y USD
            self.Saldo_Pendiente = max(Decimal('0'), self.Total - total_pagado_bs)
            self.Saldo_Pendiente_USD = max(Decimal('0'), self.Total_USD - total_pagado_usd)
            
            # Actualizar estado basado en el saldo pendiente
            if self.Saldo_Pendiente_USD <= Decimal('0.01'):  # Tolerancia de 1 centavo
                self.Estado_Pago = 'completo'
                self.Saldo_Pendiente = Decimal('0')
                self.Saldo_Pendiente_USD = Decimal('0')
            elif total_pagado_usd > Decimal('0'):
                self.Estado_Pago = 'parcial'
            else:
                self.Estado_Pago = 'pendiente'
        else:
            # Para contado
            self.Abono_Inicial = total_pagado_bs
            self.Saldo_Pendiente = Decimal('0')
            self.Saldo_Pendiente_USD = Decimal('0')
            self.Estado_Pago = 'completo'
        
        self.save()

    def get_tasa_venta(self):
        """Obtiene la tasa de cambio usada en la venta"""
        if self.Tasa_Venta:
            return float(self.Tasa_Venta)
        # Fallback: obtener de los detalles
        detalles = self.detalles.all()
        if detalles.exists():
            tasa = detalles.first().ID_Tasa.valor
            return float(tasa) if tasa else 0
        return 0

    def get_subtotal_usd(self):
        """Obtiene el subtotal en USD (valor guardado)"""
        return float(self.Subtotal_USD) if self.Subtotal_USD else 0

    def get_iva_usd(self):
        """Obtiene el IVA en USD (valor guardado)"""
        return float(self.IVA_USD) if self.IVA_USD else 0

    def get_total_usd(self):
        """Obtiene el total en USD (valor guardado)"""
        return float(self.Total_USD) if self.Total_USD else 0

    def get_metodo_pago_principal(self):
        pagos = self.pagos.filter(Monto__gt=0)
        if pagos.exists():
            return pagos.first().get_Metodo_Pago_display()
        return 'No especificado'

    def get_metodo_pago_codigo(self):
        pagos = self.pagos.filter(Monto__gt=0)
        if pagos.exists():
            return pagos.first().Metodo_Pago
        return 'efectivo_bs'

    def get_total_pagado_por_metodo(self, metodo):
        return sum(pago.Monto for pago in self.pagos.filter(Metodo_Pago=metodo, Monto__gt=0))

    def get_total_devuelto_por_metodo(self, metodo):
        return abs(sum(pago.Monto for pago in self.pagos.filter(Metodo_Pago=metodo, Monto__lt=0)))
    
    def get_total_pagado_bs(self):
        """Obtiene el total pagado en Bs (métodos en bolívares)"""
        total = Decimal('0')
        for pago in self.pagos.filter(Monto__gt=0):
            if pago.Metodo_Pago != 'efectivo_usd':
                total += pago.Monto
        return total
    
    def get_total_pagado_usd(self):
        """Obtiene el total pagado en USD (efectivo_usd)"""
        total = Decimal('0')
        for pago in self.pagos.filter(Monto__gt=0, Metodo_Pago='efectivo_usd'):
            total += pago.Monto
        return total
    
    def get_equivalente_total_bs(self):
        """Obtiene el equivalente total en Bs (Bs + USD convertido)"""
        total_bs = self.get_total_pagado_bs()
        total_usd = self.get_total_pagado_usd()
        tasa = Decimal(str(self.get_tasa_venta()))
        return total_bs + (total_usd * tasa)


    def get_html_context(self):
        """Genera el contexto para el template HTML del ticket"""
        detalles = self.detalles.select_related('ID_lote__id_producto').all()
        pagos = self.pagos.all()
        
        # Función para formatear números con formato venezolano
        def format_number_venezuelan(value):
            try:
                # Convertir Decimal a string
                if isinstance(value, Decimal):
                    value_str = str(value)
                else:
                    value_str = str(value)
                
                # Separar parte entera y decimal
                parts = value_str.split('.')
                integer_part = parts[0]
                decimal_part = parts[1] if len(parts) > 1 else '00'
                
                # Si la parte decimal tiene menos de 2 dígitos, completar
                if len(decimal_part) == 1:
                    decimal_part += '0'
                elif len(decimal_part) > 2:
                    decimal_part = decimal_part[:2]
                
                # Agregar puntos cada 3 dígitos (de derecha a izquierda)
                formatted_integer = ''
                for i in range(len(integer_part)-1, -1, -1):
                    formatted_integer = integer_part[i] + formatted_integer
                    if (len(integer_part) - i) % 3 == 0 and i > 0:
                        formatted_integer = '.' + formatted_integer
                
                return f"{formatted_integer},{decimal_part}"
            except:
                return str(value)
        
        # Agrupar productos por ID del producto (no por serial) - CORREGIDO
        productos_agrupados = {}
        for detalle in detalles:
            producto = detalle.ID_lote.id_producto
            producto_id = producto.ID_producto  # Usar ID en lugar de serial
            producto_nombre = producto.nombre_pro
            
            # Calcular precio sin IVA y total con IVA
            precio_con_iva = detalle.Precio_Unitario
            if producto.sujeto_iva == 'si':
                # Si tiene IVA, el precio mostrado debe ser sin IVA
                precio_sin_iva = precio_con_iva / Decimal('1.16')
            else:
                # Si no tiene IVA, el precio es el mismo
                precio_sin_iva = precio_con_iva
            
            # El subtotal es precio_con_iva × cantidad (ya incluye IVA si aplica)
            subtotal_con_iva = precio_con_iva * detalle.Cantidad
            
            # CORRECCIÓN: Usar ID del producto como clave para agrupar
            if producto_id not in productos_agrupados:
                productos_agrupados[producto_id] = {
                    'nombre': producto_nombre,
                    'cantidad': 0,
                    'precio_sin_iva': precio_sin_iva,  # Precio unitario SIN IVA
                    'subtotal': Decimal('0'),  # Total CON IVA
                    'sujeto_iva': producto.sujeto_iva
                }
            productos_agrupados[producto_id]['cantidad'] += detalle.Cantidad
            productos_agrupados[producto_id]['subtotal'] += subtotal_con_iva
        
        # Calcular subtotal e IVA correctamente considerando productos exentos
        subtotal_con_iva = sum(detalle.Subtotal_Detalle for detalle in detalles 
                            if detalle.ID_lote.id_producto.sujeto_iva == 'si')
        subtotal_sin_iva = sum(detalle.Subtotal_Detalle for detalle in detalles 
                            if detalle.ID_lote.id_producto.sujeto_iva == 'no')
        
        iva_calculado = subtotal_con_iva * Decimal('0.16')
        total_calculado = subtotal_con_iva + subtotal_sin_iva + iva_calculado
        
        # Calcular cambio
        pagos_negativos = [pago for pago in pagos if pago.Monto < 0]
        cambio_bs = abs(sum(pago.Monto_Bs for pago in pagos_negativos))
        cambio_usd = abs(sum(pago.Monto for pago in pagos_negativos if pago.Metodo_Pago == 'efectivo_usd'))
        
        # Formatear fecha
        tz = pytz.timezone('America/Caracas')
        fecha_venta = self.Fecha_Venta.astimezone(tz)
        
        # Formatear montos con formato venezolano
        subtotal_formatted = format_number_venezuelan(subtotal_con_iva + subtotal_sin_iva)
        iva_formatted = format_number_venezuelan(iva_calculado)
        total_formatted = format_number_venezuelan(total_calculado)
        abono_formatted = format_number_venezuelan(self.Abono_Inicial)
        saldo_formatted = format_number_venezuelan(self.Saldo_Pendiente)
        cambio_bs_formatted = format_number_venezuelan(cambio_bs)
        cambio_usd_formatted = format_number_venezuelan(cambio_usd)
        
        # Formatear precios de productos
        for producto_id, datos in productos_agrupados.items():
            datos['precio_sin_iva_formatted'] = format_number_venezuelan(datos['precio_sin_iva'])
            datos['subtotal_formatted'] = format_number_venezuelan(datos['subtotal'])
        
        # Filtrar solo pagos positivos (no incluir devoluciones)
        pagos_positivos = []
        total_pagado_bs = Decimal('0')  # Total pagado en Bs (métodos Bs)
        total_pagado_usd = Decimal('0')  # Total pagado en USD (efectivo_usd)
        
        for pago in pagos:
            if pago.Monto > 0:
                pago_dict = {
                    'Metodo_Pago': pago.Metodo_Pago,
                    'Monto': pago.Monto,
                    'Monto_Bs': pago.Monto_Bs,
                    'Comprobante': pago.Comprobante,
                    'get_Metodo_Pago_display': pago.get_Metodo_Pago_display()
                }
                
                # Formatear montos de pagos
                if pago.Metodo_Pago == 'efectivo_usd':
                    pago_dict['Monto_formatted'] = f"${format_number_venezuelan(pago.Monto)}"
                    pago_dict['Monto_Bs_formatted'] = f"Bs {format_number_venezuelan(pago.Monto_Bs)}"
                    total_pagado_usd += pago.Monto
                else:
                    pago_dict['Monto_formatted'] = f"Bs {format_number_venezuelan(pago.Monto)}"
                    pago_dict['Monto_Bs_formatted'] = f"Bs {format_number_venezuelan(pago.Monto_Bs)}"
                    total_pagado_bs += pago.Monto
                
                pagos_positivos.append(pago_dict)
        
        # Calcular equivalente total en Bs
        equivalente_usd_en_bs = total_pagado_usd * Decimal(str(self.get_tasa_venta()))
        equivalente_total_bs = total_pagado_bs + equivalente_usd_en_bs
        
        # Formatear totales de pago
        total_pagado_bs_formatted = format_number_venezuelan(total_pagado_bs)
        total_pagado_usd_formatted = format_number_venezuelan(total_pagado_usd)
        equivalente_total_bs_formatted = format_number_venezuelan(equivalente_total_bs)
        
        context = {
            'venta': self,
            'productos_agrupados': productos_agrupados,
            'pagos_positivos': pagos_positivos,
            'cambio_bs': cambio_bs,
            'cambio_usd': cambio_usd,
            'cambio_bs_formatted': cambio_bs_formatted,
            'cambio_usd_formatted': cambio_usd_formatted,
            'fecha_formateada': fecha_venta.strftime("%d/%m/%Y %H:%M"),
            'tasa_venta': self.get_tasa_venta(),
            'subtotal_formatted': subtotal_formatted,
            'iva_formatted': iva_formatted,
            'total_formatted': total_formatted,
            'abono_formatted': abono_formatted,
            'saldo_formatted': saldo_formatted,
            # Desglose de pago
            'total_pagado_bs': total_pagado_bs,
            'total_pagado_usd': total_pagado_usd,
            'equivalente_total_bs': equivalente_total_bs,
            'total_pagado_bs_formatted': total_pagado_bs_formatted,
            'total_pagado_usd_formatted': total_pagado_usd_formatted,
            'equivalente_total_bs_formatted': equivalente_total_bs_formatted,
        }
        
        # Preparar lista de abonos detallados con información de tasas
        abonos_detallados = []
        if self.Tipo_Venta == 'credito':
            for abono in self.abonos.filter(anulado=False).order_by('Fecha_Abono'):
                # Calcular equivalente en USD
                if abono.Metodo_Pago == 'efectivo_usd':
                    monto_usd = abono.Monto_Abono
                    monto_bs = abono.Monto_Abono_Bs
                else:
                    monto_bs = abono.Monto_Abono_Bs
                    # Convertir a USD usando la tasa del abono
                    tasa_abono = abono.Tasa_Cambio if abono.Tasa_Cambio else self.Tasa_Venta
                    monto_usd = monto_bs / tasa_abono if tasa_abono > 0 else Decimal('0')
                
                abonos_detallados.append({
                    'id': abono.ID_Abono,
                    'fecha': abono.Fecha_Abono.astimezone(tz).strftime('%d/%m/%Y'),
                    'metodo': abono.get_Metodo_Pago_display(),
                    'monto_bs': abono.Monto_Abono_Bs,
                    'monto_bs_formatted': format_number_venezuelan(abono.Monto_Abono_Bs),
                    'monto_usd': monto_usd,
                    'monto_usd_formatted': format_number_venezuelan(monto_usd),
                    'tasa_abono': abono.Tasa_Cambio if abono.Tasa_Cambio else self.Tasa_Venta,
                    'tasa_abono_formatted': format_number_venezuelan(abono.Tasa_Cambio if abono.Tasa_Cambio else self.Tasa_Venta),
                    'tasa_venta': self.Tasa_Venta,
                    'comprobante': abono.Comprobante
                })
        
        context['abonos_detallados'] = abonos_detallados

        
        return context

    def get_pagos_por_metodo_json(self):
        """Devuelve un JSON con los pagos agrupados por método"""
        pagos_por_metodo = {}
        
        for pago in self.pagos.filter(Monto__gt=0):  # Solo pagos positivos (no devoluciones)
            metodo = pago.Metodo_Pago
            if metodo not in pagos_por_metodo:
                pagos_por_metodo[metodo] = {
                    'bs': 0,
                    'usd': 0
                }
            
            if metodo == 'efectivo_usd':
                # Convertir Decimal a float
                monto_usd = float(pago.Monto)
                monto_bs = float(pago.Monto_Bs) if pago.Monto_Bs else 0
                pagos_por_metodo[metodo]['usd'] += monto_usd
                pagos_por_metodo[metodo]['bs'] += monto_bs
            else:
                # Convertir Decimal a float
                monto_bs = float(pago.Monto) if pago.Monto else 0
                pagos_por_metodo[metodo]['bs'] += monto_bs
                # Convertir a USD si es necesario
                tasa = self.get_tasa_venta()
                if tasa > 0:
                    pagos_por_metodo[metodo]['usd'] += monto_bs / tasa
        
        return json.dumps(pagos_por_metodo, ensure_ascii=False)


class DetalleVenta(models.Model):
    ID_Detalle = models.AutoField(primary_key=True)
    ID_Ventas = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles')
    ID_lote = models.ForeignKey(Lote, on_delete=models.CASCADE, db_column='ID_lote')
    ID_Tasa = models.ForeignKey(TasaCambiaria, on_delete=models.CASCADE, db_column='ID_Tasa')
    Cantidad = models.IntegerField(validators=[MinValueValidator(1)])
    Precio_Unitario = models.DecimalField(max_digits=12, decimal_places=2)
    Subtotal_Detalle = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'detalle_venta'
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Venta'

    def __str__(self):
        return f"Detalle {self.ID_Detalle} - Venta {self.ID_Ventas.ID_Ventas}"
    
    def save(self, *args, **kwargs):
        self.Subtotal_Detalle = self.Precio_Unitario * self.Cantidad
        super().save(*args, **kwargs)
        self.ID_Ventas.calcular_totales()


class Pago(models.Model):
    METODO_PAGO_CHOICES = [
        ('efectivo_bs', 'Efectivo Bs'),
        ('efectivo_usd', 'Efectivo $'),
        ('transferencia', 'Transferencia'),
        ('pago_movil', 'Pago Móvil'),
        ('tarjeta', 'Tarjeta'),
        ('punto_venta', 'Punto de Venta'),
    ]
    
    ID_Pago = models.AutoField(primary_key=True)
    ID_Ventas = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='pagos')
    Metodo_Pago = models.CharField(max_length=15, choices=METODO_PAGO_CHOICES)
    Monto = models.DecimalField(max_digits=15, decimal_places=2)
    Tasa_Cambio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    Monto_Bs = models.DecimalField(max_digits=15, decimal_places=2)
    Comprobante = models.CharField(max_length=50, blank=True, null=True)
    
    def default_fecha_venezuela():
        tz = pytz.timezone('America/Caracas')
        return timezone.now().astimezone(tz)
    
    Fecha_Pago = models.DateTimeField(default=default_fecha_venezuela)

    class Meta:
        db_table = 'pagos'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'

    def __str__(self):
        return f"Pago {self.ID_Pago} - {self.Metodo_Pago} - ${self.Monto}"
    
    def save(self, *args, **kwargs):
        if self.Metodo_Pago == 'efectivo_usd':
            if self.Tasa_Cambio:
                self.Monto_Bs = self.Monto * self.Tasa_Cambio
            else:
                ultima_tasa = TasaCambiaria.objects.order_by('-fecha_creacion').first()
                if ultima_tasa:
                    self.Tasa_Cambio = ultima_tasa.valor
                    self.Monto_Bs = self.Monto * self.Tasa_Cambio
                else:
                    self.Monto_Bs = 0
        else:
            self.Monto_Bs = self.Monto

        super().save(*args, **kwargs)
        
        if self.ID_Ventas:
            self.ID_Ventas.calcular_totales()
    
    def delete(self, *args, **kwargs):
        """Override delete to recalculate sale totals after payment deletion"""
        venta = self.ID_Ventas
        super().delete(*args, **kwargs)
        
        if venta:
            venta.calcular_totales()