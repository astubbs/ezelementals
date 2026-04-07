/** Shows the current video frame + spectrogram side by side. */
interface Props {
  frame: string | null       // base64 JPEG
  spectrogram: string | null // base64 PNG
  frameIndex: number
  timestampS: number
  total: number
}

export function FrameViewer({ frame, spectrogram, frameIndex, timestampS, total }: Props) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1">
        <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Frame</div>
        {frame ? (
          <img
            src={`data:image/jpeg;base64,${frame}`}
            alt="Current frame"
            className="w-full rounded border border-slate-700 object-cover aspect-video bg-slate-900"
          />
        ) : (
          <div className="w-full aspect-video rounded border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-600 text-sm">
            Waiting…
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Spectrogram</div>
        {spectrogram ? (
          <img
            src={`data:image/png;base64,${spectrogram}`}
            alt="Audio spectrogram"
            className="w-full rounded border border-slate-700 object-cover aspect-video bg-slate-900"
          />
        ) : (
          <div className="w-full aspect-video rounded border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-600 text-sm">
            Waiting…
          </div>
        )}
      </div>
      <div className="text-xs text-slate-400 whitespace-nowrap pt-5">
        <div>t = {timestampS.toFixed(1)}s</div>
        <div className="text-slate-500">{frameIndex} / {total}</div>
      </div>
    </div>
  )
}
