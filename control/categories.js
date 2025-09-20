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
    addNewCategoryBtn.addEventListener('click', () => openCategoryModal());

    // Modal elements (assuming a generic modal structure in your index.html)
    categoryModal = document.getElementById('categoryModal'); // You will need to add this modal to your HTML
    categoryForm = document.getElementById('categoryForm');
    categoryFormTitle = document.getElementById('categoryFormTitle');
    closeModalBtn = categoryModal.querySelector('.close-button'); // Standard close button
    cancelCategoryEdit = document.getElementById('cancelCategoryEdit');

    // Modal event listeners
    categoryForm.addEventListener('submit', saveCategory);
    closeModalBtn.addEventListener('click', () => closeCategoryModal());
    cancelCategoryEdit.addEventListener('click', () => closeCategoryModal());
    window.addEventListener('click', (event) => { // Close modal if clicking outside
        if (event.target == categoryModal) {
            closeCategoryModal();
        }
    });
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

        // Crear la estructura de la tabla
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Nombre de la Categoría</th>
                    <th>Orden</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${snapshot.docs.map(doc => {
                    const data = doc.data();
                    return `
                        <tr>
                            <td>${data.name}</td>
                            <td>${data.order}</td>
                            <td class="actions-cell">
                                <button class="edit-category" data-id="${doc.id}">Editar</button>
                                <button class="delete-category delete" data-id="${doc.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;

        categoriesTableContainer.innerHTML = '';
        categoriesTableContainer.appendChild(table);

        // Añadir event listeners para los nuevos botones de la tabla
        table.querySelectorAll('.edit-category').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que se dispare el click de la fila
                openCategoryModal(e.target.dataset.id);
            });
        });
        table.querySelectorAll('.delete-category').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCategory(e.target.dataset.id);
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