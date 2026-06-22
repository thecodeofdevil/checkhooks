module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 25px 80px rgba(59, 130, 246, 0.15)",
      },
      backgroundImage: {
        gradientRadial: "radial-gradient(circle at top, rgba(59,130,246,0.25), transparent 36%), radial-gradient(circle at bottom right, rgba(249,115,22,0.18), transparent 22%)",
      },
    },
  },
  plugins: [],
};
