from django import forms
from .models import Cliente
import re

class ClienteForm(forms.ModelForm):
    cedula_tipo = forms.ChoiceField(
        choices=[('V', 'V'), ('E', 'E'), ('J', 'J')],
        widget=forms.Select(attrs={'class': 'form-control', 'id': 'cedula_tipo'})
    )
    cedula_numero = forms.CharField(
        max_length=9,  # Cambiado a 9 para permitir J
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '7-8 dígitos', 'id': 'cedula_numero', 'maxlength': '8'})
    )
    tipo_cliente = forms.ChoiceField(
        choices=[('particular', 'Particular'), ('mayorista', 'Mayorista')],
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    telefono_prefijo = forms.ChoiceField(
        choices=[
            ('0412', '0412'), ('0414', '0414'), ('0416', '0416'),
            ('0426', '0426'), ('0422', '0422'), ('0424', '0424')
        ],
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    telefono_numero = forms.CharField(
        max_length=7,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '7 dígitos', 'maxlength': '7'})
    )

    class Meta:
        model = Cliente
        fields = ['nombre', 'apellido', 'direccion', 'tipo_cliente']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Inicializar campos si estamos editando una instancia existente
        if self.instance and self.instance.pk:
            if self.instance.cedula:
                self.fields['cedula_tipo'].initial = self.instance.cedula[0]
                self.fields['cedula_numero'].initial = self.instance.cedula[1:]
            if self.instance.telefono:
                self.fields['telefono_prefijo'].initial = self.instance.telefono[:4]
                self.fields['telefono_numero'].initial = self.instance.telefono[4:]

    def clean_cedula_numero(self):
        cedula_numero = self.cleaned_data.get('cedula_numero')
        cedula_tipo = self.cleaned_data.get('cedula_tipo')
        
        if cedula_numero:
            if not cedula_numero.isdigit():
                raise forms.ValidationError('El número de cédula debe contener solo dígitos.')
            
            if cedula_tipo == 'J':
                if len(cedula_numero) != 9:
                    raise forms.ValidationError('La cédula jurídica debe tener exactamente 9 dígitos.')
            else:
                if not (7 <= len(cedula_numero) <= 8):
                    raise forms.ValidationError('El número de cédula debe tener entre 7 y 8 dígitos numéricos.')
        return cedula_numero

    def clean_nombre(self):
        nombre = self.cleaned_data.get('nombre')
        # Usar self.data para asegurar acceso antes de que se limpie el campo
        cedula_tipo = self.data.get('cedula_tipo')
        
        if nombre:
            # Si es jurídico, permitimos números y caracteres especiales
            if cedula_tipo == 'J':
                if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s.&-]+$', nombre):
                    raise forms.ValidationError('La razón social contiene caracteres inválidos.')
                nombre = nombre.strip().upper()[:10] 
                # Relaxed length check? User wants to put valid names. 3 is fine.
            else:
                if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$', nombre):
                    raise forms.ValidationError('El nombre solo debe contener letras y espacios.')
                # Convertir a MAYÚSCULAS y limitar longitud
                nombre = nombre.strip().upper()[:10]
                if len(nombre) < 3:
                    raise forms.ValidationError('El nombre debe tener al menos 3 caracteres.')
        return nombre

    def clean_apellido(self):
        apellido = self.cleaned_data.get('apellido')
        # Usar self.data para asegurar acceso antes de que se limpie el campo
        cedula_tipo = self.data.get('cedula_tipo')
        
        if apellido:
            # Si es jurídico, el apellido se usa como placeholder (.), permitirlo
            if cedula_tipo == 'J':
                # Permitir cualquier cosa si es J, ya que está oculto y auto-llenado
                return apellido

            if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$', apellido):
                raise forms.ValidationError('El apellido solo debe contener letras y espacios.')
            # Convertir a MAYÚSCULAS y limitar longitud
            apellido = apellido.strip().upper()[:10]
            if len(apellido) < 3:
                raise forms.ValidationError('El apellido debe tener al menos 3 caracteres.')
        return apellido

    def clean_telefono_numero(self):
        telefono_numero = self.cleaned_data.get('telefono_numero')
        if telefono_numero:
            if not telefono_numero.isdigit() or len(telefono_numero) != 7:
                raise forms.ValidationError('El número de teléfono debe tener exactamente 7 dígitos numéricos.')
        return telefono_numero

    def clean_direccion(self):
        direccion = self.cleaned_data.get('direccion')
        if direccion:
            direccion = direccion.strip()
            if len(direccion) < 10:
                raise forms.ValidationError('La dirección debe tener al menos 10 caracteres.')
            if len(direccion) > 20:
                raise forms.ValidationError('La dirección no puede tener más de 20 caracteres.')
        return direccion

    def clean(self):
        cleaned_data = super().clean()
        
        # Combinar cédula
        cedula_tipo = cleaned_data.get('cedula_tipo')
        cedula_numero = cleaned_data.get('cedula_numero')
        if cedula_tipo and cedula_numero:
            cedula_completa = f"{cedula_tipo}{cedula_numero}"
            
            # Verificar si ya existe (excluyendo la instancia actual si estamos editando)
            queryset = Cliente.objects.filter(cedula=cedula_completa)
            if self.instance and self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
                
            if queryset.exists():
                self.add_error('cedula_numero', f'El cliente con cédula {cedula_completa} ya está registrado.')
            
            cleaned_data['cedula'] = cedula_completa
        
        # Combinar teléfono
        telefono_prefijo = cleaned_data.get('telefono_prefijo')
        telefono_numero = cleaned_data.get('telefono_numero')
        if telefono_prefijo and telefono_numero:
            cleaned_data['telefono'] = f"{telefono_prefijo}{telefono_numero}"
        
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        
        if 'cedula' in self.cleaned_data:
            instance.cedula = self.cleaned_data['cedula']
        if 'telefono' in self.cleaned_data:
            instance.telefono = self.cleaned_data['telefono']
        
        # Asegurar que nombre y apellido estén en MAYÚSCULAS
        if instance.nombre:
            instance.nombre = instance.nombre.upper()[:10]
        if instance.apellido:
            instance.apellido = instance.apellido.upper()[:10]
        
        if commit:
            instance.save()
        return instance
    

class EditarClienteForm(forms.ModelForm):
    telefono_prefijo = forms.ChoiceField(
        choices=[
            ('0412', '0412'), ('0414', '0414'), ('0416', '0416'),
            ('0426', '0426'), ('0422', '0422'), ('0424', '0424')
        ],
        widget=forms.Select(attrs={'class': 'form-control', 'id': 'telefono_prefijo_editar'})
    )
    telefono_numero = forms.CharField(
        max_length=7,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': '7 dígitos', 'id': 'telefono_numero_editar', 'maxlength': '7'})
    )

    class Meta:
        model = Cliente
        fields = ['nombre', 'apellido', 'telefono', 'direccion', 'tipo_cliente']
        widgets = {
            'nombre': forms.TextInput(attrs={'class': 'form-control', 'maxlength': '10'}),
            'apellido': forms.TextInput(attrs={'class': 'form-control', 'maxlength': '10'}),
            'direccion': forms.Textarea(attrs={'class': 'form-control', 'rows': '2', 'maxlength': '20'}),
            'tipo_cliente': forms.Select(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            # Inicializar campos separados del teléfono si estamos editando
            if self.instance.telefono:
                self.fields['telefono_prefijo'].initial = self.instance.telefono[:4]
                self.fields['telefono_numero'].initial = self.instance.telefono[4:]

    def clean_nombre(self):
        nombre = self.cleaned_data.get('nombre')
        # Determinar tipo de cédula desde la instancia
        is_juridico = self.instance.cedula.startswith('J') if self.instance and self.instance.cedula else False
        
        if nombre:
            if is_juridico:
                # Permitir caracteres especiales para Razón Social
                if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s.&-]+$', nombre):
                     raise forms.ValidationError('La razón social contiene caracteres inválidos.')
                nombre = nombre.strip().upper()[:10]
            else:
                if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$', nombre):
                    raise forms.ValidationError('El nombre solo debe contener letras y espacios.')
                nombre = nombre.strip().upper()[:10]
                if len(nombre) < 2:
                    raise forms.ValidationError('El nombre debe tener al menos 2 caracteres.')
        return nombre

    def clean_apellido(self):
        apellido = self.cleaned_data.get('apellido')
        # Determinar tipo de cédula desde la instancia
        is_juridico = self.instance.cedula.startswith('J') if self.instance and self.instance.cedula else False
        
        if apellido:
            if is_juridico:
                # Si es jurídico, permitimos el punto o lo que venga, ya que está oculto
                return apellido
                
            if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$', apellido):
                raise forms.ValidationError('El apellido solo debe contener letras y espacios.')
            apellido = apellido.strip().upper()[:10]
            if len(apellido) < 2:
                raise forms.ValidationError('El apellido debe tener al menos 2 caracteres.')
        return apellido

    def clean_direccion(self):
        direccion = self.cleaned_data.get('direccion')
        if direccion:
            direccion = direccion.strip()
            if len(direccion) < 10:
                raise forms.ValidationError('La dirección debe tener al menos 10 caracteres.')
            if len(direccion) > 20:
                raise forms.ValidationError('La dirección no puede tener más de 20 caracteres.')
        return direccion

    def clean_telefono_numero(self):
        telefono_numero = self.cleaned_data.get('telefono_numero')
        if telefono_numero:
            if not telefono_numero.isdigit() or len(telefono_numero) != 7:
                raise forms.ValidationError('El número de teléfono debe tener exactamente 7 dígitos numéricos.')
        return telefono_numero

    def clean(self):
        cleaned_data = super().clean()
        
        # Combinar teléfono
        telefono_prefijo = cleaned_data.get('telefono_prefijo')
        telefono_numero = cleaned_data.get('telefono_numero')
        if telefono_prefijo and telefono_numero:
            cleaned_data['telefono'] = f"{telefono_prefijo}{telefono_numero}"
        
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        
        # Asegurar que nombre, apellido y dirección estén en MAYÚSCULAS
        if instance.nombre:
            instance.nombre = instance.nombre.upper()[:10]
        if instance.apellido:
            instance.apellido = instance.apellido.upper()[:10]
        if instance.direccion:
            instance.direccion = instance.direccion.upper()[:20]
        
        if commit:
            instance.save()
        return instance