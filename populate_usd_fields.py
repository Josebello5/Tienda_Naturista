"""
Script para poblar los campos USD en ventas existentes
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda_naturista.settings')
django.setup()

from ventas.models import Venta
from decimal import Decimal

def populate_usd_fields():
    """Poblar campos USD para ventas existentes"""
    ventas = Venta.objects.all()
    total_ventas = ventas.count()
    actualizadas = 0
    
    print(f"Procesando {total_ventas} ventas...")
    
    for venta in ventas:
        # Obtener la tasa de la venta
        if not venta.Tasa_Venta:
            detalles = venta.detalles.all()
            if detalles.exists():
                venta.Tasa_Venta = detalles.first().ID_Tasa.valor
        
        # Calcular valores USD si la tasa existe
        if venta.Tasa_Venta and venta.Tasa_Venta > 0:
            venta.Subtotal_USD = venta.Subtotal / venta.Tasa_Venta
            venta.IVA_USD = venta.IVA / venta.Tasa_Venta
            venta.Total_USD = venta.Total / venta.Tasa_Venta
            
            # Calcular saldo pendiente en USD
            # Calcular total pagado en USD
            total_pagado_usd = Decimal('0')
            for pago in venta.pagos.all():
                if pago.Monto > 0:
                    if pago.Metodo_Pago == 'efectivo_usd':
                        total_pagado_usd += pago.Monto
                    else:
                        total_pagado_usd += pago.Monto / venta.Tasa_Venta
            
            venta.Saldo_Pendiente_USD = max(Decimal('0'), venta.Total_USD - total_pagado_usd)
            
            # Guardar sin llamar a calcular_totales para evitar recalcular todo
            venta.save(update_fields=['Tasa_Venta', 'Subtotal_USD', 'IVA_USD', 'Total_USD', 'Saldo_Pendiente_USD'])
            actualizadas += 1
            
            if actualizadas % 10 == 0:
                print(f"Procesadas {actualizadas}/{total_ventas} ventas...")
    
    print(f"\nCompletado! {actualizadas} ventas actualizadas con valores USD.")

if __name__ == '__main__':
    populate_usd_fields()
