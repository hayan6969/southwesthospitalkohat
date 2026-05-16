import jsPDF from "jspdf";

interface AnesthesiaPDFData {
  patientName: string;
  mrNumber: string;
  admissionNumber: string;
  age: string;
  gender: string;
  date: string;
  consultantDoctor: string;
  surgicalProcedure: string;
  briefHistory: string;
  preopHr: string;
  preopBp: string;
  preopSpo2: string;
  preopMedication: string;
  anesthesiaType: string;
  anesthesiaDrugs: string;
  intraopRows: Array<{ time: string; hr: string; spo2: string; bp: string }>;
  inputOutputNotes: string;
  recoveryStatus: string;
  postopOrders: string[];
  postopNotes: string;
  hospitalName: string;
}

export function generateAnesthesiaNotesPDF(data: AnesthesiaPDFData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  let y = margin;

  const drawLine = (yPos: number) => {
    doc.setDrawColor(0, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageW - margin, yPos);
  };

  // Header
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 150);
  doc.text("ANESTHESIA NOTES", pageW / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(data.hospitalName, pageW / 2, y, { align: "center" });
  y += 4;
  drawLine(y);
  y += 5;

  // Patient Info
  doc.setFontSize(9);
  doc.setTextColor(60);
  const infoLeft = [
    `Patient: ${data.patientName}`,
    `MR #: ${data.mrNumber}`,
    `Admission: ${data.admissionNumber || "\u2014"}`,
    `Age: ${data.age || "\u2014"}  Gender: ${data.gender || "\u2014"}`,
  ];
  const infoRight = [
    `Date: ${data.date}`,
    `Consultant: ${data.consultantDoctor}`,
  ];
  infoLeft.forEach((line, i) => {
    doc.text(line, margin, y + i * 5);
  });
  infoRight.forEach((line, i) => {
    doc.text(line, pageW / 2 + 10, y + i * 5);
  });
  y += infoLeft.length * 5 + 3;
  drawLine(y);
  y += 5;

  // Helper
  const section = (title: string, content: string) => {
    if (y > 270) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setTextColor(0, 100, 150);
    doc.text(title, margin, y);
    y += 4;
    doc.setFontSize(9);
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(content || "\u2014", pageW - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 3;
    drawLine(y);
    y += 4;
  };

  section("1. Surgical Procedure", data.surgicalProcedure);
  section("2. Brief Medical & Surgical History", data.briefHistory);

  // Pre-Op Vitals
  if (y > 260) { doc.addPage(); y = margin; }
  doc.setFontSize(10);
  doc.setTextColor(0, 100, 150);
  doc.text("3. Pre-Op Vitals", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(40);
  const vitalsText = `HR: ${data.preopHr || "\u2014"} bpm  |  BP: ${data.preopBp || "\u2014"} mmHg  |  SPO2: ${data.preopSpo2 || "\u2014"}%`;
  doc.text(vitalsText, margin, y);
  y += 5;
  drawLine(y);
  y += 4;

  section("4. Pre-Op Medication", data.preopMedication);

  if (y > 260) { doc.addPage(); y = margin; }
  doc.setFontSize(10);
  doc.setTextColor(0, 100, 150);
  doc.text("5. Mode of Anesthesia", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text(data.anesthesiaType || "\u2014", margin, y);
  y += 5;
  drawLine(y);
  y += 4;

  section("6. Drugs Used in Induction", data.anesthesiaDrugs);

  // Intra-Op Table
  if (y > 250) { doc.addPage(); y = margin; }
  doc.setFontSize(10);
  doc.setTextColor(0, 100, 150);
  doc.text("7. Intra-Op Assessment", margin, y);
  y += 5;

  if (data.intraopRows.length > 0) {
    const colW = [30, 25, 25, 25];
    const startX = margin;
    doc.setFontSize(8);
    doc.setTextColor(60);
    doc.setFillColor(220, 240, 240);
    ["Time", "HR", "SPO2", "BP"].forEach((h, i) => {
      doc.rect(startX + colW.slice(0, i).reduce((a, b) => a + b, 0), y, colW[i], 6, "F");
      doc.text(h, startX + colW.slice(0, i).reduce((a, b) => a + b, 0) + 2, y + 4);
    });
    y += 6;
    doc.setDrawColor(200);
    data.intraopRows.forEach((row, idx) => {
      if (y > 275) { doc.addPage(); y = margin; }
      const vals = [row.time || "\u2014", row.hr || "\u2014", row.spo2 || "\u2014", row.bp || "\u2014"];
      doc.setFontSize(8);
      doc.setTextColor(40);
      if (idx % 2 === 0) doc.setFillColor(245, 250, 250);
      vals.forEach((v, i) => {
        doc.rect(startX + colW.slice(0, i).reduce((a, b) => a + b, 0), y, colW[i], 5, "F");
        doc.text(v, startX + colW.slice(0, i).reduce((a, b) => a + b, 0) + 2, y + 3.5);
      });
      doc.rect(startX, y, colW.reduce((a, b) => a + b, 0), 5);
      y += 5;
    });
    y += 3;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("No intra-op assessments recorded.", margin, y);
    y += 5;
  }
  drawLine(y);
  y += 4;

  section("8. Input / Output During Surgery", data.inputOutputNotes);

  if (y > 260) { doc.addPage(); y = margin; }
  doc.setFontSize(10);
  doc.setTextColor(0, 100, 150);
  doc.text("9. Recovery Status", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text(data.recoveryStatus || "\u2014", margin, y);
  y += 5;
  drawLine(y);
  y += 4;

  // Post-Op Orders
  if (y > 260) { doc.addPage(); y = margin; }
  doc.setFontSize(10);
  doc.setTextColor(0, 100, 150);
  doc.text("10. Post-Op Orders", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(40);
  if (data.postopOrders.length > 0) {
    data.postopOrders.forEach(order => {
      doc.text(`\u2022 ${order}`, margin + 3, y);
      y += 4.5;
    });
    y += 2;
  }
  if (data.postopNotes) {
    const notesLines = doc.splitTextToSize(data.postopNotes, pageW - 2 * margin - 10);
    doc.text(notesLines, margin + 3, y);
    y += notesLines.length * 4.5 + 2;
  }
  drawLine(y);
  y += 5;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  const now = new Date();
  doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, margin, 285);
  doc.text("Anesthesia Notes - Hospital Management System", pageW / 2, 285, { align: "center" });

  doc.save(`anesthesia-notes-${data.mrNumber || "patient"}.pdf`);
}
