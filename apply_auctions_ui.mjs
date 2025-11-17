import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'frontend/src/pages/Marketplace/SellerDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the Products Tab section with sub-tabs for inventory and auctions
const oldProductsTab = `        {/* Products Tab */}
        {activeTab === 'products' && (
        <div className="museo-products-section">
          <div style={{
            marginBottom: 'var(--museo-space-4)'
          }}>
            <h2 className="museo-heading" style={{fontSize: 'var(--museo-text-2xl)'}}>Product Inventory</h2>
          </div>

          <div className="products-table-container">`;

const newProductsTab = `        {/* Products Tab */}
        {activeTab === 'products' && (
        <div className="museo-products-section">
          <div style={{
            marginBottom: 'var(--museo-space-4)'
          }}>
            <div className="museo-tabs museo-tabs--full">
              <button 
                className={\`museo-tab \${productView === 'inventory' ? 'museo-tab--active' : ''}\`}
                onClick={() => setProductView('inventory')}
              >
                Product Inventory
              </button>
              <button 
                className={\`museo-tab \${productView === 'auctions' ? 'museo-tab--active' : ''}\`}
                onClick={() => setProductView('auctions')}
              >
                Auctions
              </button>
            </div>
          </div>

          {productView === 'inventory' && (
          <div className="products-table-container">`;

content = content.replace(oldProductsTab, newProductsTab);

// Replace the closing of products table container
const oldProductsClose = `          </div>
        </div>
        )}`;

const newProductsClose = `          </div>
          )}

          {productView === 'auctions' && (
            <div>
              <div className="museo-tabs museo-tabs--full" style={{ marginBottom: 'var(--museo-space-3)' }}>
                <button className={\`museo-tab \${auctionsTab === 'items' ? 'museo-tab--active' : ''}\`} onClick={() => setAuctionsTab('items')}>Auction Items</button>
                <button className={\`museo-tab \${auctionsTab === 'auctions' ? 'museo-tab--active' : ''}\`} onClick={() => setAuctionsTab('auctions')}>My Auctions</button>
              </div>

              {auctionsTab === 'items' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--museo-space-3)' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddAuctionProduct}>Add Auction Item</button>
                  </div>
                  {auctionItemsLoading ? (
                    <div className="loading-state"><p>Loading auction items...</p></div>
                  ) : auctionItems.length > 0 ? (
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Title</th>
                          <th>Medium</th>
                          <th>Dimensions</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auctionItems.map(item => (
                          <tr key={item.auctionItemId}>
                            <td>
                              <img 
                                src={item.primary_image || 'https://via.placeholder.com/50'} 
                                alt={item.title}
                                className="product-thumbnail"
                              />
                            </td>
                            <td className="product-name">
                              <div>
                                <div className="product-title">{item.title}</div>
                              </div>
                            </td>
                            <td className="product-medium">{item.medium || 'N/A'}</td>
                            <td className="product-dimensions">{item.dimensions || 'N/A'}</td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn btn-ghost btn-sm" onClick={() => openQuickAuction(item)}>Create Auction</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state"><p>No auction items yet</p></div>
                  )}
                </div>
              )}

              {auctionsTab === 'auctions' && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginBottom: 'var(--museo-space-3)' }}>
                    <div>
                      <select className="museo-select museo-input--sm" value={auctionStatusFilter} onChange={(e) => setAuctionStatusFilter(e.target.value)}>
                        <option value="">All</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="active">Active</option>
                        <option value="ended">Ended</option>
                      </select>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => fetchSellerAuctions(auctionStatusFilter)}>Refresh</button>
                  </div>

                  {sellerAuctionsLoading ? (
                    <div className="loading-state"><p>Loading auctions...</p></div>
                  ) : sellerAuctions.length > 0 ? (
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Start Price</th>
                          <th>Min Inc.</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellerAuctions.map(a => (
                          <tr key={a.auctionId}>
                            <td className="product-name">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={a.auction_items?.primary_image || 'https://via.placeholder.com/50'} alt={a.auction_items?.title} className="product-thumbnail" />
                                <div className="product-title">{a.auction_items?.title || 'Untitled'}</div>
                              </div>
                            </td>
                            <td>₱{Number(a.startPrice || 0).toLocaleString()}</td>
                            <td>₱{Number(a.minIncrement || 0).toLocaleString()}</td>
                            <td>{new Date(a.startAt).toLocaleString()}</td>
                            <td>{new Date(a.endAt).toLocaleString()}</td>
                            <td><span className={\`status-badge \${a.status}\`}>{a.status}</span></td>
                            <td>
                              {a.status === 'scheduled' && (
                                <button className="btn btn-primary btn-sm" onClick={() => activateAuctionNow(a.auctionId)}>Activate Now</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state"><p>No auctions found</p></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        )}`;

content = content.replace(oldProductsClose, newProductsClose);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Auctions UI tabs and tables added to SellerDashboard.jsx');
