export const fontFamily = {
  regular: "Quicksand_400Regular",
  medium: "Quicksand_500Medium",
  semibold: "Quicksand_600SemiBold",
  bold: "Quicksand_700Bold",
};

export const typography = {
  fontFamily,

  sizes: {
    xs: 12,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    "2xl": 30,
    "3xl": 38,
  },

  lineHeights: {
    xs: 16,
    sm: 18,
    base: 22,
    md: 24,
    lg: 27,
    xl: 31,
    "2xl": 38,
    "3xl": 46,
  },

  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "700" as const,
  },
};