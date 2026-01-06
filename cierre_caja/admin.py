from django.contrib import admin
from .models import CierreCaja

@admin.register(CierreCaja)
class CierreCajaAdmin(admin.ModelAdmin):
    list_display = ['Fecha_Cierre', 'Usuario', 'Total_Sistema', 'Total_Real', 'Diferencia_Total', 'Cerrado', 'Fecha_Creacion']
    list_filter = ['Fecha_Cierre', 'Usuario', 'Cerrado']
    search_fields = ['Fecha_Cierre', 'Usuario__username']
    readonly_fields = ['Total_Sistema', 'Total_Real', 'Diferencia_Total', 'Fecha_Creacion']
    date_hierarchy = 'Fecha_Cierre'
    
    fieldsets = (
        ('Información General', {
            'fields': ('Fecha_Cierre', 'Usuario', 'Fecha_Creacion', 'Cerrado', 'Notas')
        }),
        ('Montos del Sistema', {
            'fields': (
                'Sistema_Efectivo_Bs', 'Sistema_Efectivo_USD', 
                'Sistema_Transferencia', 'Sistema_Pago_Movil',
                'Sistema_Tarjeta', 'Sistema_Punto_Venta'
            ),
            'classes': ('collapse',)
        }),
        ('Montos Reales', {
            'fields': (
                'Real_Efectivo_Bs', 'Real_Efectivo_USD',
                'Real_Transferencia', 'Real_Pago_Movil',
                'Real_Tarjeta', 'Real_Punto_Venta'
            ),
            'classes': ('collapse',)
        }),
        ('Totales', {
            'fields': ('Total_Sistema', 'Total_Real', 'Diferencia_Total')
        }),
    )
