import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ProfileSettings } from '@/Components/auth/ProfileSettings';
import { User, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Profile Page
 * 
 * This component displays the user's profile information and provides
 * access to profile settings. It's accessible to all authenticated users.
 */
export default function Profile() {
  const { user } = useAuth();
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">View and manage your profile information</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 shadow-md p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {user.custom_settings?.display_name || user.name || user.email?.split('@')[0]}
              </h2>
              {user.custom_settings?.special_permissions && (
                <Shield className="w-5 h-5 text-amber-500" title="Special user" />
              )}
            </div>
            <p className="text-amber-600 font-medium">
              {user.designation || user.role?.replace('_', ' ').toUpperCase() || 'USER'}
            </p>
            {user.custom_settings?.title && (
              <p className="text-gray-500 text-sm">
                {user.custom_settings.title}
                {user.custom_settings?.department && ` • ${user.custom_settings.department}`}
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Account Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium">{user.role?.replace('_', ' ').toUpperCase() || 'USER'}</p>
              </div>
              {user.last_login && (
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="w-4 h-4 text-amber-500" />
                    {format(new Date(user.last_login), 'PPp')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Profile Settings</h3>
            <p className="text-gray-600 mb-4">
              Update your profile information, including your name and display preferences.
            </p>
            <button
              onClick={() => setProfileSettingsOpen(true)}
              className="bg-amber-400 hover:bg-amber-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Profile activity section could be added here */}

      {/* Profile Settings Modal */}
      <ProfileSettings 
        open={profileSettingsOpen} 
        onOpenChange={setProfileSettingsOpen} 
      />
    </div>
  );
}