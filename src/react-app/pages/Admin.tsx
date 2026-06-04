import { useEffect, useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';
import { Users, CreditCard, Calendar, Loader2, Check, ShieldCheck, AlertCircle, Trash2, RefreshCw, Building2, Save, Crown, Palette, Upload, Store } from 'lucide-react';

interface AdminMetrics {
  totalUsers: number;
  paidUsers: number;
  trialUsers: number;
  totalProducts: number;
}

interface AdminUser {
  user_id: string;
  email: string | null;
  store_name: string | null;
  phone_number: string | null;
  country_code: string | null;
  status: string;
  membership_expiration: string | null;
  products_count: number;
  successful_referrals_count: number;
  total_referrals: number;
  is_premium: number;
  has_branding_unlocked: number;
  carousel_enabled: number;
  referred_by: string | null;
  created_at: string;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activatingUser, setActivatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [resettingTrial, setResettingTrial] = useState<string | null>(null);
  const [togglingPremium, setTogglingPremium] = useState<string | null>(null);
  const [whatsappSupport, setWhatsappSupport] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [binanceId, setBinanceId] = useState('');
  const [usdtQrUrl, setUsdtQrUrl] = useState('');
  const [subscriptionPrice, setSubscriptionPrice] = useState('');
  const [monthlyMaintenance, setMonthlyMaintenance] = useState('');
  const [extraOffers, setExtraOffers] = useState('');
  const [brandingPrice, setBrandingPrice] = useState('');
  const [wompiQrUrl, setWompiQrUrl] = useState('');
  const [wompiLink, setWompiLink] = useState('');
  const [savingPaymentConfig, setSavingPaymentConfig] = useState(false);
  const [paymentConfigSaved, setPaymentConfigSaved] = useState(false);
  const [togglingBranding, setTogglingBranding] = useState<string | null>(null);
  const [togglingCarousel, setTogglingCarousel] = useState<string | null>(null);
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);
  const [qrImagePreview, setQrImagePreview] = useState<string | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [deletingQr, setDeletingQr] = useState(false);
  const [wompiQrFile, setWompiQrFile] = useState<File | null>(null);
  const [wompiQrPreview, setWompiQrPreview] = useState<string | null>(null);
  const [uploadingWompiQr, setUploadingWompiQr] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    checkAdminAccess();
  }, [user, navigate]);

  const checkAdminAccess = async () => {
    try {
      // Only allow access for specific email
      if (user?.email !== 'joseluis.vides@gmail.com') {
        navigate('/home');
        return;
      }

      const response = await fetch('/api/admin/check');
      const data = await response.json();
      
      if (!data.isAdmin) {
        navigate('/home');
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchMetrics(), fetchUsers(), fetchPaymentConfig()]);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchPaymentConfig = async () => {
    try {
      const response = await fetch('/api/admin/payment-config');
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Datos recibidos del backend:', data);
        console.log('🔗 Wompi Link recibido:', data.payment_wompi_link);
        console.log('📷 Wompi QR recibido:', data.payment_wompi_qr_url);
        setWhatsappSupport(data.payment_whatsapp_support || '');
        setUsdtAddress(data.payment_usdt_address || '');
        setBinanceId(data.payment_binance_id || '');
        setUsdtQrUrl(data.payment_usdt_qr_url || '');
        setSubscriptionPrice(data.payment_subscription_price || '15');
        setMonthlyMaintenance(data.payment_monthly_maintenance || '2');
        setExtraOffers(data.payment_extra_offers || '5');
        setBrandingPrice(data.payment_branding_price || '5');
        setWompiQrUrl(data.payment_wompi_qr_url || '');
        setWompiLink(data.payment_wompi_link || '');
        console.log('✅ Estados actualizados - wompiLink:', data.payment_wompi_link, 'wompiQrUrl:', data.payment_wompi_qr_url);
        
        // Load QR image preview if exists
        if (data.payment_usdt_qr_url) {
          setQrImagePreview(`/api/payment-files/qr/${data.payment_usdt_qr_url}`);
        }
        // Load Wompi QR preview if exists
        if (data.payment_wompi_qr_url) {
          setWompiQrPreview(data.payment_wompi_qr_url.startsWith('http') ? data.payment_wompi_qr_url : `/api/payment-files/qr/${data.payment_wompi_qr_url}`);
        }
      }
    } catch (error) {
      console.error('Error fetching payment config:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleActivate3Months = async (userId: string) => {
    if (!confirm('¿Activar 3 meses para este usuario? Se agregarán 90 días a su membresía.')) {
      return;
    }

    setActivatingUser(userId);

    try {
      const response = await fetch(`/api/admin/activate-subscription/${userId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ 3 meses activados correctamente. Nueva fecha de vencimiento: ${new Date(data.newExpirationDate).toLocaleDateString('es-ES')}`);
        await Promise.all([fetchMetrics(), fetchUsers()]);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error activating subscription:', error);
      alert('❌ Error al activar la suscripción');
    } finally {
      setActivatingUser(null);
    }
  };

  const handleResetTrial = async (userId: string, storeName: string) => {
    if (!confirm(`¿Reiniciar prueba de 7 días para ${storeName}? Se restaurará el período de prueba gratuito.`)) {
      return;
    }

    setResettingTrial(userId);

    try {
      const response = await fetch(`/api/admin/reset-trial/${userId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Prueba reiniciada. Nueva fecha de vencimiento: ${new Date(data.newTrialExpiration).toLocaleDateString('es-ES')}`);
        await Promise.all([fetchMetrics(), fetchUsers()]);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error resetting trial:', error);
      alert('❌ Error al reiniciar la prueba');
    } finally {
      setResettingTrial(null);
    }
  };

  const handleTogglePremium = async (userId: string, storeName: string, currentPremium: boolean) => {
    const action = currentPremium ? 'desactivar' : 'activar';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} estado Premium para ${storeName}?\n\nEsto ${currentPremium ? 'deshabilitará' : 'habilitará'} la creación de ofertas con cuenta regresiva.`)) {
      return;
    }

    setTogglingPremium(userId);

    try {
      const response = await fetch(`/api/admin/toggle-premium/${userId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Estado Premium ${data.isPremium ? 'activado' : 'desactivado'} correctamente`);
        await Promise.all([fetchMetrics(), fetchUsers()]);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error toggling premium:', error);
      alert('❌ Error al cambiar el estado Premium');
    } finally {
      setTogglingPremium(null);
    }
  };

  const handleToggleBranding = async (userId: string, storeName: string, currentBranding: boolean) => {
    const action = currentBranding ? 'bloquear' : 'desbloquear';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} Marca Pro para ${storeName}?\n\nEsto ${currentBranding ? 'bloqueará' : 'desbloqueará'} la personalización de marca y logo.`)) {
      return;
    }

    setTogglingBranding(userId);

    try {
      const response = await fetch(`/api/admin/toggle-branding/${userId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Marca Pro ${data.hasBranding ? 'desbloqueada' : 'bloqueada'} correctamente`);
        await Promise.all([fetchMetrics(), fetchUsers()]);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error toggling branding:', error);
      alert('❌ Error al cambiar el estado de Marca Pro');
    } finally {
      setTogglingBranding(null);
    }
  };

  const handleToggleCarousel = async (userId: string, storeName: string, currentCarousel: boolean) => {
    const action = currentCarousel ? 'desactivar' : 'activar';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} carrusel premium para ${storeName}?\n\nEsto ${currentCarousel ? 'bloqueará' : 'permitirá'} el uso de 3 imágenes en los productos.`)) {
      return;
    }

    setTogglingCarousel(userId);

    try {
      const response = await fetch(`/api/admin/toggle-carousel/${userId}`, {
        method: 'POST',
      });

      if (response.ok) {
        await response.json();
        await Promise.all([fetchMetrics(), fetchUsers()]);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error toggling carousel:', error);
      alert('❌ Error al cambiar el estado del carrusel');
    } finally {
      setTogglingCarousel(null);
    }
  };

  const handleDeleteUser = async (userId: string, storeName: string, productsCount: number) => {
    if (!confirm(`⚠️ ¿Estás seguro de eliminar a ${storeName}?\n\nEsto eliminará:\n- La cuenta del usuario\n- ${productsCount} producto(s)\n\nEsta acción NO se puede deshacer.`)) {
      return;
    }

    setDeletingUser(userId);

    try {
      const response = await fetch(`/api/admin/delete-user/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Usuario y productos eliminados correctamente');
        await Promise.all([fetchMetrics(), fetchUsers()]);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Error al eliminar el usuario');
    } finally {
      setDeletingUser(null);
    }
  };

  const handleQrImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Tamaño máximo: 10MB');
        return;
      }

      setQrImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadQr = async () => {
    if (!qrImageFile) {
      alert('Por favor selecciona una imagen primero');
      return;
    }

    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', qrImageFile);

      const response = await fetch('/api/payment-files/upload-qr', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUsdtQrUrl(data.key);
        setQrImageFile(null);
        alert('✅ Código QR subido correctamente');
        await fetchPaymentConfig();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading QR:', error);
      alert('❌ Error al subir la imagen');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleDeleteQr = async () => {
    if (!confirm('¿Estás seguro de eliminar el código QR actual?')) {
      return;
    }

    setDeletingQr(true);
    try {
      const response = await fetch('/api/payment-files/delete-qr', {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsdtQrUrl('');
        setQrImagePreview(null);
        setQrImageFile(null);
        alert('✅ Código QR eliminado correctamente');
      } else {
        alert('❌ Error al eliminar el código QR');
      }
    } catch (error) {
      console.error('Error deleting QR:', error);
      alert('❌ Error al eliminar el código QR');
    } finally {
      setDeletingQr(false);
    }
  };

  const handleWompiQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Tamaño máximo: 10MB');
        return;
      }
      setWompiQrFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setWompiQrPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadWompiQr = async () => {
    if (!wompiQrFile) {
      alert('Por favor selecciona una imagen primero');
      return;
    }

    setUploadingWompiQr(true);
    try {
      const formData = new FormData();
      formData.append('file', wompiQrFile);

      const response = await fetch('/api/payment-files/upload-wompi-qr', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setWompiQrUrl(data.key);
        setWompiQrFile(null);
        alert('✅ QR de Wompi subido correctamente');
        await fetchPaymentConfig();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading Wompi QR:', error);
      alert('❌ Error al subir la imagen');
    } finally {
      setUploadingWompiQr(false);
    }
  };

  const handleSavePaymentConfig = async () => {
    setSavingPaymentConfig(true);
    console.log('💾 INICIO GUARDADO - wompiLink STATE:', wompiLink);
    console.log('💾 INICIO GUARDADO - wompiQrUrl STATE:', wompiQrUrl);
    console.log('💾 Tipo de wompiLink:', typeof wompiLink);
    console.log('💾 Tipo de wompiQrUrl:', typeof wompiQrUrl);
    console.log('💾 wompiLink es vacío?:', wompiLink === '');
    console.log('💾 wompiLink es undefined?:', wompiLink === undefined);
    console.log('💾 wompiLink es null?:', wompiLink === null);
    
    const payload = {
      whatsappSupport,
      usdtAddress,
      binanceId,
      usdtQrUrl,
      subscriptionPrice,
      monthlyMaintenance,
      extraOffers,
      brandingPrice,
      wompiQrUrl,
      wompiLink,
    };
    
    console.log('📤 Payload completo enviado al backend:', JSON.stringify(payload, null, 2));
    console.log('📤 wompiLink en payload:', payload.wompiLink);
    console.log('📤 wompiQrUrl en payload:', payload.wompiQrUrl);
    
    try {
      const response = await fetch('/api/admin/payment-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📨 Respuesta del servidor - status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Respuesta del servidor:', result);
        setPaymentConfigSaved(true);
        setTimeout(() => setPaymentConfigSaved(false), 3000);
        // Refresh payment config to show saved values
        console.log('🔄 Recargando configuración desde DB...');
        await fetchPaymentConfig();
      } else {
        alert('❌ Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error saving payment config:', error);
      alert('❌ Error al guardar la configuración');
    } finally {
      setSavingPaymentConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin" />
          <p>Verificando acceso de administrador...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/home')}
            className="text-purple-300 hover:text-purple-200 font-medium mb-4 flex items-center gap-2"
          >
            ← Volver al catálogo
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Panel de Administrador Maestro
              </h1>
              <p className="text-purple-300">Gestión completa del sistema BookselQR</p>
            </div>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-100 text-sm">
              <span className="font-semibold">Acceso Restringido:</span> Este panel es exclusivo para el administrador del sistema. Todas las acciones quedan registradas.
            </p>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Usuarios Totales</p>
                  <p className="text-3xl font-bold">{metrics.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-green-100 text-sm">Usuarios de Pago</p>
                  <p className="text-3xl font-bold">{metrics.paidUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-amber-100 text-sm">Usuarios en Prueba</p>
                  <p className="text-3xl font-bold">{metrics.trialUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-red-100 text-sm">Inventario Total</p>
                  <p className="text-3xl font-bold">{metrics.totalProducts}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Configuration Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700 mb-8">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Building2 className="w-6 h-6 text-purple-400" />
              Gestión de Pagos
            </h2>
            <p className="text-slate-400 mt-1">Configura los métodos de pago, precios y contacto que verán los usuarios</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Pricing Control */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-purple-300 mb-4">💰 Control de Precios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Precio Suscripción (3 meses)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={subscriptionPrice}
                      onChange={(e) => setSubscriptionPrice(e.target.value)}
                      placeholder="15"
                      className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Mantenimiento Mensual
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={monthlyMaintenance}
                      onChange={(e) => setMonthlyMaintenance(e.target.value)}
                      placeholder="2"
                      className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Precio Add-on Ofertas Relámpago (por mes)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={extraOffers}
                      onChange={(e) => setExtraOffers(e.target.value)}
                      placeholder="5"
                      className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Costo adicional mensual para activar ofertas con cuenta regresiva
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Precio Add-on Personalización de Marca (por mes)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={brandingPrice}
                      onChange={(e) => setBrandingPrice(e.target.value)}
                      placeholder="5"
                      className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Costo adicional mensual para subir logo y personalizar marca
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp Support */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-green-300 mb-4">📱 WhatsApp de Soporte/Activación</h3>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Número de WhatsApp (Confirmación de Pagos)
                </label>
                <input
                  type="text"
                  value={whatsappSupport}
                  onChange={(e) => setWhatsappSupport(e.target.value)}
                  placeholder="Ej: +50370000000"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-slate-400 mt-2">Este será el número que verán los usuarios para confirmar sus pagos</p>
              </div>
            </div>

            {/* USDT Crypto */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-amber-300 mb-4">₿ Criptomoneda (USDT TRC-20)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Dirección de Billetera USDT (Red TRC-20)
                  </label>
                  <input
                    type="text"
                    value={usdtAddress}
                    onChange={(e) => setUsdtAddress(e.target.value)}
                    placeholder="Ej: TXyz123abc..."
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-2">Los usuarios podrán copiar esta dirección al pagar</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Imagen del Código QR USDT
                  </label>
                  
                  {qrImagePreview ? (
                    <div className="space-y-3">
                      <div className="relative w-64 mx-auto">
                        <img
                          src={qrImagePreview}
                          alt="QR USDT"
                          className="w-full rounded-lg border-2 border-amber-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrImageChange}
                            className="hidden"
                          />
                          <div className="w-full px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all font-medium text-center text-sm">
                            Cambiar Imagen
                          </div>
                        </label>
                        <button
                          onClick={handleDeleteQr}
                          disabled={deletingQr}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium text-sm disabled:opacity-50"
                        >
                          {deletingQr ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Eliminar'
                          )}
                        </button>
                      </div>
                      {qrImageFile && (
                        <button
                          onClick={handleUploadQr}
                          disabled={uploadingQr}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                        >
                          {uploadingQr ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5" />
                              Guardar Nueva Imagen
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrImageChange}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-amber-300 rounded-lg p-8 text-center hover:border-amber-400 transition-all bg-amber-500/5">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-8 h-8 text-amber-600" />
                        </div>
                        <p className="text-amber-300 font-semibold mb-1">Haz clic para subir imagen</p>
                        <p className="text-xs text-slate-400">PNG, JPG o GIF (máximo 10MB)</p>
                      </div>
                    </label>
                  )}
                  {qrImageFile && !qrImagePreview?.startsWith('/api') && (
                    <button
                      onClick={handleUploadQr}
                      disabled={uploadingQr}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 mt-3"
                    >
                      {uploadingQr ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Subir Imagen
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-xs text-slate-400 mt-2">Sube la imagen de tu código QR USDT para que los usuarios puedan escanearlo al pagar</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Binance Pay ID / Usuario
                  </label>
                  <input
                    type="text"
                    value={binanceId}
                    onChange={(e) => setBinanceId(e.target.value)}
                    placeholder="Ej: 12345678"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">Tu ID de Binance Pay que los usuarios usarán para enviarte pagos</p>
                </div>
              </div>
            </div>

            {/* Wompi Payment Gateway */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-purple-300 mb-4">💳 Wompi (Pasarela de Pago)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Imagen del Código QR de Wompi
                  </label>
                  
                  {wompiQrPreview ? (
                    <div className="space-y-3">
                      <div className="relative w-64 mx-auto">
                        <img
                          src={wompiQrPreview}
                          alt="QR Wompi"
                          className="w-full rounded-lg border-2 border-purple-400"
                        />
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleWompiQrChange}
                          className="hidden"
                        />
                        <div className="w-full px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all font-medium text-center text-sm">
                          Cambiar Imagen
                        </div>
                      </label>
                      {wompiQrFile && !wompiQrPreview?.startsWith('/api') && (
                        <button
                          onClick={handleUploadWompiQr}
                          disabled={uploadingWompiQr}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all disabled:opacity-50"
                        >
                          {uploadingWompiQr ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5" />
                              Guardar Nueva Imagen
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleWompiQrChange}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 transition-all bg-purple-500/5">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-purple-300 font-semibold mb-1">Haz clic para subir imagen</p>
                        <p className="text-xs text-slate-400">PNG, JPG o GIF (máximo 10MB)</p>
                      </div>
                    </label>
                  )}
                  {wompiQrFile && !wompiQrPreview?.startsWith('/api') && (
                    <button
                      onClick={handleUploadWompiQr}
                      disabled={uploadingWompiQr}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all disabled:opacity-50 mt-3"
                    >
                      {uploadingWompiQr ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Subir Imagen
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-xs text-slate-400 mt-2">Sube la imagen de tu código QR de Wompi para que los usuarios puedan escanearlo</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Link de Pago de Wompi
                  </label>
                  <input
                    type="url"
                    value={wompiLink}
                    onChange={(e) => setWompiLink(e.target.value)}
                    placeholder="https://checkout.wompi.co/l/..."
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">Link directo de pago para que los usuarios completen la transacción</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePaymentConfig}
              disabled={savingPaymentConfig}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {savingPaymentConfig ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Guardando...
                </>
              ) : paymentConfigSaved ? (
                <>
                  <Check className="w-6 h-6" />
                  ¡Guardado!
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  Guardar Configuración
                </>
              )}
            </button>

            {paymentConfigSaved && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-300 flex-shrink-0" />
                <p className="text-green-100 text-sm">
                  Los dueños verán estos datos actualizados al activar su membresía
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-400" />
              Gestión de Usuarios y Pagos
            </h2>
            <p className="text-slate-400 mt-1">Lista completa de usuarios registrados en el sistema</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Correo Electrónico
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Referidos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Invitado por
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Ofertas Premium
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Estadísticas
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Marca Pro
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Premium: Carrusel
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Link del Catálogo
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((adminUser) => (
                  <tr key={adminUser.user_id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-white">
                          {adminUser.store_name || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{adminUser.user_id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">
                        {adminUser.email ? (
                          <p className="font-mono">{adminUser.email}</p>
                        ) : (
                          <p className="text-slate-500">No disponible</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">
                        {adminUser.phone_number ? (
                          <p>{adminUser.country_code} {adminUser.phone_number}</p>
                        ) : (
                          <p className="text-slate-500">No configurado</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        adminUser.status === 'Pagado' || adminUser.status === 'Plan Ilimitado'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {adminUser.status || 'Prueba'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {adminUser.membership_expiration ? (
                        <div className="text-sm text-slate-300">
                          <p>{new Date(adminUser.membership_expiration).toLocaleDateString('es-ES')}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(adminUser.membership_expiration) < new Date() ? (
                              <span className="text-red-400">Vencido</span>
                            ) : (
                              <span className="text-green-400">Activo</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">Sin fecha</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300 font-semibold">{adminUser.products_count}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300 font-semibold">{adminUser.total_referrals || 0}</p>
                    </td>
                    <td className="px-6 py-4">
                      {adminUser.referred_by ? (
                        <div className="text-sm">
                          <p className="text-green-400 font-semibold font-mono">{adminUser.referred_by}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Código de referido</p>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">Registro directo</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleTogglePremium(adminUser.user_id, adminUser.store_name || 'Usuario', adminUser.is_premium === 1)}
                          disabled={togglingPremium === adminUser.user_id}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                            adminUser.is_premium === 1
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                              : 'bg-slate-600'
                          } ${togglingPremium === adminUser.user_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {togglingPremium === adminUser.user_id ? (
                            <Loader2 className="w-4 h-4 text-white absolute left-1/2 -translate-x-1/2 animate-spin" />
                          ) : (
                            <>
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                                  adminUser.is_premium === 1 ? 'translate-x-9' : 'translate-x-1'
                                }`}
                              >
                                {adminUser.is_premium === 1 && (
                                  <Crown className="w-4 h-4 text-amber-500 absolute top-1 left-1" />
                                )}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleToggleBranding(adminUser.user_id, adminUser.store_name || 'Usuario', adminUser.has_branding_unlocked === 1)}
                          disabled={togglingBranding === adminUser.user_id}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                            adminUser.has_branding_unlocked === 1
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500'
                              : 'bg-slate-600'
                          } ${togglingBranding === adminUser.user_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {togglingBranding === adminUser.user_id ? (
                            <Loader2 className="w-4 h-4 text-white absolute left-1/2 -translate-x-1/2 animate-spin" />
                          ) : (
                            <>
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                                  adminUser.has_branding_unlocked === 1 ? 'translate-x-9' : 'translate-x-1'
                                }`}
                              >
                                {adminUser.has_branding_unlocked === 1 && (
                                  <Palette className="w-4 h-4 text-pink-500 absolute top-1 left-1" />
                                )}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleToggleCarousel(adminUser.user_id, adminUser.store_name || 'Usuario', adminUser.carousel_enabled === 1)}
                          disabled={togglingCarousel === adminUser.user_id}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                            adminUser.carousel_enabled === 1
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : 'bg-slate-600'
                          } ${togglingCarousel === adminUser.user_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {togglingCarousel === adminUser.user_id ? (
                            <Loader2 className="w-4 h-4 text-white absolute left-1/2 -translate-x-1/2 animate-spin" />
                          ) : (
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                                adminUser.carousel_enabled === 1 ? 'translate-x-9' : 'translate-x-1'
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {adminUser.store_name ? (
                          <a
                            href={`/tienda/${adminUser.store_name.toLowerCase().replace(/\s+/g, '-')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg flex items-center gap-2 text-sm"
                            title={`Ver catálogo de ${adminUser.store_name}`}
                          >
                            <span className="text-lg">👁️</span>
                            Ver Catálogo
                          </a>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-slate-600 text-slate-400 rounded-lg font-semibold cursor-not-allowed flex items-center gap-2 text-sm"
                            title="Usuario sin configuración inicial"
                          >
                            <span className="text-lg">👁️</span>
                            Usuario sin configuración inicial
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleActivate3Months(adminUser.user_id)}
                          disabled={activatingUser === adminUser.user_id || deletingUser === adminUser.user_id || resettingTrial === adminUser.user_id || togglingPremium === adminUser.user_id || togglingBranding === adminUser.user_id || togglingCarousel === adminUser.user_id}
                          className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                          title="Activar 3 meses"
                        >
                          {activatingUser === adminUser.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleResetTrial(adminUser.user_id, adminUser.store_name || 'Usuario')}
                          disabled={resettingTrial === adminUser.user_id || deletingUser === adminUser.user_id || activatingUser === adminUser.user_id || togglingPremium === adminUser.user_id || togglingBranding === adminUser.user_id || togglingCarousel === adminUser.user_id}
                          className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                          title="Reiniciar prueba 7 días"
                        >
                          {resettingTrial === adminUser.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(adminUser.user_id, adminUser.store_name || 'Usuario', adminUser.products_count)}
                          disabled={deletingUser === adminUser.user_id || activatingUser === adminUser.user_id || resettingTrial === adminUser.user_id || togglingPremium === adminUser.user_id || togglingBranding === adminUser.user_id || togglingCarousel === adminUser.user_id}
                          className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                          title="Eliminar usuario"
                        >
                          {deletingUser === adminUser.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No hay usuarios registrados todavía</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}