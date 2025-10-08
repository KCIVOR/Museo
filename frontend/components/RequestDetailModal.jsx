import "./RequestDetailModal.css";
import { useRef } from "react";

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
    <div className="rdm-overlay" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <article
        role="dialog"
        aria-modal="true"
        aria-label="Request Details"
        className="rdm-dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="rdm-header no-print">
          <h2 className="rdm-title">Request Details</h2>
          <div className="rdm-actions">
            <button className="rdm-pdf-btn" onClick={handleDownloadPDF} aria-label="Download PDF">
              📄 Download PDF
            </button>
            <button className="rdm-print-btn" onClick={handlePrint} aria-label="Print">
              🖨️ Print
            </button>
            <button className="rdm-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="rdm-content" ref={contentRef}>
          {/* Print-only header */}
          <h1 className="rdm-print-header no-screen">REQUEST DETAILS REPORT</h1>
          
          {/* Header Section */}
          <div className="rdm-section">
            <div className="rdm-header-info">
              <div>
                <span className="rdm-badge">{type.replace(/_/g, ' ')}</span>
                <span className={`rdm-status rdm-status--${status}`}>{status}</span>
              </div>
              <div className="rdm-meta-small">
                <span>Request ID: <strong>{id}</strong></span>
                {request.userId && <span>User ID: <strong>{request.userId}</strong></span>}
              </div>
            </div>
          </div>

          {/* Personal Information */}
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
