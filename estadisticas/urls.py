from django.urls import path
from . import views

app_name = 'estadisticas'

urlpatterns = [
    path('menu/', views.menu_estadisticas, name='menu_estadisticas'),
    path('reporte/productos/', views.reporte_productos_mas_vendidos, name='reporte_productos'),
    path('reporte/clientes/', views.reporte_clientes_frecuentes, name='reporte_clientes'),
    path('reporte/vencimiento/', views.reporte_por_vencer, name='reporte_vencimiento'),
]
