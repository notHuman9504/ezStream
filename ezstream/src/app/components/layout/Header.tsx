"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, Phone, LogIn, LogOut, User, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import myRouter from "@/lib/route";
import { useDispatch } from "react-redux";
import { setEmail } from "@/redux/user/userSlice";

interface NavItem {
  name: string;
  url: string;
  icon: React.ElementType;
}

export default function Header() {
  const pathname = usePathname();
  const redirect = myRouter();
  const dispatch = useDispatch();
  const userEmail = useSelector((state: RootState) => state.user.email);
  const [isMobile, setIsMobile] = useState(false);

  const navItems: NavItem[] = [
    { name: "Home", url: "/", icon: Home },
    { name: "About", url: "/about", icon: User },
    { name: "Call", url: "/call", icon: Phone },
    ...(userEmail
      ? [{ name: "Logout", url: "#", icon: LogOut }]
      : [
          {
            name: pathname === "/signup" ? "Sign Up" : "Sign In",
            url: pathname === "/signup" ? "/signup" : "/signin",
            icon: LogIn,
          },
        ]),
  ];

  const [activeTab, setActiveTab] = useState(
    navItems.find((item) => item.url === pathname)?.name || navItems[0].name
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const currentItem = navItems.find((item) => item.url === pathname);
    if (currentItem) {
      setActiveTab(currentItem.name);
    }
  }, [pathname]);

  const handleClick = (item: NavItem) => {
    if (item.name === "Logout") {
      localStorage.removeItem("token");
      dispatch(setEmail(""));
      redirect("/");
    } else {
      setActiveTab(item.name);
      redirect(item.url);
    }
  };

  const getButtonStyles = (item: NavItem) => {
    if (item.name === "Logout") {
      return "text-red-400/70 hover:text-red-400 hover:bg-red-400/10";
    }
    if (item.name === "Sign In" || item.name === "Sign Up") {
      return "text-green-400/70 hover:text-green-400 hover:bg-green-400/10";
    }
    return "text-white/80 hover:text-white";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center py-4 pointer-events-none">
      <div className="flex flex-col sm:flex-row items-center gap-4 w-fit pointer-events-auto">
        {/* Navigation Items */}
        <div className="w-full flex items-center gap-3 bg-black/50 border border-zinc-800 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg pointer-events-auto">
          {/* Add ezStream logo */}
          <div className="flex items-center gap-2 px-6 py-2 text-white group">
            <Camera
              size={18}
              strokeWidth={2.5}
              className="text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]"
            />
            <span className="hidden md:inline font-bold text-sm tracking-wide drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]">
              ezStream
            </span>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-white/5 rounded-full blur-md" />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-zinc-800/50" />

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            return (
              <button
                key={item.name}
                onClick={() => handleClick(item)}
                className={cn(
                  "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                  getButtonStyles(item),
                  isActive &&
                    item.name === "Logout" &&
                    "bg-red-500/10 text-red-400",
                  isActive &&
                    (item.name === "Sign In" || item.name === "Sign Up") &&
                    "bg-green-500/10 text-green-400",
                  isActive &&
                    !["Logout", "Sign In", "Sign Up"].includes(item.name) &&
                    "bg-white/10 text-white"
                )}
              >
                <span className="hidden md:inline">{item.name}</span>
                <span className="md:hidden">
                  <Icon size={18} strokeWidth={2.5} />
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-lamp"
                    className={cn(
                      "absolute inset-0 w-full rounded-full -z-10",
                      item.name === "Logout" && "bg-red-400/5",
                      (item.name === "Sign In" || item.name === "Sign Up") &&
                        "bg-green-400/5",
                      !["Logout", "Sign In", "Sign Up"].includes(item.name) &&
                        "bg-white/5"
                    )}
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <div
                      className={cn(
                        "absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-t-full",
                        item.name === "Logout" && "bg-red-400",
                        (item.name === "Sign In" || item.name === "Sign Up") &&
                          "bg-green-400",
                        !["Logout", "Sign In", "Sign Up"].includes(item.name) &&
                          "bg-white"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute w-12 h-6 rounded-full blur-md -top-2 -left-2",
                          item.name === "Logout" && "bg-red-400/20",
                          (item.name === "Sign In" ||
                            item.name === "Sign Up") &&
                            "bg-green-400/20",
                          !["Logout", "Sign In", "Sign Up"].includes(
                            item.name
                          ) && "bg-white/20"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute w-8 h-6 rounded-full blur-md -top-1",
                          item.name === "Logout" && "bg-red-400/20",
                          (item.name === "Sign In" ||
                            item.name === "Sign Up") &&
                            "bg-green-400/20",
                          !["Logout", "Sign In", "Sign Up"].includes(
                            item.name
                          ) && "bg-white/20"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute w-4 h-4 rounded-full blur-sm top-0 left-2",
                          item.name === "Logout" && "bg-red-400/20",
                          (item.name === "Sign In" ||
                            item.name === "Sign Up") &&
                            "bg-green-400/20",
                          !["Logout", "Sign In", "Sign Up"].includes(
                            item.name
                          ) && "bg-white/20"
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>

        {/* Email Bubble */}
        {userEmail && (
          <div className="w-full sm:w-auto flex items-center bg-black/50 border border-zinc-800 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg pointer-events-auto">
            <div
              className={cn(
                "relative text-sm font-semibold px-6 py-2 rounded-full w-full text-center",
                "text-white/80 bg-white/10"
              )}
            >
              <span className="inline-block">{userEmail}</span>
              <motion.div
                layoutId="email-lamp"
                className="absolute inset-0 w-full bg-white/5 rounded-full -z-10"
                initial={false}
                animate={{ opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-t-full">
                  <div className="absolute w-12 h-6 bg-white/20 rounded-full blur-md -top-2 -left-2" />
                  <div className="absolute w-8 h-6 bg-white/20 rounded-full blur-md -top-1" />
                  <div className="absolute w-4 h-4 bg-white/20 rounded-full blur-sm top-0 left-2" />
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
