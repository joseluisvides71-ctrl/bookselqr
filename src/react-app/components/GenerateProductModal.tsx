import { useState, useRef, useEffect } from 'react';
import { X, Plus, Loader2, Image as ImageIcon, Trash2, Sparkles } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

interface GenerateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductGenerated: () => void;
  userCategories: Array<{ id: number; name: string }>;
  isPremium?: boolean;
}

interface PaymentConfig {
  payment_extra_offers: string;
}

export function GenerateProductModal({ isOpen, onClose, onProductGenerated, userCategories, isPremium = false }: GenerateProductModalProps) {
  const [offerType, setOfferType] = useState<'Producto' | 'Servicio'>('Producto');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [error, setError] = useState('');
  const [categoria, setCategoria] = useState('Sin Categoría');
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState<'Nuevo' | 'Usado'>('Nuevo');
  const [productState, setProductState] = useState<number>(5);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setOfferType('Producto');
      setName('');
      setPrice('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setError('');
      setCategoria('Sin Categoría');
      setBrand('');
      setCondition('Nuevo');
      setProductState(5);
      setOfferPrice('');
      setOfferEndDate('');
      setUploadProgress(0);
      setCompressing(false);
    }
  }, [isOpen]);

  // Fetch payment config when modal opens
  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const response = await fetch('/api/admin/public/payment-config');
        if (response.ok) {
          const data = await response.json();
          setPaymentConfig(data);
        }
      } catch (error) {
        console.error('Error fetching payment config:', error);
      }
    };

    if (isOpen) {
      fetchPaymentConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (only JPG and PNG)
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      setError('Solo se permiten archivos JPG y PNG');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar 10MB');
      return;
    }

    setError('');
    setCompressing(true);

    try {
      // Compress image automatically (1080px max, 80% quality)
      const compressedFile = await compressImage(file);
      
      setImageFile(compressedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Error compressing image:', err);
      setError('Error al procesar la imagen. Intenta con otra imagen.');
    } finally {
      setCompressing(false);
    }
  };

  const handleDeleteImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      setError('Primero escribe el nombre del producto para generar la descripción');
      return;
    }

    setGeneratingAI(true);
    setError('');

    try {
      // Use FormData to send image along with text data
      const formData = new FormData();
      formData.append('productName', name);
      if (brand) formData.append('brand', brand);
      formData.append('condition', condition);
      if (condition === 'Usado') {
        formData.append('productState', productState.toString());
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch('/api/generate-description', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar descripción');
      }

      const data = await response.json();
      setDescription(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar descripción con IA');
    } finally {
      setGeneratingAI(false);
    }
  };

  const validateForm = (): boolean => {
    // Validate required fields
    if (!name.trim()) {
      setError('El nombre del producto es obligatorio');
      return false;
    }

    if (!price || parseFloat(price) <= 0) {
      setError('El precio debe ser mayor a 0');
      return false;
    }

    if (!description.trim()) {
      setError('La descripción es obligatoria');
      return false;
    }

    // Validate offer fields if premium and offer price is set
    if (isPremium && offerPrice) {
      const regularPrice = parseFloat(price);
      const offerPriceNum = parseFloat(offerPrice);
      
      if (offerPriceNum <= 0) {
        setError('El precio de oferta debe ser mayor a 0');
        return false;
      }
      
      if (offerPriceNum >= regularPrice) {
        setError('El precio de oferta debe ser menor al precio regular');
        return false;
      }

      if (!offerEndDate) {
        setError('Debes especificar una fecha de finalización para la oferta');
        return false;
      }

      const endDate = new Date(offerEndDate);
      const now = new Date();
      if (endDate <= now) {
        setError('La fecha de finalización de la oferta debe ser futura');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('description', description);
      formData.append('categoria', categoria);
      formData.append('offer_type', offerType);
      if (brand) formData.append('brand', brand);
      
      // Only include condition for Products, set to N/A for Services
      if (offerType === 'Producto') {
        formData.append('condition', condition);
        if (condition === 'Usado') {
          formData.append('product_state', productState.toString());
        }
      } else {
        formData.append('condition', 'N/A');
      }
      
      if (isPremium && offerPrice) {
        formData.append('offer_price', offerPrice);
      }
      if (isPremium && offerEndDate) {
        formData.append('offer_end_date', offerEndDate);
      }
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      // Always set new products as visible by default
      formData.append('is_visible', '1');

      setUploadProgress(30);

      // Extended timeout for slow connections (2 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      setUploadProgress(50);

      const createResponse = await fetch('/api/products', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setUploadProgress(80);

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Error al crear el producto');
      }

      setUploadProgress(100);
      
      // Brief delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 300));

      onProductGenerated();
      onClose();
    } catch (err) {
      console.error('Error creating product:', err);
      setUploadProgress(0);
      
      if (err instanceof Error && err.name === 'AbortError') {
        setError('⏱️ La conexión es muy lenta. Por favor, verifica tu internet e intenta nuevamente.');
      } else if (err instanceof Error && err.message === 'Failed to fetch') {
        setError('❌ Error de conexión. Verifica tu internet e intenta de nuevo.');
      } else {
        setError(err instanceof Error ? err.message : '❌ Error al crear el producto. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Plus className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Nuevo Producto</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Offer Type Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tipo de Oferta
            </label>
            <select
              value={offerType}
              onChange={(e) => setOfferType(e.target.value as 'Producto' | 'Servicio')}
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Producto">Producto</option>
              <option value="Servicio">Servicio</option>
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Imagen del Producto
            </label>
            
            {compressing && (
              <div className="border-2 border-indigo-300 rounded-xl p-8 text-center bg-indigo-50">
                <Loader2 className="w-12 h-12 mx-auto text-indigo-600 mb-3 animate-spin" />
                <p className="text-indigo-700 font-medium">Comprimiendo imagen...</p>
                <p className="text-xs text-indigo-600 mt-1">Optimizando para mejor velocidad de carga</p>
              </div>
            )}
            
            {!compressing && imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl border-2 border-slate-200"
                />
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  disabled={loading}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {imageFile && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {(imageFile.size / 1024).toFixed(0)} KB
                  </div>
                )}
              </div>
            ) : !compressing && (
              <div
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <ImageIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 mb-1">Sube una imagen del producto</p>
                <p className="text-xs text-slate-400">Solo JPG o PNG, hasta 10MB</p>
                <p className="text-xs text-green-600 font-medium mt-2">⚡ Tip Pro: Usa fotos de máximo 2MB para una carga instantánea</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleImageSelect}
              disabled={loading || compressing}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nombre del Producto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Ej: Pizza Margarita"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {offerType === 'Servicio' ? 'Costo del Servicio' : 'Precio del Producto'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">$</span>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={loading}
                className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="9.99"
                required
              />
            </div>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Marca (Opcional)
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Ej: Apple, Samsung, Nike"
            />
          </div>

          {/* Condition - Only visible for Products */}
          {offerType === 'Producto' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Condición
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as 'Nuevo' | 'Usado')}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="Nuevo">Nuevo</option>
                  <option value="Usado">Usado</option>
                </select>
              </div>

              {/* Product State (only for Used) */}
              {condition === 'Usado' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Estado del Producto
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 border border-slate-300 rounded-xl">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setProductState(star)}
                        disabled={loading}
                        className="text-2xl transition-transform hover:scale-110 disabled:opacity-50"
                      >
                        {star <= productState ? '⭐' : '☆'}
                      </button>
                    ))}
                    <span className="ml-auto text-sm text-slate-600 font-medium">
                      {productState === 5 && 'Como nuevo'}
                      {productState === 4 && 'Muy buen estado'}
                      {productState === 3 && 'Buen estado'}
                      {productState === 2 && 'Estado aceptable'}
                      {productState === 1 && 'Detalles visibles'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Offers Module - Premium or Locked */}
          <div className={`rounded-xl p-4 space-y-4 ${
            isPremium 
              ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200' 
              : 'bg-slate-100 border-2 border-slate-300 relative overflow-hidden'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{isPremium ? '🔥' : '🔒'}</span>
              <h3 className={`font-bold ${isPremium ? 'text-amber-900' : 'text-slate-600'}`}>
                Ofertas Relámpago {!isPremium && '(Bloqueado)'}
              </h3>
            </div>

            {!isPremium && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-300">
                <p className="text-sm text-slate-700 mb-3">
                  <span className="font-bold">Desbloquea esta función por solo ${paymentConfig?.payment_extra_offers || '5'} adicionales al mes</span>
                </p>
                <p className="text-xs text-slate-600 mb-3">
                  Con el módulo de Ofertas Relámpago podrás:
                </p>
                <ul className="text-xs text-slate-600 space-y-1 mb-3">
                  <li>✓ Crear ofertas con precios especiales</li>
                  <li>✓ Cuenta regresiva automática</li>
                  <li>✓ Las ofertas desaparecen al vencerse</li>
                </ul>
                <p className="text-xs text-indigo-600 font-semibold">
                  Contacta al administrador para activar esta función
                </p>
              </div>
            )}

            {isPremium && (
              <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔥</span>
                <h3 className="font-bold text-amber-900">Oferta Especial (Premium)</h3>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Precio de Oferta (Opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    disabled={loading}
                    className="w-full pl-8 pr-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Precio en oferta"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Fecha de Finalización de Oferta
                </label>
                <input
                  type="datetime-local"
                  value={offerEndDate}
                  onChange={(e) => setOfferEndDate(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
                <p className="text-xs text-slate-600 mt-2">
                  La oferta desaparecerá automáticamente cuando llegue a esta fecha
                </p>
              </div>
              </>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Categoría
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              {userCategories.length === 0 ? (
                <option value="Sin Categoría">Sin Categoría</option>
              ) : (
                <>
                  {userCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="Sin Categoría">Sin Categoría</option>
                </>
              )}
            </select>
            {userCategories.length === 0 && (
              <p className="text-xs text-slate-500 mt-2">
                💡 Ve a "Mis Categorías" para crear categorías personalizadas
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                Descripción <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={generatingAI || !name.trim() || loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generar con IA</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Describe tu producto o servicio... o usa el botón de IA para generar una descripción automáticamente"
              rows={4}
              required
            />
            {!name.trim() && (
              <p className="text-xs text-slate-500 mt-2">
                💡 Escribe el nombre del producto primero para usar la generación con IA
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Progress Bar */}
          {loading && uploadProgress > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-900">
                  {uploadProgress < 30 && '📝 Preparando datos...'}
                  {uploadProgress >= 30 && uploadProgress < 50 && '📤 Enviando producto...'}
                  {uploadProgress >= 50 && uploadProgress < 80 && '☁️ Guardando en la nube...'}
                  {uploadProgress >= 80 && '✅ Finalizando...'}
                </span>
                <span className="text-sm font-bold text-indigo-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || compressing}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Subiendo producto...</span>
              </>
            ) : compressing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Comprimiendo imagen...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Crear Producto</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
