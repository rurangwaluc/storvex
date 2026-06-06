import { Pressable, StyleSheet, View } from "react-native";
import { Href, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { bottomNavItems, filterNavItemsByRole } from "../../constants/appNav";
import { useAuthStore } from "../../store/authStore";
import { AppText } from "../ui/AppText";

type AppBottomNavProps = {
  palette: {
    text: string;
    soft: string;
    cyan: string;
    panel: string;
    border: string;
  };
};

function cleanPath(value: string) {
  const stripped = value.replace(/\/\([^/]+\)/g, "").replace(/\/+/g, "/");
  return stripped.endsWith("/") && stripped !== "/" ? stripped.slice(0, -1) : stripped;
}

function isActive(pathname: string, href: string) {
  const current = cleanPath(pathname);
  const target = cleanPath(href);

  if (target === "/dashboard") return current.includes("/dashboard");
  if (target === "/sales") return current.includes("/sales") || current.includes("/pos");
  if (target === "/stock") return current.includes("/stock") || current.includes("/inventory");
  if (target === "/people") return current.includes("/people") || current.includes("/customers");
  if (target === "/more") return current.includes("/more");

  return current === target || current.startsWith(`${target}/`);
}

export function AppBottomNav({ palette }: AppBottomNavProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const effectiveRole = user?.role || "OWNER";
  const items = filterNavItemsByRole(bottomNavItems, effectiveRole);

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.href as Href)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: active ? "rgba(32, 200, 255, 0.16)" : "transparent",
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={item.icon}
                size={active ? 21 : 20}
                color={active ? palette.cyan : palette.soft}
              />
            </View>

            <AppText
              variant="caption"
              color={active ? palette.cyan : palette.soft}
              style={[styles.label, active ? styles.activeLabel : null]}
              numberOfLines={1}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
  },

  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 3,
  },

  iconWrap: {
    height: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    maxWidth: "100%",
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.1,
    textAlign: "center",
  },

  activeLabel: {
    fontFamily: "Quicksand_800ExtraBold",
  },
});
