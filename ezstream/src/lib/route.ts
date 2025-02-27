import { useRouter, usePathname } from "next/navigation";

const myRouter = () => {
  const router = useRouter();
  const pathname = usePathname();

  const redirect = (path: string) => {
    if (pathname === path) {
      return;
    }

    // Find the content to blur (either main or the root div)
    const mainContent =
      document.querySelector("main") ||
      document.querySelector("#__next") ||
      document.querySelector("body > div");

    // Create a transition overlay
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0)";
    overlay.style.backdropFilter = "blur(0px)";
    overlay.style.transition = "all 0.8s ease-in-out";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "40";
    document.body.appendChild(overlay);

    // Trigger the transition
    requestAnimationFrame(() => {
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
      overlay.style.backdropFilter = "blur(12px)";

      setTimeout(() => {
        router.push(path);

        // Clean up overlay after navigation
        setTimeout(() => {
          overlay.style.backgroundColor = "rgba(0, 0, 0, 0)";
          overlay.style.backdropFilter = "blur(0px)";

          setTimeout(() => {
            document.body.removeChild(overlay);
          }, 800);
        }, 200);
      }, 500);
    });
  };

  return redirect;
};

export default myRouter;
