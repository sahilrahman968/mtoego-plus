import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="min-w-0 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
