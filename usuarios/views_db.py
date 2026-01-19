import os
import json
import tempfile
from datetime import datetime
from django.core.management import call_command
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.db import transaction
from .decorators import owner_required

@owner_required
def exportar_base_datos(request):
    """
    Genera un backup de la base de datos en formato JSON.
    Excluye tablas de sistema que pueden causar conflictos al importar.
    """
    try:
        # Generar nombre del archivo con fecha y hora
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
        filename = f'backup_tienda_{timestamp}.json'
        
        # Crear archivo temporal para guardar el dump
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as temp_file:
            temp_file_path = temp_file.name
            
        # Ejecutar dumpdata excluyendo tablas problemáticas
        # Excluimos contenttypes y permissions porque se regeneran automáticamente
        # Excluimos sessions para no cerrar sesiones activas al importar
        # Excluimos admin.logentry para mantener el log limpio o reducir tamaño
        call_command(
            'dumpdata', 
            exclude=['contenttypes', 'auth.permission', 'sessions', 'admin.logentry'],
            indent=2, 
            stdout=open(temp_file_path, 'w')
        )
        
        # Leer el contenido del archivo temporal
        with open(temp_file_path, 'r') as f:
            data = f.read()
            
        # Eliminar archivo temporal
        os.unlink(temp_file_path)
        
        # Crear respuesta de descarga
        response = HttpResponse(data, content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
        
    except Exception as e:
        print(f"Error exportando DB: {e}")
        return HttpResponse(f"Error al exportar base de datos: {str(e)}", status=500)

@csrf_protect
@owner_required
@transaction.atomic
def importar_base_datos(request):
    """
    Restaura la base de datos desde un archivo JSON.
    Utiliza una transacción atómica para asegurar que si falla, no se corrompan los datos.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido'})
    
    if 'backup_file' not in request.FILES:
        return JsonResponse({'success': False, 'error': 'No se proporcionó ningún archivo'})
    
    archivo = request.FILES['backup_file']
    
    # Validar extensión
    if not archivo.name.endswith('.json'):
        return JsonResponse({'success': False, 'error': 'El archivo debe ser formato JSON'})
    
    try:
        # Guardar archivo subido temporalmente
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as temp_file:
            for chunk in archivo.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
            
        # Ejecutar loaddata
        call_command('loaddata', temp_file_path)
        
        # Eliminar archivo temporal
        os.unlink(temp_file_path)
        
        return JsonResponse({'success': True, 'message': 'Base de datos restaurada exitosamente'})
        
    except Exception as e:
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        return JsonResponse({'success': False, 'error': f'Error al importar: {str(e)}'})
