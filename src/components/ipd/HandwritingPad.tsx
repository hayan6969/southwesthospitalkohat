import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eraser, Pencil, Trash2, Undo2, Download } from "lucide-react";

interface HandwritingPadProps {
  value?: string;
  onChange?: (dataUrl: string) => void;
  readOnly?: boolean;
  height?: number;
  label?: string;
}

const COLORS = ["#1a1a1a", "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#f59e0b"];
const PEN_SIZES = [2, 4, 6, 10];

export function HandwritingPad({ value, onChange, readOnly = false, height = 400, label }: HandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [penSize, setPenSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<string[]>([]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const saveToUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current.push(canvas.toDataURL());
    if (undoStack.current.length > 20) undoStack.current.shift();
  }, []);

  const drawAt = (pos: { x: number; y: number }, prev: { x: number; y: number } | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isEraser ? "#ffffff" : penColor;
    ctx.lineWidth = isEraser ? penSize * 3 : penSize;

    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = isEraser ? "#ffffff" : penColor;
      ctx.fill();
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    saveToUndo();
    const pos = getPos(e);
    if (!pos) return;
    lastPos.current = pos;
    setIsDrawing(true);
    setHasDrawn(true);
    drawAt(pos, null);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    drawAt(pos, lastPos.current);
    lastPos.current = pos;
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
    if (onChange && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.current.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      undoStack.current.pop();
      if (onChange) onChange(canvas.toDataURL("image/png"));
    };
    img.src = undoStack.current[undoStack.current.length - 1];
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveToUndo();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (onChange) onChange("");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    ctx.scale(2, 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
      setHasDrawn(true);
    }
  }, [value]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || hasDrawn) return;
      canvas.width = canvas.clientWidth * 2;
      canvas.height = canvas.clientHeight * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasDrawn]);

  return (
    <div className="space-y-2">
      {label && <Label className="text-base font-semibold">{label}</Label>}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1 mr-2">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setPenColor(c); setIsEraser(false); }}
                className={`w-5 h-5 rounded-full border-2 transition-all ${penColor === c && !isEraser ? "border-gray-900 scale-125" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 mr-2">
            {PEN_SIZES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setPenSize(s)}
                className={`rounded-full transition-all ${penSize === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted-foreground/20"} w-7 h-7 flex items-center justify-center`}
              >
                <div className="rounded-full bg-current" style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant={isEraser ? "default" : "outline"}
              onClick={() => setIsEraser(!isEraser)}
              className="w-7 h-7"
              title="Eraser"
            >
              <Eraser className="w-3 h-3" />
            </Button>
            <Button type="button" size="icon" variant="outline" onClick={undo} className="w-7 h-7" title="Undo">
              <Undo2 className="w-3 h-3" />
            </Button>
            <Button type="button" size="icon" variant="outline" onClick={clear} className="w-7 h-7" title="Clear">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      <Card className="border-2 border-dashed border-muted-foreground/30 overflow-hidden">
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            className="w-full touch-none"
            style={{ height, cursor: readOnly ? "default" : isEraser ? "crosshair" : "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\"><circle cx=\"8\" cy=\"8\" r=\"6\" fill=\"black\" opacity=\"0.3\"/></svg>') 8 8, crosshair" }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </CardContent>
      </Card>
    </div>
  );
}
