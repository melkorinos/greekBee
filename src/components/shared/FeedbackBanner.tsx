// FeedbackBanner — shared toast-style feedback banner.
// Used by Wordle (dark theme) and Connections (light theme).

interface FeedbackBannerProps {
  message:  string | null;
  variant?: "neutral" | "success" | "error";
  theme?:   "light" | "dark";
}

const CLASSES: Record<"light" | "dark", Record<"neutral" | "success" | "error", string>> = {
  light: {
    neutral: "bg-stone-200 text-stone-800",
    success: "bg-green-100 text-green-800",
    error:   "bg-red-100   text-red-800",
  },
  dark: {
    neutral: "bg-stone-700 text-stone-100",
    success: "bg-green-900 text-green-100",
    error:   "bg-red-900   text-red-100",
  },
};

export function FeedbackBanner({
  message,
  variant = "neutral",
  theme   = "light",
}: FeedbackBannerProps) {
  if (!message) return null;

  return (
    <p
      className={[
        "px-4 py-1 rounded text-sm font-medium",
        CLASSES[theme][variant],
      ].join(" ")}
      role="alert"
    >
      {message}
    </p>
  );
}
