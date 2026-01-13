
import os
import django
import sys

# Add project root to sys.path if not present
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda_naturista.settings')
django.setup()

from usuarios.models import Usuario

try:
    # Try getting by cedula first as it's the username
    try:
        user = Usuario.objects.get(username='77777777')
    except Usuario.DoesNotExist:
        user = Usuario.objects.get(email='juan@test.com')

    user.is_active = False
    user.save()
    print(f"User {user.email} ({user.username}) deactivated successfully.")
except Usuario.DoesNotExist:
    print("User 77777777 / juan@test.com not found.")
except Exception as e:
    print(f"Error: {e}")
