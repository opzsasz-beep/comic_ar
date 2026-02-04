import { GoogleGenAI, Modality } from "@google/genai";

const getAI = () => {
    // In a real app, never hardcode, but for this demo environment, we assume process.env.API_KEY is available
    if (!process.env.API_KEY) {
        throw new Error("API Key is missing");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Analyze the comic page to get a title, description, and a narration script
export const analyzeComicPage = async (base64Image: string) => {
    const ai = getAI();
    
    // Clean base64 string if it has prefix
    const data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const prompt = `
    Analyze this comic book page/panel. 
    1. Provide a short, catchy title for this scene.
    2. Provide a 1-sentence description.
    3. Write a short, dramatic narration script (max 30 words) that describes what is happening, suitable for a text-to-speech voiceover.
    
    Return the response in JSON format with keys: "title", "description", "narrationScript".
    IMPORTANT: Return ONLY the JSON string. Do not use markdown code blocks.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: data } },
                    { text: prompt }
                ]
            }
        });

        if (response.text) {
            let jsonStr = response.text.trim();
            // Robustly strip markdown code blocks if the model includes them despite instructions
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
            return JSON.parse(jsonStr);
        }
        throw new Error("No response text from Gemini");
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        // Fallback to avoid crashing the UI if analysis fails
        return {
            title: "New Comic Scene",
            description: "Auto-analysis failed. Please add details manually.",
            narrationScript: ""
        };
    }
};

// Generate TTS Audio for the narration
export const generateNarration = async (text: string) => {
    const ai = getAI();

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Deep, dramatic voice suitable for comics
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio; // Return raw PCM base64
        }
        return null;
    } catch (error) {
        console.error("Gemini TTS Error:", error);
        throw error;
    }
};

// Helper to add WAV header to raw PCM (Gemini returns raw PCM often)
// This is necessary to play it in a standard <audio> tag or A-Frame without manual AudioContext piping.
export const pcmToWav = (base64PCM: string) => {
   // Implementation of adding WAV header is complex. 
   // For this demo, we will rely on the AudioContext playback method in the component 
   // instead of generating a file URL.
   return base64PCM;
}