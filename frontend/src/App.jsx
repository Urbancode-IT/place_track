import { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';
import { Toaster } from '@/components/ui/Toast';
import routes from '@/router';
import { useThemeStore } from '@/store/theme.store';

function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
  }, [theme]);

  return null;
}

export default function App() {
  const element = useRoutes(routes);
  return (
    <>
      <ThemeSync />
      {element}
      <Toaster />
    </>
  );
}
