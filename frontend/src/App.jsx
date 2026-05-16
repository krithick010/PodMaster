import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { NamespaceProvider } from "./context/NamespaceContext";
import { Dashboard } from "./pages/Dashboard";
import { About } from "./pages/About";
import { FloatingAIAssistant } from "./components/FloatingAIAssistant";
import "./index.css";

function App() {
  return (
    <ThemeProvider>
      <NamespaceProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen bg-base font-sans antialiased text-primary selection:bg-accent-violet/30 selection:text-white">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/about" element={<About />} />
            </Routes>
            <FloatingAIAssistant />
          </div>
        </Router>
      </NamespaceProvider>
    </ThemeProvider>
  );
}

export default App;
