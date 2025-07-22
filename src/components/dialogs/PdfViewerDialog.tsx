import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, X } from "lucide-react";
import { toast } from "sonner";

interface PdfViewerDialogProps {
  pdfUrl: string;
  title: string;
  trigger: React.ReactNode;
}

export function PdfViewerDialog({ pdfUrl, title, trigger }: PdfViewerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error("Failed to download PDF");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw] h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {title}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDownload}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                size="sm"
                variant="ghost"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-6 pt-0">
          <div className="w-full h-full border rounded-lg overflow-hidden bg-gray-50">
            <iframe
              src={`${pdfUrl}#view=FitH`}
              className="w-full h-full border-0"
              title={title}
              style={{ minHeight: '600px' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}