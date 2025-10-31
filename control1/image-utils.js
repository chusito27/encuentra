/**
 * Redimensiona una imagen a un tamaño específico (800x800), recortándola para que encaje
 * sin deformarse (comportamiento tipo "cover").
 * @param {File} file El archivo de imagen a redimensionar.
 * @returns {Promise<Blob>} Una promesa que se resuelve con la nueva imagen como un objeto Blob.
 */
export function resizeImage(file) {
    const targetWidth = 800;
    const targetHeight = 800;

    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        const reader = new FileReader();

        // Cuando el archivo se lee, se carga en el elemento <img>
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = reject;

        // Cuando la imagen se ha cargado en el <img>, la dibujamos en el canvas
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            const sourceAspectRatio = img.width / img.height;
            const targetAspectRatio = targetWidth / targetHeight; // Siempre será 1

            let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;

            // Lógica para recortar la imagen y que llene el canvas de 800x800
            if (sourceAspectRatio > targetAspectRatio) {
                // La imagen es más ancha que alta, recortar los lados
                sourceWidth = img.height * targetAspectRatio;
                sourceX = (img.width - sourceWidth) / 2;
            } else if (sourceAspectRatio < targetAspectRatio) {
                // La imagen es más alta que ancha, recortar arriba y abajo
                sourceHeight = img.width / targetAspectRatio;
                sourceY = (img.height - sourceHeight) / 2;
            }

            // Dibujar la porción recortada de la imagen en todo el canvas
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

            // Convertir el canvas de vuelta a un archivo Blob
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Error al crear el Blob de la imagen redimensionada.'));
                }
            }, 'image/jpeg', 0.9); // Comprimir a JPEG con 90% de calidad
        };

        // Iniciar la lectura del archivo
        reader.readAsDataURL(file);
    });
}