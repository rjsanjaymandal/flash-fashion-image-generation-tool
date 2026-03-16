import React, { useState, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, X } from 'lucide-react';

interface DragDropZoneProps {
  label: string;
  description: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  accept3D?: boolean;
  exposure?: number;
  shadowIntensity?: number;
  shadowSoftness?: number;
  lightDirection?: number;
  environment?: string;
  ambientColor?: string;
  ambientIntensity?: number;
}

export function DragDropZone({ 
  label, 
  description, 
  onFileSelect, 
  selectedFile, 
  onClear, 
  accept3D, 
  exposure = 1, 
  shadowIntensity = 1,
  shadowSoftness = 1,
  lightDirection = 0,
  environment = 'neutral',
  ambientColor = '#ffffff',
  ambientIntensity = 1
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/') || (accept3D && file.name.match(/\.(glb|gltf)$/i))) {
          onFileSelect(file);
          setPreviewUrl(URL.createObjectURL(file));
        }
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        if (file.type.startsWith('image/') || (accept3D && file.name.match(/\.(glb|gltf)$/i))) {
          onFileSelect(file);
          setPreviewUrl(URL.createObjectURL(file));
        }
      }
    },
    [onFileSelect]
  );

  const clearFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [onClear, previewUrl]);

  // Update preview if selectedFile changes externally (or is cleared)
  React.useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
    } else if (!previewUrl) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  }, [selectedFile, previewUrl]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden
          ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100'}
          ${selectedFile ? 'border-solid border-zinc-200' : ''}
        `}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          accept={accept3D ? "image/*,.glb,.gltf" : "image/*"}
          onChange={handleFileInput}
          disabled={!!selectedFile}
        />

        {previewUrl ? (
          <div className="relative w-full h-full group">
            {selectedFile?.name.match(/\.(glb|gltf)$/i) ? (
              <model-viewer
                src={previewUrl}
                camera-controls
                auto-rotate
                exposure={exposure}
                shadow-intensity={shadowIntensity}
                shadow-softness={shadowSoftness}
                environment-image={environment === 'neutral' ? '' : environment}
                environment-rotation={`0 ${lightDirection}deg 0`}
                ambient-light-color={ambientColor}
                ambient-light-intensity={ambientIntensity}
                style={{ width: '100%', height: '100%' }}
                id="custom-model-viewer-element"
                crossorigin="anonymous"
              ></model-viewer>
            ) : (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-none">
              <button
                onClick={clearFile}
                className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors pointer-events-auto"
              >
                <X size={24} />
              </button>
            </div>
            {selectedFile?.name.match(/\.(glb|gltf)$/i) && (
              <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-10">
                <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md">
                  Drag to rotate 3D model
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center z-0 pointer-events-none">
            <div className="w-12 h-12 mb-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <UploadCloud size={24} />
            </div>
            <p className="mb-2 text-sm font-semibold text-zinc-700">Click to upload or drag and drop</p>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
