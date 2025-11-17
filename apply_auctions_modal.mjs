import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'frontend/src/pages/Marketplace/SellerDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add Quick Create Auction Modal after AddAuctionProductModal
const modalInsert = `

      {/* Quick Create Auction Modal */}
      <MuseoModal
        open={quickAuctionOpen}
        onClose={() => setQuickAuctionOpen(false)}
        title={selectedAuctionItem ? \`Create Auction: \${selectedAuctionItem.title}\` : 'Create Auction'}
        size="md"
      >
        <MuseoModalBody>
          <div className="museo-form-group">
            <label className="museo-label museo-label--required">Starting Price (₱)</label>
            <input type="number" className="museo-input" value={qa.startPrice} onChange={(e) => setQa({ ...qa, startPrice: e.target.value })} min="0" step="0.01" />
          </div>
          <div className="museo-form-group">
            <label className="museo-label">Reserve Price (₱)</label>
            <input type="number" className="museo-input" value={qa.reservePrice} onChange={(e) => setQa({ ...qa, reservePrice: e.target.value })} min="0" step="0.01" />
          </div>
          <div className="museo-form-group">
            <label className="museo-label">Minimum Increment (₱)</label>
            <input type="number" className="museo-input" value={qa.minIncrement} onChange={(e) => setQa({ ...qa, minIncrement: e.target.value })} min="0" step="0.01" />
          </div>
          <div className="form-row">
            <div className="museo-form-group" style={{ flex: 1 }}>
              <label className="museo-label museo-label--required">Start Time</label>
              <input type="datetime-local" className="museo-input" value={qa.startAt} onChange={(e) => setQa({ ...qa, startAt: e.target.value })} />
            </div>
            <div className="museo-form-group" style={{ flex: 1 }}>
              <label className="museo-label museo-label--required">End Time</label>
              <input type="datetime-local" className="museo-input" value={qa.endAt} onChange={(e) => setQa({ ...qa, endAt: e.target.value })} />
            </div>
          </div>
        </MuseoModalBody>
        <MuseoModalActions>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuickAuctionOpen(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={async () => {
            if (!qa.startPrice || !qa.endAt || !selectedAuctionItem) return alert('Please set Start Price and End Time');
            try {
              const payload = {
                auctionItemId: selectedAuctionItem.auctionItemId,
                startPrice: parseFloat(qa.startPrice),
                reservePrice: qa.reservePrice ? parseFloat(qa.reservePrice) : null,
                minIncrement: qa.minIncrement ? parseFloat(qa.minIncrement) : 0,
                startAt: qa.startAt ? new Date(qa.startAt).toISOString() : new Date().toISOString(),
                endAt: new Date(qa.endAt).toISOString(),
              };
              const response = await fetch(\`\${API}/auctions\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
              });
              const result = await response.json();
              if (!result.success) throw new Error(result.error || 'Failed to create auction');
              setQuickAuctionOpen(false);
              fetchSellerAuctions(auctionStatusFilter);
              alert('Auction created successfully');
            } catch (error) {
              alert(error.message || 'Failed to create auction');
            }
          }} disabled={!qa.startPrice || !qa.endAt}>Create Auction</button>
        </MuseoModalActions>
      </MuseoModal>`;

// Find the AddAuctionProductModal and insert after it
const addAuctionModalMatch = content.match(/<AddAuctionProductModal[\s\S]*?\/>/);
if (addAuctionModalMatch) {
  const insertIndex = content.indexOf(addAuctionModalMatch[0]) + addAuctionModalMatch[0].length;
  content = content.slice(0, insertIndex) + modalInsert + content.slice(insertIndex);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Quick Create Auction modal added to SellerDashboard.jsx');
