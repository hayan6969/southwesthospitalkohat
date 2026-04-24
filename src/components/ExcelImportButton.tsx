import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ImportType = "lab" | "pharmacy" | "radiology";

interface ExcelImportButtonProps {
  type: ImportType;
  onImported?: () => void;
}

const REQUIRED_FIELDS: Record<ImportType, string[]> = {
  lab: ["name", "price"],
  pharmacy: ["name", "purchase_price", "selling_price", "stock_quantity", "expiry_date"],
  radiology: ["name", "price"],
};

const TABLE_NAMES: Record<ImportType, "lab_tests" | "medicines" | "xray_tests"> = {
  lab: "lab_tests",
  pharmacy: "medicines",
  radiology: "xray_tests",
};

const NUMERIC_FIELDS: Record<ImportType, string[]> = {
  lab: ["price"],
  pharmacy: ["purchase_price", "selling_price", "stock_quantity", "minimum_stock_level"],
  radiology: ["price"],
};

const DATE_FIELDS: Record<ImportType, string[]> = {
  lab: [],
  pharmacy: ["manufacturing_date", "expiry_date"],
  radiology: [],
};

const formatExcelDate = (value: any): string | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${m}-${d}`;
    }
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

      if (rows.length === 0) {
        toast.error("Excel file is empty");
        return;
      }

      const required = REQUIRED_FIELDS[type];
      const numericFields = NUMERIC_FIELDS[type];
      const dateFields = DATE_FIELDS[type];

      const cleaned: Record<string, any>[] = [];
      const errors: string[] = [];

      rows.forEach((row, idx) => {
        const normalized: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const k = key.trim().toLowerCase().replace(/\s+/g, "_");
          normalized[k] = row[key];
        });

        for (const field of required) {
          if (normalized[field] === null || normalized[field] === undefined || normalized[field] === "") {
            errors.push(`Row ${idx + 2}: missing "${field}"`);
            return;
          }
        }

        numericFields.forEach((field) => {
          if (normalized[field] !== null && normalized[field] !== undefined && normalized[field] !== "") {
            const n = Number(normalized[field]);
            if (isNaN(n)) {
              errors.push(`Row ${idx + 2}: "${field}" must be a number`);
              return;
            }
            normalized[field] = n;
          }
        });

        dateFields.forEach((field) => {
          if (normalized[field]) {
            const formatted = formatExcelDate(normalized[field]);
            if (!formatted && required.includes(field)) {
              errors.push(`Row ${idx + 2}: invalid date in "${field}"`);
              return;
            }
            normalized[field] = formatted;
          }
        });

        Object.keys(normalized).forEach((k) => {
          if (normalized[k] === "") normalized[k] = null;
        });

        cleaned.push(normalized);
      });

      if (errors.length > 0) {
        toast.error(`Validation failed (${errors.length} errors)`, {
          description: errors.slice(0, 3).join("; ") + (errors.length > 3 ? "..." : ""),
        });
        return;
      }

      const tableName = TABLE_NAMES[type];
      const { error } = await supabase.from(tableName as any).insert(cleaned as any);

      if (error) {
        toast.error("Import failed", { description: error.message });
        return;
      }

      toast.success(`Successfully imported ${cleaned.length} record(s)`);
      onImported?.();
    } catch (err: any) {
      console.error("Excel import error:", err);
      toast.error("Failed to read Excel file", { description: err?.message });
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
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Import from Excel
      </Button>
    </>
  );
}
