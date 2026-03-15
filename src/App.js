import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login          from "./pages/Login";
import Register       from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard      from "./pages/Dashboard";
import Exercises      from "./pages/Exercises";
import ExerciseSession from "./pages/ExerciseSession";
import Motivation     from "./pages/Motivation";
import Routine        from "./pages/Routine";
import Summary        from "./pages/Summary";
import Chatbot        from "./pages/Chatbot";
import Profile        from "./pages/Profile";
import Feedback       from "./pages/Feedback";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/"        element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot"   element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/chatbot"   element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
        <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
        <Route path="/exercise/:id" element={<ProtectedRoute><ExerciseSession /></ProtectedRoute>} />
        <Route path="/motivation"   element={<ProtectedRoute><Motivation /></ProtectedRoute>} />
        <Route path="/routine"      element={<ProtectedRoute><Routine /></ProtectedRoute>} />
        <Route path="/summary"      element={<ProtectedRoute><Summary /></ProtectedRoute>} />
        <Route path="/feedback"     element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;