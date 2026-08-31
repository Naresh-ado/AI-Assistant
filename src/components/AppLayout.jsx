import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BrainCircuit, LayoutDashboard, BookOpen, CalendarRange, Timer, ListChecks, LifeBuoy, Sparkles, Settings, LogOut } from "lucide-react";
import { apiClient as base44 } from "@/api/apiClient";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/plans", label: "Plans", icon: CalendarRange },
  { to: "/study", label: "Study", icon: Timer },
  { to: "/workload", label: "Workload", icon: ListChecks },
  { to: "/rescue", label: "Rescue", icon: LifeBuoy },
  { to: "/companion", label: "Companion", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function AppLayout() {
  const navigate = useNavigate();
  const [checkingProfile, setCheckingProfile] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await base44.auth.me();
        if (user?.id) {
          const pList = await base44.entities.StudentProfile.filter({ created_by_id: user.id }, "-created_date", 1);
          const prof = pList?.[0];
          if (!prof || (!prof.calibration_complete && !prof.onboarding_complete)) {
            if (isMounted) navigate("/onboarding", { replace: true });
            return;
          }
        }
      } catch (e) {
        console.error("Profile check error:", e);
      } finally {
        if (isMounted) setCheckingProfile(false);
      }
    })();
    return () => { isMounted = false; };
  }, [navigate]);

  const logout = async () => { await base44.auth.logout(); navigate("/login"); };

  if (checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white lg:flex selection:bg-white selection:text-black">
      {/* Desktop Sidebar with thin white border */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/15 bg-black px-4 py-6 lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-white/15 text-white shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold leading-tight tracking-wider uppercase block text-white">AI Academic</span>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wide">Copilot & Companion</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex flex-1 flex-col gap-1.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition duration-150 border ${
                  isActive
                    ? "bg-zinc-900 text-white border-white/30 shadow-md shadow-white/5"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-950 border-transparent hover:border-white/15"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sign out button */}
        <button
          onClick={logout}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-400 hover:text-rose-300 hover:bg-zinc-950 border border-transparent hover:border-rose-500/30 transition duration-150"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {/* Mobile Navbar with thin white border */}
        <div className="sticky top-0 z-30 flex items-center gap-1.5 overflow-x-auto border-b border-white/15 bg-black/90 backdrop-blur-md px-3 py-2.5 lg:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition ${
                  isActive
                    ? "bg-zinc-900 text-white border-white/30"
                    : "text-zinc-400 hover:text-white border-transparent hover:border-white/15"
                }`
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}