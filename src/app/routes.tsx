import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { BrowseCafes } from "./components/BrowseCafes";
import { SearchByGame } from "./components/SearchByGame";
import { FilterByHardware } from "./components/FilterByHardware";
import { CafeDetails } from "./components/CafeDetails";
import { DbCafeDetails } from "./components/DbCafeDetails";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { BookingConfirm } from "./components/BookingConfirm";
import { Dashboard } from "./components/Dashboard";
import { AdminApprovals } from "./components/AdminApprovals";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: BrowseCafes },
      { path: "games", Component: SearchByGame },
      { path: "hardware", Component: FilterByHardware },
      { path: "cafe/db/:id", Component: DbCafeDetails },
      { path: "cafe/:id", Component: CafeDetails },
    ],
  },
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
{ path: "booking/confirm", Component: BookingConfirm },
{ path: "/dashboard", Component: Dashboard },
{ path: "/admin", Component: AdminApprovals },
]);
