from django.urls import path
from . import views

app_name = 'clientes'

urlpatterns = [
    path('registrar/', views.registrar_cliente, name='registrar'),
    path('menu/', views.menu_clientes, name='menu_clientes'),
    path('editar/<int:id>/', views.editar_cliente, name='editar_cliente'),
    path('eliminar/<int:id>/', views.eliminar_cliente, name='eliminar_cliente'),
    path('generar-pdf/', views.generar_pdf_clientes, name='generar_pdf'),
]