import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ReactComponent as Logo } from "../photos/edecs logo white.svg";

import "./ResetPasswordPage.css";

const ResetPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPassword(email);
      setMessage("Password reset instructions have been sent to your email.");
    } catch (error) {
      setMessage("An error occurred: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <nav className="navbar">
        <Logo className="navbar-logo" />
      </nav>
      <div className="login-page">
        <h2>Reset Password</h2>
        <form onSubmit={handleResetPassword}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "Reset Password"}
          </button>
        </form>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
