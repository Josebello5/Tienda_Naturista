from django.db import models
from django.conf import settings

class TasaCambiaria(models.Model):
    valor = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Valor del dólar en bolívares")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)  # Usando AUTH_USER_MODEL
    
    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = 'Tasa Cambiaria'
        verbose_name_plural = 'Tasas Cambiarias'
    
    def __str__(self):
        return f"${self.valor} Bs - {self.fecha_creacion.strftime('%d/%m/%Y %H:%M')}"
    
    def valor_formateado(self):
        """Devuelve el valor formateado con coma decimal"""
        # Formatear con dos decimales y reemplazar punto por coma
        return f"{self.valor:.2f}".replace('.', ',')