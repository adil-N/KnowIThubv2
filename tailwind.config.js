module.exports = {
  darkMode: 'class', 
  content: [
    "./src/**/*.{html,js}", 
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          background: '#121212',
          text: '#e0e0e0',
          secondary: '#1e1e1e',
          accent: '#bb86fc'
        }
      }
    },
  },
  variants: {
    extend: {
      backgroundColor: ['dark'],
      textColor: ['dark'],
      borderColor: ['dark']
    }
  },
  plugins: [],
}