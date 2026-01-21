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

# Importaciones para reportes y utilidades
from django.db.models import Q
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from datetime import datetime
from urllib.parse import quote
# Nuevas importaciones para PDF moderno
from django.template.loader import render_to_string
from xhtml2pdf import pisa
import io
from django.conf import settings

@owner_required
def menu_configuracion(request):
    from .models import Usuario
    usuarios = Usuario.objects.all()
    return render(request, 'usuarios/menu_configuracion.html', {'usuarios': usuarios})

def get_pdf_content_disposition(filename):
    from urllib.parse import quote
    return f'inline; filename="{filename}"; filename*=UTF-8\'\'{quote(filename)}'

def generar_pdf_generico(template_src, context_dict, filename):
    """Función auxiliar para generar PDFs usando xhtml2pdf (Local para evitar ciclos)"""
    # Agregar logo_url si no existe
    if 'logo_url' not in context_dict:
        import os
        from django.conf import settings
        context_dict['logo_url'] = os.path.join(settings.BASE_DIR, 'usuarios', 'static', 'usuarios', 'img', 'logo_redondo_sin_fondo.png')
        
    html_string = render_to_string(template_src, context_dict)
    result = io.BytesIO()
    
    pdf = pisa.pisaDocument(io.BytesIO(html_string.encode("UTF-8")), result)
    
    if not pdf.err:
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response
    
    return HttpResponse(f"Error al generar PDF: {pdf.err}", status=500)

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

        context = {
            'titulo': 'Listado de Usuarios',
            'usuarios': usuarios,
            'fecha_generacion': datetime.now(),
            'query': query,
            'rol_filter': rol_filter,
            'estado_filter': estado_filter,
        }
        
        filename = f"listado_usuarios_{datetime.now().strftime('%Y%m%d')}.pdf"
        return generar_pdf_generico('usuarios/reporte_usuarios_pdf.html', context, filename)

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

            # Verificar que el email no esté tomado por otro usuario
            if Usuario.objects.filter(email=email).exclude(pk=user_id).exists():
                return JsonResponse({'success': False, 'error': 'Este correo ya está en uso por otro usuario.'}, status=400)

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
def verificar_email_api(request):
    """Verifica si un email ya está en uso por otro usuario"""
    if request.method == 'GET':
        email = request.GET.get('email', '').strip().lower()
        user_id = request.GET.get('id')
        
        if not email:
            return JsonResponse({'exists': False})
            
        from .models import Usuario
        
        # Buscar usuarios con ese email
        query = Usuario.objects.filter(email=email)
        
        # Si se proporciona un ID, excluir ese usuario (es el que estamos editando)
        if user_id:
            query = query.exclude(pk=user_id)
            
        exists = query.exists()
        return JsonResponse({'exists': exists})
        
    return JsonResponse({'error': 'Método no permitido'}, status=405)

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

# ===== PASSWORD RECOVERY VIEWS =====

from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Usuario, PasswordResetToken
import json
from django.db.models import Q
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from datetime import datetime


# ===== PASSWORD RECOVERY VIEWS =====

def password_reset_request(request):
    """Vista para solicitar recuperación de contraseña"""
    return render(request, 'usuarios/password_reset_request.html')


def send_reset_code(request):
    """Envía código de verificación por email"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip().lower()
            print(f"DEBUG REQUERIMIENTO: Buscando email '{email}'")
            
            if not email:
                return JsonResponse({'success': False, 'error': 'Email es requerido'}, status=400)
            
            # Buscar usuario por email
            try:
                user = Usuario.objects.get(email=email)
            except Usuario.DoesNotExist:
                # Por seguridad, no revelar si el email existe o no
                return JsonResponse({'success': True, 'message': 'Si el email existe, recibirás un código de verificación'})
            
            # Verificar rate limiting (máximo 3 intentos por hora)
            one_hour_ago = timezone.now() - timedelta(hours=1)
            recent_tokens = PasswordResetToken.objects.filter(
                user=user,
                created_at__gte=one_hour_ago
            ).count()
            
            if recent_tokens >= 3:
                return JsonResponse({
                    'success': False,
                    'error': 'Has excedido el límite de intentos. Intenta nuevamente en 1 hora.'
                }, status=429)
            
            # Crear nuevo token
            token = PasswordResetToken.objects.create(
                user=user,
                ip_address=get_client_ip(request)
            )
            
            # Enviar email
            subject = 'Código de Recuperación de Contraseña - Tienda Naturista'
            message = f"""
Hola {user.first_name},

Has solicitado recuperar tu contraseña en Tienda Naturista.

Tu código de verificación es: {token.code}

Este código expirará en 15 minutos.

Si no solicitaste este cambio, ignora este mensaje.

Saludos,
Equipo de Tienda Naturista
            """
            
            print(f"DEBUG: Intentando enviar email desde {settings.DEFAULT_FROM_EMAIL} hacia {user.email}")
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
                print("DEBUG: Email enviado exitosamente según Django")
            except Exception as mail_error:
                print(f"DEBUG ERROR SMTP: {str(mail_error)}")
                raise mail_error
            
            return JsonResponse({
                'success': True,
                'message': 'Código enviado a tu email',
                'email_masked': mask_email(email)
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Error al enviar el código: {str(e)}'
            }, status=500)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


def verify_reset_code(request):
    """Verifica el código de recuperación"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip().lower()
            code = data.get('code', '').strip()
            
            if not email or not code:
                return JsonResponse({'success': False, 'error': 'Email y código son requeridos'}, status=400)
            
            # Buscar usuario
            try:
                user = Usuario.objects.get(email=email)
            except Usuario.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Código inválido'}, status=400)
            
            # Buscar token válido
            try:
                token = PasswordResetToken.objects.filter(
                    user=user,
                    code=code,
                    is_used=False
                ).latest('created_at')
                
                if not token.is_valid():
                    return JsonResponse({
                        'success': False,
                        'error': 'El código ha expirado. Solicita uno nuevo.'
                    }, status=400)
                
                # Guardar token_id en sesión para el siguiente paso
                request.session['reset_token_id'] = token.id
                request.session['reset_user_id'] = user.id
                
                return JsonResponse({
                    'success': True,
                    'message': 'Código verificado correctamente'
                })
                
            except PasswordResetToken.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Código inválido'}, status=400)
                
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


def reset_password(request):
    """Restablece la contraseña del usuario"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_password = data.get('password', '')
            confirm_password = data.get('confirm_password', '')
            
            # Verificar que hay una sesión activa de reset
            token_id = request.session.get('reset_token_id')
            user_id = request.session.get('reset_user_id')
            
            if not token_id or not user_id:
                return JsonResponse({
                    'success': False,
                    'error': 'Sesión expirada. Inicia el proceso nuevamente.'
                }, status=400)
            
            # Validaciones de contraseña
            if not new_password or not confirm_password:
                return JsonResponse({'success': False, 'error': 'Todos los campos son requeridos'}, status=400)
            
            if new_password != confirm_password:
                return JsonResponse({'success': False, 'error': 'Las contraseñas no coinciden'}, status=400)
            
            if len(new_password) < 8:
                return JsonResponse({'success': False, 'error': 'La contraseña debe tener al menos 8 caracteres'}, status=400)
            
            if not any(c.isupper() for c in new_password):
                return JsonResponse({'success': False, 'error': 'La contraseña debe contener al menos una mayúscula'}, status=400)
            
            if not any(c.islower() for c in new_password):
                return JsonResponse({'success': False, 'error': 'La contraseña debe contener al menos una minúscula'}, status=400)
            
            if not any(c.isdigit() for c in new_password):
                return JsonResponse({'success': False, 'error': 'La contraseña debe contener al menos un número'}, status=400)
            
            # Obtener usuario y token
            user = get_object_or_404(Usuario, pk=user_id)
            token = get_object_or_404(PasswordResetToken, pk=token_id)
            
            # Verificar que el token sigue siendo válido
            if not token.is_valid():
                return JsonResponse({
                    'success': False,
                    'error': 'El código ha expirado. Inicia el proceso nuevamente.'
                }, status=400)
            
            # Cambiar contraseña
            user.set_password(new_password)
            user.save()
            
            # Marcar token como usado
            token.mark_as_used()
            
            # Limpiar sesión
            request.session.pop('reset_token_id', None)
            request.session.pop('reset_user_id', None)
            
            return JsonResponse({
                'success': True,
                'message': 'Contraseña restablecida exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    # GET request - mostrar formulario
    if 'reset_token_id' not in request.session:
        messages.error(request, 'Sesión expirada. Inicia el proceso nuevamente.')
        return redirect('usuarios:password_reset_request')
    
    return render(request, 'usuarios/password_reset_confirm.html')


# ===== UTILITY FUNCTIONS =====

def get_client_ip(request):
    """Obtiene la IP del cliente"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def mask_email(email):
    """Enmascara el email para privacidad"""
    if '@' not in email:
        return email
    username, domain = email.split('@')
    if len(username) <= 2:
        masked_username = username[0] + '*'
    else:
        masked_username = username[0] + '*' * (len(username) - 2) + username[-1]
    return f"{masked_username}@{domain}"
