import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Clock, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react';
import AppotimeLogo from '../components/AppotimeLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      let errorMessage = 'Login failed';
      if (err.response?.data) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else {
          errorMessage = JSON.stringify(detail);
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8 py-12">
          {/* Logo */}
          <div className="flex items-center justify-center sm:justify-start">
            <AppotimeLogo size="lg" showText={true} />
          </div>

          {/* Login Form */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Login</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Please enter your credentials</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-purple-600 dark:text-purple-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 dark:focus:ring-purple-400"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Remember me</span>
              </label>
              <Link
                to="#"
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-purple-400 font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>

          </form>
        </div>
      </div>

      {/* Right Side - Animated Visual Section */}
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Floating Clock Icons */}
          <div className="absolute top-20 left-10 animate-float-slow">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Clock className="w-8 h-8 text-white/80 animate-spin-slow" />
            </div>
          </div>
          <div className="absolute top-40 right-20 animate-float-delayed">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Clock className="w-6 h-6 text-white/80" />
            </div>
          </div>
          <div className="absolute bottom-32 left-20 animate-float-slow-delayed">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Clock className="w-7 h-7 text-white/80" />
            </div>
          </div>

          {/* Dashboard Elements */}
          <div className="absolute top-1/3 right-1/4 animate-pulse-slow">
            <div className="w-24 h-24 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <BarChart3 className="w-full h-full text-white/40" />
            </div>
          </div>
          <div className="absolute bottom-1/4 right-1/3 animate-pulse-delayed">
            <div className="w-20 h-20 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <TrendingUp className="w-full h-full text-white/40" />
            </div>
          </div>
          <div className="absolute top-1/2 left-1/3 animate-pulse-slow-delayed">
            <div className="w-18 h-18 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <CheckCircle2 className="w-full h-full text-white/40" />
            </div>
          </div>

          {/* Flowing Shapes */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-blob-delayed"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-300/15 rounded-full blur-3xl animate-blob-slow"></div>

          {/* Abstract Time Tracking Visualization */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Circular Progress Rings */}
              <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
              <div className="absolute inset-4 border-4 border-white/20 rounded-full animate-spin-slow" style={{ borderTopColor: 'rgba(255,255,255,0.4)' }}></div>
              <div className="absolute inset-8 border-4 border-white/15 rounded-full animate-spin-reverse" style={{ borderRightColor: 'rgba(255,255,255,0.3)' }}></div>
              
              {/* Center Clock */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/20">
                  <Clock className="w-12 h-12 text-white/90" />
                </div>
              </div>
            </div>
          </div>

          {/* Productivity Metrics Cards (Floating) */}
          <div className="absolute top-16 right-16 animate-float-slow">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
              <div className="text-white/90 text-sm font-medium mb-1">Tasks Completed</div>
              <div className="text-white text-2xl font-bold">98%</div>
            </div>
          </div>
          <div className="absolute bottom-20 left-16 animate-float-delayed">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
              <div className="text-white/90 text-sm font-medium mb-1">Time Saved</div>
              <div className="text-white text-2xl font-bold">24hrs</div>
            </div>
          </div>
        </div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-transparent"></div>

        {/* Brand Text Overlay */}
        <div className="absolute bottom-12 left-0 right-0 text-center z-10">
          <h3 className="text-white/90 text-2xl font-bold mb-2">Efficient Time Management</h3>
          <p className="text-white/70 text-sm max-w-md mx-auto">
            Streamline your workflow and boost productivity with intelligent task tracking
          </p>
        </div>
      </div>

      {/* CSS Animations - Inline Styles */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        @keyframes float-slow-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(3deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes pulse-delayed {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.08); }
        }
        @keyframes pulse-slow-delayed {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.06); }
        }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob-delayed {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 50px) scale(1.15); }
          66% { transform: translate(20px, -20px) scale(0.85); }
        }
        @keyframes blob-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 40px) scale(1.2); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 1s;
        }
        .animate-float-slow-delayed {
          animation: float-slow-delayed 7s ease-in-out infinite;
          animation-delay: 2s;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-pulse-delayed {
          animation: pulse-delayed 5s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        .animate-pulse-slow-delayed {
          animation: pulse-slow-delayed 4.5s ease-in-out infinite;
          animation-delay: 2.5s;
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }
        .animate-blob-delayed {
          animation: blob-delayed 25s ease-in-out infinite;
        }
        .animate-blob-slow {
          animation: blob-slow 30s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse 15s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float-slow,
          .animate-float-delayed,
          .animate-float-slow-delayed,
          .animate-pulse-slow,
          .animate-pulse-delayed,
          .animate-pulse-slow-delayed,
          .animate-blob,
          .animate-blob-delayed,
          .animate-blob-slow,
          .animate-spin-slow,
          .animate-spin-reverse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
