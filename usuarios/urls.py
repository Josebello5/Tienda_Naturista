from django.urls import path
from . import views
from django.contrib.auth.views import LogoutView

app_name = 'usuarios' 

urlpatterns = [
    path('registro/', views.registrar_usuario, name='registro_usuario'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.custom_logout, name='logout'),
    path('configuracion/', views.menu_configuracion, name='menu_configuracion'),
    path('configuracion/generar-pdf/', views.generar_pdf_usuarios, name='generar_pdf_usuarios'),
    path('configuracion/crear-usuario/', views.crear_usuario_interno, name='crear_usuario_interno'),
    path('configuracion/editar-usuario/', views.editar_usuario_api, name='editar_usuario_api'),
    path('configuracion/cambiar-estado/', views.cambiar_estado_usuario_api, name='cambiar_estado_usuario_api'),
]