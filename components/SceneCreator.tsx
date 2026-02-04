import React, { useState, useRef } from 'react';
import { ComicScene, ARContent, ContentType, ComicPage } from '../types';
import { analyzeComicPage, generateNarration } from '../services/geminiService';
import { Camera, Mic, Image as ImageIcon, Box, Video, X, Loader2, Sparkles, Plus, Trash2, Save, Layers } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onSave: (scene: ComicScene) => void;
  onCancel: () => void;
}

const SceneCreator: React.FC<Props> = ({ onSave, onCancel }) => {
  // Global Scene State
  const [sceneName, setSceneName] = useState("My Comic Issue");
  const [pages, setPages] = useState<ComicPage[]>([]);
  
  // Compiler State
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);

  // New Page Form State
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [tempTargetImg, setTempTargetImg] = useState<string | null>(null);
  const [tempContent, setTempContent] = useState<ARContent | null>(null);
  const [tempNarration, setTempNarration] = useState<string | null>(null);
  const [tempAiData, setTempAiData] = useState<{title: string, description: string, narration: string} | null>(null);
  
  // Loading States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Handle Target Upload & Analysis
  const handleTargetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const src = event.target?.result as string;
        setTempTargetImg(src);
        
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeComicPage(src);
          setTempAiData({
            title: analysis.title || "",
            description: analysis.description || "",
            narration: analysis.narrationScript || ""
          });
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Generate Audio for Temp Page
  const handleGenerateAudio = async () => {
    if (!tempAiData?.narration) return;
    setIsGeneratingTTS(true);
    try {
        const audioData = await generateNarration(tempAiData.narration);
        if (audioData) setTempNarration(audioData);
    } catch (e) {
        alert("Failed to generate audio");
    } finally {
        setIsGeneratingTTS(false);
    }
  };

  // 3. Add Content to Temp Page
  const handleAddContent = (type: ContentType) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (type === ContentType.IMAGE) input.accept = 'image/*';
    if (type === ContentType.VIDEO) input.accept = 'video/mp4,video/webm';
    if (type === ContentType.MODEL_3D) input.accept = '.glb,.gltf';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const newContent: ARContent = {
            id: uuidv4(),
            type,
            src: evt.target?.result as string,
            scale: type === ContentType.MODEL_3D ? {x: 0.1, y: 0.1, z: 0.1} : { x: 1, y: 1, z: 1 },
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
          };
          setTempContent(newContent); // Only allow 1 content per page for simplicity as requested
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // 4. Save Page to List
  const savePage = () => {
    if (!tempTargetImg) return;
    
    const newPage: ComicPage = {
        id: uuidv4(),
        pageNumber: pages.length + 1,
        targetImageSrc: tempTargetImg,
        content: tempContent,
        narrationAudioSrc: tempNarration || undefined,
        aiAnalysis: tempAiData ? { title: tempAiData.title, description: tempAiData.description } : undefined
    };

    setPages([...pages, newPage]);
    resetForm();
  };

  const resetForm = () => {
    setIsAddingPage(false);
    setTempTargetImg(null);
    setTempContent(null);
    setTempNarration(null);
    setTempAiData(null);
  };

  // 5. Final Compilation
  const compileAndSave = async () => {
    if (pages.length === 0) return;
    setIsCompiling(true);

    try {
        // Load all images for the compiler
        const images: HTMLImageElement[] = [];
        for (const page of pages) {
            const img = new Image();
            img.src = page.targetImageSrc;
            await new Promise((resolve) => { img.onload = resolve; });
            images.push(img);
        }

        const compiler = new window.MINDAR.IMAGE.Compiler();
        await compiler.compileImageTargets(images, (progress: number) => {
            setCompileProgress(Math.round(progress));
        });

        const exportedBuffer = await compiler.exportData();
        const blob = new Blob([exportedBuffer]);
        const reader = new FileReader();
        reader.onload = () => {
            onSave({
                id: uuidv4(),
                name: sceneName,
                description: `${pages.length} interactive pages`,
                compiledTargetBuffer: reader.result as string,
                pages: pages
            });
            setIsCompiling(false);
        };
        reader.readAsDataURL(blob);

    } catch (err) {
        console.error(err);
        setIsCompiling(false);
        alert("Compilation failed. Ensure images are distinct.");
    }
  };

  // Render Form for Adding a Page
  if (isAddingPage) {
    return (
        <div className="min-h-screen bg-slate-900 p-4">
            <div className="max-w-2xl mx-auto bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700 p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Add Comic Page #{pages.length + 1}</h2>
                    <button onClick={resetForm} className="text-slate-400"><X /></button>
                </div>

                {/* Target Image */}
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-slate-500">1. Target Image (Comic Panel)</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-600 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 relative overflow-hidden"
                    >
                        {tempTargetImg ? (
                            <img src={tempTargetImg} alt="Target" className="w-full h-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center text-slate-500">
                                <Camera className="mb-2" />
                                <span>Upload Image</span>
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleTargetUpload} />
                    </div>
                </div>

                {/* AI & Audio */}
                {tempTargetImg && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-4">
                        <div className="flex items-center gap-2 text-brand-400 font-bold">
                            <Sparkles size={16} /> Analysis
                        </div>
                        {isAnalyzing ? (
                             <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin w-4 h-4" /> Analyzing...</div>
                        ) : tempAiData && (
                            <>
                                <input 
                                    value={tempAiData.title} 
                                    onChange={e => setTempAiData({...tempAiData, title: e.target.value})}
                                    className="w-full bg-slate-800 border-none rounded text-white font-bold"
                                />
                                <div className="flex gap-2">
                                    <textarea 
                                        value={tempAiData.narration} 
                                        onChange={e => setTempAiData({...tempAiData, narration: e.target.value})}
                                        className="w-full bg-slate-800 rounded p-2 text-xs text-slate-300 h-16"
                                        placeholder="Narration script"
                                    />
                                    <button 
                                        onClick={handleGenerateAudio}
                                        disabled={isGeneratingTTS || !!tempNarration}
                                        className={`px-3 rounded-lg flex items-center justify-center ${tempNarration ? 'bg-green-600' : 'bg-indigo-600'}`}
                                    >
                                        {isGeneratingTTS ? <Loader2 className="animate-spin" /> : <Mic />}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Content Overlay */}
                <div className="space-y-2">
                     <label className="text-xs uppercase font-bold text-slate-500">2. AR Content Overlay</label>
                     {!tempContent ? (
                         <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleAddContent(ContentType.IMAGE)} className="p-3 bg-slate-700 rounded-lg flex flex-col items-center gap-1 hover:bg-slate-600">
                                <ImageIcon size={20} className="text-brand-400"/> <span className="text-[10px]">Image</span>
                            </button>
                            <button onClick={() => handleAddContent(ContentType.VIDEO)} className="p-3 bg-slate-700 rounded-lg flex flex-col items-center gap-1 hover:bg-slate-600">
                                <Video size={20} className="text-red-400"/> <span className="text-[10px]">Video</span>
                            </button>
                            <button onClick={() => handleAddContent(ContentType.MODEL_3D)} className="p-3 bg-slate-700 rounded-lg flex flex-col items-center gap-1 hover:bg-slate-600">
                                <Box size={20} className="text-green-400"/> <span className="text-[10px]">3D</span>
                            </button>
                         </div>
                     ) : (
                         <div className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                             <div className="flex items-center gap-3">
                                 {tempContent.type === ContentType.VIDEO ? <Video size={16}/> : <Box size={16}/>}
                                 <span className="text-sm font-bold">{tempContent.type} Added</span>
                             </div>
                             <button onClick={() => setTempContent(null)} className="text-red-400"><X size={16}/></button>
                         </div>
                     )}
                </div>

                <button 
                    disabled={!tempTargetImg}
                    onClick={savePage}
                    className="w-full py-3 bg-brand-600 disabled:bg-slate-700 rounded-xl font-bold"
                >
                    Add Page to Scene
                </button>
            </div>
        </div>
    );
  }

  // Render Scene Overview (Deck Builder)
  return (
    <div className="min-h-screen bg-slate-900 p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
            <header className="flex justify-between items-center">
                <button onClick={onCancel} className="text-slate-400">Cancel</button>
                <h1 className="font-bold text-lg">Create Comic Scene</h1>
                <div className="w-10" />
            </header>

            <div className="space-y-2">
                <label className="text-xs text-slate-500 uppercase font-bold">Comic Name</label>
                <input 
                    value={sceneName} 
                    onChange={(e) => setSceneName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-lg font-bold focus:outline-none focus:border-brand-500"
                    placeholder="e.g. Spiderman #42 Page 3"
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-500 uppercase font-bold">Pages ({pages.length})</label>
                </div>

                {pages.map((p, idx) => (
                    <div key={p.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex gap-4 items-center">
                        <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
                            <img src={p.targetImageSrc} className="w-full h-full object-cover opacity-70" />
                            <div className="absolute top-1 left-1 w-5 h-5 bg-white text-black text-xs font-bold rounded-full flex items-center justify-center">
                                {idx + 1}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate">{p.aiAnalysis?.title || `Page ${idx+1}`}</h3>
                            <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                {p.content && <span className="flex items-center gap-1"><Layers size={10}/> {p.content.type}</span>}
                                {p.narrationAudioSrc && <span className="flex items-center gap-1"><Mic size={10}/> Audio</span>}
                            </div>
                        </div>
                        <button onClick={() => setPages(pages.filter(page => page.id !== p.id))} className="text-slate-600 hover:text-red-400 p-2">
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}

                <button 
                    onClick={() => setIsAddingPage(true)}
                    className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Add Page Target
                </button>
            </div>
            
            <div className="fixed bottom-6 left-0 right-0 px-4 max-w-md mx-auto">
                <button 
                    disabled={pages.length === 0 || isCompiling}
                    onClick={compileAndSave}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl font-bold shadow-xl shadow-black/50 flex items-center justify-center gap-2 text-lg"
                >
                    {isCompiling ? (
                        <>Building AR File ({compileProgress}%) <Loader2 className="animate-spin"/></>
                    ) : (
                        <>Save & Launch <Save size={20}/></>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};

export default SceneCreator;