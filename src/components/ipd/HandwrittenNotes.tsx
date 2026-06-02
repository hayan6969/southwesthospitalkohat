import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, Pen, Trash2, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  readOnly?: boolean;
  label?: string;
}

export function HandwrittenNotes({ value, onChange, readOnly = false, label = "Hand Written Notes" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [penWidth, setPenWidth] = useState(2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (value) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = value;
      } else {
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [value]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Pen className="w-4 h-4" />
          {label}
        </Label>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md p-1">
              <button
                type="button"
                className={cn("w-5 h-5 rounded-full border", penColor === "#1a1a1a" && "ring-2 ring-offset-1 ring-blue-500")}
                style={{ backgroundColor: "#1a1a1a" }}
                onClick={() => setPenColor("#1a1a1a")}
              />
              <button
                type="button"
                className={cn("w-5 h-5 rounded-full border", penColor === "#2563eb" && "ring-2 ring-offset-1 ring-blue-500")}
                style={{ backgroundColor: "#2563eb" }}
                onClick={() => setPenColor("#2563eb")}
              />
              <button
                type="button"
                className={cn("w-5 h-5 rounded-full border", penColor === "#dc2626" && "ring-2 ring-offset-1 ring-blue-500")}
                style={{ backgroundColor: "#dc2626" }}
                onClick={() => setPenColor("#dc2626")}
              />
            </div>
            <select
              value={penWidth}
              onChange={(e) => setPenWidth(Number(e.target.value))}
              className="h-7 text-xs border rounded px-1"
            >
              <option value={1}>Thin</option>
              <option value={2}>Medium</option>
              <option value={4}>Thick</option>
            </select>
            <Button type="button" size="sm" variant="outline" onClick={clear} className="h-7">
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className={cn(
          "w-full h-48 border rounded-md cursor-crosshair touch-none",
          readOnly ? "cursor-default" : "hover:border-blue-400"
        )}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ backgroundColor: "#fafafa" }}
      />
      {!hasDrawn && !value && (
        <p className="text-xs text-muted-foreground text-center">
          Write or draw using your mouse or touch screen
        </p>
      )}
    </div>
  );
}
