import sys

# Fix menu_cuentas.html  
file2 = r'c:\Users\Gabriel\Desktop\tienda_naturista5\tienda_naturista\cuentas_pendientes\templates\cuentas_pendientes\menu_cuentas.html'

with open(file2, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and fix lines 59-60 (0-indexed as 58-59)
if len(lines) > 59:
    # Check if it's the problem lines
    if 'pendiente{{' in lines[58] and 'cliente_data.ventas_pendientes|pluralize }}' in lines[59]:
        # Combine the two lines
        lines[58] = '        <small>{{ cliente_data.ventas_pendientes }} venta{{ cliente_data.ventas_pendientes|pluralize }} pendiente{{ cliente_data.ventas_pendientes|pluralize }}</small>\n'
        # Remove line 59
        del lines[59]

with open(file2, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed menu_cuentas.html - removed line break in pluralize expression")
