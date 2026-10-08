"use client"

import myRouter from "@/lib/route";
import { Logo } from "@/components/brand/Logo";

const productLinks = [
  { label: "Studio", url: "/call" },
  { label: "Create account", url: "/signup" },
  { label: "Sign in", url: "/signin" },
];

const legalLinks = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy", href: "#" },
];

const Footer = () => {
  const redirect = myRouter();

  return (
    <footer className="shell pb-4 sm:pb-6">
      <div className="overflow-hidden rounded-card bg-surface">
        <div className="grid gap-12 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:gap-24">
          <div>
            <Logo
              className="gap-3"
              markClassName="size-10 sm:size-12"
              wordmarkClassName="text-[2.5rem] sm:text-[3.25rem] tracking-[-0.04em]"
            />
            <p className="mt-5 max-w-sm text-body-sm text-fg-50">
              Live production in a browser tab. Rooms, overlays and RTMP output, nothing to install.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-8 sm:grid-cols-3">
            <ul className="flex flex-col gap-2">
              {productLinks.map(link => (
                <li key={link.url}>
                  <button
                    onClick={() => redirect(link.url)}
                    className="text-body-sm text-fg transition-colors hover:text-fg-50"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-2">
              {legalLinks.map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-small text-fg-50 transition-colors hover:text-fg">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-2">
              <li>
                <a
                  href="https://github.com/notHuman9504/ezStream"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-small text-fg-50 transition-colors hover:text-fg"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 text-small text-fg-50 sm:flex-row sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} ezStream. All rights reserved.</p>
          <p>Streams to YouTube, Twitch and any RTMP endpoint.</p>
        </div>

        <div
          aria-hidden
          className="dots mx-6 mb-6 h-40 [mask-image:linear-gradient(to_bottom,black_30%,transparent)] sm:mx-8 sm:h-56"
        />
      </div>
    </footer>
  );
};

export default Footer;
