from django.urls import path
from . import views

app_name = 'cuentas_pendientes'

urlpatterns = [
    path('menu/', views.menu_cuentas_pendientes, name='menu_cuentas'),
    path('buscar-ventas/', views.buscar_ventas_pendientes, name='buscar_ventas'),
    path('gestionar-abono/<str:cliente_cedula>/', views.gestionar_abono_cliente, name='gestionar_abono_cliente'),
    path('registrar-abono/', views.registrar_abono, name='registrar_abono'),
    path('registrar-abono/<int:venta_id>/', views.registrar_abono, name='registrar_abono_venta'),
    path('procesar-abono/', views.procesar_abono, name='procesar_abono'),
    path('procesar-pago-multiple/', views.procesar_pago_multiple, name='procesar_pago_multiple'),
    path('historial/<int:venta_id>/', views.historial_abonos, name='historial_abonos'),
    path('historial-cliente/<str:cliente_cedula>/', views.historial_abonos_cliente, name='historial_abonos_cliente'),
    path('api-historial-abonos-cliente/<str:cliente_cedula>/', views.api_historial_abonos_cliente, name='api_historial_abonos_cliente'),
    path('anular-abono/<int:abono_id>/', views.anular_abono, name='anular_abono'),
    path('reporte/', views.reporte_cuentas_pendientes, name='reporte_cuentas'),
]