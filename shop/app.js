import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables to store fetched data
let products = [];
let categories = [];
let storeInfo = {};

let cart = []; // El carrito se gestiona en la memoria
let currentFilter = "all";
let currentSearchTerm = "";
let isDarkMode = false;
let db, auth;
let userId;
let storeId;

const CART_STORAGE_PREFIX = 'e-commerce-cart-'; // Nuevo prefijo para la clave de localStorage

// Cache DOM elements for better performance
const DOMElements = {
    loadingOverlay: document.getElementById('loading-overlay'),
    mainScreen: document.querySelector('.container'),
    topBar: document.querySelector('.top-bar'),
    storeName: document.getElementById('store-name'),
    productList: document.getElementById('product-list'),
    categoriesMenu: document.getElementById('categories-menu'),
    cartIconContainer: document.getElementById('top-cart-icon-container'),
    cartCount: document.getElementById('cart-count'),
    cartTotal: document.getElementById('cart-total'),
    productDetailModal: document.getElementById('productDetailModal'),
    productDetailContent: document.getElementById('productDetailContent'),
    closeProductDetailModal: document.getElementById('closeProductDetailModal'),
    detailImage: document.getElementById('detail-image'),
    detailCategories: document.getElementById('detail-categories'),
    detailName: document.getElementById('detail-name'),
    detailPriceContainer: document.getElementById('detail-price-container'), // CORREGIDO
    detailDescription: document.getElementById('detail-description'),
    detailTags: document.getElementById('detail-tags'), // El contenedor de tags
    // ELIMINADOS: veganTag, vegetarianTag, glutenFreeTag ya que no existen en el HTML
    detailAdditionalInfoContainer: document.getElementById('detail-additional-info-container'),
    detailAdditionalInfo: document.getElementById('detail-additional-info'),
    detailAddToCartButton: document.getElementById('add-to-cart-from-detail'), // CORREGIDO

    cartScreen: document.getElementById('cart-screen'),
    closeCartScreen: document.getElementById('back-to-shop-btn'), // <-- ID CORREGIDO
    cartItemsContainer: document.getElementById('cart-items-container'),
    cartScreenTotalPrice: document.getElementById('cart-screen-total-price'),
    sendOrderButton: document.getElementById('send-order-button'),
    searchInput: document.getElementById('search-input'),
    settingsIcon: document.getElementById('settings-icon'),
    homeIcon: document.getElementById('home-icon'),
    footerHome: document.getElementById('footer-home'),
    footerCart: document.getElementById('footer-cart'),
    footerInfo: document.getElementById('footer-info'),
    footerProfile: document.getElementById('footer-profile'),
    // AÑADIR ESTOS ELEMENTOS
    emptyCartModal: document.getElementById('emptyCartModal'),
    closeEmptyCartModal: document.getElementById('closeEmptyCartModal'),
    closeEmptyCartModalBtn: document.getElementById('closeEmptyCartModalBtn'),
    // AÑADIR ESTAS LÍNEAS
    expressDeliveryCheckbox: document.getElementById('express-delivery'),
    modalOrderChangesTextarea: document.getElementById('modal-order-changes'),

    // --- Elementos de la Pantalla de Información (IDs CORREGIDOS Y VERIFICADOS) ---
    infoScreen: document.getElementById('info-screen'),
    infoBackButton: document.getElementById('back-to-shop-from-info-btn'), // CORREGIDO
    infoContent: document.getElementById('info-content'),
    infoMainImage: document.getElementById('info-main-image'),
    infoStoreName: document.getElementById('info-name'), // CORREGIDO
    infoStoreSlogan: document.getElementById('info-short-description'), // CORREGIDO
    infoActions: document.querySelector('#info-screen .info-actions'), // CORREGIDO
    infoDescription: document.getElementById('info-full-description'), // CORREGIDO
    infoSchedule: document.getElementById('info-schedule'), // CORREGIDO
    infoGallery: document.getElementById('info-gallery'), // CORREGIDO
    footerInfoButton: document.getElementById('footer-info'),

    // --- Contenedores para mostrar/ocultar secciones ---
    infoScheduleContainer: document.getElementById('info-schedule-container'),
    infoDescriptionContainer: document.getElementById('info-description-container'),
    infoGalleryContainer: document.getElementById('info-gallery-container'),
};

// Global state
let isCartOpen = false;

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAHr8NSBkLN_Jt062C4RtYFiulFC13tOLA",
    authDomain: "web2727.firebaseapp.com",
    projectId: "web2727",
    storageBucket: "web2727.appspot.com",
    messagingSenderId: "899729264501",
    appId: "1:899729264501:web:e81099f4c1e7ba52ef4d3c",
    measurementId: "G-VE3F22HX79"
};

const app = initializeApp(firebaseConfig);
db = getFirestore(app);
auth = getAuth(app);

// --- FUNCIONES DE UTILIDAD (Carga, formato, etc.) ---

const showLoading = () => {
    if (DOMElements.loadingOverlay) {
        DOMElements.loadingOverlay.style.display = 'flex';
    }
};

const hideLoading = () => {
    if (DOMElements.loadingOverlay) {
        DOMElements.loadingOverlay.style.display = 'none';
    }
};

const saveCartToLocalStorage = () => {
    if (storeId) {
        const cartKey = `${CART_STORAGE_PREFIX}${storeId}`;
        localStorage.setItem(cartKey, JSON.stringify(cart));
    }
};

const loadCartFromLocalStorage = () => {
    if (storeId) {
        const cartKey = `${CART_STORAGE_PREFIX}${storeId}`;
        const savedCart = localStorage.getItem(cartKey);
        if (savedCart) {
            cart = JSON.parse(savedCart);
        } else {
            cart = [];
        }
    }
};

const formatColones = (amount) => {
    // Asegurarse de que el monto sea un número
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
        return '₡0'; // Retornar un valor por defecto si no es un número
    }
    return new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: 'CRC'
    }).format(numericAmount);
};

// --- MANEJADORES DE EVENTOS ---

// Evento para abrir el carrito (desde el icono del header o el footer)
const openCartHandler = () => {
    if (cart.length === 0) {
        DOMElements.emptyCartModal.style.display = 'flex'; // Mostrar modal de carrito vacío
    } else {
        showScreen(DOMElements.cartScreen); // Mostrar pantalla del carrito
    }
};

// Cerrar el modal de carrito vacío
const closeEmptyCartModalHandler = () => {
    DOMElements.emptyCartModal.style.display = 'none';
};

DOMElements.cartIconContainer.addEventListener('click', openCartHandler);
DOMElements.footerCart.addEventListener('click', openCartHandler);

// Eventos para cerrar el modal de carrito vacío
DOMElements.closeEmptyCartModal.addEventListener('click', closeEmptyCartModalHandler);
DOMElements.closeEmptyCartModalBtn.addEventListener('click', closeEmptyCartModalHandler);


// Evento para cerrar el carrito y volver a la tienda
DOMElements.closeCartScreen.addEventListener('click', () => {
    showScreen(null); // Oculta el carrito y no muestra ninguna otra pantalla (vuelve a la tienda)
});

// Función para cargar la información de la tienda desde Firestore
const loadStoreInfo = async () => {
    if (!storeId) return;

    const storeDocRef = doc(db, 'comercios', storeId);
    const storeDocSnap = await getDoc(storeDocRef);

    if (storeDocSnap.exists()) {
        storeInfo = storeDocSnap.data();
        // DOMElements.storeNameDiv.textContent = storeInfo.name || "Encuentra"; // 2. ELIMINA O COMENTA ESTA LÍNEA
        renderStoreInfo(); // <-- AÑADE ESTA LLAMADA
    } else {
        console.error("No se encontró la información de la tienda.");
    }
};

// Función para cargar las categorías desde Firestore
const loadCategories = () => {
    if (!storeId) return;

    const q = query(collection(db, `comercios/${storeId}/categories`));
    onSnapshot(q, (querySnapshot) => {
        const loadedCategories = [];
        // Special "all" category - RENAMED TO "Todo"
        const allButtonData = { id: "all", name: 'Todo' };
        loadedCategories.push(allButtonData);

        querySnapshot.forEach((doc) => {
            const categoryData = doc.data();
            loadedCategories.push({ id: doc.id, ...categoryData });
        });

        // Sort categories by order, with "all" first
        loadedCategories.sort((a, b) => {
            if (a.id === 'all') return -1;
            if (b.id === 'all') return 1;
            return (a.order || 0) - (b.order || 0);
        });

        categories = loadedCategories; // Actualiza la variable global
        // La llamada a renderCategories() se moverá a loadProducts
        
    }, (error) => {
        console.error("Error al cargar las categorías:", error);
        categories = [{ id: "all", name: 'Todo' }]; // RENAMED HERE AS WELL
    });
};

const renderCategories = (categoriesToRender) => {
    DOMElements.categoriesMenu.innerHTML = '';

    // Si no hay categorías para mostrar (o solo está "Todo" sin productos), oculta el menú
    if (!categoriesToRender || categoriesToRender.length === 0) {
        DOMElements.categoriesMenu.style.display = 'none';
        return;
    }

    // Si hay categorías, asegúrate de que el menú sea visible y renderiza los botones
    DOMElements.categoriesMenu.style.display = 'flex';
    const fragment = document.createDocumentFragment();
    categoriesToRender.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category.name;
        button.dataset.category = category.name; // Use name for filtering
        button.dataset.categoryId = category.id; // ADDED: Store category ID
        if (category.id === 'all') { // CHECKING BY ID FOR ROBUSTNESS
            button.classList.add('active');
        }
        if (category.name === 'Promociones') {
            button.dataset.category = "Promociones";
        }
        fragment.appendChild(button);
    });
    DOMElements.categoriesMenu.appendChild(fragment);
};


// Función para cargar los productos desde Firestore
const loadProducts = () => {
    if (!storeId) return;
    showLoading();

    const q = query(collection(db, `comercios/${storeId}/products`));
    onSnapshot(q, (querySnapshot) => {
        products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        // --- INICIO DE LA NUEVA LÓGICA ---
        // Obtener todos los IDs de categoría que tienen al menos un producto
        const productCategoryIds = new Set(products.map(p => p.categoryId));
        const productCategoryNames = new Set(products.map(p => p.category?.toLowerCase()));

        // Filtrar las categorías para mostrar solo las que tienen productos
        const categoriesWithProducts = categories.filter(cat => {
            // La categoría "Todo" se muestra si hay al menos un producto
            if (cat.id === 'all') {
                return products.length > 0;
            }
            // La categoría se muestra si su ID está en la lista de productos O si su nombre está
            return productCategoryIds.has(cat.id) || productCategoryNames.has(cat.name?.toLowerCase());
        });

        // Renderizar solo las categorías filtradas
        renderCategories(categoriesWithProducts);
        // --- FIN DE LA NUEVA LÓGICA ---

        renderProducts();
        hideLoading();
    }, (error) => {
        console.error("Error al cargar los productos:", error);
        products = [];
        renderProducts();
        hideLoading();
    });
};

// Función para renderizar los productos con los filtros actuales
const renderProducts = () => {
    DOMElements.productList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const lowerCaseSearchTerm = currentSearchTerm.toLowerCase();

    // OBTENER EL ID DE LA CATEGORÍA SELECCIONADA
    const selectedCategory = categories.find(cat => cat.name.toLowerCase() === currentFilter.toLowerCase());
    const selectedCategoryId = selectedCategory ? selectedCategory.id : null;

    const filteredProducts = products
        .filter(product => {
            // LÓGICA DE FILTRADO CORREGIDA
            const matchesCategory = currentFilter === 'all' || 
                                    (product.category && product.category.toLowerCase() === currentFilter.toLowerCase()) ||
                                    (product.categoryId && selectedCategoryId && product.categoryId === selectedCategoryId);

            const matchesSearch = !currentSearchTerm || product.name.toLowerCase().includes(lowerCaseSearchTerm);
            return matchesCategory && matchesSearch;
        })
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

    if (filteredProducts.length === 0) {
        const noProductsMessage = document.createElement('div');
        noProductsMessage.className = 'no-products-message';
        noProductsMessage.textContent = 'No hay productos en esta categoría o que coincidan con la búsqueda.';
        DOMElements.productList.appendChild(noProductsMessage);
    } else {
        filteredProducts.forEach(product => {
            const productCard = createProductCard(product);
            fragment.appendChild(productCard);
        });
        DOMElements.productList.appendChild(fragment);
    }
};

function createProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.dataset.productId = product.id;

    let priceHTML = '';
    if (product.promoPrice && product.promoPrice < product.price) {
        priceHTML = `
            <span class="old-price">${formatColones(product.price)}</span>
            <span class="new-price">${formatColones(product.promoPrice)}</span>
        `;
    } else {
        priceHTML = `<span class="new-price">${formatColones(product.price)}</span>`;
    }

    const tagsHTML = (product.tags || []).map(tag => `<i class="${tag.icon}" title="${tag.name}"></i>`).join('');

    productCard.innerHTML = `
        <div class="product-tags">${tagsHTML}</div>
        <div class="price-tag">${priceHTML}</div>
        <div class="product-image-container">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <div class="product-name-overlay">
                <h3>${product.name}</h3>
            </div>
        </div>
        <p class="product-details-short">${product.shortDescription || ''}</p>
        <button class="add-to-cart-button" data-product-id="${product.id}">Añadir</button>
    `;
    return productCard;
}


const filterProductsByCategory = (event) => {
    const clickedButton = event.target.closest('.category-button');
    if (clickedButton) {
        document.querySelectorAll('.category-button').forEach(button => {
            button.classList.remove('active');
        });
        clickedButton.classList.add('active');

        // CORRECTED: Use category ID for the "all" filter
        const categoryId = clickedButton.dataset.categoryId;
        currentFilter = categoryId === 'all' ? 'all' : clickedButton.dataset.category;
        
        // --- INICIO DE LA CORRECCIÓN ---
        if (DOMElements.searchInput) {
            DOMElements.searchInput.value = "";
        }
        // --- FIN DE LA CORRECCIÓN ---
        currentSearchTerm = "";
        renderProducts();
    }
};

// Función para manejar la búsqueda en la barra de búsqueda
const handleSearchInput = () => {
    // --- INICIO DE LA CORRECCIÓN ---
    if (DOMElements.searchInput) {
        currentSearchTerm = DOMElements.searchInput.value;
    }
    // --- FIN DE LA CORRECCIÓN ---
    
    document.querySelectorAll('.category-button').forEach(button => {
        button.classList.remove('active');
    });
    // Optionally activate the "all" button
    const allButton = document.querySelector('.category-button[data-category="all"]');
    if (allButton) allButton.classList.add('active');

    currentFilter = "all";
    renderProducts();
};

const addToCart = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
        const existingItem = cart.find(item => item.id === productId);
        const price = (product.promoPrice && product.promoPrice < product.price) ? product.promoPrice : product.price;

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: price,
                quantity: 1,
                imageUrl: product.image
            });
        }
        saveCartToLocalStorage();
        updateCartDisplay();
        closeProductDetailModal();
    }
};

const removeFromCart = (productId) => {
    cart = cart.filter(item => item.id !== productId);
    saveCartToLocalStorage();
    updateCartDisplay();
};

const updateQuantity = (productId, delta) => {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCartToLocalStorage();
            updateCartDisplay();
        }
    }
};

const updateQuantityInput = (productId, value) => {
    let newQuantity = parseInt(value, 10);
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (isNaN(newQuantity) || newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            saveCartToLocalStorage();
            updateCartDisplay();
        }
    }
};

const updateCartDisplay = () => {
    let itemCount = 0;
    let total = 0;

    // --- INICIO DE LA CORRECCIÓN ---
    // Limpiar el contenedor del carrito solo si existe
    if (DOMElements.cartItemsContainer) {
        DOMElements.cartItemsContainer.innerHTML = '';
    }
    // --- FIN DE LA CORRECCIÓN ---

    const fragment = document.createDocumentFragment();

    cart.forEach(item => {
        itemCount += item.quantity;
        total += item.price * item.quantity;

        const li = document.createElement('li');
        // CAMBIO AQUÍ: Agrupamos los controles en un div "cart-item-actions"
        li.innerHTML = `
            <div class="item-details">
                <img src="${item.imageUrl}" alt="${item.name}">
                <span>${item.name} (${formatColones(item.price)})</span>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="quantity-decrease" data-product-id="${item.id}">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" data-product-id="${item.id}" min="1">
                    <button class="quantity-increase" data-product-id="${item.id}">+</button>
                </div>
                <button class="remove-item-button" data-product-id="${item.id}">Eliminar</button>
            </div>
        `;
        fragment.appendChild(li);
    });


    // --- INICIO DE LA CORRECCIÓN ---
    // Actualizar elementos solo si existen
    if (DOMElements.topCartIconContainer) {
        if (cart.length === 0) {
            DOMElements.topCartIconContainer.classList.remove('cart-active');
        } else {
            DOMElements.topCartIconContainer.classList.add('cart-active');
        }
    }

    if (DOMElements.cartItemsContainer) {
        DOMElements.cartItemsContainer.appendChild(fragment);
    }
    if (DOMElements.cartCount) {
        DOMElements.cartCount.textContent = itemCount;
    }
    if (DOMElements.cartTotal) {
        DOMElements.cartTotal.textContent = formatColones(total);
    }
    if (DOMElements.cartScreenTotalPrice) {
        DOMElements.cartScreenTotalPrice.textContent = `Total: ${formatColones(total)}`;
    }
    // --- FIN DE LA CORRECCIÓN ---
};

// --- INICIO: RENDERIZADO DE PANTALLA DE INFORMACIÓN ---
const renderStoreInfo = () => {
    if (!storeInfo || Object.keys(storeInfo).length === 0) return;

    // --- Usar los IDs correctos del HTML ---
    DOMElements.infoStoreName.textContent = storeInfo.name || '';
    DOMElements.infoStoreSlogan.textContent = storeInfo.slogan || '';
    DOMElements.infoMainImage.src = storeInfo.mainImage || 'placeholder.jpg';

    // Limpiar acciones para evitar duplicados en recargas
    DOMElements.infoActions.innerHTML = '';

    // Botón de Sitio Web
    if (storeInfo.website) {
        const link = document.createElement('a');
        link.href = storeInfo.website;
        link.className = 'info-button';
        link.target = '_blank';
        link.innerHTML = `<i class="fas fa-globe"></i><span>Sitio Web</span>`;
        DOMElements.infoActions.appendChild(link);
    }

    // Botón de Google Maps
    if (storeInfo.googleMapsLocation) {
        const link = document.createElement('a');
        link.href = storeInfo.googleMapsLocation;
        link.className = 'info-button';
        link.target = '_blank';
        link.innerHTML = `<i class="fas fa-map-marker-alt"></i><span>Ubicación</span>`;
        DOMElements.infoActions.appendChild(link);
    }

    // Botón de Contacto (WhatsApp)
    if (storeInfo.phoneNumber) {
        const link = document.createElement('a');
        link.href = `https://wa.me/${storeInfo.phoneNumber}`;
        link.className = 'info-button';
        link.target = '_blank';
        link.innerHTML = `<i class="fab fa-whatsapp"></i><span>Contacto</span>`;
        DOMElements.infoActions.appendChild(link);
    }

    // Horario
    if (storeInfo.schedule) {
        DOMElements.infoSchedule.textContent = storeInfo.schedule;
        DOMElements.infoScheduleContainer.style.display = 'block';
    } else {
        DOMElements.infoScheduleContainer.style.display = 'none';
    }

    // Descripción completa
    if (storeInfo.description) {
        DOMElements.infoDescription.textContent = storeInfo.description;
        DOMElements.infoDescriptionContainer.style.display = 'block';
    } else {
        DOMElements.infoDescriptionContainer.style.display = 'none';
    }

    // Galería de fotos
    if (storeInfo.galleryImages && storeInfo.galleryImages.length > 0) {
        DOMElements.infoGallery.innerHTML = '';
        storeInfo.galleryImages.forEach(photoUrl => {
            const img = document.createElement('img');
            img.src = photoUrl;
            img.alt = "Foto de la galería";
            img.loading = 'lazy';
            DOMElements.infoGallery.appendChild(img);
        });
        DOMElements.infoGalleryContainer.style.display = 'block';
    } else {
        DOMElements.infoGalleryContainer.style.display = 'none';
    }
};
// --- FIN: RENDERIZADO DE PANTALLA DE INFORMACIÓN ---

// --- INICIO: NUEVO SISTEMA DE NAVEGACIÓN DE PANTALLAS ---
const allScreens = [DOMElements.cartScreen, DOMElements.infoScreen]; // AÑADIDO: infoScreen

function showScreen(screenToShow) {
    // Ocultar la pantalla principal (tienda)
    DOMElements.mainScreen.style.display = 'none';
    DOMElements.topBar.style.display = 'none';

    // Ocultar todas las demás pantallas
    allScreens.forEach(screen => {
        if (screen) screen.classList.add('hidden');
    });

    // Mostrar la pantalla solicitada
    if (screenToShow) {
        screenToShow.classList.remove('hidden');
    } else {
        // Si no se especifica pantalla, mostrar la principal (tienda)
        DOMElements.mainScreen.style.display = 'block';
        DOMElements.topBar.style.display = 'flex';
    }
}
// --- FIN: NUEVO SISTEMA DE NAVEGACIÓN ---

const openProductDetailModal = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // --- Poblar la información básica ---
    DOMElements.detailImage.src = product.image;
    DOMElements.detailName.textContent = product.name;
    DOMElements.detailDescription.textContent = product.description;

    // --- Lógica de Precios (CORREGIDO) ---
    // Limpiar el contenedor de precios y construir el HTML dinámicamente
    DOMElements.detailPriceContainer.innerHTML = ''; 
    if (product.oldPrice) {
        const oldPriceSpan = document.createElement('span');
        oldPriceSpan.className = 'old-price';
        oldPriceSpan.textContent = formatColones(product.oldPrice);
        DOMElements.detailPriceContainer.appendChild(oldPriceSpan);
    }
    const newPriceSpan = document.createElement('span');
    newPriceSpan.className = 'new-price';
    newPriceSpan.textContent = formatColones(product.price);
    DOMElements.detailPriceContainer.appendChild(newPriceSpan);


    // --- Lógica de Tags Dietéticos (CORREGIDO) ---
    // Limpiar el contenedor y crear los tags dinámicamente
    DOMElements.detailTags.innerHTML = '';
    let hasVisibleTags = false;

    const createDietaryTag = (iconClass, text) => {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'dietary-tag';
        tagDiv.innerHTML = `<i class="${iconClass}"></i><span>${text}</span>`;
        DOMElements.detailTags.appendChild(tagDiv);
        hasVisibleTags = true;
    };

    if (product.isVegan) {
        createDietaryTag('fas fa-leaf', 'Vegano');
    }
    if (product.isVegetarian) {
        createDietaryTag('fas fa-carrot', 'Vegetariano');
    }
    if (product.isGlutenFree) {
        createDietaryTag('fas fa-bread-slice', 'Sin Gluten'); // Ejemplo de ícono
    }

    DOMElements.detailTags.style.display = hasVisibleTags ? 'flex' : 'none';


    // --- Lógica de Categorías ---
    DOMElements.detailCategories.innerHTML = ''; // Limpiar categorías anteriores
    if (product.categoryIds && product.categoryIds.length > 0) {
        product.categoryIds.forEach(catId => {
            const category = categories.find(c => c.id === catId);
            if (category) {
                const categoryTag = document.createElement('span');
                categoryTag.className = 'detail-category-tag';
                categoryTag.textContent = category.name;
                DOMElements.detailCategories.appendChild(categoryTag);
            }
        });
        DOMElements.detailCategories.style.display = 'flex';
    } else {
        DOMElements.detailCategories.style.display = 'none';
    }


    // --- Lógica de Información Adicional ---
    if (product.additionalInfo) {
        DOMElements.detailAdditionalInfo.textContent = product.additionalInfo;
        DOMElements.detailAdditionalInfoContainer.style.display = 'block';
    } else {
        DOMElements.detailAdditionalInfoContainer.style.display = 'none';
    }

    // --- Botón de Agregar al Carrito ---
    DOMElements.detailAddToCartButton.dataset.productId = product.id;


    // --- Mostrar el modal ---
    DOMElements.productDetailModal.style.display = 'block';
};


const closeProductDetailModal = () => {
    if (DOMElements.productDetailModal) {
        DOMElements.productDetailModal.style.display = "none";
    }
};

const sendWhatsAppOrder = () => {
    if (cart.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }

    const whatsappNumber = storeInfo.phoneNumber;
    if (!whatsappNumber) {
        alert("El número de WhatsApp de la tienda no está configurado.");
        return;
    }

    let orderText = `¡Hola! Mi pedido de ${storeInfo.name} es el siguiente:\n\n`;
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        orderText += `- ${item.quantity}x ${item.name} (${formatColones(item.price)} c/u) = ${formatColones(itemTotal)}\n`;
        total += itemTotal;
    });

    orderText += `\nTotal a pagar: ${formatColones(total)}\n\n`;

    const orderChanges = DOMElements.modalOrderChangesTextarea.value.trim();
    if (orderChanges) {
        orderText += `Consideraciones especiales:\n"${orderChanges}"\n\n`;
    }

    if (DOMElements.expressDeliveryCheckbox.checked) {
        orderText += "**Solicito servicio EXPRESS**\n\n";
    }

    orderText += "¡Gracias!";

    const encodedText = encodeURIComponent(orderText);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    hideCartScreen(); // CORREGIDO: Usar la nueva función para ocultar la pantalla
};

const toggleDarkMode = () => {
    isDarkMode = !isDarkMode;
    applyTheme();
    localStorage.setItem('darkMode', isDarkMode);
};

const applyTheme = () => {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        DOMElements.settingsIcon.classList.remove('fa-sun');
        DOMElements.settingsIcon.classList.add('fa-moon');
    } else {
        document.body.classList.remove('dark-mode');
        DOMElements.settingsIcon.classList.remove('fa-moon');
        DOMElements.settingsIcon.classList.add('fa-sun');
    }
};

const initializeTheme = () => {
    const savedTheme = localStorage.getItem('darkMode');
    isDarkMode = (savedTheme === 'true');
    applyTheme();
};

// Event Delegation for improved performance
document.addEventListener('click', (event) => {
    // Category filtering
    const categoryButton = event.target.closest('.category-button');
    if (categoryButton) {
        filterProductsByCategory(event);
        return;
    }

    // Product card click (for opening detail modal)
    const productCard = event.target.closest('.product-card');
    if (productCard && !event.target.closest('.add-to-cart-button')) {
        openProductDetailModal(productCard.dataset.productId);
        return;
    }

    // Add to Cart from product card
    if (event.target.matches('.product-card .add-to-cart-button')) {
        addToCart(event.target.dataset.productId);
        return;
    }

    // Add to Cart from detail modal (CORREGIDO)
    if (event.target.id === 'add-to-cart-from-detail') {
        addToCart(event.target.dataset.productId);
        return;
    }

    // --- INICIO: SECCIÓN CORREGIDA ---
    // Controles de cantidad y eliminación en la pantalla del carrito
    const cartScreen = event.target.closest('#cart-screen');
    if (cartScreen) {
        if (event.target.classList.contains('quantity-increase')) {
            updateQuantity(event.target.dataset.productId, 1);
        } else if (event.target.classList.contains('quantity-decrease')) {
            updateQuantity(event.target.dataset.productId, -1);
        } else if (event.target.classList.contains('remove-item-button')) {
            removeFromCart(event.target.dataset.productId);
        }
        return;
    }
    // --- FIN: SECCIÓN CORREGIDA ---

    // Close buttons for modals
    if (event.target === DOMElements.closeProductDetailModalButton) { // ELIMINADO EL DE CART
        closeProductDetailModal();
    } else if (event.target === DOMElements.productDetailModal) { // Click outside product detail modal
        closeProductDetailModal();
    }
});

// Event listener for quantity input changes in cart modal
document.addEventListener('change', (event) => {
    if (event.target.classList.contains('quantity-input')) {
        updateQuantityInput(event.target.dataset.productId, event.target.value);
    }
});

// --- INICIO DE LA CORRECCIÓN ---

// Función principal de inicialización
async function initializeAppLogic() {
    const urlParams = new URLSearchParams(window.location.search);
    storeId = urlParams.get('id');

    if (!storeId) {
        document.body.innerHTML = "<h1>Error: ID de la tienda no especificado.</h1>";
        return;
    }

    // La configuración de Firebase ya no es necesaria aquí, se hace al inicio del script.

    showLoading();

    // Autenticación
    try {
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Error de autenticación:", error);
        hideLoading();
        document.body.innerHTML = "<h1>Error de autenticación. No se puede cargar la tienda.</h1>";
        return;
    }

    // Esperar a que el estado de autenticación esté confirmado
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;

            // Cargar datos iniciales
            await loadStoreInfo();
            loadCategories();
            loadProducts();
            loadCartFromLocalStorage();
            updateCartDisplay();

            // Inicializar tema y listeners
            initializeTheme();
            setupEventListeners(); // Nueva función para configurar listeners

            hideLoading(); // Ocultar el loading al final
        }
    });
}

// Nueva función para agrupar la configuración de event listeners
function setupEventListeners() {
    if (DOMElements.searchInput) {
        DOMElements.searchInput.addEventListener('input', handleSearchInput);
    }
    if (DOMElements.settingsIcon) {
        DOMElements.settingsIcon.addEventListener('click', toggleDarkMode);
    }
    if (DOMElements.homeIcon) {
        DOMElements.homeIcon.addEventListener('click', () => showScreen(null));
    }
    if (DOMElements.footerHome) {
        DOMElements.footerHome.addEventListener('click', () => showScreen(null));
    }
    if (DOMElements.sendOrderButton) {
        DOMElements.sendOrderButton.addEventListener('click', sendWhatsAppOrder);
    }
    // Añade aquí otros listeners que necesiten configuración inicial

    // --- Listeners para la pantalla de información ---
    if (DOMElements.footerInfo) {
        DOMElements.footerInfo.addEventListener('click', () => showScreen(DOMElements.infoScreen));
    }
    if (DOMElements.infoBackButton) {
        DOMElements.infoBackButton.addEventListener('click', () => showScreen(null));
    }
}


// Initial setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Llama a la función principal de inicialización
    initializeAppLogic();

    // PWA REGISTRATION (se mantiene aquí)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});
// --- FIN DE LA CORRECCIÓN ---