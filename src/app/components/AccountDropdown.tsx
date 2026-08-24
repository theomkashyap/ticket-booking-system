'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import LoadingMessage from '@/app/components/LoadingMessage';

interface AccountDropdownProps {
  name?: string | null;
  role?: 'customer' | 'organiser' | 'admin';
}

export function AccountDropdown({ name, role = 'customer' }: AccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [generalNotifications, setGeneralNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch notifications/offers with background polling
  useEffect(() => {
    if (!name) return;
    
    const fetchOffers = () => {
      fetch('/api/user/offers')
        .then((res) => res.json())
        .then((data) => {
          if (data.offers) setOffers(data.offers);
        })
        .catch(console.error);
        
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setGeneralNotifications(data);
        })
        .catch(console.error);
    };

    fetchOffers(); // Initial fetch
    const interval = setInterval(fetchOffers, 5000); // Poll every 5s
    
    return () => clearInterval(interval);
  }, [name]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead' })
      });
      setGeneralNotifications(generalNotifications.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', notificationId: id })
      });
      setGeneralNotifications(generalNotifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const initials = name?.[0]?.toUpperCase() ?? '?';
  const firstName = name ? name.split(' ')[0] : '';

  const unreadCount = offers.length + generalNotifications.filter(n => !n.read).length;

  // Determine profile/history link based on role
  const profileHref = role === 'customer' ? '/history' : role === 'organiser' ? '/organiser/events' : '/admin/venues';
  const profileLabel = role === 'customer' ? 'My Bookings' : role === 'organiser' ? 'My Events' : 'Manage Venues';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Account menu for ${name || 'user'}`}
        className="flex items-center gap-2 bg-charcoal/5 px-3 py-1.5 rounded-full border border-charcoal/10 hover:bg-charcoal/10 transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/60"
      >
        <div className="bg-charcoal/10 rounded-full w-7 h-7 flex items-center justify-center text-xs text-charcoal font-bold">
          {initials}
        </div>
        <span className="text-charcoal/80 text-sm font-medium">{firstName}</span>
        <svg
          className={`w-4 h-4 text-charcoal/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>

        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white border border-charcoal/10 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          role="menu"
        >
          {/* Header with notifications count */}
          <div className="bg-charcoal/5 px-4 py-3 border-b border-charcoal/10">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-charcoal">Account</h4>
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>

          {/* Navigation items */}
          <nav className="py-1" role="menu">
            <Link
              href={profileHref}
              onClick={closeDropdown}
              className="block px-4 py-2.5 text-sm text-charcoal/80 hover:bg-charcoal/5 transition-colors"
              role="menuitem"
            >
              {profileLabel}
            </Link>
            {role === 'customer' && (
              <Link
                href="/events"
                onClick={closeDropdown}
                className="block px-4 py-2.5 text-sm text-charcoal/80 hover:bg-charcoal/5 transition-colors"
                role="menuitem"
              >
                Browse Events
              </Link>
            )}
            {role === 'organiser' && (
              <Link
                href="/organiser/events/new"
                onClick={closeDropdown}
                className="block px-4 py-2.5 text-sm text-charcoal/80 hover:bg-charcoal/5 transition-colors"
                role="menuitem"
              >
                Create Event
              </Link>
            )}
            {role === 'admin' && (
              <Link
                href="/admin/venues/new"
                onClick={closeDropdown}
                className="block px-4 py-2.5 text-sm text-charcoal/80 hover:bg-charcoal/5 transition-colors"
                role="menuitem"
              >
                Create Venue
              </Link>
            )}

            {/* Divider */}
            <hr className="border-charcoal/10 my-1" />

            {/* Notifications section */}
            <div className="px-4 py-2 bg-charcoal/2">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-charcoal/50">Notifications</h5>
                {generalNotifications.filter(n => !n.read).length > 0 && (
                  <button onClick={markAllAsRead} className="text-[10px] font-bold text-accent hover:underline uppercase tracking-wider">
                    Mark Read
                  </button>
                )}
              </div>
              
              {offers.length > 0 || generalNotifications.length > 0 ? (
                <div className="max-h-60 overflow-y-auto">
                  {offers.map((offer) => (
                    <Link
                      key={offer.id}
                      href={`/offers/${offer.id}`}
                      onClick={closeDropdown}
                      className="block px-3 py-2 text-sm text-charcoal/80 hover:bg-charcoal/5 transition-colors border-t border-charcoal/5 first:border-0 rounded"
                      role="menuitem"
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                        <div>
                          <p className="text-[10px] font-bold text-accent mb-0.5 uppercase tracking-wider">Ticket Offer</p>
                          <p className="font-medium text-charcoal leading-tight">{offer.waitlist.show.event.title}</p>
                          <p className="text-[11px] text-charcoal/60 mt-0.5">Seat opened in {offer.waitlist.category}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {generalNotifications.filter(n => !n.read).map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.link || '#'}
                      onClick={() => {
                        if (!notif.read) markAsRead(notif.id);
                        closeDropdown();
                      }}
                      className={`block px-3 py-2 text-sm transition-colors border-t border-charcoal/5 first:border-0 rounded ${
                        !notif.read ? 'bg-accent/5 hover:bg-accent/10' : 'hover:bg-charcoal/5'
                      }`}
                      role="menuitem"
                    >
                      <div className="flex items-start gap-2">
                        {!notif.read && (
                          <div className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                        )}
                        <div className={notif.read ? 'ml-4' : ''}>
                          <p className={`text-[11px] leading-tight ${!notif.read ? 'font-semibold text-charcoal' : 'font-medium text-charcoal/80'}`}>
                            {notif.title}
                          </p>
                          <p className="text-[10px] text-charcoal/60 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-2 px-1">
                  <p className="text-xs text-charcoal/40 italic">No new notifications</p>
                </div>
              )}
            </div>

            {/* Sign out */}
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsSigningOut(true);
                setTimeout(() => {
                  signOut({ callbackUrl: '/' });
                }, 1000);
              }}
              disabled={isSigningOut}
              className="block w-full text-left px-4 py-2.5 text-sm text-accent hover:bg-accent/5 transition-colors border-t border-charcoal/10 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              role="menuitem"
            >
              {isSigningOut ? <LoadingMessage variant="inline" className="justify-start text-xs" /> : 'Sign out'}
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}