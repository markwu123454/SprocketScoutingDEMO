// PitScouting.tsx
export default function PitScoutingLayout() {
    return (
        <div className="@container flex flex-col gap-4 p-4 bg-gray-100 h-[200px] overflow-y-auto resize-y">
            <div className="text-sm">Resize this container vertically to see changes</div>

            <div
                className="h-full h-sm:bg-green-300 h-md:bg-yellow-300 h-lg:bg-orange-300 h-xl:bg-red-300 h-2xl:bg-purple-300 bg-gray-300 p-4 rounded text-center">
                <p className="text-sm font-mono">Container height breakpoint active</p>
            </div>
            <div className="TEST-FAILURE:bg-red-500">Broken if this shows up</div>
        </div>
    );
}
