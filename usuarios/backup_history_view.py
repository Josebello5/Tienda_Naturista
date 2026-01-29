# Añadir después de menu_configuracion en views.py

@owner_required
def backup_history(request):
    """Vista para mostrar el historial completo de backups agrupado por mes"""
    from .models import BackupHistory
    from collections import defaultdict
    import locale
    
    # Configurar locale para nombres de mes en español
    try:
        locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
    except:
        try:
            locale.setlocale(locale.LC_TIME, 'Spanish_Spain.1252')
        except:
            pass
    
    # Obtener todos los backups
    backups = BackupHistory.objects.all()
    
    # Agrupar por mes
    backups_por_mes = defaultdict(lambda: {
        'nombre': '',
        'año': 0,
        'mes': 0,
        'backups': [],
        'total': 0,
        'exitosos': 0,
        'fallidos': 0,
        'pendientes': 0,
        'size_total_mb': 0
    })
    
    for backup in backups:
        mes_key = backup.fecha_backup.strftime('%Y-%m')
        mes_nombre = backup.fecha_backup.strftime('%B %Y').title()
        
        if not backups_por_mes[mes_key]['nombre']:
            backups_por_mes[mes_key]['nombre'] = mes_nombre
            backups_por_mes[mes_key]['año'] = backup.fecha_backup.year
            backups_por_mes[mes_key]['mes'] = backup.fecha_backup.month
        
        backups_por_mes[mes_key]['backups'].append(backup)
        backups_por_mes[mes_key]['total'] += 1
        
        if backup.email_sent:
            backups_por_mes[mes_key]['exitosos'] += 1
        else:
            backups_por_mes[mes_key]['fallidos'] += 1
        
        if backup.is_pending:
            backups_por_mes[mes_key]['pendientes'] += 1
        
        if backup.size_mb:
            backups_por_mes[mes_key]['size_total_mb'] += float(backup.size_mb)
    
    # Convertir a lista ordenada (más reciente primero)
    backups_ordenados = sorted(
        backups_por_mes.items(),
        key=lambda x: (x[1]['año'], x[1]['mes']),
        reverse=True
    )
    
    # Estadísticas globales
    total_backups = backups.count()
    total_exitosos = backups.filter(email_sent=True).count()
    total_fallidos = backups.filter(email_sent=False).count()
    
    context = {
        'backups_por_mes': backups_ordenados,
        'total_backups': total_backups,
        'total_exitosos': total_exitosos,
        'total_fallidos': total_fallidos,
    }
    
    return render(request, 'usuarios/backup_history.html', context)
