import { Link } from "react-router-dom";

const navItems = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Resources", href: "/#resources" },
];

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e8edf6] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center" aria-label="Storvex home">
          <img
            src="/storvex_dark.webp"
            alt="Storvex"
            className="h-[34px] w-auto object-contain sm:h-[38px]"
          />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[13px] font-black text-[#07142f] transition hover:text-[#0066ff]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="hidden h-11 items-center justify-center rounded-[14px] px-3 text-[13px] font-black text-[#07142f] transition hover:bg-[#f4f8ff] md:inline-flex"
          >
            Log in
          </Link>

          <Link
            to="/signup"
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#0066ff] px-6 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(0,102,255,0.18)] transition hover:-translate-y-0.5 hover:bg-[#005be5]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}