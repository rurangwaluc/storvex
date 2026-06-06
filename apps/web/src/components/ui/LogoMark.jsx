// frontend-stores/src/components/ui/LogoMark.jsx
import { useTheme } from "../../hooks/useTheme";

const LIGHT_LOGO_SRC = "/storvex_dark.webp"; // for dark mode
const DARK_LOGO_SRC = "/storvex_white.webp";   // for light mode

export default function LogoMark({ compact = false }) {
  const { isDark } = useTheme();

  // Choose logo based on current theme
  const logoSrc = isDark ? LIGHT_LOGO_SRC : DARK_LOGO_SRC;

  return (
    <div className="inline-flex items-center">
      <img
        src={logoSrc}
        alt="Storvex"
        className={
          compact
            ? "h-16 w-auto object-contain sm:h-18 lg:h-20"
            : "h-20 w-auto object-contain sm:h-[80px] lg:h-[96px]"
        }
        draggable="false"
      />
    </div>
  );
}