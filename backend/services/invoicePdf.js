/**
 * Build subscription invoice PDFs entirely in memory — never written to disk
 * and never uploaded to Cloudinary. The buffer is attached directly to the
 * admin's invoice email at purchase time, then discarded.
 */
const PDFDocument = require('pdfkit');
const axios = require('axios');

async function fetchImage(url) {
  if (!url) return null;
  try {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 12000, maxContentLength: 4 * 1024 * 1024 });
    return Buffer.from(r.data);
  } catch (err) {
    console.warn('[invoicePdf] fetchImage failed', err.message);
    return null;
  }
}

function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function money(n) {
  return `INR ${Number(n || 0).toLocaleString('en-IN')}`;
}

/**
 * @param {object} input
 * @param {object} input.subscription   — Subscription doc/obj
 * @param {object} input.plan           — Plan doc/obj
 * @param {object} input.admin          — { name, username, email, phone }
 * @param {object} input.settings       — Settings doc (hospital name / logo / address)
 * @returns {Promise<Buffer>}
 */
async function buildInvoicePdf({ subscription, plan, admin, settings }) {
  const logoBuf = settings?.logoUrl ? await fetchImage(settings.logoUrl) : null;
  const companyName = settings?.hospitalName || 'Vijya Hospital';

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;
      const contentWidth = pageWidth - margin * 2;

      // ── Header band ──
      doc.save();
      doc.rect(0, 0, pageWidth, 100).fill('#0f48b3');
      if (logoBuf) {
        try { doc.image(logoBuf, margin, 22, { fit: [56, 56] }); } catch {}
      }
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
        .text(companyName, margin + (logoBuf ? 70 : 0), 30, { width: contentWidth - 70 });
      doc.font('Helvetica').fontSize(12)
        .text('Subscription Tax Invoice', margin + (logoBuf ? 70 : 0), 60, { width: contentWidth - 70 });
      doc.restore();

      doc.y = 120;

      // ── Invoice meta ──
      const metaTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('INVOICE NUMBER', margin, metaTop);
      doc.font('Helvetica').fontSize(12).fillColor('#0f172a').text(subscription.invoiceNumber || '—', margin, metaTop + 13);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text('INVOICE DATE', margin + contentWidth - 200, metaTop, { width: 200, align: 'right' });
      doc.font('Helvetica').fontSize(12).fillColor('#0f172a').text(fmtDateTime(subscription.createdAt || new Date()), margin + contentWidth - 200, metaTop + 13, { width: 200, align: 'right' });

      doc.y = metaTop + 44;

      // ── Billed To ──
      doc.save();
      doc.roundedRect(margin, doc.y, contentWidth, 92, 6).fill('#eef2fa');
      doc.fillColor('#0f48b3').font('Helvetica-Bold').fontSize(12).text('Billed To', margin + 14, doc.y + 12);
      let yy = doc.y + 32;
      const line = (label, val) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569').text(label.toUpperCase(), margin + 14, yy, { width: contentWidth - 28, continued: true });
        doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text('   ' + (val || '—'));
        yy += 16;
      };
      line('Name', admin?.name || admin?.username);
      line('Username', admin?.username);
      line('Email', admin?.email);
      if (admin?.phone) line('Phone', admin.phone);
      doc.restore();
      doc.y += 104;

      // ── Plan table ──
      const tableTop = doc.y;
      doc.save();
      doc.rect(margin, tableTop, contentWidth, 26).fill('#0f48b3');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
      doc.text('DESCRIPTION', margin + 12, tableTop + 8, { width: contentWidth * 0.55 });
      doc.text('PERIOD', margin + contentWidth * 0.55, tableTop + 8, { width: contentWidth * 0.25 });
      doc.text('AMOUNT', margin + contentWidth * 0.8, tableTop + 8, { width: contentWidth * 0.2 - 12, align: 'right' });
      doc.restore();

      const rowY = tableTop + 26;
      doc.save();
      doc.rect(margin, rowY, contentWidth, 50).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
        .text(`${subscription.planName || plan?.name || 'Subscription Plan'}${subscription.isRenewal ? ' (Renewal)' : ''}`, margin + 12, rowY + 10, { width: contentWidth * 0.55 - 12 });
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text(subscription.durationDays ? `${subscription.durationDays} days access` : '', margin + 12, rowY + 28, { width: contentWidth * 0.55 - 12 });

      doc.font('Helvetica').fontSize(9).fillColor('#0f172a')
        .text(`${fmtDate(subscription.startsAt)}\nto ${fmtDate(subscription.endsAt)}`, margin + contentWidth * 0.55, rowY + 12, { width: contentWidth * 0.25 });

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
        .text(money(subscription.amount), margin + contentWidth * 0.8, rowY + 18, { width: contentWidth * 0.2 - 12, align: 'right' });
      doc.restore();

      // ── Total ──
      const totalY = rowY + 60;
      doc.save();
      doc.roundedRect(margin + contentWidth * 0.5, totalY, contentWidth * 0.5, 36, 6).fill('#0f48b3');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
        .text('TOTAL PAID', margin + contentWidth * 0.5 + 14, totalY + 11);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14)
        .text(money(subscription.amount), margin + contentWidth * 0.5, totalY + 9, { width: contentWidth * 0.5 - 14, align: 'right' });
      doc.restore();
      doc.y = totalY + 56;

      // ── Payment details ──
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f48b3').text('Payment Details', margin, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(`Payment Status: PAID`, margin, doc.y);
      if (subscription.razorpayPaymentId) doc.text(`Payment ID: ${subscription.razorpayPaymentId}`, margin, doc.y);
      if (subscription.razorpayOrderId) doc.text(`Order ID: ${subscription.razorpayOrderId}`, margin, doc.y);
      doc.text(`Payment Method: Razorpay`, margin, doc.y);

      // ── Footer ──
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text(
          `This is a system-generated invoice from ${companyName}. Thank you for your subscription.`,
          margin,
          doc.page.height - 60,
          { width: contentWidth, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildInvoicePdf };
