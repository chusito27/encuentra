// Importa las funciones que necesitas de los SDK que necesitas
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// La configuración de tu proyecto de Firebase que ya tenías
// ¡Asegúrate de que estos datos son correctos!
const firebaseConfig = {
  apiKey: "AIzaSyAHr8NSBkLN_Jt062C4RtYFiulFC13tOLA",
  authDomain: "web2727.firebaseapp.com",
  projectId: "web2727",
  storageBucket: "web2727.firebasestorage.app",
  messagingSenderId: "899729264501",
  appId: "1:899729264501:web:e81099f4c1e7ba52ef4d3c",
  measurementId: "G-VE3F22HX79"
};

// Inicializa Firebase de la nueva forma
const app = initializeApp(firebaseConfig);

// Obtiene las instancias de los servicios que necesitas
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta las instancias para que otros módulos las puedan usar
export { db, auth };