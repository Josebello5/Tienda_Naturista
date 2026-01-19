from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta
import random
import string

class Usuario(AbstractUser):
    cedula = models.CharField(max_length=8, unique=True)
    fecha_nacimiento = models.DateField()

    USERNAME_FIELD = 'cedula'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name', 'fecha_nacimiento', 'username']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.cedula})"


class PasswordResetToken(models.Model):
    """Modelo para tokens de recuperación de contraseña"""
    user = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='reset_tokens')
    code = models.CharField(max_length=6)  # Código de 6 dígitos
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'password_reset_tokens'
        verbose_name = 'Token de Recuperación'
        verbose_name_plural = 'Tokens de Recuperación'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Token para {self.user.email} - {self.code}"
    
    def save(self, *args, **kwargs):
        if not self.pk:  # Solo al crear
            # Generar código de 6 dígitos
            self.code = ''.join(random.choices(string.digits, k=6))
            # Expiración en 15 minutos
            self.expires_at = timezone.now() + timedelta(minutes=15)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Verifica si el token es válido"""
        return not self.is_used and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        """Marca el token como usado"""
        self.is_used = True
        self.save()
