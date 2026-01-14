import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda_naturista.settings')
django.setup()

from usuarios.models import Usuario
from usuarios.utils import is_owner
from usuarios.context_processors import user_permissions
from django.test import RequestFactory

try:
    # Get the known owner user
    user = Usuario.objects.get(username='30984087')
    print(f"Testing User: {user.username}")
    
    # 1. Direct Permission Check
    has_perm = user.has_perm('usuarios.can_access_configuration')
    print(f"Direct has_perm('usuarios.can_access_configuration'): {has_perm}")
    
    # 2. Utils Check
    is_owner_result = is_owner(user)
    print(f"utils.is_owner(user): {is_owner_result}")
    
    # 3. Context Processor Check
    factory = RequestFactory()
    request = factory.get('/')
    request.user = user
    context = user_permissions(request)
    print(f"context_processor 'is_dueno': {context.get('is_dueno')}")
    
    if has_perm and is_owner_result and context.get('is_dueno'):
        print("\nSUCCESS: All checks passed. The user is correctly identified as Owner via permissions.")
    else:
        print("\nFAILURE: Some checks failed.")
        
except Usuario.DoesNotExist:
    print("User 30984087 not found.")
except Exception as e:
    print(f"Error: {e}")
