import React, { useEffect, useRef, useState } from 'react';
import { ComicScene, ContentType } from '../types';
import { X, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface Props {
  scene: ComicScene;
  onExit: () => void;
}

const ARView: React.FC<Props> = ({ scene, onExit }) => {
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("Initializing AR...");
  const [isARReady, setIsARReady] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isMountedRef = useRef(false);
  
  // Track previous index to stop audio when switching targets
  const prevIndexRef = useRef<number | null>(null);

  // Helper to play base64 audio
  const playAudio = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        // Use 24000 sample rate as per Gemini TTS specs
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e){}
      }

      // Handle optional data URI prefix if present
      const base64 = base64Audio.includes('base64,') ? base64Audio.split('base64,')[1] : base64Audio;
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcmData = new Int16Array(bytes.buffer);

      // Create Buffer (Mono, 24kHz)
      const buffer = ctx.createBuffer(1, pcmData.length, 24000);
      const channelData = buffer.getChannelData(0);
      
      // Convert Int16 to Float32 [-1.0, 1.0]
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      audioSourceRef.current = source;
      setIsPlayingAudio(true);
      
      source.onended = () => setIsPlayingAudio(false);

    } catch (e) {
      console.error("Audio Playback Error", e);
    }
  };

  const stopAudio = () => {
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e){}
      }
      setIsPlayingAudio(false);
  };

  const toggleAudio = () => {
    if (activePageIndex === null) return;
    const page = scene.pages[activePageIndex];
    
    if (isPlayingAudio) {
      stopAudio();
    } else if (page.narrationAudioSrc) {
      playAudio(page.narrationAudioSrc);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const arContainer = document.getElementById('ar-container');
    if (!arContainer) return;

    // Reset container to ensure clean slate
    arContainer.innerHTML = '';
    setStatusMsg("Building Scene...");
    
    // Store object URLs for the compiled target file only
    let mindFileUrl = '';

    const initAR = async () => {
        if (!isMountedRef.current) return;

        try {
            // 1. Create compiled mind file URL
            if (scene.compiledTargetBuffer) {
                try {
                    const parts = scene.compiledTargetBuffer.split(',');
                    const base64Data = parts.length > 1 ? parts[1] : parts[0];
                    const binaryStr = atob(base64Data);
                    const len = binaryStr.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], {type: 'application/octet-stream'});
                    mindFileUrl = URL.createObjectURL(blob);
                } catch (e) {
                    console.error("Failed to process compiled target", e);
                    setStatusMsg("Error: Invalid Target File");
                    return;
                }
            } else {
                setStatusMsg("Error: No compiled target found.");
                return;
            }

            // 2. Generate HTML directly (Simplified: Removed complex Blob conversion for assets)
            let assetsHtml = '';
            scene.pages.forEach((page, idx) => {
                if (!page.content) return;
                const c = page.content;
                const id = `asset-page-${idx}`;
                
                if (c.type === ContentType.IMAGE || c.type === ContentType.VIDEO) {
                    const tag = c.type === ContentType.VIDEO ? 'video' : 'img';
                    const extra = c.type === ContentType.VIDEO 
                        ? 'loop="true" preload="auto" playsinline webkit-playsinline crossorigin="anonymous"' 
                        : 'crossorigin="anonymous"';
                    
                    assetsHtml += `<${tag} id="${id}" src="${c.src}" ${extra}></${tag}>\n`;
                } else if (c.type === ContentType.MODEL_3D) {
                    // Direct usage of src again
                    assetsHtml += `<a-asset-item id="${id}" src="${c.src}"></a-asset-item>\n`;
                }
            });

            const entitiesHtml = scene.pages.map((page, idx) => {
                const c = page.content;
                const targetId = `target-${idx}`;
                
                if (!c) {
                     return `<a-entity mindar-image-target="targetIndex: ${idx}" id="${targetId}"></a-entity>`;
                }

                let innerContent = '';
                const assetId = `#asset-page-${idx}`;
                const scaleStr = `${c.scale.x} ${c.scale.y} ${c.scale.z}`;

                if (c.type === ContentType.MODEL_3D) {
                    innerContent = `<a-gltf-model rotation="0 0 0" position="0 0 0" scale="${scaleStr}" src="${assetId}" animation="property: rotation; to: 0 360 0; loop: true; dur: 10000; easing: linear"></a-gltf-model>`;
                } else if (c.type === ContentType.VIDEO) {
                    innerContent = `<a-video src="${assetId}" width="1" height="0.552" position="0 0 0" rotation="0 0 0" scale="${scaleStr}"></a-video>`;
                } else {
                    innerContent = `<a-image src="${assetId}" width="1" height="1" position="0 0 0" rotation="0 0 0" opacity="0.9" scale="${scaleStr}"></a-image>`;
                }

                return `
                <a-entity mindar-image-target="targetIndex: ${idx}" id="${targetId}">
                    ${innerContent}
                </a-entity>`;
            }).join('\n');

            // ENABLE uiScanning: yes so user sees the scanning bracket
            const sceneHtml = `
            <a-scene 
                mindar-image="imageTargetSrc: ${mindFileUrl}; autoStart: true; uiLoading: yes; uiScanning: yes; uiError: yes;" 
                color-space="sRGB" 
                renderer="colorManagement: true, physicallyCorrectLights" 
                vr-mode-ui="enabled: false" 
                device-orientation-permission-ui="enabled: false">
                
                <a-assets timeout="10000">
                    ${assetsHtml}
                </a-assets>

                <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

                <a-light type="ambient" color="#ffffff" intensity="1"></a-light>
                <a-light type="directional" color="#ffffff" intensity="1.5" position="1 2 3"></a-light>

                ${entitiesHtml}
            </a-scene>
            `;

            if (isMountedRef.current) {
                arContainer.innerHTML = sceneHtml;
            }

            // 3. Attach Listeners
            const sceneEl = arContainer.querySelector('a-scene');
            
            if (sceneEl) {
                const onLoaded = () => {
                    if (!isMountedRef.current) return;
                    console.log("A-Frame Scene Loaded");
                    setStatusMsg("");
                    setIsARReady(true);

                    // Force retry video play if needed
                    const videos = document.querySelectorAll('video');
                    videos.forEach(v => v.play().catch(() => {}));
                    
                    // Attach listeners
                    const targets = arContainer.querySelectorAll('[mindar-image-target]');
                    targets.forEach((target) => {
                        const idStr = target.id; 
                        const indexStr = idStr.split('-')[1];
                        const targetIndex = parseInt(indexStr);
                        if (isNaN(targetIndex)) return;

                        target.addEventListener('targetFound', () => {
                            console.log("Found:", targetIndex);
                            setActivePageIndex(targetIndex);

                            const page = scene.pages[targetIndex];
                            if (page?.narrationAudioSrc && prevIndexRef.current !== targetIndex) {
                                playAudio(page.narrationAudioSrc);
                            }
                            if (page?.content?.type === ContentType.VIDEO) {
                                const videoEl = document.getElementById(`asset-page-${targetIndex}`) as HTMLVideoElement;
                                if (videoEl) {
                                    videoEl.currentTime = 0; 
                                    videoEl.play().catch(e => console.log("Play error:", e));
                                }
                            }
                            prevIndexRef.current = targetIndex;
                        });

                        target.addEventListener('targetLost', () => {
                            const page = scene.pages[targetIndex];
                            if (page?.content?.type === ContentType.VIDEO) {
                                const videoEl = document.getElementById(`asset-page-${targetIndex}`) as HTMLVideoElement;
                                if (videoEl) videoEl.pause();
                            }
                        });
                    });
                };

                sceneEl.addEventListener('loaded', onLoaded);
                
                // Fallback for load event
                setTimeout(() => {
                    if (isMountedRef.current && !isARReady && (sceneEl as any).hasLoaded) {
                         onLoaded();
                    }
                }, 3000);

                sceneEl.addEventListener('arError', (event: any) => {
                    setStatusMsg("Camera Error: " + (event.detail?.error || "Check permissions"));
                });
                
                sceneEl.addEventListener('arReady', () => {
                     if (isMountedRef.current) {
                        setIsARReady(true);
                        setStatusMsg(""); 
                    }
                });
            }

        } catch (e) {
            console.error("Error initializing AR", e);
            setStatusMsg("Error initializing AR: " + e);
        }
    };

    const timeoutId = setTimeout(initAR, 100);

    return () => {
        isMountedRef.current = false;
        clearTimeout(timeoutId);
        stopAudio();
        
        const arScene = arContainer.querySelector('a-scene');
        if (arScene) {
            const system = (arScene as any).systems?.['mindar-image-system'];
            if (system) {
                try { system.stop(); } catch(e){}
            }
        }
        
        arContainer.innerHTML = '';
        if (mindFileUrl) URL.revokeObjectURL(mindFileUrl);
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };
  }, [scene]);

  const activePage = activePageIndex !== null ? scene.pages[activePageIndex] : null;

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-6">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={onExit} className="p-3 bg-slate-900/80 backdrop-blur text-white rounded-full shadow-lg">
            <X size={24} />
          </button>

          {activePage?.narrationAudioSrc && (
              <button 
                onClick={toggleAudio}
                className={`p-3 backdrop-blur rounded-full shadow-lg transition-all ${isPlayingAudio ? 'bg-indigo-500 text-white' : 'bg-slate-900/80 text-slate-400'}`}
              >
                  {isPlayingAudio ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
          )}
        </div>

        {statusMsg && (
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl flex items-center gap-3 backdrop-blur pointer-events-auto">
                 <Loader2 className="animate-spin" />
                 <span>{statusMsg}</span>
             </div>
        )}
        
        <div className="pointer-events-auto">
            {activePage && (
                <div className="bg-slate-900/90 backdrop-blur p-4 rounded-xl border border-slate-700/50 shadow-xl max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="font-bold text-lg text-white">{activePage.aiAnalysis?.title || `Page ${activePage.pageNumber}`}</h2>
                    <p className="text-sm text-slate-300">{activePage.aiAnalysis?.description}</p>
                </div>
            )}
        </div>
      </div>
    </>
  );
};

export default ARView;