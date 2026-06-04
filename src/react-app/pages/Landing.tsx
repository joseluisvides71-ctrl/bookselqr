import { Sparkles, ShoppingBag, Zap, Shield, LogIn } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

const REFERRAL_CODE_KEY = 'referral_id';

export default function Landing() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Capture referral code from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Store referral code in localStorage for later use during registration
      localStorage.setItem(REFERRAL_CODE_KEY, refCode);
    }
  }, []);

  useEffect(() => {
    if (!isPending && user) {
      navigate('/home');
    }
  }, [user, isPending, navigate]);

  // Show loading while checking auth
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              BookselQR
            </span>
          </div>
          <button
            onClick={redirectToLogin}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
          >
            <LogIn className="w-5 h-5" />
            Iniciar Sesión
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-indigo-200 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-600">Catálogos Inteligentes con IA</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
            Crea tu catálogo
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              con Inteligencia Artificial
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            BookselQR te permite crear catálogos profesionales en minutos. 
            Sube una foto, la IA genera el nombre y descripción perfectos.
          </p>

          <button
            onClick={redirectToLogin}
            className="inline-flex items-center gap-3 px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            <LogIn className="w-6 h-6" />
            Iniciar sesión con Google
          </button>
          
          <p className="text-sm text-slate-500 mt-4">
            Es gratis • No requiere tarjeta de crédito
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              IA que describe tus productos
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Sube una foto y nuestra IA genera automáticamente el nombre y descripción perfectos para tu producto.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Catálogo estilo Instagram
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Visualiza tus productos en un grid atractivo que tus clientes amarán. Diseño moderno y profesional.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-red-600 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Envío directo a WhatsApp
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Tus clientes pueden enviarte pedidos directamente por WhatsApp con un solo clic. Simple y eficaz.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12">
            Así de fácil es crear tu catálogo
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Inicia sesión con Google</h4>
              <p className="text-slate-600">Regístrate en segundos usando tu cuenta de Google</p>
            </div>

            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Sube fotos de tus productos</h4>
              <p className="text-slate-600">La IA analiza las imágenes y genera descripciones profesionales</p>
            </div>

            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Comparte tu catálogo</h4>
              <p className="text-slate-600">Recibe pedidos por WhatsApp y empieza a vender</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Únete a cientos de vendedores que ya están usando BookselQR para hacer crecer su negocio
          </p>
          <button
            onClick={redirectToLogin}
            className="inline-flex items-center gap-3 px-8 py-5 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            <LogIn className="w-6 h-6" />
            Crear mi catálogo gratis
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-600">
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Tus datos están seguros y protegidos
          </p>
          <p className="text-sm mt-2">
            © 2025 BookselQR. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
