#!/usr/bin/env python
"""
Script de prueba para verificar cálculos de totales con fluctuación de tasa
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Tienda_Naturista.settings')
django.setup()

from ventas.models import Venta
from decimal import Decimal

print("\n" + "="*70)
print("PRUEBA DE CÁLCULOS DE TOTALES CON FLUCTUACIÓN DE TASA")
print("="*70)

# Buscar una venta a crédito con abonos
ventas_credito = Venta.objects.filter(
    Tipo_Venta='credito',
    anulada=False
).prefetch_related('pagos', 'abonos').order_by('-Fecha_Venta')[:5]

if not ventas_credito.exists():
    print("\n⚠️  No hay ventas a crédito para probar")
    print("Crea una venta a crédito y luego haz un abono para probar.")
    sys.exit(0)

print(f"\nEncontradas {ventas_credito.count()} ventas a crédito recientes\n")

for venta in ventas_credito:
    print(f"\n{'─'*70}")
    print(f"VENTA #{venta.ID_Ventas}")
    print(f"{'─'*70}")
    print(f"Cliente: {venta.Cedula.nombre} {venta.Cedula.apellido}")
    print(f"Fecha: {venta.Fecha_Venta.strftime('%d/%m/%Y %H:%M')}")
    print(f"Tasa de la venta: {venta.Tasa_Venta} Bs/$")
    print(f"Estado: {venta.get_Estado_Pago_display()}")
    
    print(f"\n📊 TOTALES ORIGINALES DE LA VENTA:")
    print(f"   Total: Bs {venta.Total:,.2f}")
    print(f"   Total USD: $ {venta.Total_USD:,.2f}")
    print(f"   Saldo Pendiente: Bs {venta.Saldo_Pendiente:,.2f}")
    print(f"   Saldo Pendiente USD: $ {venta.Saldo_Pendiente_USD:,.2f}")
    
    # Mostrar pagos iniciales
    pagos = venta.pagos.filter(Monto__gt=0)
    if pagos.exists():
        print(f"\n💰 PAGOS INICIALES:")
        for pago in pagos:
            if pago.Metodo_Pago == 'efectivo_usd':
                print(f"   • {pago.get_Metodo_Pago_display()}: $ {pago.Monto:,.2f}")
                print(f"     Tasa: {pago.Tasa_Cambio} Bs/$")
                print(f"     Equivalente: Bs {pago.Monto_Bs:,.2f}")
            else:
                print(f"   • {pago.get_Metodo_Pago_display()}: Bs {pago.Monto_Bs:,.2f}")
    
    # Mostrar abonos
    abonos = venta.abonos.filter(anulado=False)
    if abonos.exists():
        print(f"\n💵 ABONOS REALIZADOS:")
        for abono in abonos:
            print(f"   • Abono #{abono.ID_Abono} - {abono.Fecha_Abono.strftime('%d/%m/%Y')}")
            print(f"     Método: {abono.get_Metodo_Pago_display()}")
            if abono.Metodo_Pago == 'efectivo_usd':
                print(f"     Monto: $ {abono.Monto_Abono:,.2f}")
                print(f"     Tasa del abono: {abono.Tasa_Cambio} Bs/$")
                print(f"     Equivalente en Bs: Bs {abono.Monto_Abono_Bs:,.2f}")
            else:
                print(f"     Monto: Bs {abono.Monto_Abono_Bs:,.2f}")
                if abono.Tasa_Cambio:
                    print(f"     Tasa del abono: {abono.Tasa_Cambio} Bs/$")
                    equivalente_usd = abono.Monto_Abono_Bs / abono.Tasa_Cambio
                    print(f"     Equivalente en USD: $ {equivalente_usd:,.2f}")
    
    # Calcular totales usando los métodos actualizados
    print(f"\n✅ TOTALES CALCULADOS (Métodos actualizados):")
    total_bs = venta.get_total_pagado_bs()
    total_usd = venta.get_total_pagado_usd()
    equivalente_total = venta.get_equivalente_total_bs()
    
    print(f"   Total pagado en Bs: Bs {total_bs:,.2f}")
    print(f"   Total pagado en USD: $ {total_usd:,.2f}")
    print(f"   Equivalente total en Bs: Bs {equivalente_total:,.2f}")
    
    # Verificar si hay diferencia por fluctuación de tasa
    if abonos.exists():
        total_original_venta = venta.Total
        diferencia = equivalente_total - total_original_venta
        if abs(diferencia) > Decimal('0.01'):
            print(f"\n⚠️  DIFERENCIA POR FLUCTUACIÓN DE TASA:")
            print(f"   Total original de la venta: Bs {total_original_venta:,.2f}")
            print(f"   Total realmente cobrado: Bs {equivalente_total:,.2f}")
            print(f"   Diferencia: Bs {diferencia:,.2f}")
            if diferencia > 0:
                print(f"   → Ganancia por aumento de tasa")
            else:
                print(f"   → Pérdida por disminución de tasa")

print(f"\n{'='*70}")
print("PRUEBA COMPLETADA")
print("="*70 + "\n")
