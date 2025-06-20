
import AppLayout from "@/layouts/AppLayout";
import { useExpiringMedicines } from "@/hooks/useDatabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PharmacyExpiry() {
  const { data: expiringMedicines, isLoading } = useExpiringMedicines();

  const urgentExpiring = expiringMedicines?.filter(med => med.daysLeft <= 7) || [];
  const soonExpiring = expiringMedicines?.filter(med => med.daysLeft > 7 && med.daysLeft <= 30) || [];
  const futureExpiring = expiringMedicines?.filter(med => med.daysLeft > 30) || [];

  const getExpiryColor = (daysLeft: number) => {
    if (daysLeft <= 7) return 'text-red-600 bg-red-50';
    if (daysLeft <= 30) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getExpiryBadge = (daysLeft: number) => {
    if (daysLeft <= 0) return 'EXPIRED';
    if (daysLeft <= 7) return 'URGENT';
    if (daysLeft <= 30) return 'SOON';
    return 'WATCH';
  };

  const MedicineTable = ({ medicines, title }: { medicines: any[], title: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {title} ({medicines.length})
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Batch Number</TableHead>
              <TableHead>Stock Quantity</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medicines.length > 0 ? (
              medicines.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{medicine.name}</div>
                      {medicine.formula && (
                        <div className="text-sm text-gray-500">{medicine.formula}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{medicine.company_name || '-'}</TableCell>
                  <TableCell>{medicine.batch_number || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      medicine.stock_quantity <= (medicine.minimum_stock_level || 10)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {medicine.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(medicine.expiry_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExpiryColor(medicine.daysLeft)}`}>
                      {medicine.daysLeft > 0 ? `${medicine.daysLeft} days` : 'EXPIRED'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      medicine.daysLeft <= 0 ? 'bg-red-100 text-red-800' :
                      medicine.daysLeft <= 7 ? 'bg-red-100 text-red-800' :
                      medicine.daysLeft <= 30 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getExpiryBadge(medicine.daysLeft)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                  No medicines in this category
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medicine Expiry Tracker</h1>
          <p className="text-gray-600 mt-1">Monitor medicines approaching expiration dates</p>
        </div>

        {urgentExpiring.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>URGENT:</strong> {urgentExpiring.length} medicine(s) expire within 7 days!
              Take immediate action to prevent losses.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Urgent (≤7 days)</p>
                <p className="text-2xl font-bold text-red-600">{urgentExpiring.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Soon (8-30 days)</p>
                <p className="text-2xl font-bold text-orange-600">{soonExpiring.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Watch (31-90 days)</p>
                <p className="text-2xl font-bold text-yellow-600">{futureExpiring.length}</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="urgent" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="urgent" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Urgent ({urgentExpiring.length})
            </TabsTrigger>
            <TabsTrigger value="soon" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Soon ({soonExpiring.length})
            </TabsTrigger>
            <TabsTrigger value="future" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Watch ({futureExpiring.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              All ({expiringMedicines?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="urgent">
            <MedicineTable medicines={urgentExpiring} title="Urgent - Expires Within 7 Days" />
          </TabsContent>

          <TabsContent value="soon">
            <MedicineTable medicines={soonExpiring} title="Soon - Expires Within 8-30 Days" />
          </TabsContent>

          <TabsContent value="future">
            <MedicineTable medicines={futureExpiring} title="Watch - Expires Within 31-90 Days" />
          </TabsContent>

          <TabsContent value="all">
            {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            ) : (
              <MedicineTable medicines={expiringMedicines || []} title="All Medicines" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
