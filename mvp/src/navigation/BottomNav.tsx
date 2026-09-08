import { NavLink } from "react-router-dom";
import { ROUTES } from "./routes";

const TABS = [
  { to: ROUTES.home, label: "Home", icon: "🏠" },
  { to: ROUTES.upload, label: "Analyze", icon: "✨" },
  { to: ROUTES.plan, label: "Plan", icon: "📋" },
  { to: ROUTES.progress, label: "Progress", icon: "📈" },
];

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-black/[0.05] bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur">
      <div className="flex items-center justify-around">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              [
                "flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition",
                isActive ? "text-blush-deep" : "text-ink-soft/70",
              ].join(" ")
            }
          >
            <span className="text-[19px] leading-none">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
