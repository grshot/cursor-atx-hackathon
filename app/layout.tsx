import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scout",
  description: "Agentic graph search — one query, six agents, one graph.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
