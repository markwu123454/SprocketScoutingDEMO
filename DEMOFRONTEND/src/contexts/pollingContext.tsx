import {
    createContext,
    type DependencyList,
    type ReactNode,
    useContext,
    useEffect,
} from "react"

type PollingHandler = (data: any) => void

interface UpdateContextType {
    registerPolling: (
        endpoint: string,
        callback: PollingHandler,
        intervalMs?: number,
        headers?: HeadersInit
    ) => () => void
}

const UpdateContext = createContext<UpdateContextType | null>(null)

export function useUpdateContext(): UpdateContextType {
    const ctx = useContext(UpdateContext)
    if (!ctx) throw new Error("useUpdateContext must be used within UpdateProvider")
    return ctx
}

export function UpdateProvider({ children }: { children: ReactNode }) {
    const registerPolling: UpdateContextType["registerPolling"] = (
        endpoint,
        callback,
        intervalMs = 300,
        headers
    ) => {
        let active = true

        const poll = async () => {
            while (active) {
                const startTime = Date.now()
                try {
                    const res = await fetch(endpoint, { headers })
                    if (!res.ok) console.error(res)
                    const data = await res.json()
                    callback(data)
                } catch (err) {
                    console.error("Polling error:", err)
                }
                const elapsed = Date.now() - startTime
                const delay = Math.max(0, intervalMs - elapsed)
                await new Promise(res => setTimeout(res, delay))
            }
        }

        void poll()

        return () => {
            active = false
        }
    }

    return (
        <UpdateContext.Provider value={{ registerPolling }}>
            {children}
        </UpdateContext.Provider>
    )
}

export function usePollingEffect(
    endpoint: string | null,
    callback: PollingHandler,
    deps: DependencyList,
    intervalMs = 300,
    headers?: HeadersInit
) {
    const { registerPolling } = useUpdateContext()

    useEffect(() => {
        if (!endpoint) return

        return registerPolling(endpoint, callback, intervalMs, headers)
    }, [endpoint, ...deps])
}
