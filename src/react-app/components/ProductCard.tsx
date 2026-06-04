import { useState, useEffect } from 'react';
import { Package, Copy, Check, Edit, Trash2, Image as ImageIcon, ShoppingCart, Clock, MessageCircle } from 'lucide-react';
import { useCart } from '../hooks/useCart';

interface ProductCardProps {
  id?: number;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
  offerPrice?: number;
  offerEndDate?: string;
  isVisible?: boolean;
  carouselEnabled?: boolean;
  likesCount?: number;
  ocultarPrecio?: boolean;
  ownerWhatsapp?: string;
}

export function ProductCard({ id, name, price, description, imageUrl, imageUrl2, imageUrl3, onEdit, onDelete, isOwner, offerPrice, offerEndDate, isVisible = true, carouselEnabled = false, likesCount = 0, ocultarPrecio = false, ownerWhatsapp }: ProductCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [offerActive, setOfferActive] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likes, setLikes] = useState(likesCount);
  const [hasLiked, setHasLiked] = useState(false);
  const { addToCart } = useCart();

  // Check if user has already liked this product
  useEffect(() => {
    if (!id) return;
    const likedProducts = JSON.parse(localStorage.getItem('liked_products') || '[]');
    setHasLiked(likedProducts.includes(id));
  }, [id]);

  // Build array of valid images for carousel
  const images = [imageUrl, imageUrl2, imageUrl3].filter(Boolean) as string[];
  const showCarousel = carouselEnabled && images.length > 1;

  // Calculate if offer is active and time remaining
  useEffect(() => {
    if (!offerPrice || !offerEndDate) {
      setOfferActive(false);
      return;
    }

    const checkOffer = () => {
      const now = new Date();
      const endDate = new Date(offerEndDate);
      
      if (now >= endDate) {
        setOfferActive(false);
        setTimeRemaining('');
        return;
      }

      setOfferActive(true);

      // Calculate time difference
      const diff = endDate.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    checkOffer();
    const interval = setInterval(checkOffer, 1000);
    return () => clearInterval(interval);
  }, [offerPrice, offerEndDate]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteConfirm(false);
    }
  };

  const handleAddToCart = () => {
    if (!id) return;
    
    // Use offer price if active, otherwise regular price
    const effectivePrice = offerActive && offerPrice ? offerPrice : price;
    
    addToCart({
      id,
      name,
      price: effectivePrice,
      imageUrl,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWhatsAppConsult = () => {
    if (!ownerWhatsapp) return;
    const message = `Hola, me interesa este producto: ${name}`;
    const whatsappUrl = `https://wa.me/${ownerWhatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleLike = async () => {
    if (!id || hasLiked) return;

    try {
      const response = await fetch(`/api/products/${id}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setLikes(data.likes_count);
        setHasLiked(true);

        // Save to localStorage
        const likedProducts = JSON.parse(localStorage.getItem('liked_products') || '[]');
        likedProducts.push(id);
        localStorage.setItem('liked_products', JSON.stringify(likedProducts));
      }
    } catch (error) {
      console.error('Error liking product:', error);
    }
  };

  return (
    <div className={`group relative bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 border border-slate-200/50 hover:border-indigo-200 overflow-hidden flex flex-col ${!isVisible && isOwner ? 'opacity-50' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Hidden Product Badge - Only visible to owner */}
      {!isVisible && isOwner && (
        <div className="absolute top-3 right-3 z-10 bg-slate-800/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          Oculto
        </div>
      )}
      
      {/* Large Image Section - Full width, flexible height */}
      {showCarousel ? (
        <div className="relative w-full bg-white">
          {/* Carousel Image */}
          <img
            src={images[currentImageIndex]}
            alt={`${name} - imagen ${currentImageIndex + 1}`}
            className="w-full h-auto max-h-[500px] object-contain mx-auto transition-opacity duration-300"
          />
          
          {/* Navigation Dots */}
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  currentImageIndex === index 
                    ? 'bg-white w-6' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Ver imagen ${index + 1}`}
              />
            ))}
          </div>

          {/* Swipe handlers for touch devices */}
          <div
            className="absolute inset-0"
            onTouchStart={(e) => {
              const touchStartX = e.touches[0].clientX;
              const handleTouchEnd = (e: TouchEvent) => {
                const touchEndX = e.changedTouches[0].clientX;
                const diff = touchStartX - touchEndX;
                if (Math.abs(diff) > 50) {
                  if (diff > 0) {
                    // Swipe left - next image
                    setCurrentImageIndex((prev) => (prev + 1) % images.length);
                  } else {
                    // Swipe right - previous image
                    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                  }
                }
                document.removeEventListener('touchend', handleTouchEnd);
              };
              document.addEventListener('touchend', handleTouchEnd);
            }}
          />
        </div>
      ) : imageUrl ? (
        <div className="relative w-full bg-white">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-auto max-h-[500px] object-contain mx-auto group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="relative w-full min-h-[300px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <ImageIcon className="w-20 h-20 text-slate-300" />
        </div>
      )}

      {/* Content Section */}
      <div className="relative p-5 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          {/* Price Section - Hidden if ocultarPrecio is true (visible to all including owner for mirror view) */}
          {ocultarPrecio ? (
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-500">Precio: Consultar</p>
            </div>
          ) : (
          <div className="flex flex-col items-end gap-1">
            {offerActive && offerPrice ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-slate-400 line-through">
                    ${price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(`$${offerPrice.toFixed(2)}`, 'price')}
                    className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors relative group/btn"
                    title="Copiar precio de oferta"
                  >
                    {copiedField === 'price' ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-amber-600" />
                    )}
                    {copiedField === 'price' && (
                      <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        Copiado
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    ${offerPrice.toFixed(2)}
                  </span>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                    OFERTA
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ${price.toFixed(2)}
                </span>
                <button
                  onClick={() => copyToClipboard(`$${price.toFixed(2)}`, 'price')}
                  className="p-2 hover:bg-indigo-100 rounded-lg transition-colors relative group/btn"
                  title="Copiar precio"
                >
                  {copiedField === 'price' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400 group-hover/btn:text-indigo-600" />
                  )}
                  {copiedField === 'price' && (
                    <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      Copiado
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
          )}
        </div>
        
        <div className="flex items-start gap-2 mb-3">
          <h3 className="text-xl font-bold text-slate-900 flex-1 group-hover:text-indigo-600 transition-colors leading-tight">
            {name}
          </h3>
          <button
            onClick={() => copyToClipboard(name, 'name')}
            className="p-2 hover:bg-indigo-100 rounded-lg transition-colors relative group/btn flex-shrink-0 mt-1"
            title="Copiar nombre"
          >
            {copiedField === 'name' ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400 group-hover/btn:text-indigo-600" />
            )}
            {copiedField === 'name' && (
              <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                Copiado
              </span>
            )}
          </button>
        </div>
        
        {/* Countdown Timer for Active Offers */}
        {offerActive && timeRemaining && (
          <div className="mb-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-3">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-red-600" />
              <div className="text-center">
                <p className="text-xs font-semibold text-red-800 mb-0.5">¡Oferta termina en!</p>
                <p className="text-lg font-bold text-red-600 tabular-nums">
                  {timeRemaining}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 mb-4">
          <p className="text-slate-600 leading-relaxed flex-1 text-base">
            {description}
          </p>
          <button
            onClick={() => copyToClipboard(description, 'description')}
            className="p-2 hover:bg-indigo-100 rounded-lg transition-colors relative group/btn flex-shrink-0 mt-1"
            title="Copiar descripción"
          >
            {copiedField === 'description' ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400 group-hover/btn:text-indigo-600" />
            )}
            {copiedField === 'description' && (
              <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                Copiado
              </span>
            )}
          </button>
        </div>

        {/* Likes Section */}
        <div className="mb-3 flex items-center justify-center gap-3">
          <button
            onClick={handleLike}
            disabled={hasLiked}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              hasLiked
                ? 'bg-red-100 text-red-600 cursor-default'
                : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 hover:scale-110 active:scale-95'
            }`}
            title={hasLiked ? 'Ya diste like' : 'Me gusta'}
          >
            <span className="text-2xl">{hasLiked ? '❤️' : '🤍'}</span>
            <span className="font-bold text-lg">{likes}</span>
          </button>
        </div>

        {/* Large, Touch-Friendly Add to Cart Button OR WhatsApp Consult Button */}
        {ocultarPrecio ? (
          <div className="flex justify-center mb-3">
            <button
              onClick={handleWhatsAppConsult}
              disabled={!ownerWhatsapp}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all shadow-lg bg-[#25D366] text-white hover:bg-[#1ebe5d] hover:shadow-xl hover:scale-105 active:scale-95"
            >
              <MessageCircle className="w-5 h-5" />
              Consultar por WhatsApp
            </button>
          </div>
        ) : (
        <button
          onClick={handleAddToCart}
          disabled={!id}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg mb-3 ${
            addedToCart
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:scale-105 active:scale-95'
          }`}
        >
          {addedToCart ? (
            <>
              <Check className="w-6 h-6" />
              ¡Agregado al Carrito!
            </>
          ) : (
            <>
              <ShoppingCart className="w-6 h-6" />
              Añadir al Carrito
            </>
          )}
        </button>
        )}

        {/* Owner-only edit/delete buttons */}
        {isOwner && id && onEdit && onDelete && (
          <div className="pt-3 border-t border-slate-200">
            <div className="flex gap-3">
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors font-semibold"
              >
                <Edit className="w-5 h-5" />
                Editar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-semibold"
              >
                <Trash2 className="w-5 h-5" />
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              ¿Eliminar producto?
            </h3>
            <p className="text-slate-600 mb-6">
              Esta acción no se puede deshacer. El producto y su imagen serán eliminados permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
