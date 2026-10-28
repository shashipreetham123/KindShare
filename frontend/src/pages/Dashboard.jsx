import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Package,
  Inbox,
  BookmarkCheck,
  History,
  Settings,
  Users,
  LogOut,
  HeartHandshake,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  User as UserIcon
} from 'lucide-react';
import api from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await api.get('/user/me');
        setUser(res.user);
      } catch (err) {
        // If unauthenticated, redirect to login
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate('/login');
    }
  };

  const isAdmin = user && user.isAdmin;

  const userLinks = [
    { name: 'Home', path: 'home', icon: Home },
    { name: 'Browse', path: 'browse', icon: Compass },
    { name: 'Add Product', path: 'add-product', icon: PlusCircle },
    { name: 'Inventory', path: 'inventory', icon: Package },
    { name: 'Requests', path: 'requests', icon: Inbox },
    { name: 'Reserves', path: 'reserves', icon: BookmarkCheck },
    { name: 'History', path: 'history', icon: History },
    { name: 'Account Settings', path: 'account-settings', icon: Settings }
  ];

  const adminLinks = [
    { name: 'Home', path: 'home', icon: Home },
    { name: 'Browse', path: 'browse', icon: Compass },
    { name: 'Users', path: 'users', icon: Users },
    { name: 'History', path: 'history', icon: History },
    { name: 'Account Settings', path: 'account-settings', icon: Settings }
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">
            <HeartHandshake className="brand-icon" size={26} />
          </div>
          <div className="brand-info">
            <span className="brand-title">KindShare</span>
            <div className="brand-badges-row">
              <span className={`brand-badge ${isAdmin ? 'badge-admin' : 'badge-user'}`}>
                {isAdmin ? (
                  <>
                    <ShieldCheck size={12} /> Admin
                  </>
                ) : (
                  <>
                    <UserIcon size={12} /> User
                  </>
                )}
              </span>
              {!isAdmin && user && (
                <span className={`verification-badge ${user.verified ? 'badge-verified' : 'badge-unverified'}`}>
                  {user.verified ? (
                    <>
                      <CheckCircle size={11} /> Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle size={11} /> Unverified
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item-active' : ''}`
                }
              >
                <Icon size={19} className="nav-icon" />
                <span className="nav-label">{link.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-profile-preview">
              <div className="avatar">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{user.username}</span>
                <div className="user-subinfo">
                  <span className="user-role">{user.type || 'Individual'}</span>
                  {!isAdmin && (
                    <span className={`status-dot ${user.verified ? 'status-verified' : 'status-unverified'}`}>
                      • {user.verified ? 'Verified' : 'Unverified'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <button type="button" onClick={handleLogout} className="btn-logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <Outlet context={{ user, isAdmin }} />
      </main>
    </div>
  );
}

export default Dashboard;