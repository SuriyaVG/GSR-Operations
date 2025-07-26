import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';

const SidebarContext = React.createContext<{ isCollapsed: boolean }>({ isCollapsed: false });

export const useSidebar = () => React.useContext(SidebarContext);

const SidebarProvider = ({
  children,
  isCollapsed: isCollapsedProp = false,
}: {
  children: React.ReactNode;
  isCollapsed?: boolean;
}) => {
  const [isCollapsed] = React.useState(isCollapsedProp);
  return <SidebarContext.Provider value={{ isCollapsed }}>{children}</SidebarContext.Provider>;
};

const sidebarVariants = cva('h-full flex flex-col transition-all duration-300', {
  variants: {
    collapsed: {
      true: 'w-16',
      false: 'w-80',
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

const Sidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
  const { isCollapsed } = useSidebar();
  return <nav ref={ref} className={cn(sidebarVariants({ collapsed: isCollapsed }), className)} {...props} />;
});
Sidebar.displayName = 'Sidebar';

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isCollapsed } = useSidebar();
  return <div ref={ref} className={cn('p-4', { 'px-3': isCollapsed }, className)} {...props} />;
});
SidebarHeader.displayName = 'SidebarHeader';

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1 overflow-y-auto', className)} {...props} />
));
SidebarContent.displayName = 'SidebarContent';

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 mt-auto', className)} {...props} />
));
SidebarFooter.displayName = 'SidebarFooter';

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('py-2', className)} {...props} />
));
SidebarGroup.displayName = 'SidebarGroup';

const SidebarGroupLabel = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { isCollapsed } = useSidebar();
  if (isCollapsed) return null;
  return <p ref={ref} className={cn('px-4 text-xs font-semibold tracking-wider text-muted-foreground', className)} {...props} />;
});
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <div ref={ref} {...props} />);
SidebarGroupContent.displayName = 'SidebarGroupContent';

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>((props, ref) => <ul ref={ref} {...props} />);
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>((props, ref) => <li ref={ref} {...props} />);
SidebarMenuItem.displayName = 'SidebarMenuItem';

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, ...props }, ref) => {
  const { isCollapsed } = useSidebar();
  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn('w-full justify-start', { 'justify-center px-0': isCollapsed }, className)}
      {...props}
    />
  );
});
SidebarMenuButton.displayName = 'SidebarMenuButton';

const SidebarTrigger = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <Button variant="ghost" size="icon" className={cn('rounded-full', className)} {...props} />
);

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarProvider,
}; 