import { db } from './firebase-config.js';
import { showMessage, previewImage, previewImages } from './ui.js';
import { loadCategoriesForSelection, loadManagedCategories } from './categories.js';
import { loadProducts } from './products.js';
import { loadFinanceData } from './finanzas.js';
import { getUserPermissions } from './auth.js';

// --- ¡NUEVO! Importaciones para Firebase v9+ ---
import { collection, getDocs, orderBy, query, doc, getDoc, updateDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let currentComercioId = null;
let selectComercio, comercioForm, cancelComercioEdit, currentComercioInfo, comercioActions;
let comercioListView, comercioFormView, addNewComercioButton, comerciosTableContainer, comercioFormTitle;

export function getCurrentComercioId() {
    return currentComercioId;
}

// Función para cambiar entre la vista de lista y la de formulario
function showComercioView(view) {
    if (view === 'form') {
        comercioListView.style.display = 'none';
        comercioFormView.style.display = 'block';
    } else { // 'list'
        comercioListView.style.display = 'block';
        comercioFormView.style.display = 'none';
    }
}

export function initComercioFeatures() {
    // Elementos del DOM del Header
    selectComercio = document.getElementById('selectComercio');
    currentComercioInfo = document.getElementById('currentComercioInfo');
    comercioActions = document.getElementById('comercioActions');
    
    // Elementos del DOM de la pestaña "Comercio"
    comercioListView = document.getElementById('comercioListView');
    comercioFormView = document.getElementById('comercioFormView');
    addNewComercioButton = document.getElementById('addNewComercioButton');
    comerciosTableContainer = document.getElementById('comerciosTableContainer');
    comercioFormTitle = document.getElementById('comercioFormTitle');
    comercioForm = document.getElementById('comercioForm');
    cancelComercioEdit = document.getElementById('cancelComercioEdit');

    // Event Listeners
    // --- CORRECCIÓN: Añadir comprobaciones de existencia antes de añadir listeners ---
    if (selectComercio) {
        selectComercio.addEventListener('change', handleComercioSelection);
    }

    if (comercioForm) {
        comercioForm.addEventListener('submit', saveComercio);
    }
    
    if (addNewComercioButton) {
        addNewComercioButton.addEventListener('click', () => {
            resetComercioForm();
            comercioFormTitle.textContent = 'Añadir Nuevo Comercio';
            showComercioView('form');
        });
    }

    if (cancelComercioEdit) {
        cancelComercioEdit.addEventListener('click', () => {
            resetComercioForm();
            showComercioView('list');
        });
    }
}

export async function loadComercios() {
    try {
        // --- SINTAXIS v9 ---
        const q = query(collection(db, 'comercios'), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        const allComercios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // --- 2. Lógica de filtrado basada en permisos ---
        const permissions = getUserPermissions();
        let accessibleComercios = [];

        if (permissions) {
            if (permissions.accessAllComercios) {
                // El super admin ve todos los comercios que están marcados como visibles
                accessibleComercios = allComercios.filter(c => c.showInSite === true);
            } else {
                // El usuario normal solo ve los comercios de su lista que también estén visibles
                const allowedIds = permissions.allowedComercios || [];
                accessibleComercios = allComercios.filter(c => 
                    c.showInSite === true && allowedIds.includes(c.id)
                );
            }
        }
        
        // 3. Poblar el <select> con la lista filtrada
        selectComercio.innerHTML = '<option value="">-- Seleccione --</option>';
        accessibleComercios.forEach(comercio => {
            const option = document.createElement('option');
            option.value = comercio.id;
            option.textContent = comercio.name;
            selectComercio.appendChild(option);
        });
        
        // Restaurar selección si existe
        if (currentComercioId) {
            selectComercio.value = currentComercioId;
        }

        // --- LÓGICA CORREGIDA ---
        // Si hay comercios y no hay ninguno seleccionado, selecciona el primero por defecto.
        if (accessibleComercios.length > 0 && !selectComercio.value) {
            selectComercio.selectedIndex = 1; // El índice 0 es el placeholder "-- Seleccione --"
        }
        // Si después de todo, hay un comercio seleccionado, disparamos el evento 'change' para asegurar la carga de datos.
        if (selectComercio.value) {
             selectComercio.dispatchEvent(new Event('change'));
        }

        // Renderizar la tabla en la pestaña "Comercios" (siempre con todos los comercios para gestión)
        renderComerciosTable(allComercios);

    } catch (error) {
        console.error("Error al cargar comercios:", error);
        showMessage("Error", "No se pudieron cargar los comercios.");
    }
}

function renderComerciosTable(comercios) {
    if (!comerciosTableContainer) return;
    if (comercios.length === 0) {
        comerciosTableContainer.innerHTML = '<p>No hay comercios para mostrar. ¡Añade uno nuevo!</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr><th>Nombre</th><th>Orden</th><th>Visible</th><th>Acciones</th></tr>
        </thead>
        <tbody>
            ${comercios.map(comercio => `
                <tr>
                    <td>${comercio.name}</td>
                    <td>${comercio.order}</td>
                    <td>${comercio.showInSite ? 'Sí' : 'No'}</td>
                    <td class="actions-cell">
                        <button class="edit-comercio" data-id="${comercio.id}">Editar</button>
                        <button class="delete-comercio delete" data-id="${comercio.id}">Eliminar</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;

    comerciosTableContainer.innerHTML = '';
    comerciosTableContainer.appendChild(table);

    // Añadir event listeners para los nuevos botones de la tabla
    table.querySelectorAll('.edit-comercio').forEach(button => {
        button.addEventListener('click', (e) => editComercioFromTable(e.target.dataset.id));
    });
    table.querySelectorAll('.delete-comercio').forEach(button => {
        button.addEventListener('click', (e) => deleteCurrentComercio(e.target.dataset.id));
    });
}

async function handleComercioSelection() {
    currentComercioId = selectComercio.value;
    
    // Verificamos si el elemento existe antes de modificarlo para más seguridad
    if (comercioActions) {
        comercioActions.innerHTML = '';
    }

    if (currentComercioId) {
        if (currentComercioInfo) {
            currentComercioInfo.textContent = `Editando: ${selectComercio.options[selectComercio.selectedIndex].text}`;
        }
        // Carga los datos de las diferentes pestañas en paralelo para mayor eficiencia.
        await Promise.all([
            loadProducts(currentComercioId),
            loadManagedCategories(currentComercioId),
            loadFinanceData(currentComercioId)
        ]);
        await loadCategoriesForSelection(currentComercioId); // Necesario para los formularios de producto
    } else {
        if (currentComercioInfo) {
            currentComercioInfo.textContent = '';
        }
        const productsList = document.getElementById('productsList');
        if (productsList) {
            productsList.innerHTML = '<p>Selecciona un comercio para ver sus productos.</p>';
        }
        
        // --- ESTA ES LA CORRECCIÓN ---
        // Cambiamos 'categoriesList' por 'categoriesTableContainer'
        const categoriesContainer = document.getElementById('categoriesTableContainer');
        if (categoriesContainer) {
            categoriesContainer.innerHTML = '<p>Selecciona un comercio para ver sus categorías.</p>';
        }
    }
}

async function editComercioFromTable(id) {
    try {
        // --- SINTAXIS v9 ---
        const docRef = doc(db, 'comercios', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // --- CORRECCIÓN: Usar los nombres de campo correctos (camelCase) ---
            document.getElementById('comercioId').value = docSnap.id;
            document.getElementById('comercioName').value = data.name || '';
            document.getElementById('comercioOrder').value = data.order || 999;
            document.getElementById('comercioShortDescription').value = data.shortDescription || '';
            document.getElementById('comercioSchedule').value = data.schedule || '';
            document.getElementById('comercioPhoneNumber').value = data.phoneNumber || '';
            document.getElementById('comercioWebsite').value = data.website || '';
            document.getElementById('comercioExternalLink').value = data.externalLink || '';
            document.getElementById('comercioGoogleMapsLocation').value = data.googleMapsLocation || '';
            document.getElementById('comercioFullDescription').value = data.fullDescription || '';
            document.getElementById('comercioMainImage').value = data.mainImage || '';
            document.getElementById('comercioAdditionalPhotos').value = (data.additionalPhotos || []).join(', ');
            document.getElementById('showInSite').checked = data.showInSite || false;

            previewImage(data.mainImage, 'mainImagePreview');
            previewImages(data.additionalPhotos || [], 'additionalPhotosPreview');
            
            comercioFormTitle.textContent = `Editando: ${data.name}`;
            showComercioView('form');
        }
    } catch (error) {
        console.error("Error al cargar datos del comercio:", error);
        showMessage("Error", "No se pudieron cargar los datos para editar.");
    }
}

async function deleteCurrentComercio(id) {
    if (!id) return;
    if (confirm('¿Estás seguro de que quieres eliminar este comercio y todos sus datos asociados?')) {
        try {
            // --- SINTAXIS v9 ---
            await deleteDoc(doc(db, 'comercios', id));
            showMessage("Éxito", "Comercio eliminado correctamente.");
            
            if (currentComercioId === id) {
                currentComercioId = null;
                currentComercioInfo.textContent = '';
                comercioActions.innerHTML = '';
                document.getElementById('productsList').innerHTML = '';
                document.getElementById('categoriesList').innerHTML = '';
            }

            loadComercios();
            showComercioView('list');
        } catch (error) {
            console.error("Error al eliminar el comercio:", error);
            showMessage("Error", "No se pudo eliminar el comercio.");
        }
    }
}

async function saveComercio(e) {
    e.preventDefault();
    const id = document.getElementById('comercioId').value;
    // --- CORRECCIÓN: Usar los nombres de campo correctos (camelCase) al guardar ---
    const comercioData = {
        name: document.getElementById('comercioName').value,
        order: parseInt(document.getElementById('comercioOrder').value, 10),
        shortDescription: document.getElementById('comercioShortDescription').value,
        schedule: document.getElementById('comercioSchedule').value,
        phoneNumber: document.getElementById('comercioPhoneNumber').value,
        website: document.getElementById('comercioWebsite').value,
        externalLink: document.getElementById('comercioExternalLink').value,
        googleMapsLocation: document.getElementById('comercioGoogleMapsLocation').value,
        fullDescription: document.getElementById('comercioFullDescription').value,
        mainImage: document.getElementById('comercioMainImage').value,
        additionalPhotos: document.getElementById('comercioAdditionalPhotos').value.split(',').map(url => url.trim()).filter(url => url),
        showInSite: document.getElementById('showInSite').checked,
    };

    try {
        if (id) {
            // --- SINTAXIS v9 ---
            await updateDoc(doc(db, 'comercios', id), comercioData);
            showMessage("Éxito", "Comercio actualizado correctamente.");
        } else {
            // --- SINTAXIS v9 ---
            await addDoc(collection(db, 'comercios'), comercioData);
            showMessage("Éxito", "Comercio añadido correctamente.");
        }
        await loadComercios();
        resetComercioForm();
        showComercioView('list');
    } catch (error) {
        console.error("Error al guardar el comercio:", error);
        showMessage("Error", "No se pudo guardar el comercio.");
    }
}

function resetComercioForm() {
    comercioForm.reset();
    document.getElementById('comercioId').value = '';
    previewImage('', 'mainImagePreview');
    previewImages([], 'additionalPhotosPreview');
}