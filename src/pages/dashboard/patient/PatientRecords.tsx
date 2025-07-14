
import { useState } from "react";
import { useMedicalRecords, usePatientDocuments, useUploadPatientDocument, useDeletePatientDocument } from "@/hooks/useDatabase";
import { useAuth } from "@/hooks/useAuth";
import { FileText, User, Calendar, Upload, Download, Trash2, File, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

  const patientRecords = medicalRecords?.filter(record => record.patient_id === profile?.id) || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Medical Records</h1>
          <p className="text-muted-foreground mt-1">View your complete medical history and documents</p>
        </div>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList>
          <TabsTrigger value="history">Medical History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Medical History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
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
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  <p className="text-sm text-muted-foreground">
                    Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
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
                <CardTitle className="flex items-center gap-2">
                  <File className="w-5 h-5" />
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
                      <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{document.document_label}</h4>
                            <p className="text-sm text-muted-foreground">{document.document_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{document.file_type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {document.file_size && formatFileSize(document.file_size)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(document.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(document.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(document.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
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
