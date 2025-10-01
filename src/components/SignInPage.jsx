import { useState } from 'react';

export default function SignInPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = () => {
    const id = (email || '').trim();
    if (!id) return;
    onLogin(id, null);
  };

  const handleBackClick = () => {
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      window.history.back();
    } else {
      // fallback: navigate to root
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-black">
      {/* Background with swirl pattern applied to the whole page */}
      <div
        className="fixed inset-0 w-full min-h-full"
        style={{
          backgroundImage: `url('https://api.builder.io/api/v1/image/assets/TEMP/6ab6bf916fd76de603b3d52ed2ddeaa438c774f1?width=2048')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#000',
          backgroundAttachment: 'fixed'
        }}
      />
      
      {/* Back button */}
      <button 
        onClick={handleBackClick}
        className="absolute top-12 left-12 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
      >
        <img 
          src="https://api.builder.io/api/v1/image/assets/TEMP/4eb70e7c099aa62f60aec47a4cbd7d60c2a9432a?width=60" 
          alt="Back"
          className="w-4 h-4"
        />
      </button>

      {/* Glassmorphism login container */}
      <div className="relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl text-left">
        <div className="space-y-6">
          {/* Welcome text */}
          <div className="space-y-2 text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Welcome back !
            </h1>
            <h2 className="text-2xl font-normal text-white/90">
              Login
            </h2>
          </div>

          {/* Form inputs */}
          <div className="space-y-4">
            {/* Username/Email input */}
            <div className="relative">
              <label className="block text-xs font-light text-white/60 mb-2">
                Username / Mail ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                  placeholder="Enter your username or email"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="relative">
              <label className="block text-xs font-light text-white/60 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          {/* Links row */}
          <div className="flex justify-between items-center text-xs">
            <button className="text-white/70 hover:text-white transition-colors font-normal">
              Sign Up
            </button>
            <button className="text-white/70 hover:text-white transition-colors font-normal text-right">
              Forgot Password
            </button>
          </div>

          {/* Sign In button */}
          <div className="pt-4">
            <button
              onClick={handleSignIn}
              className="relative w-full h-12 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-black font-medium text-sm hover:bg-white/30 transition-all duration-200 flex items-center justify-center group overflow-hidden"
            >
              {/* Button background with blur effect */}
              <div className="absolute inset-0 bg-white/50 backdrop-blur-md rounded-3xl group-hover:bg-white/60 transition-all duration-200" />
              <span className="relative z-10 text-black/80 font-normal">Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
