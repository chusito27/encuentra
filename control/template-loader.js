async function loadTemplate(url, containerId, append = false) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`No se pudo cargar el template: ${url} (Estado: ${response.status})`);
        }
        const text = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            // Si 'append' es true, añadimos el contenido. Si no, lo reemplazamos.
            if (append) {
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
    const templatesToLoad = [
        // Estructura base
        { url: 'templates/header.html', container: 'header-container' },
        { url: 'templates/sidebar.html', container: 'sidebar-container' },
        { url: 'templates/main-content.html', container: 'main-content' },
        // Contenido de pestañas
        { url: 'templates/tabs/comercio-gestion.html', container: 'Comercios' },
        { url: 'templates/tabs/categories-gestion.html', container: 'Categorias' },
        { url: 'templates/tabs/products-gestion.html', container: 'Productos' },
        { url: 'templates/tabs/usuarios-gestion.html', container: 'Usuarios' },
        { url: 'templates/tabs/finanzas-gestion.html', container: 'Finanzas' },
        // Modales (se añaden al contenedor de modales)
        { url: 'templates/modals.html', container: 'modal-container', append: true },
        { url: 'templates/modals/addCategory.html', container: 'modal-container', append: true }
    ];

    try {
        await Promise.all(templatesToLoad.map(t => loadTemplate(t.url, t.container, t.append || false)));

        // Una vez que TODO está en el DOM, ejecuta la función de inicialización
        if (onCompleteCallback) {
            onCompleteCallback();
        }
    } catch (error) {
        console.error("Fallo crítico al cargar templates. La inicialización de la UI se ha detenido.", error);
    }
}