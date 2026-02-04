import React, { useState, useEffect, useRef } from 'react';
import { ComicScene, ComicPage } from './types';
import ARView from './components/ARView';
import { COMIC_CONFIG } from './sceneConfig';
import { Loader2, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [scene, setScene] = useState<ComicScene | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("Iniciando...");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const compilerRef = useRef<any>(null);

  useEffect(() => {
    const bootstrapAR = async () => {
      try {
        setLoadingStep("Cargando imágenes de la historieta...");
        
        // 1. Cargar todas las imágenes objetivo para compilarlas
        const images: HTMLImageElement[] = [];
        
        for (const pageConfig of COMIC_CONFIG.pages) {
            const img = new Image();
            img.crossOrigin = "anonymous"; // Importante para URLs externas
            img.src = pageConfig.targetImageSrc;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${pageConfig.targetImageSrc}`));
            });
            images.push(img);
        }

        // 2. Compilar Targets usando MindAR
        setLoadingStep("Procesando visión por computador...");
        if (!window.MINDAR || !window.MINDAR.IMAGE) {
            throw new Error("La librería MindAR no se ha cargado correctamente.");
        }

        compilerRef.current = new window.MINDAR.IMAGE.Compiler();
        
        await compilerRef.current.compileImageTargets(images, (p: number) => {
            setLoadingStep(`Analizando características: ${Math.round(p)}%`);
            setProgress(p);
        });

        setLoadingStep("Generando experiencia AR...");
        const exportedBuffer = await compilerRef.current.exportData();
        
        // Convertir Uint8Array a Base64 string para mantener compatibilidad con tipos existentes
        const blob = new Blob([exportedBuffer]);
        const reader = new FileReader();
        
        reader.onload = () => {
            const base64Buffer = reader.result as string;
            
            // 3. Construir el objeto de escena final
            const builtPages: ComicPage[] = COMIC_CONFIG.pages.map((cfg, index) => ({
                id: uuidv4(),
                pageNumber: cfg.pageNumber,
                targetImageSrc: cfg.targetImageSrc,
                content: {
                    id: uuidv4(),
                    ...cfg.content
                },
                narrationAudioSrc: cfg.narrationAudioSrc,
                aiAnalysis: {
                    title: cfg.title || `Página ${index + 1}`,
                    description: cfg.description || ""
                }
            }));

            const newScene: ComicScene = {
                id: uuidv4(),
                name: COMIC_CONFIG.name,
                description: "Generado por código",
                compiledTargetBuffer: base64Buffer,
                pages: builtPages
            };

            setScene(newScene);
        };
        
        reader.readAsDataURL(blob);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error desconocido al iniciar la aplicación.");
      }
    };

    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(bootstrapAR, 500);

  }, []);

  // Vista de Error
  if (error) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Error de Inicialización</h1>
              <p className="text-slate-400 max-w-md">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-8 px-6 py-3 bg-brand-600 rounded-full font-bold"
              >
                  Reintentar
              </button>
          </div>
      );
  }

  // Vista de Carga (Compilando)
  if (!scene) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
              <div className="w-full max-w-xs relative">
                  {/* Visualización de la historieta cargando */}
                  <div className="aspect-[3/4] bg-slate-800 rounded-lg border-2 border-slate-700 mb-8 flex items-center justify-center relative overflow-hidden shadow-2xl shadow-brand-900/20">
                      <div 
                        className="absolute inset-0 bg-brand-500/20 transition-all duration-300" 
                        style={{ height: `${progress}%`, bottom: 0, top: 'auto' }}
                      />
                      <Loader2 className="w-12 h-12 text-brand-400 animate-spin relative z-10" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-center mb-2">{loadingStep}</h2>
                  <p className="text-slate-500 text-center text-sm">Por favor espera mientras preparamos la realidad aumentada.</p>
                  
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-6 overflow-hidden">
                      <div 
                        className="bg-brand-500 h-full transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }} 
                      />
                  </div>
              </div>
          </div>
      );
  }

  // Vista AR (Cámara Activa)
  // IMPORTANTE: bg-transparent permite ver el video de fondo
  return (
    <div className="w-full h-screen bg-transparent">
      <ARView 
        scene={scene} 
        onExit={() => {
            // En modo "sitio web dedicado", salir podría simplemente recargar para reiniciar
            if (window.confirm("¿Deseas reiniciar la experiencia?")) {
                window.location.reload();
            }
        }} 
      />
    </div>
  );
};

export default App;