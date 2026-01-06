from django.urls import path
from . import views

app_name = 'lotes'

urlpatterns = [
    path('menu/', views.menu_lote, name='menu_lote'),
    path('registrar/', views.registrar_lote, name='registrar_lote'),
    path('editar/<int:id_lote>/', views.editar_lote, name='editar_lote'),
    path('actualizar-costo/<int:id_lote>/', views.actualizar_costo_unitario, name='actualizar_costo_unitario'),
    path('cambiar-estado/<int:id_lote>/', views.cambiar_estado_lote, name='cambiar_estado_lote'),
    path('generar-pdf/', views.generar_pdf_lotes, name='generar_pdf_lotes'),
    
    # URLs para gestión de proveedores
    path('proveedores/json/', views.lista_proveedores_json, name='lista_proveedores_json'),
    path('proveedores/crear/', views.crear_proveedor, name='crear_proveedor'),
    path('proveedores/editar/<int:id_proveedor>/', views.editar_proveedor, name='editar_proveedor'),
    path('proveedores/eliminar/<int:id_proveedor>/', views.eliminar_proveedor, name='eliminar_proveedor'),
    path('proveedores/imprimir/', views.imprimir_proveedores, name='imprimir_proveedores'),
]