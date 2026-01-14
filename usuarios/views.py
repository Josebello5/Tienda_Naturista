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
from .decorators import owner_required

def registrar_usuario(request):
    from django.contrib.auth.models import Group
    
    # Verificar si ya existe un Dueño (EXCEPTO si acabamos de registrarlo exitosamente)
    # Esto permite mostrar el modal de éxito antes de bloquear el acceso
    if request.GET.get('registro_exitoso') != '1':
        try:
            grupo_dueno = Group.objects.get(name='Dueño')
            if grupo_dueno.user_set.exists():
                messages.error(request, 'El sistema ya tiene un dueño registrado. Acceso restringido.')
                return redirect('usuarios:login')
        except Group.DoesNotExist:
            pass

    if request.method == 'POST':
        form = UsuarioForm(request.POST)
        if form.is_valid():
            user = form.save()
            
            # Asignar rol de Dueño automáticamente
            try:
                grupo_dueno, created = Group.objects.get_or_create(name='Dueño')
                user.groups.add(grupo_dueno)
            except Exception as e:
                # Log error si es necesario
                pass

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
            if not user.is_active:
                messages.error(request, 'No se puede iniciar sesión porque el usuario está inactivo.')
            else:
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

from django.db.models import Q
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from datetime import datetime
from django.http import HttpResponse

@owner_required
def menu_configuracion(request):
    from .models import Usuario
    usuarios = Usuario.objects.all()
    return render(request, 'usuarios/menu_configuracion.html', {'usuarios': usuarios})

def get_pdf_content_disposition(filename):
    from urllib.parse import quote
    return f'inline; filename="{filename}"; filename*=UTF-8\'\'{quote(filename)}'

@login_required
def generar_pdf_usuarios(request):
    try:
        from .models import Usuario
        query = request.GET.get('q', '')
        rol_filter = request.GET.get('rol', '')
        estado_filter = request.GET.get('estado', '')
        
        usuarios = Usuario.objects.all().order_by('cedula')
        
        if query:
            usuarios = usuarios.filter(
                Q(cedula__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query)
            )
            
        if rol_filter:
            usuarios = usuarios.filter(groups__name=rol_filter)
            
        if estado_filter:
            is_active = estado_filter == 'True'
            usuarios = usuarios.filter(is_active=is_active)

        response = HttpResponse(content_type='application/pdf')
        filename = f"listado_usuarios_{query}{'_' + rol_filter if rol_filter else ''}.pdf" 
        response['Content-Disposition'] = get_pdf_content_disposition(filename)

        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter

        # Header
        p.setTitle("Listado de Usuarios - Tienda Naturista")
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(1*inch, height-1*inch, "TIENDA NATURISTA")
        
        p.setFont("Helvetica", 12)
        p.drawString(1*inch, height-1.3*inch, "Algo más para tu salud")
        
        p.setFont("Helvetica", 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        
        filtros_parts = []
        if query: filtros_parts.append(f"Búsqueda: '{query}'")
        if rol_filter: filtros_parts.append(f"Rol: '{rol_filter}'")
        if estado_filter: filtros_parts.append(f"Estado: '{'Activo' if estado_filter == 'True' else 'Inactivo'}'")
        
        filtros_info = " - ".join(filtros_parts) if filtros_parts else "Listado Completo"
        p.drawString(1*inch, height-1.6*inch, f"{filtros_info} - {fecha_actual}")
        
        p.line(1*inch, height-1.7*inch, 7.5*inch, height-1.7*inch)

        # Table Header
        y_position = height - 2.2*inch
        line_height = 0.25*inch

        p.setFont("Helvetica-Bold", 8)
        p.drawString(0.5*inch, y_position, "CÉDULA")
        p.drawString(1.5*inch, y_position, "NOMBRE")
        p.drawString(3.0*inch, y_position, "APELLIDO")
        p.drawString(4.5*inch, y_position, "EMAIL")
        p.drawString(6.5*inch, y_position, "ROL")
        p.drawString(7.2*inch, y_position, "ESTADO")

        y_position -= line_height
        p.line(0.4*inch, y_position, 8.0*inch, y_position)
        y_position -= 0.1*inch

        # Data
        p.setFont("Helvetica", 8)
        
        for usuario in usuarios:
            if y_position < 1*inch:
                p.showPage()
                y_position = height - 1*inch
                # Re-draw header on new page? Or just simple table header
                p.setFont("Helvetica-Bold", 8)
                p.drawString(0.5*inch, y_position, "CÉDULA")
                p.drawString(1.5*inch, y_position, "NOMBRE")
                p.drawString(3.0*inch, y_position, "APELLIDO")
                p.drawString(4.5*inch, y_position, "EMAIL")
                p.drawString(6.5*inch, y_position, "ROL")
                p.drawString(7.2*inch, y_position, "ESTADO")
                y_position -= line_height
                p.line(0.4*inch, y_position, 8.0*inch, y_position)
                y_position -= 0.1*inch
                p.setFont("Helvetica", 8)

            p.drawString(0.5*inch, y_position, str(usuario.cedula))
            p.drawString(1.5*inch, y_position, usuario.first_name[:15])
            p.drawString(3.0*inch, y_position, usuario.last_name[:15])
            p.drawString(4.5*inch, y_position, usuario.email[:25])
            
            # Obtener nombre del rol desde el grupo
            user_groups = usuario.groups.all()
            rol_name = user_groups[0].name if user_groups else "Sin Asignar"
            
            p.drawString(6.5*inch, y_position, rol_name)
            
            estado = "Activo" if usuario.is_active else "Inactivo"
            p.drawString(7.2*inch, y_position, estado)
            
            y_position -= line_height

        p.showPage()
        p.save()
        return response

    except Exception as e:
        return HttpResponse(f"Error generando PDF: {str(e)}", status=500)

from django.http import JsonResponse
from .forms import UsuarioForm
import json

@login_required
def crear_usuario_interno(request):
    if request.method == 'POST':
        form = UsuarioForm(request.POST)
        rol = request.POST.get('rol')
        
        if form.is_valid():
            if not rol:
                messages.error(request, 'Debes seleccionar un rol para el usuario.')
            else:
                user = form.save()
                
                # Asignar grupo
                from django.contrib.auth.models import Group
                try:
                    group = Group.objects.get(name=rol)
                    user.groups.add(group)
                    return redirect(f"{reverse('usuarios:menu_configuracion')}?registro_exitoso=1")
                except Group.DoesNotExist:
                    messages.error(request, f'El rol "{rol}" no existe en el sistema.')
                    # Si falla el rol, quizás deberíamos borrar el usuario o solo mostrar error?
                    # Por ahora mostramos error pero el usuario se creó. 
                    # Idealmente transactionv.atomic pero vamos simple.
    else:
        form = UsuarioForm()
    
    return render(request, 'usuarios/registro_interno.html', {'form': form})

@login_required
def crear_usuario_api(request):
    # Keeping this if needed, or we can deprecate it
    if request.method == 'POST':
        try:
             # Handle JSON
            if request.content_type == 'application/json':
                import json
                data = json.loads(request.body)
                form = UsuarioForm(data)
            else:
                form = UsuarioForm(request.POST)

            if form.is_valid():
                user = form.save()
                return JsonResponse({'success': True, 'message': 'Usuario registrado exitosamente', 'user_id': user.id})
            else:
                # Return validation errors
                return JsonResponse({
                    'success': False, 
                    'errors': form.errors
                }, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'errors': {'non_field_errors': [str(e)]}}, status=500)
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

# ===== API VIEWS =====

@login_required
@login_required
def editar_usuario_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('id')
            first_name = data.get('first_name')
            last_name = data.get('last_name')
            email = data.get('email')
            rol_nombre = data.get('rol')
            
            from .models import Usuario
            from django.contrib.auth.models import Group
            
            user = Usuario.objects.get(pk=user_id)
            
            # PROTECCIÓN: No editar al Dueño si no eres Dueño (o validación extra si se quiere)
            # Por ahora la protección está en el frontend, y el backend debería validar también.
            # Asumiremos que si el usuario a editar es Dueño, no se permite cambio de rol.
            es_dueno = user.groups.filter(name='Dueño').exists()
            if es_dueno:
                 return JsonResponse({'success': False, 'error': 'No se puede editar al usuario Dueño.'}, status=403)

            # Validaciones básicas
            if not email or '@' not in email:
                return JsonResponse({'success': False, 'error': 'Email inválido'}, status=400)
            if not first_name or not last_name:
                return JsonResponse({'success': False, 'error': 'Nombre y Apellido son obligatorios'}, status=400)
            if not rol_nombre:
                return JsonResponse({'success': False, 'error': 'El rol es obligatorio'}, status=400)

            # Actualizar datos básicos
            user.first_name = first_name.upper()
            user.last_name = last_name.upper()
            user.email = email
            user.save()
            
            # Actualizar Rol
            try:
                nuevo_grupo = Group.objects.get(name=rol_nombre)
                # Limpiar grupos anteriores y asignar el nuevo
                user.groups.clear()
                user.groups.add(nuevo_grupo)
            except Group.DoesNotExist:
                 return JsonResponse({'success': False, 'error': 'El rol seleccionado no existe.'}, status=400)
            
            return JsonResponse({'success': True})
        except Usuario.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Usuario no encontrado'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
            
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required
def cambiar_estado_usuario_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('id')
            
            from .models import Usuario
            user = Usuario.objects.get(pk=user_id)
            
            # PROTECCIÓN: No desactivar al Dueño
            if user.groups.filter(name='Dueño').exists():
                 return JsonResponse({'success': False, 'error': 'No se puede desactivar al Dueño del sistema.'}, status=403)
            
            user.is_active = not user.is_active
            user.save()
            
            return JsonResponse({'success': True, 'new_status': user.is_active})
        except Usuario.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Usuario no encontrado'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
            
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)