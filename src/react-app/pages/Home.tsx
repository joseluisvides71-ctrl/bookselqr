import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { useCart } from '../hooks/useCart';
import { Header } from '../components/Header';
import { ProductCard } from '../components/ProductCard';
import { GenerateProductModal } from '../components/GenerateProductModal';
import { EditProductModal } from '../components/EditProductModal';
import { LoginModal } from '../components/LoginModal';
import { SubscriptionBanner } from '../components/SubscriptionBanner';
import { CartModal } from '../components/CartModal';
import { CategoriesModal } from '../components/CategoriesModal';
import { Toast } from '../components/Toast';
import { Store, AlertCircle, Link2, Check, Share2, Tag, QrCode, Download, X, MessageCircle } from 'lucide-react';
import QRCode from 'qrcode';

export default function Home() {
  const { user, isPending } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const productsRef = useRef<HTMLDivElement>(null);

  // Redirect non-authenticated users to landing page
  useEffect(() => {
    if (!isPending && !user) {
      navigate('/');
    }
  }, [user, isPending, navigate]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(true);
  const [catalogOwnerId, setCatalogOwnerId] = useState<string | null>(null);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerCountryCode, setOwnerCountryCode] = useState('');
  const [ownerStoreName, setOwnerStoreName] = useState('');
  const [ownerLogoUrl, setOwnerLogoUrl] = useState('');
  const [ownerSlogan, setOwnerSlogan] = useState('');
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);



  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      
      try {
        const profileResponse = await fetch('/api/profile/status');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          
          if (!profileData.hasCompletedProfile) {
            navigate('/profile-setup');
            return;
          }
          
          setHasCompletedProfile(true);
        }
      } catch (error) {
        console.error('Error checking profile status:', error);
      }
    };

    checkProfile();
  }, [user, navigate]);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user || !hasCompletedProfile) return;
      
      try {
        const response = await fetch('/api/subscription/status');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionStatus(data);
          setIsPremium(data.isPremium || false);
        }

        // Also check profile status for WhatsApp configuration
        const profileResponse = await fetch('/api/profile/status');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setWhatsappConfigured(profileData.whatsappConfigured || false);
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error);
      }
    };

    fetchSubscriptionStatus();
  }, [user, products, hasCompletedProfile]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // SECURITY: Only fetch products for the logged-in user
        if (!user) {
          setProducts([]);
          return;
        }
        
        const response = await fetch(`/api/products?userId=${user.id}`);
        
        // SECURITY VALIDATION: Check if user account has been deleted
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.errorCode === 'ACCOUNT_DELETED') {
            console.log('[SECURITY] Account deleted - forcing logout');
            alert('Esta cuenta ya no existe o ha sido dada de baja');
            
            // Force logout
            try {
              await fetch('/api/auth/logout');
            } catch (logoutError) {
              console.error('Error during logout:', logoutError);
            }
            
            // Clear any local storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to landing page
            window.location.href = '/';
            return;
          }
        }
        
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
          
          // Set catalog owner ID from first product if available
          if (data.length > 0 && data[0].user_id) {
            setCatalogOwnerId(data[0].user_id);
            
            // Fetch owner's contact info for WhatsApp
            const ownerResponse = await fetch('/api/subscription');
            if (ownerResponse.ok) {
              const ownerData = await ownerResponse.json();
              setOwnerPhone(ownerData.phone_number || '');
              setOwnerCountryCode(ownerData.country_code || '');
              setOwnerStoreName(ownerData.store_name || 'Catálogo');
              setOwnerLogoUrl(ownerData.logo_url || '');
              setOwnerSlogan(ownerData.slogan || '');
              
              // Update page title for SEO
              if (ownerData.store_name) {
                document.title = ownerData.store_name;
              }
            }
          } else if (user) {
            // If no products yet but user is logged in, they're the owner
            setCatalogOwnerId(user.id);
            
            // Still fetch subscription data for phone and store name
            const ownerResponse = await fetch('/api/subscription');
            if (ownerResponse.ok) {
              const ownerData = await ownerResponse.json();
              setOwnerPhone(ownerData.phone_number || '');
              setOwnerCountryCode(ownerData.country_code || '');
              setOwnerStoreName(ownerData.store_name || 'Catálogo');
              setOwnerLogoUrl(ownerData.logo_url || '');
              setOwnerSlogan(ownerData.slogan || '');
              
              // Update page title for SEO
              if (ownerData.store_name) {
                document.title = ownerData.store_name;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [user]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, [user, isCategoriesModalOpen]);

  const handleGenerateClick = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    
    if (subscriptionStatus && !subscriptionStatus.canGenerate) {
      return;
    }
    
    setIsModalOpen(true);
  };

  const handleProductGenerated = async () => {
    // Refresh products list with userId parameter for security
    if (!user) return;
    
    const response = await fetch(`/api/products?userId=${user.id}`);
    if (response.ok) {
      const data = await response.json();
      setProducts(data);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    // Optimistic update: Remove product from UI immediately
    setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
    
    // Always show success message - deletion is considered successful once initiated
    setToast({ message: '✅ Producto eliminado correctamente', type: 'success' });
    
    try {
      // Call delete endpoint (fire and forget - don't wait for confirmation)
      await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      
      // Refresh products list silently in the background
      if (user) {
        const updatedResponse = await fetch(`/api/products?userId=${user.id}`);
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setProducts(data);
        }
      }
    } catch (error) {
      // Silently handle any errors - product already removed from UI
      console.log('Delete request completed');
      
      // Refresh to ensure sync
      if (user) {
        const refreshResponse = await fetch(`/api/products?userId=${user.id}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setProducts(data);
        }
      }
    }
  };

  const getStoreUrl = () => {
    if (!subscriptionStatus?.storeName) return window.location.origin + '/home';
    const storeSlug = subscriptionStatus.storeName.toLowerCase().replace(/\s+/g, '-');
    return `${window.location.origin}/tienda/${storeSlug}`;
  };

  const handleCopyLink = async () => {
    try {
      const catalogUrl = getStoreUrl();
      await navigator.clipboard.writeText(catalogUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const catalogUrl = getStoreUrl();
      const qrDataUrl = await QRCode.toDataURL(catalogUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#4F46E5',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
      setShowQrModal(true);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${subscriptionStatus?.storeName || 'catalogo'}-qr.png`;
    link.click();
  };

  // Don't render anything while checking auth
  if (isPending || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const canGenerate = subscriptionStatus ? subscriptionStatus.canGenerate : false;
  const isOwner = catalogOwnerId ? catalogOwnerId === user.id : false;
  const isMembershipExpired = subscriptionStatus?.isMembershipExpired || false;

  // Build category list with "Todos" and user's custom categories (sorted alphabetically)
  const categoryList = ['Todos', ...categories.map(c => c.name).sort(), 'Sin Categoría'];

  // Filter products by category (owner sees ALL products including hidden ones)
  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(product => (product.categoria || 'Sin Categoría') === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 overflow-x-hidden w-full">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Header 
        onGenerateClick={handleGenerateClick} 
        canGenerate={canGenerate} 
        isOwner={isOwner}
        onCartClick={() => setIsCartModalOpen(true)}
        cartItemCount={totalItems}
        onInventoryClick={isOwner ? () => {
          // Force scroll to products management section
          setTimeout(() => {
            productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        } : undefined}
        inventoryCount={products.filter(p => p.is_visible).length}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
      <GenerateProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProductGenerated={handleProductGenerated}
        userCategories={categories}
        isPremium={isPremium}
      />
      {editingProduct && (
        <EditProductModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          onProductUpdated={handleProductGenerated}
          userCategories={categories}
          isPremium={isPremium}
          carouselEnabled={subscriptionStatus?.carouselEnabled || false}
        />
      )}

      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        ownerPhone={ownerPhone}
        ownerCountryCode={ownerCountryCode}
        storeName={ownerStoreName}
      />
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
      />
      
      {/* QR Code Modal */}
      {showQrModal && qrCodeUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Tu Código QR</h2>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-white border-4 border-indigo-100 rounded-2xl p-6 mb-6">
                <img src={qrCodeUrl} alt="QR Code" className="w-full h-auto" />
              </div>
              <p className="text-sm text-slate-600 text-center mb-6">
                Descarga este código QR e imprímelo para que tus clientes puedan escanear y ver tu catálogo
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Descargar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="mb-8">
          {user && subscriptionStatus && isOwner && (
            <SubscriptionBanner
              productsCount={subscriptionStatus.productsCount}
              productsRemaining={subscriptionStatus.productsRemaining}
              trialDaysRemaining={subscriptionStatus.trialDaysRemaining}
              isTrialExpired={subscriptionStatus.isTrialExpired}
              canGenerate={subscriptionStatus.canGenerate}
              membershipStatus={subscriptionStatus.membershipStatus}
              membershipExpiration={subscriptionStatus.membershipExpiration}
              isMembershipExpired={subscriptionStatus.isMembershipExpired}
              phoneNumber={subscriptionStatus.phoneNumber}
              countryCode={subscriptionStatus.countryCode}
              whatsappConfigured={whatsappConfigured}
            />
          )}

          {/* Owner Controls: Share Link, QR Code, and Manage Categories */}
          {isOwner && (
            <div className="mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-6 h-6" />
                      ¡Link copiado! Ya puedes pegarlo en tu Instagram o WhatsApp
                    </>
                  ) : (
                    <>
                      <Link2 className="w-6 h-6" />
                      🔗 Copiar Link de mi Catálogo
                    </>
                  )}
                </button>
                <button
                  onClick={handleGenerateQR}
                  className="sm:w-auto px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                >
                  <QrCode className="w-5 h-5" />
                  🔳 Descargar mi Código QR
                </button>
              </div>
              <button
                onClick={() => setIsCategoriesModalOpen(true)}
                className="w-full sm:w-auto px-6 py-4 bg-white border-2 border-indigo-200 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3"
              >
                <Tag className="w-5 h-5" />
                Mis Categorías
              </button>
            </div>
          )}
          
          {/* Share Button for Visitors (top right corner) */}
          {!isOwner && products.length > 0 && (
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
          )}

          {/* Store Header with Logo and Slogan */}
          <div className="flex items-center gap-4 mb-6">
            {ownerLogoUrl && (
              <img 
                src={ownerLogoUrl} 
                alt={ownerStoreName || 'Logo'} 
                className="w-20 h-20 object-contain rounded-xl shadow-lg border-2 border-white"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
              />
            )}
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {ownerStoreName || 'Catálogo de Productos'}
              </h2>
              {ownerSlogan && (
                <p className="text-slate-600 text-lg mt-1 italic">
                  {ownerSlogan}
                </p>
              )}
            </div>
          </div>

          {/* Category Filter Bar */}
          {products.length > 0 && categoryList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
              {categoryList.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {filteredProducts.length > 0 ? (
          <div className="max-w-2xl mx-auto space-y-6">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                description={product.description}
                imageUrl={product.image_url}
                imageUrl2={product.image_url_2}
                imageUrl3={product.image_url_3}
                isOwner={isOwner}
                onEdit={isOwner ? () => handleEditProduct(product) : undefined}
                onDelete={isOwner ? () => handleDeleteProduct(product.id) : undefined}
                offerPrice={product.offer_price}
                offerEndDate={product.offer_end_date}
                isVisible={product.is_visible === 1}
                carouselEnabled={subscriptionStatus?.carouselEnabled || false}
                likesCount={product.likes_count || 0}
                ocultarPrecio={product.ocultar_precio === 1}
                ownerWhatsapp={ownerCountryCode && ownerPhone ? `${ownerCountryCode.replace(/\D/g, '')}${ownerPhone.replace(/\D/g, '')}` : undefined}
              />
            ))}
          </div>
        ) : products.length > 0 && filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Store className="w-12 h-12 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              No hay productos en esta categoría
            </h3>
            <p className="text-slate-600 mb-6">
              Selecciona otra categoría o genera más productos
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Store className="w-12 h-12 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Tu catálogo está vacío
            </h3>
            <p className="text-slate-600 mb-6">
              Genera tu primer producto con IA para empezar
            </p>
            {isOwner && (
              <button
                onClick={handleGenerateClick}
                disabled={!canGenerate}
                className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                  canGenerate
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Generar Producto
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      {ownerPhone && ownerCountryCode && !isMembershipExpired && (
        <button
          onClick={async () => {
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
      
      {/* Expired membership message - replaces floating button when expired */}
      {isOwner && isMembershipExpired && (
        <div className="fixed bottom-8 right-8 bg-white rounded-2xl shadow-2xl p-6 max-w-sm border-2 border-red-200 z-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Plan Vencido</h3>
            <p className="text-sm text-slate-600 mb-4">
              Por favor, realiza tu pago para seguir gestionando tu catálogo
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Ver opciones de pago
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
