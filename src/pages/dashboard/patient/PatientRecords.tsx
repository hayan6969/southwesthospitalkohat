
import { useState } from "react";
import { useMedicalRecords, usePatientDocuments, useUploadPatientDocument, useDeletePatientDocument } from "@/hooks/useDatabase";
import { useAuth } from "@/hooks/useAuth";
import { FileText, User, Calendar, Upload, Eye, Trash2, File, Plus, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function PatientRecords() {
  const { profile } = useAuth();
  const { data: medicalRecords, isLoading: medicalLoading } = useMedicalRecords();
  const { data: documents, isLoading: documentsLoading } = usePatientDocuments(profile?.id);
  const uploadMutation = useUploadPatientDocument();
  const deleteMutation = useDeletePatientDocument();
  
  const [isUploading, setIsUploading] = useState(false);
  const [documentLabel, setDocumentLabel] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingDocument, setViewingDocument] = useState<any>(null);

  const patientRecords = medicalRecords?.filter(record => record.patient_id === profile?.id) || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an image (JPG, PNG) or PDF file",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentLabel.trim() || !profile?.id) {
      toast({
        title: "Missing information",
        description: "Please select a file and provide a label",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        patientId: profile.id,
        documentLabel: documentLabel.trim()
      });

      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully"
      });

      // Reset form
      setSelectedFile(null);
      setDocumentLabel("");
      // Reset file input
      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteMutation.mutateAsync(documentId);
      toast({
        title: "Document deleted",
        description: "Document has been removed successfully"
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  const isImageFile = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const DocumentViewer = ({ document }: { document: any }) => {
    if (isImageFile(document.file_type)) {
      return (
        <div className="max-w-full max-h-[70vh] overflow-auto flex justify-center">
          <img 
            src={document.file_url} 
            alt={document.document_label}
            className="max-w-full h-auto object-contain"
            onError={(e) => {
              console.error('Image failed to load:', document.file_url);
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZpbGw9IiM2YjdyODAiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
            }}
          />
        </div>
      );
    } else if (document.file_type === 'application/pdf') {
      return (
        <div className="w-full h-[70vh]">
          <iframe
            src={`${document.file_url}#toolbar=0`}
            className="w-full h-full border-0 rounded"
            title={document.document_label}
            onError={() => {
              console.error('PDF failed to load:', document.file_url);
            }}
          />
        </div>
      );
    }
    return <p className="text-center text-muted-foreground py-8">Preview not available for this file type</p>;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Medical Records</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">View your complete medical history and documents</p>
        </div>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="history">Medical History</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                Medical History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile view for medical records */}
              <div className="sm:hidden">
                {medicalLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : patientRecords.length > 0 ? (
                  <div className="space-y-4">
                    {patientRecords.map((record) => (
                      <div key={record.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">
                            {format(new Date(record.visit_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-sm">
                                Dr. {record.doctor?.profiles?.first_name} {record.doctor?.profiles?.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {record.doctor?.specialization}
                              </div>
                            </div>
                          </div>
                          {record.diagnosis && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">Diagnosis:</span>
                              <p className="text-sm">{record.diagnosis}</p>
                            </div>
                          )}
                          {record.treatment && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">Treatment:</span>
                              <p className="text-sm">{record.treatment}</p>
                            </div>
                          )}
                          {record.prescription && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">Prescription:</span>
                              <p className="text-sm">{record.prescription}</p>
                            </div>
                          )}
                          {record.notes && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">Notes:</span>
                              <p className="text-sm text-muted-foreground">{record.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No medical records found</p>
                  </div>
                )}
              </div>

              {/* Desktop view for medical records */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visit Date</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Prescription</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicalLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-muted rounded animate-pulse"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : patientRecords.length > 0 ? (
                      patientRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(new Date(record.visit_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  Dr. {record.doctor?.profiles?.first_name} {record.doctor?.profiles?.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {record.doctor?.specialization}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{record.diagnosis || 'No diagnosis recorded'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{record.treatment || 'No treatment recorded'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{record.prescription || 'No prescription'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {record.notes || 'No additional notes'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          No medical records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  Upload Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-label">Document Label</Label>
                  <Input
                    id="document-label"
                    placeholder="e.g., Blood Test Report, X-Ray, Prescription"
                    value={documentLabel}
                    onChange={(e) => setDocumentLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-upload">Select File</Label>
                  <Input
                    id="document-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                  />
                  <p className="text-sm text-muted-foreground">
                    Supported formats: PDF, JPG, PNG (Max 10MB)
                  </p>
                </div>
                {selectedFile && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                )}
                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile || !documentLabel.trim() || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <File className="w-4 h-4 sm:w-5 sm:h-5" />
                  My Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : documents && documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((document) => (
                      <div key={document.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <File className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium truncate">{document.document_label}</h4>
                            <p className="text-sm text-muted-foreground truncate">{document.document_name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{document.file_type}</Badge>
                              {document.file_size && (
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(document.file_size)}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(document.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingDocument(document)}
                              >
                                <Eye className="w-4 h-4" />
                                <span className="sr-only sm:not-sr-only sm:ml-2">View</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle className="text-base sm:text-lg">{document.document_label}</DialogTitle>
                              </DialogHeader>
                              <DocumentViewer document={document} />
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(document.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only sm:not-sr-only sm:ml-2">Delete</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                    <p className="text-sm text-muted-foreground">Upload your medical documents to keep them organized</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
