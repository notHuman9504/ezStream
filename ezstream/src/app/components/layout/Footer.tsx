"use client"

import { Fragment } from "react";

const links = [
  { label: "terms", href: "#" },
  { label: "privacy", href: "#" },
  { label: "github", href: "https://github.com/notHuman9504/ezStream", external: true },
];

const Footer = () => (
  <footer className="shell flex flex-col items-center gap-3 py-10 text-body-sm font-medium text-fg-50 sm:flex-row sm:justify-between">
    <p>© {new Date().getFullYear()} ezstream</p>
    <nav aria-label="Footer" className="flex items-center gap-3">
      {links.map((link, i) => (
        <Fragment key={link.label}>
          {i > 0 && <span aria-hidden className="size-1 rounded-full bg-fg-30" />}
          <a
            href={link.href}
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="transition-colors hover:text-fg"
          >
            {link.label}
          </a>
        </Fragment>
      ))}
    </nav>
  </footer>
);

export default Footer;
