import { Outlet } from 'react-router-dom';
import SideNav from './SideNav.jsx';
import TopBar from './TopBar.jsx';
import ToastStack from './ToastStack.jsx';

export default function AppShell() {
  return (
    <div className="app-frame">
      <SideNav />
      <div className="app-main">
        <TopBar />
        <main className="page-area"><Outlet /></main>
      </div>
      <ToastStack />
    </div>
  );
}
