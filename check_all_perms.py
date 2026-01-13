from django.contrib.auth.models import Group, Permission
from usuarios.models import Usuario

print("="*60)
print("VERIFICACION COMPLETA DE PERMISOS")
print("="*60)

# Listar todos los grupos
print("\n[GRUPOS EXISTENTES]")
for group in Group.objects.all():
    print(f"  - {group.name} ({group.permissions.count()} permisos)")

# Verificar permisos de cada grupo
for group in Group.objects.all():
    print(f"\n[PERMISOS DEL GRUPO: {group.name}]")
    if group.permissions.count() > 0:
        for perm in group.permissions.all():
            print(f"  + {perm.codename}")
    else:
        print("  (sin permisos personalizados)")

# Verificar usuarios
print("\n[USUARIOS Y SUS GRUPOS]")
for user in Usuario.objects.all()[:5]:  # Solo primeros 5
    grupos = [g.name for g in user.groups.all()]
    print(f"  - {user.username}: {grupos if grupos else '(sin grupo)'}")

# Verificar un admin específicamente
admin = Usuario.objects.filter(groups__name='Administrador').first()
if admin:
    print(f"\n[VERIFICACION ADMINISTRADOR: {admin.username}]")
    print(f"  Grupos: {[g.name for g in admin.groups.all()]}")
    
    # Verificar DIRECTAMENTE con el grupo
    admin_group = Group.objects.get(name='Administrador')
    permisos_grupo = [p.codename for p in admin_group.permissions.all()]
    print(f"  Permisos del grupo Administrador: {permisos_grupo}")
    
    # Verificar get_all_permissions
    all_perms = admin.get_all_permissions()
    usuarios_perms = [p for p in all_perms if 'usuarios' in p]
    print(f"  Permisos usuarios del usuario: {usuarios_perms}")

print("\n" + "="*60)
