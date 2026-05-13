/** @type {import('tailwindcss').Config} */
import theme from './src/styles/theme.js'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
        accent: theme.colors.accent,
        warning: theme.colors.warning,
        danger: theme.colors.danger,
        background: theme.colors.background,
        surface: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
      },
      backgroundImage: {
        'gradient-primary': theme.gradients.primary,
        'gradient-secondary': theme.gradients.secondary,
        'gradient-accent': theme.gradients.accent,
        'gradient-glass': theme.gradients.glass,
      },
      boxShadow: {
        sm: theme.shadows.sm,
        md: theme.shadows.md,
        lg: theme.shadows.lg,
        xl: theme.shadows.xl,
        glow: theme.shadows.glow,
      },
      borderRadius: {
        sm: theme.borderRadius.sm,
        md: theme.borderRadius.md,
        lg: theme.borderRadius.lg,
        xl: theme.borderRadius.xl,
        full: theme.borderRadius.full,
      },
      spacing: {
        xs: theme.spacing.xs,
        sm: theme.spacing.sm,
        md: theme.spacing.md,
        lg: theme.spacing.lg,
        xl: theme.spacing.xl,
      },
      fontSize: {
        xs: theme.fontSize.xs,
        sm: theme.fontSize.sm,
        base: theme.fontSize.base,
        lg: theme.fontSize.lg,
        xl: theme.fontSize.xl,
        '2xl': theme.fontSize['2xl'],
        '3xl': theme.fontSize['3xl'],
      },
      fontWeight: {
        normal: theme.fontWeight.normal,
        medium: theme.fontWeight.medium,
        semibold: theme.fontWeight.semibold,
        bold: theme.fontWeight.bold,
      },
      transitionDuration: {
        fast: '150ms',
        base: '300ms',
        slow: '500ms',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
      zIndex: {
        base: theme.zIndex.base,
        dropdown: theme.zIndex.dropdown,
        sticky: theme.zIndex.sticky,
        fixed: theme.zIndex.fixed,
        modal: theme.zIndex.modal,
        popover: theme.zIndex.popover,
        tooltip: theme.zIndex.tooltip,
      },
    },
  },
  plugins: [],
}
