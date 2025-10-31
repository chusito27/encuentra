import { db } from './firebase-config.js';
import { showMessage } from './ui.js';
import { getCurrentComercioId } from './comercios.js';
import { uploadImage } from './image-uploader.js';
import { resizeImage } from './image-utils.js';
import { getAllCategories } from './categories.js'; 
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Vistas y elementos del formulario
let productsListView, productFormView, productForm, productFormTitle, cancelProductEdit;
let productsList, addNewProductButton;

// --- NUEVO: Variable para almacenar todos los productos del comercio actual ---
let allProducts = [];

// --- FUNCIÓN NUEVA: Calcular y mostrar ganancia ---
function updateProfit() {
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const costPrice = parseFloat(document.getElementById('productCostPrice').value) || 0;
    const profit = price - costPrice;
    const profitElement = document.getElementById('productProfit');

    profitElement.textContent = `₡${profit.toFixed(2)}`;
    profitElement.style.color = profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
}

// Función para cambiar entre la vista de lista y la de formulario
function showProductView(view) {
    if (view === 'form') {
        productsListView.style.display = 'none';
        productFormView.style.display = 'block';
    } else { // 'list'
        productsListView.style.display = 'block';
        productFormView.style.display = 'none';
    }
}

export function initProductFeatures() {
    // Vistas
    productsListView = document.getElementById('productsListView');
    productFormView = document.getElementById('productFormView');
    
    // Elementos
    productsList = document.getElementById('productsList');
    addNewProductButton = document.getElementById('addNewProductButton');
    productForm = document.getElementById('productForm');
    productFormTitle = document.getElementById('productFormTitle');
    cancelProductEdit = document.getElementById('cancelProductEdit');

    // Event Listeners
    addNewProductButton.addEventListener('click', () => openProductForm());
    productForm.addEventListener('submit', saveProduct);
    cancelProductEdit.addEventListener('click', () => showProductView('list'));

    // Event listeners para calcular la ganancia en tiempo real
    document.getElementById('productPrice').addEventListener('input', updateProfit);
    document.getElementById('productCostPrice').addEventListener('input', updateProfit);

    // --- NUEVO: Event listeners para los filtros ---
    const searchInput = document.getElementById('productSearchInput');
    const sortSelect = document.getElementById('productSortSelect');
    searchInput.addEventListener('input', applyFiltersAndSort);
    sortSelect.addEventListener('change', applyFiltersAndSort);
}

export async function loadProducts(comercioId) { // Esta función ya se exportaba, solo nos aseguramos.
    if (!productsList) return;
    productsList.innerHTML = 'Cargando productos...';
    if (!comercioId) {
        productsList.innerHTML = '<p>Selecciona un comercio para ver sus productos.</p>';
        allProducts = []; // Limpiar la lista si no hay comercio
        // --- NUEVO: Limpiar filtros al cambiar de comercio ---
        document.getElementById('productSearchInput').value = '';
        document.getElementById('productSortSelect').value = 'order-asc';
        return;
    }

    try { 
        // --- NUEVO: Obtener todas las categorías del comercio actual ---
        const allCategories = await getAllCategories(comercioId);
        // --- SINTAXIS v9 ---
        const q = query(collection(db, `comercios/${comercioId}/products`), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            productsList.innerHTML = '<p>No hay productos para este comercio. ¡Añade uno!</p>';
            return;
        }

        // --- MODIFICADO: Guardamos los productos en la variable global ---
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // --- NUEVO: Limpiar filtros y aplicar orden por defecto ---
        document.getElementById('productSearchInput').value = '';
        document.getElementById('productSortSelect').value = 'order-asc';

        applyFiltersAndSort(); // Renderizar la lista inicial
    } catch (error) {
        console.error("Error al cargar productos:", error);
        productsList.innerHTML = '<p>Error al cargar los productos.</p>';
    }
}

// --- FUNCIÓN DE RENDERIZADO ACTUALIZADA ---
async function applyFiltersAndSort() {
    const searchTerm = document.getElementById('productSearchInput').value.toLowerCase();
    const sortValue = document.getElementById('productSortSelect').value;
    const comercioId = getCurrentComercioId();

    // Empezamos con una copia de todos los productos
    let processedProducts = [...allProducts];

    // 1. Aplicar filtro de búsqueda
    if (searchTerm) {
        processedProducts = processedProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    // 2. Aplicar ordenación
    processedProducts.sort((a, b) => {
        switch (sortValue) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'price-desc':
                return (b.price || 0) - (a.price || 0);
            case 'price-asc':
                return (a.price || 0) - (b.price || 0);
            case 'profit-desc':
                const profitA = (a.price || 0) - (a.costPrice || 0);
                const profitB = (b.price || 0) - (b.costPrice || 0);
                return profitB - profitA;
            case 'stock-asc':
                // Los productos con stock ilimitado (null) van al final
                if (a.stock === null) return 1;
                if (b.stock === null) return -1;
                return a.stock - b.stock;
            case 'order-asc':
            default:
                return (a.order || 999) - (b.order || 999);
        }
    });

    // 3. Renderizar la cuadrícula con los productos filtrados y ordenados
    const allCategories = await getAllCategories(comercioId);
    renderProductsGrid(processedProducts, allCategories);
}

function renderProductsGrid(products, allCategories) {
    productsList.innerHTML = ''; // Limpiar contenido anterior

    // --- NUEVO: Mostrar mensaje si no hay resultados ---
    if (products.length === 0) {
        productsList.innerHTML = '<p>No se encontraron productos que coincidan con tu búsqueda.</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'list-grid'; // Usamos la clase 'list-grid' que ya tienes

    products.forEach(p => {
        const card = document.createElement('div');
        // --- NUEVO: Crear un mapa para buscar nombres de categoría rápidamente ---
        const categoryMap = new Map(allCategories.map(cat => [cat.id, cat.name]));

        card.className = 'product-card'; // Usamos la clase 'product-card'

        // Lógica para mostrar el stock
        let stockInfo = '';
        let stockText = ''; // NUEVO: Variable para el texto del stock
        if (p.stock !== null && p.stock !== undefined) {
            let stockClass = 'stock-ok';
            if (p.stock === 0) stockClass = 'stock-out';
            else if (p.stock <= 5) stockClass = 'stock-low';
            stockInfo = `<div class="product-stock ${stockClass}">Stock: ${p.stock}</div>`;
        } else {
            stockInfo = `<div class="product-stock stock-unlimited">Stock Ilimitado</div>`;
        }
        // Definimos el texto que se mostrará dentro de la tarjeta
        stockText = (p.stock !== null && p.stock !== undefined) ? `Stock: ${p.stock}` : 'Stock: Ilimitado';

        // --- NUEVO: Calcular la ganancia ---
        const price = p.price || 0;
        const costPrice = p.costPrice || 0;
        const profit = price - costPrice;
        const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';

        // --- NUEVO: Obtener los nombres de las categorías del producto ---
        const productCategoryNames = (p.categoryIds || [])
            .map(catId => categoryMap.get(catId))
            .filter(name => name) // Filtra IDs que no encuentren un nombre (por si acaso)
            .join(', ');
        const categoriesDisplay = productCategoryNames ? `<small class="product-categories-text">Categorías: ${productCategoryNames}</small>` : '';

        card.innerHTML = `
            <img src="${p.image || 'https://via.placeholder.com/300x200.png?text=Sin+Imagen'}" alt="${p.name}">
            ${stockInfo}
            <div class="product-card-info">
                <h4>${p.name}</h4>
                <p class="product-price">₡${price.toFixed(2)}</p>
                <small class="product-order">Orden: ${p.order}</small>
                <!-- NUEVO: Mostrar el stock -->
                <small class="product-stock-text">${stockText}</small>
                <!-- NUEVO: Mostrar las categorías -->
                ${categoriesDisplay}
                <!-- NUEVO: Mostrar la ganancia -->
                <small class="product-profit ${profitClass}">Ganancia: ₡${profit.toFixed(2)}</small>
            </div>
            <div class="product-card-actions">
                <button class="edit-product" data-id="${p.id}">Editar</button>
                <button class="delete-product delete" data-id="${p.id}">Eliminar</button>
            </div>
        `;
        grid.appendChild(card);
    });

    productsList.appendChild(grid);

    // Añadir event listeners para los nuevos botones de las tarjetas
    grid.querySelectorAll('.edit-product').forEach(b => b.addEventListener('click', (e) => openProductForm(e.target.dataset.id)));
    grid.querySelectorAll('.delete-product').forEach(b => b.addEventListener('click', (e) => deleteProduct(e.target.dataset.id)));
}

// Renombramos la función para mayor claridad
async function openProductForm(productId = null) {
    productForm.reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('productCategoriesContainer').innerHTML = '';

    if (productId) {
        productFormTitle.textContent = 'Editar Producto';
        const comercioId = getCurrentComercioId();
        const docRef = doc(db, `comercios/${comercioId}/products`, productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // --- Llenar campos existentes ---
            document.getElementById('productId').value = docSnap.id;
            document.getElementById('productName').value = data.name;
            document.getElementById('productPrice').value = data.price;
            document.getElementById('productOrder').value = data.order;
            document.getElementById('productDescription').value = data.description;
            document.getElementById('productImage').value = data.image;
            
            // --- Llenar NUEVOS campos ---
            document.getElementById('productOldPrice').value = data.oldPrice || '';
            document.getElementById('productCostPrice').value = data.costPrice || '';
            document.getElementById('productDetails').value = data.details || '';
            document.getElementById('isGlutenFree').checked = data.isGlutenFree || false;
            document.getElementById('productStock').value = (data.stock !== null && data.stock !== undefined) ? data.stock : '';
            document.getElementById('isVegan').checked = data.isVegan || false;
            document.getElementById('isVegetarian').checked = data.isVegetarian || false;

            if (data.image) {
                document.getElementById('imagePreview').innerHTML = `<img src="${data.image}" style="max-width: 100px;"/>`;
            }
            await loadCategoriesIntoCheckboxes('productCategoriesContainer', data.categoryIds || []);
            updateProfit(); // Calcular ganancia al cargar
        }
    } else {
        productFormTitle.textContent = 'Añadir Nuevo Producto';

        // --- NUEVO: Calcular el siguiente número de orden disponible ---
        if (allProducts.length > 0) {
            // Encontramos el orden máximo actual y le sumamos 1
            const maxOrder = Math.max(...allProducts.map(p => p.order || 0));
            document.getElementById('productOrder').value = maxOrder + 1;
        } else {
            // Si no hay productos, empezamos en 1
            document.getElementById('productOrder').value = 1;
        }

        // Asegurarse de que los checkboxes estén desmarcados para un producto nuevo (reset ya lo hace, pero es bueno ser explícito)
        document.getElementById('isGlutenFree').checked = false;
        document.getElementById('isVegan').checked = false;
        document.getElementById('isVegetarian').checked = false;
        await loadCategoriesIntoCheckboxes('productCategoriesContainer');
        updateProfit(); // Resetear ganancia a ₡0.00
    }
    showProductView('form');
}

// --- FUNCIÓN MODIFICADA ---
async function saveProduct(e) {
    e.preventDefault();
    const comercioId = getCurrentComercioId();
    if (!comercioId) {
        showMessage("Error", "Selecciona un comercio primero.");
        return;
    }

    const productId = document.getElementById('productId').value;
    let imageUrl = document.getElementById('productImage').value;
    const imageFile = document.getElementById('productImageUpload').files[0];

    const selectedCategories = [];
    document.querySelectorAll('#productCategoriesContainer input[type="checkbox"]:checked').forEach(checkbox => {
        selectedCategories.push(checkbox.value);
    });

    if (selectedCategories.length === 0) {
        showMessage("Error", "Debes seleccionar al menos una categoría.");
        return;
    }

    const stockValue = document.getElementById('productStock').value;
    try {
        if (imageFile) {
            const resizedFile = await resizeImage(imageFile);
            imageUrl = await uploadImage(resizedFile, comercioId);
            document.getElementById('productImage').value = imageUrl;
        }

        // --- Objeto de datos actualizado con NUEVOS campos ---
        const productData = {
            name: document.getElementById('productName').value,
            price: parseFloat(document.getElementById('productPrice').value),
            order: parseInt(document.getElementById('productOrder').value, 10),
            description: document.getElementById('productDescription').value,
            image: imageUrl,
            categoryIds: selectedCategories,
            
            // --- NUEVOS CAMPOS ---
            oldPrice: parseFloat(document.getElementById('productOldPrice').value) || null, // Guardar null si está vacío
            costPrice: parseFloat(document.getElementById('productCostPrice').value) || null,
            details: document.getElementById('productDetails').value,
            isGlutenFree: document.getElementById('isGlutenFree').checked,
            isVegan: document.getElementById('isVegan').checked,
            isVegetarian: document.getElementById('isVegetarian').checked,
            stock: stockValue === '' ? null : parseInt(stockValue, 10)
        };

        if (productId) {
            const docRef = doc(db, `comercios/${comercioId}/products`, productId);
            await updateDoc(docRef, productData);
            showMessage("Éxito", "Producto actualizado.");
        } else {
            await addDoc(collection(db, `comercios/${comercioId}/products`), productData);
            showMessage("Éxito", "Producto añadido.");
        }

        showProductView('list');
        loadProducts(comercioId);
    } catch (error) {
        console.error("Error al guardar producto:", error);
        showMessage("Error", "No se pudo guardar el producto.");
    }
}

async function deleteProduct(productId) {
    const comercioId = getCurrentComercioId();
    if (!comercioId || !productId) return;

    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        try {
            // --- SINTAXIS v9 ---
            await deleteDoc(doc(db, `comercios/${comercioId}/products`, productId));
            showMessage("Éxito", "Producto eliminado.");
            loadProducts(comercioId);
        } catch (error) {
            console.error("Error al eliminar producto:", error);
            showMessage("Error", "No se pudo eliminar el producto.");
        }
    }
}

// --- FUNCIÓN AUXILIAR MODIFICADA ---
// Carga categorías como checkboxes y marca las seleccionadas.
async function loadCategoriesIntoCheckboxes(containerId, selectedIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = 'Cargando categorías...';
    
    // --- PASAMOS EL ID DEL COMERCIO ACTUAL ---
    const comercioId = getCurrentComercioId();
    const categories = await getAllCategories(comercioId);

    if (!comercioId) {
        container.innerHTML = '<p>Por favor, selecciona un comercio primero.</p>';
        return;
    }

    if (categories.length === 0) {
        container.innerHTML = '<p>No hay categorías para este comercio. Ve a la pestaña "Categorías" para crear una.</p>';
        return;
    }

    container.innerHTML = ''; // Limpiar antes de añadir
    categories.forEach(category => {
        const isChecked = selectedIds.includes(category.id) ? 'checked' : '';
        const checkboxHTML = `
            <div class="checkbox-item">
                <input type="checkbox" id="cat-prod-${category.id}" name="category" value="${category.id}" ${isChecked}>
                <label for="cat-prod-${category.id}">${category.name}</label>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', checkboxHTML);
    });
}


// Modificar la función que muestra el modal de añadir producto
async function handleShowAddProductModal() {
    // ... (código existente para cargar comercios)
    
    // Cargar categorías en el modal de añadir
    await loadCategoriesIntoCheckboxes('productCategories');

    showModal('addProductModal');
}

// Modificar la función que guarda el producto
async function handleAddProductSubmit(e) {
    e.preventDefault();
    // ... (obtener otros valores del formulario)

    // Obtener las categorías seleccionadas
    const selectedCategories = [];
    document.querySelectorAll('#productCategories input[type="checkbox"]:checked').forEach(checkbox => {
        selectedCategories.push(checkbox.value);
    });

    if (selectedCategories.length === 0) {
        alert('Por favor, selecciona al menos una categoría.');
        return;
    }

    const productData = {
        // ... (otros datos del producto)
        name: productName,
        price: productPrice,
        comercioId: productComercio,
        categoryIds: selectedCategories, // Guardar como un array
        // ... (resto de datos)
    };

    // ... (lógica para guardar en Firestore)
    // Asegúrate de que al guardar en Firestore, el campo sea `categoryIds` (o como lo llames)
    // y contenga el array `selectedCategories`.
}


// Modificar la función que abre el modal de edición
async function handleEditProductClick(productId) {
    // ... (código existente para obtener datos del producto y llenar campos)
    
    // Cargar todas las categorías como checkboxes
    await loadCategoriesIntoCheckboxes('editProductCategories');

    // Marcar las categorías que el producto ya tiene
    if (productData.categoryIds && Array.isArray(productData.categoryIds)) {
        productData.categoryIds.forEach(catId => {
            const checkbox = document.querySelector(`#editProductCategories input[value="${catId}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    showModal('editProductModal');
}

// Modificar la función que actualiza el producto
async function handleUpdateProductSubmit(e) {
    e.preventDefault();
    // ... (obtener otros valores del formulario)

    // Obtener las nuevas categorías seleccionadas
    const selectedCategories = [];
    document.querySelectorAll('#editProductCategories input[type="checkbox"]:checked').forEach(checkbox => {
        selectedCategories.push(checkbox.value);
    });

    if (selectedCategories.length === 0) {
        alert('Por favor, selecciona al menos una categoría.');
        return;
    }

    const updatedData = {
        // ... (otros datos actualizados)
        categoryIds: selectedCategories, // Guardar el nuevo array
    };

    // ... (lógica para actualizar en Firestore)
}

// ... (resto del código en products.js, como los event listeners)
// Asegúrate de que los event listeners llamen a estas nuevas funciones.