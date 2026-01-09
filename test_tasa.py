#!/usr/bin/env python
"""Script para verificar qué tasa está usando el sistema"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Tienda_Naturista.settings')
django.setup()

from dashboard.models import TasaCambiaria
from django.utils import timezone
import pytz

# Verificar última tasa
ultima_tasa = TasaCambiaria.objects.order_by('-fecha_creacion').first()
print(f"\n{'='*60}")
print(f"VERIFICACIÓN DE TASA CAMBIARIA")
print(f"{'='*60}")
print(f"\nÚltima tasa en base de datos:")
print(f"  ID: {ultima_tasa.id}")
print(f"  Valor: {ultima_tasa.valor} Bs/$")
print(f"  Fecha UTC: {ultima_tasa.fecha_creacion}")

# Convertir a hora Venezuela
tz_venezuela = pytz.timezone('America/Caracas')
fecha_venezuela = ultima_tasa.fecha_creacion.astimezone(tz_venezuela)
print(f"  Fecha Venezuela: {fecha_venezuela}")

# Verificar tasas de hoy
ahora_venezuela = timezone.now().astimezone(tz_venezuela)
hoy = ahora_venezuela.date()
tasas_hoy = TasaCambiaria.objects.filter(fecha_creacion__date=hoy).order_by('-fecha_creacion')

print(f"\nTasas de hoy ({hoy}):")
if tasas_hoy.exists():
    for t in tasas_hoy[:5]:
        fecha_vzla = t.fecha_creacion.astimezone(tz_venezuela)
        print(f"  ID: {t.id}, Valor: {t.valor}, Hora: {fecha_vzla.strftime('%H:%M:%S')}")
else:
    print("  No hay tasas registradas hoy")

print(f"\n{'='*60}\n")
