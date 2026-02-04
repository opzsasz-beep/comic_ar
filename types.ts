export enum ContentType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  MODEL_3D = 'MODEL_3D',
  AUDIO = 'AUDIO'
}

export interface ARContent {
  id: string;
  type: ContentType;
  src: string; // URL or Base64
  scale: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export interface ComicPage {
  id: string;
  pageNumber: number;
  targetImageSrc: string; // The comic panel image
  content: ARContent | null; // The overlay content
  narrationAudioSrc?: string; // Specific narration for this panel
  aiAnalysis?: {
    title: string;
    description: string;
  };
}

export interface ComicScene {
  id: string;
  name: string;
  description?: string;
  compiledTargetBuffer: string | null; // The .mind file containing ALL targets
  pages: ComicPage[];
}

// Augment window for MindAR
declare global {
  interface Window {
    MINDAR: any;
    AFRAME: any;
  }
}