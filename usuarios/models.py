from django.db import models

from django.contrib.auth.models import AbstractUser
from django.db import models

class Usuario(AbstractUser):
    cedula = models.CharField(max_length=8, unique=True)
    fecha_nacimiento = models.DateField()

    USERNAME_FIELD = 'cedula'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name', 'fecha_nacimiento', 'username']  # username queda como campo opcional

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.cedula})"

