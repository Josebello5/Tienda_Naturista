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
import json

@login_required(login_url='usuarios:login')
@never_cache
def dashboard(request):
    # Obtener la fecha de hoy en zona horaria de Venezuela
    import pytz
    tz_venezuela = pytz.timezone('America/Caracas')
    ahora_venezuela = timezone.now().astimezone(tz_venezuela)
    hoy = ahora_venezuela.date()
    
    # Filtrar tasas solo del día de hoy (en hora de Venezuela)
    tasas = TasaCambiaria.objects.filter(
        fecha_creacion__date=hoy
    ).order_by('-fecha_creacion')
    
    # OBTENER SIEMPRE LA ÚLTIMA TASA REGISTRADA (sin importar el día)
    ultima_tasa = TasaCambiaria.objects.all().order_by('-fecha_creacion').first()
    
    if request.method == 'POST':
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
        form = TasaCambiariaForm()
    
    context = {
        'tasas': tasas,
        'form': form,
        'ultima_tasa': ultima_tasa,  # Usamos la última tasa sin filtrar por día
        'hoy': hoy
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