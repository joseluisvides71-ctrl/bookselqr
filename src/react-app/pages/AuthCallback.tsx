import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { exchangeCodeForSessionToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        
        // Check if user has completed profile
        const profileResponse = await fetch('/api/profile/status');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          
          if (!profileData.hasCompletedProfile) {
            navigate('/profile-setup');
            return;
          }
        }
        
        navigate('/');
      } catch (error) {
        console.error('Error during authentication:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-600 text-lg">Iniciando sesión...</p>
      </div>
    </div>
  );
}
