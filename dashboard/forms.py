from django import forms
from .models import TasaCambiaria
from decimal import Decimal
import locale

# Configurar locale para español
try:
    locale.setlocale(locale.LC_ALL, 'es_VE.UTF-8')
except:
    locale.setlocale(locale.LC_ALL, 'es_ES.UTF-8')

class TasaCambiariaForm(forms.ModelForm):
    valor = forms.CharField(
        max_length=20,
        widget=forms.TextInput(attrs={
            'class': 'tasa-input',
            'placeholder': '0,00',
            'inputmode': 'decimal',
            'pattern': '[0-9]+([,][0-9]{1,2})?'
        }),
        label='Valor del dólar en bolívares',
        help_text='Use coma (,) como separador decimal. Ejemplo: 35,50'
    )
    
    class Meta:
        model = TasaCambiaria
        fields = ['valor']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Si hay una instancia, formatear el valor con coma
        if self.instance and self.instance.pk and self.instance.valor:
            # Convertir decimal a string con coma
            valor_str = str(self.instance.valor).replace('.', ',')
            self.initial['valor'] = valor_str
    
    def clean_valor(self):
        valor_str = self.cleaned_data['valor']
        
        # Eliminar espacios y puntos como separadores de miles
        valor_str = valor_str.strip().replace(' ', '').replace('.', '')
        
        # Validar que solo tenga números y una coma
        if not all(c.isdigit() or c == ',' for c in valor_str):
            raise forms.ValidationError("Solo se permiten números y comas.")
        
        # Contar comas
        if valor_str.count(',') > 1:
            raise forms.ValidationError("Solo puede haber una coma decimal.")
        
        # Si hay coma, validar decimales
        if ',' in valor_str:
            parte_decimal = valor_str.split(',')[1]
            if len(parte_decimal) > 2:
                raise forms.ValidationError("Máximo 2 decimales permitidos.")
        
        # Convertir coma a punto para Decimal
        valor_float_str = valor_str.replace(',', '.')
        
        try:
            # Intentar convertir a Decimal
            valor_decimal = Decimal(valor_float_str)
        except:
            raise forms.ValidationError("Valor no válido.")
        
        # Validar que sea mayor a 0
        if valor_decimal <= 0:
            raise forms.ValidationError("El valor debe ser mayor a 0.")
        
        # Validar rango razonable (1 a 1000)
        if valor_decimal > 1000:
            raise forms.ValidationError("El valor es demasiado alto.")
        
        return valor_decimal