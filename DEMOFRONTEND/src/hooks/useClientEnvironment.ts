import {useEffect, useState} from "react"
import {useAPI} from "../api/API.ts"

export interface ClientEnvironment {
    // App/Platform Info
    isPWA: boolean
    isIOSPWA: boolean
    isStandalone: boolean
    userAgent: string
    os: "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Other"
    browser: "Chrome" | "Safari" | "Firefox" | "Edge" | "Other"
    deviceType: "mobile" | "tablet" | "desktop"
    isTouchDevice: boolean

    // Network
    serverOnline: boolean,
    isOnline: boolean
    isWifi: boolean
    networkQuality: number // 0.0 – 1.0
    qualityLevel: 0 | 1 | 2 | 3 | 4 | 5
    effectiveType: string | null
    rawSpeedMbps: number | null
    rawRTT: number | null

    // Hardware
    bluetoothAvailable: boolean
    usbAvailable: boolean
    hasCamera: boolean
    hasMicrophone: boolean

    // Battery
    batteryLevel: number | null
    batteryCharging: boolean | null
}

export function useClientEnvironment(): ClientEnvironment {
    const [env, setEnv] = useState<ClientEnvironment>({
        isPWA: false,
        isIOSPWA: false,
        isStandalone: false,
        userAgent: navigator.userAgent,
        os: "Other",
        browser: "Other",
        deviceType: "desktop",
        isTouchDevice: false,

        serverOnline: false,
        isOnline: navigator.onLine,
        isWifi: false,
        networkQuality: 0,
        qualityLevel: 0,
        effectiveType: null,
        rawSpeedMbps: null,
        rawRTT: null,

        bluetoothAvailable: "bluetooth" in navigator,
        usbAvailable: "usb" in navigator,
        hasCamera: false,
        hasMicrophone: false,

        batteryLevel: null,
        batteryCharging: null,
    })

    const {ping} = useAPI()

    useEffect(() => {
        const updateNetworkStatus = () => {
            const nav = navigator as any
            const conn = nav.connection || {}

            const type = conn.type ?? null
            const effectiveType = conn.effectiveType ?? null
            const downlink = typeof conn.downlink === "number" ? conn.downlink : null
            const rtt = typeof conn.rtt === "number" ? conn.rtt : null
            const isOnline = navigator.onLine
            const isWifi = type === "wifi" || effectiveType === "4g" || (downlink ?? 0) > 10

            const quality =
                !isOnline || downlink === null || rtt === null
                    ? 0
                    : Math.min(1,
                        (downlink / 10) * 0.7 + (1 - Math.min(rtt / 300, 1)) * 0.3
                    )

            const level: ClientEnvironment["qualityLevel"] =
                !isOnline ? 0
                    : quality > 0.9 ? 5
                        : quality > 0.7 ? 4
                            : quality > 0.5 ? 3
                                : quality > 0.3 ? 2
                                    : quality > 0.1 ? 1
                                        : 0

            setEnv((prev) => ({
                ...prev,
                isOnline,
                isWifi,
                networkQuality: Math.round(quality * 100) / 100,
                qualityLevel: level,
                effectiveType,
                rawSpeedMbps: downlink,
                rawRTT: rtt,
            }))
        }

        const pingServer = async () => {
            const result = await ping()
            setEnv(prev => ({...prev, serverOnline: result}))
        }

        updateNetworkStatus()
        void pingServer()

        const interval = setInterval(pingServer, 4500)

        window.addEventListener("online", updateNetworkStatus)
        window.addEventListener("offline", updateNetworkStatus)
        ;((navigator as any).connection)?.addEventListener("change", updateNetworkStatus)

        return () => {
            clearInterval(interval)
            window.removeEventListener("online", updateNetworkStatus)
            window.removeEventListener("offline", updateNetworkStatus)
            ;((navigator as any).connection)?.removeEventListener("change", updateNetworkStatus)
        }
    }, [])


    return env
}
