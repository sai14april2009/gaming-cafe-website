import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { BrowseCafes } from "./components/BrowseCafes";
import { SearchByGame } from "./components/SearchByGame";
import { FilterByHardware } from "./components/FilterByHardware";
import { CafeDetails } from "./components/CafeDetails";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: BrowseCafes },
      { path: "games", Component: SearchByGame },
      { path: "hardware", Component: FilterByHardware },
      { path: "cafe/:id", Component: CafeDetails },
    ],
  },
]);
