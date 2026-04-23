import { cn } from '@/shared/lib/utils';

const WATERMARK_TILES = Array.from({ length: 28 }, (_, index) => index);

export function ImageWatermarkOverlay({
  label = 'gpt-image-2-ai.org',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-10 overflow-hidden',
        className
      )}
    >
      <div className="absolute inset-[-32%] grid rotate-[-24deg] grid-cols-4 place-items-center gap-x-10 gap-y-9 opacity-80">
        {WATERMARK_TILES.map((tile) => (
          <span
            key={tile}
            className="text-[11px] font-semibold whitespace-nowrap text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)] sm:text-xs"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="absolute top-3 left-3 rounded bg-black/45 px-2 py-1 text-[10px] font-semibold text-white/85 shadow-sm backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}
