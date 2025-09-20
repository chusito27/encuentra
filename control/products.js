import { db } from './firebase-config.js';
import { showMessage } from './ui.js';
import { getCurrentComercioId } from './comercios.js';
import { uploadImage } from './image-uploader.js';
import { resizeImage } from './image-utils.js';
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Vistas y elementos del formulario
let productsListView, productFormView, productForm, productFormTitle, cancelProductEdit;
let productsList, addNewProductButton;

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
}

export async function loadProducts(comercioId) {
    if (!productsList) return;
    productsList.innerHTML = 'Cargando productos...';
    if (!comercioId) {
        productsList.innerHTML = '<p>Selecciona un comercio para ver sus productos.</p>';
        return;
    }

    try {
        // --- SINTAXIS v9 ---
        const q = query(collection(db, `comercios/${comercioId}/products`), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            productsList.innerHTML = '<p>No hay productos para este comercio. ¡Añade uno!</p>';
            return;
        }

        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Llamamos a la nueva función de renderizado
        renderProductsGrid(products);
    } catch (error) {
        console.error("Error al cargar productos:", error);
        productsList.innerHTML = '<p>Error al cargar los productos.</p>';
    }
}

// --- FUNCIÓN DE RENDERIZADO ACTUALIZADA ---
function renderProductsGrid(products) {
    productsList.innerHTML = ''; // Limpiar contenido anterior

    const grid = document.createElement('div');
    grid.className = 'list-grid'; // Usamos la clase 'list-grid' que ya tienes

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card'; // Usamos la clase 'product-card'
        card.innerHTML = `
            <img src="${p.image || 'https://via.placeholder.com/300x200.png?text=Sin+Imagen'}" alt="${p.name}">
            <div class="product-card-info">
                <h4>${p.name}</h4>
                <p class="product-price">$${p.price ? p.price.toFixed(2) : '0.00'}</p>
                <small class="product-order">Orden: ${p.order}</small>
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

    if (productId) {
        productFormTitle.textContent = 'Editar Producto';
        const comercioId = getCurrentComercioId();
        const docRef = doc(db, `comercios/${comercioId}/products`, productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('productId').value = docSnap.id;
            document.getElementById('productName').value = data.name;
            document.getElementById('productPrice').value = data.price;
            document.getElementById('productOrder').value = data.order;
            document.getElementById('productCategory').value = data.categoryId;
            document.getElementById('productDescription').value = data.description;
            document.getElementById('productImage').value = data.image;
            if (data.image) {
                document.getElementById('imagePreview').innerHTML = `<img src="${data.image}" style="max-width: 100px;"/>`;
            }
        }
    } else {
        productFormTitle.textContent = 'Añadir Nuevo Producto';
    }
    // Mostramos la vista de formulario
    showProductView('form');
}

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

    try {
        if (imageFile) {
            const resizedFile = await resizeImage(imageFile);
            imageUrl = await uploadImage(resizedFile, comercioId);
            document.getElementById('productImage').value = imageUrl;
        }

        const productData = {
            name: document.getElementById('productName').value,
            price: parseFloat(document.getElementById('productPrice').value),
            order: parseInt(document.getElementById('productOrder').value, 10),
            categoryId: document.getElementById('productCategory').value,
            description: document.getElementById('productDescription').value,
            image: imageUrl
        };

        if (productId) {
            const docRef = doc(db, `comercios/${comercioId}/products`, productId);
            await updateDoc(docRef, productData);
            showMessage("Éxito", "Producto actualizado.");
        } else {
            await addDoc(collection(db, `comercios/${comercioId}/products`), productData);
            showMessage("Éxito", "Producto añadido.");
        }

        // Volvemos a la vista de lista
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