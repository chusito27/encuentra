import { loadAllTemplatesAndInit } from './template-loader.js';
import { initAuth, handleAuthStateChange } from './auth.js';
import { initComercioFeatures, loadComercios } from './comercios.js';
import { initUI } from './ui.js';
import { initUserFeatures } from './usuarios.js';
import { initProductFeatures } from './products.js';
// 1. Importamos el inicializador de categorías
import { initCategoryFeatures } from './categories.js';

let appInitialized = false;

// Componentes que se inicializan después de cargar los templates
export function initComponents() {
    console.log("Inicializando componentes...");
    // Volvemos a llamar a initAuth para que encuentre el botón de logout
    initAuth(); 
    initComercioFeatures();
    initUserFeatures();
    initUI();
    initProductFeatures();
    // 2. Inicializamos las funcionalidades de categorías aquí
    initCategoryFeatures();
    console.log("Componentes inicializados.");
}

// Esta función se llamará cuando el usuario inicie sesión correctamente.
async function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;

    console.log("Paso 1: Cargando templates y luego inicializando componentes...");
    // Pasamos la función que debe ejecutarse DESPUÉS de que los templates estén listos.
    await loadAllTemplatesAndInit(initComponents);

    // Paso 3: Cargar los datos principales de la aplicación.
    console.log("Paso 3: Cargando datos de comercios...");
    await loadComercios();
    console.log("Datos de comercios cargados.");
    
    console.log("Aplicación completamente inicializada.");
}

function cleanupApp() {
    console.log("Usuario desconectado. Limpiando la aplicación.");
    appInitialized = false;
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicializamos solo el formulario de login al principio.
    initAuth();
    // El observador de estado se encargará de lanzar la inicialización completa.
    handleAuthStateChange(initializeApp, cleanupApp);
});