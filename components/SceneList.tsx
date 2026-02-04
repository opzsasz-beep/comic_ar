import React from 'react';
import { ComicScene } from '../types';
import { Plus, Trash2, Play, BookOpen } from 'lucide-react';

interface Props {
  scenes: ComicScene[];
  onCreate: () => void;
  onLaunch: (scene: ComicScene) => void;
  onDelete: (id: string) => void;
}

const SceneList: React.FC<Props> = ({ scenes, onCreate, onLaunch, onDelete }) => {
  return (
    <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-purple-500 tracking-tight">
          ComicAR
        </h1>
        <p className="text-slate-400 mt-2">Bring your comics to life with AI & AR.</p>
      </header>

      <div className="flex-1 space-y-4">
        {scenes.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
            <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No scenes created yet.</p>
            <p className="text-sm text-slate-500 mb-6">Scan a page to get started.</p>
            <button 
              onClick={onCreate}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-full font-bold shadow-lg shadow-brand-900/50 transition-all"
            >
              Create First Scene
            </button>
          </div>
        ) : (
          scenes.map((scene) => (
            <div key={scene.id} className="bg-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-lg border border-slate-700/50">
              <div className="w-20 h-20 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                <img src={scene.pages[0]?.targetImageSrc} alt="Target" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                    {scene.pages.length} pgs
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{scene.name}</h3>
                <p className="text-xs text-slate-400 truncate">{scene.description || 'No description'}</p>
                <div className="flex gap-2 mt-2 text-xs text-slate-500">
                  <span className="bg-slate-900/50 px-2 py-1 rounded">{scene.pages.length} Targets</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => onLaunch(scene)}
                  className="p-3 bg-brand-600 hover:bg-brand-500 rounded-lg text-white shadow-md transition-colors"
                  aria-label="Launch AR"
                >
                  <Play size={20} fill="currentColor" />
                </button>
                <button 
                  onClick={() => onDelete(scene.id)}
                  className="p-3 bg-slate-700 hover:bg-red-900/50 hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {scenes.length > 0 && (
        <div className="sticky bottom-6 mt-6">
          <button 
            onClick={onCreate}
            className="w-full py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold shadow-xl shadow-brand-900/50 flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={24} />
            New Comic Scene
          </button>
        </div>
      )}
    </div>
  );
};

export default SceneList;