import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Droplet,
  Bell,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  HeartHandshake,
  Shield,
  FilePlus2,
  Check,
  Building2,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenRequestModal?: () => void }> = ({ onOpenRequestModal }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'donor') return '/donor/dashboard';
    return '/requester/dashboard';
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Hospitals & Blood Banks', path: '/hospitals' },
    { name: 'About', path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blood-700 text-white flex items-center justify-center shadow-md shadow-blood-700/20 group-hover:scale-105 transition">
              <Droplet className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-charcoal-900 flex items-center gap-1">
                Blood<span className="text-blood-700">_Link</span>
              </span>
              <span className="hidden sm:block text-[10px] font-medium text-gray-500 uppercase tracking-widest -mt-1">
                Emergency Donor Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-medium transition ${
                    isActive ? 'text-blood-700 font-semibold' : 'text-charcoal-700 hover:text-blood-700'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Create Emergency Request Fast Action */}
            <button
              onClick={() => {
                if (onOpenRequestModal) {
                  onOpenRequestModal();
                } else {
                  navigate(user?.role === 'requester' ? '/requester/dashboard' : '/login?redirect=new-request');
                }
              }}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blood-700 text-white hover:bg-blood-800 shadow-sm hover:shadow transition"
            >
              <FilePlus2 className="w-4 h-4" />
              Emergency Request
            </button>

            {user ? (
              <>
                {/* Notification Bell Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="relative p-2 text-charcoal-600 hover:text-charcoal-900 rounded-lg hover:bg-gray-100 transition"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blood-700 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl ring-1 ring-black/5 divide-y divide-gray-100 z-50">
                      <div className="p-3 flex items-center justify-between bg-gray-50/80 rounded-t-xl">
                        <span className="text-xs font-semibold text-charcoal-900">Notifications ({unreadCount} unread)</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[11px] text-blood-700 hover:underline font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-gray-500">
                            No notifications at this time.
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => markAsRead(n.id)}
                              className={`p-3 text-xs cursor-pointer hover:bg-gray-50 transition ${
                                !n.is_read ? 'bg-blood-50/40 font-medium' : 'text-gray-600'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-charcoal-900">{n.title}</span>
                                {!n.is_read && <span className="w-2 h-2 rounded-full bg-blood-700 shrink-0 mt-1"></span>}
                              </div>
                              <p className="text-charcoal-700 mt-1 line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-gray-400 mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dashboard Link */}
                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-charcoal-800 hover:bg-gray-200 transition"
                >
                  {user.role === 'admin' ? (
                    <Shield className="w-4 h-4 text-blood-700" />
                  ) : user.role === 'donor' ? (
                    <HeartHandshake className="w-4 h-4 text-blood-700" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-blood-700" />
                  )}
                  Dashboard
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-blood-700 hover:bg-gray-100 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold text-charcoal-800 hover:text-blood-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register/donor"
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blood-700 text-white hover:bg-blood-800 rounded-lg shadow-sm transition"
                >
                  Become Donor
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-4 space-y-2 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-charcoal-800 hover:bg-gray-50"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-semibold text-charcoal-800 bg-gray-100 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register/donor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-semibold bg-blood-700 text-white rounded-lg"
                >
                  Become a Voluntary Donor
                </Link>
              </>
            ) : (
              <Link
                to={getDashboardPath()}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-semibold bg-blood-700 text-white rounded-lg"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
