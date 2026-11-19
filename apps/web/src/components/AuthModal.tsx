import React, { useState } from 'react';
import { UserProfile, DEMO_USERS } from '../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialRolePrompt?: 'passenger' | 'driver';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRolePrompt,
}) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [memberType, setMemberType] = useState<'student' | 'staff' | 'community'>('student');
  const [campus, setCampus] = useState<'bidholi' | 'kandoli'>('bidholi');
  const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleDomainChip = (domain: string) => {
    const prefix = email.split('@')[0] || '';
    setEmail(`${prefix}${domain}`);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid college email address.');
      return;
    }
    if (!name.trim()) {
      alert('Please enter your full name.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }
    setOtpError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const isUpes = email.includes('upes.ac.in');
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: '+91 98XXX XXXXX',
        gender,
        memberType,
        campus,
        department: campus === 'bidholi' ? 'UPES Energy Acres' : 'UPES Knowledge Acres',
        avatar:
          gender === 'female'
            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        trustTier: isUpes ? 'T1' : 'T0',
        collegeVerified: isUpes,
        driverVerified: false,
        totalRidesTaken: 0,
        totalRidesOffered: 0,
        rating: 5.0,
      };

      onLoginSuccess(newUser);
    }, 500);
  };

  const handleQuickDemoLogin = (demoUser: UserProfile) => {
    onLoginSuccess(demoUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🎓
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">CampusRide Sign In</h2>
              <p className="text-xs text-emerald-100 font-medium">
                {initialRolePrompt === 'driver'
                  ? 'Sign in to access driver tools & offer rides'
                  : 'College community verified access'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition text-lg"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              {/* College Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  College / Institutional Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@stu.upes.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
                {/* Domain Quick Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 self-center mr-1">Quick:</span>
                  {['@stu.upes.ac.in', '@ddn.upes.ac.in', '@upes.ac.in'].map((dom) => (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => handleDomainChip(dom)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-[11px] font-semibold text-slate-600 transition border border-slate-200"
                    >
                      {dom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Campus & Member Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Campus
                  </label>
                  <select
                    value={campus}
                    onChange={(e) => setCampus(e.target.value as 'bidholi' | 'kandoli')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition bg-white"
                  >
                    <option value="bidholi">⚡ Bidholi (Energy)</option>
                    <option value="kandoli">📚 Kandoli (Knowledge)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Member Type
                  </label>
                  <select
                    value={memberType}
                    onChange={(e) =>
                      setMemberType(e.target.value as 'student' | 'staff' | 'community')
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="staff">Faculty / Staff</option>
                    <option value="community">Campus Resident</option>
                  </select>
                </div>
              </div>

              {/* Gender (Critical for women-only ride safety gating) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Gender</span>
                  <span className="text-[10px] text-purple-600 font-semibold lowercase">
                    (required for women-only safety gating)
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'female', label: 'Female', icon: '👩' },
                    { id: 'male', label: 'Male', icon: '👨' },
                    { id: 'other', label: 'Other / Non-binary', icon: '🧑' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id as 'female' | 'male' | 'other')}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        gender === g.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span>{g.icon}</span>
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="inline-block animate-spin">⏳</span>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* OTP Verification Screen */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-xl">
                  📨
                </div>
                <h3 className="text-base font-black text-slate-900">Enter Verification Code</h3>
                <p className="text-xs text-slate-500">
                  We sent a 6-digit verification code to <span className="font-bold text-slate-700">{email}</span>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  placeholder="424242"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-2xl font-mono tracking-widest py-3 border-2 border-emerald-500/40 rounded-2xl focus:outline-none focus:border-emerald-600 bg-slate-50 font-bold"
                />
                {otpError && <p className="text-xs text-rose-600 font-semibold mt-1 text-center">{otpError}</p>}
              </div>

              {/* Dev mode instant auto-fill */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1.5">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                  🛠️ Local Dev Shortcut
                </span>
                <p className="text-xs text-amber-700">
                  Click below to auto-fill mock test code:
                </p>
                <button
                  type="button"
                  onClick={() => setOtp('424242')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                >
                  Auto-Fill 424242
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  ← Change Email
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Continue →'}
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Accounts for Testing */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                ⚡ 1-Click Demo Profiles
              </span>
              <span className="text-[10px] text-slate-400">Test passenger or driver view</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleQuickDemoLogin(user)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition flex items-center gap-2.5 group"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                      {user.name.split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500 truncate">
                      {user.driverVerified ? '🛡️ Driver' : '🎒 Passenger'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
