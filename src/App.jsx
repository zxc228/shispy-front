import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import DebugConsole from './components/Debug/DebugConsole'

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/profile" replace />} />
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
          </Route>
        </Routes>
      </BrowserRouter>
      <DebugConsole />
    </>
  )
}
