from django.contrib.auth.models import Group, Permission

print("="*60)
print("VERIFICACION DE PERMISOS DE GRUPOS")
print("="*60)

# Verificar permisos del grupo Administrador
admin_group = Group.objects.get(name='Administrador')
print(f"\n[GRUPO ADMINISTRADOR]")
print(f"Total de permisos: {admin_group.permissions.count()}")
for perm in admin_group.permissions.all():
    print(f"  - {perm.codename}: {perm.name}")

# Verificar permisos del grupo Dueño
dueno_group = Group.objects.get(name='Dueño')
print(f"\n[GRUPO DUEÑO]")
print(f"Total de permisos: {dueno_group.permissions.count()}")
for perm in dueno_group.permissions.all():
    print(f"  - {perm.codename}: {perm.name}")

# Verificar usuarios en cada grupo
from usuarios.models import Usuario

admin_user = Usuario.objects.filter(groups__name='Administrador').first()
if admin_user:
    print(f"\n[USUARIO ADMINISTRADOR: {admin_user.username}]")
    print(f"Tiene grupo Administrador: {admin_user.groups.filter(name='Administrador').exists()}")
    # Verificar permiso usando get_all_permissions
    all_perms = admin_user.get_all_permissions()
    print(f"Permisos totales del usuario: {len(all_perms)}")
    for perm in sorted(all_perms):
        if 'usuarios.' in perm:
            print(f"  - {perm}")

print("\n" + "="*60)
