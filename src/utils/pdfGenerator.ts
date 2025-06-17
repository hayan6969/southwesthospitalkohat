
export const generateInvoicePDF = (invoice: any) => {
  // Create PDF content
  const pdfContent = `
MEDICAL INVOICE

Invoice #: ${invoice.invoice_number}
Date: ${new Date(invoice.created_at).toLocaleDateString()}

Bill To:
${invoice.patient?.users?.first_name} ${invoice.patient?.users?.last_name}
${invoice.patient?.users?.email}

Description: ${invoice.description}
Amount: $${invoice.amount}
Status: ${invoice.status.toUpperCase()}
Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}

${invoice.status === 'paid' && invoice.paid_at ? `Paid on: ${new Date(invoice.paid_at).toLocaleDateString()}` : ''}

Thank you for your business!
  `.trim();

  // Create blob and download
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoice.invoice_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
