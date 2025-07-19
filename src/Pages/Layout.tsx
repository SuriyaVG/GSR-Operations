import React from "react";
import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  ShoppingCart, 
  Users, 
  CreditCard,
  Menu,
  LogOut,
  Settings,
  UserCog,
  User,
  Shield,
  ChevronDown
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/Components/ui/sidebar";
import { useAuth } from "@/lib/auth-simple";
import { UserRole } from "@/Entities/User";
import { ProfileSettings } from "@/Components/auth/ProfileSettings.simple";
import { SpecialUserConfigService } from "@/lib/config/specialUsers";
import { cn } from "@/lib/utils";

// Define navigation items with role-based access control
const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN, UserRole.PRODUCTION, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.VIEWER],
  },
  {
    title: "Material Intake",
    url: createPageUrl("MaterialIntake"),
    icon: Package,
    roles: [UserRole.ADMIN, UserRole.PRODUCTION],
  },
  {
    title: "Production",
    url: createPageUrl("Production"),
    icon: Factory,
    roles: [UserRole.ADMIN, UserRole.PRODUCTION],
  },
  {
    title: "Orders",
    url: createPageUrl("Orders"),
    icon: ShoppingCart,
    roles: [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.VIEWER],
  },
  {
    title: "Customers",
    url: createPageUrl("Customers"),
    icon: Users,
    roles: [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.VIEWER],
  },
  {
    title: "Finance",
    url: createPageUrl("Finance"),
    icon: CreditCard,
    roles: [UserRole.ADMIN, UserRole.FINANCE],
  },
];

export default function Layout({ currentPageName: _currentPageName }: { currentPageName?: string }) {
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const [profileSettingsOpen, setProfileSettingsOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleProfileClick = () => {
    // Navigate to profile page instead of opening modal directly
    window.location.href = '/profile';
  };

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-amber-700 font-medium">Loading GSR Operations...</p>
          <p className="text-amber-600 text-sm mt-2">Initializing system...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if user is not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Use authenticated user
  const currentUser = {
    ...user,
    isSpecialUser: user?.custom_settings?.special_permissions ? true : false
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-gradient-to-br from-amber-50 to-orange-50">
        <Sidebar className="border-r border-amber-200 bg-white shadow-md h-full flex flex-col">
          <SidebarHeader className="border-b border-amber-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">G</span>
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-2xl">GSR Ghee</h2>
                <p className="text-base text-amber-600 font-semibold">Tracking Platform</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4 flex-1">
            <SidebarGroup>
              <SidebarGroupLabel className="text-base font-bold text-amber-700 uppercase tracking-wider px-4 py-3">
                Operations
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems
                    .filter(item => !item.roles || !currentUser?.role || item.roles.includes(currentUser.role as UserRole))
                    .map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-amber-100 hover:text-amber-800 transition-all duration-200 rounded-xl mb-3 py-4 px-5 text-lg font-semibold ${
                            location.pathname === item.url 
                              ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 shadow-sm border border-amber-200' 
                              : 'text-gray-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-4">
                            <item.icon className="w-6 h-6" />
                            <span className="font-semibold">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            {/* User Settings Section - visible to all users */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-base font-bold text-amber-700 uppercase tracking-wider px-4 py-3 mt-4">
                User Settings
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-amber-100 hover:text-amber-800 transition-all duration-200 rounded-xl mb-3 py-4 px-5 text-lg font-semibold ${
                        location.pathname === '/profile' 
                          ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 shadow-sm border border-amber-200' 
                          : 'text-gray-700'
                      }`}
                    >
                      <Link to="/profile" className="flex items-center gap-4">
                        <User className="w-6 h-6" />
                        <span className="font-semibold">My Profile</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin section - only visible to admins */}
            {user?.role === 'admin' && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-base font-bold text-amber-700 uppercase tracking-wider px-4 py-3 mt-4">
                  Administration
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-amber-100 hover:text-amber-800 transition-all duration-200 rounded-xl mb-3 py-4 px-5 text-lg font-semibold ${
                          location.pathname === '/admin/users' 
                            ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 shadow-sm border border-amber-200' 
                            : 'text-gray-700'
                        }`}
                      >
                        <Link to="/admin/users" className="flex items-center gap-4">
                          <UserCog className="w-6 h-6" />
                          <span className="font-semibold">User Management</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-amber-100 p-4 bg-white shadow-inner mt-auto">
            <div className="flex flex-col">
              {/* Enhanced User Profile Display */}
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 w-full hover:bg-amber-50 rounded-lg p-2 transition-colors duration-200 mb-2"
                title="Click to edit profile"
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  currentUser?.designation ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-amber-400 to-orange-500"
                )}>
                  <span className="text-white font-semibold text-sm">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {currentUser?.custom_settings?.display_name || currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
                    </p>
                    {currentUser?.isSpecialUser && (
                      <Shield className="w-3 h-3 text-amber-500" title="Special user" />
                    )}
                  </div>
                  <p className="text-xs text-amber-600 truncate flex items-center gap-1">
                    {currentUser?.designation || currentUser?.role?.replace('_', ' ').toUpperCase() || 'USER'}
                    <ChevronDown className="w-3 h-3" />
                  </p>
                  {currentUser?.custom_settings?.title && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {currentUser.custom_settings.title}
                      {currentUser?.custom_settings?.department && ` • ${currentUser.custom_settings.department}`}
                    </p>
                  )}
                </div>
              </button>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-1 border-t border-amber-100 pt-2">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3 h-3" />
                  Logout
                </button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-[#FFF8F0] px-10 py-8">
          <header className="bg-white/90 backdrop-blur-sm border-b border-amber-100 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-amber-100 p-2 rounded-lg transition-colors duration-200">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-bold text-gray-900">GSR Ghee</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>

        {/* Profile Settings Modal */}
        <ProfileSettings 
          open={profileSettingsOpen} 
          onOpenChange={setProfileSettingsOpen} 
        />
      </div>
    </SidebarProvider>
  );
} 