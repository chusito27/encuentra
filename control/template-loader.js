async function loadTemplate(url, containerId) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`No se pudo cargar el template: ${url} (Estado: ${response.status})`);
        }
        const text = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            // Cambiamos la lógica: += solo para el contenedor de modales.
            // Para los demás, reemplazamos el contenido.
            if (container.id === 'modal-container') {
                 container.innerHTML += text;
            } else {
                 container.innerHTML = text;
            }
        } else {
            console.error(`El contenedor con ID '${containerId}' no fue encontrado en el DOM.`);
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function loadAllTemplatesAndInit(onCompleteCallback) {
    const baseTemplates = [
        { url: 'templates/header.html', container: 'header-container' },
        { url: 'templates/sidebar.html', container: 'sidebar-container' },
        { url: 'templates/main-content.html', container: 'main-content' },
        { url: 'templates/modals.html', container: 'modal-container' },
        { url: 'templates/modals/addCategory.html', container: 'modal-container' }
    ];

    // 2. Define qué contenido va DENTRO de cada pestaña
    const tabContentTemplates = [
        { url: 'templates/tabs/comercio-gestion.html', container: 'Comercios' },
        { url: 'templates/tabs/categories-gestion.html', container: 'Categorias' },
        { url: 'templates/tabs/products-gestion.html', container: 'Productos' },
        { url: 'templates/tabs/usuarios-gestion.html', container: 'Usuarios' }
    ];

    try {
        // Carga la estructura base (header, sidebar, y los DIVs de las pestañas)
        await Promise.all(baseTemplates.map(t => loadTemplate(t.url, t.container)));
        
        // Carga el contenido específico DENTRO de cada DIV de pestaña
        await Promise.all(tabContentTemplates.map(t => loadTemplate(t.url, t.container)));

        // Una vez que TODO está en el DOM, ejecuta la función de inicialización
        if (onCompleteCallback) {
            onCompleteCallback();
        }
    } catch (error) {
        console.error("Fallo crítico al cargar templates. La inicialización de la UI se ha detenido.", error);
    }
}