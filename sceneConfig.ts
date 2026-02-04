import { ContentType } from './types';

// ============================================================================
// CONFIGURACIÓN DE LA HISTORIETA AR
// ============================================================================
// Aquí defines las páginas de tu cómic y qué debe aparecer en cada una.
// Puedes usar URLs externas (https://...) o importar archivos locales si configuras un bundler.
// Nota: Para probar, asegúrate de que las URLs de imágenes permitan CORS (Access-Control-Allow-Origin).

export const COMIC_CONFIG = {
  name: "Mi Historieta AR",
  pages: [
    {
      pageNumber: 1,
      // IMAGEN OBJETIVO (Lo que la cámara busca)
      // Usamos una imagen de ejemplo de MindAR que tiene alto contraste y puntos característicos.
      // Las imágenes simples (texto plano, gráficos lineales) no funcionan bien.
      targetImageSrc: "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.0/examples/image-tracking/assets/card-example/card.png", 
      
      // CONTENIDO AR (Lo que aparece encima)
      content: {
        type: ContentType.MODEL_3D, // Opciones: MODEL_3D, VIDEO, IMAGE
        // Modelo 3D de ejemplo
        src: "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.0/examples/image-tracking/assets/card-example/softmind/scene.gltf",
        scale: { x: 0.005, y: 0.005, z: 0.005 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      },
      
      // (Opcional) Audio de narración
      narrationAudioSrc: undefined, 
      
      // Datos para la UI
      title: "El Comienzo",
      description: "Escena de demostración con un modelo 3D."
    }
  ]
};