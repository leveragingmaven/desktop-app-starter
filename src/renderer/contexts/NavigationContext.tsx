import { createContext, useContext, type ReactNode } from 'react';

interface NavigationContextValue {
  /** Switches the visible top-level screen by its registry id (e.g. 'ai', 'settings'). */
  navigateTo: (screenId: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  navigateTo,
  children,
}: {
  navigateTo: (screenId: string) => void;
  children: ReactNode;
}) {
  return (
    <NavigationContext.Provider value={{ navigateTo }}>{children}</NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within a NavigationProvider');
  return ctx;
}
