import threading
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.management import call_command
from django.core.cache import cache


# Lock para evitar múltiples ejecuciones simultáneas del backup
_backup_lock = threading.Lock()


class AutoBackupMiddleware:
    """
    Middleware para backups semanales automáticos:
    - Ejecuta 1 backup por semana (domingo idealmente)
    - Si el domingo no se usa la app, ejecuta cuando se use la app en la semana
    - Solo 1 backup por semana, no más
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Solo verificar para usuarios autenticados
        if request.user.is_authenticated:
            self.check_and_trigger_backup()
        
        response = self.get_response(request)
        return response
    
    def check_and_trigger_backup(self):
        """Verifica si necesita ejecutar el backup semanal"""
        
        # Verificar si ya existe backup de ESTA SEMANA
        if self.backup_done_this_week():
            return  # Ya hay backup de esta semana, no hacer nada
        
        # No hay backup de esta semana, verificar cache para evitar duplicados
        ahora = timezone.now()
        # Calcular inicio de semana (lunes)
        dias_desde_lunes = ahora.weekday()
        inicio_semana = (ahora - timedelta(days=dias_desde_lunes)).date()
        cache_key = f'backup_week_{inicio_semana}'
        
        if cache.get(cache_key):
            return  # Ya se está ejecutando un backup para esta semana
        
        # Intentar adquirir el lock sin bloquear
        if not _backup_lock.acquire(blocking=False):
            return  # Ya hay un backup ejecutándose
        
        try:
            # Verificar nuevamente la BD por si se guardó mientras esperábamos
            if self.backup_done_this_week():
                return
            
            # Determinar si es pendiente (si hoy NO es domingo)
            is_pending = ahora.weekday() != 6
            
            # Marcar como "en progreso" por 2 horas
            cache.set(cache_key, True, 7200)
            
            # Ejecutar el backup
            self._execute_backup_async(is_pending, cache_key)
        
        finally:
            _backup_lock.release()
    
    def backup_done_this_week(self):
        """Verifica si ya hay un backup exitoso de ESTA SEMANA"""
        from usuarios.models import BackupHistory
        
        ahora = timezone.now()
        
        # Calcular inicio de semana (lunes a las 00:00)
        dias_desde_lunes = ahora.weekday()
        inicio_semana = ahora - timedelta(days=dias_desde_lunes)
        inicio_semana = inicio_semana.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # El fin de semana es el próximo lunes
        fin_semana = inicio_semana + timedelta(days=7)
        
        # Verificar si existe al menos un backup exitoso en este rango
        return BackupHistory.objects.filter(
            fecha_backup__gte=inicio_semana,
            fecha_backup__lt=fin_semana,
            email_sent=True  # Solo contar backups exitosos
        ).exists()
    
    def _execute_backup_async(self, is_pending, cache_key):
        """Ejecuta el backup en un thread separado para no bloquear el request"""
        def run_backup():
            try:
                if is_pending:
                    call_command('send_weekly_backup', '--pending')
                else:
                    call_command('send_weekly_backup')
                
                # Limpiar flag después de ejecución exitosa
                cache.delete(cache_key)
                
            except Exception as e:
                # Log error y limpiar flag
                print(f"Error ejecutando backup automático: {e}")
                cache.delete(cache_key)
        
        # Ejecutar en thread separado para no bloquear el response
        thread = threading.Thread(target=run_backup, daemon=True)
        thread.start()
