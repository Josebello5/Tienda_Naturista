from django.urls import path
from . import views

app_name = 'cierre_caja'

urlpatterns = [
    path('menu/', views.menu_cierre_caja, name='menu_cierre_caja'),
    path('ver-recibo/<int:cierre_id>/', views.ver_recibo_cierre, name='ver_recibo_cierre'),
    path('descargar-recibo/<int:cierre_id>/', views.descargar_recibo_cierre, name='descargar_recibo_cierre'),
    path('historial/', views.historial_cierres, name='historial_cierres'),
    path('reporte-cierres/', views.generar_reporte_cierres, name='generar_reporte_cierres'),
]
