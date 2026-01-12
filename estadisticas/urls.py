from django.urls import path
from . import views

app_name = 'estadisticas'

urlpatterns = [
    path('menu/', views.menu_estadisticas, name='menu_estadisticas'),
    
    # Reportes PDF existentes/estándar
    path('reporte/productos/', views.reporte_productos_mas_vendidos, name='reporte_productos'),
    path('reporte/clientes/', views.reporte_clientes_frecuentes, name='reporte_clientes'),
    path('reporte/vencimiento/', views.reporte_por_vencer, name='reporte_vencimiento'),

    # NUEVOS reportes PDF para los gráficos
    path('reporte/ventas-tiempo/', views.reporte_ventas_tiempo, name='reporte_ventas_tiempo'),
    path('reporte/top-productos/', views.reporte_top_productos, name='reporte_top_productos'),
    path('reporte/ventas-categoria/', views.reporte_ventas_categoria, name='reporte_ventas_categoria'),
    
    # API endpoints para gráficos
    path('api/ventas-tiempo/', views.datos_ventas_tiempo, name='datos_ventas_tiempo'),
    path('api/top-productos/', views.datos_top_productos, name='datos_top_productos'),
    path('api/ventas-categoria/', views.datos_ventas_categoria, name='datos_ventas_categoria'),
]
