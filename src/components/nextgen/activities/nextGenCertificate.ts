function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function mergeByteArrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return merged;
}

function createImagePdf(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number): Blob {
  const pageWidth = 842;
  const pageHeight = 595;
  const parts: Uint8Array[] = [];
  const objectOffsets: number[] = [0];
  let currentLength = 0;

  const appendBytes = (bytes: Uint8Array) => {
    parts.push(bytes);
    currentLength += bytes.length;
  };
  const appendText = (text: string) => appendBytes(encodeText(text));
  const markObject = (objectNumber: number) => {
    objectOffsets[objectNumber] = currentLength;
  };

  appendText('%PDF-1.4\n%NextGen\n');
  markObject(1);
  appendText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  markObject(2);
  appendText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  markObject(3);
  appendText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  markObject(4);
  appendText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  appendBytes(jpegBytes);
  appendText('\nendstream\nendobj\n');

  const contentBytes = encodeText(`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`);
  markObject(5);
  appendText(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  appendBytes(contentBytes);
  appendText('endstream\nendobj\n');

  const xrefOffset = currentLength;
  appendText('xref\n0 6\n0000000000 65535 f \n');
  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    appendText(`${String(objectOffsets[objectNumber]).padStart(10, '0')} 00000 n \n`);
  }
  appendText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const mergedBytes = mergeByteArrays(parts);
  const pdfBuffer = new ArrayBuffer(mergedBytes.byteLength);
  new Uint8Array(pdfBuffer).set(mergedBytes);
  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      value => value ? resolve(value) : reject(new Error('Unable to create the certificate image.')),
      'image/jpeg',
      0.96,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export async function downloadNextGenCertificate(params: {
  fullName: string;
  userId: string;
  createdAt: number;
  isArabic: boolean;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available in this browser.');

  const { fullName, userId, createdAt, isArabic } = params;
  const timestamp = new Date(createdAt).toLocaleString(isArabic ? 'ar-EG' : 'en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  context.fillStyle = '#f5f4f0';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#8b1e1e';
  context.lineWidth = 24;
  context.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);
  context.strokeStyle = '#d9b7b7';
  context.lineWidth = 5;
  context.strokeRect(82, 82, canvas.width - 164, canvas.height - 164);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.direction = isArabic ? 'rtl' : 'ltr';
  context.fillStyle = '#8b1e1e';
  context.font = '700 72px Arial, sans-serif';
  context.fillText(isArabic ? 'شهادة مستخدم NextGen' : 'NEXTGEN USER CERTIFICATE', 800, 205);
  context.fillStyle = '#5f5f5f';
  context.font = '400 31px Arial, sans-serif';
  context.fillText(isArabic ? 'تشهد هذه الوثيقة بتقديم طلب تسجيل NextGen باسم' : 'This document confirms that a NextGen registration request was submitted for', 800, 305);
  context.fillStyle = '#242424';
  context.font = '700 62px Arial, sans-serif';
  context.fillText(fullName, 800, 420);
  context.fillStyle = '#6b6b6b';
  context.font = '400 30px Arial, sans-serif';
  context.fillText(isArabic ? 'معرّف NextGen' : 'NEXTGEN IDENTIFIER', 800, 525);
  context.fillStyle = '#8b1e1e';
  context.font = '800 92px Arial, sans-serif';
  context.fillText(userId, 800, 625);
  context.fillStyle = '#641414';
  context.font = '700 30px Arial, sans-serif';
  context.fillText(isArabic ? 'حالة الطلب: في انتظار موافقة Pastor' : 'Request Status: Pending Pastor Approval', 800, 735);
  context.fillStyle = '#666666';
  context.font = '400 27px Arial, sans-serif';
  context.fillText(`${isArabic ? 'وقت التسجيل' : 'Registration timestamp'}: ${timestamp}`, 800, 820);
  context.fillStyle = '#8b1e1e';
  context.beginPath();
  context.arc(800, 910, 18, 0, Math.PI * 2);
  context.fill();

  const jpegBytes = await canvasToJpegBytes(canvas);
  const pdfBlob = createImagePdf(jpegBytes, canvas.width, canvas.height);
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `NextGen-Certificate-${userId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}
