'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'
import getCroppedImg from '@/lib/cropImageUtils'

interface ProfileCropperModalProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

export function ProfileCropperModal({ imageSrc, onClose, onCropComplete }: ProfileCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 touch-none font-sans">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <h3 className="text-white font-bold text-sm">Ajustar Foto de Perfil</h3>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Action Area */}
        <div className="relative w-full h-80 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Toolbar & Sliders */}
        <div className="p-5 flex flex-col gap-4 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <ZoomOut size={16} className="text-zinc-500" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-tdf-blue h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn size={16} className="text-zinc-500" />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2 bg-tdf-blue hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md transition disabled:opacity-50"
            >
              {isProcessing ? 'Procesando...' : (
                <>
                  <Check size={16} /> Confirmar Recorte
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
