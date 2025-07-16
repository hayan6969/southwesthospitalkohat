import { formatPkrAmount } from './currency';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceItem {
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PharmacyInvoiceData {
  invoice_number: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  discount_amount?: number;
  final_amount: number;
  created_at: string;
  items: InvoiceItem[];
}

// Get hospital settings for receipt header
const getHospitalSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('hospital_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching hospital settings:', error);
    return {
      hospital_name: 'Medical Center',
      hospital_address: 'Healthcare District',
      contact_number: '+92-XXX-XXXXXXX',
      logo_url: null
    };
  }
};

// Format text to fit thermal printer width (42 characters for FontA)
const formatLine = (text: string, maxLength: number = 42): string => {
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
};

// Center text within the thermal printer width
const centerText = (text: string, width: number = 42): string => {
  if (text.length >= width) return text;
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
};

// Right align text
const rightAlign = (text: string, width: number = 42): string => {
  if (text.length >= width) return text;
  return ' '.repeat(width - text.length) + text;
};

// Create a separator line
const createSeparator = (char: string = '-', width: number = 42): string => {
  return char.repeat(width);
};

// Generate thermal printer compatible receipt
export const generateThermalReceipt = async (invoiceData: PharmacyInvoiceData): Promise<void> => {
  const settings = await getHospitalSettings();
  let receipt = '';

  // ESC/POS commands for thermal printers
  const ESC = '\x1B';
  const GS = '\x1D';
  
  // Initialize printer and set character set
  receipt += ESC + '@'; // Initialize printer
  receipt += ESC + 't' + '\x10'; // Set character code table (PC437)
  receipt += ESC + '!' + '\x00'; // Reset font
  receipt += ESC + 'E' + '\x01'; // Enable bold/emphasized text
  receipt += GS + '!' + '\x00'; // Set print density to maximum
  
  // Header
  receipt += ESC + 'a' + '\x01'; // Center alignment
  receipt += ESC + '!' + '\x08'; // Double height text
  receipt += centerText(settings.hospital_name) + '\n';
  receipt += ESC + '!' + '\x00'; // Normal text
  receipt += centerText(settings.hospital_address) + '\n';
  receipt += centerText(`Phone: ${settings.contact_number}`) + '\n';
  receipt += createSeparator() + '\n';
  receipt += ESC + '!' + '\x08'; // Double height
  receipt += centerText('PHARMACY RECEIPT') + '\n';
  receipt += ESC + '!' + '\x00'; // Normal text
  receipt += createSeparator() + '\n';

  // Invoice details
  receipt += ESC + 'a' + '\x00'; // Left alignment
  receipt += `Invoice #: ${invoiceData.invoice_number}\n`;
  receipt += `Date: ${new Date(invoiceData.created_at).toLocaleDateString()}\n`;
  receipt += `Time: ${new Date(invoiceData.created_at).toLocaleTimeString()}\n`;
  receipt += `Customer: ${formatLine(invoiceData.customer_name || 'Walk-in Customer', 35)}\n`;
  
  if (invoiceData.customer_phone) {
    receipt += `Phone: ${invoiceData.customer_phone}\n`;
  }
  
  receipt += createSeparator() + '\n';

  // Items header
  receipt += 'ITEM'.padEnd(20) + 'QTY'.padEnd(6) + 'RATE'.padEnd(8) + 'TOTAL\n';
  receipt += createSeparator() + '\n';

  // Items
  invoiceData.items.forEach((item) => {
    const itemName = formatLine(item.medicine_name, 20);
    const qty = item.quantity.toString().padEnd(6);
    const rate = item.unit_price.toFixed(0).padEnd(8);
    const total = item.total_price.toFixed(0);
    
    receipt += itemName.padEnd(20) + qty + rate + total + '\n';
  });

  receipt += createSeparator() + '\n';

  // Totals
  const subtotalLine = `Subtotal: ${formatPkrAmount(invoiceData.total_amount)}`;
  receipt += rightAlign(subtotalLine) + '\n';

  if (invoiceData.discount_amount && invoiceData.discount_amount > 0) {
    const discountLine = `Discount: -${formatPkrAmount(invoiceData.discount_amount)}`;
    receipt += rightAlign(discountLine) + '\n';
  }

  receipt += createSeparator() + '\n';
  receipt += ESC + '!' + '\x08'; // Double height
  const totalLine = `TOTAL: ${formatPkrAmount(invoiceData.final_amount)}`;
  receipt += rightAlign(totalLine, 21) + '\n'; // Adjust for double height
  receipt += ESC + '!' + '\x00'; // Normal text
  receipt += createSeparator() + '\n';

  // Footer
  receipt += ESC + 'a' + '\x01'; // Center alignment
  receipt += '\n';
  receipt += centerText('Thank you for your business!') + '\n';
  receipt += centerText('Visit again soon!') + '\n';
  receipt += '\n';
  receipt += centerText(`Printed: ${new Date().toLocaleString()}`) + '\n';
  
  // Cut paper
  receipt += '\n\n\n';
  receipt += GS + 'V' + '\x00'; // Full cut

  // For thermal printers, we need to send this to the browser's print function
  // Create a printable format
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Pharmacy Receipt</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              font-weight: bold;
              line-height: 1.3;
              margin: 0;
              padding: 5px;
              width: 300px;
              background: white;
              color: #000000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt {
              white-space: pre-line;
              word-wrap: break-word;
              font-weight: bold;
              color: #000000;
              text-shadow: 0.5px 0.5px 0px #000000;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
                font-size: 13px;
                font-weight: 900;
                color: #000000 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .receipt {
                font-weight: 900;
                color: #000000 !important;
                text-shadow: 1px 1px 0px #000000;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">${receipt.replace(/\x1B[^m]*m?/g, '').replace(/\x1D[V\x00]/g, '')}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    // Fallback: create downloadable text file
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thermal-receipt-${invoiceData.invoice_number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};