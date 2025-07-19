import { BrowserRouter, Routes, Route } from 'react-router-dom'

import './index.css'
import HomeLayout from './pages/Home'
import MatchScoutingLayout from './pages/MatchScouting'
import PitScoutingLayout from './pages/PitScouting'
import DataLayout from './pages/Data'
import MatchMonitoringLayout from './pages/MatchMonitoring'

// import ScoutingSyncProvider from './contexts/useScoutingSync.ts'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomeLayout />} />
                <Route path="/scouting/match" element={<MatchScoutingLayout />} />
                <Route path="/scouting/pit" element={<PitScoutingLayout />} />
                <Route path="/data/*" element={<DataLayout />} />
                <Route path="/scouting/monitor/*" element={<MatchMonitoringLayout />} />
            </Routes>
        </BrowserRouter>
    )
}
