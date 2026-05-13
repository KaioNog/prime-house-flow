import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Kanban, Building2, Settings, LogOut, Menu, X, Send, Mail } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Home", icon: Home, roles: ["corretor", "gestor"] as const },
  { to: "/crm", label: "CRM", icon: Kanban, roles: ["corretor", "gestor"] as const },
  {
    to: "/empreendimentos",
    label: "Empreendimentos",
    icon: Building2,
    roles: ["corretor", "gestor"] as const,
  },
  { to: "/config", label: "Configurações", icon: Settings, roles: ["gestor"] as const },
  { to: "/disparos", label: "Disparos", icon: Send, roles: ["gestor"] as const },
  { to: "/followup", label: "Follow-up", icon: Mail, roles: ["gestor"] as const },
];

export function AppSidebar() {
  const { user, signOut } = useUser();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;
  const visible = items.filter((i) => (i.roles as readonly string[]).includes(user.role));
  const initial = user.nome?.charAt(0).toUpperCase() ?? "?";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        {!collapsed && (
          <div>
            <p className="font-display text-lg font-bold text-gold">Prime House</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CRM</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:inline-flex"
          aria-label="Colapsar menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          onClick={() => setOpen(false)}
          className="inline-flex rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {visible.map((item) => {
          const active = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-primary/15 text-gold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-gold")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.nome}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {user.role}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-foreground hover:bg-accent"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="font-display text-base font-bold text-gold">Prime House</p>
        <div className="w-9" />
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar text-sidebar-foreground shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all lg:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
