import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SIZE_OPTIONS = [
  { value: "50x25", label: '2" × 1" (50 × 25 mm)', width: 50, height: 25 },
  { value: "38x25", label: '1.5" × 1" (38 × 25 mm)', width: 38, height: 25 },
  { value: "50x40", label: '2" × 1.6" (50 × 40 mm)', width: 50, height: 40 },
  { value: "75x50", label: '3" × 2" (75 × 50 mm)', width: 75, height: 50 },
];

export function StickerPrinter() {
  const [name, setName] = useState("");
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [sizeKey, setSizeKey] = useState("50x25");
  const { toast } = useToast();
  const size = SIZE_OPTIONS.find((s) => s.value === sizeKey) || SIZE_OPTIONS[0];

  const handlePrint = () => {
    if (!name.trim() || !medicine.trim() || !dosage.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in name, medicine and dosage.",
        variant: "destructive",
      });
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<title>Sticker</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page {
    size: 50mm 25mm;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 50mm;
    height: 25mm;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
  }
  .sticker {
    width: 50mm;
    height: 25mm;
    padding: 1.5mm 2mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sticker:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .name {
    font-size: 9pt;
    font-weight: bold;
    line-height: 1.1;
    margin-bottom: 1mm;
    border-bottom: 0.3mm solid #000;
    padding-bottom: 0.5mm;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .medicine {
    font-size: 8pt;
    font-weight: 600;
    line-height: 1.15;
    margin-bottom: 1mm;
    word-wrap: break-word;
  }
  .dosage-label {
    font-size: 6pt;
    text-transform: uppercase;
    letter-spacing: 0.3pt;
    color: #333;
  }
  .dosage {
    font-size: 8pt;
    font-weight: bold;
    line-height: 1.15;
    word-wrap: break-word;
    white-space: pre-wrap;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="sticker">
    <div class="name">${escapeHtml(name)}</div>
    <div class="medicine">${escapeHtml(medicine)}</div>
    <div class="dosage-label">Dosage</div>
    <div class="dosage">${escapeHtml(dosage)}</div>
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function(){ window.close(); }, 300);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) {
      toast({
        title: "Popup blocked",
        description: "Please allow popups to print stickers.",
        variant: "destructive",
      });
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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
          <div className="space-y-2">
            <Label htmlFor="sticker-name">Patient Name</Label>
            <Input
              id="sticker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ahmed Khan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sticker-medicine">Medicine</Label>
            <Input
              id="sticker-medicine"
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
              placeholder="e.g. Panadol 500mg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sticker-dosage">Dosage</Label>
            <Textarea
              id="sticker-dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 1 tablet 3x daily after meals"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Sticker
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setName("");
                setMedicine("");
                setDosage("");
              }}
            >
              Clear
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Optimized for 2-inch (50mm) thermal sticker rolls.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div
              className="border-2 border-dashed border-gray-300 bg-white p-2 text-black"
              style={{ width: "189px", minHeight: "94px", fontFamily: "Arial, sans-serif" }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  borderBottom: "1px solid #000",
                  paddingBottom: "2px",
                  marginBottom: "3px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name || "Patient Name"}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "3px" }}>
                {medicine || "Medicine name"}
              </div>
              <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#333" }}>
                Dosage
              </div>
              <div style={{ fontSize: "11px", fontWeight: "bold", whiteSpace: "pre-wrap" }}>
                {dosage || "Dosage instructions"}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Approximate preview of 50mm × 25mm sticker
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
