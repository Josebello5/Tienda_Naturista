from django.urls import path
from . import views, views_db
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
    path('configuracion/verificar-email/', views.verificar_email_api, name='verificar_email_api'),
    path('configuracion/cambiar-estado/', views.cambiar_estado_usuario_api, name='cambiar_estado_usuario_api'),
    
    # Password Recovery
    path('password-reset/', views.password_reset_request, name='password_reset_request'),
    path('send-reset-code/', views.send_reset_code, name='send_reset_code'),
    path('verify-code/', views.verify_reset_code, name='verify_reset_code'),
    path('reset-password/', views.reset_password, name='reset_password'),
    
    # Database Management
    path('configuracion/exportar-db/', views_db.exportar_base_datos, name='exportar_db'),
    path('configuracion/importar-db/', views_db.importar_base_datos, name='importar_db'),
]