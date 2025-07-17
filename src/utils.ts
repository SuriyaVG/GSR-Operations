// src/utils.ts

// A map of page names to their URL paths
const pageRoutes = {
  Dashboard: '/dashboard',
  MaterialIntake: '/material-intake',
  Production: '/production',
  Orders: '/orders',
  Customers: '/customers',
  Finance: '/finance',
};

export function createPageUrl(page: keyof typeof pageRoutes): string {
  return pageRoutes[page] || '/';
}

// Example date formatting helper (used in Dashboard)
export function formatDate(date: Date | string, _format: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(); // Replace with date-fns if needed
} 