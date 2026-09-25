import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PeekingEquipment } from './components/PeekingEquipment';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <PeekingEquipment />
    </>
  );
}
