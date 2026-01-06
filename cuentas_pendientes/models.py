from django.db import models
from ventas.models import Venta, Pago
from clientes.models import Cliente
from decimal import Decimal
from django.utils import timezone
import pytz

class Abono(models.Model):
    METODO_PAGO_CHOICES = [
        ('efectivo_bs', 'Efectivo Bs'),
        ('efectivo_usd', 'Efectivo $'),
        ('transferencia', 'Transferencia'),
        ('pago_movil', 'Pago Móvil'),
        ('tarjeta', 'Tarjeta'),
    ]
    
    ID_Abono = models.AutoField(primary_key=True)
    ID_Ventas = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='abonos')
    Cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='abonos')
    Monto_Abono = models.DecimalField(max_digits=15, decimal_places=2)
    Metodo_Pago = models.CharField(max_length=15, choices=METODO_PAGO_CHOICES)
    Tasa_Cambio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    Monto_Abono_Bs = models.DecimalField(max_digits=15, decimal_places=2)
    Comprobante = models.CharField(max_length=50, blank=True, null=True)
    Observaciones = models.TextField(blank=True, null=True)
    
    def default_fecha_venezuela():
        tz = pytz.timezone('America/Caracas')
        return timezone.now().astimezone(tz)
    
    Fecha_Abono = models.DateTimeField(default=default_fecha_venezuela)
    Saldo_Anterior = models.DecimalField(max_digits=15, decimal_places=2)
    Saldo_Despues = models.DecimalField(max_digits=15, decimal_places=2)
    Registrado_Por = models.CharField(max_length=100, blank=True, null=True)
    anulado = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'abonos'
        verbose_name = 'Abono'
        verbose_name_plural = 'Abonos'
        ordering = ['-Fecha_Abono']
    
    def __str__(self):
        return f"Abono #{self.ID_Abono} - Venta #{self.ID_Ventas.ID_Ventas} - Bs {self.Monto_Abono_Bs}"
    
    def save(self, *args, **kwargs):
            # Calcular montos en Bs según método de pago
            if self.Metodo_Pago == 'efectivo_usd' and self.Tasa_Cambio:
                self.Monto_Abono_Bs = self.Monto_Abono * self.Tasa_Cambio
            else:
                self.Monto_Abono_Bs = self.Monto_Abono
            
            # Guardar saldo anterior y calcular saldo después ANTES de guardar
            if not self.pk:  # Solo si es un nuevo abono
                venta = self.ID_Ventas
                self.Saldo_Anterior = venta.Saldo_Pendiente
                self.Saldo_Despues = venta.Saldo_Pendiente - self.Monto_Abono_Bs
            
            # Guardar el abono
            super().save(*args, **kwargs)
            
            # Crear registro en tabla de pagos (esto automáticamente actualiza saldos)
            # El Pago.save() llama a venta.calcular_totales() que actualiza todo correctamente
            if not self.anulado and not hasattr(self, '_pago_created'):
                self._pago_created = True  # Evitar crear múltiples pagos
                Pago.objects.create(
                    ID_Ventas=self.ID_Ventas,
                    Metodo_Pago=self.Metodo_Pago,
                    Monto=self.Monto_Abono,
                    Tasa_Cambio=self.Tasa_Cambio,
                    Monto_Bs=self.Monto_Abono_Bs,
                    Comprobante=self.Comprobante
                )
    
    def anular_abono(self, motivo=None):
        """Anula un abono y restaura el saldo pendiente"""
        if not self.anulado:
            self.anulado = True
            self.Observaciones = f"{self.Observaciones or ''} | ANULADO: {motivo or 'Sin motivo'}"
            
            # Guardar el abono como anulado
            super(Abono, self).save(update_fields=['anulado', 'Observaciones'])
            
            # Eliminar el pago correspondiente (esto automáticamente recalcula saldos)
            pago_relacionado = Pago.objects.filter(
                ID_Ventas=self.ID_Ventas,
                Monto=self.Monto_Abono,
                Monto_Bs=self.Monto_Abono_Bs,
                Metodo_Pago=self.Metodo_Pago,
                Fecha_Pago__date=self.Fecha_Abono.date()
            ).first()
            
            if pago_relacionado:
                # Al eliminar el pago, Pago.delete() llamará a calcular_totales()
                pago_relacionado.delete()
            
            return True
        return False