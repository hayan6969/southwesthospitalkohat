import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Copy labels offered to the user, e.g. ["Patient Copy", "Lab Copy", "Hospital Copy"] */
  options: string[];
  /** Labels ticked by default (defaults to all options) */
  defaultSelected?: string[];
  onPrint: (copies: string[]) => Promise<void> | void;
}

export function PrintCopiesDialog({
  open,
  onOpenChange,
  title = "Print Receipt",
  description = "Choose which copies to print. Each copy prints on its own slip.",
  options,
  defaultSelected,
  onPrint,
}: Props) {
  const [selected, setSelected] = useState<string[]>(defaultSelected ?? options);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (open) setSelected(defaultSelected ?? options);
  }, [open]);

  const toggle = (label: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, label] : prev.filter((l) => l !== label)));
  };

  const handlePrint = async () => {
    if (selected.length === 0 || printing) return;
    setPrinting(true);
    try {
      // Keep the user's chosen order stable
      await onPrint(options.filter((o) => selected.includes(o)));
      onOpenChange(false);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!printing) onOpenChange(o); }}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {options.map((label) => (
            <label key={label} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer">
              <Checkbox
                checked={selected.includes(label)}
                onCheckedChange={(c) => toggle(label, c === true)}
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={printing}>
            Skip
          </Button>
          <Button onClick={handlePrint} disabled={printing || selected.length === 0}>
            {printing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
            Print {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
