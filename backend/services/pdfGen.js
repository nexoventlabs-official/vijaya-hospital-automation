/**
 * Build appointment PDFs entirely in memory — never written to disk and never
 * uploaded to Cloudinary. The caller (chatbot / admin) decides whether to:
 *   • upload as media to WhatsApp (`metaCloud.uploadMedia`) and send by `media_id`, or
 *   • stream the buffer back over HTTP (admin "View / Print" button).
 */
const PDFDocument = require('pdfkit');
const axios = require('axios');

async function fetchImage(url) {
  if (!url) return null;
  try {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 12000, maxContentLength: 4 * 1024 * 1024 });
    return Buffer.from(r.data);
  } catch (err) {
    console.warn('[pdfGen] fetchImage failed', url, err.message);
    return null;
  }
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(`${d}T00:00:00`) : new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
}

function fmt12(time) {
  if (!time) return '—';
  const [h, m] = time.split(':');
  let hh = parseInt(h, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${m || '00'} ${ampm}`;
}

/**
 * Build an appointment PDF.
 * @param {object} input
 * @param {object} input.appointment
 * @param {object} input.settings    — Settings doc
 * @param {string} [input.title]     — header title (Booked / Rescheduled / Cancelled / Postponed)
 * @returns {Promise<Buffer>}
 */
async function buildAppointmentPdf({ appointment, settings, title = 'Appointment Confirmation' }) {
  const logoBuf = settings?.logoUrl ? await fetchImage(settings.logoUrl) : null;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;
      const contentWidth = pageWidth - margin * 2;

      // ── Header band ──
      doc.save();
      doc.rect(0, 0, pageWidth, 92).fill('#0f48b3');
      if (logoBuf) {
        try {
          doc.image(logoBuf, margin, 18, { fit: [56, 56] });
        } catch {}
      }
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
        .text(settings?.hospitalName || 'Vijya Hospital', margin + 70, 26, { width: contentWidth - 70 });
      doc.font('Helvetica').fontSize(11)
        .text(title, margin + 70, 56, { width: contentWidth - 70 });
      doc.restore();

      doc.y = 110;

      // ── Appointment code badge ──
      doc.save();
      doc.roundedRect(margin, doc.y, contentWidth, 38, 6).fill('#eef2fa');
      doc.fillColor('#0f48b3').font('Helvetica-Bold').fontSize(13)
        .text(`Appointment Code:  ${appointment.code}`, margin + 14, doc.y + 12, { width: contentWidth - 28 });
      doc.restore();
      doc.y += 50;

      // ── Patient + Doctor details (two columns) ──
      const colW = (contentWidth - 16) / 2;
      const startY = doc.y;

      const writeBlock = (xCol, y, heading, rows) => {
        doc.save();
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f48b3').text(heading, xCol, y, { width: colW });
        let yy = y + 18;
        for (const [k, v] of rows) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569').text(k.toUpperCase(), xCol, yy, { width: colW });
          doc.font('Helvetica').fontSize(11).fillColor('#0f172a').text(v || '—', xCol, yy + 11, { width: colW });
          yy += 30;
        }
        doc.restore();
        return yy;
      };

      const leftEnd = writeBlock(margin, startY, 'PATIENT', [
        ['Name', appointment.patientName],
        ['WhatsApp', `+${appointment.patientPhone}`],
        ['Age', appointment.patientAge ? String(appointment.patientAge) : ''],
        ['Gender', appointment.patientGender ? appointment.patientGender[0].toUpperCase() + appointment.patientGender.slice(1) : ''],
        ['Reason', appointment.reason],
      ]);
      const rightEnd = writeBlock(margin + colW + 16, startY, 'DOCTOR', [
        ['Doctor', appointment.doctorName],
        ['Department', appointment.departmentName],
        ['Speciality', appointment.doctorSpeciality],
        ['Date', fmtDate(appointment.date)],
        ['Time', appointment.timeLabel || fmt12(appointment.time)],
      ]);

      doc.y = Math.max(leftEnd, rightEnd) + 10;

      // ── Payment summary box ──
      doc.save();
      doc.roundedRect(margin, doc.y, contentWidth, 80, 6).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Payment', margin + 14, doc.y + 10);

      const lineY = doc.y + 32;
      doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Consultation Fee', margin + 14, lineY);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`₹${appointment.fee || 0}`, margin + contentWidth - 100, lineY, { width: 86, align: 'right' });

      doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Payment Method', margin + 14, lineY + 18);
      const methodLabel = appointment.paymentMode === 'online' ? 'Online' : 'Pay at Hospital';
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(methodLabel, margin + contentWidth - 200, lineY + 18, { width: 186, align: 'right' });

      doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Payment Status', margin + 14, lineY + 36);
      doc.font('Helvetica-Bold').fontSize(11)
        .fillColor(appointment.paymentStatus === 'paid' ? '#16a34a' : '#b45309')
        .text(appointment.paymentStatus === 'paid' ? 'PAID' : 'PENDING (Pay at reception)', margin + contentWidth - 240, lineY + 36, { width: 226, align: 'right' });
      doc.restore();
      doc.y += 90;

      // ── Postpone / cancel reason if present ──
      if (appointment.postponeReason) {
        doc.save();
        doc.roundedRect(margin, doc.y, contentWidth, 50, 6).fill('#fef3c7');
        doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(10).text('POSTPONED', margin + 14, doc.y + 10);
        doc.fillColor('#78350f').font('Helvetica').fontSize(10).text(appointment.postponeReason, margin + 14, doc.y + 24, { width: contentWidth - 28 });
        doc.restore();
        doc.y += 60;
      }
      if (appointment.status === 'cancelled' && appointment.cancellationReason) {
        doc.save();
        doc.roundedRect(margin, doc.y, contentWidth, 50, 6).fill('#fee2e2');
        doc.fillColor('#991b1b').font('Helvetica-Bold').fontSize(10).text('CANCELLED', margin + 14, doc.y + 10);
        doc.fillColor('#7f1d1d').font('Helvetica').fontSize(10).text(appointment.cancellationReason, margin + 14, doc.y + 24, { width: contentWidth - 28 });
        doc.restore();
        doc.y += 60;
      }

      // ── Hospital location footer ──
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f48b3').text('Hospital', margin, doc.y);
      doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(settings?.hospitalName || 'Vijya Hospital', { width: contentWidth });
      if (settings?.addressLine) doc.text(settings.addressLine, { width: contentWidth });
      if (settings?.contactPhone) doc.text(`Phone: ${settings.contactPhone}`, { width: contentWidth });

      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text(`Generated on ${new Date().toLocaleString('en-GB')}`, margin, doc.page.height - 40, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildAppointmentPdf };
