import { db } from './firebase-config.js';
import { showMessage } from './ui.js';

// --- ¡NUEVO! Importaciones para Firebase v9+ ---
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Variables para los elementos del DOM
let userListView, userFormView, addNewUserButton, usersTableContainer;
let userForm, userFormTitle, cancelUserEdit, userAccessAll, userComerciosGroup;

// Almacenar listas para no tener que pedirlas a Firebase constantemente
let allComerciosList = [];
let allAllowedUsers = [];

// Función para cambiar entre vistas
function showUserView(view) {
    if (view === 'form') {
        userListView.style.display = 'none';
        userFormView.style.display = 'block';
    } else { // 'list'
        userListView.style.display = 'block';
        userFormView.style.display = 'none';
    }
}

// Inicializa todas las funcionalidades del módulo de usuarios
export function initUserFeatures() {
    userListView = document.getElementById('userListView');
    userFormView = document.getElementById('userFormView');
    addNewUserButton = document.getElementById('addNewUserButton');
    usersTableContainer = document.getElementById('usersTableContainer');
    userForm = document.getElementById('userForm');
    userFormTitle = document.getElementById('userFormTitle');
    cancelUserEdit = document.getElementById('cancelUserEdit');
    userAccessAll = document.getElementById('userAccessAll');
    userComerciosGroup = document.getElementById('userComerciosGroup');

    addNewUserButton.addEventListener('click', () => {
        resetUserForm();
        userFormTitle.textContent = 'Añadir Nuevo Usuario';
        document.getElementById('userUid').disabled = false;
        showUserView('form');
    });

    cancelUserEdit.addEventListener('click', () => {
        resetUserForm();
        showUserView('list');
    });

    userForm.addEventListener('submit', saveUser);

    userAccessAll.addEventListener('change', (e) => {
        userComerciosGroup.style.display = e.target.checked ? 'none' : 'flex';
    });

    // Cargar los datos iniciales cuando se inicializa el módulo
    loadInitialData();
}

// Carga los datos necesarios para este módulo (usuarios y comercios)
async function loadInitialData() {
    try {
        // --- SINTAXIS v9 ---
        const comerciosQuery = query(collection(db, 'comercios'), orderBy('name'));
        const comerciosSnapshot = await getDocs(comerciosQuery);
        allComerciosList = comerciosSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        populateComerciosSelect();

        // --- SINTAXIS v9 ---
        const usersSnapshot = await getDocs(collection(db, 'allowedUsers'));
        allAllowedUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        renderUsersTable(allAllowedUsers);

    } catch (error) {
        console.error("Error cargando datos para el módulo de usuarios:", error);
        showMessage("Error", "No se pudieron cargar los datos necesarios.");
    }
}

// Rellena el selector de comercios en el formulario de usuario
function populateComerciosSelect() {
    const select = document.getElementById('userComerciosSelect');
    select.innerHTML = '';
    allComerciosList.forEach(comercio => {
        const option = document.createElement('option');
        option.value = comercio.id;
        option.textContent = comercio.name;
        select.appendChild(option);
    });
}

// Renderiza la tabla de usuarios
function renderUsersTable(users) {
    if (!usersTableContainer) return;
    usersTableContainer.innerHTML = users.length === 0 ? '<p>No hay usuarios configurados. ¡Añade uno!</p>' : '';
    if (users.length === 0) return;

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr><th>Email</th><th>Acceso</th><th>Acciones</th></tr>
        </thead>
        <tbody>
            ${users.map(user => {
                const accessText = user.accessAllComercios 
                    ? '<strong>Todos los comercios</strong>' 
                    : `${(user.allowedComercios || []).length} comercio(s)`;
                return `
                    <tr>
                        <td>${user.email || 'Email no definido'}</td>
                        <td>${accessText}</td>
                        <td class="actions-cell">
                            <button class="edit-user" data-uid="${user.uid}">Editar</button>
                            <button class="delete-user delete" data-uid="${user.uid}">Eliminar</button>
                        </td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    usersTableContainer.appendChild(table);

    table.querySelectorAll('.edit-user').forEach(b => b.addEventListener('click', (e) => editUser(e.target.dataset.uid)));
    table.querySelectorAll('.delete-user').forEach(b => b.addEventListener('click', (e) => deleteUser(e.target.dataset.uid)));
}

// Guarda o actualiza un usuario en Firestore
async function saveUser(e) {
    e.preventDefault();
    const uid = document.getElementById('userUid').value.trim();
    if (!uid) {
        showMessage("Error", "El UID del usuario es obligatorio.");
        return;
    }

    const userData = {
        email: document.getElementById('userEmail').value.trim(),
        accessAllComercios: document.getElementById('userAccessAll').checked,
        allowedComercios: document.getElementById('userAccessAll').checked 
            ? [] 
            : Array.from(document.getElementById('userComerciosSelect').selectedOptions).map(opt => opt.value)
    };

    try {
        // --- SINTAXIS v9 ---
        await setDoc(doc(db, 'allowedUsers', uid), userData);
        showMessage("Éxito", "Usuario guardado correctamente.");
        
        await loadInitialData();
        showUserView('list');
    } catch (error) {
        console.error("Error guardando usuario:", error);
        showMessage("Error", "No se pudo guardar el usuario.");
    }
}

// Carga los datos de un usuario en el formulario para editarlo
function editUser(uid) {
    const user = allAllowedUsers.find(u => u.uid === uid);
    if (!user) return;

    resetUserForm();
    userFormTitle.textContent = `Editando: ${user.email}`;
    
    const uidInput = document.getElementById('userUid');
    uidInput.value = user.uid;
    uidInput.disabled = true;

    document.getElementById('userEmail').value = user.email || '';
    
    const accessAllCheckbox = document.getElementById('userAccessAll');
    accessAllCheckbox.checked = user.accessAllComercios || false;
    accessAllCheckbox.dispatchEvent(new Event('change'));

    if (!user.accessAllComercios && user.allowedComercios) {
        const select = document.getElementById('userComerciosSelect');
        Array.from(select.options).forEach(option => {
            option.selected = user.allowedComercios.includes(option.value);
        });
    }
    
    showUserView('form');
}

// Elimina un usuario de la colección 'allowedUsers'
async function deleteUser(uid) {
    if (confirm(`¿Estás seguro de que quieres revocar todos los permisos para el usuario con UID: ${uid}?`)) {
        try {
            // --- SINTAXIS v9 ---
            await deleteDoc(doc(db, 'allowedUsers', uid));
            showMessage("Éxito", "Usuario eliminado correctamente.");
            await loadInitialData();
        } catch (error) {
            console.error("Error eliminando usuario:", error);
            showMessage("Error", "No se pudo eliminar el usuario.");
        }
    }
}

// Resetea el formulario a su estado inicial
function resetUserForm() {
    userForm.reset();
    userComerciosGroup.style.display = 'flex';
}