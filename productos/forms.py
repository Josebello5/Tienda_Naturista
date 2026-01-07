from django import forms
from .models import Producto, Categoria, Patologia
import re
from decimal import Decimal, InvalidOperation

class ProductoForm(forms.ModelForm):
    # Campos para búsqueda con sugerencias
    categoria_busqueda = forms.CharField(
        required=True,
        label='Categoría',
        widget=forms.TextInput(attrs={
            'placeholder': 'Buscar o escribir categoría...',
            'autocomplete': 'off',
            'maxlength': '20'
        })
    )
    
    patologia_busqueda = forms.CharField(
        required=False,
        label='Patología',
        widget=forms.TextInput(attrs={
            'placeholder': 'Buscar o escribir patología...',
            'autocomplete': 'off',
            'maxlength': '20'
        })
    )
    
    # Override precio_venta to CharField to allow comma separator
    precio_venta = forms.CharField(
        required=True,
        label='Precio de Venta',
        max_length=7,
        widget=forms.TextInput(attrs={
            'placeholder': 'Ej: 125,50',
            'autocomplete': 'off',
            'maxlength': '7'
        })
    )

    class Meta:
        model = Producto
        fields = [
            'serial',  # Nuevo campo serial
            'categoria_busqueda', 'patologia_busqueda', 'sujeto_iva',
            'nombre_pro', 'ubicacion', 'stock_minimo', 'descripcion'
        ]
        widgets = {
            'serial': forms.TextInput(attrs={
                'placeholder': 'Serial del producto (solo números)',
                'autocomplete': 'off',
                'maxlength': '25'
            }),
            'nombre_pro': forms.TextInput(attrs={
                'placeholder': 'Nombre del producto (letras, números y espacios)',
                'autocomplete': 'off',
                'maxlength': '30'
            }),
            'ubicacion': forms.TextInput(attrs={
                'placeholder': 'Ubicación (máx. 15 caracteres)',
                'maxlength': '15',
                'autocomplete': 'off'
            }),
            'stock_minimo': forms.NumberInput(attrs={
                'min': '1',
                'max': '99',
                'step': '1'
            }),
            'descripcion': forms.Textarea(attrs={
                'placeholder': 'Descripción del producto (opcional)',
                'rows': 3
            })
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # CORRECCIÓN: Asegurar que todos los campos se inicialicen correctamente
        if self.instance and self.instance.pk:
            # Cargar categoría
            if self.instance.categoria:
                self.fields['categoria_busqueda'].initial = self.instance.categoria.nombre
            
            # Cargar patología
            if self.instance.patologia:
                self.fields['patologia_busqueda'].initial = self.instance.patologia.nombre
            
            # CORRECCIÓN: Asegurar que el precio de venta se cargue con coma decimal
            if self.instance.precio_venta:
                # Convert period to comma for display
                precio_str = str(self.instance.precio_venta).replace('.', ',')
                self.fields['precio_venta'].initial = precio_str

            # Hacer el campo serial de solo lectura en edición
            self.fields['serial'].disabled = True
            self.fields['serial'].widget.attrs['readonly'] = True
        else:
            # Si es un formulario nuevo (registro), establecer valor por defecto de sujeto_iva
            if 'sujeto_iva' not in self.initial:
                self.fields['sujeto_iva'].initial = 'si'

    def clean_serial(self):
        serial = self.cleaned_data.get('serial', '').strip()
        if not serial:
            raise forms.ValidationError('El serial es obligatorio.')
        
        # Validar que solo contenga números
        if not re.match(r'^[0-9]+$', serial):
            raise forms.ValidationError('El serial solo debe contener números.')
        
        # Validar longitud máxima (25 caracteres)
        if len(serial) > 25:
            raise forms.ValidationError('El serial no puede tener más de 25 caracteres.')
        
        # Verificar que el serial sea único (solo en registro, no en edición)
        if not self.instance.pk:  # Solo en creación
            if Producto.objects.filter(serial=serial).exists():
                raise forms.ValidationError('Ya existe un producto con este serial.')
        
        return serial

    def clean_nombre_pro(self):
        nombre_pro = self.cleaned_data.get('nombre_pro', '').strip()
        if not nombre_pro:
            raise forms.ValidationError('El nombre del producto es obligatorio.')
        
        # Validar formato del nombre (solo letras, números y espacios)
        if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]+$', nombre_pro):
            raise forms.ValidationError('El nombre solo debe contener letras, números y espacios.')
        
        # Validar longitud máxima (30 caracteres)
        if len(nombre_pro) > 30:
            raise forms.ValidationError('El nombre no puede tener más de 30 caracteres.')
        
        # Convertir a mayúsculas
        nombre_pro = nombre_pro.upper()
        
        return nombre_pro

    def clean_categoria_busqueda(self):
        categoria_nombre = self.cleaned_data.get('categoria_busqueda', '').strip().upper()
        if not categoria_nombre:
            raise forms.ValidationError('La categoría es obligatoria.')
        
        if not re.match(r'^[A-Z]+$', categoria_nombre):
            raise forms.ValidationError('La categoría solo debe contener letras.')
        
        if ' ' in categoria_nombre:
            raise forms.ValidationError('La categoría no puede contener espacios.')
        
        if len(categoria_nombre) > 20:
            raise forms.ValidationError('La categoría no puede tener más de 20 caracteres.')
        
        categoria, created = Categoria.objects.get_or_create(
            nombre=categoria_nombre,
            defaults={'nombre': categoria_nombre}
        )
        
        return categoria

    def clean_patologia_busqueda(self):
        patologia_nombre = self.cleaned_data.get('patologia_busqueda', '').strip().upper()
        
        if not patologia_nombre:
            return None
        
        if not re.match(r'^[A-Z]+$', patologia_nombre):
            raise forms.ValidationError('La patología solo debe contener letras.')
        
        if ' ' in patologia_nombre:
            raise forms.ValidationError('La patología no puede contener espacios.')
        
        if len(patologia_nombre) > 20:
            raise forms.ValidationError('La patología no puede tener más de 20 caracteres.')
        
        patologia, created = Patologia.objects.get_or_create(
            nombre=patologia_nombre,
            defaults={'nombre': patologia_nombre}
        )
        
        return patologia

    def clean_ubicacion(self):
        ubicacion = self.cleaned_data.get('ubicacion', '').strip()
        
        if not ubicacion:
            raise forms.ValidationError("La ubicación es obligatoria.")
        
        # Permitir letras (mayúsculas y minúsculas), números y espacios
        if not re.match(r'^[A-Za-z0-9\s]+$', ubicacion):
            raise forms.ValidationError('La ubicación solo puede contener letras, números y espacios.')
        
        if len(ubicacion) > 15:
            raise forms.ValidationError('La ubicación no puede tener más de 15 caracteres.')
        
        # Convertir a mayúsculas
        ubicacion = ubicacion.upper()
        
        return ubicacion

    def clean_stock_minimo(self):
        stock_minimo = self.cleaned_data.get('stock_minimo')
        if stock_minimo is None:
            raise forms.ValidationError("Este campo es obligatorio.")
        if stock_minimo < 1:
            raise forms.ValidationError("El stock mínimo debe ser al menos 1.")
        if stock_minimo > 99:
            raise forms.ValidationError("El stock mínimo no puede ser mayor a 99.")
        return stock_minimo

    def clean_precio_venta(self):
        precio_venta_str = self.data.get('precio_venta', '').strip()
        
        if not precio_venta_str:
            raise forms.ValidationError("Este campo es obligatorio.")
        
        # Replace comma with period for Decimal conversion
        precio_venta_str = precio_venta_str.replace(',', '.')
        
        try:
            precio_venta = Decimal(precio_venta_str)
        except (ValueError, InvalidOperation):
            raise forms.ValidationError("Ingrese un precio válido.")
        
        if precio_venta <= 0:
            raise forms.ValidationError("El precio de venta debe ser un número positivo.")
        if precio_venta > Decimal('9999.99'):
            raise forms.ValidationError("El precio de venta no puede ser mayor a 9999,99.")
        
        return precio_venta

    def save(self, commit=True):
        instance = super().save(commit=False)
        
        # Asignar categoría y patología (ya son objetos gracias a los métodos clean_)
        instance.categoria = self.cleaned_data.get('categoria_busqueda')
        instance.patologia = self.cleaned_data.get('patologia_busqueda')

        # Asignar precio de venta (ya es Decimal gracias a clean_precio_venta)
        instance.precio_venta = self.cleaned_data.get('precio_venta')
        
        if commit:
            instance.save()
        return instance