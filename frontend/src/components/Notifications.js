import { createContext, useCallback, useContext, useMemo, useState } from "react";

const NotificationContext = createContext(null);

// Hiển thị danh sách toast đang hoạt động và cho phép người dùng tự đóng.
function NotificationViewport({ notifications, onDismiss }) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-viewport" aria-live="polite" aria-atomic="true">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-toast notification-${notification.type}`}
        >
          <div className="notification-copy">
            {notification.title ? (
              <p className="notification-title">{notification.title}</p>
            ) : null}
            <p className="notification-message">{notification.message}</p>
          </div>
          <button
            type="button"
            className="notification-close"
            onClick={() => onDismiss(notification.id)}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// Cung cấp API thông báo dùng chung cho toàn bộ cây React.
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // Xóa một thông báo khỏi danh sách đang hiển thị.
  const dismissNotification = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  // Tạo toast mới và tự động ẩn sau một khoảng thời gian.
  const notify = useCallback((message, options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextNotification = {
      id,
      type: options.type || "info",
      title: options.title || "",
      message,
    };

    setNotifications((current) => [...current, nextNotification]);

    const duration = options.duration ?? 4200;
    window.setTimeout(() => {
      dismissNotification(id);
    }, duration);
  }, [dismissNotification]);

  const value = useMemo(
    () => ({ notify, dismissNotification }),
    [dismissNotification, notify],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationViewport
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </NotificationContext.Provider>
  );
}

// Hook tiện ích để các component khác có thể gọi notify/dismiss.
export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }

  return context;
}
