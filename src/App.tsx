import React, { useState } from 'react';
import { DragDropZone } from './components/DragDropZone';
import { GarmentUpload, GarmentData } from './components/GarmentUpload';
import { ModelSelector, ModelData } from './components/ModelSelector';
import { Wand2, Layers, Sparkles, Settings2, Image as ImageIcon, Undo2, Redo2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [garmentData, setGarmentData] = useState<GarmentData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetPose, setTargetPose] = useState<'front' | 'back'>('front');
  
  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Helper to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove the data:image/[type];base64, prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setResultImage(history[newIndex]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setResultImage(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setResultImage(history[newIndex]);
    }
  };

  const handleGenerate = async () => {
    if (!modelData || !garmentData) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Convert images to base64
      let modelBase64 = '';
      let modelMimeType = 'image/jpeg';

      if (modelData.type === 'custom' && modelData.file) {
        if (modelData.file.name.match(/\.(glb|gltf)$/i)) {
          const modelViewer = document.getElementById('custom-model-viewer-element') as any;
          if (modelViewer) {
            const dataUrl = modelViewer.toDataURL('image/jpeg', 0.9);
            modelBase64 = dataUrl.split(',')[1];
            modelMimeType = 'image/jpeg';
          } else {
            throw new Error("Custom 3D model viewer not found");
          }
        } else {
          modelBase64 = await fileToBase64(modelData.file);
          modelMimeType = modelData.file.type;
        }
      } else if (modelData.type === 'predefined-3d') {
        const modelViewer = document.getElementById('model-viewer-element') as any;
        if (modelViewer) {
          const dataUrl = modelViewer.toDataURL('image/jpeg', 0.9);
          modelBase64 = dataUrl.split(',')[1];
          modelMimeType = 'image/jpeg';
        } else {
          throw new Error("3D model viewer not found");
        }
      } else if (modelData.type === 'predefined-2d' && modelData.url) {
        const response = await fetch(modelData.url);
        const blob = await response.blob();
        modelBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onload = () => {
            const base64String = reader.result as string;
            resolve(base64String.split(',')[1]);
          };
          reader.onerror = reject;
        });
        modelMimeType = blob.type;
      } else {
        throw new Error("Invalid model selection");
      }

      const garmentBase64 = await fileToBase64(garmentData.file);
      
      // Construct the prompt with metadata if available
      let promptText = targetPose === 'back'
        ? "Create a photorealistic virtual try-on image showing the BACK VIEW of the person. The person from the first image should be turned around facing away from the camera, wearing the garment shown in the second image. This is specifically to showcase the back design of the t-shirt/garment. Ensure the back design is clearly visible, fits naturally, and preserves the garment's texture, color, and any back logos or patterns."
        : "Create a photorealistic virtual try-on image. The person in the first image should be wearing the garment shown in the second image. Ensure the garment fits naturally, respecting the person's pose and body shape. Preserve the garment's texture, color, and any logos or patterns.";
      
      if (garmentData.metadata.name || garmentData.metadata.brand || garmentData.metadata.material) {
        promptText += " Garment details to preserve: ";
        const details = [];
        if (garmentData.metadata.name) details.push(`Name: ${garmentData.metadata.name}`);
        if (garmentData.metadata.brand) details.push(`Brand: ${garmentData.metadata.brand}`);
        if (garmentData.metadata.material) details.push(`Material: ${garmentData.metadata.material}`);
        promptText += details.join(", ") + ".";
      }

      // Call Gemini API for image editing/generation with retry mechanism
      const MAX_RETRIES = 3;
      let attempt = 0;
      let success = false;
      let lastError: any = null;

      while (attempt < MAX_RETRIES && !success) {
        try {
          if (attempt > 0) {
            setRetryCount(attempt);
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
          }

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: modelBase64,
                    mimeType: modelMimeType,
                  },
                },
                {
                  inlineData: {
                    data: garmentBase64,
                    mimeType: garmentData.file.type,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
            config: {
              imageConfig: {
                aspectRatio: "3:4" // Fashion standard aspect ratio
              }
            }
          });

          // Find the image part in the response
          let foundImage = false;
          if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                const base64EncodeString = part.inlineData.data;
                const imageUrl = `data:image/png;base64,${base64EncodeString}`;
                setResultImage(imageUrl);
                
                // Update history
                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(imageUrl);
                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
                
                foundImage = true;
                break;
              }
            }
          }

          if (!foundImage) {
            throw new Error("No image was generated. Please try again with different images or prompt.");
          }

          success = true;
        } catch (err: any) {
          console.error(`Generation attempt ${attempt + 1} failed:`, err);
          lastError = err;
          attempt++;
        }
      }

      if (!success) {
        throw lastError || new Error("An error occurred during image generation after multiple attempts.");
      }

    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An error occurred during image generation.");
    } finally {
      setIsGenerating(false);
      setRetryCount(0);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `try-on-result-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight">AI Fashion Studio</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
            <a href="#" className="text-indigo-600">Virtual Try-On</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Batch Processing</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Model Generation</a>
          </nav>
          <div className="flex items-center gap-3">
            <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors">
              <Settings2 size={20} />
            </button>
            <button className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-zinc-800 transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Advanced Virtual Try-On</h1>
          <p className="text-zinc-600 text-lg">
            Upload a model and a garment to generate photorealistic try-on composites. Our AI preserves fine details, logos, and textures.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
              <div className="flex items-center gap-2 mb-6">
                <Layers className="text-indigo-600" size={20} />
                <h2 className="text-xl font-semibold">Source Images</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModelSelector
                  modelData={modelData}
                  onModelChange={setModelData}
                />
                <GarmentUpload
                  garmentData={garmentData}
                  onGarmentChange={setGarmentData}
                />
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-zinc-700">Target View</div>
                  <div className="flex bg-zinc-100 p-1 rounded-lg w-fit">
                    <button
                      onClick={() => setTargetPose('front')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${targetPose === 'front' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Front View
                    </button>
                    <button
                      onClick={() => setTargetPose('back')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${targetPose === 'back' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Back View
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {modelData && garmentData 
                      ? "Ready to generate" 
                      : "Please select a model and garment to continue"}
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!modelData || !garmentData || isGenerating}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all
                    ${modelData && garmentData && !isGenerating
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5' 
                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} />
                      Generate Try-On
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 h-full min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Result</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handleUndo} 
                    disabled={historyIndex < 0 || isGenerating}
                    className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo"
                  >
                    <Undo2 size={18} />
                  </button>
                  <button 
                    onClick={handleRedo} 
                    disabled={historyIndex >= history.length - 1 || isGenerating}
                    className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Redo"
                  >
                    <Redo2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 relative rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                {isGenerating ? (
                  <div className="flex flex-col items-center text-zinc-500">
                    <div className="w-10 h-10 mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="font-medium animate-pulse">
                      {retryCount > 0 ? `Retrying (Attempt ${retryCount + 1}/3)...` : 'Synthesizing image...'}
                    </p>
                    <p className="text-xs mt-2 text-zinc-400">
                      {retryCount > 0 ? 'Recovering from transient error' : 'Applying geometry-aware warping'}
                    </p>
                  </div>
                ) : error ? (
                  <div className="text-center p-6 text-red-500">
                    <p className="font-medium mb-2">Generation Failed</p>
                    <p className="text-sm">{error}</p>
                  </div>
                ) : resultImage ? (
                  <img 
                    src={resultImage} 
                    alt="Generated Try-On" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-zinc-400">
                    <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Generated image will appear here</p>
                  </div>
                )}
              </div>
              
              {resultImage && !isGenerating && (
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={handleDownload}
                    className="flex-1 px-4 py-2 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    Download HD
                  </button>
                  <button className="px-4 py-2 bg-zinc-100 text-zinc-700 font-medium rounded-xl hover:bg-zinc-200 transition-colors">
                    Save to Project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
