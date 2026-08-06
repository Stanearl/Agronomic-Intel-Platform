import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingPage from "./views/LandingPage";
import Dashboard from "./views/Dashboard";
import PageTransition from "./components/PageTransition";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <LandingPage />
            </PageTransition>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PageTransition>
              <Dashboard />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen overflow-hidden bg-background font-sans text-foreground">
        <AnimatedRoutes />
      </div>
    </BrowserRouter>
  );
}
