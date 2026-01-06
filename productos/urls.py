from django.urls import path
from . import views

app_name = 'productos'

urlpatterns = [
    # ===== URL PARA EL MENÚ DE PRODUCTOS =====
    path('menu/', views.menu_productos, name='menu_productos'),
    
    # ===== URL PARA REGISTRAR PRODUCTOS =====
    path('registrar/', views.registrar_producto, name='registrar_producto'),
    
    # ===== URL PARA EDITAR PRODUCTOS =====
    path('editar/<int:id>/', views.editar_producto, name='editar_producto'),
    
    # ===== URL PARA IMPRIMIR PRODUCTOS =====
    path('generar-pdf/', views.generar_pdf_productos, name='generar_pdf_productos'),
    
    # ===== URL PARA ACTUALIZAR PRECIO =====
    path('actualizar-precio/<int:id_producto>/', views.actualizar_precio_producto, name='actualizar_precio_producto'),
    
    # ===== URL PARA CAMBIAR ESTADO =====
    path('cambiar-estado/<int:id_producto>/', views.cambiar_estado_producto, name='cambiar_estado_producto'),
    
    # ===== URLs PARA CATEGORÍAS =====
    path('categorias/json/', views.lista_categorias_json, name='lista_categorias_json'),
    path('categorias/editar/<int:id>/', views.editar_categoria, name='editar_categoria'),
    path('categorias/editar/', views.editar_categoria, name='editar_categoria_sin_id'),
    path('categorias/eliminar/<int:id>/', views.eliminar_categoria, name='eliminar_categoria'),
    path('categorias/imprimir/', views.imprimir_categorias, name='imprimir_categorias'),
    
    # ===== URLs PARA PATOLOGÍAS =====
    path('patologias/json/', views.lista_patologias_json, name='lista_patologias_json'),
    path('patologias/editar/<int:id>/', views.editar_patologia, name='editar_patologia'),
    path('patologias/editar/', views.editar_patologia, name='editar_patologia_sin_id'),
    path('patologias/eliminar/<int:id>/', views.eliminar_patologia, name='eliminar_patologia'),
    path('patologias/imprimir/', views.imprimir_patologias, name='imprimir_patologias'),
]