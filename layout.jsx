import "./globals.css";

export const metadata = {
  title: "Bac Bo Tie Bot",
  description: "Bot manual para análise de empates em Bac Bo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
