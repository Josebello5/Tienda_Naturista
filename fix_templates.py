import sys

# Fix gestionar_abono_cliente.html
file1 = r'c:\Users\Gabriel\Desktop\tienda_naturista5\tienda_naturista\cuentas_pendientes\templates\cuentas_pendientes\gestionar_abono_cliente.html'

with open(file1, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the spacing issue
content = content.replace('estado_pago_filtro=="parcial"', 'estado_pago_filtro == "parcial"')
content = content.replace('estado_pago_filtro=="completo"', 'estado_pago_filtro == "completo"')

with open(file1, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed gestionar_abono_cliente.html - added spaces around == operators")
