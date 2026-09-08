import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function TabLayout() {
  return (
    <div className="app-shell flex flex-col">
      <div className="flex-1 overflow-y-auto pb-4">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
