import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  type Location,
} from "react-router-dom";
import { RequireRole } from "./components/RequireRole";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { CustomerHome } from "./pages/CustomerHome";
import { TechnicianHome } from "./pages/TechnicianHome";
import { AdminHome } from "./pages/AdminHome";
import { Signup } from "./pages/TechnicianRegister";

/**
 * Single app, role-based routing. The same PWA renders Customer, Technician,
 * or Admin experiences based on the authenticated user's role.
 */
export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/technician/register" element={<Signup />} />

        <Route
          path="/customer"
          element={
            <RequireRole allow={["CUSTOMER"]}>
              <CustomerHome />
            </RequireRole>
          }
        />
        <Route
          path="/technician"
          element={
            <RequireRole allow={["TECHNICIAN"]}>
              <TechnicianHome />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole allow={["ADMIN"]}>
              <AdminHome />
            </RequireRole>
          }
        />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route
            path="/login"
            element={<Login modal onClose={() => navigate(-1)} />}
          />
          <Route
            path="/signup"
            element={<Signup modal onClose={() => navigate(-1)} />}
          />
        </Routes>
      )}
    </>
  );
}
