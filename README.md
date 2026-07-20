Welcome to the **Cricket Game** web application! This is a real-time multiplayer browser-based cricket game built with modern web technologies. 
Players can authenticate (or play as guests), enter a matchmaking lobby, participate in a live coin toss, and play real-time games against opponents globally!
---
## 📸 Features
- **User Authentication:** Sign in securely using Firebase Auth, or jump right into the action using the Guest mode.
- **Matchmaking & Lobby:** Real-time lobby system to find opponents quickly using Firebase Firestore.
- **Interactive Gameplay:**
  - **Toss System:** Real-time coin toss mechanics (`/toss`).
  - **Live Game Board:** Play out matches in real-time (`/game`).
- **Player Profiles & Leaderboards:** Track your stats, win/loss records, and see how you rank globally against other players.
- **Responsive Design:** Beautiful, fully responsive UI built with Tailwind CSS, customized with a dark "night-sky" theme.
- **Optimized Performance:** Uses React lazy loading (`Suspense`) for splitting routes, ensuring the fastest possible initial load.
---
## 🛠️ Technology Stack
- **Frontend Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Routing:** [React Router DOM](https://reactrouter.com/)
- **Backend/BaaS:** [Firebase](https://firebase.google.com/) (Authentication, Firestore Database, Hosting)
- **Icons:** [Lucide React](https://lucide.dev/)
---
## 📁 Project Structure
```text
src/
├── assets/         # Static assets (images, icons)
├── components/     # React UI Components
│   ├── LandingPage # Initial landing screen
│   ├── Auth        # Authentication flows
│   ├── Lobby       # Main lobby and navigation
│   ├── Matchmaking # Finding an opponent logic
│   ├── Toss        # Coin toss phase
│   ├── Game        # Core gameplay loop and UI
│   ├── Profile     # Player stats
│   └── Leaderboard # Global rankings
├── hooks/          # Custom React hooks (e.g., useAuth)
├── services/       # Firebase config and database service layers
├── store/          # Zustand global state (useGameStore.ts)
├── types/          # TypeScript interfaces and types
├── utils/          # Helper functions
├── App.tsx         # Main application router and Suspense fallback
└── main.tsx        # React DOM entry point
```
---
## 🚀 Getting Started
### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Firebase project configured with Authentication and Firestore.
### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/kishanpokal/Cricket-Game.git
   cd Cricket-Game
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Firebase:**
   Create a `.env` file in the root of your project and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser to see the app running.
### Build for Production
To generate a production-ready bundle, run:
```bash
npm run build
```
The optimized files will be generated in the `dist` folder, ready to be deployed to Firebase Hosting or any static site provider.
---
## 🤝 Contributing
Contributions, issues, and feature requests are welcome! If you'd like to improve the UI, tweak the game logic, or add new game modes, feel free to open a Pull Request.
## 📄 License
This project is open-source. Feel free to use and modify it!
