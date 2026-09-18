import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GourmetAI Bistro | Multi-Agent Dining Experience",
  description: "Stateful Multi-Agent Restaurant Ordering System powered by LangGraph, Qdrant Vector RAG, and FastAPI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-artisan-cream text-artisan-charcoal antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
