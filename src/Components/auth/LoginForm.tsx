import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../../lib/toast';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful!');
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quick login buttons for demo purposes
  const quickLogin = (role: string, userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-3">Quick login for demo:</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => quickLogin('admin', 'admin@gsroperations.com')}
            disabled={loading}
          >
            Admin
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => quickLogin('production', 'production@gsroperations.com')}
            disabled={loading}
          >
            Production
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => quickLogin('sales', 'sales@gsroperations.com')}
            disabled={loading}
          >
            Sales
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => quickLogin('finance', 'finance@gsroperations.com')}
            disabled={loading}
          >
            Finance
          </Button>
        </div>
      </div>
    </div>
  );
}