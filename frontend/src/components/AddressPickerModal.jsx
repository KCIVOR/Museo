import { useEffect, useMemo, useState } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from './MuseoModal';
import AddressModal from './AddressModal';
import '../styles/main.css';
import '../styles/components/buttons.css';

const API = import.meta.env.VITE_API_BASE;

/**
 * Reusable Address Picker Modal
 * - Lists user's saved addresses with radio selection
 * - Add / Edit / Delete management
 * - Returns selected address id (or full object if returnObject=true)
 */
export default function AddressPickerModal({
  isOpen,
  onClose,
  onSelect,              // function(addressId or address)
  initialSelectedId = '',
  returnObject = false,   // if true, returns full address object
}) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(initialSelectedId || '');

  // Child create/edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(initialSelectedId || '');
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const defaultAddressId = useMemo(() => {
    if (!Array.isArray(addresses) || addresses.length === 0) return '';
    const def = addresses.find(a => a.isDefault);
    return def?.userAddressId || addresses[0]?.userAddressId || '';
  }, [addresses]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API}/marketplace/addresses`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('loadAddresses failed:', res.status, text);
        setAddresses([]);
        setSelectedId('');
        setError('Failed to load addresses');
        return;
      }
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json?.data) ? json.data : [];
      setAddresses(list);
      // If nothing selected, prefer default, else first
      setSelectedId(prev => prev || initialSelectedId || (list.find(a => a.isDefault)?.userAddressId) || list[0]?.userAddressId || '');
    } catch (e) {
      console.error('loadAddresses error:', e);
      setError('Unable to load addresses. Please try again.');
      setAddresses([]);
      setSelectedId('');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingAddress(null);
    setShowForm(true);
  };

  const handleEdit = (addr) => {
    setEditingAddress(addr || null);
    setShowForm(true);
  };

  const handleDelete = async (addr) => {
    if (!addr?.userAddressId) return;
    const ok = window.confirm('Delete this address? This action cannot be undone.');
    if (!ok) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/marketplace/addresses/${addr.userAddressId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('delete failed:', res.status, text);
        alert('Failed to delete address');
        return;
      }
      await loadAddresses();
      // If we deleted selected, re-select default or first
      setSelectedId(prev => (prev === addr.userAddressId ? defaultAddressId : prev));
    } catch (e) {
      console.error('delete error:', e);
      alert('Failed to delete address');
    } finally {
      setLoading(false);
    }
  };

  const handleUseSelected = () => {
    if (!selectedId) {
      alert('Please select an address');
      return;
    }
    const addr = addresses.find(a => a.userAddressId === selectedId);
    onSelect?.(returnObject ? (addr || null) : selectedId);
    onClose?.();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  return (
    <>
      <MuseoModal
        open={isOpen}
        onClose={onClose}
        nested
        title="Select Shipping Address"
        subtitle="Choose an address or manage your saved addresses"
        size="lg"
      >
        <MuseoModalBody>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong>My Addresses</strong>
            <button className="btn btn-sm btn-secondary" type="button" onClick={handleAdd} disabled={loading}>
              + Add Address
            </button>
          </div>

          {error && (
            <div className="museo-message" style={{ color: 'var(--museo-error)', marginBottom: 8 }}>{error}</div>
          )}

          {loading ? (
            <div className="museo-message">Loading addresses…</div>
          ) : (
            <div className="pdm-address-list">
              {addresses.length === 0 ? (
                <div className="museo-message">No saved addresses yet.</div>
              ) : (
                addresses.map(addr => (
                  <div key={addr.userAddressId} className={`museo-card ${selectedId === addr.userAddressId ? 'is-selected' : ''}`} style={{ marginBottom: 8 }}>
                    <div className="museo-card__body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <input
                        type="radio"
                        name="shippingAddress"
                        value={addr.userAddressId}
                        checked={selectedId === addr.userAddressId}
                        onChange={() => setSelectedId(addr.userAddressId)}
                        style={{ marginTop: 6 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="museo-address-name" style={{ fontWeight: 600 }}>
                          {addr.fullName} {addr.isDefault ? <span className="museo-badge" style={{ marginLeft: 6 }}>Default</span> : null}
                        </div>
                        <div className="museo-address-line">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</div>
                        <div className="museo-address-line">{addr.barangayName}, {addr.cityMunicipalityName}, {addr.provinceName}, {addr.regionName} {addr.postalCode}</div>
                        <div className="museo-address-phone" style={{ color: 'var(--museo-text-muted)' }}>{addr.phoneNumber}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-secondary" type="button" onClick={() => handleEdit(addr)} disabled={loading}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-secondary" type="button" onClick={() => handleDelete(addr)} disabled={loading}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </MuseoModalBody>

        <MuseoModalActions>
          <button className="btn btn-sm btn-secondary" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-sm btn-primary" type="button" onClick={handleUseSelected} disabled={loading || !selectedId}>Use Selected Address</button>
        </MuseoModalActions>
      </MuseoModal>

      {showForm && (
        <AddressModal
          isOpen={showForm}
          nested
          onClose={closeForm}
          address={editingAddress}
          onAddressSaved={(list) => {
            // Refresh and try to keep selection
            const prev = new Set(addresses.map(a => a.userAddressId));
            setShowForm(false);
            loadAddresses().then(() => {
              // If a new address was added, select it
              if (Array.isArray(list)) {
                const newAddr = list.find(a => !prev.has(a.userAddressId));
                if (newAddr?.userAddressId) {
                  setSelectedId(newAddr.userAddressId);
                }
              }
            });
          }}
        />
      )}
    </>
  );
}
