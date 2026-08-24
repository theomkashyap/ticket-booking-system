'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead' })
      });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markRead', notificationId: notification.id })
        });
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
      } catch (e) {
        console.error(e);
      }
    }
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-charcoal/10 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal/10 bg-charcoal/2">
            <h3 className="font-semibold text-charcoal">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-charcoal/50 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b border-charcoal/5 last:border-b-0 hover:bg-charcoal/3 transition-colors ${
                      !notif.read ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!notif.read && (
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${!notif.read ? 'font-semibold text-charcoal' : 'font-medium text-charcoal/80'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-charcoal/60 mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-charcoal/40 mt-2 font-mono uppercase">
                          {new Date(notif.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
