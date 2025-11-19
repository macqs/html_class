'use client';

interface PreviewFrameProps {
  code: string;
}

export default function PreviewFrame({ code }: PreviewFrameProps) {
  return (
    <div className="h-full rounded-lg border border-zinc-200 bg-white">
      <iframe
        title="Live Preview"
        sandbox="allow-scripts allow-same-origin"
        className="h-full w-full"
        srcDoc={code}
      />
    </div>
  );
}
