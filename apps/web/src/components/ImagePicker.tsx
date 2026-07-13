import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

const MAX_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function ImagePicker({
  files,
  onChange,
  label,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function select(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected);
    const invalid = next.find(
      (file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_BYTES,
    );
    if (invalid) {
      setError('Use JPEG, PNG or WebP images up to 5 MB each.');
      return;
    }
    setError(null);
    onChange([...files, ...next].slice(0, MAX_IMAGES));
    if (input.current) input.current.value = '';
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700">
          {label} <span className="font-normal text-slate-400">(optional)</span>
        </p>
        <span className="text-[11px] text-slate-400">
          {files.length}/{MAX_IMAGES}
        </span>
      </div>
      {previews.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {previews.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <img
                src={url}
                alt={`Selected upload ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  onChange(files.filter((_, fileIndex) => fileIndex !== index))
                }
                aria-label={`Remove image ${index + 1}`}
                className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length < MAX_IMAGES && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600 transition hover:border-primary hover:bg-blue-50 hover:text-primary"
        >
          <ImagePlus className="h-5 w-5" />
          {files.length ? 'Add more photos' : 'Choose photos'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => select(event.target.files)}
      />
      <p className="mt-1.5 text-[11px] text-slate-400">
        JPEG, PNG or WebP · maximum 5 MB per photo
      </p>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
