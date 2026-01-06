from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.dashboard, name='menu'),
    path('obtener-tasas/', views.obtener_tasas_ajax, name='obtener_tasas'),
]