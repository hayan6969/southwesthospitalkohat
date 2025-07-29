import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatPkrAmount } from "@/utils/currency";

interface Medicine {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
}

interface SearchableMedicineSelectProps {
  medicines: Medicine[] | undefined;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchableMedicineSelect({
  medicines,
  value,
  onValueChange,
  placeholder = "Search medicine...",
  isLoading = false,
}: SearchableMedicineSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedMedicine = medicines?.find((medicine) => medicine.id === value);
  const availableMedicines = medicines?.filter(m => m.stock_quantity > 0) || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading}
        >
          {selectedMedicine
            ? `${selectedMedicine.name} - ${formatPkrAmount(selectedMedicine.selling_price)} (Stock: ${selectedMedicine.stock_quantity})`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search medicine..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No medicine found.</CommandEmpty>
            <CommandGroup>
              {availableMedicines.map((medicine) => (
                <CommandItem
                  key={medicine.id}
                  value={`${medicine.name}-${medicine.id}`}
                  onSelect={() => {
                    onValueChange(medicine.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === medicine.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">{medicine.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPkrAmount(medicine.selling_price)} • Stock: {medicine.stock_quantity}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}