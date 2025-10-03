import CameraCapture from "@/components/ui/cameraCapture";

export default function PitScoutingLayout() {
    return (
        <form className="p-4 space-y-4">
            {/* onSelect={(file) => console.log("selected:", file)}
            TODO: Add method for fetching image, and callback for on change*/}
            <CameraCapture title="Robot photos" maxCount={7} jpegMaxEdge={1980} maxTotalBytes={7.5 * 1024 * 1024}/>

            {/* …rest of form */}
        </form>
    );
}
