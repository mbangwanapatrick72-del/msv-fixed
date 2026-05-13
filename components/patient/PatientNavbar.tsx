"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/patient/home", label: "Accueil", key: "home" },
  { href: "/patient/apropos", label: "À propos", key: "apropos" },
  { href: "/patient/services", label: "Services", key: "services" },
  { href: "/patient/fonctionnalites", label: "Fonctionnalités", key: "fonctionnalites" },
  { href: "/patient/contact", label: "Contact", key: "contact" },
];

export default function PatientNavbar({ activePage }: { activePage?: string }) {
  const pathname = usePathname();

  return (
    <nav className="pat-navbar">
      <div className="pat-nav-inner">
        <span className="pat-brand">MSV</span>
        <ul className="flex items-center gap-0 list-none flex-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              activePage === link.key || pathname === link.href;
            return (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className={`pat-nav-link${isActive ? " active" : ""}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-3 ml-auto">
          <Link href="/patient/register">
            <button className="btn-teal-filled text-sm px-5 py-2.5">
              S&apos;enregistrer Ici
            </button>
          </Link>
          <Link href="/patient/login">
            <button className="btn-teal-outline text-sm px-5 py-2.5">
              Se connecter
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
