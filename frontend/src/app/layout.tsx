import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Цифровая система мониторинга воздухоочистителя | КазНИТУ им. Сатпаева",
  description: "Мониторинг микроклимата, учет ресурса фильтра и дистанционное управление прибором очистки воздуха",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}
