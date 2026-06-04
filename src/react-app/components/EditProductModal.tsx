import { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
    price: number;
    description: string;
    image_url?: string;
    image_url_2?: string;
    image_url_3?: string;
    categoria?: string;
    offer_price?: number;
    offer_end_date?: string;
    is_visible?: boolean;
    ocultar_precio?: boolean | number;
  };
  onProductUpdated: () => void;
  userCategories: Array<{ id: number; name: string }>;
  isPremium?: boolean;
  carouselEnabled?: boolean;
}

interface PaymentConfig {
  payment_extra_offers: string;
}

export function EditProductModal({ isOpen, onClose, product, onProductUpdated, userCategories, isPremium = false, carouselEnabled = false }: EditProductModalProps) {
  const [offerType, setOfferType] = useState<'Producto' | 'Servicio'>((product as any).offer_type || 'Producto');
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price.toString());
  const [description, setDescription] = useState(product.description);
  const [categoria, setCategoria] = useState(product.categoria || 'Sin Categoría');
  const [brand, setBrand] = useState((product as any).brand || '');
  const [condition, setCondition] = useState<'Nuevo' | 'Usado'>((product as any).condition || 'Nuevo');
  const [productState, setProductState] = useState<number>((product as any).product_state || 5);
  const [offerPrice, setOfferPrice] = useState(product.offer_price?.toString() || '');
  const [offerEndDate, setOfferEndDate] = useState(product.offer_end_date ? new Date(product.offer_end_date).toISOString().slice(0, 16) : '');
  const [isVisible, setIsVisible] = useState(product.is_visible !== false);
  const [ocultarPrecio, setOcultarPrecio] = useState(product.ocultar_precio === 1 || product.ocultar_precio === true);
  const [sortOrder, setSortOrder] = useState((product as any).sort_order?.toString() || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url || null);
  const [deleteImage, setDeleteImage] = useState(false);
  const [imageFile2, setImageFile2] = useState<File | null>(null);
  const [imagePreview2, setImagePreview2] = useState<string | null>(product.image_url_2 || null);
  const [deleteImage2, setDeleteImage2] = useState(false);
  const [imageFile3, setImageFile3] = useState<File | null>(null);
  const [imagePreview3, setImagePreview3] = useState<string | null>(product.image_url_3 || null);
  const [deleteImage3, setDeleteImage3] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);

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
    setDeleteImage(false);
    
    try {
      // Compress image automatically
      const compressedFile = await compressImage(file);
      setImageFile(compressedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      setError('Error al procesar la imagen. Intenta con otra foto.');
      console.error('Image compression error:', err);
    }
  };

  const handleDeleteImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setDeleteImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageSelect2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      setError('Solo se permiten archivos JPG y PNG');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar 10MB');
      return;
    }

    setError('');
    setDeleteImage2(false);
    
    try {
      const compressedFile = await compressImage(file);
      setImageFile2(compressedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview2(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      setError('Error al procesar la imagen. Intenta con otra foto.');
      console.error('Image compression error:', err);
    }
  };

  const handleDeleteImage2 = () => {
    setImageFile2(null);
    setImagePreview2(null);
    setDeleteImage2(true);
    if (fileInputRef2.current) {
      fileInputRef2.current.value = '';
    }
  };

  const handleImageSelect3 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      setError('Solo se permiten archivos JPG y PNG');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar 10MB');
      return;
    }

    setError('');
    setDeleteImage3(false);
    
    try {
      const compressedFile = await compressImage(file);
      setImageFile3(compressedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview3(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      setError('Error al procesar la imagen. Intenta con otra foto.');
      console.error('Image compression error:', err);
    }
  };

  const handleDeleteImage3 = () => {
    setImageFile3(null);
    setImagePreview3(null);
    setDeleteImage3(true);
    if (fileInputRef3.current) {
      fileInputRef3.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
      
      if (isPremium) {
        if (offerPrice) {
          formData.append('offer_price', offerPrice);
        } else {
          formData.append('offer_price', ''); // Clear offer price
        }
        
        if (offerEndDate) {
          formData.append('offer_end_date', offerEndDate);
        } else {
          formData.append('offer_end_date', ''); // Clear offer end date
        }
      }
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      if (deleteImage) {
        formData.append('deleteImage', 'true');
      }

      if (imageFile2) {
        formData.append('image_2', imageFile2);
      }
      
      if (deleteImage2) {
        formData.append('deleteImage2', 'true');
      }

      if (imageFile3) {
        formData.append('image_3', imageFile3);
      }
      
      if (deleteImage3) {
        formData.append('deleteImage3', 'true');
      }
      
      formData.append('is_visible', isVisible ? '1' : '0');
      formData.append('ocultar_precio', ocultarPrecio ? '1' : '0');
      
      if (sortOrder.trim() !== '') {
        formData.append('sort_order', sortOrder);
      }

      // Extended timeout for mobile connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el producto');
      }

      onProductUpdated();
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('⚠️ La conexión es muy lenta. Intenta nuevamente con mejor señal.');
      } else {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-2xl font-bold">Editar Producto</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="Producto">Producto</option>
              <option value="Servicio">Servicio</option>
            </select>
          </div>

          {/* Visibility Toggle */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`text-2xl ${isVisible ? '' : 'opacity-50'}`}>
                  {isVisible ? '👁️' : '🙈'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Producto Visible</h3>
                  <p className="text-xs text-slate-600">
                    {isVisible ? 'Los clientes pueden ver este producto' : 'Oculto del catálogo público'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className={`relative w-14 h-8 rounded-full transition-all ${
                  isVisible ? 'bg-green-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                    isVisible ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Hide Price Toggle - Catalog Mode */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {ocultarPrecio ? '💬' : '💰'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Ocultar precio y usar WhatsApp</h3>
                  <p className="text-xs text-slate-600">
                    {ocultarPrecio ? 'El cliente consultará por WhatsApp' : 'El precio es visible en el catálogo'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOcultarPrecio(!ocultarPrecio)}
                className={`relative w-14 h-8 rounded-full transition-all ${
                  ocultarPrecio ? 'bg-green-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                    ocultarPrecio ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sort Order / Position */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Posición (orden en catálogo)
            </label>
            <input
              type="number"
              min="1"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="Ej: 1, 2, 3..."
              className="w-32 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">Menor número = aparece primero. Vacío = al final.</p>
          </div>

          {/* Image Upload - Primary */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Foto Principal
            </label>
            
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl border-2 border-slate-200"
                />
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer"
              >
                <ImageIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 mb-1">Click para subir imagen</p>
                <p className="text-xs text-slate-400">Solo JPG o PNG, hasta 10MB</p>
                <p className="text-xs text-green-600 font-medium mt-2">⚡ Tip Pro: Usa fotos de máximo 2MB para una carga instantánea</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Carousel Images - Conditional */}
          {carouselEnabled ? (
            <div className="space-y-4">
              {/* Image 2 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Foto 2 (Carrusel)
                </label>
                
                {imagePreview2 ? (
                  <div className="relative">
                    <img
                      src={imagePreview2}
                      alt="Preview 2"
                      className="w-full h-48 object-cover rounded-xl border-2 border-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={handleDeleteImage2}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef2.current?.click()}
                    className="border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-10 h-10 mx-auto text-indigo-400 mb-2" />
                    <p className="text-slate-600 text-sm mb-1">Click para subir foto 2</p>
                    <p className="text-xs text-slate-400">Opcional</p>
                    <p className="text-xs text-green-600 font-medium mt-1">⚡ Máx 2MB recomendado</p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef2}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageSelect2}
                  className="hidden"
                />
              </div>

              {/* Image 3 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Foto 3 (Carrusel)
                </label>
                
                {imagePreview3 ? (
                  <div className="relative">
                    <img
                      src={imagePreview3}
                      alt="Preview 3"
                      className="w-full h-48 object-cover rounded-xl border-2 border-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={handleDeleteImage3}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef3.current?.click()}
                    className="border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-10 h-10 mx-auto text-indigo-400 mb-2" />
                    <p className="text-slate-600 text-sm mb-1">Click para subir foto 3</p>
                    <p className="text-xs text-slate-400">Opcional</p>
                    <p className="text-xs text-green-600 font-medium mt-1">⚡ Máx 2MB recomendado</p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef3}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageSelect3}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔒</span>
                <h3 className="font-bold text-slate-700">Carrusel de 3 Fotos (Bloqueado)</h3>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-300">
                <p className="text-sm text-slate-700 mb-2">
                  <span className="font-bold">Opción Premium</span>
                </p>
                <p className="text-xs text-slate-600 mb-3">
                  Muestra hasta 3 fotos de cada producto en un carrusel interactivo con navegación por puntos y deslizamiento.
                </p>
                <p className="text-xs text-indigo-600 font-semibold">
                  Contacta al administrador para activar esta función
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nombre del Producto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {offerType === 'Servicio' ? 'Costo del Servicio' : 'Precio del Producto'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">$</span>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
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
                        className="text-2xl transition-transform hover:scale-110"
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
                    className="w-full pl-8 pr-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                    placeholder="Precio en oferta"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Deja vacío para quitar la oferta
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Fecha de Finalización de Oferta
                </label>
                <input
                  type="datetime-local"
                  value={offerEndDate}
                  onChange={(e) => setOfferEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-slate-600 mt-2">
                  La oferta desaparecerá automáticamente cuando llegue a esta fecha
                </p>
              </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Categoría
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
              rows={4}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
