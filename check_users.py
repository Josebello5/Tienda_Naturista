import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda_naturista.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("-" * 50)
print(f"{'USERNAME':<20} | {'GROUPS':<40} | {'IS_SUPERUSER'}")
print("-" * 50)

for user in User.objects.all():
    groups = [g.name for g in user.groups.all()]
    groups_str = ", ".join(groups) if groups else "No Groups"
    print(f"{user.username:<20} | {groups_str:<40} | {user.is_superuser}")

print("-" * 50)
