import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our custom font sizes (text-body, text-btn, ...) would otherwise be read as
// text colors, and merging would drop e.g. text-background from <Button>.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["mega", "h1", "h2", "h3", "h4", "title", "body-lg", "body", "body-sm", "btn", "tag", "small"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
