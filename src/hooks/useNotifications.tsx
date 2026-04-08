import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from './useAuth';
import { AppNotification } from '../types';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AppNotification[];
        
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);

        // Optional: Show browser notification for the latest unread one if it's new
        if (notifs.length > 0 && !notifs[0].read && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const lastNotifiedId = localStorage.getItem('lastNotifiedId');
          if (lastNotifiedId !== notifs[0].id) {
            new Notification(notifs[0].title, {
              body: notifs[0].message,
              icon: '/favicon.ico'
            });
            localStorage.setItem('lastNotifiedId', notifs[0].id);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    try {
      await Promise.all(unread.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      ));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${notificationId}`);
    }
  };

  // Helper for system to create notifications (for demo/testing)
  const createNotification = async (title: string, message: string, type: AppNotification['type'], link?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
        link
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
  };
}
