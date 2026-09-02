import { useRoutes } from 'react-router-dom';
import { Toaster } from '@/components/ui/Toast';
import routes from '@/router';

export default function App() {
  const element = useRoutes(routes);
  return (
    <>
      {element}
      <Toaster />
    </>
  );
}
