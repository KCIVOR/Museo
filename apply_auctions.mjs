import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'frontend/src/pages/Marketplace/SellerDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state after statsLoading
const stateInsert = `
  // Auctions state
  const [productView, setProductView] = useState('inventory');
  const [auctionsTab, setAuctionsTab] = useState('items');
  const [auctionItems, setAuctionItems] = useState([]);
  const [auctionItemsLoading, setAuctionItemsLoading] = useState(false);
  const [sellerAuctions, setSellerAuctions] = useState([]);
  const [sellerAuctionsLoading, setSellerAuctionsLoading] = useState(false);
  const [auctionStatusFilter, setAuctionStatusFilter] = useState('');
  const [quickAuctionOpen, setQuickAuctionOpen] = useState(false);
  const [selectedAuctionItem, setSelectedAuctionItem] = useState(null);
  const [qa, setQa] = useState({ startPrice: '', reservePrice: '', minIncrement: 0, startAt: '', endAt: '' });`;

content = content.replace(
  'const [statsLoading, setStatsLoading] = useState(true);',
  'const [statsLoading, setStatsLoading] = useState(true);' + stateInsert
);

// 2. Add fetch functions after fetchProducts
const fetchFunctionsInsert = `

  // Fetch auction items owned by seller
  const fetchAuctionItems = async () => {
    try {
      setAuctionItemsLoading(true);
      const response = await fetch(\`\${API}/auctions/items/my-items\`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) setAuctionItems(result.data || []);
      else setAuctionItems([]);
    } catch (error) {
      console.error('Error fetching auction items:', error);
      setAuctionItems([]);
    } finally {
      setAuctionItemsLoading(false);
    }
  };

  // Fetch seller auctions
  const fetchSellerAuctions = async (status = '') => {
    try {
      setSellerAuctionsLoading(true);
      const url = status ? \`\${API}/auctions/seller/my-auctions?status=\${encodeURIComponent(status)}\` : \`\${API}/auctions/seller/my-auctions\`;
      const response = await fetch(url, { credentials: 'include' });
      const result = await response.json();
      if (result.success) setSellerAuctions(result.data || []);
      else setSellerAuctions([]);
    } catch (error) {
      console.error('Error fetching seller auctions:', error);
      setSellerAuctions([]);
    } finally {
      setSellerAuctionsLoading(false);
    }
  };

  const openQuickAuction = (item) => {
    setSelectedAuctionItem(item);
    setQa({ startPrice: '', reservePrice: '', minIncrement: 0, startAt: '', endAt: '' });
    setQuickAuctionOpen(true);
  };

  const activateAuctionNow = async (auctionId) => {
    try {
      const response = await fetch(\`\${API}/auctions/\${auctionId}/activate-now\`, { method: 'PUT', credentials: 'include' });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to activate auction');
      fetchSellerAuctions(auctionStatusFilter);
      alert('Auction activated');
    } catch (error) {
      alert(error.message || 'Failed to activate auction');
    }
  };`;

// Find the end of fetchProducts function and insert after it
const fetchProductsMatch = content.match(/const fetchProducts = async \(\) => \{[\s\S]*?\n  \};/);
if (fetchProductsMatch) {
  const insertIndex = content.indexOf(fetchProductsMatch[0]) + fetchProductsMatch[0].length;
  content = content.slice(0, insertIndex) + fetchFunctionsInsert + content.slice(insertIndex);
}

// 3. Update useEffect dependency array
content = content.replace(
  '], [userData, selectedPeriod, activeTab, orderFilter]);',
  '], [userData, selectedPeriod, activeTab, orderFilter, productView, auctionsTab, auctionStatusFilter]);'
);

// 4. Add auction fetch logic in useEffect
const useEffectAuctionLogic = `
      // Fetch auctions data when on My Products > Auctions
      if (activeTab === 'products' && productView === 'auctions') {
        if (auctionsTab === 'items') {
          fetchAuctionItems();
        } else if (auctionsTab === 'auctions') {
          fetchSellerAuctions(auctionStatusFilter);
        }
      }`;

content = content.replace(
  '      if (activeTab === \'orders\') {\n        fetchOrders(orderFilter === \'all\' ? null : orderFilter);\n      }\n    }\n  }, [userData, selectedPeriod, activeTab, orderFilter, productView, auctionsTab, auctionStatusFilter]);',
  '      if (activeTab === \'orders\') {\n        fetchOrders(orderFilter === \'all\' ? null : orderFilter);\n      }' + useEffectAuctionLogic + '\n    }\n  }, [userData, selectedPeriod, activeTab, orderFilter, productView, auctionsTab, auctionStatusFilter]);'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Auctions state and functions added to SellerDashboard.jsx');
