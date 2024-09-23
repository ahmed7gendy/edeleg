import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';

const sanitizeEmail = (email) => {
  return email.replace(/\./g, ","); // استبدال النقاط بفواصل
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // قراءة حالة المستخدم من localStorage
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user)); // حفظ المستخدم في localStorage
        const email = sanitizeEmail(user.email); // تنظيف البريد الإلكتروني

        // Fetch user roles from Firebase
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
        localStorage.removeItem('user'); // إزالة المستخدم عند تسجيل الخروج
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
      localStorage.removeItem('user'); // إزالة المستخدم عند تسجيل الخروج
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

export function useAuth() {
  return useContext(AuthContext);
}
