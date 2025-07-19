// Utility functions for the application

// Create page URL from page name
export function createPageUrl(pageName: string): string {
  const pageRoutes: Record<string, string> = {
    'Dashboard': '/dashboard',
    'MaterialIntake': '/material-intake',
    'Production': '/production',
    'Orders': '/orders',
    'Customers': '/customers',
    'Finance': '/finance',
    'Profile': '/profile',
    'Admin': '/admin'
  };

  return pageRoutes[pageName] || '/dashboard';
}

// Class name utility for conditional styling
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}