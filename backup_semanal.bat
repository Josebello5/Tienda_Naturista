@echo off
REM =====================================================
REM Backup Automático Semanal - Tienda Naturista
REM =====================================================
REM Este script ejecuta el backup semanal de la base de datos
REM y lo envía por email al usuario Dueño
REM
REM Se ejecuta: DOMINGOS (cualquier hora del día)
REM El comando verifica si ya se ejecutó hoy
REM Solo se ejecuta UNA VEZ por domingo
REM =====================================================

REM Cambiar al directorio del proyecto
cd /d C:\Users\Gabriel\Desktop\Tienda_Naturista

REM Ejecutar el comando de backup
python manage.py send_weekly_backup

REM Opcional: Registrar la ejecución en un log
echo Backup ejecutado el %date% a las %time% >> backups\backup_log.txt

REM Pausar para ver resultado (comentar esta línea cuando esté en producción)
REM pause
