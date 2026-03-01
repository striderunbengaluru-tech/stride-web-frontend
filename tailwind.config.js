/** @type {import('tailwindcss').Config} */
// NOTE: In Tailwind v4, custom colors and font tokens are defined via @theme in
// src/app/globals.css — not here. This file exists for content glob patterns and plugins.
//
// Brand color reference (defined in @theme):
//   stride-yellow-accent:  #E1D03F  → bg-stride-yellow-accent, text-stride-yellow-accent
//   stride-purple-primary: #4B2862  → bg-stride-purple-primary, text-stride-purple-primary
//   stride-bg:             #e8e8cf  → bg-stride-bg
//   copy-white:            #ffffff  → text-copy-white, bg-copy-white
//   copy-black:            #010101  → text-copy-black, bg-copy-black
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  plugins: [],
};
