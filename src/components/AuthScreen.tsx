import React, { useState } from 'react';
import { 
  auth 
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  Lock, Mail, UserPlus, LogIn, ChevronRight, Info, Eye, EyeOff, AlertCircle, Sparkles, Check
} from 'lucide-react';

interface AuthScreenProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // States for responses
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple password rating
  const isPasswordStrong = password.length >= 6;

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setInfo('Sign-in successful with Google!');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Error occurred during Google Authentication.';
      if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'The login popup was closed before completion. Please try again.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errMsg = 'Another popup sign-in attempt was initiated. Check your browser windows.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        setInfo('Account created successfully! Welcome aboard.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setInfo('Sign-in successful!');
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'An error occurred during authentication.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errMsg = 'Invalid email or password. Please verify your credentials.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email address is already registered. Try signing in instead!';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Please provide a valid email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Email/Password sign-in has not been enabled in the Firebase Console yet. Please refer to the instructions at the bottom!';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to request a password reset link.');
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('Password reset instructions have been dispatched to your email address.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while requesting password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 justify-between font-sans items-center px-4 py-8" id="rice_export_auth_portal">
      
      {/* Upper Brand / Logo */}
      <header className="text-center max-w-md w-full my-auto space-y-2">
        <div className="mx-auto w-12 h-12 bg-sky-500/10 border border-sky-400/20 text-sky-400 rounded-2xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black text-white uppercase tracking-wider">
          Rice Export Manager
        </h1>
        <p className="text-xs text-slate-400">
          Global Pricing & Shipping Compliance Workspace
        </p>
      </header>

      {/* Center Auth Card */}
      <div className="max-w-md w-full bg-slate-950/80 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
        
        {/* Dynamic header details */}
        <div className="space-y-1 text-center">
          <h2 className="text-base font-bold text-white uppercase tracking-wide">
            Access Cloud Workspace
          </h2>
          <p className="text-xs text-slate-400">
            Sign in to persist calculations, rates, and compliance files
          </p>
        </div>

        {/* Google Sign-In Action (Primary and fully-enabled by default) */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white hover:bg-slate-150 active:bg-slate-200 text-slate-900 font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-slate-800"></div>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">OR PASSWORD ACCOUNT</span>
          <div className="h-[1px] flex-1 bg-slate-800"></div>
        </div>

        {/* Toggle tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); setInfo(null); }}
            className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
              !isSignUp ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-250'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); setInfo(null); }}
            className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
              isSignUp ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-250'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Business Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="viren@example.com"
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-550 transition font-medium focus:ring-1 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Name - Register only */}
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Full Name / Organization
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <UserPlus className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VNP Rice Exports"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-550 transition font-medium focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Password Code</span>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sky-400 hover:text-sky-300 font-bold tracking-tight lowercase transition"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-550 transition font-medium focus:ring-1 focus:ring-sky-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {isSignUp && password && (
              <p className={`text-[10px] flex items-center gap-1 font-bold ${isPasswordStrong ? 'text-emerald-400' : 'text-amber-400'}`}>
                <Check className={`w-3.5 h-3.5 ${isPasswordStrong ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>{isPasswordStrong ? 'Password is secure' : 'Password must be at least 6 characters'}</span>
              </p>
            )}
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs p-3.5 rounded-xl flex items-start gap-2 animate-none">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {info && (
            <div className="bg-sky-950/50 border border-sky-800/50 text-sky-300 text-xs p-3.5 rounded-xl flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
              <p className="font-semibold leading-relaxed">{info}</p>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-extrabold text-xs uppercase tracking-widest py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>Establishing Synchronizer...</span>
            ) : isSignUp ? (
              <>
                <span>Register & Connect Cloud</span>
                <ChevronRight className="w-4 h-4 text-slate-950" />
              </>
            ) : (
              <>
                <span>Secure Sign In</span>
                <LogIn className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>
        </form>

      </div>

      {/* Deploy instructions helper section */}
      <footer className="max-w-md w-full mt-4 bg-slate-950 border border-slate-800/70 p-4 rounded-2xl space-y-2 text-[11px] text-slate-400">
        <h3 className="font-bold flex items-center gap-1.5 text-white uppercase text-xs">
          <Info className="w-4 h-4 text-sky-400" />
          <span>Firebase Setup Checklist</span>
        </h3>
        <p className="leading-relaxed">
          Google Sign-In is active by default. You can log in instantly by clicking <strong>Continue with Google</strong> above.
        </p>
        <p className="leading-relaxed">
          If you prefer email/password login, make sure to add the provider first:
        </p>
        <ol className="list-decimal list-inside space-y-1 font-mono text-[10px] pl-1.5 text-sky-300/90">
          <li>Visit Firebase Console <span className="text-slate-500">(ivory-hall-8lsxp)</span></li>
          <li>Go to Build &gt; Authentication &gt; Sign-in method</li>
          <li>Note that permissions may prevent editing this on starter projects. Use Google Login instead!</li>
        </ol>
      </footer>

    </div>
  );
}

