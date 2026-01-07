from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
import re

# ===== OPCIONES DE SUJETO A IVA =====
SUJETO_IVA_CHOICES = [
    ('si', 'Sujeto a IVA'),
    ('no', 'No Sujeto a IVA'),
]

# ===== MODELO PARA CATEGORÍAS =====
class Categoria(models.Model):
    nombre = models.CharField(max_length=20, unique=True)  # Máximo 20 caracteres
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    def clean(self):
        # Validar que solo contenga letras
        if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ]+$', self.nombre):
            raise ValidationError('La categoría solo puede contener letras')
        # Validar que no tenga espacios
        if ' ' in self.nombre:
            raise ValidationError('La categoría no puede contener espacios')
        # Validar longitud máxima
        if len(self.nombre) > 20:
            raise ValidationError('La categoría no puede tener más de 20 caracteres')
        self.nombre = self.nombre.upper()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'

# ===== MODELO PARA PATOLOGÍAS =====
class Patologia(models.Model):
    nombre = models.CharField(max_length=20, unique=True)  # Máximo 20 caracteres
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    def clean(self):
        # Validar que solo contenga letras
        if self.nombre and not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ]+$', self.nombre):
            raise ValidationError('La patología solo puede contener letras')
        # Validar que no tenga espacios
        if self.nombre and ' ' in self.nombre:
            raise ValidationError('La patología no puede contener espacios')
        # Validar longitud máxima
        if self.nombre and len(self.nombre) > 20:
            raise ValidationError('La patología no puede tener más de 20 caracteres')
        if self.nombre:
            self.nombre = self.nombre.upper()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Patología'
        verbose_name_plural = 'Patologías'

# ===== OPCIONES DE ESTADO =====
ESTADOS = [
    ('activo', 'Activo'),
    ('inactivo', 'Inactivo'),
    ('agotado', 'Agotado'),
]

# ===== MODELO PRODUCTO =====
class Producto(models.Model):
    ID_producto = models.AutoField(primary_key=True)
    serial = models.CharField(
        max_length=25,
        unique=True,
        verbose_name='Serial',
        help_text='Máximo 25 caracteres, solo números',
        default= " "
    )
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, verbose_name='Categoría')
    patologia = models.ForeignKey(Patologia, on_delete=models.PROTECT, verbose_name='Patología', blank=True, null=True)
    sujeto_iva = models.CharField(
        max_length=2, 
        choices=SUJETO_IVA_CHOICES, 
        default='si',
        verbose_name='Sujeto a IVA'
    )
    nombre_pro = models.CharField(
        max_length=30,
        verbose_name='Nombre del Producto',
        help_text='Solo letras, números y espacios (máximo 30 caracteres)'
    )
    ubicacion = models.CharField(
        max_length=15, 
        verbose_name='Ubicación',
        help_text='Máximo 15 caracteres (letras, números y espacios)'
    )
    stock_minimo = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(99)]
    )
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripción')
    precio_venta = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0.01), MaxValueValidator(9999.99)]
    )
    estado = models.CharField(
        max_length=10, 
        choices=ESTADOS, 
        default='activo',  
        help_text='Los productos inactivos no podrán recibir lotes'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.nombre_pro} ({self.ID_producto})'

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre_pro']
        constraints = [
            models.UniqueConstraint(
                fields=['nombre_pro'],
                name='unique_nombre_producto',
                condition=models.Q(estado='activo'),
                violation_error_message='Ya existe un producto activo con este nombre'
            )
        ]

    def clean(self):
        """Validaciones personalizadas"""
        # Validar nombre único (case insensitive) para productos activos
        if self.estado == 'activo':
            existe = Producto.objects.filter(
                nombre_pro__iexact=self.nombre_pro,
                estado='activo'
            ).exclude(ID_producto=self.ID_producto)
            
            if existe.exists():
                raise ValidationError({'nombre_pro': 'Ya existe un producto activo con este nombre'})
        
        # Validar serial
        if not self.serial:
            raise ValidationError({'serial': 'El serial es obligatorio'})
        
        if self.serial:
            # Validar que solo contenga números
            if not re.match(r'^[0-9]+$', self.serial):
                raise ValidationError({'serial': 'El serial solo debe contener números'})
            
            # Validar longitud máxima
            if len(self.serial) > 25:
                raise ValidationError({'serial': 'El serial no puede tener más de 25 caracteres'})
        
        # Validar ubicación
        if not self.ubicacion:
            raise ValidationError({'ubicacion': 'La ubicación es obligatoria'})
        
        if self.ubicacion:
            if not re.match(r'^[A-Za-z0-9\s]{1,15}$', self.ubicacion):
                raise ValidationError({
                    'ubicacion': 'La ubicación solo puede contener letras, números y espacios (máximo 15 caracteres)'
                })
        
        # Convertir nombre a mayúsculas
        if self.nombre_pro:
            self.nombre_pro = self.nombre_pro.upper()
        
        # Convertir ubicación a mayúsculas
        if self.ubicacion:
            self.ubicacion = self.ubicacion.upper()

    def save(self, *args, **kwargs):
        """Sobrescribir save para validaciones y lógica personalizada"""
        self.clean()
        super().save(*args, **kwargs)
    
    def puede_recibir_lotes(self):
        """Verifica si el producto puede recibir lotes"""
        return self.estado == 'activo'
    
    def actualizar_estado_por_stock(self, stock_actual):
        """
        Actualiza el estado automáticamente basado en el stock actual
        """
        if self.estado == 'inactivo':
            return
        
        if stock_actual == 0:
            self.estado = 'agotado'
        elif stock_actual > 0 and self.estado == 'agotado':
            self.estado = 'activo'