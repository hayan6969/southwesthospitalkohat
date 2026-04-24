import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ImportType = "lab" | "pharmacy" | "radiology";

interface ExcelImportButtonProps {
  type: ImportType;
  onImported?: () => void;
}

interface FieldSpec {
  name: string;
  required: boolean;
  type: "text" | "number" | "date";
  description: string;
  example: string;
}

const SCHEMA: Record<ImportType, { title: string; fields: FieldSpec[] }> = {
  lab: {
    title: "Laboratory Tests",
    fields: [
      { name: "name", required: true, type: "text", description: "Test name", example: "Complete Blood Count" },
      { name: "price", required: true, type: "number", description: "Price in PKR (numbers only)", example: "1500" },
      { name: "category", required: false, type: "text", description: "Test category", example: "Hematology" },
      { name: "description", required: false, type: "text", description: "Short description", example: "CBC test" },
      { name: "normal_range", required: false, type: "text", description: "Reference range", example: "4.5-11.0" },
      { name: "preparation_instructions", required: false, type: "text", description: "Patient prep notes", example: "Fasting required" },
    ],
  },
  pharmacy: {
    title: "Pharmacy Medicines",
    fields: [
      { name: "name", required: true, type: "text", description: "Medicine name", example: "Panadol 500mg" },
      { name: "purchase_price", required: true, type: "number", description: "Cost price in PKR", example: "8" },
      { name: "selling_price", required: true, type: "number", description: "Sell price in PKR", example: "12" },
      { name: "stock_quantity", required: true, type: "number", description: "Units in stock", example: "100" },
      { name: "expiry_date", required: true, type: "date", description: "Format: YYYY-MM-DD", example: "2026-12-31" },
      { name: "minimum_stock_level", required: false, type: "number", description: "Low-stock alert level", example: "10" },
      { name: "manufacturing_date", required: false, type: "date", description: "Format: YYYY-MM-DD", example: "2024-01-15" },
      { name: "batch_number", required: false, type: "text", description: "Batch / lot number", example: "B12345" },
      { name: "company_name", required: false, type: "text", description: "Manufacturer", example: "GSK" },
      { name: "formula", required: false, type: "text", description: "Active ingredient", example: "Paracetamol" },
      { name: "description", required: false, type: "text", description: "Notes", example: "Pain reliever" },
    ],
  },
  radiology: {
    title: "Radiology / X-ray Tests",
    fields: [
      { name: "name", required: true, type: "text", description: "Test name", example: "Chest X-ray PA" },
      { name: "price", required: true, type: "number", description: "Price in PKR (numbers only)", example: "1200" },
      { name: "category", required: false, type: "text", description: "Test category", example: "X-ray" },
      { name: "description", required: false, type: "text", description: "Short description", example: "Chest radiograph" },
      { name: "preparation_instructions", required: false, type: "text", description: "Patient prep notes", example: "Remove metal items" },
    ],
  },
};

const TABLE_NAMES: Record<ImportType, "lab_tests" | "medicines" | "xray_tests"> = {
  lab: "lab_tests",
  pharmacy: "medicines",
  radiology: "xray_tests",
};

const formatExcelDate = (value: any): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().split("T")[0];
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${m}-${d}`;
    }
    return null;
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
};

export function ExcelImportButton({ type, onImported }: ExcelImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [errorFileName, setErrorFileName] = useState("");

  const schema = SCHEMA[type];
  const requiredFields = schema.fields.filter((f) => f.required);

  const downloadTemplate = () => {
    const headers = schema.fields.map((f) => f.name);
    const example: Record<string, any> = {};
    schema.fields.forEach((f) => {
      example[f.name] = f.example;
    });
    const ws = XLSX.utils.json_to_sheet([example], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, schema.title.slice(0, 31));
    XLSX.writeFile(wb, `${type}_template.xlsx`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    setErrorFileName(fileName);
    setLoading(true);
    try {
      const validExt = /\.(xlsx|xls|csv)$/i.test(fileName);
      if (!validExt) {
        setErrors([`Unsupported file type. Please upload .xlsx, .xls, or .csv only.`]);
        setErrorOpen(true);
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      if (workbook.SheetNames.length === 0) {
        setErrors(["Excel file contains no sheets."]);
        setErrorOpen(true);
        return;
      }
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

      if (rows.length === 0) {
        setErrors(["The file is empty. Add at least one data row below the header."]);
        setErrorOpen(true);
        return;
      }

      // Validate headers up-front
      const headerRow = rows[0];
      const headerKeys = Object.keys(headerRow).map((k) =>
        k.trim().toLowerCase().replace(/\s+/g, "_")
      );
      const missingHeaders = requiredFields
        .map((f) => f.name)
        .filter((name) => !headerKeys.includes(name));

      if (missingHeaders.length > 0) {
        setErrors([
          `Missing required column(s): ${missingHeaders.join(", ")}.`,
          `Required columns for ${schema.title}: ${requiredFields.map((f) => f.name).join(", ")}.`,
          `Tip: Click "Show Format" or "Download Template" to get the correct structure.`,
        ]);
        setErrorOpen(true);
        return;
      }

      const cleaned: Record<string, any>[] = [];
      const errs: string[] = [];

      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // header is row 1
        const normalized: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const k = key.trim().toLowerCase().replace(/\s+/g, "_");
          normalized[k] = row[key];
        });

        let rowHasError = false;

        // Required check
        for (const field of requiredFields) {
          const v = normalized[field.name];
          if (v === null || v === undefined || String(v).trim() === "") {
            errs.push(`Row ${rowNum}: missing required value for "${field.name}".`);
            rowHasError = true;
          }
        }

        // Type validation
        for (const field of schema.fields) {
          const v = normalized[field.name];
          if (v === null || v === undefined || v === "") continue;

          if (field.type === "number") {
            const n = Number(v);
            if (isNaN(n)) {
              errs.push(`Row ${rowNum}: "${field.name}" must be a number (got "${v}").`);
              rowHasError = true;
            } else if (n < 0) {
              errs.push(`Row ${rowNum}: "${field.name}" cannot be negative (got ${n}).`);
              rowHasError = true;
            } else {
              normalized[field.name] = n;
            }
          } else if (field.type === "date") {
            const formatted = formatExcelDate(v);
            if (!formatted) {
              errs.push(
                `Row ${rowNum}: "${field.name}" has an invalid date "${v}". Use YYYY-MM-DD format.`
              );
              rowHasError = true;
            } else {
              normalized[field.name] = formatted;
            }
          }
        }

        // Drop unknown fields & empty strings -> null
        const allowed = new Set(schema.fields.map((f) => f.name));
        Object.keys(normalized).forEach((k) => {
          if (!allowed.has(k)) {
            delete normalized[k];
            return;
          }
          if (normalized[k] === "") normalized[k] = null;
        });

        if (!rowHasError) cleaned.push(normalized);
      });

      if (errs.length > 0) {
        setErrors([
          `Upload rejected. Found ${errs.length} error(s) in "${fileName}". No data was imported.`,
          ...errs,
        ]);
        setErrorOpen(true);
        return;
      }

      if (cleaned.length === 0) {
        setErrors(["No valid rows to import."]);
        setErrorOpen(true);
        return;
      }

      const tableName = TABLE_NAMES[type];
      const { error } = await supabase.from(tableName as any).insert(cleaned as any);

      if (error) {
        setErrors([
          `Database rejected the upload. No records were imported.`,
          error.message,
        ]);
        setErrorOpen(true);
        return;
      }

      toast.success(`Successfully imported ${cleaned.length} record(s)`, {
        icon: <CheckCircle2 className="w-4 h-4" />,
      });
      onImported?.();
    } catch (err: any) {
      console.error("Excel import error:", err);
      setErrors([`Failed to read the file. ${err?.message ?? "Unknown error."}`]);
      setErrorOpen(true);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => setFormatOpen(true)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Import from Excel
      </Button>

      {/* Format / instructions dialog */}
      <Dialog open={formatOpen} onOpenChange={setFormatOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              {schema.title} – Excel Upload Format
            </DialogTitle>
            <DialogDescription>
              Your file must use these exact column headers (first row). Required columns
              cannot be empty. Files that don't match will be rejected.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-1">
            This is exactly how your Excel sheet should look. The first row is the header
            (column names), and each row below is one record.
          </p>

          <ScrollArea className="max-h-[45vh] w-full">
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                {/* Excel-like header: each column name is a column */}
                <TableHeader>
                  <TableRow className="bg-primary/10 hover:bg-primary/10">
                    <TableHead className="w-24 sticky left-0 bg-primary/10 border-r border-border text-xs font-bold text-foreground">
                      Row
                    </TableHead>
                    {schema.fields.map((f) => (
                      <TableHead
                        key={f.name}
                        className="border-r border-border last:border-r-0 whitespace-nowrap text-foreground"
                      >
                        <div className="flex flex-col gap-1 py-1">
                          <code className="text-xs font-bold text-foreground">
                            {f.name}
                          </code>
                          {f.required ? (
                            <Badge variant="destructive" className="text-[10px] w-fit">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] w-fit">
                              Optional
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Type row */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="sticky left-0 bg-muted/30 border-r border-border text-xs font-semibold text-muted-foreground">
                      Type
                    </TableCell>
                    {schema.fields.map((f) => (
                      <TableCell
                        key={f.name}
                        className="border-r border-border last:border-r-0"
                      >
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {f.type}
                        </Badge>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Description row */}
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background border-r border-border text-xs font-semibold text-muted-foreground">
                      Description
                    </TableCell>
                    {schema.fields.map((f) => (
                      <TableCell
                        key={f.name}
                        className="border-r border-border last:border-r-0 text-xs text-muted-foreground min-w-[140px]"
                      >
                        {f.description}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Example row — looks like real Excel data */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="sticky left-0 bg-muted/30 border-r border-border text-xs font-semibold text-muted-foreground">
                      Example
                    </TableCell>
                    {schema.fields.map((f) => (
                      <TableCell
                        key={f.name}
                        className="border-r border-border last:border-r-0"
                      >
                        <code className="text-xs bg-background px-1.5 py-0.5 rounded border border-border whitespace-nowrap">
                          {f.example}
                        </code>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md space-y-1">
            <p>• Accepted file types: <strong>.xlsx, .xls, .csv</strong></p>
            <p>• Dates must use <strong>YYYY-MM-DD</strong> format (e.g., 2026-12-31)</p>
            <p>• Numbers must be plain digits — no currency symbols or commas</p>
            <p>• Column names are case-insensitive and spaces become underscores</p>
            <p>• If <strong>any</strong> row is invalid, the entire upload is rejected</p>
          </div>

          <div className="text-xs bg-primary/5 border border-primary/20 p-3 rounded-md space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              About "Download Template"
            </p>
            <p className="text-muted-foreground">
              Click <strong>Download Template</strong> to get a ready-made Excel file with the
              correct column headers and one sample row already filled in. Open it in Excel,
              <strong> replace the example row with your own data</strong> (one record per row),
              save the file, then come back here and click <strong>Choose File</strong> to upload it.
              You don't need to add or rename any columns — just fill in the rows.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button
              onClick={() => {
                setFormatOpen(false);
                inputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error dialog */}
      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Upload Rejected
            </DialogTitle>
            <DialogDescription>
              {errorFileName ? (
                <>The file <strong>{errorFileName}</strong> did not match the required format. No data was imported.</>
              ) : (
                <>The file did not match the required format. No data was imported.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <ul className="space-y-1 text-sm">
              {errors.map((e, i) => (
                <li
                  key={i}
                  className="flex gap-2 p-2 rounded border border-destructive/20 bg-destructive/5"
                >
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <span className="text-foreground">{e}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setErrorOpen(false);
                setFormatOpen(true);
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              View Format
            </Button>
            <Button onClick={() => setErrorOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
