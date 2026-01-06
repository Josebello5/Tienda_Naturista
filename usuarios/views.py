from django.shortcuts import render, redirect
from django.urls import reverse
from .forms import UsuarioForm
from .forms import CedulaLoginForm
from django.contrib.auth import login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

def registrar_usuario(request):
    if request.method == 'POST':
        form = UsuarioForm(request.POST)
        if form.is_valid():
            form.save()
            # Redirigir correctamente con parámetro de éxito
            url = reverse('usuarios:registro_usuario') + '?registro_exitoso=1'
            return redirect(url)
        else:
            messages.error(request, 'Corrige los errores en el formulario.')
    else:
        form = UsuarioForm()
    
    # Verificar si viene de registro exitoso
    registro_exitoso = request.GET.get('registro_exitoso')
    
    return render(request, 'registro.html', {
        'form': form, 
        'registro_exitoso': registro_exitoso
    })

@csrf_protect
@never_cache
def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard:menu')

    if request.method == 'POST':
        form = CedulaLoginForm(request.POST)
        if form.is_valid():
            user = form.cleaned_data['user']
            login(request, user)
            return redirect('dashboard:menu')
    else:
        form = CedulaLoginForm()

    response = render(request, 'login.html', {'form': form})
    # Cabeceras de control de caché
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


@never_cache
def custom_logout(request):
    logout(request)
    response = redirect('usuarios:login')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response