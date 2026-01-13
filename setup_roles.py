
import os
import django
import sys

# Configure Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tienda_naturista.settings")
django.setup()

from django.contrib.auth.models import Group, User
from usuarios.models import Usuario

def setup_roles():
    print("Setting up roles...")
    
    # 1. Create Groups
    groups = ['Dueño', 'Administrador', 'Cajero']
    for name in groups:
        group, created = Group.objects.get_or_create(name=name)
        if created:
            print(f"Created group: {name}")
        else:
            print(f"Group already exists: {name}")

    # 2. Assign 'Dueño' to 31752146
    try:
        dueno = Usuario.objects.get(cedula='31752146')
        dueno_group = Group.objects.get(name='Dueño')
        dueno.groups.add(dueno_group)
        dueno.is_superuser = True
        dueno.is_staff = True
        dueno.save()
        print(f"Assigned 'Dueño' role and superuser status to {dueno}")
    except Usuario.DoesNotExist:
        print("User 31752146 not found!")

    # 3. Distribute 'Administrador' and 'Cajero' to others
    otros_usuarios = Usuario.objects.exclude(cedula='31752146').order_by('id')
    
    admin_group = Group.objects.get(name='Administrador')
    cajero_group = Group.objects.get(name='Cajero')
    
    count = 0
    mitad = otros_usuarios.count() // 2
    
    for usuario in otros_usuarios:
        # Clear existing groups to avoid duplication/confusion during this setup
        usuario.groups.clear()
        
        if count < mitad:
            usuario.groups.add(admin_group)
            print(f"Assigned 'Administrador' to {usuario}")
        else:
            usuario.groups.add(cajero_group)
            print(f"Assigned 'Cajero' to {usuario}")
        count += 1
        
    print("Roles setup complete.")

if __name__ == "__main__":
    setup_roles()
