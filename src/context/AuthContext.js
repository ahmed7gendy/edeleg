import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';

// دالة لتنظيف البريد الإلكتروني
const sanitizeEmail = (email) => {
  return email.replace(/\./g, ","); // استبدال النقاط بفواصل
};

// إنشاء السياق
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const email = sanitizeEmail(user.email); // تنظيف البريد الإلكتروني

        // جلب الأدوار من Firebase
        const db = getDatabase();
        const userRef = ref(db, `users/${email}`);

        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const role = userData.role || "User"; // الحصول على الدور

            // إعطاء نفس الصلاحيات لـ Admin و SuperAdmin
            if (role === "SuperAdmin" || role === "admin") {
              setIsSuperAdmin(true);
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
              setIsSuperAdmin(false);
            }
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// دالة لاستخدام السياق في أماكن أخرى
export function useAuth() {
  return useContext(AuthContext);
}
