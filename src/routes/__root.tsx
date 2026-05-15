import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { UserProvider } from "@/contexts/UserContext";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gold">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Prime House CRM" },
      { name: "description", content: "CRM imobiliário Prime House" },
      { property: "og:title", content: "Prime House CRM" },
      { name: "twitter:title", content: "Prime House CRM" },
      { property: "og:description", content: "CRM imobiliário Prime House" },
      { name: "twitter:description", content: "CRM imobiliário Prime House" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d8f41c25-6fb5-4f5f-95f4-56b33227187d/id-preview-0a6bde04--79764946-a702-48d4-9cf9-fc4a4babd951.lovable.app-1778871898261.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d8f41c25-6fb5-4f5f-95f4-56b33227187d/id-preview-0a6bde04--79764946-a702-48d4-9cf9-fc4a4babd951.lovable.app-1778871898261.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <UserProvider>
      <Outlet />
      <Toaster position="top-right" theme="dark" richColors closeButton />
    </UserProvider>
  );
}
