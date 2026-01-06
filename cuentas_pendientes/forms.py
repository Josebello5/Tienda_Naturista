from django import forms
from .models import Abono

class AbonoForm(forms.ModelForm):
    class Meta:
        model = Abono
        fields = ['Monto_Abono', 'Metodo_Pago', 'Comprobante', 'Observaciones']
        widgets = {
            'Monto_Abono': forms.NumberInput(attrs={
                'class': 'form-control formatted-number-input',
                'placeholder': '0,00',
                'step': '0.01'
            }),
            'Metodo_Pago': forms.Select(attrs={'class': 'form-control'}),
            'Comprobante': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Número de comprobante'
            }),
            'Observaciones': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Observaciones adicionales...'
            }),
        }
    
    def clean_Monto_Abono(self):
        monto = self.cleaned_data.get('Monto_Abono')
        if monto and monto <= 0:
            raise forms.ValidationError('El monto debe ser mayor a cero')
        return monto