import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { BrowseCafes } from "./components/BrowseCafes";
import { DbCafeDetails } from "./components/DbCafeDetails";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { BookingConfirm } from "./components/BookingConfirm";
import { Dashboard } from "./components/Dashboard";
import { AdminApprovals } from "./components/AdminApprovals";
import { MyBookings } from "./components/MyBookings";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: BrowseCafes },
      { path: "cafe/db/:id", Component: DbCafeDetails },
      { path: "my-bookings", Component: MyBookings },
      { path: "*", Component: NotFound },
    ],
  },
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
  { path: "booking/confirm", Component: BookingConfirm },
  { path: "/dashboard", Component: Dashboard },
  { path: "/admin", Component: AdminApprovals },
]);
