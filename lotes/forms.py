from django import forms
from .models import Lote, Proveedor
from productos.models import Producto
from django.utils import timezone
import re
from datetime import timedelta
from django.core.exceptions import ValidationError

class LoteForm(forms.ModelForm):
    class Meta:
        model = Lote
        fields = ['codigo_lote', 'id_producto', 'cantidad', 'costo_unitario', 'proveedor', 'fecha_recibimiento', 'fecha_vencimiento']
        widgets = {
            'codigo_lote': forms.TextInput(attrs={
                'placeholder': 'CÓDIGO-LOTE-001',
                'maxlength': '15'
            }),
            'fecha_recibimiento': forms.DateInput(attrs={'type': 'date'}),
            'fecha_vencimiento': forms.DateInput(attrs={'type': 'date'}),
            'costo_unitario': forms.NumberInput(attrs={'step': '0.01', 'min': '0.01', 'placeholder': '0.00'}),
            'proveedor': forms.Select(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Incluir productos activos Y agotados
        self.fields['id_producto'].queryset = Producto.objects.filter(estado__in=['activo', 'agotado'])
        # Usar proveedores de la tabla Proveedor
        self.fields['proveedor'].queryset = Proveedor.objects.all().order_by('nombre')
        
        self.fields['id_producto'].label = "Producto"
        self.fields['codigo_lote'].label = "Código de Lote"
        self.fields['costo_unitario'].label = "Costo Unitario"
        self.fields['proveedor'].label = "Proveedor"
        self.fields['fecha_recibimiento'].label = "Fecha de Recibimiento"
        
        # Fecha de recibimiento por defecto: hoy
        self.fields['fecha_recibimiento'].initial = timezone.localdate()
        
        # Costo unitario en blanco por defecto
        self.fields['costo_unitario'].initial = None

    def clean_codigo_lote(self):
        codigo_lote = self.cleaned_data.get('codigo_lote')
        if not codigo_lote:
            raise forms.ValidationError('El código de lote es obligatorio.')
        
        # Convertir a mayúsculas
        codigo_lote = codigo_lote.upper()
        
        # Validar longitud máxima
        if len(codigo_lote) > 15:
            raise forms.ValidationError('El código de lote no puede tener más de 15 caracteres.')
        
        # Validar formato: letras, números y guiones
        if not re.match(r'^[A-Z0-9-]+$', codigo_lote):
            raise forms.ValidationError('El código de lote solo puede contener letras, números y guiones.')
        
        # Verificar si ya existe (excluyendo el actual si está editando)
        if self.instance.pk:
            if Lote.objects.filter(codigo_lote=codigo_lote).exclude(pk=self.instance.pk).exists():
                raise forms.ValidationError('Ya existe un lote con este código.')
        else:
            if Lote.objects.filter(codigo_lote=codigo_lote).exists():
                raise forms.ValidationError('Ya existe un lote con este código.')
        
        return codigo_lote

    def clean_cantidad(self):
        cantidad = self.cleaned_data.get('cantidad')
        if cantidad is None or cantidad <= 0:
            raise forms.ValidationError('La cantidad debe ser un número entero positivo.')
        return cantidad

    def clean_costo_unitario(self):
        costo_unitario = self.cleaned_data.get('costo_unitario')
        if costo_unitario is None:
            raise forms.ValidationError('El costo unitario es obligatorio.')
        if costo_unitario <= 0:
            raise forms.ValidationError('El costo unitario debe ser un número positivo mayor a cero.')
        return costo_unitario

    def clean_fecha_recibimiento(self):
        fecha_recibimiento = self.cleaned_data.get('fecha_recibimiento')
        if not fecha_recibimiento:
            raise forms.ValidationError('La fecha de recibimiento es obligatoria.')
            
        if fecha_recibimiento > timezone.localdate():
            raise forms.ValidationError('La fecha de recibimiento no puede ser futura.')
        return fecha_recibimiento

    def clean_fecha_vencimiento(self):
        fecha_vencimiento = self.cleaned_data.get('fecha_vencimiento')
        fecha_recibimiento = self.cleaned_data.get('fecha_recibimiento')
        
        if not fecha_vencimiento:
            raise forms.ValidationError('La fecha de vencimiento es obligatoria.')
        
        # Fecha mínima: hoy + 31 días (no puede vencer en los próximos 31 días)
        fecha_minima = timezone.localdate() + timedelta(days=31)
        if fecha_vencimiento < fecha_minima:
            raise forms.ValidationError(
                f'La fecha de vencimiento no puede ser anterior a {fecha_minima.strftime("%d/%m/%Y")}. '
                'El producto debe tener al menos 31 días de vida útil.'
            )
        
        # Validar que sea posterior a la fecha de recibimiento
        if fecha_recibimiento and fecha_vencimiento <= fecha_recibimiento:
            raise forms.ValidationError('La fecha de vencimiento debe ser posterior a la fecha de recibimiento.')
            
        return fecha_vencimiento

class EditarLoteForm(forms.ModelForm):
    class Meta:
        model = Lote
        fields = ['id_producto', 'cantidad', 'costo_unitario', 'proveedor']
        widgets = {
            'costo_unitario': forms.NumberInput(attrs={'step': '0.01', 'min': '0.01', 'placeholder': '0.00'}),
            'proveedor': forms.Select(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Incluir productos activos Y agotados
        self.fields['id_producto'].queryset = Producto.objects.filter(estado__in=['activo', 'agotado'])
        # Usar proveedores de la tabla Proveedor
        self.fields['proveedor'].queryset = Proveedor.objects.all().order_by('nombre')
        
        self.fields['id_producto'].label = "Producto"
        self.fields['costo_unitario'].label = "Costo Unitario"
        self.fields['proveedor'].label = "Proveedor"

    def clean_cantidad(self):
        cantidad = self.cleaned_data.get('cantidad')
        if cantidad is None or cantidad <= 0:
            raise forms.ValidationError('La cantidad debe ser un número entero positivo.')
        
        # Si se está reduciendo la cantidad, verificar que no sea menor que la cantidad disponible
        if self.instance and cantidad < self.instance.cantidad_disponible:
            raise forms.ValidationError(
                f'No puede reducir la cantidad a menos de {self.instance.cantidad_disponible} '
                f'porque ya hay {self.instance.cantidad_disponible} unidades disponibles.'
            )
        return cantidad

    def clean_costo_unitario(self):
        costo_unitario = self.cleaned_data.get('costo_unitario')
        if costo_unitario is None:
            raise forms.ValidationError('El costo unitario es obligatorio.')
        if costo_unitario <= 0:
            raise forms.ValidationError('El costo unitario debe ser un número positivo mayor a cero.')
        return costo_unitario