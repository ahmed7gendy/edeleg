import React, { useState, useEffect, useCallback } from "react";
import { db, ref, set, get, remove } from "../firebase";
import { getAuth } from "firebase/auth";
import "./CourseManagementPage.css";



// إرسال إشعار للمستخدمين المحددين
const sendNotificationToUsers = async (users, courseName) => {
  try {
    const notificationsRef = ref(db, "notifications");
    const now = new Date().toISOString();
    const auth = getAuth();

    for (const user of users) {
      const notification = {
        assignedEmail: user.email,
        createdAt: now,
        createdBy: auth.currentUser.email,
        fileUrl: "",
        isRead: false,
        message: `You have been added to the course: ${courseName}`,
      };
      await set(ref(notificationsRef, `/${sanitizeEmail(user.email)}/${now}`), notification);
    }
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
};

function CourseManagementPage() {
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [enrolledUsers, setEnrolledUsers] = useState([]);
  const [selectedEnrolledUsers, setSelectedEnrolledUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const fetchCourses = useCallback(async () => {
    try {
      const coursesRef = ref(db, "courses/mainCourses");
      const snapshot = await get(coursesRef);
      if (snapshot.exists()) {
        const coursesData = snapshot.val();
        console.log("Fetched courses:", coursesData);
        setCourses(coursesData);
      } else {
        console.log("No courses found");
        setCourses({});
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);
      let allUsers = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([email, user]) => ({
            ...user,
            email: email.replace(/,/g, "."),
            department: user.department || "No department",
          }))
        : [];

      if (selectedCourse) {
        allUsers = allUsers.filter(
          (user) =>
            !enrolledUsers.find(
              (enrolledUser) => enrolledUser.email === user.email
            )
        );
      }

      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [selectedCourse, enrolledUsers]);

  const fetchEnrolledUsers = useCallback(
    async (courseName) => {
      try {
        const rolesRef = ref(db, "roles");
        const snapshot = await get(rolesRef);
        if (snapshot.exists()) {
          const allRoles = snapshot.val();
          const enrolledEmails = Object.keys(allRoles).filter((email) => {
            return (
              allRoles[email].courses && allRoles[email].courses[courseName]
            );
          });

          const enrolledUsersData = await Promise.all(
            enrolledEmails.map(async (email) => {
              const userRef = ref(db, `users/${sanitizeEmail(email)}`);
              const userSnapshot = await get(userRef);
              return userSnapshot.exists()
                ? { ...userSnapshot.val(), email }
                : null;
            })
          );

          setEnrolledUsers(enrolledUsersData.filter((user) => user !== null));
        } else {
          setEnrolledUsers([]);
        }
      } catch (error) {
        console.error("Error fetching enrolled users:", error);
      }
    },
    []
  );

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (selectedCourse) {
      fetchEnrolledUsers(selectedCourse).then(() => {
        fetchUsers();
      });
    }
  }, [selectedCourse, fetchEnrolledUsers, fetchUsers]);

  const handleAddUsersToCourse = async () => {
    if (selectedCourse && selectedUsers.length > 0) {
      try {
        for (const user of selectedUsers) {
          const sanitizedEmail = sanitizeEmail(user.email);
          const userCoursesRef = ref(
            db,
            `roles/${sanitizedEmail}/courses/${selectedCourse}`
          );
          await set(userCoursesRef, { hasAccess: true });
        }
        await fetchEnrolledUsers(selectedCourse);
        await fetchUsers();
        sendNotificationToUsers(
          selectedUsers,
          courses[selectedCourse]?.name || "Unnamed Course"
        );
        setSelectedUsers([]);
      } catch (error) {
        console.error("Error adding users to course:", error);
      }
    }
  };

  const handleRemoveUsersFromCourse = async () => {
    if (selectedCourse && selectedEnrolledUsers.length > 0) {
      try {
        for (const userEmail of selectedEnrolledUsers) {
          const sanitizedEmail = sanitizeEmail(userEmail);
          const userCoursesRef = ref(
            db,
            `roles/${sanitizedEmail}/courses/${selectedCourse}`
          );
          await remove(userCoursesRef);
        }
        await fetchEnrolledUsers(selectedCourse);
        await fetchUsers();
        setSelectedEnrolledUsers([]);
      } catch (error) {
        console.error("Error removing users from course:", error);
      }
    }
  };

  const handleCourseSelection = (courseId) => {
    setSelectedCourse(courseId);
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.some((u) => u.email === user.email)
        ? prevSelected.filter((u) => u.email !== user.email)
        : [...prevSelected, user]
    );
  };

  const toggleEnrolledUserSelection = (userEmail) => {
    setSelectedEnrolledUsers((prevSelected) =>
      prevSelected.includes(userEmail)
        ? prevSelected.filter((u) => u !== userEmail)
        : [...prevSelected, userEmail]
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.name &&
        user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.department &&
        user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredEnrolledUsers = enrolledUsers.filter(
    (user) =>
      (user.name &&
        user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.department &&
        user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="course-management-page">
      <header className="course-management-header">
        <h1>Course Management</h1>
      </header>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      <div className="content">
        <div className="courses-section">
          <h2>Main Courses</h2>
          <ul className="course-list">
            {Object.keys(courses).length > 0 ? (
              Object.keys(courses).map((courseId) => (
                <li
                  key={courseId}
                  onClick={() => handleCourseSelection(courseId)}
                  className={selectedCourse === courseId ? "selected" : ""}
                >
                  {courses[courseId].name || "Unnamed Course"}
                </li>
              ))
            ) : (
              <p>No courses available</p>
            )}
          </ul>
        </div>

        {selectedCourse && (
          <>
            <div className="users-section">
              <h2>
                Users Not Enrolled in{" "}
                {courses[selectedCourse]?.name || "Unnamed Course"}
              </h2>
              <ul className="user-list">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <li key={user.email}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.some(
                          (u) => u.email === user.email
                        )}
                        onChange={() => toggleUserSelection(user)}
                      />
                      {user.name} ({user.email}) - {user.department}
                    </li>
                  ))
                ) : (
                  <p>No users available</p>
                )}
              </ul>
              <button onClick={handleAddUsersToCourse}>
                Add selected users to course
              </button>
            </div>

            <div className="enrolled-users-section">
              <h2>
                Enrolled Users in{" "}
                {courses[selectedCourse]?.name || "Unnamed Course"}
              </h2>
              <ul className="user-list">
                {filteredEnrolledUsers.length > 0 ? (
                  filteredEnrolledUsers.map((user) => (
                    <li key={user.email}>
                      <input
                        type="checkbox"
                        checked={selectedEnrolledUsers.includes(user.email)}
                        onChange={() => toggleEnrolledUserSelection(user.email)}
                      />
                      {user.name} ({user.email}) - {user.department}
                    </li>
                  ))
                ) : (
                  <p>No enrolled users available</p>
                )}
              </ul>
              <button onClick={handleRemoveUsersFromCourse}>
                Remove selected users from course
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CourseManagementPage;
