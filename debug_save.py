import os
import django
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda_naturista.settings')
django.setup()

from productos.forms import ProductoForm
from productos.models import Producto, Categoria

def test_decimal_save():
    print("--- Starting Debug Script ---")
    
    # Create or get a test product
    cat = Categoria.objects.first()
    if not cat:
        print("No categories found, creating one.")
        cat = Categoria.objects.create(nombre="Test Cat")
        
    # Get the 'AGUA' product or create one
    try:
        p = Producto.objects.get(nombre_pro='AGUA')
        print(f"Found product: {p.nombre_pro}, Current Price: {p.precio_venta}")
    except Producto.DoesNotExist:
        print("Product AGUA not found, creating dummy.")
        p = Producto(
            nombre_pro='TEST DECIMAL DEBUG',
            serial='99999999',
            categoria=cat,
            precio_venta=Decimal('1.00'),
            estado='activo',
            ubicacion='TEST'
        )
        p.save()

    # Prepare form data simulating a POST request with comma
    data = {
        'serial': p.serial,
        'categoria_busqueda': cat.nombre,
        'nombre_pro': p.nombre_pro,
        'ubicacion': p.ubicacion,
        'stock_minimo': p.stock_minimo,
        'descripcion': p.descripcion,
        'precio_venta': '4,75',  # <--- The testing value
        'sujeto_iva': 'si'
    }

    form = ProductoForm(data, instance=p)
    
    if form.is_valid():
        print("Form is valid.")
        saved_p = form.save()
        print(f"Saved object price in memory: {saved_p.precio_venta}")
        
        # Reload from DB to verify persistence
        saved_p.refresh_from_db()
        print(f"Reloaded from DB price: {saved_p.precio_venta}")
        
        if saved_p.precio_venta == Decimal('4.75'):
            print("SUCCESS: Decimal saved correctly.")
        else:
            print(f"FAILURE: Decimal NOT saved correctly. Expected 4.75, got {saved_p.precio_venta}")
            
    else:
        print("Form is INVALID:")
        print(form.errors)

if __name__ == "__main__":
    test_decimal_save()
