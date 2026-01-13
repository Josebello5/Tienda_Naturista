from django.contrib.auth.models import Group
from usuarios.models import Usuario

print("="*60)
print("VERIFICACION FINAL DE PERMISOS - FASE 3")
print("="*60)

# Verificar Dueño
dueno = Usuario.objects.get(cedula='31752146')
print(f"\n[DUENO: {dueno.username}]")
print(f"Grupos: {[g.name for g in dueno.groups.all()]}")
# Forzar recarga de permisos desde la BD
dueno._perm_cache = None
dueno._user_perm_cache = None
dueno._group_perm_cache = None
print(f"+ Puede agregar tasa: {dueno.has_perm('usuarios.can_add_exchange_rate')}")
print(f"+ Puede acceder config: {dueno.has_perm('usuarios.can_access_configuration')}")
print(f"+ Puede acceder stats: {dueno.has_perm('usuarios.can_access_statistics')}")
print(f"+ Puede gestionar productos: {dueno.has_perm('usuarios.can_manage_products')}")
print(f"+ Puede devolver ventas: {dueno.has_perm('usuarios.can_void_sales')}")

# Verificar Administrador
admin = Usuario.objects.filter(groups__name='Administrador').first()
if admin:
    print(f"\n[ADMINISTRADOR: {admin.username}]")
    print(f"Grupos: {[g.name for g in admin.groups.all()]}")
    # Forzar recarga
    admin._perm_cache = None
    admin._user_perm_cache = None
    admin._group_perm_cache = None
    print(f"+ Puede agregar tasa: {admin.has_perm('usuarios.can_add_exchange_rate')}")
    print(f"- Puede acceder config: {admin.has_perm('usuarios.can_access_configuration')}")
    print(f"+ Puede acceder stats: {admin.has_perm('usuarios.can_access_statistics')}")
    print(f"+ Puede gestionar productos: {admin.has_perm('usuarios.can_manage_products')}")
    print(f"- Puede devolver ventas: {admin.has_perm('usuarios.can_void_sales')}")

# Verificar Cajero
cajero = Usuario.objects.filter(groups__name='Cajero').first()
if cajero:
    print(f"\n[CAJERO: {cajero.username}]")
    print(f"Grupos: {[g.name for g in cajero.groups.all()]}")
    # Forzar recarga
    cajero._perm_cache = None
    cajero._user_perm_cache = None
    cajero._group_perm_cache = None
    print(f"- Puede agregar tasa: {cajero.has_perm('usuarios.can_add_exchange_rate')}")
    print(f"- Puede acceder config: {cajero.has_perm('usuarios.can_access_configuration')}")
    print(f"- Puede acceder stats: {cajero.has_perm('usuarios.can_access_statistics')}")
    print(f"- Puede gestionar productos: {cajero.has_perm('usuarios.can_manage_products')}")
    print(f"- Puede devolver ventas: {cajero.has_perm('usuarios.can_void_sales')}")

print("\n" + "="*60)
print("LEYENDA: + = Debe tener permiso | - = NO debe tener permiso")
print("="*60)
