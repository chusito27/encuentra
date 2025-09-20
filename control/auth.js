import { auth, db } from './firebase-config.js';
import { showMessage } from './ui.js';

// --- ¡NUEVO! Importaciones para Firebase v9+ ---
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let userPermissions = null;

// Función para obtener los permisos del usuario actual
export function getUserPermissions() {
    return userPermissions;
}

// Función para manejar el estado de la autenticación
export function handleAuthStateChange(onUserLoggedIn, onUserLoggedOut) {
    // --- SINTAXIS v9 ---
    onAuthStateChanged(auth, async (user) => {
        const loginView = document.getElementById('login-view');
        const appView = document.getElementById('app-view');

        if (user) {
            // Usuario está autenticado
            try {
                // --- SINTAXIS v9 ---
                const userDocRef = doc(db, 'allowedUsers', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    userPermissions = userDoc.data();
                    loginView.style.display = 'none';
                    appView.style.display = 'block';
                    onUserLoggedIn(); // Llama al callback para inicializar la app
                } else {
                    throw new Error("Usuario no autorizado.");
                }
            } catch (error) {
                console.error("Error al obtener los permisos del usuario:", error);
                showMessage("Error", `Error de permisos: ${error.message}. Contacta al administrador.`);
                // --- SINTAXIS v9 ---
                await signOut(auth); // Desconectar al usuario no autorizado
            }
        } else {
            // No hay usuario autenticado
            userPermissions = null;
            loginView.style.display = 'flex';
            appView.style.display = 'none';
            onUserLoggedOut();
        }
    });
}

// Función para inicializar las características de autenticación
export function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const logoutButton = document.getElementById('logoutButton');
    const loginError = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            loginError.style.display = 'none';

            try {
                // --- SINTAXIS v9 ---
                await signInWithEmailAndPassword(auth, email, password);
                // onAuthStateChanged se encargará del resto
            } catch (error) {
                console.error("Error de inicio de sesión:", error.code, error.message);
                loginError.textContent = "Email o contraseña incorrectos.";
                loginError.style.display = 'block';
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                // --- SINTAXIS v9 ---
                await signOut(auth);
                // onAuthStateChanged se encargará de mostrar la pantalla de login
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                showMessage("Error", "No se pudo cerrar la sesión.");
            }
        });
    }
}