import React, { useState, useEffect } from 'react';
import { DragDropZone } from './DragDropZone';
import { User, Upload, CheckCircle2, Box, ArrowLeft, Plus, X } from 'lucide-react';
import '@google/model-viewer';
import * as THREE from 'three';

export interface CustomLight {
  id: string;
  type: 'point' | 'directional';
  color: string;
  intensity: number;
  position: [number, number, number];
}

export type ModelData = {
  type: 'predefined-2d' | 'predefined-3d' | 'custom';
  url?: string;
  glbUrl?: string;
  file?: File;
};

interface ModelSelectorProps {
  modelData: ModelData | null;
  onModelChange: (data: ModelData | null) => void;
}

// Content Delivery Network (CDN) configuration for optimized image delivery
// Using a CDN fetch service to automatically convert images to next-gen formats (WebP/AVIF) 
// and cache them at edge nodes for faster loading times.
const CDN_PREFIX = 'https://res.cloudinary.com/demo/image/fetch/f_auto,q_auto/';

const getOptimizedUrl = (url: string) => {
  if (!url) return url;
  return `${CDN_PREFIX}${url}`;
};

const PREDEFINED_MODELS = [
  { id: 'pose1', type: 'predefined-2d' as const, url: getOptimizedUrl('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80'), label: 'Casual Standing' },
  { id: 'pose2', type: 'predefined-3d' as const, glbUrl: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb', url: getOptimizedUrl('https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&q=80'), label: '3D Robot' },
  { id: 'pose3', type: 'predefined-3d' as const, glbUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', url: getOptimizedUrl('https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?w=500&q=80'), label: '3D Astronaut' },
  { id: 'pose4', type: 'predefined-2d' as const, url: getOptimizedUrl('https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80'), label: 'Dynamic' },
];

const LightingControls = ({ 
  exposure, setExposure, 
  shadowIntensity, setShadowIntensity,
  shadowSoftness, setShadowSoftness,
  lightDirection, setLightDirection,
  environment, setEnvironment,
  ambientColor, setAmbientColor,
  ambientIntensity, setAmbientIntensity,
  customLights, setCustomLights
}: any) => (
  <div className="absolute top-3 right-3 flex flex-col gap-3 bg-white/90 backdrop-blur p-3 rounded-xl shadow-sm z-30 w-56 max-h-[90%] overflow-y-auto">
    <div className="text-xs font-bold text-zinc-800 border-b border-zinc-200 pb-1 mb-1">Lighting</div>
    
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
        Environment
      </label>
      <select 
        value={environment}
        onChange={(e) => setEnvironment(e.target.value)}
        className="w-full text-xs p-1 rounded border border-zinc-200 bg-white text-zinc-800"
      >
        <option value="neutral">Neutral (Default)</option>
        <option value="https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.hdr">Warm (Sunrise)</option>
        <option value="https://modelviewer.dev/shared-assets/environments/moonless_golf_1k.hdr">Cool (Night)</option>
        <option value="https://modelviewer.dev/shared-assets/environments/aircraft_workshop_01_1k.hdr">Studio</option>
      </select>
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
        <span>Ambient Color</span>
      </label>
      <input 
        type="color" 
        value={ambientColor} onChange={(e) => setAmbientColor(e.target.value)}
        className="w-full h-6 p-0 border-0 rounded cursor-pointer"
      />
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
        <span>Ambient Intensity</span>
        <span>{ambientIntensity.toFixed(1)}</span>
      </label>
      <input 
        type="range" min="0" max="2" step="0.1" 
        value={ambientIntensity} onChange={(e) => setAmbientIntensity(parseFloat(e.target.value))}
        className="w-full accent-indigo-600 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
        <span>Exposure</span>
        <span>{exposure.toFixed(1)}</span>
      </label>
      <input 
        type="range" min="0" max="2" step="0.1" 
        value={exposure} onChange={(e) => setExposure(parseFloat(e.target.value))}
        className="w-full accent-indigo-600 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
        <span>Direction</span>
        <span>{lightDirection}°</span>
      </label>
      <input 
        type="range" min="0" max="360" step="1" 
        value={lightDirection} onChange={(e) => setLightDirection(parseInt(e.target.value))}
        className="w-full accent-indigo-600 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
        <span>Shadows</span>
        <span>{shadowIntensity.toFixed(1)}</span>
      </label>
      <input 
        type="range" min="0" max="2" step="0.1" 
        value={shadowIntensity} onChange={(e) => setShadowIntensity(parseFloat(e.target.value))}
        className="w-full accent-indigo-600 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
    
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
        <span>Shadow Softness</span>
        <span>{shadowSoftness.toFixed(1)}</span>
      </label>
      <input 
        type="range" min="0" max="1" step="0.1" 
        value={shadowSoftness} onChange={(e) => setShadowSoftness(parseFloat(e.target.value))}
        className="w-full accent-indigo-600 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>

    <div className="text-xs font-bold text-zinc-800 border-b border-zinc-200 pb-1 mb-1 mt-2 flex justify-between items-center">
      <span>Custom Lights</span>
      <button 
        onClick={() => setCustomLights([...customLights, { id: Date.now().toString(), type: 'point', color: '#ffffff', intensity: 2, position: [0, 2, 2] }])}
        className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 p-1 rounded"
        title="Add Light"
      >
        <Plus size={12} />
      </button>
    </div>
    
    {customLights.map((light: any, index: number) => (
      <div key={light.id} className="flex flex-col gap-2 p-2 bg-zinc-50 rounded border border-zinc-200">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Light {index + 1}</span>
          <button 
            onClick={() => setCustomLights(customLights.filter((l: any) => l.id !== light.id))}
            className="text-red-500 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={light.type}
            onChange={(e) => {
              const newLights = [...customLights];
              newLights[index].type = e.target.value;
              setCustomLights(newLights);
            }}
            className="flex-1 text-[10px] p-1 rounded border border-zinc-200 bg-white"
          >
            <option value="point">Point</option>
            <option value="directional">Directional</option>
          </select>
          <input 
            type="color" 
            value={light.color} 
            onChange={(e) => {
              const newLights = [...customLights];
              newLights[index].color = e.target.value;
              setCustomLights(newLights);
            }}
            className="w-8 h-6 p-0 border-0 rounded cursor-pointer"
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[9px] text-zinc-500 flex justify-between">
            <span>Intensity</span>
            <span>{light.intensity.toFixed(1)}</span>
          </label>
          <input 
            type="range" min="0" max="10" step="0.1" 
            value={light.intensity} 
            onChange={(e) => {
              const newLights = [...customLights];
              newLights[index].intensity = parseFloat(e.target.value);
              setCustomLights(newLights);
            }}
            className="w-full accent-indigo-600 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div className="flex gap-1">
          {['X', 'Y', 'Z'].map((axis, i) => (
            <div key={axis} className="flex flex-col flex-1">
              <label className="text-[9px] text-zinc-500 text-center">{axis}</label>
              <input 
                type="number" 
                step="0.5"
                value={light.position[i]} 
                onChange={(e) => {
                  const newLights = [...customLights];
                  newLights[index].position[i] = parseFloat(e.target.value) || 0;
                  setCustomLights(newLights);
                }}
                className="w-full text-[10px] p-1 rounded border border-zinc-200 text-center bg-white"
              />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export function ModelSelector({ modelData, onModelChange }: ModelSelectorProps) {
  const [mode, setMode] = useState<'predefined' | 'custom'>('predefined');
  const [exposure, setExposure] = useState(1);
  const [shadowIntensity, setShadowIntensity] = useState(1);
  const [shadowSoftness, setShadowSoftness] = useState(1);
  const [lightDirection, setLightDirection] = useState(0);
  const [environment, setEnvironment] = useState('neutral');
  const [ambientColor, setAmbientColor] = useState('#ffffff');
  const [ambientIntensity, setAmbientIntensity] = useState(1);
  const [customLights, setCustomLights] = useState<CustomLight[]>([]);

  useEffect(() => {
    const applyLights = (elementId: string) => {
      const modelViewerElement = document.getElementById(elementId) as any;
      if (!modelViewerElement) return;
      
      const symbols = Object.getOwnPropertySymbols(modelViewerElement);
      const sceneSymbol = symbols.find(s => s.description === 'scene');
      if (!sceneSymbol) return;
      
      const scene = modelViewerElement[sceneSymbol];
      if (!scene) return;

      // Remove existing custom lights
      const lightsToRemove = scene.children.filter((child: any) => child.userData?.isCustomLight);
      lightsToRemove.forEach((light: any) => scene.remove(light));
      
      // Add new custom lights
      customLights.forEach(lightData => {
        let light;
        if (lightData.type === 'point') {
          light = new THREE.PointLight(lightData.color, lightData.intensity);
        } else {
          light = new THREE.DirectionalLight(lightData.color, lightData.intensity);
        }
        light.position.set(...lightData.position);
        light.userData = { isCustomLight: true };
        scene.add(light);
      });
      
      // Trigger a render
      const needsRenderSymbol = symbols.find(s => s.description === 'needsRender');
      if (needsRenderSymbol && typeof modelViewerElement[needsRenderSymbol] === 'function') {
        modelViewerElement[needsRenderSymbol]();
      }
    };

    const timer = setTimeout(() => {
      applyLights('model-viewer-element');
      applyLights('custom-model-viewer-element');
    }, 100);

    return () => clearTimeout(timer);
  }, [customLights, modelData, exposure, environment, ambientColor, ambientIntensity, shadowIntensity, shadowSoftness, lightDirection]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-zinc-700">Target Model</label>
        <div className="flex bg-zinc-100 p-1 rounded-lg">
          <button
            onClick={() => setMode('predefined')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'predefined' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <User size={14} />
            Presets
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'custom' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>

      <div className="h-64">
        {mode === 'predefined' ? (
          (modelData?.type === 'predefined-3d' || modelData?.type === 'predefined-2d') ? (
            <div className="relative h-full w-full rounded-2xl overflow-hidden border-2 border-indigo-600 bg-zinc-100 flex items-center justify-center">
              {modelData.type === 'predefined-3d' ? (
                <model-viewer
                  src={modelData.glbUrl}
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
                  id="model-viewer-element"
                  crossorigin="anonymous"
                ></model-viewer>
              ) : (
                <img src={modelData.url} alt="Selected" className="w-full h-full object-cover" crossOrigin="anonymous" />
              )}
              <button
                onClick={() => onModelChange(null)}
                className="absolute top-3 left-3 bg-white/90 backdrop-blur p-2 rounded-full text-zinc-700 hover:bg-white shadow-sm transition-colors flex items-center gap-1.5 text-xs font-medium z-10"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              
              {modelData.type === 'predefined-3d' && (
                <LightingControls 
                  exposure={exposure} setExposure={setExposure}
                  shadowIntensity={shadowIntensity} setShadowIntensity={setShadowIntensity}
                  shadowSoftness={shadowSoftness} setShadowSoftness={setShadowSoftness}
                  lightDirection={lightDirection} setLightDirection={setLightDirection}
                  environment={environment} setEnvironment={setEnvironment}
                  ambientColor={ambientColor} setAmbientColor={setAmbientColor}
                  ambientIntensity={ambientIntensity} setAmbientIntensity={setAmbientIntensity}
                  customLights={customLights} setCustomLights={setCustomLights}
                />
              )}

              {modelData.type === 'predefined-3d' && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-10">
                  <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md">
                    Drag to rotate 3D model
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 h-full">
              {PREDEFINED_MODELS.map((model) => {
                return (
                  <button
                    key={model.id}
                    onClick={() => onModelChange({ type: model.type, url: model.url, glbUrl: model.glbUrl })}
                    className="relative rounded-2xl overflow-hidden border-2 border-transparent hover:border-zinc-300 transition-all h-full group"
                  >
                    <img src={model.url} alt={model.label} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-left">
                      <span className="text-white text-xs font-medium flex items-center gap-1.5">
                        {model.type === 'predefined-3d' && <Box size={12} />}
                        {model.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="-mt-7 relative">
            <DragDropZone
              label=""
              description="SVG, PNG, JPG, GIF, GLB or GLTF (max. 10MB)"
              selectedFile={modelData?.type === 'custom' ? modelData.file || null : null}
              onFileSelect={(file) => onModelChange({ type: 'custom', file })}
              onClear={() => onModelChange(null)}
              accept3D={true}
              exposure={exposure}
              shadowIntensity={shadowIntensity}
              shadowSoftness={shadowSoftness}
              lightDirection={lightDirection}
              environment={environment}
              ambientColor={ambientColor}
              ambientIntensity={ambientIntensity}
            />
            {modelData?.type === 'custom' && modelData.file?.name.match(/\.(glb|gltf)$/i) && (
              <LightingControls 
                exposure={exposure} setExposure={setExposure}
                shadowIntensity={shadowIntensity} setShadowIntensity={setShadowIntensity}
                shadowSoftness={shadowSoftness} setShadowSoftness={setShadowSoftness}
                lightDirection={lightDirection} setLightDirection={setLightDirection}
                environment={environment} setEnvironment={setEnvironment}
                ambientColor={ambientColor} setAmbientColor={setAmbientColor}
                ambientIntensity={ambientIntensity} setAmbientIntensity={setAmbientIntensity}
                customLights={customLights} setCustomLights={setCustomLights}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
