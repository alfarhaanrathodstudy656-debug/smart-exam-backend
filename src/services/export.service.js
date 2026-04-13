const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

const generateCSVBuffer = (rows) => {
  const parser = new Parser({
    fields: [
      'submissionId',
      'testTitle',
      'subject',
      'studentName',
      'studentEmail',
      'status',
      'totalScore',
      'submittedAt',
      'answerCount'
    ]
  });

  const csv = parser.parse(rows);
  return Buffer.from(csv, 'utf8');
};

const generatePDFBuffer = (rows, title = 'Smart Exam Results Export') => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(18).text(title, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`Generated At: ${new Date().toISOString()}`);
  doc.moveDown(1);

  rows.forEach((row, index) => {
    doc.fontSize(11).fillColor('#111').text(`${index + 1}. ${row.studentName} - ${row.testTitle}`);
    doc.fontSize(9).fillColor('#333').text(
      `Score: ${row.totalScore} | Status: ${row.status} | Email: ${row.studentEmail} | Submitted: ${row.submittedAt}`
    );
    doc.moveDown(0.35);

    if (doc.y > 760) {
      doc.addPage();
    }
  });

  doc.end();
});

module.exports = {
  generateCSVBuffer,
  generatePDFBuffer
};
