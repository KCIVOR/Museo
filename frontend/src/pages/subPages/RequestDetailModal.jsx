import { useRef } from "react";
import "./css/RequestDetailModal.css";

export default function RequestDetailModal({ open, request, onClose }) {
  const contentRef = useRef(null);

  if (!open || !request) return null;

  const data = request.data || {};
  const imgs = Array.isArray(data.images) ? data.images : [];
  const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ');
  const type = request.requestType || request.type || 'unknown';
  const status = (data.status || request.status || 'pending').toLowerCase();
  const id = request.id || request.requestId;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Add print class to apply formal styles
      document.body.classList.add('generating-pdf');
      const element = contentRef.current;
      
      const opt = {
        margin: [19, 19, 19, 19], // 0.75 inch margins in mm
        filename: `request-${id}-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          allowTaint: true,
          imageTimeout: 0,
          removeContainer: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['css', 'legacy'],
          before: '.rdm-images-section',
          avoid: '.rdm-image-wrapper'
        }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try printing instead.');
    } finally {
      document.body.classList.remove('generating-pdf');
    }
  };

  return (
    <div className="museo-modal-overlay" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <article
        role="dialog"
        aria-modal="true"
        aria-label="Request Details"
        className="museo-modal museo-modal--lg rdm-dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="rdm-header no-print">
          <h2 className="rdm-title">Request Details</h2>
          <div className="rdm-actions">
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleDownloadPDF} 
              aria-label="Download PDF"
            >
              📄 Download PDF
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handlePrint} 
              aria-label="Print"
            >
              🖨️ Print
            </button>
            <button 
              className="btn-x btn-x--ghost" 
              onClick={onClose} 
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="rdm-content" ref={contentRef}>
          {/* Print-only header */}
          <h1 className="rdm-print-header no-screen">REQUEST DETAILS REPORT</h1>
          
          {/* Header Section */}
          <div className="rdm-section">
            <div className="rdm-header-info">
              <div>
                <span className="museo-badge museo-badge--primary">{type.replace(/_/g, ' ')}</span>
                <span className={`museo-badge ${
                  status === 'approved' ? 'museo-badge--success' : 
                  status === 'rejected' ? 'museo-badge--error' : 
                  'museo-badge--warning'
                }`}>{status}</span>
              </div>
              <div className="rdm-meta-small">
                <span>Request ID: <strong>{id}</strong></span>
                {request.userId && <span>User ID: <strong>{request.userId}</strong></span>}
              </div>
            </div>
          </div>

          {/* Visit Booking Information */}
          {type === 'visit_booking' ? (
            <>
              {/* Visitor Information */}
              <div className="rdm-section rdm-visit-booking-section">
                <h3 className="rdm-section-title">🏛️ Visitor Information</h3>
                <div className="rdm-grid">
                  <div className="rdm-field full-width rdm-highlight">
                    <label>Visitor Type:</label>
                    <span className="rdm-badge">{data.visitorType?.replace('_', ' ').toUpperCase() || '—'}</span>
                  </div>
                  {data.organizationName && (
                    <div className="rdm-field full-width">
                      <label>{data.visitorType === 'school' ? 'School Name:' : 'Organization Name:'}</label>
                      <span>{data.organizationName}</span>
                    </div>
                  )}
                  <div className="rdm-field">
                    <label>Number of Visitors:</label>
                    <span><strong>{data.numberOfVisitors || '—'}</strong> people</span>
                  </div>
                  <div className="rdm-field">
                    <label>Location:</label>
                    <span>{data.location || '—'}</span>
                  </div>
                  {data.classification && (
                    <div className="rdm-field">
                      <label>Classification:</label>
                      <span>{data.classification}</span>
                    </div>
                  )}
                  {data.yearLevel && (
                    <div className="rdm-field">
                      <label>Year Level:</label>
                      <span>{data.yearLevel}</span>
                    </div>
                  )}
                  {data.institutionalType && (
                    <div className="rdm-field">
                      <label>Institutional Type:</label>
                      <span>{data.institutionalType?.replace(/-/g, ' ')}</span>
                    </div>
                  )}
                  {data.organizationDetails && (
                    <div className="rdm-field full-width">
                      <label>Organization Details:</label>
                      <span>{data.organizationDetails}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Person */}
              <div className="rdm-section">
                <h3 className="rdm-section-title">👤 Contact Person</h3>
                <div className="rdm-grid">
                  <div className="rdm-field full-width">
                    <label>Full Name:</label>
                    <span>{data.contactName || '—'}</span>
                  </div>
                  <div className="rdm-field">
                    <label>Email:</label>
                    <span>{data.contactEmail || '—'}</span>
                  </div>
                  <div className="rdm-field">
                    <label>Phone:</label>
                    <span>{data.contactPhone || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Visit Details */}
              <div className="rdm-section rdm-visit-details-section">
                <h3 className="rdm-section-title">📅 Visit Details</h3>
                <div className="rdm-grid">
                  <div className="rdm-field rdm-highlight-green">
                    <label>Preferred Date:</label>
                    <span><strong>{data.preferredDate || '—'}</strong></span>
                  </div>
                  <div className="rdm-field">
                    <label>Preferred Time:</label>
                    <span>{data.preferredTime ? data.preferredTime.charAt(0).toUpperCase() + data.preferredTime.slice(1) : 'Any time'}</span>
                  </div>
                  <div className="rdm-field full-width">
                    <label>Purpose of Visit:</label>
                    <span>{data.purposeOfVisit?.replace(/-/g, ' ') || '—'}</span>
                  </div>
                  {data.purposeOther && (
                    <div className="rdm-field full-width">
                      <label>Purpose Details:</label>
                      <span>{data.purposeOther}</span>
                    </div>
                  )}
                  {data.remarks && (
                    <div className="rdm-field full-width rdm-remarks">
                      <label>Special Requests / Remarks:</label>
                      <span>{data.remarks}</span>
                    </div>
                  )}
                  {data.adminNotes && (
                    <div className="rdm-field full-width rdm-admin-notes">
                      <label>Admin Notes:</label>
                      <span>{data.adminNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Personal Information for regular requests */
            <div className="rdm-section">
              <h3 className="rdm-section-title">Personal Information</h3>
              <div className="rdm-grid">
                {name && <div className="rdm-field"><label>Full Name:</label><span>{name}</span></div>}
                {data.phone && <div className="rdm-field"><label>Phone:</label><span>{data.phone}</span></div>}
                {data.email && <div className="rdm-field"><label>Email:</label><span>{data.email}</span></div>}
                {data.age && <div className="rdm-field"><label>Age:</label><span>{data.age}</span></div>}
                {data.sex && <div className="rdm-field"><label>Sex:</label><span>{data.sex}</span></div>}
                {data.birthdate && <div className="rdm-field"><label>Birthdate:</label><span>{data.birthdate}</span></div>}
                {data.address && <div className="rdm-field full-width"><label>Address:</label><span>{data.address}</span></div>}
              </div>
            </div>
          )}

          {/* Artwork Information (if applicable) */}
          {(data.artworkTitle || data.artId || data.startingPrice || data.reservePrice) && (
            <div className="rdm-section">
              <h3 className="rdm-section-title">Artwork Information</h3>
              <div className="rdm-grid">
                {data.artworkTitle && <div className="rdm-field"><label>Artwork Title:</label><span>{data.artworkTitle}</span></div>}
                {data.artId && <div className="rdm-field"><label>Art ID:</label><span>{data.artId}</span></div>}
                {data.startingPrice && <div className="rdm-field"><label>Starting Price:</label><span>{data.startingPrice}</span></div>}
                {data.reservePrice && <div className="rdm-field"><label>Reserve Price:</label><span>{data.reservePrice}</span></div>}
                {data.auctionStart && <div className="rdm-field"><label>Auction Start:</label><span>{data.auctionStart}</span></div>}
                {data.auctionEnd && <div className="rdm-field"><label>Auction End:</label><span>{data.auctionEnd}</span></div>}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {data.title && (
            <div className="rdm-section">
              <h3 className="rdm-section-title">Additional Information</h3>
              <div className="rdm-field full-width">
                <label>Title:</label>
                <span>{data.title}</span>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="rdm-section rdm-timestamps-section">
            <h3 className="rdm-section-title">Request Information</h3>
            <div className="rdm-timestamps">
              {request.createdAt && (
                <div className="rdm-timestamp">
                  <label>Submitted:</label>
                  <span>{new Date(request.createdAt).toLocaleString()}</span>
                </div>
              )}
              {request.updatedAt && (
                <div className="rdm-timestamp">
                  <label>Last Updated:</label>
                  <span>{new Date(request.updatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Attached Images - Page 2 */}
          {imgs.length > 0 && (
            <div className="rdm-section rdm-images-section">
              <h3 className="rdm-section-title">ATTACHED DOCUMENTS</h3>
              <div className="rdm-images">
                {imgs.map((src, i) => (
                  <div key={i} className="rdm-image-wrapper">
                    <img src={src} alt={`Attachment ${i + 1}`} className="rdm-image" />
                    <p className="rdm-image-caption">Document {i + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
