import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import WelcomePage from "./pages/WelcomePage";
import AdminPage from "./pages/AdminPage";
import CoursePage from "./pages/CoursePage";
import CourseDetailPage from "./pages/CourseDetailPage";
import SubCourseDetailPage from "./pages/SubCourseDetailPage";
import UserProgressPage from "./pages/UserProgressPage";
import CourseManagementPage from "./pages/CourseManagementPage";
import AddTaskPage from "./pages/AddTaskPage";
import NotFoundPage from "./pages/NotFoundPage";
import ArchivedTasksPage from "./pages/ArchivedTasksPage"; // استيراد صفحة الأرشيف
import { useAuth } from "./context/AuthContext";
import "./App.css";

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { user, isAdmin, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  React.useEffect(() => {
    // انتظر حتى تنتهي حالة التحميل قبل اتخاذ أي إجراء
    if (!loading && !user) {
      navigate("/"); // إذا لم يكن هناك مستخدم بعد انتهاء التحميل، انتقل إلى صفحة تسجيل الدخول
    }
  }, [user, loading, navigate]);

  return (
    <div className="app-container">
      <Navbar onSidebarToggle={handleSidebarToggle} />
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <main className="main-content" onClick={closeSidebar}>
        <Routes>
          {/* صفحة تسجيل الدخول */}
          <Route path="/" element={<LoginPage />} />

          {/* صفحة الترحيب */}
          <Route path="/welcome" element={<WelcomePage />} />

          {/* صفحة الدورات */}
          <Route path="/courses" element={<CoursePage />} />

          {/* صفحة تفاصيل الدورة */}
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />

          {/* صفحة تفاصيل الدورة الفرعية */}
          <Route path="/sub-courses/:subCourseId" element={<SubCourseDetailPage />} />

          {/* صفحة تقدم المستخدم */}
          <Route path="/user-progress" element={<UserProgressPage />} />

          {/* صفحة إضافة المهام */}
          <Route path="/add-task" element={<AddTaskPage />} />

          {/* صفحة المهام المؤرشفة */}
          <Route path="/archived-tasks" element={<ArchivedTasksPage />} /> {/* إضافة مسار الأرشيف */}

          {/* حماية صفحات الإدارة */}
          {(isAdmin || isSuperAdmin) && (
            <>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/course-management" element={<CourseManagementPage />} />
            </>
          )}

          {/* صفحة 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
