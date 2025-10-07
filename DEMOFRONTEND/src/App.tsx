import {BrowserRouter, Routes, Route, Outlet} from 'react-router-dom'

import './index.css'

import {HomeLayout} from './pages/Home'
import {MatchScoutingLayout} from './pages/MatchScouting'
import {DataLayout} from './pages/Data'
import MatchMonitoringLayout from './pages/MatchMonitoring'
import AdminHomeLayout from "@/pages/AdminHome.tsx";

import AuthGate from "@/components/AuthGate.tsx";
import MatchDetailPage from "@/pages/DataMatch.tsx";
//import DevLayout from "@/pages/Dev.tsx";
import NotFoundPage from "@/pages/NotFoundPage.tsx";
import {LargeDataWrapper} from "@/contexts/dataProvider.tsx";
import PitScoutingLayout from "@/pages/PitScouting.tsx";

// import ScoutingSyncProvider from './contexts/useScoutingSync.ts'

export default function App() {
    return (
        <BrowserRouter>
            <div className="h-screen flex flex-col min-h-0">
                <Routes>

                    <Route path="/" element={<HomeLayout/>}/>

                    <Route path="/scouting">
                        <Route
                            path="match"
                            element={
                                <AuthGate permission="match_scouting" device="mobile" dialogTheme="dark">
                                    <MatchScoutingLayout/>
                                </AuthGate>
                            }
                        />
                        <Route
                            path="pit"
                            element={
                                <AuthGate permission="pit_scouting" device="mobile" dialogTheme="dark">
                                    <PitScoutingLayout/>
                                </AuthGate>
                            }
                        />
                    </Route>

                    <Route path="/admin">
                        <Route
                            index
                            element={
                                <AuthGate permission="admin" device="desktop" dialogTheme="light">
                                    <AdminHomeLayout/>
                                </AuthGate>
                            }
                        />
                        <Route
                            path="monitor/*"
                            element={
                                <AuthGate permission="admin" device="desktop" dialogTheme="light">
                                    <MatchMonitoringLayout/>
                                </AuthGate>
                            }
                        />
                        <Route path="data" element={
                            <LargeDataWrapper>
                                <Outlet/>
                            </LargeDataWrapper>
                        }>
                            <Route
                                index
                                element={
                                    <AuthGate permission="admin" device="desktop" dialogTheme="light">
                                        <DataLayout/>
                                    </AuthGate>
                                }
                            />
                            <Route
                                path="match/:matchType/:matchNumStr"
                                element={
                                    <AuthGate permission="admin" device="desktop" dialogTheme="light">
                                        <MatchDetailPage/>
                                    </AuthGate>
                                }
                            />
                        </Route>
                    </Route>

                    <Route
                        path="/dev"
                        element={
                            <NotFoundPage code={501}/>
                            // TODO: add pit scouting
                            //<AuthGate permission="dev" device="desktop" dialogTheme="light">
                            //    <DevLayout/>
                            //</AuthGate>
                        }
                    />
                    <Route
                        path="/guest"
                        element={
                            <NotFoundPage code={501}/>
                            // TODO: add pit guest page
                        }
                    />
                    <Route path="*" element={<NotFoundPage/>}/>
                </Routes>
            </div>
        </BrowserRouter>
    )
}
