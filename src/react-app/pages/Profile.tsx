import { useEffect, useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';
import { Copy, Gift, Users, CheckCircle, ExternalLink, Store, Mail, CreditCard, LogOut, MessageCircle, Save, Rocket, Upload, Image as ImageIcon } from 'lucide-react';
import { PaymentCenter } from '../components/PaymentCenter';

interface UserSubscription {
  referral_code: string;
  successful_referrals_count: number;
  total_referrals: number;
  phone_number: string;
  country_code: string;
  store_name: string;
  membership_expiration: string;
  branding_expiration: string | null;
  offers_expiration: string | null;
  status: string;
  has_branding_unlocked: number;
  logo_url: string | null;
  slogan: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
}

interface PaymentConfig {
  payment_subscription_price: string;
  payment_monthly_maintenance: string;
  payment_branding_price: string;
  payment_whatsapp_support: string;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingWhatsApp, setEditingWhatsApp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+503');
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [editingStoreName, setEditingStoreName] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [savingStoreName, setSavingStoreName] = useState(false);
  const [storeNameSaved, setStoreNameSaved] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isPaymentCenterOpen, setIsPaymentCenterOpen] = useState(false);
  const [paymentCenterDefaultMembership, setPaymentCenterDefaultMembership] = useState(false);
  const [slogan, setSlogan] = useState('');
  const [savingSlogan, setSavingSlogan] = useState(false);
  const [sloganSaved, setSloganSaved] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialSaved, setSocialSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/subscription', {
          // Force fresh data from server, bypass cache
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        // SECURITY VALIDATION: Check if user account has been deleted
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.errorCode === 'ACCOUNT_DELETED') {
            console.log('[SECURITY] Account deleted - forcing logout from Profile');
            alert('Esta cuenta ya no existe o ha sido dada de baja');
            
            // Force logout
            try {
              await logout();
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
          setSubscription(data);
          setWhatsappNumber(data.phone_number || '');
          setWhatsappCountryCode(data.country_code || '+503');
          setStoreName(data.store_name || '');
          setSlogan(data.slogan || '');
          
          // Fix: Properly initialize social media URLs from subscription data
          const instagramValue = data.instagram_url || '';
          const facebookValue = data.facebook_url || '';
          const tiktokValue = data.tiktok_url || '';
          
          console.log('[PROFILE] Loading social media:', { instagramValue, facebookValue, tiktokValue });
          
          setInstagramUrl(instagramValue);
          setFacebookUrl(facebookValue);
          setTiktokUrl(tiktokValue);
          
          if (data.logo_url) {
            setLogoPreview(data.logo_url);
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

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

    fetchSubscription();
    fetchPaymentConfig();

    // Refresh data when user returns to the page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, navigate]);

  if (!user || !subscription || !paymentConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const subscriptionPrice = paymentConfig.payment_subscription_price || '15';
  const maintenancePrice = paymentConfig.payment_monthly_maintenance || '2';

  // Generate unique referral link using user's referral code
  const referralLink = subscription.referral_code 
    ? `${window.location.origin}/?ref=${subscription.referral_code}`
    : '';
  
  const referralsProgress = subscription.total_referrals % 3;
  const referralsNeeded = 3 - referralsProgress;
  const progressPercentage = (referralsProgress / 3) * 100;

  // Determine account status display
  const isPaidSubscriber = subscription.status === 'Pagado' || subscription.status === 'Plan Ilimitado';
  const accountStatusLabel = isPaidSubscriber ? 'Plan Ilimitado' : 'Modo Prueba';
  const accountStatusColor = isPaidSubscriber ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';

  const copyReferralLink = () => {
    if (!subscription.referral_code || !referralLink) {
      alert('Error: No se pudo generar el link de referido. Por favor recarga la página.');
      return;
    }
    
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const message = `¡Únete a BookselQR y crea tu catálogo de productos con IA! 🚀\n\nRegistra tu negocio gratis usando mi enlace de referido:\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSaveWhatsApp = async () => {
    setSavingWhatsApp(true);
    try {
      const response = await fetch('/api/profile/update-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: whatsappNumber,
          countryCode: whatsappCountryCode,
        }),
      });

      if (response.ok) {
        setEditingWhatsApp(false);
        setWhatsappSaved(true);
        setTimeout(() => setWhatsappSaved(false), 3000);
        
        // Refresh subscription data
        const refreshResponse = await fetch('/api/subscription');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setSubscription(data);
        }
      }
    } catch (error) {
      console.error('Error updating WhatsApp:', error);
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSaveStoreName = async () => {
    if (!storeName.trim()) {
      alert('El nombre de la tienda no puede estar vacío');
      return;
    }

    setSavingStoreName(true);
    try {
      const response = await fetch('/api/profile/update-store-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: storeName.trim(),
        }),
      });

      if (response.ok) {
        setEditingStoreName(false);
        setStoreNameSaved(true);
        setTimeout(() => setStoreNameSaved(false), 3000);
        
        // Refresh subscription data
        const refreshResponse = await fetch('/api/subscription');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setSubscription(data);
        }
      }
    } catch (error) {
      console.error('Error updating store name:', error);
    } finally {
      setSavingStoreName(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Tamaño máximo: 5MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      alert('Por favor selecciona un logo primero');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await fetch('/api/branding/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLogoPreview(data.logoUrl);
        setLogoFile(null);
        alert('✅ Logo subido correctamente');
        
        // Refresh subscription data
        const refreshResponse = await fetch('/api/subscription');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setSubscription(refreshData);
        }
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('❌ Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveSlogan = async () => {
    setSavingSlogan(true);
    try {
      const response = await fetch('/api/profile/update-slogan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slogan: slogan.substring(0, 80), // Enforce 80 character limit
        }),
      });

      if (response.ok) {
        setSloganSaved(true);
        setTimeout(() => setSloganSaved(false), 3000);
        
        // Refresh subscription data
        const refreshResponse = await fetch('/api/subscription');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setSubscription(data);
        }
      }
    } catch (error) {
      console.error('Error updating slogan:', error);
    } finally {
      setSavingSlogan(false);
    }
  };

  const handleSaveSocialMedia = async () => {
    setSavingSocial(true);
    try {
      console.log('[PROFILE] Saving social media:', { instagramUrl, facebookUrl, tiktokUrl });
      
      const response = await fetch('/api/profile/update-social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instagram_url: instagramUrl || '',
          facebook_url: facebookUrl || '',
          tiktok_url: tiktokUrl || '',
        }),
      });

      if (response.ok) {
        console.log('[PROFILE] Social media saved successfully');
        setSocialSaved(true);
        setTimeout(() => setSocialSaved(false), 3000);
        
        // Force refresh subscription data with cache bypass
        const refreshResponse = await fetch('/api/subscription', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setSubscription(data);
          
          console.log('[PROFILE] Refreshed data:', {
            instagram_url: data.instagram_url,
            facebook_url: data.facebook_url,
            tiktok_url: data.tiktok_url
          });
          
          // Ensure state stays in sync
          setInstagramUrl(data.instagram_url || '');
          setFacebookUrl(data.facebook_url || '');
          setTiktokUrl(data.tiktok_url || '');
        }
      } else {
        const error = await response.json();
        console.error('[PROFILE] Failed to save social media:', error);
        alert('Error al guardar las redes sociales');
      }
    } catch (error) {
      console.error('[PROFILE] Error updating social media:', error);
      alert('Error al guardar las redes sociales');
    } finally {
      setSavingSocial(false);
    }
  };

  const handleActivateMembership = () => {
    setPaymentCenterDefaultMembership(true);
    setIsPaymentCenterOpen(true);
  };

  const handleActivatePremiumPlan = () => {
    setPaymentCenterDefaultMembership(false);
    setIsPaymentCenterOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/home')}
            className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 flex items-center gap-2"
          >
            ← Volver al catálogo
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Mi Perfil
          </h1>
          <p className="text-slate-600">Información de tu cuenta y sistema de referidos</p>
        </div>



        {/* Branding Section - Only if unlocked */}
        {subscription.has_branding_unlocked === 1 ? (
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl shadow-xl p-6 mb-6 border-2 border-pink-200">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-600" />
                Personalización de Marca Pro
              </h2>
            </div>
            <p className="text-sm text-pink-700 mb-6">
              🎨 Sube aquí el logo que aparecerá en tu catálogo (Solo usuarios Premium)
            </p>
            
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="bg-white rounded-xl p-4 border-2 border-dashed border-pink-300">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Logo del Negocio
                </label>
                
                {logoPreview ? (
                  <div className="space-y-3">
                    <div className="relative w-48 h-48 mx-auto">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded-lg border-2 border-pink-200"
                      />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                        <div className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium text-center">
                          Cambiar Logo
                        </div>
                      </label>
                      {logoFile && (
                        <button
                          onClick={handleUploadLogo}
                          disabled={uploadingLogo}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all font-medium disabled:opacity-50"
                        >
                          {uploadingLogo ? (
                            <>Subiendo...</>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Guardar Logo
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                      <div className="inline-flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-pink-600" />
                        </div>
                        <span className="text-pink-600 font-semibold">Haz clic para seleccionar un logo</span>
                        <span className="text-xs text-slate-500">PNG, JPG, GIF o WEBP (máx. 5MB)</span>
                      </div>
                    </label>
                    {logoFile && (
                      <button
                        onClick={handleUploadLogo}
                        disabled={uploadingLogo}
                        className="mt-4 flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all font-medium disabled:opacity-50"
                      >
                        {uploadingLogo ? (
                          <>Subiendo...</>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Subir Logo
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Slogan */}
              <div className="bg-white rounded-xl p-4 border border-pink-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Slogan o Mensaje de la Tienda
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value.substring(0, 80))}
                  placeholder="Ej: Tu tienda de confianza"
                  maxLength={80}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {slogan.length}/80 caracteres
                </p>
                <button
                  onClick={handleSaveSlogan}
                  disabled={savingSlogan}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all font-medium disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {savingSlogan ? 'Guardando...' : 'Guardar Slogan'}
                </button>
                {sloganSaved && (
                  <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    ¡Slogan guardado exitosamente!
                  </p>
                )}
              </div>

              {/* Social Media Links */}
              <div className="bg-white rounded-xl p-4 border border-pink-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Redes Sociales (Opcional)
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Instagram</label>
                    <input
                      type="text"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/tu-negocio"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Facebook</label>
                    <input
                      type="text"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/tu-negocio"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">TikTok</label>
                    <input
                      type="text"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@tu-negocio"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveSocialMedia}
                  disabled={savingSocial}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all font-medium disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {savingSocial ? 'Guardando...' : 'Guardar Redes Sociales'}
                </button>
                {socialSaved && (
                  <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    ¡Redes sociales guardadas exitosamente!
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-indigo-600" />
              Planes Disponibles
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Elige el plan que mejor se adapte a tu negocio
            </p>
            
            <div className="px-4 space-y-3">
              {/* Membership Button */}
              <button
                onClick={handleActivateMembership}
                className="w-full h-[50px] flex items-center justify-center gap-2 px-4 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                <Store className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Activar Membresía (3 Meses)</span>
              </button>
              
              {/* Premium Plan Button */}
              <button
                onClick={handleActivatePremiumPlan}
                className="w-full h-[50px] flex items-center justify-center gap-2 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <Rocket className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Plan Premium</span>
              </button>
            </div>
            
            <p className="text-center text-xs text-slate-500 mt-4">
              Te contactaremos por WhatsApp para activar tu plan
            </p>
          </div>
        )}

        {/* Business Data Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            Datos del Negocio
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600">Email del Usuario</p>
                <p className="font-semibold text-slate-900">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t pt-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">Nombre de la Tienda</p>
                  {!editingStoreName && (
                    <button
                      onClick={() => setEditingStoreName(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Editar
                    </button>
                  )}
                </div>
                
                {editingStoreName ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Mi Tienda"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingStoreName(false);
                          setStoreName(subscription.store_name || '');
                        }}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveStoreName}
                        disabled={savingStoreName || !storeName.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {savingStoreName ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Este nombre aparecerá en tu catálogo público
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-slate-900">
                      {subscription.store_name || 'No configurado'}
                    </p>
                    {!subscription.store_name && (
                      <p className="text-sm text-amber-600 mt-1">
                        ⚠️ Configura el nombre de tu tienda
                      </p>
                    )}
                    {storeNameSaved && (
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        ¡Guardado exitosamente!
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* WhatsApp for Orders - Editable */}
            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">Tu Número de WhatsApp para Pedidos</p>
                    {!editingWhatsApp && (
                      <button
                        onClick={() => setEditingWhatsApp(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  
                  {editingWhatsApp ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={whatsappCountryCode}
                          onChange={(e) => setWhatsappCountryCode(e.target.value)}
                          placeholder="+503"
                          className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                        <input
                          type="text"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="7000-0000"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingWhatsApp(false);
                            setWhatsappNumber(subscription.phone_number || '');
                            setWhatsappCountryCode(subscription.country_code || '+503');
                          }}
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveWhatsApp}
                          disabled={savingWhatsApp || !whatsappNumber}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {savingWhatsApp ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        Los clientes usarán este número para enviarte sus pedidos por WhatsApp
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">
                        {subscription.phone_number 
                          ? `${subscription.country_code} ${subscription.phone_number}`
                          : 'No configurado'}
                      </p>
                      {!subscription.phone_number && (
                        <p className="text-sm text-amber-600 mt-1">
                          ⚠️ Configura tu número para recibir pedidos
                        </p>
                      )}
                      {whatsappSaved && (
                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          ¡Guardado exitosamente!
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Status Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Estado de Cuenta
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Plan Actual:</span>
              <span className={`px-4 py-2 ${accountStatusColor} rounded-full text-sm font-bold`}>
                {accountStatusLabel}
              </span>
            </div>
            
            {/* Membership Expiration */}
            {subscription.membership_expiration && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-700 font-semibold">Membresía Básica</span>
                  <span className="text-sm text-slate-600">
                    {new Date(subscription.membership_expiration).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            )}

            {!isPaidSubscriber && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Modo Prueba:</span> Tienes acceso limitado. Actualiza a Plan Ilimitado para crear productos sin restricciones. Ve a la sección "Mejorar mi Plan" arriba para activar funciones premium.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Referral Program */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Sistema de Referidos</h2>
              <p className="text-indigo-100">Gana meses gratis recomendando BookselQR</p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-semibold">Referidos: {referralsProgress}/3</span>
              <span className="text-sm text-indigo-100">
                {referralsNeeded === 0 ? '¡Ganaste un mes gratis!' : `${referralsNeeded} más para tu mes gratis`}
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-yellow-400 to-yellow-300 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                style={{ width: `${progressPercentage}%` }}
              >
                {progressPercentage > 10 && <span className="text-xs font-bold">✨</span>}
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              ¿Cómo funciona?
            </h3>
            <ol className="space-y-2 text-sm text-indigo-100">
              <li className="flex items-start gap-2">
                <span className="font-bold text-yellow-300">1.</span>
                <span>Comparte tu enlace de referido con amigos y colegas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-yellow-300">2.</span>
                <span>Cuando se registren y realicen su primer pago de ${subscriptionPrice}, cuentan como referido exitoso</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-yellow-300">3.</span>
                <span>Por cada 3 referidos exitosos, ganas 1 mes gratis de mantenimiento (valor ${maintenancePrice})</span>
              </li>
            </ol>
          </div>

          {/* Referral Link */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold mb-2">Tu Link Único de Invitado:</label>
            
            {!subscription.referral_code || !referralLink ? (
              <div className="bg-red-500/20 border border-red-300 rounded-xl p-4 text-center">
                <p className="text-white font-medium">
                  ⚠️ Inicia sesión para generar tu link
                </p>
                <p className="text-indigo-100 text-sm mt-2">
                  Recarga la página si acabas de iniciar sesión
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralLink}
                    readOnly
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-sm sm:text-base placeholder:text-indigo-200 focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all outline-none truncate"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 bg-white text-indigo-600 rounded-xl font-semibold text-sm sm:text-base hover:bg-indigo-50 transition-all flex items-center gap-1 sm:gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Display full link for verification */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <p className="text-xs text-indigo-100 mb-1 font-medium">Tu código de referido único:</p>
                  <p className="text-white font-mono text-sm break-all">{subscription.referral_code}</p>
                  <p className="text-xs text-indigo-100 mt-2">Link completo que se copiará:</p>
                  <p className="text-white text-xs break-all mt-1">{referralLink}</p>
                </div>

                <button
                  onClick={shareOnWhatsApp}
                  className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Compartir en WhatsApp</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-slate-600 text-sm">Invitados registrados</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{subscription.total_referrals || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-slate-600 text-sm">Meses Ganados</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {Math.floor((subscription.total_referrals || 0) / 3)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-slate-600 text-sm">Progreso Actual</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{referralsProgress}/3</p>
          </div>
        </div>

        {/* Logout Button */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-3 group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>Cerrar Sesión</span>
          </button>
          <p className="text-center text-sm text-slate-500 mt-3">
            Cierra sesión de forma segura
          </p>

          {/* Secret Admin Access - Only visible for admin email */}
          {user.email === 'joseluis.vides@gmail.com' && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => navigate('/admin')}
                className="text-xs text-slate-400 hover:text-indigo-600 transition-colors underline"
              >
                Configuración Avanzada
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Center */}
      {isPaymentCenterOpen && (
        <PaymentCenter 
          onClose={() => {
            setIsPaymentCenterOpen(false);
            setPaymentCenterDefaultMembership(false);
          }} 
          defaultMembership={paymentCenterDefaultMembership}
        />
      )}
    </div>
  );
}
