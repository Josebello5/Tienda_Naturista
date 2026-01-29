import os
import tempfile
import zipfile
from datetime import datetime, date
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.core.mail import EmailMessage
from django.conf import settings
from usuarios.models import Usuario


class Command(BaseCommand):
    help = 'Genera backup de la base de datos, lo comprime en ZIP y lo envía por email al Dueño'

    def handle(self, *args, **options):
        """
        Genera backup automático semanal con las siguientes características:
        - Se ejecuta solo los DOMINGOS
        - Solo se ejecuta UNA VEZ por domingo
        - Verifica si ya se ejecutó hoy antes de proceder
        - Compresión en formato ZIP
        - Envío por email al usuario Dueño
        - Almacenamiento local de backups
        - Notificaciones de éxito o fallo
        """
        try:
            # 1. Verificar si hoy es domingo (0 = Lunes, 6 = Domingo)
            hoy = datetime.now()
            if hoy.weekday() != 6:
                dia_semana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][hoy.weekday()]
                self.stdout.write(self.style.WARNING(
                    f'Hoy es {dia_semana}. El backup solo se ejecuta los domingos.'
                ))
                return
            
            # 2. Verificar si ya se ejecutó el backup hoy
            backup_dir = os.path.join(settings.BASE_DIR, 'backups')
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
            
            last_run_file = os.path.join(backup_dir, '.last_backup_date')
            fecha_hoy = date.today().isoformat()
            
            if os.path.exists(last_run_file):
                with open(last_run_file, 'r') as f:
                    ultima_ejecucion = f.read().strip()
                
                if ultima_ejecucion == fecha_hoy:
                    self.stdout.write(self.style.SUCCESS(
                        f'✓ El backup ya se ejecutó hoy ({fecha_hoy}). No es necesario ejecutarlo nuevamente.'
                    ))
                    return
            
            self.stdout.write(self.style.WARNING('='*60))
            self.stdout.write(self.style.WARNING('INICIANDO BACKUP AUTOMÁTICO SEMANAL'))
            self.stdout.write(self.style.WARNING('='*60))

            
            # 1. Crear directorio de backups si no existe
            backup_dir = os.path.join(settings.BASE_DIR, 'backups')
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
                self.stdout.write(self.style.SUCCESS(f'Directorio de backups creado: {backup_dir}'))
            
            # 2. Generar nombre de archivo con timestamp
            timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
            json_filename = f'backup_tienda_{timestamp}.json'
            zip_filename = f'backup_tienda_{timestamp}.zip'
            
            # Rutas completas
            temp_json_path = os.path.join(tempfile.gettempdir(), json_filename)
            local_zip_path = os.path.join(backup_dir, zip_filename)
            
            # 3. Generar backup JSON
            self.stdout.write('Generando backup JSON...')
            with open(temp_json_path, 'w', encoding='utf-8') as f:
                call_command(
                    'dumpdata',
                    exclude=['contenttypes', 'auth.permission', 'sessions', 'admin.logentry'],
                    indent=2,
                    stdout=f
                )
            
            file_size_mb = os.path.getsize(temp_json_path) / (1024 * 1024)
            self.stdout.write(self.style.SUCCESS(f'Backup JSON generado: {file_size_mb:.2f} MB'))
            
            # 4. Comprimir en ZIP
            self.stdout.write('Comprimiendo backup en ZIP...')
            with zipfile.ZipFile(local_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(temp_json_path, json_filename)
            
            zip_size_mb = os.path.getsize(local_zip_path) / (1024 * 1024)
            compression_ratio = (1 - zip_size_mb / file_size_mb) * 100
            self.stdout.write(self.style.SUCCESS(
                f'Backup comprimido: {zip_size_mb:.2f} MB (compresión: {compression_ratio:.1f}%)'
            ))
            
            # 5. Obtener email del Dueño
            try:
                dueno = Usuario.objects.filter(groups__name='Dueño').first()
                if not dueno:
                    raise ValueError('No se encontró un usuario con rol Dueño en el sistema')
                
                recipient_email = dueno.email
                self.stdout.write(f'Email del Dueño: {recipient_email}')
                
            except Exception as e:
                raise ValueError(f'Error al obtener email del Dueño: {str(e)}')
            
            # 6. Enviar email con backup adjunto
            self.stdout.write('Enviando backup por email...')
            
            email_subject = f'Backup Automático Semanal - {timestamp}'
            email_body = f"""
Hola {dueno.first_name},

Este es el backup automático semanal de Tienda Naturista.

Detalles del backup:
- Fecha y hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
- Tamaño JSON: {file_size_mb:.2f} MB
- Tamaño ZIP: {zip_size_mb:.2f} MB
- Compresión: {compression_ratio:.1f}%
- Ubicación local: {local_zip_path}

El backup ha sido guardado localmente y adjuntado a este correo.

Para restaurar el backup:
1. Descomprime el archivo ZIP
2. En el menú de configuración, usa "Importar Respaldo"
3. Selecciona el archivo JSON descomprimido

Saludos,
Sistema Tienda Naturista
            """
            
            email = EmailMessage(
                subject=email_subject,
                body=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email]
            )
            
            # Adjuntar archivo ZIP
            with open(local_zip_path, 'rb') as f:
                email.attach(zip_filename, f.read(), 'application/zip')
            
            email.send(fail_silently=False)
            
            self.stdout.write(self.style.SUCCESS(f'Email enviado exitosamente a {recipient_email}'))
            
            # 7. Limpiar archivo temporal JSON
            if os.path.exists(temp_json_path):
                os.unlink(temp_json_path)
            
            # 8. Limpiar backups antiguos (mantener últimos 10)
            self._cleanup_old_backups(backup_dir, keep=10)
            
            # 9. Enviar notificación de éxito
            self._send_success_notification(dueno, zip_filename, zip_size_mb)
            
            # 10. Guardar fecha de última ejecución
            last_run_file = os.path.join(backup_dir, '.last_backup_date')
            with open(last_run_file, 'w') as f:
                f.write(date.today().isoformat())
            
            self.stdout.write(self.style.SUCCESS('='*60))
            self.stdout.write(self.style.SUCCESS('✓ BACKUP COMPLETADO EXITOSAMENTE'))
            self.stdout.write(self.style.SUCCESS('='*60))
            
        except Exception as e:
            # Enviar notificación de fallo
            error_msg = str(e)
            self.stdout.write(self.style.ERROR('='*60))
            self.stdout.write(self.style.ERROR(f'✗ ERROR EN BACKUP: {error_msg}'))
            self.stdout.write(self.style.ERROR('='*60))
            
            try:
                dueno = Usuario.objects.filter(groups__name='Dueño').first()
                if dueno:
                    self._send_failure_notification(dueno, error_msg)
            except:
                pass
            
            raise
    
    def _cleanup_old_backups(self, backup_dir, keep=10):
        """Elimina backups antiguos, manteniendo solo los últimos N"""
        try:
            # Obtener lista de archivos ZIP
            backups = []
            for filename in os.listdir(backup_dir):
                if filename.startswith('backup_tienda_') and filename.endswith('.zip'):
                    filepath = os.path.join(backup_dir, filename)
                    backups.append((filepath, os.path.getmtime(filepath)))
            
            # Ordenar por fecha de modificación (más reciente primero)
            backups.sort(key=lambda x: x[1], reverse=True)
            
            # Eliminar backups antiguos
            deleted = 0
            for filepath, _ in backups[keep:]:
                try:
                    os.unlink(filepath)
                    deleted += 1
                    self.stdout.write(f'Backup antiguo eliminado: {os.path.basename(filepath)}')
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'No se pudo eliminar {filepath}: {e}'))
            
            if deleted > 0:
                self.stdout.write(self.style.SUCCESS(f'Se eliminaron {deleted} backups antiguos'))
            else:
                self.stdout.write('No hay backups antiguos para eliminar')
                
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Error al limpiar backups antiguos: {e}'))
    
    def _send_success_notification(self, dueno, filename, size_mb):
        """Envía notificación de éxito por email"""
        try:
            subject = '✓ Backup Semanal Completado - Tienda Naturista'
            body = f"""
Hola {dueno.first_name},

El backup automático semanal se ha completado exitosamente.

Archivo: {filename}
Tamaño: {size_mb:.2f} MB
Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

El archivo ha sido enviado como adjunto en otro correo y guardado localmente en el servidor.

Saludos,
Sistema de Backups Automáticos
            """
            
            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[dueno.email]
            )
            email.send(fail_silently=True)
            
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'No se pudo enviar notificación de éxito: {e}'))
    
    def _send_failure_notification(self, dueno, error_msg):
        """Envía notificación de fallo por email"""
        try:
            subject = '✗ Error en Backup Semanal - Tienda Naturista'
            body = f"""
Hola {dueno.first_name},

El backup automático semanal ha fallado.

Error: {error_msg}
Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

Por favor, verifica la configuración del sistema y ejecuta un backup manual desde el menú de configuración.

Saludos,
Sistema de Backups Automáticos
            """
            
            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[dueno.email]
            )
            email.send(fail_silently=True)
            
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'No se pudo enviar notificación de fallo: {e}'))
