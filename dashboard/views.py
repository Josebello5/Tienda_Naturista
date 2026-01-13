from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.utils import timezone
from datetime import datetime, date
from .models import TasaCambiaria
from .forms import TasaCambiariaForm
from usuarios.utils import is_cashier, can_add_exchange_rate
import json

@login_required(login_url='usuarios:login')
@never_cache
def dashboard(request):
    # Obtener la fecha de hoy en zona horaria de Venezuela
    import pytz
    tz_venezuela = pytz.timezone('America/Caracas')
    ahora_venezuela = timezone.now().astimezone(tz_venezuela)
    hoy = ahora_venezuela.date()
    
    # Verificar si el usuario es cajero
    is_cajero = is_cashier(request.user)
    puede_agregar_tasa = can_add_exchange_rate(request.user)
    
    # Filtrar tasas solo del día de hoy (en hora de Venezuela)
    tasas = TasaCambiaria.objects.filter(
        fecha_creacion__date=hoy
    ).order_by('-fecha_creacion')
    
    # OBTENER SIEMPRE LA ÚLTIMA TASA REGISTRADA (sin importar el día)
    ultima_tasa = TasaCambiaria.objects.all().order_by('-fecha_creacion').first()
    
    # Solo procesar POST si el usuario tiene permiso
    if request.method == 'POST' and puede_agregar_tasa:
        form = TasaCambiariaForm(request.POST)
        if form.is_valid():
            nueva_tasa = form.save(commit=False)
            nueva_tasa.usuario = request.user
            nueva_tasa.save()
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                # Actualizar el queryset para incluir la nueva tasa
                tasas_actualizadas = TasaCambiaria.objects.filter(
                    fecha_creacion__date=hoy
                ).order_by('-fecha_creacion')
                
                # Obtener la nueva última tasa después de guardar
                nueva_ultima_tasa = TasaCambiaria.objects.all().order_by('-fecha_creacion').first()
                
                html_tabla = render_to_string('dashboard/partials/tabla_tasas.html', {
                    'tasas': tasas_actualizadas
                })
                
                html_tarjeta = render_to_string('dashboard/partials/tarjeta_compacta.html', {
                    'ultima_tasa': nueva_ultima_tasa
                })
                
                return JsonResponse({
                    'html_tabla': html_tabla,
                    'html_tarjeta': html_tarjeta,
                    'success': True
                })
            
            return redirect('dashboard:menu')
        else:
            # Si es AJAX y hay errores, retornarlos
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors.get_json_data()
                })
    else:
        form = TasaCambiariaForm() if puede_agregar_tasa else None
    
    context = {
        'tasas': tasas,
        'form': form,  # None para cajeros
        'ultima_tasa': ultima_tasa,
        'hoy': hoy,
        'is_cajero': is_cajero,
        'puede_agregar_tasa': puede_agregar_tasa,
    }
    
    return render(request, 'dashboard/dashboard.html', context)

@login_required
def obtener_tasas_ajax(request):
    # Filtrar tasas solo del día de hoy para la tabla (en hora de Venezuela)
    import pytz
    tz_venezuela = pytz.timezone('America/Caracas')
    ahora_venezuela = timezone.now().astimezone(tz_venezuela)
    hoy = ahora_venezuela.date()
    
    tasas = TasaCambiaria.objects.filter(
        fecha_creacion__date=hoy
    ).order_by('-fecha_creacion')
    
    # Obtener la última tasa registrada (sin filtrar por día)
    ultima_tasa = TasaCambiaria.objects.all().order_by('-fecha_creacion').first()
    
    html_tabla = render_to_string('dashboard/partials/tabla_tasas.html', {
        'tasas': tasas,
        'obtener_tasas_url': reverse('dashboard:obtener_tasas')
    })
    
    html_tarjeta = render_to_string('dashboard/partials/tarjeta_compacta.html', {
        'ultima_tasa': ultima_tasa
    })
    
    return JsonResponse({
        'html_tabla': html_tabla,
        'html_tarjeta': html_tarjeta
    })