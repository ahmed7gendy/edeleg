import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ReactComponent as Logo } from "../photos/edecs logo white.svg";
import { ReactComponent as HomeIcon } from "../photos/home-svgrepo-com.svg";
import { ReactComponent as NotificationsIcon } from "../photos/notifications-svgrepo-com (1).svg";
import { ReactComponent as LogoutIcon } from "../photos/logout-2-svgrepo-com.svg";
import NotificationPopup from "./NotificationPopup";
import { useAuth } from "../context/AuthContext";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./Navbar.css";

const Navbar = ({ onSidebarToggle }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCountSender, setUnreadCountSender] = useState(0); // عدد الإشعارات الخاصة بالمرسل
  const [unreadCountReceiver, setUnreadCountReceiver] = useState(0); // عدد الإشعارات الخاصة بالمستقبل
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(null); // حالة لتخزين بريد المستخدم

  // جلب المستخدم الحالي
  const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
      const auth = getAuth();
      onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve(user);
        } else {
          reject(new Error("User is not authenticated."));
        }
      });
    });
  };

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const email = user.email;
          setUserEmail(email);

          const notificationsRef = ref(db, "notifications");
          const notificationsSnapshot = await get(notificationsRef);
          if (notificationsSnapshot.exists()) {
            const notificationsData = notificationsSnapshot.val();

            // فلترة الإشعارات التي قام المستخدم بإنشائها (المرسل) والتي لم تُقرأ
            const unreadSentNotifications = Object.values(
              notificationsData
            ).filter(
              (notification) =>
                !notification.isRead && notification.createdBy === email
            );

            // فلترة الإشعارات التي تم تعيينها للمستخدم (المستقبل) والتي لم تُقرأ
            const unreadReceivedNotifications = Object.values(
              notificationsData
            ).filter(
              (notification) =>
                !notification.isRead && notification.assignedEmail === email
            );

            // تحديث عدد الإشعارات غير المقروءة
            setUnreadCountSender(unreadSentNotifications.length);
            setUnreadCountReceiver(unreadReceivedNotifications.length);
          }
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchUnreadCounts();
  }, [showNotifications, userEmail]);

  const handleNotificationClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleClosePopup = () => {
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="navbar">
      <button className="menu-btn" onClick={onSidebarToggle}>
        ☰
      </button>
      <Logo className="navbar-logo" />
      <div className="navbar-buttons">
        <Link to="/welcome" className="navbar-link">
          <HomeIcon className="navbar-icon" />
        </Link>

        <button
          onClick={handleNotificationClick}
          className="notification-button"
        >
          <NotificationsIcon className="navbar-icon" />
          {/* عرض عدد الإشعارات الخاصة بالمرسل */}
          {unreadCountSender > 0 && (
            <span className="notification-count">{`Sent: ${unreadCountSender}`}</span>
          )}
          {/* عرض عدد الإشعارات الخاصة بالمستقبل */}
          {unreadCountReceiver > 0 && (
            <span className="notification-count">{`Received: ${unreadCountReceiver}`}</span>
          )}
        </button>

        <button onClick={handleLogout} className="logout-button">
          <LogoutIcon className="navbar-icon" />
        </button>
        {showNotifications && <NotificationPopup onClose={handleClosePopup} />}
      </div>
    </nav>
  );
};

export default Navbar;
