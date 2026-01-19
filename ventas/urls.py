from django.urls import path
from . import views

app_name = 'ventas'

urlpatterns = [
    path('menu/', views.menu_ventas, name='menu_ventas'),
    path('registrar/', views.registrar_venta, name='registrar_venta'),
    path('buscar-clientes/', views.buscar_clientes, name='buscar_clientes'),
    path('buscar-productos/', views.buscar_productos, name='buscar_productos'),
    path('registrar-cliente-venta/', views.registrar_cliente_venta, name='registrar_cliente_venta'),
    path('procesar-venta/', views.procesar_venta, name='procesar_venta'),
    path('descargar-comprobante/<int:venta_id>/', views.descargar_comprobante, name='descargar_comprobante'),
    path('ver-comprobante/<int:venta_id>/', views.ver_comprobante, name='ver_comprobante'),
    path('ver-ticket-58mm/<int:venta_id>/', views.ver_ticket_58mm, name='ver_ticket_58mm'),
    path('devolver-venta/<int:venta_id>/', views.devolver_venta, name='devolver_venta'),
    path('generar-pdf-ventas/', views.generar_pdf_ventas, name='generar_pdf_ventas'),
]