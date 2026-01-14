import os
import django
import sys

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda_naturista.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

def asignar_dueno():
    print("\n" + "="*50)
    print("   ASIGNAR PERMISOS DE DUEÑO (PROPIETARIO)")
    print("="*50 + "\n")
    
    while True:
        username = input("Ingrese el nombre de usuario (Cédula) a configurar: ").strip()
        if username:
            break
        print("El usuario no puede estar vacío.")

    try:
        user = User.objects.get(username=username)
        print(f"\n[OK] Usuario '{username}' encontrado: {user.first_name} {user.last_name}")
    except User.DoesNotExist:
        print(f"\n[!] El usuario '{username}' NO existe en la base de datos.")
        crear = input("¿Desea crear este usuario nuevo? (s/n): ").lower()
        if crear == 's':
            password = input("Ingrese la contraseña para el nuevo usuario: ")
            nombre = input("Nombre: ")
            apellido = input("Apellido: ")
            fecha_nacimiento = input("Fecha de nacimiento (YYYY-MM-DD): ")
            
            # Crear usuario con fecha de nacimiento por defecto si falla
            if not fecha_nacimiento:
                fecha_nacimiento = '2000-01-01'
                print(f"[INFO] Usando fecha por defecto: {fecha_nacimiento}")
                
                
            user = User.objects.create_user(username=username, password=password)
            user.first_name = nombre
            user.last_name = apellido
            user.fecha_nacimiento = fecha_nacimiento
            user.save()
            print(f"[OK] Usuario creado exitosamente.")
        else:
            print("Operación cancelada.")
            return

    # 1. Asegurar que existe el grupo Dueño
    grupo_dueno, created = Group.objects.get_or_create(name='Dueño')
    if created:
        print("[INFO] Se ha creado el grupo 'Dueño' que no existía.")

    # 2. Agregar al grupo Dueño
    if not user.groups.filter(name='Dueño').exists():
        user.groups.add(grupo_dueno)
        print(f"[OK] Usuario agregado al grupo 'Dueño'.")
    else:
        print(f"[INFO] El usuario ya pertenecía al grupo 'Dueño'.")

    # 3. Dar permisos de Superusuario (Administrador total)
    if not user.is_superuser:
        user.is_superuser = True
        user.is_staff = True
        user.save()
        print(f"[OK] Se han activado los permisos de Superusuario/Administrador.")
    else:
        print(f"[INFO] El usuario ya era Superusuario.")

    print("\n" + "="*50)
    print("   ¡LISTO! PERMISOS ASIGNADOS CORRECTAMENTE")
    print("="*50 + "\n")

if __name__ == '__main__':
    asignar_dueno()
