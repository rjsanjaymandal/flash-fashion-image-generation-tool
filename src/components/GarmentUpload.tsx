import React from 'react';
import { DragDropZone } from './DragDropZone';

export interface GarmentMetadata {
  name: string;
  brand: string;
  material: string;
}

export interface GarmentData {
  file: File;
  metadata: GarmentMetadata;
}

interface GarmentUploadProps {
  garmentData: GarmentData | null;
  onGarmentChange: (data: GarmentData | null) => void;
}

export function GarmentUpload({ garmentData, onGarmentChange }: GarmentUploadProps) {
  const handleFileSelect = (file: File) => {
    onGarmentChange({
      file,
      metadata: garmentData?.metadata || { name: '', brand: '', material: '' }
    });
  };

  const handleClear = () => {
    onGarmentChange(null);
  };

  const handleMetadataChange = (field: keyof GarmentMetadata, value: string) => {
    if (garmentData) {
      onGarmentChange({
        ...garmentData,
        metadata: {
          ...garmentData.metadata,
          [field]: value
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DragDropZone
        label="Garment (Flat-lay or Ghost)"
        description="SVG, PNG, JPG or GIF (max. 10MB)"
        selectedFile={garmentData?.file || null}
        onFileSelect={handleFileSelect}
        onClear={handleClear}
      />
      
      {garmentData && (
        <div className="flex flex-col gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
          <h3 className="text-sm font-semibold text-zinc-700">Garment Details</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Name</label>
              <input
                type="text"
                value={garmentData.metadata.name}
                onChange={(e) => handleMetadataChange('name', e.target.value)}
                placeholder="e.g. Classic White T-Shirt"
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Brand</label>
                <input
                  type="text"
                  value={garmentData.metadata.brand}
                  onChange={(e) => handleMetadataChange('brand', e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Material</label>
                <input
                  type="text"
                  value={garmentData.metadata.material}
                  onChange={(e) => handleMetadataChange('material', e.target.value)}
                  placeholder="e.g. 100% Cotton"
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
