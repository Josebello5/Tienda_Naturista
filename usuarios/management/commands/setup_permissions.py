from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from usuarios.models import Usuario


class Command(BaseCommand):
    help = 'Configura permisos personalizados y los asigna a los grupos de roles'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Iniciando configuración de permisos ===\n'))
        
        # 1. Obtener ContentType para el modelo Usuario
        content_type = ContentType.objects.get_for_model(Usuario)
        
        # 2. Definir permisos personalizados
        permisos_personalizados = [
            {
                'codename': 'can_void_sales',
                'name': 'Puede devolver/anular ventas',
                'description': 'Permiso para devolver o anular ventas (Solo Dueño)'
            },
            {
                'codename': 'can_add_exchange_rate',
                'name': 'Puede agregar tasa cambiaria',
                'description': 'Permiso para agregar nuevas tasas cambiarias (Dueño y Administrador)'
            },
            {
                'codename': 'can_access_statistics',
                'name': 'Puede acceder a estadísticas',
                'description': 'Permiso para ver el módulo de estadísticas (Dueño y Administrador)'
            },
            {
                'codename': 'can_access_configuration',
                'name': 'Puede acceder a configuración',
                'description': 'Permiso para acceder al módulo de configuración (Solo Dueño)'
            },
            {
                'codename': 'can_print_general_reports',
                'name': 'Puede imprimir reportes generales',
                'description': 'Permiso para imprimir reportes y listados generales (Dueño y Administrador)'
            },
            {
                'codename': 'can_manage_products',
                'name': 'Puede gestionar productos',
                'description': 'Permiso para agregar/editar productos, categorías, patologías, etc. (Dueño y Administrador)'
            },
        ]
        
        # 3. Crear o obtener permisos
        self.stdout.write('Creando permisos personalizados...')
        permisos_creados = {}
        
        for perm_data in permisos_personalizados:
            permiso, created = Permission.objects.get_or_create(
                codename=perm_data['codename'],
                content_type=content_type,
                defaults={'name': perm_data['name']}
            )
            permisos_creados[perm_data['codename']] = permiso
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'  + Creado: {perm_data["name"]}'))
            else:
                self.stdout.write(f'  - Ya existe: {perm_data["name"]}')
        
        # 4. Obtener o crear grupos
        self.stdout.write('\nConfigurando grupos...')
        grupo_dueno, _ = Group.objects.get_or_create(name='Dueño')
        grupo_admin, _ = Group.objects.get_or_create(name='Administrador')
        grupo_cajero, _ = Group.objects.get_or_create(name='Cajero')
        
        self.stdout.write(self.style.SUCCESS('  + Grupos verificados: Dueno, Administrador, Cajero'))
        
        # 5. Limpiar permisos existentes de los grupos
        self.stdout.write('\nLimpiando permisos anteriores...')
        grupo_dueno.permissions.clear()
        grupo_admin.permissions.clear()
        grupo_cajero.permissions.clear()
        
        # 6. Asignar permisos a Dueño (TODOS)
        self.stdout.write('\nAsignando permisos al grupo "Dueño"...')
        for codename, permiso in permisos_creados.items():
            grupo_dueno.permissions.add(permiso)
            self.stdout.write(f'  + {permiso.name}')
        
        # 7. Asignar permisos a Administrador (todos excepto can_void_sales y can_access_configuration)
        self.stdout.write('\nAsignando permisos al grupo "Administrador"...')
        permisos_admin = [
            'can_add_exchange_rate',
            'can_access_statistics',
            'can_print_general_reports',
            'can_manage_products',
        ]
        for codename in permisos_admin:
            permiso = permisos_creados[codename]
            grupo_admin.permissions.add(permiso)
            self.stdout.write(f'  + {permiso.name}')
        
        # 8. Cajero no tiene permisos especiales (solo permisos básicos de Django)
        self.stdout.write('\nGrupo "Cajero": Sin permisos especiales')
        self.stdout.write('  - El cajero tiene acceso de visualización y puede imprimir comprobantes individuales')
        
        # 9. Resumen final
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('+ Configuracion de permisos completada exitosamente'))
        self.stdout.write('='*60)
        
        self.stdout.write('\nRESUMEN DE PERMISOS POR GRUPO:')
        self.stdout.write(f'\n[DUENO] ({grupo_dueno.permissions.count()} permisos):')
        for perm in grupo_dueno.permissions.all():
            self.stdout.write(f'   + {perm.name}')
        
        self.stdout.write(f'\n[ADMINISTRADOR] ({grupo_admin.permissions.count()} permisos):')
        for perm in grupo_admin.permissions.all():
            self.stdout.write(f'   + {perm.name}')
        
        self.stdout.write(f'\n[CAJERO] ({grupo_cajero.permissions.count()} permisos):')
        if grupo_cajero.permissions.count() == 0:
            self.stdout.write('   - Sin permisos personalizados (acceso básico)')
        else:
            for perm in grupo_cajero.permissions.all():
                self.stdout.write(f'   + {perm.name}')
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\nListo! Los permisos han sido configurados correctamente.'))
        self.stdout.write('Puedes verificar los permisos en Django Admin o continuar con la Fase 2.\n')
