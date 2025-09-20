// ADVERTENCIA: La API key está expuesta en el lado del cliente.
// Para una mayor seguridad, esto debería moverse a una Cloud Function de Firebase.
const IBB_API_KEY = 'c3c967bfcb3d9af7f562173450c95ce1';
const IBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

/**
 * Sube un archivo de imagen a imgbb.com y devuelve la URL de la imagen.
 * @param {File} file El archivo de imagen a subir.
 * @param {string} comercioId El ID del comercio para nombrar la imagen.
 * @returns {Promise<string>} La URL de la imagen subida.
 * @throws {Error} Si la subida falla.
 */
export async function uploadImage(file, comercioId) {
    const formData = new FormData();
    formData.append('image', file);
    
    // Construir un nombre único para la imagen usando el ID del comercio
    const imageName = `${comercioId}_${Date.now()}_${file.name}`;
    formData.append('name', imageName);

    try {
        const response = await fetch(`${IBB_UPLOAD_URL}?key=${IBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (result.success && result.data && result.data.url) {
            return result.data.url;
        } else {
            throw new Error(result.error?.message || 'Error desconocido al subir la imagen.');
        }
    } catch (error) {
        console.error('Error en la subida a imgbb:', error);
        throw error; // Re-lanzar el error para que el llamador pueda manejarlo.
    }
}