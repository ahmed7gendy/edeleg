import React, { useEffect, useState, useCallback } from "react";
import { getDatabase, ref, get } from "firebase/database";
import * as XLSX from "xlsx";
import "./UserProgressPage.css";

function UserProgressPage() {
  const [users, setUsers] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const database = getDatabase();

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = ref(database, "users");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList = Object.entries(usersData).map(([id, data]) => ({
          id,
          email: data.email,
          role: data.role,
        }));
        setUsers(usersList);
      } else {
        throw new Error("No data found at the path 'users'");
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
        const tasksData = snapshot.val();
        const tasksList = Object.entries(tasksData).map(([id, data]) => ({
          assignedEmail: data.assignedEmail,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          fileUrl: data.fileUrl,
        }));
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
        const notificationsData = snapshot.val();
        const notificationsList = Object.entries(notificationsData).map(([id, data]) => ({
          message: data.message,
          createdAt: data.createdAt,
          fileUrl: data.fileUrl,
          sender: data.sender,
          recipient: data.recipient,
          isRead: data.isRead,
        }));
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
        const mainCoursesList = Object.entries(coursesData).map(([id, data]) => ({
          id,
          name: data.name,
          thumbnail: data.thumbnail,
          subCourses: data.subCourses || [], // تأكد من أن هناك قيمة افتراضية
          questions: data.questions || [],
          videos: data.videos || []
        }));
        console.log("Courses Data:", mainCoursesList); // سجل البيانات المسترجعة
        setCourses(mainCoursesList);
      } else {
        console.error("No data found at the path 'courses/mainCourses'");
        setError("No data found at the path 'courses/mainCourses'");
      }
    } catch (error) {
      console.error("Error fetching courses:", error.message);
      setError(`Failed to fetch courses. Error: ${error.message}`);
    }
  }, [database]);
  
  

  const fetchSubmissions = useCallback(async () => {
    try {
      const submissionsRef = ref(database, "submissions");
      const snapshot = await get(submissionsRef);
      if (snapshot.exists()) {
        const submissionsData = snapshot.val();
        const submissionsList = Object.entries(submissionsData).flatMap(
          ([userId, courses]) => 
            Object.entries(courses).map(([courseId, submission]) => ({
              email: submission.email || "Unknown",
              courseId: courseId,
              endTime: submission.endTime || "Not Completed",
              percentageSuccess: submission.percentageSuccess || "N/A",
              startTime: submission.startTime || "N/A",
              totalTime: submission.totalTime || "N/A",
              userAnswers: submission.userAnswers ? submission.userAnswers.join(", ") : "N/A",
              userId: userId,
            }))
        );
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
            fetchSubmissions(),
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
    fetchSubmissions,
    dataLoaded,
  ]);

  const exportToExcel = () => {
    const usersSheet = XLSX.utils.json_to_sheet(users);
    const archivedTasksSheet = XLSX.utils.json_to_sheet(archivedTasks);
    const notificationsSheet = XLSX.utils.json_to_sheet(notifications);
    const coursesSheet = XLSX.utils.json_to_sheet(courses);
    const submissionsSheet = XLSX.utils.json_to_sheet(submissions);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, usersSheet, "Users");
    XLSX.utils.book_append_sheet(workbook, archivedTasksSheet, "Archived Tasks");
    XLSX.utils.book_append_sheet(workbook, notificationsSheet, "Notifications");
    XLSX.utils.book_append_sheet(workbook, coursesSheet, "Courses");
    XLSX.utils.book_append_sheet(workbook, submissionsSheet, "Submissions");

    XLSX.writeFile(workbook, "UserProgressData.xlsx");
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>User Progress Page</h1>
      <button onClick={exportToExcel}>Export to Excel</button>

      <div>
        <h2>Users</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Archived Tasks</h2>
        <table>
          <thead>
            <tr>
              <th>Assigned Email</th>
              <th>Created By</th>
              <th>Created At</th>
              <th>File URL</th>
            </tr>
          </thead>
          <tbody>
            {archivedTasks.map((task, index) => (
              <tr key={index}>
                <td>{task.assignedEmail}</td>
                <td>{task.createdBy}</td>
                <td>{task.createdAt}</td>
                <td>{task.fileUrl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Notifications</h2>
        <table>
          <thead>
            <tr>
              <th>Message</th>
              <th>Created At</th>
              <th>File URL</th>
              <th>Sender</th>
              <th>Recipient</th>
              <th>Is Read</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification, index) => (
              <tr key={index}>
                <td>{notification.message}</td>
                <td>{notification.createdAt}</td>
                <td>{notification.fileUrl}</td>
                <td>{notification.sender}</td>
                <td>{notification.recipient}</td>
                <td>{notification.isRead ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
  <h2>Courses</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Thumbnail</th>
        <th>Sub Courses</th>
      </tr>
    </thead>
    <tbody>
      {courses.length > 0 ? (
        courses.map((course) => (
          <tr key={course.id}>
            <td>{course.id}</td>
            <td>{course.name}</td>
            <td>
              <img src={course.thumbnail} alt={course.name} width={100} />
            </td>
            <td>
              {course.subCourses && Object.keys(course.subCourses).length > 0 ? (
                Object.entries(course.subCourses).map(([subCourseId, subCourseData]) => (
                  <div key={subCourseId}>
                    {subCourseData.name} {/* Display the name of the subCourse */}
                  </div>
                ))
              ) : (
                <div>No Sub Courses</div>
              )}
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="4">No Courses Available</td>
        </tr>
      )}
    </tbody>
  </table>
</div>





      <div>
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
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission, index) => (
              <tr key={index}>
                <td>{submission.email}</td>
                <td>{submission.courseId}</td>
                <td>{submission.endTime}</td>
                <td>{submission.percentageSuccess}</td>
                <td>{submission.startTime}</td>
                <td>{submission.totalTime}</td>
                <td>{submission.userAnswers}</td>
                <td>{submission.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserProgressPage;
