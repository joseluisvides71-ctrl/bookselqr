import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { useCart } from '../hooks/useCart';
import { Header } from '../components/Header';
import { ProductCard } from '../components/ProductCard';
import { CartModal } from '../components/CartModal';
import { Share2, Check, Store, MessageCircle, ShoppingCart, ChevronDown, Instagram, Facebook, Loader2 } from 'lucide-react';

const REFERRAL_CODE_KEY = 'referral_id';

export default function StoreCatalog() {
  const { storeName } = useParams<{ storeName: string }>();
  const { user } = useAuth();
  const { totalItems } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [storeDisplayName, setStoreDisplayName] = useState('');
  const [catalogOwnerId, setCatalogOwnerId] = useState<string | null>(null);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerCountryCode, setOwnerCountryCode] = useState('');
  const [brandingData, setBrandingData] = useState<{ logoUrl: string | null; brandName: string | null; hasBranding: boolean } | null>(null);
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [slogan, setSlogan] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<{
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
  }>({ instagram: null, facebook: null, tiktok: null });
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);

  // Capture referral code from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      localStorage.setItem(REFERRAL_CODE_KEY, refCode);
      console.log('[Referral] Captured referral code from URL:', refCode);
    }
  }, []);

  useEffect(() => {
    const fetchStoreProducts = async () => {
      try {
        const response = await fetch(`/api/products/tienda/${storeName}`);
        
        // SECURITY VALIDATION: Check if store owner account was deleted
        if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.errorCode === 'STORE_NOT_FOUND') {
            console.log('[SECURITY] Store not found or owner deleted:', storeName);
            setNotFound(true);
            setLoading(false);
            return;
          }
        }
        
        if (!response.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setProducts(data.products || []);
        setStoreDisplayName(data.storeName || '');
        setCatalogOwnerId(data.userId || null);

        // Update page title
        if (data.storeName) {
          document.title = data.storeName;
        }

        // Fetch owner's contact info and branding data
        if (data.userId) {
          const ownerResponse = await fetch(`/api/subscription/user/${data.userId}`);
          if (ownerResponse.ok) {
            const ownerData = await ownerResponse.json();
            setOwnerPhone(ownerData.phone_number || '');
            setOwnerCountryCode(ownerData.country_code || '');
            setCarouselEnabled(ownerData.carousel_enabled || false);
            setSlogan(ownerData.slogan || null);
            setSocialLinks({
              instagram: ownerData.instagram_url || null,
              facebook: ownerData.facebook_url || null,
              tiktok: ownerData.tiktok_url || null,
            });
          }

          // Fetch branding data for the catalog owner (NOT the current visitor)
          console.log('Fetching branding for catalog owner ID:', data.userId);
          const brandingResponse = await fetch(`/api/branding/store/${data.userId}`);
          if (brandingResponse.ok) {
            const branding = await brandingResponse.json();
            console.log('✅ Branding data received:', {
              ownerUserId: data.userId,
              hasBranding: branding.hasBranding,
              hasLogo: !!branding.logoUrl,
              logoUrl: branding.logoUrl,
              hasBrandName: !!branding.brandName,
              brandName: branding.brandName
            });
            setBrandingData(branding);
          } else {
            console.error('❌ Failed to fetch branding for owner:', data.userId);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching store products:', error);
        setNotFound(true);
        setLoading(false);
      }
    };

    fetchStoreProducts();
  }, [storeName]);

  const handleCopyLink = async () => {
    try {
      const catalogUrl = window.location.href;
      await navigator.clipboard.writeText(catalogUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const isOwner = user && catalogOwnerId ? catalogOwnerId === user.id : false;

  // Get unique categories from products (sorted alphabetically)
  const categories = Array.from(new Set(products.map(p => p.categoria || 'Sin Categoría'))).sort();
  const categoryList = ['Todos', ...categories];

  // Filter products by category AND visibility (public catalog only shows visible products)
  // Backend already filters, but this is an additional safety layer
  const visibleProducts = products.filter(product => product.is_visible !== 0);
  const filteredProducts = selectedCategory === 'Todos' 
    ? visibleProducts 
    : visibleProducts.filter(product => (product.categoria || 'Sin Categoría') === selectedCategory);

  // Paginated products - only show displayLimit number of products
  const displayedProducts = filteredProducts.slice(0, displayLimit);
  const hasMoreProducts = filteredProducts.length > displayLimit;

  // Reset display limit when category changes
  useEffect(() => {
    setDisplayLimit(10);
  }, [selectedCategory]);

  // Infinite scroll handler
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMoreProducts) return;
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 10);
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMoreProducts]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollPercent = (scrollTop + windowHeight) / docHeight;
      
      if (scrollPercent > 0.8 && hasMoreProducts && !loadingMore) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, hasMoreProducts, loadingMore]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Store className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tienda no encontrada</h1>
          <p className="text-slate-600 mb-6">
            No pudimos encontrar esta tienda. Verifica que el link sea correcto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 overflow-x-hidden w-full">
      {/* Header visible to everyone - owner gets full header, visitors get simplified version */}
      {isOwner ? (
        <Header 
          onGenerateClick={() => {}}
          canGenerate={false}
          isOwner={isOwner}
          onCartClick={() => setIsCartModalOpen(true)}
          cartItemCount={totalItems}
        />
      ) : (
        <header className="sticky top-0 bg-white border-b border-slate-200 shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo/Brand Name + Slogan - Left aligned with 25px gap */}
              <div className="flex items-center gap-[25px]">
                {brandingData?.logoUrl ? (
                  <>
                    <img 
                      src={brandingData.logoUrl} 
                      alt="Logo del negocio"
                      className="h-[80px] w-auto max-w-[200px] object-contain flex-shrink-0"
                      style={{ 
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08))'
                      }}
                      onLoad={() => console.log('✅ Logo loaded successfully:', brandingData.logoUrl)}
                      onError={(e) => {
                        console.error('❌ Error loading logo image:', brandingData.logoUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {slogan && (
                      <div className="flex flex-col gap-2">
                        <p className="text-2xl sm:text-3xl text-slate-800 font-bold max-w-md break-words">
                          {slogan}
                        </p>
                        {/* Social Media Icons */}
                        {(socialLinks.instagram || socialLinks.facebook || socialLinks.tiktok) && (
                          <div className="flex items-center gap-2">
                            {socialLinks.instagram && (
                              <a
                                href={socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="Instagram"
                              >
                                <Instagram className="w-4 h-4 text-white" strokeWidth={2.5} />
                              </a>
                            )}
                            {socialLinks.facebook && (
                              <a
                                href={socialLinks.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="Facebook"
                              >
                                <Facebook className="w-4 h-4 text-white" strokeWidth={2.5} />
                              </a>
                            )}
                            {socialLinks.tiktok && (
                              <a
                                href={socialLinks.tiktok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="TikTok"
                              >
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : brandingData?.brandName ? (
                  <>
                    <h1 className="text-xl font-semibold text-slate-900 flex-shrink-0" style={{ fontFamily: 'Georgia, serif' }}>
                      {brandingData.brandName}
                    </h1>
                    {slogan && (
                      <div className="flex flex-col gap-2">
                        <p className="text-2xl sm:text-3xl text-slate-800 font-bold max-w-md break-words">
                          {slogan}
                        </p>
                        {/* Social Media Icons */}
                        {(socialLinks.instagram || socialLinks.facebook || socialLinks.tiktok) && (
                          <div className="flex items-center gap-2">
                            {socialLinks.instagram && (
                              <a
                                href={socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="Instagram"
                              >
                                <Instagram className="w-4 h-4 text-white" strokeWidth={2.5} />
                              </a>
                            )}
                            {socialLinks.facebook && (
                              <a
                                href={socialLinks.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="Facebook"
                              >
                                <Facebook className="w-4 h-4 text-white" strokeWidth={2.5} />
                              </a>
                            )}
                            {socialLinks.tiktok && (
                              <a
                                href={socialLinks.tiktok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="TikTok"
                              >
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h1 className="text-xl font-bold text-slate-900 flex-shrink-0">BookselQR</h1>
                    {slogan && (
                      <div className="flex flex-col gap-2">
                        <p className="text-2xl sm:text-3xl text-slate-800 font-bold max-w-md break-words">
                          {slogan}
                        </p>
                        {/* Social Media Icons */}
                        {(socialLinks.instagram || socialLinks.facebook || socialLinks.tiktok) && (
                          <div className="flex items-center gap-2">
                            {socialLinks.instagram && (
                              <a
                                href={socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="Instagram"
                              >
                                <Instagram className="w-4 h-4 text-white" strokeWidth={2.5} />
                              </a>
                            )}
                            {socialLinks.facebook && (
                              <a
                                href={socialLinks.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="Facebook"
                              >
                                <Facebook className="w-4 h-4 text-white" strokeWidth={2.5} />
                              </a>
                            )}
                            {socialLinks.tiktok && (
                              <a
                                href={socialLinks.tiktok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                title="TikTok"
                              >
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Cart Button - Right side */}
              <button
                onClick={() => setIsCartModalOpen(true)}
                className="p-2 hover:bg-green-50 rounded-lg transition-all duration-200 group flex items-center justify-center flex-shrink-0"
                title="Carrito de Compras"
              >
                <ShoppingCart className="w-6 h-6 text-green-600" strokeWidth={2} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>
      )}
      
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        ownerPhone={ownerPhone}
        ownerCountryCode={ownerCountryCode}
        storeName={storeDisplayName}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-8">
        <div className="mb-8">
          {/* Share Button for Visitors */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
              title="Compartir catálogo"
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Compartir</span>
                </>
              )}
            </button>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            {storeDisplayName}
          </h2>

          {/* Category Dropdown Menu */}
          {products.length > 0 && categoryList.length > 1 && (
            <div className="mb-6 relative">
              <button
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="flex items-center justify-between gap-3 px-5 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md font-medium min-w-[220px]"
              >
                <span className="text-base">
                  {selectedCategory === 'Todos' ? 'Explorar Categorías' : selectedCategory}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isCategoryDropdownOpen ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* Dropdown List */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {categoryList.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-3.5 transition-all font-medium border-b border-slate-100 last:border-b-0 ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {filteredProducts.length > 0 ? (
          <>
            <div className="max-w-2xl mx-auto space-y-6">
              {displayedProducts.map(product => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  description={product.description}
                  imageUrl={product.image_url}
                  imageUrl2={product.image_url_2}
                  imageUrl3={product.image_url_3}
                  carouselEnabled={carouselEnabled}
                  isOwner={false}
                  offerPrice={product.offer_price}
                  offerEndDate={product.offer_end_date}
                  likesCount={product.likes_count || 0}
                  ocultarPrecio={product.ocultar_precio === 1}
                  ownerWhatsapp={ownerCountryCode && ownerPhone ? `${ownerCountryCode.replace(/\D/g, '')}${ownerPhone.replace(/\D/g, '')}` : undefined}
                />
              ))}
            </div>
            
            {/* Infinite Scroll Loading Indicator */}
            {loadingMore && (
              <div className="max-w-2xl mx-auto mt-8 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-sm text-slate-500 mt-2">Cargando más...</p>
              </div>
            )}
          </>
        ) : products.length > 0 && filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Store className="w-12 h-12 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              No hay productos en esta categoría
            </h3>
            <p className="text-slate-600">
              Selecciona otra categoría para ver más productos
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Store className="w-12 h-12 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Catálogo vacío
            </h3>
            <p className="text-slate-600">
              Esta tienda aún no tiene productos
            </p>
          </div>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      {ownerPhone && ownerCountryCode && (
        <button
          onClick={() => {
            const cleanPhone = ownerPhone.replace(/\D/g, '');
            const cleanCountry = ownerCountryCode.replace(/\D/g, '');
            const whatsappNumber = `${cleanCountry}${cleanPhone}`;
            const message = '¡Hola! Tengo una consulta sobre los productos de tu catálogo';
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
          }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
          style={{ backgroundColor: '#25D366' }}
          title="Consultar por WhatsApp"
        >
          <MessageCircle className="w-7 h-7 text-white" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
