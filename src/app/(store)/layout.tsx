import SiteHeader from "@/components/jewellery/layout/SiteHeader";
import SiteFooter from "@/components/jewellery/layout/SiteFooter";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#main-content" className="j-skip-link">Skip to main content</a>
      <SiteHeader />
      <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
      <SiteFooter />
    </div>
  );
}
