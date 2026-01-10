from django import template
from decimal import Decimal
from tienda_naturista.utils import format_venezuelan_money

register = template.Library()

@register.filter(name='formato_venezolano')
def formato_venezolano(value, decimal_pos=2):
    """
    Filtro que usa la utilidad central de formateo.
    """
    return format_venezuelan_money(value)
