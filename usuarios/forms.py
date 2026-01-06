from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError
from datetime import date
from .models import Usuario
from django.contrib.auth import authenticate


class UsuarioForm(UserCreationForm):
    cedula = forms.CharField(max_length=8, required=True)
    fecha_nacimiento = forms.DateField(required=True)

    class Meta:
        model = Usuario
        fields = ['cedula', 'fecha_nacimiento', 'first_name', 'last_name', 'email', 'password1', 'password2']

    def clean_cedula(self):
        cedula = self.cleaned_data['cedula']
        if not cedula.isdigit() or not 7 <= len(cedula) <= 8:
            raise ValidationError("La cédula debe tener entre 7 y 8 dígitos numéricos.")
        if Usuario.objects.filter(cedula=cedula).exists():
            raise ValidationError("La cédula ya está registrada.")
        return cedula

    def clean_fecha_nacimiento(self):
        fecha = self.cleaned_data['fecha_nacimiento']
        hoy = date.today()
        edad = hoy.year - fecha.year - ((hoy.month, hoy.day) < (fecha.month, fecha.day))
        if edad < 18:
            raise ValidationError("Debes ser mayor de 18 años.")
        return fecha

    def clean_first_name(self):
        nombre = self.cleaned_data['first_name']
        if not nombre.replace(" ", "").isalpha():
            raise ValidationError("El nombre solo debe contener letras.")
        # Convertir a mayúsculas
        return nombre.strip().upper()

    def clean_last_name(self):
        apellido = self.cleaned_data['last_name']
        if not apellido.replace(" ", "").isalpha():
            raise ValidationError("El apellido solo debe contener letras.")
        # Convertir a mayúsculas
        return apellido.strip().upper()

    def clean_email(self):
        email = self.cleaned_data['email']
        if Usuario.objects.filter(email=email).exists():
            raise ValidationError("El correo ya está registrado.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['cedula']  # Autoasigna el username como la cédula
        # Asegurar que nombre y apellido estén en mayúsculas
        user.first_name = self.cleaned_data['first_name'].upper()
        user.last_name = self.cleaned_data['last_name'].upper()
        if commit:
            user.save()
        return user

class CedulaLoginForm(forms.Form):
    cedula = forms.CharField(max_length=8, required=True)
    password = forms.CharField(widget=forms.PasswordInput)

    def clean(self):
        cleaned_data = super().clean()
        cedula = cleaned_data.get('cedula')
        password = cleaned_data.get('password')

        if cedula and password:
            try:
                user = Usuario.objects.get(cedula=cedula)
            except Usuario.DoesNotExist:
                raise forms.ValidationError("La cédula no está registrada.")
            
            user = authenticate(username=user.username, password=password)
            if user is None:
                raise forms.ValidationError("Contraseña incorrecta.")
            cleaned_data['user'] = user
        return cleaned_data