"""
Template tags personalizados para verificación de roles y permisos
"""
from django import template
from usuarios.utils import (
    user_has_role,
    user_has_any_role,
    user_has_permission,
    is_owner,
    is_admin,
    is_cashier,
    is_admin_or_owner,
)

register = template.Library()


@register.filter(name='has_role')
def has_role(user, role_name):
    """
    Template filter para verificar si un usuario tiene un rol específico.
    
    Uso:
        {% if user|has_role:'Dueño' %}
            <!-- contenido solo para dueño -->
        {% endif %}
    """
    return user_has_role(user, role_name)


@register.filter(name='has_any_role')
def has_any_role(user, roles_string):
    """
    Template filter para verificar si un usuario tiene alguno de los roles.
    
    Uso:
        {% if user|has_any_role:'Dueño,Administrador' %}
            <!-- contenido para dueño o admin -->
        {% endif %}
    """
    roles = [role.strip() for role in roles_string.split(',')]
    return user_has_any_role(user, roles)


@register.filter(name='has_permission')
def has_permission(user, permission_codename):
    """
    Template filter para verificar si un usuario tiene un permiso.
    
    Uso:
        {% if user|has_permission:'can_void_sales' %}
            <!-- contenido para usuarios con permiso -->
        {% endif %}
    """
    return user_has_permission(user, permission_codename)


@register.simple_tag
def user_is_owner(user):
    """
    Template tag para verificar si es Dueño.
    
    Uso:
        {% user_is_owner user as is_owner %}
        {% if is_owner %}...{% endif %}
    """
    return is_owner(user)


@register.simple_tag
def user_is_admin(user):
    """
    Template tag para verificar si es Administrador.
    
    Uso:
        {% user_is_admin user as is_admin %}
        {% if is_admin %}...{% endif %}
    """
    return is_admin(user)


@register.simple_tag
def user_is_cashier(user):
    """
    Template tag para verificar si es Cajero.
    
    Uso:
        {% user_is_cashier user as is_cajero %}
        {% if is_cajero %}...{% endif %}
    """
    return is_cashier(user)


@register.simple_tag
def user_is_admin_or_owner(user):
    """
    Template tag para verificar si es Administrador o Dueño.
    
    Uso:
        {% user_is_admin_or_owner user as can_access %}
        {% if can_access %}...{% endif %}
    """
    return is_admin_or_owner(user)
