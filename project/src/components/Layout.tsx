import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, Receipt, Settings, LogOut, Menu, X, Wallet } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Layout() {
  const { signOut } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('darkMode');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col sm:flex-row">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="sm:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-white shadow-lg text-gray-800"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <nav className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        sm:translate-x-0
        fixed sm:static
        inset-y-0 left-0
        w-64 bg-white shadow-lg
        transition-transform duration-300 ease-in-out
        z-40 sm:z-auto
      `}>
        <div className="p-4">
          <h1 className="text-2xl font-bold text-indigo-600">SplitBill</h1>
        </div>
        <div className="mt-8">
          <NavLink 
            to="/" 
            icon={<Home size={20} />} 
            label="Dashboard" 
            active={isActive('/')}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <NavLink 
            to="/groups" 
            icon={<Users size={20} />} 
            label="Groups" 
            active={isActive('/groups')}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <NavLink 
            to="/expenses" 
            icon={<Receipt size={20} />} 
            label="Expenses" 
            active={isActive('/expenses')}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <NavLink 
            to="/personal-expenses" 
            icon={<Wallet size={20} />} 
            label="Personal Expenses" 
            active={isActive('/personal-expenses')}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <NavLink 
            to="/profile"
            icon={<Settings size={20} />} 
            label="Profile"
            active={isActive('/profile')}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <button
            onClick={() => {
              signOut();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center px-6 py-3 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut size={20} className="mr-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-h-screen sm:ml-0 text-gray-900">
        <Outlet />
      </main>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavLink({ to, icon, label, active, onClick }: NavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-6 py-3 ${
        active
          ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      } transition-colors`}
    >
      <span className="mr-4">{icon}</span>
      {label}
    </Link>
  );
}