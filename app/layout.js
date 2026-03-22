export const metadata = {
  title: "TurnIQ",
  description: "AI-powered turn operations",
  icons: {
    icon: "/icon.ico",
  },
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}