import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { NamespaceProvider } from "./context/NamespaceContext";
import { Dashboard } from "./pages/Dashboard";
import { About } from "./pages/About";
import "./index.css";

function App() {
  return (
    <ThemeProvider>
      <NamespaceProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Router>
      </NamespaceProvider>
    </ThemeProvider>
  );
}

export default App;
