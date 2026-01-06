from django.urls import path
from . import views
from django.contrib.auth.views import LogoutView

app_name = 'usuarios' 

urlpatterns = [
    path('registro/', views.registrar_usuario, name='registro_usuario'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.custom_logout, name='logout'),
]