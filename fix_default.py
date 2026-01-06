import sys

# Fix gestionar_abono_cliente.html - default filter syntax
file1 = r'c:\Users\Gabriel\Desktop\tienda_naturista5\tienda_naturista\cuentas_pendientes\templates\cuentas_pendientes\gestionar_abono_cliente.html'

with open(file1, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the default filter syntax - remove space before colon
content = content.replace('|default: 0', '|default:0')

with open(file1, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed gestionar_abono_cliente.html - corrected default filter syntax")
