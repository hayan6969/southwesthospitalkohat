
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LowStockAlerts() {
  const { data: lowGeneral } = useQuery({
    queryKey: ["low-stock-general"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("*")
        .filter("stock_quantity", "lte", "minimum_stock_level" as any);
      // Manual filter since we can't do column comparison in postgrest easily
      return (data || []).filter((i: any) => i.stock_quantity <= i.minimum_stock_level);
    },
  });

  const { data: lowLab } = useQuery({
    queryKey: ["low-stock-lab"],
    queryFn: async () => {
      const { data } = await supabase.from("lab_inventory_items").select("*");
      return (data || []).filter((i: any) => i.stock_quantity <= i.minimum_stock_level);
    },
  });

  const allLow = [...(lowGeneral || []), ...(lowLab || [])];
  if (allLow.length === 0) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-destructive flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5" />
          Low Stock Alerts ({allLow.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {allLow.map((item: any) => (
            <Badge key={item.id} variant="destructive" className="text-sm py-1">
              {item.name}: {item.stock_quantity} {item.unit} (min: {item.minimum_stock_level})
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
