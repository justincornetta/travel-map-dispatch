import Link from "next/link";

// Lightweight footer used on pages that render with the standard AppHeader chrome.
// The 222-style city feed page (/stops/[slug]) intentionally does not include it
// because that page has its own immersive sticky footer.

export function AppFooter() {
  return (
    <footer className="mt-12 border-t border-stone-200 bg-[#fbfaf6]/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-stone-600 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <p>© {new Date().getFullYear()} Justin Cornetta · Travel Map Dispatch</p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="hover:text-stone-950">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-stone-950">
            Terms
          </Link>
          <Link href="/subscribe" className="hover:text-stone-950">
            Text updates
          </Link>
        </nav>
      </div>
    </footer>
  );
}
