/**
 * VitalLink Color System
 * Designed for emergency response app with calm, trustworthy aesthetic
 */

const tintColorLight = "#2c5aa0";
const tintColorDark = "#4f83cc";

export const Colors = {
  light: {
    // Primary colors
    text: "#1e293b",
    background: "#f8fafe",
    tint: tintColorLight,
    tabIconDefault: "#64748b",
    tabIconSelected: tintColorLight,

    // VitalLink brand colors
    primary: "#2c5aa0", // Trustworthy blue
    secondary: "#64748b", // Neutral gray
    accent: "#0ea5e9", // Info blue

    // Functional colors
    success: "#16a34a", // Medical green
    warning: "#f59e0b", // Caution amber
    error: "#dc2626", // Emergency red
    info: "#0ea5e9", // Information blue

    // Surface colors
    surface: "#ffffff", // Card backgrounds
    surfaceVariant: "#f1f5f9", // Alternative surfaces

    // Border colors
    border: "#e2e8f0", // Default borders
    borderFocus: "#2c5aa0", // Focused inputs

    // Text variants
    textSecondary: "#64748b", // Secondary text
    textTertiary: "#94a3b8", // Tertiary text
    textInverse: "#ffffff", // Text on dark backgrounds

    // Emergency colors
    emergencyPrimary: "#dc2626", // Main emergency red
    emergencyBackground: "#fef2f2", // Emergency background
    emergencyBorder: "#fecaca", // Emergency borders

    // Medical profile colors
    medicalPrimary: "#16a34a", // Medical green
    medicalBackground: "#f0fdf4", // Medical background
    medicalBorder: "#bbf7d0", // Medical borders

    // AI Assistant colors
    aiPrimary: "#7c3aed", // AI purple
    aiBackground: "#faf5ff", // AI background
    aiBorder: "#e9d5ff", // AI borders
  },
  dark: {
    // Primary colors
    text: "#f8fafc",
    background: "#0f172a",
    tint: tintColorDark,
    tabIconDefault: "#64748b",
    tabIconSelected: tintColorDark,

    // VitalLink brand colors
    primary: "#4f83cc", // Lighter trustworthy blue for dark mode
    secondary: "#94a3b8", // Lighter neutral gray
    accent: "#38bdf8", // Lighter info blue

    // Functional colors
    success: "#22c55e", // Lighter medical green
    warning: "#fbbf24", // Lighter caution amber
    error: "#ef4444", // Lighter emergency red
    info: "#38bdf8", // Lighter information blue

    // Surface colors
    surface: "#1e293b", // Card backgrounds
    surfaceVariant: "#334155", // Alternative surfaces

    // Border colors
    border: "#334155", // Default borders
    borderFocus: "#4f83cc", // Focused inputs

    // Text variants
    textSecondary: "#94a3b8", // Secondary text
    textTertiary: "#64748b", // Tertiary text
    textInverse: "#0f172a", // Text on light backgrounds

    // Emergency colors
    emergencyPrimary: "#ef4444", // Lighter emergency red
    emergencyBackground: "#450a0a", // Dark emergency background
    emergencyBorder: "#991b1b", // Dark emergency borders

    // Medical profile colors
    medicalPrimary: "#22c55e", // Lighter medical green
    medicalBackground: "#052e16", // Dark medical background
    medicalBorder: "#166534", // Dark medical borders

    // AI Assistant colors
    aiPrimary: "#a855f7", // Lighter AI purple
    aiBackground: "#2e1065", // Dark AI background
    aiBorder: "#6b21a8", // Dark AI borders
  },
};

// Utility function to get colors based on color scheme
export const getThemeColors = (colorScheme: "light" | "dark" | null) => {
  return Colors[colorScheme ?? "light"];
};

// Emergency-specific color palette
export const EmergencyColors = {
  critical: "#dc2626", // Critical emergency
  urgent: "#ea580c", // Urgent attention
  warning: "#f59e0b", // Warning state
  safe: "#16a34a", // Safe/resolved state
  info: "#0ea5e9", // Information state
};

// Medical condition severity colors
export const MedicalColors = {
  severe: "#dc2626", // Severe conditions
  moderate: "#f59e0b", // Moderate conditions
  mild: "#22c55e", // Mild conditions
  stable: "#16a34a", // Stable conditions
  unknown: "#64748b", // Unknown severity
};

// Accessibility helpers
export const AccessibilityColors = {
  focusRing: "#2c5aa0", // Focus indicator
  highContrast: "#000000", // High contrast text
  highContrastBg: "#ffffff", // High contrast background
  errorText: "#991b1b", // Error text for accessibility
  successText: "#166534", // Success text for accessibility
};
