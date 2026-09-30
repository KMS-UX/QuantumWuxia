import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, Trophy, Sparkles, Heart, Coins, Star } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'achievement' | 'levelup' | 'item' | 'gold' | 'xp';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  icon?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

// Simple global notification store
let notificationListeners: Array<(notifications: Notification[]) => void> = [];
let currentNotifications: Notification[] = [];

function notifyListeners() {
  notificationListeners.forEach(listener => listener([...currentNotifications]));
}

export function useNotifications(): NotificationContextType {
  const [notifications, setNotifications] = useState<Notification[]>(currentNotifications);

  useEffect(() => {
    notificationListeners.push(setNotifications);
    return () => {
      notificationListeners = notificationListeners.filter(l => l !== setNotifications);
    };
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    const newNotif: Notification = { ...notification, id };
    currentNotifications = [...currentNotifications, newNotif];
    notifyListeners();

    const duration = notification.duration || 4000;
    setTimeout(() => {
      currentNotifications = currentNotifications.filter(n => n.id !== id);
      notifyListeners();
    }, duration);
  }, []);

  const removeNotification = useCallback((id: string) => {
    currentNotifications = currentNotifications.filter(n => n.id !== id);
    notifyListeners();
  }, []);

  return { notifications, addNotification, removeNotification };
}

// Helper functions for common notifications
// Global dispatch function
function dispatchNotification(notification: Omit<Notification, 'id'>) {
  const id = `notif-${Date.now()}-${Math.random()}`;
  const newNotif: Notification = { ...notification, id };
  currentNotifications = [...currentNotifications, newNotif];
  notifyListeners();

  const duration = notification.duration || 4000;
  setTimeout(() => {
    currentNotifications = currentNotifications.filter(n => n.id !== id);
    notifyListeners();
  }, duration);
}

// Helper functions for common notifications
export function notifyAchievement(name: string, icon: string) {
  dispatchNotification({
    type: 'achievement',
    title: '🏆 Achievement Unlocked!',
    message: name,
    icon,
    duration: 5000,
  });
}

export function notifyLevelUp(level: number) {
  dispatchNotification({
    type: 'levelup',
    title: '⭐ Level Up!',
    message: `You reached level ${level}!`,
    duration: 4000,
  });
}

export function notifyItemGained(itemName: string) {
  dispatchNotification({
    type: 'item',
    title: '🎒 Item Acquired',
    message: itemName,
    duration: 3000,
  });
}

export function notifyGoldChange(amount: number) {
  dispatchNotification({
    type: 'gold',
    title: amount > 0 ? '💰 Gold Gained' : '💸 Gold Spent',
    message: `${amount > 0 ? '+' : ''}${amount} gold`,
    duration: 2500,
  });
}

export function notifyXPChange(amount: number) {
  dispatchNotification({
    type: 'xp',
    title: '✨ Experience Gained',
    message: `+${amount} XP`,
    duration: 2500,
  });
}

export function notifyDamage(amount: number) {
  dispatchNotification({
    type: 'error',
    title: '💔 Damage Taken',
    message: `-${amount} HP`,
    duration: 2000,
  });
}

export function notifyHeal(amount: number) {
  dispatchNotification({
    type: 'success',
    title: '❤️ Health Restored',
    message: `+${amount} HP`,
    duration: 2000,
  });
}

// Notification Display Component
export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      case 'achievement': return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'levelup': return <Star className="w-5 h-5 text-purple-400" />;
      case 'item': return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'gold': return <Coins className="w-5 h-5 text-yellow-400" />;
      case 'xp': return <Star className="w-5 h-5 text-purple-400" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStyle = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'border-green-600 bg-green-900/80';
      case 'error': return 'border-red-600 bg-red-900/80';
      case 'info': return 'border-blue-600 bg-blue-900/80';
      case 'achievement': return 'border-amber-500 bg-amber-900/80 shadow-lg shadow-amber-500/20';
      case 'levelup': return 'border-purple-500 bg-purple-900/80 shadow-lg shadow-purple-500/20';
      case 'item': return 'border-cyan-600 bg-cyan-900/80';
      case 'gold': return 'border-yellow-600 bg-yellow-900/80';
      case 'xp': return 'border-purple-600 bg-purple-900/80';
      default: return 'border-gray-600 bg-gray-800/80';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[200] space-y-2 pointer-events-none max-w-sm">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`pointer-events-auto border rounded-xl p-3 backdrop-blur-sm animate-slide-in-right ${getStyle(notif.type)}`}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">{getIcon(notif.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm">{notif.title}</div>
              {notif.message && (
                <div className="text-xs text-gray-200 mt-0.5">{notif.message}</div>
              )}
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              className="text-gray-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
