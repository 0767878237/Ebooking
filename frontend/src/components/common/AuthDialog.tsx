import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, Mail, Sparkles, User as UserIcon, X } from 'lucide-react';

interface AuthDialogProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  promptMessage?: string;
  onClose: () => void;
  onSubmit: (data: {
    mode: 'login' | 'register';
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  loading: boolean;
  demoUsers?: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
  }>;
}

export function AuthDialog({
  isOpen,
  initialMode = 'login',
  promptMessage,
  onClose,
  onSubmit,
  loading,
  demoUsers = [],
}: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // General API error vs inline field errors
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    displayName?: string;
  }>({});
  const isBackdropMouseDown = useRef(false);

  // Sync mode when initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setGeneralError('');
      setFieldErrors({});
    }
  }, [isOpen, initialMode]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const clearFieldError = (field: keyof typeof fieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Định dạng email không hợp lệ (ví dụ: name@example.com).';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 8) {
      errors.password = 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.';
    }

    if (mode === 'register') {
      const cleanName = displayName.trim();
      if (!cleanName || cleanName.length < 2) {
        errors.displayName = 'Họ và tên cần có ít nhất 2 ký tự.';
      }
      if (!confirmPassword) {
        errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) {
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    try {
      await onSubmit({
        mode,
        email: cleanEmail,
        password,
        displayName: mode === 'register' ? cleanName : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : mode === 'login'
          ? 'Đăng nhập không thành công. Vui lòng kiểm tra lại email và mật khẩu.'
          : 'Đăng ký thất bại. Vui lòng thử lại sau.'
      );
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setGeneralError('');
    setFieldErrors({});
    try {
      await onSubmit({
        mode: 'login',
        email: demoEmail,
        password: 'password123',
      });
      onClose();
    } catch (err: unknown) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : 'Đăng nhập không thành công. Vui lòng kiểm tra lại email và mật khẩu.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm transition-all duration-300"
      onMouseDown={(e) => {
        isBackdropMouseDown.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (isBackdropMouseDown.current && e.target === e.currentTarget && !loading) {
          onClose();
        }
        isBackdropMouseDown.current = false;
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md bg-stone-50 rounded-2xl shadow-2xl border border-stone-200 text-stone-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top decorative bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#db5a39] via-[#e2765b] to-[#34483f]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#db5a39] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Đóng hộp thoại"
        >
          <X size={18} />
        </button>

        <div className="px-7 pt-6 pb-7">
          {/* Brand & Heading */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#db5a39] text-white flex items-center justify-center font-serif italic text-xl font-bold shadow-md">
              e
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-stone-900 font-serif">
                {mode === 'login' ? 'Đăng nhập vào E-Booking' : 'Tạo tài khoản mới'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {mode === 'login'
                  ? 'Khám phá và đặt vé tham gia sự kiện yêu thích'
                  : 'Tham gia cộng đồng để trải nghiệm đặt vé nhanh chóng'}
              </p>
            </div>
          </div>

          {/* Action Guard / Friendly Prompt Banner */}
          {promptMessage && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium flex items-center gap-2">
              <span className="text-base leading-none">ℹ️</span>
              <div className="flex-1">{promptMessage}</div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-stone-200/70 rounded-xl mb-5 text-sm font-semibold">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMode('login');
                setGeneralError('');
                setFieldErrors({});
              }}
              className={`py-2 rounded-lg transition-all duration-200 text-center cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#db5a39] shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMode('register');
                setGeneralError('');
                setFieldErrors({});
              }}
              className={`py-2 rounded-lg transition-all duration-200 text-center cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#db5a39] shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Đăng ký
            </button>
          </div>

          {/* General Error Message Box */}
          {generalError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">{generalError}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-displayname" className="block text-xs font-semibold text-stone-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <UserIcon size={16} className="absolute left-3 text-stone-400 pointer-events-none" />
                  <input
                    id="auth-displayname"
                    type="text"
                    disabled={loading}
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      clearFieldError('displayName');
                    }}
                    placeholder="Nguyễn Văn A"
                    className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all disabled:bg-stone-100 ${
                      fieldErrors.displayName
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-stone-300 focus:border-[#db5a39] focus:ring-[#db5a39]/20'
                    }`}
                  />
                </div>
                {fieldErrors.displayName && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <span>{fieldErrors.displayName}</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-stone-700 mb-1">
                Địa chỉ Email <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3 text-stone-400 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  disabled={loading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError('email');
                  }}
                  placeholder="name@example.com"
                  className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all disabled:bg-stone-100 ${
                    fieldErrors.email
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-stone-300 focus:border-[#db5a39] focus:ring-[#db5a39]/20'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-stone-700">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] text-stone-400">Tối thiểu 8 ký tự</span>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3 text-stone-400 pointer-events-none" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  disabled={loading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError('password');
                  }}
                  placeholder={mode === 'register' ? 'Nhập mật khẩu (>= 8 ký tự)' : '••••••••'}
                  className={`w-full pl-9 pr-10 py-2.5 bg-white border rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all disabled:bg-stone-100 ${
                    fieldErrors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-stone-300 focus:border-[#db5a39] focus:ring-[#db5a39]/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-stone-400 hover:text-stone-700 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-stone-700 mb-1">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3 text-stone-400 pointer-events-none" />
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError('confirmPassword');
                    }}
                    placeholder="Nhập lại mật khẩu"
                    className={`w-full pl-9 pr-10 py-2.5 bg-white border rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all disabled:bg-stone-100 ${
                      fieldErrors.confirmPassword
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-stone-300 focus:border-[#db5a39] focus:ring-[#db5a39]/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-stone-400 hover:text-stone-700 focus:outline-none cursor-pointer"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <span>{fieldErrors.confirmPassword}</span>
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-[#db5a39] hover:bg-[#c44929] active:bg-[#b03d20] disabled:bg-stone-300 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : mode === 'login' ? (
                'Đăng nhập ngay'
              ) : (
                'Tạo tài khoản'
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection (for testing and evaluation) */}
          {mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-stone-200/80">
              <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#db5a39]" />
                  <span>Tài khoản thử nghiệm (1-Click đăng nhập):</span>
                </div>
                <span className="text-[11px] text-stone-400 font-mono">Pass: password123</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(demoUsers.find((u) => u.role === 'USER')?.email || 'customer@ebooking.local')}
                  className="py-2 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 rounded-lg text-left transition-colors border border-stone-200/80 font-medium truncate cursor-pointer disabled:opacity-50 flex items-center justify-between"
                  title="Đăng nhập ngay với Khách hàng (pass: password123)"
                >
                  <span>👤 Khách hàng</span>
                  <span className="text-[10px] text-stone-400 font-normal">Đăng nhập</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(demoUsers.find((u) => u.role === 'ADMIN')?.email || 'admin@ebooking.local')}
                  className="py-2 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 rounded-lg text-left transition-colors border border-stone-200/80 font-medium truncate cursor-pointer disabled:opacity-50 flex items-center justify-between"
                  title="Đăng nhập ngay với Quản trị viên (pass: password123)"
                >
                  <span>👑 Quản trị viên</span>
                  <span className="text-[10px] text-stone-400 font-normal">Đăng nhập</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(demoUsers.find((u) => u.role === 'CHECK_IN_STAFF')?.email || 'staff@ebooking.local')}
                  className="py-2 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 rounded-lg text-left transition-colors border border-stone-200/80 font-medium truncate cursor-pointer disabled:opacity-50 flex items-center justify-between"
                  title="Đăng nhập ngay với Soát vé (pass: password123)"
                >
                  <span>🎟️ Soát vé</span>
                  <span className="text-[10px] text-stone-400 font-normal">Đăng nhập</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-5 text-center text-xs text-stone-500">
            {mode === 'login' ? (
              <p>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMode('register');
                    setGeneralError('');
                    setFieldErrors({});
                  }}
                  className="font-semibold text-[#db5a39] hover:underline focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  Đăng ký ngay
                </button>
              </p>
            ) : (
              <p>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMode('login');
                    setGeneralError('');
                    setFieldErrors({});
                  }}
                  className="font-semibold text-[#db5a39] hover:underline focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  Đăng nhập tại đây
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
