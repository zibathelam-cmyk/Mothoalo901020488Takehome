import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import { useApp } from './state/AppContext.jsx';
import SignIn from './pages/SignIn.jsx';
import Overview from './pages/Overview.jsx';
import Catalogue from './pages/Catalogue.jsx';
import Movements from './pages/Movements.jsx';
import Members from './pages/Members.jsx';

function RequireDesk() {
  const { session } = useApp();
  return session ? <Outlet /> : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route element={<RequireDesk />}>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="catalog" element={<Catalogue />} />
          <Route path="movements" element={<Movements />} />
          <Route path="members" element={<Members />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
