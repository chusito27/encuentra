import { initCategoryFeatures } from './categories.js';
// 1. Importamos el inicializador de productos
import { initProductFeatures } from './products.js';
// 1. Importamos la función para obtener los permisos
import { getUserPermissions } from './auth.js';

let isCategoryInit = false;
// 2. Añadimos una bandera para productos
let isProductInit = false;

// Función para mostrar un mensaje emergente (modal)
export function showMessage(title, message) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        console.error("El contenedor del modal no se encuentra en el DOM.");
        alert(`${title}: ${message}`);
        return;
    }
    const existingModal = modalContainer.querySelector('.modal');
    if (existingModal) {
        modalContainer.removeChild(existingModal);
    }
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2>${title}</h2>
            <p>${message}</p>
        </div>
    `;
    modalContainer.appendChild(modal);
    const closeButton = modal.querySelector('.close-button');
    const closeModal = () => {
        if (modal.parentElement) {
            modalContainer.removeChild(modal);
        }
    };
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Función para previsualizar una sola imagen
export function previewImage(url, previewElementId) {
    const preview = document.getElementById(previewElementId);
    if (preview) {
        preview.innerHTML = '';
        if (url) {
            const img = document.createElement('img');
            img.src = url;
            preview.appendChild(img);
        }
    }
}

// Función para previsualizar múltiples imágenes
export function previewImages(urls, previewElementId) {
    const preview = document.getElementById(previewElementId);
    if (preview) {
        preview.innerHTML = '';
        urls.forEach(url => {
            if (url) {
                const img = document.createElement('img');
                img.src = url;
                preview.appendChild(img);
            }
        });
    }
}

// --- LÓGICA DE PESTAÑAS UNIFICADA Y MEJORADA ---

/**
 * Cambia la visibilidad de las pestañas de contenido usando clases CSS.
 * @param {string} tabId El ID del contenido de la pestaña a mostrar.
 * @param {HTMLElement} clickedButton El botón que activó el cambio.
 */
function openTab(tabId, clickedButton) {
    // Ocultar todo el contenido de las pestañas quitando la clase 'active'
    const tabContents = document.querySelectorAll(".tabcontent");
    tabContents.forEach(tab => tab.classList.remove("active"));

    // Quitar la clase "active" de todos los botones del sidebar
    const tabLinks = document.querySelectorAll(".tablink");
    tabLinks.forEach(link => link.classList.remove("active"));

    // Mostrar la pestaña actual y añadir la clase "active" al botón y al contenido
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        tabElement.classList.add("active");
    }
    if (clickedButton) {
        clickedButton.classList.add("active");
    }

    // Lógica para inicializar componentes bajo demanda
    // if (tabId === 'Categorias' && !isCategoryInit) {
    //     initCategoryFeatures();
    //     isCategoryInit = true;
    // }
}

// --- FUNCIÓN DE INICIALIZACIÓN DE LA UI ---
export function initUI() {
    console.log("Inicializando UI y navegación por pestañas...");

    // --- Lógica para el menú responsive ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarContainer = document.getElementById('sidebar-container');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (menuToggle && sidebarContainer && sidebarOverlay) {
        menuToggle.addEventListener('click', () => {
            sidebarContainer.classList.toggle('open');
            sidebarOverlay.classList.toggle('open');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebarContainer.classList.remove('open');
            sidebarOverlay.classList.remove('open');
        });
    }
    // --- Fin de la lógica responsive ---


    // 2. Lógica de visibilidad de pestañas según permisos
    const permissions = getUserPermissions();
    const tabButtons = document.querySelectorAll('.tablink');

    // Si el usuario NO es un Super Admin, ocultamos las pestañas no deseadas
    if (permissions && !permissions.accessAllComercios) {
        const tabsToHide = ['Comercios', 'Usuarios'];
        tabButtons.forEach(button => {
            const tabName = button.getAttribute('data-tab');
            if (tabsToHide.includes(tabName)) {
                // Ocultamos el elemento <li> que contiene el botón
                const listItem = button.closest('li');
                if (listItem) {
                    listItem.style.display = 'none';
                }
            }
        });
    }

    // 3. Asignar listeners a las pestañas VISIBLES
    tabButtons.forEach(button => {
        const tabName = button.getAttribute('data-tab');
        if (tabName) {
            button.addEventListener('click', (event) => {
                openTab(tabName, event.currentTarget);
            });
        }
    });

    // 4. Abrir la pestaña por defecto correcta
    let defaultOpenButton;
    if (permissions && !permissions.accessAllComercios) {
        // Para usuarios normales, la pestaña por defecto es "Productos"
        defaultOpenButton = document.querySelector('.tablink[data-tab="Productos"]');
    } else {
        // Para Super Admins, la pestaña por defecto es "Comercios"
        defaultOpenButton = document.getElementById('defaultOpen');
    }

    if (defaultOpenButton) {
        defaultOpenButton.click();
    }

    // Listeners para previsualización de imágenes (si los elementos existen)
    const mainImageInput = document.getElementById('comercioMainImage');
    if (mainImageInput) {
        mainImageInput.addEventListener('input', () => previewImage(mainImageInput.value, 'mainImagePreview'));
    }
    const additionalPhotosInput = document.getElementById('comercioAdditionalPhotos');
    if (additionalPhotosInput) {
        additionalPhotosInput.addEventListener('input', () => {
            const urls = additionalPhotosInput.value.split(',').map(url => url.trim()).filter(url => url);
            previewImages(urls, 'additionalPhotosPreview');
        });
    }
    console.log("UI inicializada.");
}