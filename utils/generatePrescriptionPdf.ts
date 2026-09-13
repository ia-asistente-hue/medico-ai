import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Función para generar el Blob URL del PDF fusionado
export async function getMergedPdfBlobUrl({
  templateUrl,
  prescriptionCode,
  createdAt,
  patient,
  medications,
  instructions,
  doctor,
}) {
  const response = await fetch(templateUrl);
  const pdfBytes = await response.arrayBuffer();

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.1, 0.1, 0.1);

  let currentY = height - 200;

  // DATOS DEL PACIENTE
  firstPage.drawText('PACIENTE:', { x: 50, y: currentY, size: 8, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
  currentY -= 12;
  const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.toUpperCase();
  firstPage.drawText(patientName, { x: 50, y: currentY, size: 10, font: fontBold, color: textColor });

  // FECHA Y FOLIO
  firstPage.drawText(`FECHA: ${new Date(createdAt).toLocaleDateString('es-MX')}`, { x: width - 180, y: currentY, size: 9, font: font, color: textColor });
  currentY -= 12;
  firstPage.drawText(`FOLIO: ${prescriptionCode}`, { x: width - 180, y: currentY, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });

  currentY -= 30;

  // MEDICAMENTOS
  firstPage.drawText('RX / MEDICAMENTOS PRESCRITOS', { x: 50, y: currentY, size: 9, font: fontBold, color: textColor });
  currentY -= 15;

  (medications || []).forEach((med, idx) => {
    const medText = `${idx + 1}. ${med.medicamento} — ${med.dosis} (${med.via || 'Oral'}, c/${med.frecuencia}, por ${med.duracion})`;
    firstPage.drawText(medText, { x: 50, y: currentY, size: 9, font: font, color: textColor });
    currentY -= 14;
    if (med.indicaciones) {
      firstPage.drawText(`   Indicaciones: ${med.indicaciones}`, { x: 50, y: currentY, size: 8, font: font, color: rgb(0.3, 0.3, 0.3) });
      currentY -= 14;
    }
  });

  // INSTRUCCIONES ADICIONALES
  if (instructions) {
    currentY -= 10;
    firstPage.drawText('Instrucciones Adicionales:', { x: 50, y: currentY, size: 9, font: fontBold, color: textColor });
    currentY -= 12;
    firstPage.drawText(instructions, { x: 50, y: currentY, size: 8, font: font, color: textColor });
  }

  // FIRMA DEL DOCTOR
  const signatureY = 100;
  const doctorName = doctor?.profile ? `Dr(a). ${doctor.profile.first_name} ${doctor.profile.last_name}` : 'Dr(a). Tratante';
  
  firstPage.drawText(doctorName, { x: width / 2 - 80, y: signatureY + 25, size: 10, font: fontBold, color: textColor });
  firstPage.drawText(`Cédula Prof: ${doctor?.medical_license || 'S/N'} | ${doctor?.specialty || 'General'}`, { x: width / 2 - 100, y: signatureY + 12, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });

  if (doctor?.digital_signature_url) {
    try {
      const sigImageBytes = await fetch(doctor.digital_signature_url).then((res) => res.arrayBuffer());
      const sigImage = await pdfDoc.embedPng(sigImageBytes);
      firstPage.drawImage(sigImage, {
        x: width / 2 - 50,
        y: signatureY + 35,
        width: 100,
        height: 40,
      });
    } catch (e) {
      console.error('No se pudo incrustar la firma en el PDF:', e);
    }
  }

  const modifiedPdfBytes = await pdfDoc.save();
  const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export async function generateAndPrintPrescriptionPdf(params) {
  try {
    const blobUrl = await getMergedPdfBlobUrl(params);
    window.open(blobUrl, '_blank');
  } catch (error) {
    console.error('Error generando el PDF unificado:', error);
    alert('No se pudo generar el PDF con plantilla.');
  }
}