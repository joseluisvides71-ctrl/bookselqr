import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Phone, Loader2, Check, MessageCircle } from 'lucide-react';

const REFERRAL_CODE_KEY = 'referral_id';

const countryCodes = [
  { code: '+1', name: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
  { code: '+34', name: 'España', flag: '🇪🇸' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', name: 'Panamá', flag: '🇵🇦' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+53', name: 'Cuba', flag: '🇨🇺' },
  { code: '+1-809', name: 'República Dominicana', flag: '🇩🇴' },
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [countryCode, setCountryCode] = useState('+52');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [wasReferred, setWasReferred] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic phone validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      setError('Por favor ingresa un número de celular válido');
      setLoading(false);
      return;
    }

    try {
      // FORCED: Get referral code from localStorage - this MUST be sent to backend
      const referredBy = localStorage.getItem(REFERRAL_CODE_KEY);
      
      console.log('[REFERRAL SUBMIT] Value from localStorage:', referredBy);
      console.log('[REFERRAL SUBMIT] Key used:', REFERRAL_CODE_KEY);
      console.log('[REFERRAL SUBMIT] Will send to /api/profile/complete');
      
      // FORCED SEND: referredBy field is ALWAYS included in the request
      const payload = {
        storeName,
        phoneNumber: digitsOnly,
        countryCode,
        referredBy: referredBy || null,
      };
      
      console.log('[REFERRAL SUBMIT] Full payload:', JSON.stringify(payload));
      
      const response = await fetch('/api/profile/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el perfil');
      }

      const data = await response.json();
      console.log('[ProfileSetup] Response:', data);
      
      // Check if user was referred from the response
      if (data.wasReferred) {
        setWasReferred(true);
        console.log('[ProfileSetup] User was successfully referred!');
      }
      
      // CLEANUP: Only clear localStorage AFTER successful registration
      if (referredBy) {
        localStorage.removeItem(REFERRAL_CODE_KEY);
        console.log('[REFERRAL SUCCESS] Cleared referral_id from localStorage');
      }

      // Show success message
      setShowSuccessMessage(true);
      
      // Redirect to Profile after 3 seconds so user can configure branding
      setTimeout(() => {
        navigate('/profile');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccessMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mx-auto mb-6 flex items-center justify-center animate-bounce">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            ¡Bienvenido a BookselQR!
          </h2>
          
          {wasReferred && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200 mb-4">
              <p className="text-md font-semibold text-purple-700 flex items-center justify-center gap-2">
                🎉 Te has unido gracias a un invitado
              </p>
            </div>
          )}
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 mb-6">
            <p className="text-lg text-slate-700">
              Te hemos enviado un mensaje de bienvenida a tu WhatsApp
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Redirigiendo al catálogo...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Phone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Completa tu Perfil
          </h1>
          <p className="text-slate-600">
            Para continuar, necesitamos tu número de celular
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nombre de tu Tienda o Negocio
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ej: Tienda de Ropa Moderna"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Código de País
            </label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
              required
            >
              {countryCodes.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.code} - {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Número de Celular
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ej: 5512345678"
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Ingresa solo los números, sin espacios ni guiones
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Continuar</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm text-slate-600 text-center">
            <span className="font-semibold text-indigo-600">¿Por qué necesitamos esto?</span>
            <br />
            Tu número nos permite enviarte notificaciones importantes sobre tu cuenta y prueba gratuita.
          </p>
        </div>
      </div>
    </div>
  );
}
