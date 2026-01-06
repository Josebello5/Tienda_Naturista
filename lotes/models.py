from django.db import models
from productos.models import Producto
from django.utils import timezone
from datetime import date
import re
from django.core.exceptions import ValidationError

class Proveedor(models.Model):
    id_proveedor = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Proveedor")
    contacto = models.CharField(max_length=200, blank=True, null=True, verbose_name="Información de Contacto")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    def clean(self):
        """Validaciones personalizadas para el modelo Proveedor"""
        if self.nombre:
            # Validar formato: letras, números, espacios y puntos
            if not re.match(r'^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.]+$', self.nombre):
                raise ValidationError('El nombre del proveedor solo puede contener letras, números y puntos.')
            
            # Convertir a mayúsculas
            self.nombre = self.nombre.upper()
            
            # Validar longitud máxima
            if len(self.nombre) > 100:
                raise ValidationError('El nombre del proveedor no puede tener más de 100 caracteres.')

        if self.contacto:
            # Validar longitud máxima del contacto
            if len(self.contacto) > 200:
                raise ValidationError('La información de contacto no puede tener más de 200 caracteres.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'proveedores'
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['nombre']

class Lote(models.Model):
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('vencido', 'Vencido'),
        ('agotado', 'Agotado'),
    ]
    
    id_lote = models.AutoField(primary_key=True)
    id_producto = models.ForeignKey(Producto, on_delete=models.CASCADE, db_column='id_producto')
    codigo_lote = models.CharField(max_length=50, unique=True)
    cantidad = models.IntegerField()
    cantidad_disponible = models.IntegerField()
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    costo_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    # CAMBIO IMPORTANTE: Cambiar a ForeignKey
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, verbose_name="Proveedor")
    fecha_recibimiento = models.DateField(default=timezone.now)
    fecha_vencimiento = models.DateField()
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='activo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.codigo_lote} - {self.id_producto.nombre_pro}"
    
    class Meta:
        db_table = 'lotes'
        verbose_name = 'Lote'
        verbose_name_plural = 'Lotes'
        # REMOVIMOS LA RESTRICCIÓN UNIQUE QUE CAUSABA EL PROBLEMA
    
    def clean(self):
        """Validación personalizada para evitar duplicados"""
        super().clean()
        
        # SOLO VERIFICAR CÓDIGO DE LOTE DUPLICADO
        if Lote.objects.filter(codigo_lote=self.codigo_lote).exclude(id_lote=self.id_lote).exists():
            raise ValidationError('Ya existe un lote con este código.')
    
    def calcular_estado_automatico(self):
        """Calcula el estado automáticamente basado en fechas y cantidad disponible"""
        hoy = timezone.localdate()
        
        # 1. Verificar si está vencido (prioridad máxima)
        if self.fecha_vencimiento < hoy:
            return 'vencido'
        
        # 2. Verificar si está agotado
        if self.cantidad_disponible <= 0:
            return 'agotado'
        
        # 3. Mantener el estado actual si es activo o inactivo
        # Solo cambiar si el estado actual es vencido o agotado pero ya no lo está
        if self.estado in ['vencido', 'agotado']:
            return 'activo'
        
        return self.estado
    
    def save(self, *args, **kwargs):
        # Asegurar que el código de lote esté en mayúsculas
        if self.codigo_lote:
            self.codigo_lote = self.codigo_lote.upper()
        
        # Calcular el costo total
        self.costo_total = self.costo_unitario * self.cantidad
        
        # SOLO calcular estado automático si es un NUEVO lote (no edición)
        # o si la cantidad disponible cambió a 0
        if not self.pk or self.cantidad_disponible <= 0:
            self.estado = self.calcular_estado_automatico()
        
        # Validar antes de guardar
        self.full_clean()
        
        super().save(*args, **kwargs)