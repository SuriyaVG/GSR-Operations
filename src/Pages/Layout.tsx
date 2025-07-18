import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  ShoppingCart, 
  Users, 
  CreditCard,
  Menu,
  LogOut
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
import { useAuth } from "@/lib/auth";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Material Intake",
    url: createPageUrl("MaterialIntake"),
    icon: Package,
  },
  {
    title: "Production",
    url: createPageUrl("Production"),
    icon: Factory,
  },
  {
    title: "Orders",
    url: createPageUrl("Orders"),
    icon: ShoppingCart,
  },
  {
    title: "Customers",
    url: createPageUrl("Customers"),
    icon: Users,
  },
  {
    title: "Finance",
    url: createPageUrl("Finance"),
    icon: CreditCard,
  },
];

export default function Layout({ currentPageName: _currentPageName }: { currentPageName?: string }) {
  const location = useLocation();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Create a demo user for immediate access when auth is slow
  const [demoUser] = React.useState({
    id: 'demo-user',
    email: 'demo@gsrghee.com',
    name: 'Demo User',
    role: 'admin'
  });

  // Use timeout to bypass loading state if it takes too long
  const [showApp, setShowApp] = React.useState(false);
  
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setShowApp(true);
    }, 1500); // Show app after 1.5 seconds regardless of auth state

    return () => clearTimeout(timeout);
  }, []);

  // Show loading only briefly
  if (loading && !showApp) {
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

  // Use authenticated user or fallback to demo user
  const currentUser = user || demoUser;

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
                  {navigationItems.map((item) => (
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
          </SidebarContent>

          <SidebarFooter className="border-t border-amber-100 p-4 bg-white shadow-inner mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-amber-600 truncate">
                    {currentUser?.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-amber-100 rounded-lg transition-colors duration-200"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-gray-500" />
              </button>
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
      </div>
    </SidebarProvider>
  );
} 