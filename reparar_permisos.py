import os
import django
import sys

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda_naturista.settings')
django.setup()

from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from usuarios.models import Usuario

def reparar_permisos():
    print("\n" + "="*50)
    print("   REPARANDO PERMISOS DEL GRUPO DUEÑO")
    print("="*50 + "\n")

    # 1. Obtener o crear grupo Dueño
    grupo_dueno, created = Group.objects.get_or_create(name='Dueño')
    if created:
        print("[INFO] Se creó el grupo 'Dueño'.")
    else:
        print("[OK] El grupo 'Dueño' ya existe.")

    # 2. DEFINIR PERMISOS CRÍTICOS
    # Lista de codenames que el dueño DEBE tener
    permisos_codenames = [
        'can_void_sales',        # Anular ventas
        'can_print_reports',     # Imprimir reportes
        'can_view_stats',        # Ver estadísticas
        'can_manage_prices',     # Gestionar precios
        'can_manage_inventory',  # Inventario
        'can_closing_cash',      # Cierre de caja
        # Agregar permisos estándar de Django si son necesarios para admin
        'add_usuario', 'change_usuario', 'delete_usuario', 'view_usuario',
        'add_logentry', 'view_logentry',
    ]

    print(f"\n[INFO] Asignando {len(permisos_codenames)} permisos críticos al grupo...")

    count = 0
    for codename in permisos_codenames:
        try:
            # Intentar encontrar el permiso por codename (sin importar el content_type)
            perms = Permission.objects.filter(codename=codename)
            if perms.exists():
                for perm in perms:
                    grupo_dueno.permissions.add(perm)
                count += 1
            else:
                print(f"[WARN] No se encontró permiso con código: {codename} (Puede ser normal si no se ha migrado algo)")
        except Exception as e:
            print(f"[ERROR] Falló al asignar {codename}: {e}")

    # 3. Asignar TODOS los permisos de la aplicación también (opcional pero recomendado para dueño)
    # Esto asegura que si se crean nuevos permisos, el dueño los tenga
    print("[INFO] Asegurando permisos completos de administración...")
    todos_permisos = Permission.objects.all()
    for perm in todos_permisos:
        grupo_dueno.permissions.add(perm)
    
    grupo_dueno.save()
    print(f"\n[OK] Se han asignado TODOS los permisos ({todos_permisos.count()}) al grupo Dueño.")

    print("\n" + "="*50)
    print("   REPARACIÓN COMPLETADA Exitosamente")
    print("="*50 + "\n")

if __name__ == '__main__':
    reparar_permisos()
