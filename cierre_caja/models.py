from django.db import models
from usuarios.models import Usuario
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
import pytz

class CierreCaja(models.Model):
    ID_Cierre = models.AutoField(primary_key=True)
    Fecha_Cierre = models.DateField(unique=True)
    Usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='Usuario')
    
    def default_fecha_venezuela():
        tz = pytz.timezone('America/Caracas')
        return timezone.now().astimezone(tz)
    
    Fecha_Creacion = models.DateTimeField(default=default_fecha_venezuela)
    
    # Sistema - Montos calculados desde las ventas
    Sistema_Efectivo_Bs = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Sistema_Efectivo_USD = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Sistema_Transferencia = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Sistema_Pago_Movil = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Sistema_Tarjeta = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Sistema_Punto_Venta = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Real - Montos ingresados por el vendedor
    Real_Efectivo_Bs = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Real_Efectivo_USD = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Real_Transferencia = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Real_Pago_Movil = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Real_Tarjeta = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Real_Punto_Venta = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Totales
    Total_Sistema = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Total_Real = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    Diferencia_Total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Información adicional
    Notas = models.TextField(blank=True, null=True)
    Cerrado = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'cierre_caja'
        verbose_name = 'Cierre de Caja'
        verbose_name_plural = 'Cierres de Caja'
        ordering = ['-Fecha_Cierre']
    
    def __str__(self):
        return f"Cierre {self.Fecha_Cierre.strftime('%d/%m/%Y')} - {self.Usuario.username}"
    
    def calcular_totales(self):
        """Calcula los totales del sistema y reales"""
        self.Total_Sistema = (
            self.Sistema_Efectivo_Bs + 
            (self.Sistema_Efectivo_USD or Decimal('0')) + 
            self.Sistema_Transferencia + 
            self.Sistema_Pago_Movil + 
            self.Sistema_Tarjeta + 
            self.Sistema_Punto_Venta
        )
        
        self.Total_Real = (
            self.Real_Efectivo_Bs + 
            (self.Real_Efectivo_USD or Decimal('0')) + 
            self.Real_Transferencia + 
            self.Real_Pago_Movil + 
            self.Real_Tarjeta + 
            self.Real_Punto_Venta
        )
        
        self.Diferencia_Total = self.Total_Real - self.Total_Sistema
        self.save()
    
    def get_diferencias_por_metodo(self):
        """Retorna un diccionario con las diferencias por método de pago"""
        return {
            'efectivo_bs': self.Real_Efectivo_Bs - self.Sistema_Efectivo_Bs,
            'efectivo_usd': (self.Real_Efectivo_USD or Decimal('0')) - (self.Sistema_Efectivo_USD or Decimal('0')),
            'transferencia': self.Real_Transferencia - self.Sistema_Transferencia,
            'pago_movil': self.Real_Pago_Movil - self.Sistema_Pago_Movil,
            'tarjeta': self.Real_Tarjeta - self.Sistema_Tarjeta,
            'punto_venta': self.Real_Punto_Venta - self.Sistema_Punto_Venta,
        }
    
    def get_html_context(self):
        """Genera el contexto para el template HTML del recibo"""
        # Función para formatear números con formato venezolano
        def format_number_venezuelan(value):
            try:
                if isinstance(value, Decimal):
                    value_str = str(value)
                else:
                    value_str = str(value)
                
                parts = value_str.split('.')
                integer_part = parts[0]
                decimal_part = parts[1] if len(parts) > 1 else '00'
                
                if len(decimal_part) == 1:
                    decimal_part += '0'
                elif len(decimal_part) > 2:
                    decimal_part = decimal_part[:2]
                
                formatted_integer = ''
                for i in range(len(integer_part)-1, -1, -1):
                    formatted_integer = integer_part[i] + formatted_integer
                    if (len(integer_part) - i) % 3 == 0 and i > 0:
                        formatted_integer = '.' + formatted_integer
                
                return f"{formatted_integer},{decimal_part}"
            except:
                return str(value)
        
        diferencias = self.get_diferencias_por_metodo()
        
        tz = pytz.timezone('America/Caracas')
        fecha_creacion = self.Fecha_Creacion.astimezone(tz)
        
        context = {
            'cierre': self,
            'fecha_formateada': fecha_creacion.strftime("%d/%m/%Y %H:%M"),
            'fecha_cierre_formateada': self.Fecha_Cierre.strftime("%d/%m/%Y"),
            
            # Montos sistema formateados
            'sistema_efectivo_bs_formatted': format_number_venezuelan(self.Sistema_Efectivo_Bs),
            'sistema_efectivo_usd_formatted': format_number_venezuelan(self.Sistema_Efectivo_USD or 0),
            'sistema_transferencia_formatted': format_number_venezuelan(self.Sistema_Transferencia),
            'sistema_pago_movil_formatted': format_number_venezuelan(self.Sistema_Pago_Movil),
            'sistema_tarjeta_formatted': format_number_venezuelan(self.Sistema_Tarjeta),
            'sistema_punto_venta_formatted': format_number_venezuelan(self.Sistema_Punto_Venta),
            
            # Montos reales formateados
            'real_efectivo_bs_formatted': format_number_venezuelan(self.Real_Efectivo_Bs),
            'real_efectivo_usd_formatted': format_number_venezuelan(self.Real_Efectivo_USD or 0),
            'real_transferencia_formatted': format_number_venezuelan(self.Real_Transferencia),
            'real_pago_movil_formatted': format_number_venezuelan(self.Real_Pago_Movil),
            'real_tarjeta_formatted': format_number_venezuelan(self.Real_Tarjeta),
            'real_punto_venta_formatted': format_number_venezuelan(self.Real_Punto_Venta),
            
            # Diferencias formateadas
            'dif_efectivo_bs_formatted': format_number_venezuelan(diferencias['efectivo_bs']),
            'dif_efectivo_usd_formatted': format_number_venezuelan(diferencias['efectivo_usd']),
            'dif_transferencia_formatted': format_number_venezuelan(diferencias['transferencia']),
            'dif_pago_movil_formatted': format_number_venezuelan(diferencias['pago_movil']),
            'dif_tarjeta_formatted': format_number_venezuelan(diferencias['tarjeta']),
            'dif_punto_venta_formatted': format_number_venezuelan(diferencias['punto_venta']),
            
            # Totales formateados
            'total_sistema_formatted': format_number_venezuelan(self.Total_Sistema),
            'total_real_formatted': format_number_venezuelan(self.Total_Real),
            'diferencia_total_formatted': format_number_venezuelan(self.Diferencia_Total),
            
            # Diferencias sin formatear para condicionales
            'diferencias': diferencias,
        }
        
        return context
