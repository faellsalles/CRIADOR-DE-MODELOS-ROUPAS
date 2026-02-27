import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  Layers,
  User,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface ClothingItem {
  id: string;
  file: File;
  preview: string;
  description: string;
}

export default function App() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelSettings, setModelSettings] = useState({
    gender: 'feminino',
    style: 'casual',
    background: 'estúdio minimalista',
    pose: 'natural'
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      description: ''
    }));
    setClothingItems(prev => [...prev, ...newItems]);
  }, []);

  // @ts-ignore
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] as string[] },
    maxFiles: 5,
    multiple: true
  });

  const removeClothing = (id: string) => {
    setClothingItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const generateModel = async () => {
    if (clothingItems.length === 0) {
      setError("Por favor, adicione pelo menos uma peça de roupa.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const imageParts = await Promise.all(
        clothingItems.map(async (item) => ({
          inlineData: {
            data: await fileToBase64(item.file),
            mimeType: item.file.type,
          },
        }))
      );

      const prompt = `
        Crie uma fotografia de moda profissional e ultra-realista de um modelo ${modelSettings.gender}.
        O modelo deve estar vestindo as peças de roupa mostradas nas imagens fornecidas.
        FOCO EXTREMO NOS DETALHES: Capture fielmente as estampas, texturas, costuras e caimento das roupas.
        Se houver uma estampa específica, ela deve ser reproduzida com perfeição no modelo.
        Estilo: ${modelSettings.style}.
        Pose: ${modelSettings.pose}.
        Cenário: ${modelSettings.background}.
        Qualidade: 8k, iluminação de estúdio, profundidade de campo cinematográfica, pele realista, detalhes nítidos.
        Não inclua textos ou marcas d'água.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            ...imageParts,
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4"
          }
        }
      });

      let foundImage = false;
      // @ts-ignore
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("Não foi possível gerar a imagem. Tente novamente.");
      }

    } catch (err: any) {
      console.error(err);
      setError("Ocorreu um erro ao gerar a imagem. Verifique sua conexão e tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-serif font-bold tracking-tight">FashionGen</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest hidden sm:block">Gemini 2.5 Flash Image (Free)</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-zinc-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Peças de Roupa</h2>
            </div>
            
            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-4",
                isDragActive ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 hover:border-zinc-300 bg-white"
              )}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-900">Arraste ou clique para enviar</p>
                <p className="text-xs text-zinc-500 mt-1">Envie fotos das roupas (blusa, calça, etc.)</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <AnimatePresence>
                {clothingItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 group"
                  >
                    <img src={item.preview} alt="Clothing" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeClothing(item.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-white/90 backdrop-blur shadow-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-zinc-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Configurações do Modelo</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Gênero</label>
                <select 
                  value={modelSettings.gender}
                  onChange={(e) => setModelSettings(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                >
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="não-binário">Não-binário</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Estilo</label>
                <select 
                  value={modelSettings.style}
                  onChange={(e) => setModelSettings(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                >
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                  <option value="streetwear">Streetwear</option>
                  <option value="minimalista">Minimalista</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Pose</label>
                <select 
                  value={modelSettings.pose}
                  onChange={(e) => setModelSettings(prev => ({ ...prev, pose: e.target.value }))}
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                >
                  <option value="natural">Natural</option>
                  <option value="editorial">Editorial</option>
                  <option value="caminhando">Caminhando</option>
                  <option value="sentado">Sentado</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Cenário</label>
                <select 
                  value={modelSettings.background}
                  onChange={(e) => setModelSettings(prev => ({ ...prev, background: e.target.value }))}
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                >
                  <option value="estúdio minimalista">Estúdio Clean</option>
                  <option value="urbano">Urbano</option>
                  <option value="natureza">Natureza</option>
                  <option value="interior luxuoso">Interior Luxo</option>
                </select>
              </div>
            </div>
          </section>

          <button
            onClick={generateModel}
            disabled={isGenerating || clothingItems.length === 0}
            className={cn(
              "w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-zinc-200",
              isGenerating || clothingItems.length === 0
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Gerando Modelo...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Gerar Look Realista
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column: Result */}
        <div className="lg:col-span-7">
          <div className="sticky top-32 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-zinc-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Resultado Final</h2>
              </div>
              {generatedImage && (
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedImage;
                    link.download = 'fashion-gen-model.png';
                    link.click();
                  }}
                  className="text-xs font-bold text-zinc-900 hover:underline"
                >
                  Download HD
                </button>
              )}
            </div>

            <div className="aspect-[3/4] bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden relative group">
              {!generatedImage && !isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-serif italic">Aguardando criação...</p>
                    <p className="text-sm">Envie as peças de roupa e clique em gerar para ver o modelo realista.</p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-12 text-center space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-zinc-100 border-t-zinc-900 rounded-full animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-zinc-900 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-serif font-bold">Criando sua visão...</p>
                    <p className="text-sm text-zinc-500 max-w-xs">
                      O Gemini está analisando as texturas e estampas das suas roupas para criar um modelo perfeito.
                    </p>
                  </div>
                  <div className="w-48 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-zinc-900"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 15, ease: "linear" }}
                    />
                  </div>
                </div>
              )}

              {generatedImage && (
                <motion.img 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={generatedImage} 
                  alt="Generated Fashion Model" 
                  className="w-full h-full object-cover"
                />
              )}

              {generatedImage && !isGenerating && (
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/90 backdrop-blur border border-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Status</p>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-bold">Renderizado com sucesso</span>
                      </div>
                    </div>
                    <button 
                      onClick={generateModel}
                      className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                      title="Gerar novamente"
                    >
                      <RefreshCw className="w-5 h-5 text-zinc-900" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-zinc-900 rounded-2xl text-white space-y-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Dica Pro</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Para melhores resultados, envie fotos das roupas em fundos neutros e com boa iluminação. O Gemini 2.5 consegue identificar detalhes como bordados e estampas complexas para replicar no modelo.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-zinc-500">© 2026 FashionGen AI. Powered by Gemini 2.5 Flash Image.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="text-xs font-bold text-zinc-900 hover:underline">Termos</a>
          <a href="#" className="text-xs font-bold text-zinc-900 hover:underline">Privacidade</a>
          <a href="#" className="text-xs font-bold text-zinc-900 hover:underline">Suporte</a>
        </div>
      </footer>
    </div>
  );
}
