import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda_naturista.settings')
django.setup()

from django.contrib.auth.models import Group
from usuarios.context_processors import user_permissions

# Check Group Name in DB
try:
    g = Group.objects.get(name__startswith='Due')
    print(f"DB Group Name: {g.name}")
    print(f"DB Group Name repr: {ascii(g.name)}")
    
    # Check Literal Match
    literal = 'Dueño'
    print(f"Script Literal: {literal}")
    print(f"Script Literal repr: {ascii(literal)}")
    
    if g.name == literal:
        print("MATCH: Database group name matches script literal.")
    else:
        print("MISMATCH: Database group name DOES NOT match script literal.")
        
except Group.DoesNotExist:
    print("Group starting with 'Due' not found in DB.")

