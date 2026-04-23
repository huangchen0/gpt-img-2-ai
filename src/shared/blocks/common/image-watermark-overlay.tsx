import { cn } from '@/shared/lib/utils';

const WATERMARK_MARKS = [
  'top-[28%] left-[14%]',
  'top-[50%] left-[42%]',
  'top-[72%] left-[18%]',
];

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
      {WATERMARK_MARKS.map((positionClass) => (
        <span
          key={positionClass}
          className={cn(
            'absolute rotate-[-24deg] text-xs font-semibold whitespace-nowrap text-white/38 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] sm:text-sm',
            positionClass
          )}
        >
          {label}
        </span>
      ))}
      <div className="absolute top-3 left-3 rounded bg-black/32 px-2 py-1 text-[10px] font-semibold text-white/78 shadow-sm backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}
