import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateAnalyticsReportPDF } from "@/utils/analyticsReportGenerator";

type PresetRange = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export function AnalyticsReportDialog() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<PresetRange>('daily');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [generating, setGenerating] = useState(false);

  const handlePresetChange = (value: PresetRange) => {
    setPreset(value);
    const now = new Date();
    switch (value) {
      case 'daily':
        setStartDate(now);
        setEndDate(now);
        break;
      case 'weekly':
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'monthly':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'yearly':
        setStartDate(startOfYear(now));
        setEndDate(endOfYear(now));
        break;
      case 'custom':
        break;
    }
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }
    setGenerating(true);
    try {
      await generateAnalyticsReportPDF(startDate, endDate);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileText className="h-4 w-4" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Detailed Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preset selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Report Period</label>
            <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetRange)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (Today)</SelectItem>
                <SelectItem value="weekly">Weekly (This Week)</SelectItem>
                <SelectItem value="monthly">Monthly (This Month)</SelectItem>
                <SelectItem value="yearly">Yearly (This Year)</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd MMM yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => { if (d) setStartDate(d); setPreset('custom'); }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd MMM yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => { if (d) setEndDate(d); setPreset('custom'); }}
                    disabled={(date) => date > new Date() || (startDate ? date < startDate : false)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            Report will include all transactions from{' '}
            <span className="font-medium text-foreground">{format(startDate, 'dd MMM yyyy')}</span>
            {' '}to{' '}
            <span className="font-medium text-foreground">{format(endDate, 'dd MMM yyyy')}</span>
            {' '}with full detailed breakdown (OPD, Lab, X-Ray, OT, Expenses, Refunds, Discounts, etc.)
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate PDF Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
