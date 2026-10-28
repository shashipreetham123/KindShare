import { useOutletContext, Link } from 'react-router-dom';
import {
  Compass,
  Package,
  Inbox,
  BookmarkCheck,
  History,
  Settings,
  Users,
  Megaphone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Heart,
  CheckCircle,
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import './Home.css';

function Home() {
  const context = useOutletContext() || {};
  const { user, isAdmin } = context;

  const userActionCards = [
    {
      title: 'Browse Listings',
      desc: 'Explore goods, items, and donations shared by the community.',
      path: '/dashboard/browse',
      icon: Compass,
      tag: 'Explore'
    },
    {
      title: 'Add Product',
      desc: 'List donations, surplus food, and goods to share with others.',
      path: '/dashboard/add-product',
      icon: PlusCircle,
      tag: 'Donate'
    },
    {
      title: 'My Inventory',
      desc: 'Manage listed items, track stock, and publish new offerings.',
      path: '/dashboard/inventory',
      icon: Package,
      tag: 'Manage'
    },
    {
      title: 'Incoming Requests',
      desc: 'Review item requests submitted by beneficiaries.',
      path: '/dashboard/requests',
      icon: Inbox,
      tag: 'Review'
    },
    {
      title: 'Active Reserves',
      desc: 'Track reserved allocations and confirm handoffs.',
      path: '/dashboard/reserves',
      icon: BookmarkCheck,
      tag: 'Active'
    },
    {
      title: 'Activity History',
      desc: 'Check past requests, completed transactions, and cancellations.',
      path: '/dashboard/history',
      icon: History,
      tag: 'Records'
    },
    {
      title: 'Account Settings',
      desc: 'Update your profile, contact details, and preferences.',
      path: '/dashboard/account-settings',
      icon: Settings,
      tag: 'Profile'
    }
  ];

  const adminActionCards = [
    {
      title: 'Browse Products',
      desc: 'Inspect all current community listings and delist items if needed.',
      path: '/dashboard/browse',
      icon: Compass,
      tag: 'Catalogs'
    },
    {
      title: 'Manage Users',
      desc: 'Verify, unverify, create accounts, or manage platform members.',
      path: '/dashboard/users',
      icon: Users,
      tag: 'Admin'
    },
    {
      title: 'Global Audit History',
      desc: 'Review total system events, administrative actions, and records.',
      path: '/dashboard/history',
      icon: History,
      tag: 'Audits'
    },
    {
      title: 'Account Settings',
      desc: 'Configure administrative details and credentials.',
      path: '/dashboard/account-settings',
      icon: Settings,
      tag: 'Admin'
    }
  ];

  const actionCards = isAdmin ? adminActionCards : userActionCards;

  return (
    <div className="home-container">
      {/* 1. Welcome Screen Banner */}
      <section className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-tag">
            <Sparkles size={16} />
            <span>{isAdmin ? 'Administrative Dashboard' : 'KindShare Hub'}</span>
          </div>
          <h1>
            Welcome back, <span className="highlight-name">{user ? user.username : 'Friend'}</span>!
          </h1>
          <p>
            {isAdmin
              ? 'Manage platform members, monitor transactions, and inspect listings across the network.'
              : 'Empowering community sharing. Check your pending requests, explore new supplies, or share surplus items.'}
          </p>
        </div>
        <div className="welcome-badge-col">
          <div className="role-chip">
            {isAdmin ? (
              <>
                <ShieldCheck size={18} className="role-icon admin-color" />
                <div>
                  <strong>Admin Account</strong>
                  <span>Full access</span>
                </div>
              </>
            ) : user && user.verified ? (
              <>
                <CheckCircle size={18} className="role-icon verified-color" />
                <div>
                  <strong>{user && user.type ? user.type.toUpperCase() : 'USER'}</strong>
                  <span className="status-text verified-text">Verified Member</span>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={18} className="role-icon unverified-color" />
                <div>
                  <strong>{user && user.type ? user.type.toUpperCase() : 'USER'}</strong>
                  <span className="status-text unverified-text">Unverified Member</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2. Place for Advert / Announcements */}
      <section className="announcement-card">
        <div className="announcement-icon-wrap">
          <Megaphone className="announcement-icon" size={24} />
        </div>
        <div className="announcement-text">
          <div className="announcement-meta">
            <span className="badge-pulse">ANNOUNCEMENT</span>
            <span className="announcement-date">Today</span>
          </div>
          <h3>Winter Community Drive 2026 is Active!</h3>
          <p>
            Over 250 items have been distributed this week. Consider listing surplus warm blankets,
            clothing, and food supplies to support local shelters and families in need.
          </p>
        </div>
        <div className="announcement-action">
          <Link to="/dashboard/browse" className="announcement-btn">
            Browse Drives
          </Link>
        </div>
      </section>

      {/* 3. Available Links for the User / Admin */}
      <section className="actions-section">
        <div className="section-header">
          <h2>Quick Navigation</h2>
          <p>Choose an action or navigate directly to your workspace tools</p>
        </div>

        <div className="action-grid">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.path} to={card.path} className="action-card">
                <div className="card-top">
                  <div className="card-icon-box">
                    <Icon size={22} />
                  </div>
                  <span className="card-tag">{card.tag}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <div className="card-arrow">
                  <span>Open</span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Home;
