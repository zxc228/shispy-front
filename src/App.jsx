import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import MapPage from './pages/Map/MapPage'
import LivePage from './pages/Live/LivePage'
import LobbyPage from './pages/Lobby/LobbyPage'
import TreasurePage from './pages/Treasure/TreasurePage'
import ProfilePage from './pages/Profile/ProfilePage'
import AddPage from './pages/Add/AddPage'
import BattlePage from './pages/Battle/BattlePage'
import CreatePage from './pages/Create/CreatePage'
import JoinPage from './pages/Join/JoinPage'
import WaitingScreen from './pages/Lobby/WaitingScreen'
import SplashScreen from './components/common/SplashScreen'
import SmartRedirect from './components/routing/SmartRedirect'
import { logger } from './shared/logger'
import RulesPage from './pages/Rules/RulesPage'

export default function App() {
  // Quick check: don't show splash if sessionStorage suggests active game
  // API will do the real check in SmartRedirect
  const [showSplash, setShowSplash] = useState(() => {
    const activeGameId = sessionStorage.getItem('active_game_id')
    const pendingBet = sessionStorage.getItem('pending_bet')
    const shouldSkipSplash = !!activeGameId || !!pendingBet
    if (shouldSkipSplash) {
      logger.info('App: skipping splash due to sessionStorage hint', { activeGameId, pendingBet: !!pendingBet })
    }
    return !shouldSkipSplash
  })

  const handleCloseSplash = () => {
    setShowSplash(false)
  }

  return (
    <>
      {showSplash && <SplashScreen onClose={handleCloseSplash} />}
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<SmartRedirect />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/lobby/waiting" element={<WaitingScreen />} />
            <Route path="/lobby/battle/:id" element={<BattlePage />} />
            <Route path="/treasure" element={<TreasurePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/add" element={<AddPage />} />
            <Route path="/battle/:id" element={<BattlePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/join/:id" element={<JoinPage />} />
            <Route path="/rules" element={<RulesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
  {/* DebugConsole disabled: keep logging functionality without UI */}
    </>
  )
}
