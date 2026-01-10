from decimal import Decimal

def format_venezuelan_money(value):
    """
    Formatea un número estrictamente: 1.250,50
    Independiente de la configuración regional (Locale).
    """
    if value is None or value == '':
        return '0,00'
    
    try:
        # Asegurar tipo Decimal y redondear
        if not isinstance(value, Decimal):
            value = Decimal(str(value))
        
        # Redondear a 2 decimales
        value = value.quantize(Decimal('0.01'))
        
        # Obtener representación de cadena fixa (ej: "1250.50")
        s = "{:f}".format(value)
        
        if '.' in s:
            parts = s.split('.')
            integer_part = parts[0]
            decimal_part = parts[1]
        else:
            integer_part = s
            decimal_part = '00'
            
        # Asegurar exactamente 2 dígitos en decimal
        decimal_part = (decimal_part + '00')[:2]
        
        # Formatear la parte entera manualmente para los miles (agregar puntos)
        formatted_integer = ""
        count = 0
        # Manejar signo negativo
        is_negative = integer_part.startswith('-')
        if is_negative:
            integer_part = integer_part[1:]
            
        for char in reversed(integer_part):
            if count > 0 and count % 3 == 0:
                formatted_integer = "." + formatted_integer
            formatted_integer = char + formatted_integer
            count += 1
            
        if is_negative:
            formatted_integer = "-" + formatted_integer
            
        return f"{formatted_integer},{decimal_part}"
    except (ValueError, TypeError, IndexError):
        return str(value)
