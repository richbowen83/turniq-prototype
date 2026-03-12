export const metadata = {
  title: 'TurnIQ Prototype',
  description: 'AI-powered turn operations prototype',
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
