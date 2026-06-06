import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CheckAuth from "@/lib/checkAuth"; 
import Home from "@/Pages/home";         
import Login from "@/Pages/login";
import Signup from "@/Pages/signup";
import Terminal from "@/Pages/dasktop";
import Logout  from "@/Pages/logOut"
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <CheckAuth protectedRoute={false}>
              <Home />
            </CheckAuth>
          }
        />
         <Route
          path="/login"
          element={
            <CheckAuth protectedRoute={false}>
              <Login />
            </CheckAuth>
          }
        />

         <Route
          path="/Signup"
          element={
            <CheckAuth protectedRoute={false}>
              <Signup />
            </CheckAuth>
          }
        />
         <Route
          path="/Terminal"
          element={
            <CheckAuth protectedRoute={true}>
              <Terminal />
            </CheckAuth>
          }
        />
         <Route
          path="/logout"
          element={
            <CheckAuth protectedRoute={true}>
              <Logout />
            </CheckAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);