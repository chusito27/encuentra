const firebaseConfig = {
    apiKey: "AIzaSyAHr8NSBkLN_Jt062C4RtYFiulFC13tOLA",
    authDomain: "web2727.firebaseapp.com",
    projectId: "web2727",
    storageBucket: "web2727.firebasestorage.app",
    messagingSenderId: "899729264501",
    appId: "1:899729264501:web:e81099f4c1e7ba52ef4d3c",
    measurementId: "G-VE3F22HX79"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); // Inicializa Firebase Auth

// ** Global Variable for Current Comercio **
let currentComercioId = null;
let currentComercioName = null;
let allComercios = []; // To store all fetched comercios
let currentUser = null; // Variable para almacenar el usuario autenticado

// ** Firebase Collections (Dynamic based on currentComercioId) **
const comerciosCollection = db.collection('comercios');
const allowedUsersCollection = db.collection('allowedUsers'); // Nueva: Colección para usuarios permitidos

// Functions to get dynamic subcollection references
function getProductsCollection() {
    if (!currentComercioId) {
        console.error("Error: No hay comercio seleccionado.");
        return null;
    }
    return comerciosCollection.doc(currentComercioId).collection('products');
}

function getCategoriesCollection() {
    if (!currentComercioId) {
        console.error("Error: No hay comercio seleccionado.");
        return null;
    }
    return comerciosCollection.doc(currentComercioId).collection('categories');
}


// DOM Elements for Modals and Forms
const openAddProductModalButton = document.getElementById('openAddProductModal');
const addProductModal = document.getElementById('addProductModal');
const addProductForm = document.getElementById('addProductForm');
const newProductNameInput = document.getElementById('newProductName');
const newProductPriceInput = document.getElementById('newProductPrice');
const newProductOldPriceInput = document.getElementById('newProductOldPrice');
const newProductImageInput = document.getElementById('newProductImage');
const newProductDetailsInput = document.getElementById('newProductDetails');
const newIsVeganInput = document.getElementById('newIsVegan');
const newIsVegetarianInput = document.getElementById('newIsVegetarian');
const newIsGlutenFreeInput = document.getElementById('newIsGlutenFree');
const newProductDietaryInfoInput = document.getElementById('newProductDietaryInfo');
const newProductCategoriesSelect = document.getElementById('newProductCategories');
const newProductOrderInput = document.getElementById('newProductOrder');


const editProductModal = document.getElementById('editProductModal');
const editProductForm = document.getElementById('editProductForm');
const editProductIdInput = document.getElementById('editProductId'); // Hidden field for Firebase Doc ID
const editProductNameInput = document.getElementById('editProductName');
const editProductPriceInput = document.getElementById('editProductPrice');
const editProductOldPriceInput = document.getElementById('editProductOldPrice');
const editProductImageInput = document.getElementById('editProductImage');
const editProductDetailsInput = document.getElementById('editProductDetails');
const editIsVeganInput = document.getElementById('editIsVegan');
const editIsVegetarianInput = document.getElementById('editIsVegetarian');
const editIsGlutenFreeInput = document.getElementById('editIsGlutenFree');
const editProductDietaryInfoInput = document.getElementById('editProductDietaryInfo');
const editProductCategoriesSelect = document.getElementById('editProductCategories');
const editProductOrderInput = document.getElementById('editProductOrder');


const productsListDiv = document.getElementById('productsList');

// Category Management elements
const categoryForm = document.getElementById('categoryForm');
const categoryIdInput = document.getElementById('categoryId');
const categoryNameInput = document.getElementById('categoryName');
const cancelCategoryEditButton = document.getElementById('cancelCategoryEdit');
const categoriesListDiv = document.getElementById('categoriesList');

// New Category Modal elements
const openAddCategoryFromProductTabModalButton = document.getElementById('openAddCategoryFromProductTabModal');
const addCategoryModal = document.getElementById('addCategoryModal');
const addCategoryForm = document.getElementById('addCategoryForm');
const newCategoryNameInput = document.getElementById('newCategoryName');

// ** Comercio DOM Elements **
const comercioForm = document.getElementById('comercioForm');
const comercioIdInput = document.getElementById('comercioId');
const comercioNameInput = document.getElementById('comercioName');
const comercioShortDescriptionInput = document.getElementById('comercioShortDescription');
const comercioFullDescriptionInput = document.getElementById('comercioFullDescription');
const comercioScheduleInput = document.getElementById('comercioSchedule');
const comercioOrderInput = document.getElementById('comercioOrder'); // Nuevo campo de orden
const comercioExternalLinkInput = document.getElementById('comercioExternalLink'); // Nuevo campo de enlace externo
const comercioMainImageInput = document.getElementById('comercioMainImage');
const comercioAdditionalPhotosInput = document.getElementById('comercioAdditionalPhotos');
const comercioGoogleMapsLocationInput = document.getElementById('comercioGoogleMapsLocation');
const comercioPhoneNumberInput = document.getElementById('comercioPhoneNumber');
const comercioWebsiteInput = document.getElementById('comercioWebsite');
const showInSiteCheckbox = document.getElementById('showInSite'); // Nuevo checkbox
const cancelComercioEditButton = document.getElementById('cancelComercioEdit');
const mainImagePreviewDiv = document.getElementById('mainImagePreview');
const additionalPhotosPreviewDiv = document.getElementById('additionalPhotosPreview');
const comercioActionsDiv = document.getElementById('comercioActions');

const selectComercio = document.getElementById('selectComercio');
const currentComercioInfoDiv = document.getElementById('currentComercioInfo');

// ** Auth DOM Elements **
const authModal = document.getElementById('authModal');
const authModalTitle = document.getElementById('authModalTitle');
const authForm = document.getElementById('authForm');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const signInButton = document.getElementById('signInButton');
const signUpButton = document.getElementById('signUpButton');
const authErrorDisplay = document.getElementById('authError');
const openAuthModalButton = document.getElementById('openAuthModalButton');
const signOutButton = document.getElementById('signOutButton');

// ** Message Modal Elements **
const messageModal = document.getElementById('messageModal');
const messageModalTitle = document.getElementById('messageModalTitle');
const messageModalText = document.getElementById('messageModalText');


let allCategories = []; // To store categories for the product form select

// --- MODAL UTILITY FUNCTIONS ---
function openModal(modalElement) {
    modalElement.style.display = 'flex';
}

function closeModal(modalElement) {
    modalElement.style.display = 'none';
}

// Custom function to display messages, replacing alert()
function showMessage(title, message) {
    messageModalTitle.textContent = title;
    messageModalText.textContent = message;
    openModal(messageModal);
}

// Close modal if clicked outside of content
window.addEventListener('click', (event) => {
    if (event.target === addProductModal) {
        closeModal(addProductModal);
    }
    if (event.target === editProductModal) {
        closeModal(editProductModal);
    }
    if (event.target === addCategoryModal) {
        closeModal(addCategoryModal);
    }
    if (event.target === authModal) { // Close auth modal
        closeModal(authModal);
    }
    if (event.target === messageModal) { // Close message modal
        closeModal(messageModal);
    }
});

// Close buttons for modals
document.querySelectorAll('.close-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const modalId = e.target.dataset.modal;
        closeModal(document.getElementById(modalId));
    });
});

document.querySelectorAll('.modal .cancel').forEach(button => {
    button.addEventListener('click', (e) => {
        const modalId = e.target.dataset.modal;
        closeModal(document.getElementById(modalId));
        // Optionally reset the form on cancel
        if (modalId === 'addProductModal') addProductForm.reset();
        if (modalId === 'editProductModal') editProductForm.reset();
        if (modalId === 'addCategoryModal') addCategoryForm.reset();
        if (modalId === 'authModal') authForm.reset(); // Reset auth form
    });
});


// --- TAB FUNCTIONALITY ---
async function openTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    const tabButtons = document.querySelectorAll('.sidebar-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.sidebar-button[onclick="openTab('${tabId}')"]`).classList.add('active');

    // Logic based on authentication state and user authorization
    if (!currentUser && !['inicio', 'comercio-gestion'].includes(tabId)) {
        // Si no está autenticado y tratando de acceder a una pestaña restringida, redirigir a inicio
        showMessage('Acceso Denegado', 'Necesita iniciar sesión para acceder a esta sección.');
        openTab('inicio'); // Redirigir a una pestaña "segura"
        return; // Salir de la función para evitar cargar datos para la pestaña restringida
    }

    // Specific logic for each tab
    if (tabId === 'inicio') {
        // No specific data to load, just show the welcome message
    } else if (tabId === 'comercio-gestion') {
        await fetchComercios(); // Fetch comercios when this tab is opened
    } else if (tabId === 'products') {
        if (currentComercioId) {
            await fetchProducts();
        } else {
            productsListDiv.innerHTML = '<p>Seleccione un comercio para ver sus productos.</p>';
        }
    } else if (tabId === 'categories') {
        if (currentComercioId) {
            await fetchCategories();
        } else {
            categoriesListDiv.innerHTML = '<p>Seleccione un comercio para ver sus categorías.</p>';
        }
    } else if (tabId === 'usuarios') {
        // Lógica para cargar usuarios en el futuro
        console.log("Abriendo pestaña de gestión de usuarios.");
    }
}

// --- FETCH AND RENDER FUNCTIONS (Comercios) ---

async function fetchComercios() {
    // Check if authenticated. If not, clear lists and return early.
    if (!currentUser) {
        selectComercio.innerHTML = '<option value="">-- Inicie sesión --</option>';
        currentComercioInfoDiv.innerHTML = '';
        comercioActionsDiv.innerHTML = ''; // Clear action buttons
        currentComercioId = null;
        currentComercioName = null;
        allComercios = [];
        productsListDiv.innerHTML = '<p>Necesita iniciar sesión para gestionar productos.</p>';
        categoriesListDiv.innerHTML = '<p>Necesita iniciar sesión para gestionar categorías.</p>';
        return;
    }

    try {
        const snapshot = await comerciosCollection.orderBy('name', 'asc').get();
        allComercios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateComercioSelect(allComercios);
        
        // Set the current selected comercio based on previous selection or first available
        if (currentComercioId && allComercios.some(c => c.id === currentComercioId)) {
            selectComercio.value = currentComercioId;
            const selectedComercio = allComercios.find(c => c.id === currentComercioId);
            updateComercioForm(selectedComercio);
        } else if (allComercios.length > 0) {
            // No specific comercio selected, maybe select the first one?
            // For now, we just populate the dropdown. The user can select one.
            updateComercioForm(null);
        } else {
            updateComercioForm(null);
        }

        // Re-fetch data for the active tab AFTER the currentComercioId is set
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id !== 'comercio-gestion') { // Only if not on the comercio management tab itself
            await openTab(activeTab.id); 
        } else if (activeTab && activeTab.id === 'comercio-gestion' && !currentComercioId) {
            updateComercioForm(null);
        }

    } catch (error) {
        console.error("Error fetching comercios: ", error);
        showMessage('Error de Carga', 'Error al cargar los comercios. Asegúrese de que las reglas de seguridad de Firestore permitan leer la colección "comercios".');
    }
}


function populateComercioSelect(comercios) {
    const previouslySelected = selectComercio.value;
    selectComercio.innerHTML = '<option value="">-- Seleccione un Comercio --</option>';
    comercios.forEach(comercio => {
        const option = document.createElement('option');
        option.value = comercio.id;
        option.textContent = comercio.name;
        selectComercio.appendChild(option);
    });
    // Restore previous selection if it still exists
    if (comercios.some(c => c.id === previouslySelected)) {
        selectComercio.value = previouslySelected;
    }
}

selectComercio.addEventListener('change', async (e) => {
    currentComercioId = e.target.value;
    const selectedComercio = allComercios.find(c => c.id === currentComercioId);
    currentComercioName = selectedComercio ? selectedComercio.name : null;
    updateCurrentComercioInfo(currentComercioId);
    updateComercioForm(selectedComercio);

    // Re-fetch data for the currently active tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        await openTab(activeTab.id); // Re-trigger tab logic to load data for new comercio
    }
});

function updateCurrentComercioInfo(comercioId) {
    currentComercioInfoDiv.innerHTML = '';
    comercioActionsDiv.innerHTML = ''; // Clear existing buttons
    if (comercioId) {
        const comercio = allComercios.find(c => c.id === comercioId);
        if (comercio) {
            currentComercioInfoDiv.innerHTML = `<strong>Actual:</strong> ${comercio.name}`;
            // Add Edit and Delete buttons for the selected comercio
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.className = 'edit';
            editBtn.onclick = () => {
                openTab('comercio-gestion');
                editComercio(comercio.id);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.className = 'delete';
            deleteBtn.onclick = () => deleteComercio(comercio.id);
            
            comercioActionsDiv.appendChild(editBtn);
            comercioActionsDiv.appendChild(deleteBtn);
        }
    } else {
        currentComercioInfoDiv.innerHTML = 'No hay comercio seleccionado.';
    }
}

function updateComercioForm(comercio) {
    if (comercio) {
        comercioIdInput.value = comercio.id || '';
        comercioNameInput.value = comercio.name || '';
        comercioShortDescriptionInput.value = comercio.shortDescription || '';
        comercioFullDescriptionInput.value = comercio.fullDescription || '';
        comercioScheduleInput.value = comercio.schedule || '';
        comercioOrderInput.value = comercio.order || '999';
        comercioExternalLinkInput.value = comercio.externalLink || '';
        comercioMainImageInput.value = comercio.mainImage || '';
        comercioAdditionalPhotosInput.value = (comercio.additionalPhotos || []).join(', ');
        comercioGoogleMapsLocationInput.value = comercio.googleMapsLocation || '';
        comercioPhoneNumberInput.value = comercio.phoneNumber || '';
        comercioWebsiteInput.value = comercio.website || '';
        showInSiteCheckbox.checked = comercio.showInSite || false; // Set checkbox state

        updateImagePreview(comercio.mainImage, mainImagePreviewDiv);
        updateImagePreview(comercio.additionalPhotos, additionalPhotosPreviewDiv);
    } else {
        comercioForm.reset();
        comercioIdInput.value = '';
        mainImagePreviewDiv.innerHTML = '';
        additionalPhotosPreviewDiv.innerHTML = '';
        showInSiteCheckbox.checked = false; // Set default value on reset
    }
}


// --- CRUD Operations for Comercios ---

comercioForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check if authenticated and authorized
    if (!currentUser) {
        showMessage('Acceso Denegado', 'Necesita iniciar sesión para guardar un comercio.');
        openModal(authModal); // Abre el modal de autenticación
        return;
    }
    const isAuthorized = await allowedUsersCollection.doc(currentUser.uid).get();
    if (!isAuthorized.exists) {
        showMessage('Acceso Denegado', 'Su cuenta no está autorizada para realizar esta acción.');
        return;
    }

    const id = comercioIdInput.value;
    const name = comercioNameInput.value.trim();
    const shortDescription = comercioShortDescriptionInput.value.trim();
    const fullDescription = comercioFullDescriptionInput.value.trim();
    const schedule = comercioScheduleInput.value.trim();
    const order = parseInt(comercioOrderInput.value, 10);
    const externalLink = comercioExternalLinkInput.value.trim();
    const mainImage = comercioMainImageInput.value.trim();
    const additionalPhotos = comercioAdditionalPhotosInput.value.split(',').map(url => url.trim()).filter(url => url);
    const googleMapsLocation = comercioGoogleMapsLocationInput.value.trim();
    const phoneNumber = comercioPhoneNumberInput.value.trim();
    const website = comercioWebsiteInput.value.trim();
    const showInSite = showInSiteCheckbox.checked; // Get the checkbox value

    if (!name) {
        showMessage('Error', 'El nombre del comercio no puede estar vacío.');
        return;
    }

    const comercioData = { 
        name,
        shortDescription,
        fullDescription,
        schedule,
        order,
        externalLink,
        mainImage,
        additionalPhotos,
        googleMapsLocation,
        phoneNumber,
        website,
        showInSite // Add the new field
    };

    try {
        if (id) {
            await comerciosCollection.doc(id).update(comercioData);
            showMessage('Éxito', 'Comercio actualizado con éxito!');
        } else {
            const docRef = await comerciosCollection.add(comercioData);
            showMessage('Éxito', `Comercio "${name}" añadido con éxito!`);
            currentComercioId = docRef.id; // Set the new comercio as the current one
        }
        comercioForm.reset();
        comercioIdInput.value = '';
        mainImagePreviewDiv.innerHTML = '';
        additionalPhotosPreviewDiv.innerHTML = '';
        showInSiteCheckbox.checked = false; // Reset default value
        await fetchComercios(); // Re-fetch comercios to update lists and select
    } catch (error) {
        console.error("Error saving comercio: ", error);
        showMessage('Error al Guardar', 'Error al guardar el comercio. Asegúrese de tener permisos de escritura y autorización.');
    }
});

async function editComercio(id) {
    // Check if authenticated and authorized
    if (!currentUser) {
        showMessage('Acceso Denegado', 'Necesita iniciar sesión para editar un comercio.');
        openModal(authModal);
        return;
    }
    const isAuthorized = await allowedUsersCollection.doc(currentUser.uid).get();
    if (!isAuthorized.exists) {
        showMessage('Acceso Denegado', 'Su cuenta no está autorizada para realizar esta acción.');
        return;
    }

    try {
        const doc = await comerciosCollection.doc(id).get();
        if (doc.exists) {
            const comercio = { id: doc.id, ...doc.data() };
            updateComercioForm(comercio);
            selectComercio.value = id; // Sync dropdown
            updateCurrentComercioInfo(id);
            showMessage('Información', `El formulario ha sido cargado con los datos de "${comercio.name}" para su edición.`);
        }
    } catch (error) {
        console.error("Error fetching comercio for edit: ", error);
        showMessage('Error de Carga', "Error al cargar el comercio para editar. Asegúrese de tener permisos de lectura y autorización.");
    }
};

// Función para añadir un nuevo comercio (reinicia el formulario)
function addNewComercio() {
    comercioForm.reset();
    comercioIdInput.value = '';
    mainImagePreviewDiv.innerHTML = '';
    additionalPhotosPreviewDiv.innerHTML = '';
    showInSiteCheckbox.checked = false; // Reset default value
    // Deseleccionar el `<select>`
    selectComercio.value = '';
    updateCurrentComercioInfo(null);
    console.log('Formulario listo para añadir un nuevo comercio.');
}

async function deleteComercio(id) {
    // Check if authenticated and authorized
    if (!currentUser) {
        showMessage('Acceso Denegado', 'Necesita iniciar sesión para eliminar un comercio.');
        openModal(authModal);
        return;
    }
    const isAuthorized = await allowedUsersCollection.doc(currentUser.uid).get();
    if (!isAuthorized.exists) {
        showMessage('Acceso Denegado', 'Su cuenta no está autorizada para realizar esta acción.');
        return;
    }

    // Using custom confirmation instead of window.confirm
    if (confirm('¿Está seguro de que desea eliminar este comercio? Esta acción no se puede deshacer.')) {
        try {
            await comerciosCollection.doc(id).delete();
            showMessage('Éxito', 'Comercio eliminado con éxito.');
            currentComercioId = null; // Reset current comercio
            await fetchComercios();
        } catch (error) {
            console.error("Error deleting comercio: ", error);
            showMessage('Error al Eliminar', 'Error al eliminar el comercio. Asegúrese de tener permisos de eliminación y autorización.');
        }
    }
}

cancelComercioEditButton.addEventListener('click', () => {
    comercioForm.reset();
    comercioIdInput.value = '';
    mainImagePreviewDiv.innerHTML = '';
    additionalPhotosPreviewDiv.innerHTML = '';
    showInSiteCheckbox.checked = false; // Reset default value
});

// Helper to update image previews
function updateImagePreview(urlOrArray, container) {
    container.innerHTML = '';
    let urls = [];
    if (typeof urlOrArray === 'string' && urlOrArray) {
        urls = [urlOrArray];
    } else if (Array.isArray(urlOrArray)) {
        urls = urlOrArray;
    }

    urls.forEach(url => {
        if (url) {
            const img = document.createElement('img');
            img.src = url;
            container.appendChild(img);
        }
    });
}

// Event listeners for image preview
comercioMainImageInput.addEventListener('input', (e) => {
    const url = e.target.value;
    updateImagePreview(url, mainImagePreviewDiv);
});

comercioAdditionalPhotosInput.addEventListener('input', (e) => {
    const urls = e.target.value.split(',').map(url => url.trim());
    updateImagePreview(urls, additionalPhotosPreviewDiv);
});


// --- FETCH AND RENDER FUNCTIONS (Products) ---

async function fetchProducts() {
    // Check if authenticated (rules will also enforce this)
    if (!currentUser) { 
        productsListDiv.innerHTML = '<p>Necesita iniciar sesión para gestionar productos.</p>';
        return;
    }

    const productsColRef = getProductsCollection();
    if (!productsColRef) {
        productsListDiv.innerHTML = '<p>Seleccione un comercio para gestionar sus productos.</p>';
        return;
    }

    try {
        await fetchCategories(); // Ensure categories are loaded for product rendering
        const snapshot = await productsColRef.orderBy('order', 'asc').get();
        const products = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        renderProducts(products);
    } catch (error) {
        console.error("Error fetching products: ", error);
        productsListDiv.innerHTML = '<p>Error al cargar los productos de este comercio. Asegúrese de que sus reglas de seguridad permitan leer los productos.</p>';
    }
}

async function fetchCategories() {
    // Check if authenticated (rules will also enforce this)
    if (!currentUser) {
        categoriesListDiv.innerHTML = '<p>Necesita iniciar sesión para gestionar categorías.</p>';
        if(newProductCategoriesSelect) newProductCategoriesSelect.innerHTML = '';
        if(editProductCategoriesSelect) editProductCategoriesSelect.innerHTML = '';
        return;
    }

    const categoriesColRef = getCategoriesCollection();
    if (!categoriesColRef) {
        categoriesListDiv.innerHTML = '<p>Seleccione un comercio para gestionar sus categorías.</p>';
        // Clear categories in product modals if no comercio is selected
        if(newProductCategoriesSelect) newProductCategoriesSelect.innerHTML = '';
        if(editProductCategoriesSelect) editProductCategoriesSelect.innerHTML = '';
        return;
    }

    try {
        const snapshot = await categoriesColRef.get();
        allCategories = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        // Populate categories for product forms (both add and edit)
        if(newProductCategoriesSelect) renderCategoriesForProductForm(allCategories, newProductCategoriesSelect);
        if(editProductCategoriesSelect) renderCategoriesForProductForm(allCategories, editProductCategoriesSelect);

        // Populate categories for the management tab
        renderCategoriesForManagement(allCategories);
    }
    catch (error) {
        console.error("Error fetching categories: ", error);
        categoriesListDiv.innerHTML = '<p>Error al cargar las categorías de este comercio. Asegúrese de que sus reglas de seguridad permitan leer las categorías.</p>';
        if(newProductCategoriesSelect) newProductCategoriesSelect.innerHTML = '';
        if(editProductCategoriesSelect) editProductCategoriesSelect.innerHTML = '';
    }
}

function renderProducts(products) {
    productsListDiv.innerHTML = '';
    if (products.length === 0) {
        productsListDiv.innerHTML = '<p>No hay productos disponibles para este comercio.</p>';
        return;
    }
    products.forEach(product => {
        // Use the default image if product.image is empty or null
        const imageUrl = product.image || 'https://i.postimg.cc/vZQnpBpT/logo.png';
        const productCard = document.createElement('div');
        productCard.className = 'card';
        productCard.innerHTML = `
            <img src="${imageUrl}" alt="${product.name}" class="card-image">
            <div class="card-content">
                <h3>${product.name}</h3>
                <p class="price">$${product.price.toFixed(2)}</p>
                <p>${product.details || ''}</p>
            </div>
            <div class="card-actions">
                <button class="edit" data-firebase-id="${product.firebaseId}">Editar</button>
                <button class="delete" data-firebase-id="${product.firebaseId}">Eliminar</button>
            </div>
        `;
        productsListDiv.appendChild(productCard);
    });

    document.querySelectorAll('.card-actions .edit').forEach(button => {
        button.addEventListener('click', (e) => editProduct(e.target.dataset.firebaseId));
    });
    document.querySelectorAll('.card-actions .delete').forEach(button => {
        button.addEventListener('click', (e) => deleteProduct(e.target.dataset.firebaseId));
    });
}

function renderCategoriesForProductForm(categories, selectElement) {
    selectElement.innerHTML = '';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name; // Use name as value for display purposes
        option.textContent = category.name;
        selectElement.appendChild(option);
    });
}

function renderCategoriesForManagement(categories) {
    categoriesListDiv.innerHTML = '';
    if (categories.length === 0) {
        categoriesListDiv.innerHTML = '<p>No hay categorías disponibles para este comercio.</p>';
        return;
    }
    categories.forEach(category => {
        const categoryItem = document.createElement('span');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            ${category.name}
            <button class="delete-category" data-id="${category.id}">&times;</button>
        `;
        categoriesListDiv.appendChild(categoryItem);
    });

    document.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', (e) => deleteCategory(e.target.dataset.id));
    });
}

// --- PRODUCT CRUD OPERATIONS (Using Modals) ---

// Open Add Product Modal
if(openAddProductModalButton) {
    openAddProductModalButton.addEventListener('click', async () => {
        if (!currentUser) { // Check authentication
            showMessage('Acceso Denegado', 'Necesita iniciar sesión para añadir un producto.');
            openModal(authModal); // Prompt login
            return;
        }
        const isAuthorized = await allowedUsersCollection.doc(currentUser.uid).get();
        if (!isAuthorized.exists) {
            showMessage('Acceso Denegado', 'Su cuenta no está autorizada para realizar esta acción.');
            return;
        }
        if (!currentComercioId) {
            showMessage('Error', 'Por favor, seleccione un comercio primero.');
            return;
        }
        addProductForm.reset(); // Clear the form when opening
        newProductOrderInput.value = '999'; // Reset default order
        // Deselect all categories
        Array.from(newProductCategoriesSelect.options).forEach(option => option.selected = false);
        openModal(addProductModal);
    });
}

// Add Product Form Submission
if(addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) { // Double check authentication
            showMessage('Acceso Denegado', 'Necesita iniciar sesión para guardar un producto.');
            return;
        }

        const productsColRef = getProductsCollection();
        if (!productsColRef) return; // Should not happen due to button check, but good for safety

        const selectedCategories = Array.from(newProductCategoriesSelect.selectedOptions).map(option => option.value);

        const productData = {
            name: newProductNameInput.value,
            price: parseFloat(newProductPriceInput.value),
            oldPrice: newProductOldPriceInput.value ? parseFloat(newProductOldPriceInput.value) : null,
            image: newProductImageInput.value,
            details: newProductDetailsInput.value,
            isVegan: newIsVeganInput.checked,
            isVegetarian: newIsVegetarianInput.checked,
            isGlutenFree: newIsGlutenFreeInput.checked,
            dietaryInfo: newProductDietaryInfoInput.value,
            categories: selectedCategories,
            order: parseInt(newProductOrderInput.value, 10) || 999
        };

        try {
            await productsColRef.add(productData);
            showMessage('Éxito', 'Producto añadido con éxito!');
            closeModal(addProductModal);
            fetchProducts();
        } catch (error) {
            console.error("Error adding product: ", error);
            showMessage('Error', 'No se pudo añadir el producto.');
        }
    });
}


// Edit Product Function (opens modal and populates form)
async function editProduct(firebaseDocId) {
    if (!currentUser) { // Check authentication
        showMessage('Acceso Denegado', 'Necesita iniciar sesión para editar un producto.');
        return;
    }
    const isAuthorized = await allowedUsersCollection.doc(currentUser.uid).get();
    if (!isAuthorized.exists) {
        showMessage('Acceso Denegado', 'Su cuenta no está autorizada para realizar esta acción.');
        return;
    }
    const productsColRef = getProductsCollection();
    if (!productsColRef) return;

    try {
        const doc = await productsColRef.doc(firebaseDocId).get();
        if (doc.exists) {
            const product = doc.data();
            editProductIdInput.value = firebaseDocId;
            editProductNameInput.value = product.name || '';
            editProductPriceInput.value = product.price || 0;
            editProductOldPriceInput.value = product.oldPrice || '';
            editProductImageInput.value = product.image || '';
            editProductDetailsInput.value = product.details || '';
            editIsVeganInput.checked = product.isVegan || false;
            editIsVegetarianInput.checked = product.isVegetarian || false;
            editIsGlutenFreeInput.checked = product.isGlutenFree || false;
            editProductDietaryInfoInput.value = product.dietaryInfo || '';
            editProductOrderInput.value = product.order || 999;

            // Select categories in the multiselect
            Array.from(editProductCategoriesSelect.options).forEach(option => {
                option.selected = product.categories && product.categories.includes(option.value);
            });

            openModal(editProductModal);
        }
    } catch (error) {
        console.error("Error fetching product for edit: ", error);
        showMessage('Error', 'No se pudo cargar el producto para editar.');
    }
}

// Edit Product Form Submission
if(editProductForm) {
    editProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) { // Double check authentication
            showMessage('Acceso Denegado', 'Necesita iniciar sesión para guardar cambios.');
            return;
        }

        const productsColRef = getProductsCollection();
        if (!productsColRef) return;

        const firebaseDocId = editProductIdInput.value;
        const selectedCategories = Array.from(editProductCategoriesSelect.selectedOptions).map(option => option.value);

        const productData = {
            name: editProductNameInput.value,
            price: parseFloat(editProductPriceInput.value),
            oldPrice: editProductOldPriceInput.value ? parseFloat(editProductOldPriceInput.value) : null,
            image: editProductImageInput.value,
            details: editProductDetailsInput.value,
            isVegan: editIsVeganInput.checked,
            isVegetarian: editIsVegetarianInput.checked,
            isGlutenFree: editIsGlutenFreeInput.checked,
            dietaryInfo: editProductDietaryInfoInput.value,
            categories: selectedCategories,
            order: parseInt(editProductOrderInput.value, 10) || 999
        };

        try {
            await productsColRef.doc(firebaseDocId).update(productData);
            showMessage('Éxito', 'Producto actualizado con éxito!');
            closeModal(editProductModal);
            fetchProducts();
        } catch (error) {
            console.error("Error updating product: ", error);
            showMessage('Error', 'No se pudo actualizar el producto.');
        }
    });
}


async function deleteProduct(firebaseDocId) {
    if (!currentUser) { // Check authentication
        showMessage('Acceso Denegado', 'Necesita iniciar sesión para eliminar un producto.');
        return;
    }
    const isAuthorized = await allowedUsersCollection.doc(currentUser.uid).get();
    if (!isAuthorized.exists) {
        showMessage('Acceso Denegado', 'Su cuenta no está autorizada para realizar esta acción.');
        return;
    }
    const productsColRef = getProductsCollection();
    if (!productsColRef) return;

    // Using custom confirmation instead of window.confirm
    if (confirm('¿Está seguro de que desea eliminar este producto?')) {
        try {
            await productsColRef.doc(firebaseDocId).delete();
            showMessage('Éxito', 'Producto eliminado con éxito.');
            fetchProducts();
        } catch (error) {
            console.error("Error deleting product: ", error);
            showMessage('Error', 'No se pudo eliminar el producto.');
        }
    }
}

// --- CATEGORY CRUD OPERATIONS --- (Mainly for Category Tab)

// Open Add Category Modal from Product Tab
if(openAddCategoryFromProductTabModalButton) {
    openAddCategoryFromProductTabModalButton.addEventListener('click', async () => {
        if (!currentUser) { // Check authentication
            showMessage('Acceso Denegado', 'Necesita iniciar sesión para añadir una categoría.');
            return;
        }
        const isAuthorized = await allowedUsersCollection.doc(currentUser.uid).get();
        if (!isAuthorized.exists) {
            showMessage('Acceso Denegado', 'Su cuenta no está autorizada para realizar esta acción.');
            return;
        }
        if (!currentComercioId) {
            showMessage('Error', 'Por favor, seleccione un comercio primero.');
            return;
        }
        addCategoryForm.reset();
        openModal(addCategoryModal);
    });
}

// Add Category Form Submission (from new modal)
if(addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) { // Double check authentication
            showMessage('Acceso Denegado', 'Necesita iniciar sesión para añadir una categoría.');
            return;
        }

        const categoriesColRef = getCategoriesCollection();
        if (!categoriesColRef) return;

        const name = newCategoryNameInput.value.trim();

        if (!name) {
            showMessage('Error', 'El nombre de la categoría no puede estar vacío.');
            return;
        }

        const exists = allCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            showMessage('Error', 'Ya existe una categoría con este nombre.');
            return;
        }

        const categoryData = { name, comercioId: currentComercioId }; // Associate category with current comercio

        try {
            await categoriesColRef.add(categoryData);
            showMessage('Éxito', 'Categoría añadida con éxito!');
            closeModal(addCategoryModal);
            fetchCategories(); // Re-fetch categories to update lists
            fetchProducts(); // Re-fetch products to ensure category tags are updated, and JSON
        } catch (error) {
            console.error("Error adding category: ", error);
            showMessage('Error', 'No se pudo añadir la categoría.');
        }
    });
}

// Edit/Save Category from Category Tab (original form)
if(categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) { // Double check authentication
            showMessage('Acceso Denegado', 'Necesita iniciar sesión para guardar una categoría.');
            return;
        }

        const categoriesColRef = getCategoriesCollection();
        if (!categoriesColRef) return;

        const id = categoryIdInput.value;
        const name = categoryNameInput.value.trim();

        if (!name) {
            showMessage('Error', 'El nombre de la categoría no puede estar vacío.');
            return;
        }

        const exists = allCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase() && cat.id !== id);
        if (exists) {
            showMessage('Error', 'Ya existe otra categoría con este nombre.');
            return;
        }

        const categoryData = { name, comercioId: currentComercioId }; // Ensure comercioId is preserved/added during edit

        try {
            if (id) {
                await categoriesColRef.doc(id).update(categoryData);
                showMessage('Éxito', 'Categoría actualizada con éxito!');
            } else {
                await categoriesColRef.add(categoryData);
                showMessage('Éxito', 'Categoría añadida con éxito!');
            }
            categoryForm.reset();
            categoryIdInput.value = '';
            fetchCategories(); // Re-fetch categories to update lists
            fetchProducts(); // Re-fetch products to reflect category changes and update JSON
        } catch (error) {
            console.error("Error saving category: ", error);
            showMessage('Error', 'No se pudo guardar la categoría.');
        }
    });
}

async function deleteCategory(id) {
    if (!currentUser) { // Check authentication
        showMessage('Acceso Denegado', 'Necesita iniciar sesión para eliminar una categoría.');
        return;
    }
    const isAuthorized = await allowedUsersCollection.doc(currentUser.uid).get();
    if (!isAuthorized.exists) {
        showMessage('Acceso Denegado', 'Su cuenta no está autorizada para realizar esta acción.');
        return;
    }
    const categoriesColRef = getCategoriesCollection();
    if (!categoriesColRef) return;

    // Using custom confirmation instead of window.confirm
    if (confirm('¿Está seguro de que desea eliminar esta categoría?')) {
        try {
            await categoriesColRef.doc(id).delete();
            showMessage('Éxito', 'Categoría eliminada con éxito.');
            fetchCategories();
            fetchProducts(); // Re-fetch products to reflect category changes
        } catch (error) {
            console.error("Error deleting category: ", error);
            showMessage('Error', 'No se pudo eliminar la categoría.');
        }
    }
}

if(cancelCategoryEditButton) {
    cancelCategoryEditButton.addEventListener('click', () => {
        categoryForm.reset();
        categoryIdInput.value = '';
    });
}

// --- AUTHENTICATION LOGIC ---

// Función para mostrar errores de autenticación
function displayAuthError(message) {
    authErrorDisplay.textContent = message;
    authErrorDisplay.style.display = 'block';
}

function clearAuthError() {
    authErrorDisplay.textContent = '';
    authErrorDisplay.style.display = 'none';
}

// Abrir el modal de autenticación
openAuthModalButton.addEventListener('click', () => {
    authForm.reset();
    clearAuthError();
    authModalTitle.textContent = 'Iniciar Sesión / Registrarse';
    openModal(authModal);
});

// Cerrar sesión
signOutButton.addEventListener('click', async () => {
    try {
        await auth.signOut();
        showMessage('Sesión Cerrada', 'Has cerrado sesión correctamente.');
        // onAuthStateChanged se encargará de actualizar la UI
    } catch (error) {
        console.error("Error signing out: ", error);
        showMessage('Error', 'No se pudo cerrar la sesión.');
    }
});


// Manejar inicio de sesión
if(signInButton) {
    signInButton.addEventListener('click', async (e) => {
        e.preventDefault();
        clearAuthError();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            closeModal(authModal);
            // La función onAuthStateChanged manejará la UI y la autorización
        } catch (error) {
            console.error("Error signing in: ", error);
            displayAuthError('Error: ' + error.message);
        }
    });
}

// Manejar registro
if(signUpButton) {
    signUpButton.addEventListener('click', async (e) => {
        e.preventDefault();
        clearAuthError();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;

        if (password.length < 6) {
            displayAuthError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            closeModal(authModal);
            // onAuthStateChanged se encargará de la UI y la autorización después del registro
        } catch (error) {
            console.error("Error signing up: ", error);
            displayAuthError('Error: ' + error.message);
        }
    });
}

// Observar el estado de autenticación (cuando el usuario inicia/cierra sesión)
auth.onAuthStateChanged(async user => {
    if (user) {
        // Usuario ha iniciado sesión
        currentUser = user;
        openAuthModalButton.style.display = 'none';
        signOutButton.style.display = 'block';

        // Comprobar si el usuario está autorizado
        const isAuthorized = await allowedUsersCollection.doc(user.uid).get();
        if (isAuthorized.exists) {
            console.log('Usuario autorizado:', user.email);
            // El usuario está autorizado, cargar los datos
            openTab('inicio'); // Abrir la pestaña de inicio por defecto
            fetchComercios(); // Cargar los comercios para el selector del header
        } else {
            // El usuario no está en la lista de permitidos
            console.warn('Usuario no autorizado:', user.email);
            showMessage('Acceso Denegado', 'Su cuenta no está autorizada para usar este panel. Póngase en contacto con el administrador.');
            // Opcional: cerrar sesión automáticamente si no está autorizado
            await auth.signOut();
        }

    } else {
        // Usuario ha cerrado sesión
        currentUser = null;
        openAuthModalButton.style.display = 'block';
        signOutButton.style.display = 'none';
        
        // Limpiar la UI y mostrar solo la pestaña de inicio
        openTab('inicio');
    }
});

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    // La lógica de carga inicial ahora es manejada por auth.onAuthStateChanged.
    // Una vez que Firebase determine si hay un usuario logueado o no,
    // onAuthStateChanged se disparará y llamará a openTab() con la lógica adecuada.
});