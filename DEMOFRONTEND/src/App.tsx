import {BrowserRouter, Routes, Route} from 'react-router-dom'

import './index.css'

import {HomeLayout} from './pages/Home'
import MatchScoutingLayout from './pages/MatchScouting'
import PitScoutingLayout from './pages/PitScouting'
import DataLayout from './pages/Data'
import MatchMonitoringLayout from './pages/MatchMonitoring'

import AuthGate from "@/components/ui/authGate.tsx";
import {UpdateProvider} from "@/contexts/pollingContext.tsx"

// import ScoutingSyncProvider from './contexts/useScoutingSync.ts'

export default function App() {
    return (
        <UpdateProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/" element={<HomeLayout/>}/>

                    {/* Scouting Section */}
                    <Route path="/scouting">
                        <Route
                            path="match"
                            element={
                                <AuthGate permission="match_scouting">
                                    <MatchScoutingLayout/>
                                </AuthGate>
                            }
                        />
                        <Route
                            path="pit"
                            element={
                                <AuthGate permission="pit_scouting">
                                    <PitScoutingLayout/>
                                </AuthGate>
                            }
                        />
                    </Route>

                    {/* Admin Section */}
                    <Route path="/admin">
                        <Route
                            path="monitor/*"
                            element={
                                <AuthGate permission="admin">
                                    <MatchMonitoringLayout/>
                                </AuthGate>
                            }
                        />
                    </Route>

                    {/* Data Section */}
                    <Route
                        path="/data/*"
                        element={
                            <AuthGate permission="admin">
                                <DataLayout/>
                            </AuthGate>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </UpdateProvider>
    )
}
