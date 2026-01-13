"""
Mixins personalizados para control de acceso en vistas basadas en clases
"""
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import redirect
from django.contrib import messages
from django.urls import reverse_lazy


class RoleRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """
    Mixin que verifica si el usuario pertenece a alguno de los roles especificados.
    
    Uso:
        class MiVista(RoleRequiredMixin, View):
            required_roles = ['Dueño', 'Administrador']
            ...
    """
    required_roles = []
    redirect_url = reverse_lazy('dashboard:menu')
    permission_denied_message = 'No tienes permisos para acceder a esta sección.'
    
    def test_func(self):
        """Verifica si el usuario tiene alguno de los roles requeridos"""
        return self.request.user.groups.filter(name__in=self.required_roles).exists()
    
    def handle_no_permission(self):
        """Maneja el caso cuando el usuario no tiene permisos"""
        messages.error(self.request, self.permission_denied_message)
        return redirect(self.redirect_url)


class OwnerRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """
    Mixin que permite acceso solo al Dueño.
    
    Uso:
        class MiVista(OwnerRequiredMixin, View):
            ...
    """
    redirect_url = reverse_lazy('dashboard:menu')
    permission_denied_message = 'Solo el dueño puede acceder a esta sección.'
    
    def test_func(self):
        """Verifica si el usuario es Dueño"""
        return self.request.user.groups.filter(name='Dueño').exists()
    
    def handle_no_permission(self):
        """Maneja el caso cuando el usuario no tiene permisos"""
        messages.error(self.request, self.permission_denied_message)
        return redirect(self.redirect_url)


class AdminOrOwnerRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """
    Mixin que permite acceso solo a Dueño o Administrador.
    
    Uso:
        class MiVista(AdminOrOwnerRequiredMixin, View):
            ...
    """
    redirect_url = reverse_lazy('dashboard:menu')
    permission_denied_message = 'Solo administradores y dueños pueden acceder a esta sección.'
    
    def test_func(self):
        """Verifica si el usuario es Dueño o Administrador"""
        return self.request.user.groups.filter(name__in=['Dueño', 'Administrador']).exists()
    
    def handle_no_permission(self):
        """Maneja el caso cuando el usuario no tiene permisos"""
        messages.error(self.request, self.permission_denied_message)
        return redirect(self.redirect_url)


class PermissionRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """
    Mixin que verifica si el usuario tiene un permiso personalizado específico.
    
    Uso:
        class MiVista(PermissionRequiredMixin, View):
            required_permission = 'can_void_sales'
            ...
    """
    required_permission = None
    redirect_url = reverse_lazy('dashboard:menu')
    permission_denied_message = 'No tienes permisos para realizar esta acción.'
    
    def test_func(self):
        """Verifica si el usuario tiene el permiso requerido"""
        if not self.required_permission:
            raise ValueError('required_permission debe estar definido')
        return self.request.user.has_perm(f'usuarios.{self.required_permission}')
    
    def handle_no_permission(self):
        """Maneja el caso cuando el usuario no tiene permisos"""
        messages.error(self.request, self.permission_denied_message)
        return redirect(self.redirect_url)
