// ===== DATOS INICIALES DE PRODUCTOS =====
const productosIniciales = [
    {
        id: '001',
        nombre: 'Té Verde Orgánico',
        categoria: 'Tés e Infusiones',
        precio: '$12.500',
        stock: 25,
        estado: 'Activo'
    },
    {
        id: '002',
        nombre: 'Aceite de Coco Virgen',
        categoria: 'Aceites Esenciales',
        precio: '$24.900',
        stock: 8,
        estado: 'Activo'
    },
    {
        id: '003',
        nombre: 'Miel de Abeja Pura',
        categoria: 'Endulzantes Naturales',
        precio: '$18.750',
        stock: 0,
        estado: 'Inactivo'
    },
    {
        id: '004',
        nombre: 'Semillas de Chía',
        categoria: 'Superalimentos',
        precio: '$9.800',
        stock: 3,
        estado: 'Activo'
    },
    {
        id: '005',
        nombre: 'Jengibre en Polvo',
        categoria: 'Especias',
        precio: '$7.200',
        stock: 15,
        estado: 'Activo'
    }
];

// ===== FUNCIONES DE GESTIÓN DE PRODUCTOS =====

// Función para renderizar la tabla de productos
function renderizarProductos() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    if (productosIniciales.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <i class="fas fa-box-open"></i>
                    <h3>No hay productos registrados</h3>
                    <p>Haz clic en "Agregar Producto" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    productosIniciales.forEach(producto => {
        const estadoClass = producto.estado === 'Activo' ? 'status-active' : 
                           producto.estado === 'Inactivo' ? 'status-inactive' : 'status-low';
        
        const stockClass = producto.stock === 0 ? 'status-inactive' : 
                          producto.stock <= 5 ? 'status-low' : 'status-active';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${producto.id}</td>
            <td>${producto.nombre}</td>
            <td>${producto.categoria}</td>
            <td>${producto.precio}</td>
            <td><span class="status ${stockClass}">${producto.stock} unidades</span></td>
            <td><span class="status ${estadoClass}">${producto.estado}</span></td>
            <td class="actions">
                <button class="btn-action btn-edit" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        
        tbody.appendChild(tr);
        
        // Agregar eventos a los botones de la fila
        const btnEdit = tr.querySelector('.btn-edit');
        const btnDelete = tr.querySelector('.btn-delete');
        
        btnEdit.addEventListener('click', () => editarProducto(producto.id));
        btnDelete.addEventListener('click', () => eliminarProducto(producto.id));
    });
}

// Función para agregar un nuevo producto
function agregarProducto() {
    const nuevoId = String(productosIniciales.length + 1).padStart(3, '0');
    
    const nuevoProducto = {
        id: nuevoId,
        nombre: 'Nuevo Producto',
        categoria: 'Categoría',
        precio: '$0',
        stock: 0,
        estado: 'Inactivo'
    };
    
    productosIniciales.unshift(nuevoProducto);
    renderizarProductos();
    
    alert('Nuevo producto agregado. Puedes editarlo ahora.');
}

// Función para editar un producto
function editarProducto(id) {
    const producto = productosIniciales.find(p => p.id === id);
    if (!producto) return;
    
    const nuevoNombre = prompt('Ingrese el nuevo nombre del producto:', producto.nombre);
    if (nuevoNombre === null) return; // El usuario canceló
    
    const nuevaCategoria = prompt('Ingrese la nueva categoría:', producto.categoria);
    if (nuevaCategoria === null) return;
    
    const nuevoPrecio = prompt('Ingrese el nuevo precio:', producto.precio);
    if (nuevoPrecio === null) return;
    
    const nuevoStock = parseInt(prompt('Ingrese el nuevo stock:', producto.stock));
    if (isNaN(nuevoStock)) return;
    
    const nuevoEstado = confirm('¿El producto está activo?') ? 'Activo' : 'Inactivo';
    
    // Actualizar el producto
    producto.nombre = nuevoNombre;
    producto.categoria = nuevaCategoria;
    producto.precio = nuevoPrecio;
    producto.stock = nuevoStock;
    producto.estado = nuevoEstado;
    
    renderizarProductos();
    alert('Producto actualizado correctamente');
}

// Función para eliminar un producto
function eliminarProducto(id) {
    const producto = productosIniciales.find(p => p.id === id);
    if (!producto) return;
    
    if (confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) {
        const index = productosIniciales.findIndex(p => p.id === id);
        if (index !== -1) {
            productosIniciales.splice(index, 1);
            renderizarProductos();
            alert(`Producto "${producto.nombre}" eliminado correctamente`);
        }
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Renderizar productos iniciales
    renderizarProductos();
    
    // Configurar evento para el botón de agregar
    document.getElementById('addBtn').addEventListener('click', agregarProducto);
});