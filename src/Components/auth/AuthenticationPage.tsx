import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-simple';
import { UserRole } from '../../Entities/User';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Lock, 
  Mail, 
  Shield, 
  Settings, 
  LogOut,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export function AuthenticationPage() {
  const navigate = useNavigate();
  const { 
    user, 
    loading, 
    login, 
    logout
  } = useAuth();

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', name: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileUpdate, setProfileUpdate] = useState({ name: '' });
  
  // UI states
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profile' | 'permissions'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginForm.email, loginForm.password);
      showMessage('success', 'Welcome back! Login successful.');
      setLoginForm({ email: '', password: '' });
      // Redirect to dashboard after successful login
      navigate('/dashboard', { replace: true });
    } catch (error) {
      showMessage('error', `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    showMessage('info', 'Registration is currently disabled. Please contact admin.');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    showMessage('info', 'Password reset is currently disabled. Please contact admin.');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    showMessage('info', 'Password update is currently disabled. Please contact admin.');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    showMessage('info', 'Profile update is currently disabled. Please contact admin.');
  };

  const handleLogout = async () => {
    try {
      await logout();
      showMessage('success', 'Logged out successfully. See you soon!');
      // Stay on auth page after logout
    } catch (error) {
      showMessage('error', `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-amber-700 font-medium">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🔐 Authentication Center
              </h1>
              <p className="text-lg text-amber-700 font-medium">
                {format(new Date(), "EEEE, MMMM do, yyyy")}
              </p>
            </div>
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-xl border backdrop-blur-sm ${
            message.type === 'success' 
              ? 'bg-green-50/80 border-green-200 text-green-800' 
              : message.type === 'error' 
              ? 'bg-red-50/80 border-red-200 text-red-800' 
              : 'bg-blue-50/80 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {message.type === 'error' && <XCircle className="w-5 h-5" />}
              {message.type === 'info' && <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* User Status Card */}
        {user && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name || 'User'}</h2>
                  <p className="text-amber-700 font-medium">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 rounded-full text-sm font-medium border border-amber-200">
                      {user.role.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.active 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p><strong>Last Login:</strong></p>
                <p>{user.last_login ? format(new Date(user.last_login), 'PPp') : 'Never'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            {[
              { id: 'login', label: 'Login', icon: Lock, disabled: !!user },
              { id: 'register', label: 'Register', icon: User, disabled: !!user },
              { id: 'profile', label: 'Profile', icon: Settings, disabled: !user },
              { id: 'permissions', label: 'Permissions', icon: Shield, disabled: !user }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                disabled={tab.disabled}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-amber-800 border-b-2 border-amber-500 shadow-sm'
                    : tab.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-amber-800 hover:bg-white/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Login Tab */}
            {activeTab === 'login' && !user && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h3>
                  <p className="text-gray-600">Sign in to your GheeRoots account</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                  >
                    Sign In
                  </button>
                </form>



                <div className="border-t pt-6">
                  <h4 className="font-medium mb-3 text-center">Forgot Password?</h4>
                  <form onSubmit={handleResetPassword} className="flex gap-2">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter email for reset"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                    >
                      Reset
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Register Tab */}
            {activeTab === 'register' && !user && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h3>
                  <p className="text-gray-600">Join GheeRoots today</p>
                </div>
                
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      placeholder="Create a strong password"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
                  >
                    Create Account
                  </button>
                </form>
                
                <p className="text-sm text-gray-600 text-center">
                  New users are assigned the "Viewer" role by default.
                </p>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && user && (
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h3>
                  <p className="text-gray-600">Manage your account information</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900">Update Profile</h4>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={profileUpdate.name}
                          onChange={(e) => setProfileUpdate({ name: e.target.value })}
                          placeholder={user.name || 'Enter your name'}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
                      >
                        Update Profile
                      </button>
                    </form>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900">Change Password</h4>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                          placeholder="Enter new password"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
                      >
                        Update Password
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && user && (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Permissions</h3>
                  <p className="text-gray-600">Your current role and permissions</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Role Information */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-600" />
                      Role Status
                    </h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Administrator', check: isAdmin(), color: 'red' },
                        { label: 'Production Manager', check: isProduction(), color: 'blue' },
                        { label: 'Sales Manager', check: isSalesManager(), color: 'green' },
                        { label: 'Finance Manager', check: isFinance(), color: 'purple' },
                        { label: 'Viewer', check: isViewer(), color: 'gray' }
                      ].map((role) => (
                        <div key={role.label} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <span className="font-medium">{role.label}</span>
                          <span className={`flex items-center gap-1 ${
                            role.check ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {role.check ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {role.check ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource Permissions */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-amber-600" />
                      Resource Access
                    </h4>
                    <div className="space-y-4">
                      {['order', 'customer', 'batch', 'invoice', 'financial_ledger'].map((resource) => (
                        <div key={resource} className="bg-white rounded-xl p-4 border border-gray-200">
                          <div className="font-medium text-gray-900 mb-3 capitalize">
                            {resource.replace('_', ' ')}
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { action: 'Create', check: canCreate(resource), icon: '➕' },
                              { action: 'Read', check: canRead(resource), icon: '👁️' },
                              { action: 'Update', check: canUpdate(resource), icon: '✏️' },
                              { action: 'Delete', check: canDelete(resource), icon: '🗑️' }
                            ].map((perm) => (
                              <div key={perm.action} className={`text-center p-2 rounded-lg text-xs ${
                                perm.check 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : 'bg-gray-50 text-gray-500 border border-gray-200'
                              }`}>
                                <div className="text-lg mb-1">{perm.icon}</div>
                                <div className="font-medium">{perm.action}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}