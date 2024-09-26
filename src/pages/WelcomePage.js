import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ref, get, set, remove } from "firebase/database";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./WelcomePage.css";

const WelcomePage = () => {
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error("User is not authenticated.");
        }

        const email = user.email;
        const safeEmailPath = email.replace(/\./g, ",");

        // Fetch user roles
        const rolesRef = ref(db, `roles/${safeEmailPath}`);
        const rolesSnapshot = await get(rolesRef);
        if (!rolesSnapshot.exists()) {
          throw new Error("No data for roles.");
        }

        const userRoles = rolesSnapshot.val().courses || {};

        // Fetch available courses
        const coursesRef = ref(db, "courses/mainCourses");
        const coursesSnapshot = await get(coursesRef);
        if (!coursesSnapshot.exists()) {
          throw new Error("No data for courses.");
        }

        const coursesData = coursesSnapshot.val();
        const coursesArray = Object.keys(coursesData).map((key) => ({
          id: key,
          ...coursesData[key],
        }));
        const filteredCourses = coursesArray.filter(
          (course) => userRoles[course.id]
        );

        setCourses(filteredCourses);

        // Fetch tasks
        const tasksRef = ref(db, "tasks");
        const tasksSnapshot = await get(tasksRef);
        const tasksData = tasksSnapshot.val() || {};
        const tasksArray = Object.keys(tasksData).map((key) => ({
          id: key,
          ...tasksData[key],
        }));

        // Filter tasks by user email or creator
        const filteredTasks = tasksArray.filter(
          (task) => task.assignedEmails?.includes(email) || task.createdBy === email
        );
        setTasks(filteredTasks);

        // Fetch user name
        const userRef = ref(db, `users/${safeEmailPath}`);
        const userSnapshot = await get(userRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          setUserName(userData.name || "User");
        } else {
          setUserName("User");
        }
      } catch (error) {
        console.error("Data entry error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Get current user
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

  // End task and archive it
  const endTask = async (taskId) => {
    try {
      const taskRef = ref(db, `tasks/${taskId}`);
      const taskSnapshot = await get(taskRef);
      if (!taskSnapshot.exists()) {
        throw new Error("Task does not exist.");
      }

      const taskData = taskSnapshot.val();
      const archivedTaskRef = ref(db, `archivedTasks/${taskId}`);
      await set(archivedTaskRef, taskData);
      await remove(taskRef);
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error ending task:", error);
      setError(error.message);
    }
  };

  const isMegaLink = (url) => {
    return (
      url.startsWith("https://mega.nz/") ||
      url.startsWith("https://drive.google.com/")
    );
  };

  return (
    <div className="container">
      <h1>Welcome, {userName}</h1>
      <h2>Courses</h2>
      {loading ? (
        <p>Loading ...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : courses.length > 0 ? (
        <div className="course-container">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="course-card"
            >
              {course.thumbnail ? (
                <a
                  href={course.thumbnail}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={course.thumbnail} alt={course.name} />
                </a>
              ) : (
                <div
                  className="default-image"
                  style={{
                    backgroundColor: `hsl(${Math.random() * 360}, 70%, 80%)`,
                  }}
                >
                  <p>No Available Courses</p>
                </div>
              )}
              <h3>{course.name}</h3>
            </Link>
          ))}
        </div>
      ) : (
        <p>No Available Courses</p>
      )}

      <h2>Tasks</h2>
      {loading ? (
        <p>Loading tasks...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : tasks.length > 0 ? (
        <div className="task-container">
          {tasks.map((task) => (
            <div key={task.id} className="task-card">
              {task.dropboxLink && (
                <a
                  href={task.dropboxLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <p>View Dropbox File</p>
                </a>
              )}
              <p>{task.message}</p>
              <p>
                Assigned to:{" "}
                {task.assignedEmails && task.assignedEmails.length > 0
                  ? task.assignedEmails.join(", ")
                  : "No one assigned"}
              </p>
              <p>Created by: {task.createdBy}</p>
              <p>Date: {new Date(task.createdAt).toLocaleString()}</p>
              <button onClick={() => endTask(task.id)}>End Task</button>
            </div>
          ))}
        </div>
      ) : (
        <p>No Tasks Available</p>
      )}
    </div>
  );
};

export default WelcomePage;
