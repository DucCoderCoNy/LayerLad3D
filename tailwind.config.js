/** Bảng màu & font của toàn site – sửa tại đây để đổi giao diện */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0a0c0f', 900: '#101318', 800: '#171b22', 700: '#242a34' },
        accent: { DEFAULT: '#ff6a13', soft: '#ff8c45' },
        neon: '#2ee6c5',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Be Vietnam Pro"', 'sans-serif'],
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
