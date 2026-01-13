"""
Context processor para permisos de usuario
Hace disponibles las variables de rol en todos los templates
"""

def user_permissions(request):
    """
    Context processor que agrega información de roles y permisos del usuario
    a todos los templates.
    
    Variables disponibles en templates:
    - is_dueno: Boolean - True si el usuario es Dueño
    - is_admin: Boolean - True si el usuario es Administrador
    - is_cajero: Boolean - True si el usuario es Cajero
    """
    if request.user.is_authenticated:
        return {
            'is_dueno': request.user.groups.filter(name='Dueño').exists(),
            'is_admin': request.user.groups.filter(name='Administrador').exists(),
            'is_cajero': request.user.groups.filter(name='Cajero').exists(),
        }
    return {
        'is_dueno': False,
        'is_admin': False,
        'is_cajero': False,
    }
