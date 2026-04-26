import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Printer, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const SIZE_OPTIONS = [
  { value: "2x1", label: '2" × 1" (50.8 × 25.4 mm)', width: 50.8, height: 25.4 },
  { value: "1.5x1", label: '1.5" × 1" (38.1 × 25.4 mm)', width: 38.1, height: 25.4 },
  { value: "2x1.5", label: '2" × 1.5" (50.8 × 38.1 mm)', width: 50.8, height: 38.1 },
  { value: "3x2", label: '3" × 2" (76.2 × 50.8 mm)', width: 76.2, height: 50.8 },
];

const DOSAGE_PRESETS = ["OD", "BD", "TDS", "QID", "SOS", "Custom"];
const CATEGORY_OPTIONS = ["", "IV", "IM", "PO", "SC", "Topical"];

// Hook to search medicines by name (autocomplete)
function useMedicineSearch(term: string) {
  const trimmed = term.trim();
  const [debounced, setDebounced] = useState(trimmed);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(trimmed), 200);
    return () => clearTimeout(t);
  }, [trimmed]);

  return useQuery({
    queryKey: ["sticker-medicine-search", debounced],
    queryFn: async () => {
      if (debounced.length < 2) return [];
      const safe = debounced.replace(/[,%()]/g, " ").trim();
      const { data, error } = await supabase
        .from("medicines")
        .select("id, name, formula, expiry_date")
        .ilike("name", `%${safe}%`)
        .limit(8);
      if (error) return [];
      return data || [];
    },
    enabled: debounced.length >= 2,
  });
}

export function StickerPrinter() {
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  // Patient
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [showPatientSuggest, setShowPatientSuggest] = useState(false);
  const { data: patientResults = [] } = useSearchPatientsWithNames(patientQuery);

  // Medicine
  const [medicineName, setMedicineName] = useState("");
  const [showMedSuggest, setShowMedSuggest] = useState(false);
  const { data: medResults = [] } = useMedicineSearch(medicineName);

  // Dosage
  const [dosagePreset, setDosagePreset] = useState("OD");
  const [dosageCustom, setDosageCustom] = useState("");

  // Other
  const [expDate, setExpDate] = useState("");
  const [category, setCategory] = useState("");
  const [sizeKey, setSizeKey] = useState("1.5x1");

  const size = SIZE_OPTIONS.find((s) => s.value === sizeKey) || SIZE_OPTIONS[0];
  const finalDosage = dosagePreset === "Custom" ? dosageCustom.trim() : dosagePreset;

  const patientBoxRef = useRef<HTMLDivElement>(null);
  const medBoxRef = useRef<HTMLDivElement>(null);
  const printJobRef = useRef(0);
  const printCleanupRef = useRef<number | null>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patientBoxRef.current && !patientBoxRef.current.contains(e.target as Node)) {
        setShowPatientSuggest(false);
      }
      if (medBoxRef.current && !medBoxRef.current.contains(e.target as Node)) {
        setShowMedSuggest(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (printCleanupRef.current) window.clearTimeout(printCleanupRef.current);
      document.querySelectorAll('[data-sticker-print-frame="true"]').forEach((frame) => frame.remove());
    };
  }, []);

  const patientSuggestions = useMemo(() => {
    return (patientResults as any[]).filter((p) => p?.profile);
  }, [patientResults]);

  const resetFields = () => {
    setPatientId("");
    setPatientName("");
    setPatientQuery("");
    setMedicineName("");
    setDosagePreset("OD");
    setDosageCustom("");
    setExpDate("");
    setCategory("");
  };

  const handleClear = () => {
    resetFields();
  };

  const handlePrint = () => {
    if (isPrinting) {
      toast({ title: "Print already open", description: "Close or cancel the current print window before printing again." });
      return;
    }

    if (!patientId.trim() && !patientName.trim()) {
      toast({ title: "Missing patient", description: "Enter patient ID or name.", variant: "destructive" });
      return;
    }
    if (!medicineName.trim()) {
      toast({ title: "Missing medicine", description: "Enter the medicine name.", variant: "destructive" });
      return;
    }
    if (!finalDosage) {
      toast({ title: "Missing dosage", description: "Choose or enter a dosage.", variant: "destructive" });
      return;
    }

    const PAGE_WIDTH = size.width;
    const PAGE_HEIGHT = size.height;
    const printJobId = Date.now();
    printJobRef.current = printJobId;
    setIsPrinting(true);
    const expLine = expDate ? `Exp: ${escapeHtml(expDate)}` : "";
    const catLine = category ? escapeHtml(category) : "";
    const idLine = patientId ? `ID: ${escapeHtml(patientId)}` : "";

    const html = `
<!DOCTYPE html>
<html>
<head>
<title>Sticker</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: ${PAGE_WIDTH}mm ${PAGE_HEIGHT}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    width: ${PAGE_WIDTH}mm; height: ${PAGE_HEIGHT}mm;
    font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff;
  }
  .sticker {
    width: ${PAGE_WIDTH}mm; height: ${PAGE_HEIGHT}mm;
    padding: 1.5mm 2mm; overflow: hidden;
    page-break-after: avoid; break-after: avoid;
    page-break-inside: avoid; break-inside: avoid;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .row1 { display: flex; justify-content: space-between; align-items: baseline; gap: 1mm;
          font-size: 8pt; line-height: 1.1; margin-bottom: 0.5mm; }
  .pid { font-weight: 600; }
  .cat { font-weight: bold; font-size: 9pt; }
  .pname { font-size: 10pt; font-weight: bold; line-height: 1.1; margin-bottom: 1mm;
           border-bottom: 0.3mm solid #000; padding-bottom: 0.6mm;
           white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .med { font-size: 10pt; font-weight: 700; line-height: 1.15; margin-bottom: 0.8mm; word-wrap: break-word; }
  .dose-row { display: flex; justify-content: space-between; align-items: baseline; gap: 1mm; margin-top: auto; }
  .dose { font-size: 10pt; font-weight: bold; }
  .exp { font-size: 7pt; color: #000; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="sticker">
    <div class="row1">
      <span class="pid">${idLine}</span>
      <span class="cat">${catLine}</span>
    </div>
    <div class="pname">${escapeHtml(patientName || "—")}</div>
    <div class="med">${escapeHtml(medicineName)}</div>
    <div class="dose-row">
      <span class="dose">${escapeHtml(finalDosage)}</span>
      <span class="exp">${expLine}</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function(){ window.close(); }, 300);
    };
  </script>
</body>
</html>`;

    // Use one fresh iframe per print and remove all previous frames to avoid cached/duplicate labels
    if (printCleanupRef.current) window.clearTimeout(printCleanupRef.current);
    document.querySelectorAll('[data-sticker-print-frame="true"]').forEach((frame) => frame.remove());

    const iframe = document.createElement("iframe");
    iframe.id = `sticker-print-frame-${printJobId}`;
    iframe.dataset.stickerPrintFrame = "true";
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = `${PAGE_WIDTH}mm`;
    iframe.style.height = `${PAGE_HEIGHT}mm`;
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast({ title: "Print failed", description: "Unable to open print frame.", variant: "destructive" });
      iframe.remove();
      setIsPrinting(false);
      return;
    }

    // Strip the auto-print script from the html (we'll trigger it from parent)
    const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    doc.open();
    doc.write(cleanHtml);
    doc.close();

    const finishPrint = () => {
      if (printJobRef.current !== printJobId) return;
      printJobRef.current = 0;
      if (printCleanupRef.current) {
        window.clearTimeout(printCleanupRef.current);
        printCleanupRef.current = null;
      }
      iframe.remove();
      setIsPrinting(false);
    };

    let printTriggered = false;
    const triggerPrint = () => {
      if (printJobRef.current !== printJobId) return;
      if (printTriggered) return;
      printTriggered = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Print error:", e);
        finishPrint();
        return;
      }
      // Reset fields right after the print dialog opens so the form is ready immediately
      resetFields();
      iframe.contentWindow?.addEventListener("afterprint", finishPrint, { once: true });
      printCleanupRef.current = window.setTimeout(finishPrint, 8000);
    };

    iframe.onload = () => {
      window.setTimeout(triggerPrint, 50);
    };
    if (iframe.contentWindow?.document.readyState === "complete") {
      window.setTimeout(triggerPrint, 50);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Print Medicine Sticker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient ID with autocomplete */}
          <div className="space-y-2 relative" ref={patientBoxRef}>
            <Label htmlFor="sticker-pid">Patient ID</Label>
            <Input
              id="sticker-pid"
              value={patientId}
              onChange={(e) => {
                const v = e.target.value;
                setPatientId(v);
                setPatientQuery(v);
                setShowPatientSuggest(true);
              }}
              onFocus={() => setShowPatientSuggest(true)}
              placeholder="Type patient ID or name (e.g. P-00001)"
              autoComplete="off"
            />
            {showPatientSuggest && patientSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
                {patientSuggestions.slice(0, 8).map((p: any) => {
                  const fullName = `${p.profile?.first_name || ""} ${p.profile?.last_name || ""}`.trim() || "Unknown";
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setPatientId(p.patient_number || "");
                        setPatientName(fullName);
                        setPatientQuery("");
                        setShowPatientSuggest(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b border-border last:border-b-0"
                    >
                      <div className="font-medium">{p.patient_number || "—"} · {fullName}</div>
                      {p.profile?.phone && (
                        <div className="text-xs text-muted-foreground">{p.profile.phone}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Patient Name */}
          <div className="space-y-2">
            <Label htmlFor="sticker-pname">Patient Name</Label>
            <Input
              id="sticker-pname"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Patient full name"
            />
          </div>

          {/* Medicine with autocomplete */}
          <div className="space-y-2 relative" ref={medBoxRef}>
            <Label htmlFor="sticker-med">Medicine Name</Label>
            <Input
              id="sticker-med"
              value={medicineName}
              onChange={(e) => {
                setMedicineName(e.target.value);
                setShowMedSuggest(true);
              }}
              onFocus={() => setShowMedSuggest(true)}
              placeholder="e.g. Panadol 500mg"
              autoComplete="off"
            />
            {showMedSuggest && (medResults as any[]).length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
                {(medResults as any[]).map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      setMedicineName(m.name);
                      if (m.expiry_date) setExpDate(m.expiry_date);
                      setShowMedSuggest(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b border-border last:border-b-0"
                  >
                    <div className="font-medium">{m.name}</div>
                    {(m.formula || m.expiry_date) && (
                      <div className="text-xs text-muted-foreground">
                        {m.formula || ""}{m.formula && m.expiry_date ? " · " : ""}{m.expiry_date ? `Exp: ${m.expiry_date}` : ""}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dosage */}
          <div className="space-y-2">
            <Label>Dosage</Label>
            <div className="flex flex-wrap gap-2">
              {DOSAGE_PRESETS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={dosagePreset === d ? "default" : "outline"}
                  onClick={() => setDosagePreset(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
            {dosagePreset === "Custom" && (
              <Input
                value={dosageCustom}
                onChange={(e) => setDosageCustom(e.target.value)}
                placeholder="e.g. 1 tab every 6 hours"
                className="mt-2"
              />
            )}
          </div>

          {/* Exp date + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sticker-exp">Expiry Date (optional)</Label>
              <Input
                id="sticker-exp"
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sticker-cat">Category</Label>
              <select
                id="sticker-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c || "— None —"}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label htmlFor="sticker-size">Sticker Size</Label>
            <select
              id="sticker-size"
              value={sizeKey}
              onChange={(e) => setSizeKey(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Sticker
            </Button>
            <Button variant="outline" onClick={handleClear}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div
              className="border-2 border-dashed border-gray-300 bg-white text-black overflow-hidden"
              style={{
                width: `${size.width * 3.78}px`,
                height: `${size.height * 3.78}px`,
                fontFamily: "Arial, sans-serif",
                padding: "5px 7px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginBottom: "1px" }}>
                <span style={{ fontWeight: 600 }}>{patientId ? `ID: ${patientId}` : ""}</span>
                <span style={{ fontWeight: "bold" }}>{category}</span>
              </div>
              <div
                style={{
                  fontSize: "12px", fontWeight: "bold",
                  borderBottom: "1px solid #000",
                  paddingBottom: "2px", marginBottom: "3px",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {patientName || "Patient Name"}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "2px" }}>
                {medicineName || "Medicine name"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                  {finalDosage || "Dosage"}
                </span>
                <span style={{ fontSize: "9px", color: "#333" }}>
                  {expDate ? `Exp: ${expDate}` : ""}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Actual size preview: {size.width}mm × {size.height}mm
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
