from django.db import models

class Cliente(models.Model):
    TIPO_CLIENTE_CHOICES = [
        ('particular', 'Particular'),
        ('mayorista', 'Mayorista'),
    ]
    
    cedula = models.CharField(max_length=10, unique=True)
    nombre = models.CharField(max_length=10)
    apellido = models.CharField(max_length=10)
    telefono = models.CharField(max_length=11)
    direccion = models.CharField(max_length=20)
    tipo_cliente = models.CharField(max_length=10, choices=TIPO_CLIENTE_CHOICES, default='particular')

    def __str__(self):
        return f'{self.nombre} {self.apellido} - {self.cedula}'
    
    def save(self, *args, **kwargs):
        # Convertir dirección a mayúsculas antes de guardar
        if self.direccion:
            self.direccion = self.direccion.upper()
        super().save(*args, **kwargs)
    
    def get_tipo_cedula(self):
        """Extrae el tipo de cédula (V, E, J) del campo cedula"""
        if self.cedula and len(self.cedula) > 0:
            return self.cedula[0]
        return ''
    
    def get_numero_cedula(self):
        """Extrae el número de cédula"""
        if self.cedula and len(self.cedula) > 1:
            return self.cedula[1:]
        return ''