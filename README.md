# Advanced EMI Calculator

A sophisticated EMI (Equated Monthly Installment) calculator built with React, TypeScript, and Vite, featuring AI-powered insights via Google's Gemini API.

## 🚀 Live Demo

Visit the live application: [https://subashkanthasamy.github.io/advanced-emi-calculator](https://subashkanthasamy.github.io/advanced-emi-calculator)

## ✨ Features

- Calculate EMI for loans with various parameters
- Interactive charts and visualizations
- AI-powered financial insights
- Responsive design
- Built with modern React and TypeScript

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript
- **Build Tool:** Vite
- **Charts:** Recharts
- **AI Integration:** Google Gemini API
- **Deployment:** GitHub Pages

## 📦 Installation & Setup

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn
- Gemini API key from Google AI Studio

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/advanced-emi-calculator.git
   cd advanced-emi-calculator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

## 🚀 Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup GitHub Pages Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/advanced-emi-calculator.git
   git push -u origin main
   ```

2. **Configure GitHub Secrets:**
   - Go to your repository settings
   - Navigate to "Secrets and variables" → "Actions"
   - Add a new secret named `GEMINI_API_KEY` with your API key value

3. **Enable GitHub Pages:**
   - Go to repository "Settings" → "Pages"
   - Source: "Deploy from a branch"
   - Branch: "gh-pages"
   - Folder: "/ (root)"

4. **Automatic Deployment:**
   Every push to the `main` branch will trigger an automatic deployment

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for intelligent insights
- Recharts for beautiful visualizations
- Vite for blazing fast development experience
