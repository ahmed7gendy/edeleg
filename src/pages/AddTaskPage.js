import React, { useState, useEffect } from "react";
import { ref, set, push, get } from "firebase/database";
import { db, storage } from "../firebase";
import { getAuth } from "firebase/auth";
import {
  uploadBytes,
  ref as storageRef,
  getDownloadURL,
} from "firebase/storage";
import "./AddTaskPage.css";

const AddTaskPage = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [assignedEmails, setAssignedEmails] = useState([]); // Multiple emails
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [allUsers, setAllUsers] = useState([]); // For searching users
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDepartment, setSearchDepartment] = useState(""); // New state for department search

  useEffect(() => {
    // Fetch all users to enable search
    const fetchUsers = async () => {
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        setAllUsers(Object.values(usersData));
      }
    };
    fetchUsers();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUserSelect = (email) => {
    setAssignedEmails((prev) => {
      if (prev.includes(email)) {
        return prev.filter((e) => e !== email); // Deselect if already selected
      }
      return [...prev, email]; // Add email to the list
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError("User is not authenticated.");
      setLoading(false);
      return;
    }

    if (assignedEmails.length === 0) {
      setError("Please assign the task to at least one user.");
      setLoading(false);
      return;
    }

    try {
      let fileUrl = "";

      if (file) {
        const fileRef = storageRef(storage, `tasks/${file.name}`);
        await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(fileRef);
      }

      const taskRef = ref(db, "tasks");
      const newTaskRef = push(taskRef);

      await set(newTaskRef, {
        message,
        fileUrl,
        assignedEmails, // Store as array
        createdBy: user.email,
        createdAt: new Date().toISOString(),
      });

      const notificationsRef = ref(db, "notifications");

      // Send notification to each assigned user
      assignedEmails.forEach(async (email) => {
        const newNotificationRef = push(notificationsRef);
        await set(newNotificationRef, {
          message: `New task assigned to you: ${message}`,
          fileUrl,
          assignedEmail: email,
          createdBy: user.email,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      });

      // Notification for creator
      const newCreatorNotificationRef = push(notificationsRef);
      await set(newCreatorNotificationRef, {
        message: `You have created a new task: ${message}`,
        fileUrl,
        assignedEmails: assignedEmails.join(", "), // Show all assigned users
        createdBy: user.email,
        createdAt: new Date().toISOString(),
        isRead: false,
      });

      setSuccess("Task added successfully!");
      setFile(null);
      setMessage("");
      setAssignedEmails([]);
    } catch (error) {
      setError("Error adding task: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter users by email and department
  const filteredUsers = allUsers.filter((user) => {
    const email = user.email ? user.email.toLowerCase() : "";
    const department = user.department ? user.department.toLowerCase() : "";

    return (
      email.includes(searchTerm.toLowerCase()) &&
      department.includes(searchDepartment.toLowerCase())
    );
  });

  console.log("Filtered Users:", filteredUsers); // Debugging line

  return (
    <div className="add-task-container">
      <h1>Add New Task</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="file">Upload File:</label>
          <input type="file" id="file" onChange={handleFileChange} />
        </div>
        <div>
          <label htmlFor="message">Message:</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          ></textarea>
        </div>
        <div>
          <label htmlFor="search">Search by Email:</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email"
          />
        </div>
        <div>
          <label htmlFor="searchDepartment">Search by Department:</label>
          <input
            type="text"
            id="searchDepartment"
            value={searchDepartment}
            onChange={(e) => setSearchDepartment(e.target.value)}
            placeholder="Search by department"
          />
        </div>
        <div>
          <label>Select Users to Assign:</label>
          <ul>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <li key={user.email}>
                  <input
                    type="checkbox"
                    id={user.email}
                    checked={assignedEmails.includes(user.email)}
                    onChange={() => handleUserSelect(user.email)}
                  />
                  <label htmlFor={user.email}>
                    {user.email} - {user.department}
                  </label>
                </li>
              ))
            ) : (
              <li>No users found.</li>
            )}
          </ul>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Task"}
        </button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
};

export default AddTaskPage;
