import { db } from './firebase-config.js';
import { showMessage } from './ui.js';
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Elements ---
let categoriesTableContainer, categoryModal, categoryForm, categoryFormTitle, closeModalBtn, cancelCategoryEdit;

// --- State ---
let currentComercioId = null;

export function initCategoryFeatures() {
    // Main tab elements
    categoriesTableContainer = document.getElementById('categoriesTableContainer');
    const addNewCategoryBtn = document.getElementById('addNewCategoryBtn');
    if (addNewCategoryBtn) {
        addNewCategoryBtn.addEventListener('click', () => openCategoryModal());
    }

    // Modal elements (assuming a generic modal structure in your index.html)
    categoryModal = document.getElementById('categoryModal'); // You will need to add this modal to your HTML
    categoryForm = document.getElementById('categoryForm');
    categoryFormTitle = document.getElementById('categoryFormTitle');
    cancelCategoryEdit = document.getElementById('cancelCategoryEdit');

    // --- CORRECCIÓN: Añadir comprobaciones de existencia para todos los elementos ---
    if (categoryModal) {
        closeModalBtn = categoryModal.querySelector('.close-button'); // Standard close button
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => closeCategoryModal());
        }
        window.addEventListener('click', (event) => { // Close modal if clicking outside
            if (event.target == categoryModal) {
                closeCategoryModal();
            }
        });
    }

    if (categoryForm) {
        categoryForm.addEventListener('submit', saveCategory);
    }

    if (cancelCategoryEdit) {
        cancelCategoryEdit.addEventListener('click', () => closeCategoryModal());
    }
}

function openCategoryModal(categoryId = null) {
    resetCategoryForm();
    if (categoryId) {
        categoryFormTitle.textContent = 'Editar Categoría';
        populateCategoryForm(categoryId);
    } else {
        categoryFormTitle.textContent = 'Añadir Nueva Categoría';
    }
    categoryModal.style.display = 'block';
}

function closeCategoryModal() {
    categoryModal.style.display = 'none';
}

export async function loadCategoriesForSelection(comercioId) {
    const select = document.getElementById('productCategory');
    if (!select) return;
    select.innerHTML = '<option value="">-- Sin categoría --</option>';
    if (!comercioId) return;

    try {
        const q = query(collection(db, `comercios/${comercioId}/categories`), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando categorías para el selector:", error);
    }
}

// --- FUNCIÓN DE RENDERIZADO DE TABLA ACTUALIZADA ---
export async function loadManagedCategories(comercioId) {
    currentComercioId = comercioId; // Guardar el ID del comercio actual
    if (!categoriesTableContainer) return;
    
    categoriesTableContainer.innerHTML = 'Cargando categorías...';
    if (!comercioId) {
        categoriesTableContainer.innerHTML = '<p>Selecciona un comercio para ver sus categorías.</p>';
        return;
    }

    try {
        const q = query(collection(db, `comercios/${comercioId}/categories`), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            categoriesTableContainer.innerHTML = '<p>No hay categorías para este comercio. ¡Añade una!</p>';
            return;
        }

        // --- NUEVO: Crear una lista de tarjetas en lugar de una tabla ---
        const listContainer = document.createElement('div');
        listContainer.className = 'category-list'; // Nueva clase para el contenedor

        const listHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="category-list-item">
                    <div class="category-info">
                        <span class="category-name">${data.name}</span>
                        <span class="category-order">Orden: ${data.order}</span>
                    </div>
                    <div class="category-actions">
                        <button class="edit-category" data-id="${doc.id}" title="Editar">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="delete-category delete" data-id="${doc.id}" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = listHTML;

        categoriesTableContainer.innerHTML = '';
        categoriesTableContainer.appendChild(listContainer);

        // Añadir event listeners para los nuevos botones de la tabla
        listContainer.querySelectorAll('.edit-category').forEach(button => {
            button.addEventListener('click', (e) => {
                // Usamos currentTarget para asegurarnos de que obtenemos el botón, incluso si se hace clic en el icono <i>
                openCategoryModal(e.currentTarget.dataset.id);
            });
        });
        listContainer.querySelectorAll('.delete-category').forEach(button => {
            button.addEventListener('click', (e) => {
                deleteCategory(e.currentTarget.dataset.id);
            });
        });

    } catch (error) {
        console.error("Error al cargar categorías:", error);
        categoriesTableContainer.innerHTML = '<p>Error al cargar las categorías.</p>';
    }
}

async function saveCategory(e) {
    e.preventDefault();
    if (!currentComercioId) {
        showMessage("Error", "Selecciona un comercio primero.");
        return;
    }

    const categoryId = document.getElementById('categoryId').value;
    const categoryData = {
        name: document.getElementById('categoryName').value,
        order: parseInt(document.getElementById('categoryOrder').value, 10)
    };

    try {
        if (categoryId) {
            await updateDoc(doc(db, `comercios/${currentComercioId}/categories`, categoryId), categoryData);
            showMessage("Éxito", "Categoría actualizada.");
        } else {
            await addDoc(collection(db, `comercios/${currentComercioId}/categories`), categoryData);
            showMessage("Éxito", "Categoría añadida.");
        }
        closeCategoryModal();
        loadManagedCategories(currentComercioId);
        loadCategoriesForSelection(currentComercioId);
    } catch (error) {
        console.error("Error al guardar categoría:", error);
        showMessage("Error", "No se pudo guardar la categoría.");
    }
}

async function populateCategoryForm(categoryId) {
    const docRef = doc(db, `comercios/${currentComercioId}/categories`, categoryId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('categoryId').value = docSnap.id;
        document.getElementById('categoryName').value = data.name;
        document.getElementById('categoryOrder').value = data.order;
    }
}

async function deleteCategory(categoryId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
        try {
            await deleteDoc(doc(db, `comercios/${currentComercioId}/categories`, categoryId));
            showMessage("Éxito", "Categoría eliminada.");
            loadManagedCategories(currentComercioId);
            loadCategoriesForSelection(currentComercioId);
        } catch (error) {
            console.error("Error al eliminar categoría:", error);
            showMessage("Error", "No se pudo eliminar la categoría.");
        }
    }
}

function resetCategoryForm() {
    categoryForm.reset();
    document.getElementById('categoryId').value = '';
}

// --- AÑADE O MODIFICA ESTA FUNCIÓN PARA EXPORTARLA ---
// Ahora acepta comercioId para saber de dónde leer las categorías.
export async function getAllCategories(comercioId) {
    // Si no se proporciona un comercioId, no podemos cargar categorías.
    if (!comercioId) {
        console.warn("Se intentó cargar categorías sin un comercioId.");
        return [];
    }

    try {
        // --- RUTA CORREGIDA ---
        // Construimos la ruta a la subcolección de categorías del comercio.
        const categoriesPath = `comercios/${comercioId}/categories`;
        const q = query(collection(db, categoriesPath), orderBy("name", "asc"));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return [];
        }
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error(`Error al obtener categorías para el comercio ${comercioId}:`, error);
        return []; // Devuelve un array vacío en caso de error
    }
}