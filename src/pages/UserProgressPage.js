import React, { useEffect, useState, useCallback } from "react";
import { getDatabase, ref, get } from "firebase/database";
import * as XLSX from "xlsx"; // Import xlsx
import "./UserProgressPage.css";

function UserProgressPage() {
  const [users, setUsers] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]); // New state for submissions
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const database = getDatabase();

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = ref(database, "roles");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList = Object.entries(usersData).map(
          ([sanitizedEmail, user]) => {
            const email = sanitizedEmail.replace(/,/g, ".");
            return {
              email,
              role: user.role || "Unknown",
            };
          }
        );
        setUsers(usersList);
      } else {
        throw new Error("No data found at the path 'roles'");
      }
    } catch (error) {
      setError(`Failed to fetch users. Error: ${error.message}`);
    }
  }, [database]);

  const fetchArchivedTasks = useCallback(async () => {
    try {
      const tasksRef = ref(database, "archivedTasks");
      const snapshot = await get(tasksRef);
      if (snapshot.exists()) {
        const tasksList = Object.values(snapshot.val());
        setArchivedTasks(tasksList);
      } else {
        throw new Error("No data found at the path 'archivedTasks'");
      }
    } catch (error) {
      setError(`Failed to fetch archived tasks. Error: ${error.message}`);
    }
  }, [database]);

  const fetchNotifications = useCallback(async () => {
    try {
      const notificationsRef = ref(database, "notifications");
      const snapshot = await get(notificationsRef);
      if (snapshot.exists()) {
        const notificationsList = Object.values(snapshot.val()).map(
          (notification) => ({
            message: notification.message || "No message",
            createdAt: notification.createdAt || "N/A",
            fileUrl: notification.fileUrl || null,
            sender: notification.createdBy || "Unknown",
            recipient: notification.assignedEmail || "Unknown",
            isRead: notification.isRead ? "Read" : "Unread",
          })
        );
        setNotifications(notificationsList);
      } else {
        throw new Error("No data found at the path 'notifications'");
      }
    } catch (error) {
      setError(`Failed to fetch notifications. Error: ${error.message}`);
    }
  }, [database]);

  const fetchCourses = useCallback(async () => {
    try {
      const coursesRef = ref(database, "courses/mainCourses");
      const snapshot = await get(coursesRef);
      if (snapshot.exists()) {
        const coursesData = snapshot.val();
        const coursesList = Object.entries(coursesData).map(
          ([courseId, course]) => ({
            name: course.name,
            thumbnail: course.thumbnail,
            subCourses: course.subCourses
              ? Object.values(course.subCourses).map(
                  (subCourse) => subCourse.name
                )
              : [],
          })
        );
        setCourses(coursesList);
      } else {
        throw new Error("No data found at the path 'courses/mainCourses'");
      }
    } catch (error) {
      setError(`Failed to fetch courses. Error: ${error.message}`);
    }
  }, [database]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const submissionsRef = ref(database, "submissions");
      const snapshot = await get(submissionsRef);
      if (snapshot.exists()) {
        const submissionsData = snapshot.val();
        // Flatten the submissions data
        const submissionsList = Object.values(submissionsData)
          .flatMap((courseSubmissions) => Object.values(courseSubmissions))
          .map((submission) => ({
            email: submission.userId || "Unknown",
            courseId: submission.courseId || "N/A",
            endTime: submission.endTime || "N/A",
            percentageSuccess: submission.percentageSuccess || "N/A",
            startTime: submission.startTime || "N/A",
            totalTime: submission.totalTime || "N/A",
            userAnswers: submission.userAnswers
              ? submission.userAnswers.join(", ")
              : "N/A",
          }));
        setSubmissions(submissionsList);
      } else {
        throw new Error("No data found at the path 'submissions'");
      }
    } catch (error) {
      setError(`Failed to fetch submissions. Error: ${error.message}`);
    }
  }, [database]);

  useEffect(() => {
    if (!dataLoaded) {
      const fetchData = async () => {
        try {
          await Promise.all([
            fetchUsers(),
            fetchArchivedTasks(),
            fetchNotifications(),
            fetchCourses(),
            fetchSubmissions(), // Fetch submissions
          ]);
          setDataLoaded(true);
        } catch {
          setError("Failed to fetch data. Please try again later.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [
    fetchUsers,
    fetchArchivedTasks,
    fetchNotifications,
    fetchCourses,
    fetchSubmissions, // Include fetchSubmissions in the dependency array
    dataLoaded,
  ]);

  const exportToExcel = () => {
    // Prepare the data for export
    const usersSheet = XLSX.utils.json_to_sheet(users);
    const archivedTasksSheet = XLSX.utils.json_to_sheet(archivedTasks);
    const notificationsSheet = XLSX.utils.json_to_sheet(notifications);
    const coursesSheet = XLSX.utils.json_to_sheet(courses);
    const submissionsSheet = XLSX.utils.json_to_sheet(submissions); // Updated for submissions

    // Create a new workbook and add the sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, usersSheet, "Users");
    XLSX.utils.book_append_sheet(wb, archivedTasksSheet, "Archived Tasks");
    XLSX.utils.book_append_sheet(wb, notificationsSheet, "Notifications");
    XLSX.utils.book_append_sheet(wb, coursesSheet, "Courses");
    XLSX.utils.book_append_sheet(wb, submissionsSheet, "Submissions");

    // Write the workbook and trigger download
    XLSX.writeFile(wb, "UserProgressData.xlsx");
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div className="user-progress-page">
      <h1>User Progress Page</h1>

      {/* Add a button to trigger the export */}
      <button onClick={exportToExcel}>Export to Excel</button>

      {/* Users Table */}
      <h2>Users</h2>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="2">No users available</td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.email}>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Archived Tasks Table */}
      <h2>Archived Tasks</h2>
      <table>
        <thead>
          <tr>
            <th>Assigned Email</th>
            <th>Created By</th>
            <th>Submission Date</th>
            <th>File URL</th>
          </tr>
        </thead>
        <tbody>
          {archivedTasks.length === 0 ? (
            <tr>
              <td colSpan="4">No archived tasks available</td>
            </tr>
          ) : (
            archivedTasks.map((task, index) => (
              <tr key={index}>
                <td>{task.assignedEmail}</td>
                <td>{task.createdBy}</td>
                <td>{task.createdAt || "N/A"}</td>
                <td>
                  {task.fileUrl ? (
                    <a
                      href={task.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View File
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Notifications Table */}
      <h2>Notifications</h2>
      <table>
        <thead>
          <tr>
            <th>Message</th>
            <th>Notification Date</th>
            <th>File URL</th>
            <th>Sender</th>
            <th>Recipient</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {notifications.length === 0 ? (
            <tr>
              <td colSpan="6">No notifications available</td>
            </tr>
          ) : (
            notifications.map((notification, index) => (
              <tr key={index}>
                <td>{notification.message}</td>
                <td>{notification.createdAt}</td>
                <td>
                  {notification.fileUrl ? (
                    <a
                      href={notification.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View File
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td>{notification.sender}</td>
                <td>{notification.recipient}</td>
                <td>{notification.isRead}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Courses Table */}
      <h2>Courses</h2>
      <table>
        <thead>
          <tr>
            <th>Course Name</th>
            <th>Thumbnail</th>
            <th>Sub-Courses</th>
          </tr>
        </thead>
        <tbody>
          {courses.length === 0 ? (
            <tr>
              <td colSpan="3">No courses available</td>
            </tr>
          ) : (
            courses.map((course, index) => (
              <tr key={index}>
                <td>{course.name}</td>
                <td>
                  <img
                    src={course.thumbnail}
                    alt="Course Thumbnail"
                    width="100"
                  />
                </td>
                <td>{course.subCourses.join(", ") || "N/A"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Submissions Table */}
      <h2>Submissions</h2>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Course ID</th>
            <th>End Time</th>
            <th>Percentage Success</th>
            <th>Start Time</th>
            <th>Total Time</th>
            <th>User Answers</th>
          </tr>
        </thead>
        <tbody>
          {submissions.length === 0 ? (
            <tr>
              <td colSpan="7">No submissions available</td>
            </tr>
          ) : (
            submissions.map((submission, index) => (
              <tr key={index}>
                <td>{submission.email}</td>
                <td>{submission.courseId}</td>
                <td>{submission.endTime}</td>
                <td>{submission.percentageSuccess}%</td>
                <td>{submission.startTime}</td>
                <td>{submission.totalTime}</td>
                <td>{submission.userAnswers}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default UserProgressPage;
