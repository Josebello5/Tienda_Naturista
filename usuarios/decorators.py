"""
Decoradores personalizados para control de acceso basado en roles (RBAC)
"""
from functools import wraps
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.contrib import messages
from django.http import HttpResponseForbidden


def role_required(*roles):
    """
    Decorador que verifica si el usuario pertenece a alguno de los roles especificados.
    
    Uso:
        @role_required('Dueño')
        @role_required('Dueño', 'Administrador')
        
    Args:
        *roles: Nombres de los grupos/roles permitidos
        
    Returns:
        Decorador que valida el acceso basado en roles
    """
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(request, *args, **kwargs):
            # Verificar si el usuario pertenece a alguno de los roles permitidos
            if request.user.groups.filter(name__in=roles).exists():
                return view_func(request, *args, **kwargs)
            else:
                messages.error(
                    request, 
                    'No tienes permisos para acceder a esta sección.'
                )
                return redirect('dashboard:menu')
        return wrapper
    return decorator


def permission_required_custom(permission_codename):
    """
    Decorador que verifica si el usuario tiene un permiso personalizado específico.
    
    Uso:
        @permission_required_custom('can_void_sales')
        @permission_required_custom('can_print_general_reports')
        
    Args:
        permission_codename: Código del permiso (sin el prefijo 'usuarios.')
        
    Returns:
        Decorador que valida el permiso personalizado
    """
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(request, *args, **kwargs):
            # Verificar si el usuario tiene el permiso
            if request.user.has_perm(f'usuarios.{permission_codename}'):
                return view_func(request, *args, **kwargs)
            else:
                messages.error(
                    request, 
                    'No tienes permisos para realizar esta acción.'
                )
                return redirect('dashboard:menu')
        return wrapper
    return decorator


def admin_or_owner_required(view_func):
    """
    Decorador que permite acceso solo a Dueño o Administrador.
    
    Uso:
        @admin_or_owner_required
        def mi_vista(request):
            ...
    """
    @wraps(view_func)
    @login_required
    def wrapper(request, *args, **kwargs):
        if request.user.groups.filter(name__in=['Dueño', 'Administrador']).exists():
            return view_func(request, *args, **kwargs)
        else:
            messages.error(
                request, 
                'Solo administradores y dueños pueden acceder a esta sección.'
            )
            return redirect('dashboard:menu')
    return wrapper


def owner_required(view_func):
    """
    Decorador que permite acceso solo al Dueño.
    
    Uso:
        @owner_required
        def mi_vista(request):
            ...
    """
    @wraps(view_func)
    @login_required
    def wrapper(request, *args, **kwargs):
        if request.user.groups.filter(name='Dueño').exists():
            return view_func(request, *args, **kwargs)
        else:
            messages.error(
                request, 
                'Solo el dueño puede acceder a esta sección.'
            )
            return redirect('dashboard:menu')
    return wrapper


def ajax_permission_required(permission_codename):
    """
    Decorador específico para vistas AJAX que requieren permisos.
    Retorna JSON en lugar de redirigir.
    
    Uso:
        @ajax_permission_required('can_void_sales')
        def mi_vista_ajax(request):
            ...
    """
    from django.http import JsonResponse
    
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(request, *args, **kwargs):
            if request.user.has_perm(f'usuarios.{permission_codename}'):
                return view_func(request, *args, **kwargs)
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'No tienes permisos para realizar esta acción.'
                }, status=403)
        return wrapper
    return decorator
