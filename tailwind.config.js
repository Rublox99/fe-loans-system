import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        accent: "var(--accent)",
        neutral: "var(--neutral)",
        help: "var(--help)",
        lowContrast: "var(--low-contrast)",
        highContrast: "var(--high-contrast)",
        success: "var(--success)",
        error: "var(--error)",
        warning: "var(--warning)",
        lightGray: "var(--light-gray)",
        standardGray: "var(--standard-gray)",
        darkGray: "var(--dark-gray)",
        staticWhite: "var(--static-white)",
        staticBlack: "var(--static-black)",
      },
      fontFamily: {
        sans: ['Manrope', ...defaultTheme.fontFamily.sans],
        roboto: ['Roboto', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}

