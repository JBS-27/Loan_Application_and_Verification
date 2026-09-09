"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dropzone({
  label,
  hint,
  onFile,
}: {
  label: string;
  hint?: string;
  onFile: (file: { fileName: string; mimeType: string; fileUrl: string }) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    setError("");
    if (!file) return;
    if (file.size > 1_400_000) {
      setError("Keep demo uploads under 1.4 MB.");
      return;
    }
    const fileUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    onFile({ fileName: file.name, mimeType: file.type || "application/octet-stream", fileUrl });
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
        drag ? "border-primary bg-secondary" : "border-border bg-muted/40 hover:bg-muted"
      )}
    >
      <Upload className="mb-2 size-5 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-1 text-xs text-muted-foreground">
        {hint || "PDF or image, stored locally in this demo"}
      </span>
      {error ? <span className="mt-2 text-xs text-red-700">{error}</span> : null}
      <input
        type="file"
        className="sr-only"
        accept="image/*,.pdf"
        onChange={(event) => handleFile(event.target.files?.[0])}
        onDragEnter={() => setDrag(true)}
        onDragLeave={() => setDrag(false)}
        onDrop={() => setDrag(false)}
      />
    </label>
  );
}
