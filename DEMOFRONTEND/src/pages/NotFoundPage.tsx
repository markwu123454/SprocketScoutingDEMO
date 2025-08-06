import { useMemo, useState, useRef, useLayoutEffect } from "react"

interface NotFoundPageProps {
    code?: 403 | 404 | 501 | 503
}

export default function NotFoundPage({ code = 404 }: NotFoundPageProps) {
    const memeImages = useMemo(() => {
        const allImports = import.meta.glob("@/assets/meme/*.{png,gif}", { eager: true })
        return Object.values(allImports).map((mod: any) => mod.default)
    }, [])

    const getRandomImage = () => memeImages[Math.floor(Math.random() * memeImages.length)]
    const [currentImage, setCurrentImage] = useState(getRandomImage)

    const paragraphRef = useRef<HTMLParagraphElement>(null)
    const [paraWidth, setParaWidth] = useState<number | undefined>(undefined)

    useLayoutEffect(() => {
        if (paragraphRef.current) {
            setParaWidth(paragraphRef.current.offsetWidth)
        }
    }, [])

    const title =
        code === 501
            ? "Not implemented"
            : code === 403
            ? "Access denied"
            : code === 503
            ? "No Internet"
            : "Page not found"

    const message =
        code === 501 ? (
            <>
                This page or feature hasn’t been implemented yet.<br />
                Please contact a captain or lead if you believe this is an error.
            </>
        ) : code === 403 ? (
            <>
                You don’t have permission to access this page.<br />
                Nice try.
            </>
        ) : code === 503 ? (
            <>
                This page requires internet to access.<br />
                Try mobile data.
            </>
        ) : (
            <>
                Sorry, we couldn’t find the page you’re looking for.<br />
                Womp, womp.
            </>
        )

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[url('@/assets/2026_background_expanded.png')] bg-top bg-cover">
            {/* Text Section */}
            <div className="w-full md:w-1/2 flex flex-col justify-center items-start px-8 md:pl-20 py-10 gap-y-4">
                <div className="text-md sm:text-lg text-orange-500 font-semibold">{code}</div>
                <h1 className="text-5xl sm:text-6xl font-bold text-gray-900">{title}</h1>
                <p ref={paragraphRef} className="text-lg sm:text-xl text-gray-700">
                    {message}
                </p>
                <div
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-y-2 mt-2"
                    style={paraWidth ? { width: paraWidth } : {}}
                >
                    <a href="/" className="text-base sm:text-lg text-orange-700 hover:underline font-medium">
                        ← Back to home
                    </a>
                    <button
                        onClick={() => setCurrentImage(getRandomImage())}
                        className="text-base sm:text-lg text-orange-700 hover:underline font-medium"
                    >
                        See another meme →
                    </button>
                </div>
            </div>

            <div className="w-full md:w-1/2 flex-1 flex items-center justify-center h-full">
                <img
                    src={currentImage}
                    alt="Random meme"
                    className="max-h-full w-auto object-contain"
                />
            </div>
        </div>
    )
}
