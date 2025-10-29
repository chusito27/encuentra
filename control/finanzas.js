import { db } from './firebase-config.js';
import { showMessage } from './ui.js';
import { getCurrentComercioId } from './comercios.js';
import { collection, query, getDocs, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { loadProducts as reloadProductsList } from './products.js';

let financeView, totalInvestmentEl, potentialProfitEl, realizedProfitEl, financeProductsListEl;

export function initFinanceFeatures() {
    financeView = document.getElementById('financeView');
    totalInvestmentEl = document.getElementById('totalInvestmentValue');
    potentialProfitEl = document.getElementById('potentialProfitValue');
    realizedProfitEl = document.getElementById('realizedProfitValue');
    financeProductsListEl = document.getElementById('financeProductsList');
}

export async function loadFinanceData(comercioId) {
    // --- CORRECCIÓN ---
    // Si los elementos de la UI de finanzas aún no se han inicializado,
    // no hacemos nada. Esto evita el error durante la carga inicial.
    if (!financeView) {
        return;
    }
    if (!comercioId) {
        financeView.style.display = 'none';
        return;
    }
    financeView.style.display = 'block';

    // Cargar datos del comercio (para la ganancia realizada)
    const comercioDocRef = doc(db, 'comercios', comercioId);
    const comercioSnap = await getDoc(comercioDocRef);
    const comercioData = comercioSnap.exists() ? comercioSnap.data() : {};
    const realizedProfit = comercioData.realizedProfit || 0;
    realizedProfitEl.textContent = `₡${realizedProfit.toFixed(2)}`;

    // Cargar productos para calcular inversión y ganancia potencial
    const q = query(collection(db, `comercios/${comercioId}/products`));
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let totalInvestment = 0;
    let potentialProfit = 0;

    products.forEach(p => {
        const stock = (p.stock !== null && p.stock !== undefined) ? p.stock : 0;
        const costPrice = p.costPrice || 0;
        const price = p.price || 0;

        if (stock > 0) {
            totalInvestment += stock * costPrice;
            potentialProfit += stock * (price - costPrice);
        }
    });

    totalInvestmentEl.textContent = `₡${totalInvestment.toFixed(2)}`;
    potentialProfitEl.textContent = `₡${potentialProfit.toFixed(2)}`;

    renderProductsForSale(products);
}

function renderProductsForSale(products) {
    financeProductsListEl.innerHTML = '';

    products.filter(p => p.stock !== null && p.stock > 0).forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card sale-card';
        card.innerHTML = `
            <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.name}">
            <div class="product-card-info">
                <h4>${p.name}</h4>
                <p class="product-price">Stock: ${p.stock}</p>
                <div class="sale-actions">
                    <input type="number" class="sale-quantity" min="1" max="${p.stock}" value="1">
                    <button class="sell-button" data-id="${p.id}" data-price="${p.price || 0}" data-cost="${p.costPrice || 0}">Vender</button>
                </div>
            </div>
        `;
        financeProductsListEl.appendChild(card);
    });

    financeProductsListEl.querySelectorAll('.sell-button').forEach(button => {
        button.addEventListener('click', handleSellProduct);
    });
}

async function handleSellProduct(e) {
    const button = e.currentTarget;
    const productId = button.dataset.id;
    const price = parseFloat(button.dataset.price);
    const cost = parseFloat(button.dataset.cost);
    const quantityInput = button.closest('.sale-actions').querySelector('.sale-quantity');
    const quantityToSell = parseInt(quantityInput.value, 10);

    const comercioId = getCurrentComercioId();

    if (!comercioId || !productId || isNaN(quantityToSell) || quantityToSell <= 0) {
        showMessage("Error", "Datos de venta inválidos.");
        return;
    }

    button.disabled = true;
    button.textContent = 'Vendiendo...';

    try {
        const productRef = doc(db, `comercios/${comercioId}/products`, productId);
        const comercioRef = doc(db, 'comercios', comercioId);

        // Calcular la ganancia de esta venta específica
        const saleProfit = quantityToSell * (price - cost);

        // Actualizar el stock del producto (decremento)
        await updateDoc(productRef, {
            stock: increment(-quantityToSell)
        });

        // Actualizar la ganancia total del comercio (incremento)
        await updateDoc(comercioRef, {
            realizedProfit: increment(saleProfit)
        });

        showMessage("Éxito", `Venta de ${quantityToSell} unidad(es) de ${button.closest('.product-card').querySelector('h4').textContent} registrada.`);

        // Recargar los datos de finanzas y la lista de productos en la otra pestaña
        await loadFinanceData(comercioId);
        await reloadProductsList(comercioId);

    } catch (error) {
        console.error("Error al registrar la venta:", error);
        showMessage("Error", "No se pudo registrar la venta.");
        button.disabled = false;
        button.textContent = 'Vender';
    }
}