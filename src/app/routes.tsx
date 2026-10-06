import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { PageFallback } from "./routeFallback";

// Root stays eager (it's the always-present shell). Every page is code-split so the
// homepage no longer ships the dashboard, booking flow, counter, admin, Leaflet and
// Recharts in its first-load bundle. Named exports → remap to `default` for React.lazy.
const BrowseCafes = lazy(() => import("./components/BrowseCafes").then((m) => ({ default: m.BrowseCafes })));
const DbCafeDetails = lazy(() => import("./components/DbCafeDetails").then((m) => ({ default: m.DbCafeDetails })));
const Login = lazy(() => import("./components/Login").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("./components/Signup").then((m) => ({ default: m.Signup })));
const BookingConfirm = lazy(() => import("./components/BookingConfirm").then((m) => ({ default: m.BookingConfirm })));
const Dashboard = lazy(() => import("./components/Dashboard").then((m) => ({ default: m.Dashboard })));
const AdminApprovals = lazy(() => import("./components/AdminApprovals").then((m) => ({ default: m.AdminApprovals })));
const MyBookings = lazy(() => import("./components/MyBookings").then((m) => ({ default: m.MyBookings })));
const CounterPage = lazy(() => import("./components/CounterPage").then((m) => ({ default: m.CounterPage })));
const NotFound = lazy(() => import("./components/NotFound").then((m) => ({ default: m.NotFound })));

// The Root-child routes render inside Root's own <Suspense> (around its <Outlet>).
// The standalone routes below have no shared parent, so each wraps its own boundary.
const standalone = (el: React.ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>;

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: BrowseCafes },
      { path: "cafe/db/:id", Component: DbCafeDetails },
      { path: "my-bookings", Component: MyBookings },
      { path: "counter", Component: CounterPage },
      { path: "*", Component: NotFound },
    ],
  },
  { path: "/login", element: standalone(<Login />) },
  { path: "/signup", element: standalone(<Signup />) },
  { path: "booking/confirm", element: standalone(<BookingConfirm />) },
  { path: "/dashboard", element: standalone(<Dashboard />) },
  { path: "/admin", element: standalone(<AdminApprovals />) },
]);
