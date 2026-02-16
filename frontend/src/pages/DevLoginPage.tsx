import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DevLoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('Preparing dev login...');

  useEffect(() => {
    if (!import.meta.env.DEV) {
      setStatus('Dev login is disabled outside development mode.');
      return;
    }

    if (isAuthenticated) {
      navigate('/');
      return;
    }

    const email = searchParams.get('email') ?? 'teamlead@demo.com';
    const password = searchParams.get('password') ?? 'lead123';

    setStatus(`Logging in as ${email}...`);
    (async () => {
      try {
        await login(email, password);
        navigate('/');
      } catch (e: any) {
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          'Dev login failed (check credentials and backend availability).';
        setStatus(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    })();
  }, [isAuthenticated, login, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-6">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6 space-y-3">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Dev Login</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Tip:</span> Use
          <span className="font-mono"> /dev-login?email=teamlead@demo.com&amp;password=lead123</span>
        </div>
        <div className="pt-2">
          <Link to="/login" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

