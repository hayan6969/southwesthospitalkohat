import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { toast } from "sonner";

interface PdfViewerDialogProps {
  pdfUrl: string | null;
  title: string;
  trigger: React.ReactNode;
  onGetPdfUrl: () => Promise<string | null>;
}

export function PdfViewerDialog({ pdfUrl: initialPdfUrl, title, trigger, onGetPdfUrl }: PdfViewerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !pdfUrl) {
      loadPdfUrl();
    }
  }, [isOpen]);

  const loadPdfUrl = async () => {
    setLoading(true);
    try {
      const url = await onGetPdfUrl();
      setPdfUrl(url);
    } catch (error) {
      console.error('Error loading PDF URL:', error);
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw] h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-6 pt-0">
          <div className="w-full h-full border rounded-lg overflow-hidden bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                <span className="ml-2">Loading PDF...</span>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={title}
                style={{ minHeight: "600px" }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Failed to load PDF</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}