"""
Funciones auxiliares para manejo de roles y permisos
"""


def user_has_role(user, role_name):
    """
    Verifica si un usuario tiene un rol específico.
    
    Args:
        user: Objeto Usuario
        role_name: Nombre del rol/grupo (ej: 'Dueño', 'Administrador', 'Cajero')
        
    Returns:
        bool: True si el usuario tiene el rol, False en caso contrario
        
    Uso en templates:
        {% load permissions_tags %}
        {% if user|has_role:'Dueño' %}
            <!-- contenido solo para dueño -->
        {% endif %}
    
    Uso en views:
        from usuarios.utils import user_has_role
        if user_has_role(request.user, 'Dueño'):
            # código para dueño
    """
    if not user.is_authenticated:
        return False
    return user.groups.filter(name=role_name).exists()


def user_has_any_role(user, roles):
    """
    Verifica si un usuario tiene alguno de los roles especificados.
    
    Args:
        user: Objeto Usuario
        roles: Lista de nombres de roles (ej: ['Dueño', 'Administrador'])
        
    Returns:
        bool: True si el usuario tiene al menos uno de los roles
    """
    if not user.is_authenticated:
        return False
    return user.groups.filter(name__in=roles).exists()


def user_has_permission(user, permission_codename):
    """
    Verifica si un usuario tiene un permiso personalizado.
    
    Args:
        user: Objeto Usuario
        permission_codename: Código del permiso (ej: 'can_void_sales')
        
    Returns:
        bool: True si el usuario tiene el permiso
    """
    if not user.is_authenticated:
        return False
    
    # Verificar si alguno de los grupos del usuario tiene el permiso
    user_groups = user.groups.all()
    for group in user_groups:
        if group.permissions.filter(codename=permission_codename).exists():
            return True
    
    # También verificar permisos directos del usuario
    from django.contrib.contenttypes.models import ContentType
    from usuarios.models import Usuario
    content_type = ContentType.objects.get_for_model(Usuario)
    return user.user_permissions.filter(
        codename=permission_codename,
        content_type=content_type
    ).exists()


def get_user_role(user):
    """
    Obtiene el rol principal del usuario (asume un rol por usuario).
    
    Args:
        user: Objeto Usuario
        
    Returns:
        str: Nombre del rol o None si no tiene rol asignado
    """
    if not user.is_authenticated:
        return None
    
    # Obtener el primer grupo asignado
    user_groups = user.groups.all()
    if user_groups:
        return user_groups[0].name
    return None


def is_owner(user):
    """Verifica si el usuario es Dueño"""
    return user_has_role(user, 'Dueño')


def is_admin(user):
    """Verifica si el usuario es Administrador"""
    return user_has_role(user, 'Administrador')


def is_cashier(user):
    """Verifica si el usuario es Cajero"""
    return user_has_role(user, 'Cajero')


def is_admin_or_owner(user):
    """Verifica si el usuario es Administrador o Dueño"""
    return user_has_any_role(user, ['Dueño', 'Administrador'])


def can_print_reports(user):
    """Verifica si el usuario puede imprimir reportes generales"""
    return user_has_permission(user, 'can_print_general_reports')


def can_void_sales(user):
    """Verifica si el usuario puede devolver/anular ventas"""
    return user_has_permission(user, 'can_void_sales')


def can_manage_products(user):
    """Verifica si el usuario puede gestionar productos"""
    return user_has_permission(user, 'can_manage_products')


def can_access_statistics(user):
    """Verifica si el usuario puede acceder a estadísticas"""
    return user_has_permission(user, 'can_access_statistics')


def can_access_configuration(user):
    """Verifica si el usuario puede acceder a configuración"""
    return user_has_permission(user, 'can_access_configuration')


def can_add_exchange_rate(user):
    """Verifica si el usuario puede agregar tasas cambiarias"""
    return user_has_permission(user, 'can_add_exchange_rate')
