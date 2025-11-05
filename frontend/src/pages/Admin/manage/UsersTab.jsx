import { useEffect, useMemo, useState } from "react";
import MuseoLoadingBox from "../../../components/MuseoLoadingBox";
import ConfirmModal from "../../Shared/ConfirmModal";

const API = import.meta.env.VITE_API_BASE;

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [pendingRoleChanges, setPendingRoleChanges] = useState({}); // Track role changes
  const [savingRole, setSavingRole] = useState(null); // Track which user role is being saved
  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(false);
  const [roleChangeToConfirm, setRoleChangeToConfirm] = useState(null); // { userId, newRole, userName }

  const loadUsers = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/users/admin/all?page=${page}&limit=20`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load users (${response.status})`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
        setPendingRoleChanges({}); // Clear pending changes on reload
      } else {
        throw new Error(data.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      alert(`Error loading users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const term = userSearchQuery.toLowerCase();
    return users.filter(user => 
      user.username?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(term)
    );
  }, [users, userSearchQuery]);

  const handleRoleChange = (userId, newRole) => {
    // Find the original role
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Track the pending change
    setPendingRoleChanges(prev => ({
      ...prev,
      [userId]: newRole
    }));
  };

  const requestRoleChange = (userId) => {
    const newRole = pendingRoleChanges[userId];
    if (!newRole) return;

    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Show confirmation modal
    setRoleChangeToConfirm({
      userId,
      newRole,
      userName: `${user.firstName} ${user.lastName}`,
      currentRole: user.role
    });
    setShowRoleConfirmModal(true);
  };

  const confirmRoleChange = async () => {
    if (!roleChangeToConfirm) return;

    const { userId, newRole } = roleChangeToConfirm;
    setShowRoleConfirmModal(false);
    setSavingRole(userId);

    try {
      const response = await fetch(`${API}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      // Remove from pending changes
      setPendingRoleChanges(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });

      // Success - role updated silently
    } catch (error) {
      console.error('Error updating role:', error);
      alert(`Error: ${error.message}`);
      // Reload users to revert the change
      loadUsers();
    } finally {
      setSavingRole(null);
      setRoleChangeToConfirm(null);
    }
  };

  const cancelRoleChange = (userId) => {
    setPendingRoleChanges(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  const handleStatusToggle = async (userId) => {
    // Implement status toggle API call
    console.log('Toggling status for user', userId);
    // Update local state optimistically
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, isActive: !user.isActive } : user
    ));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="museo-section">
      {/* Search Bar */}
      <div className="museo-toolbar" style={{ 
        display: 'flex',
        gap: 'var(--museo-space-3)',
        marginBottom: 'var(--museo-space-4)',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <input
            type="search"
            className="museo-input"
            placeholder="Search users by name, email, or username..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
          />
        </div>
        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => loadUsers(1)}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--museo-space-2)'
          }}
        >
          <span style={{ fontSize: '18px' }}>↻</span>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && <MuseoLoadingBox />}

      {!loading && filteredUsers.length === 0 && (
        <div className="museo-empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <h3>No users found</h3>
          <p>{userSearchQuery ? 'Try a different search term' : 'No users in the system'}</p>
        </div>
      )}

      {!loading && filteredUsers.length > 0 && (
        <div style={{ 
          overflowX: 'auto',
          border: '1px solid var(--museo-border)',
          borderRadius: 'var(--museo-border-radius-lg)',
          background: 'var(--museo-bg-primary)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 'var(--museo-font-size-sm)'
          }}>
            <thead>
              <tr style={{ 
                borderBottom: '2px solid var(--museo-border)',
                background: 'var(--museo-bg-secondary)'
              }}>
                <th style={{ 
                  padding: 'var(--museo-space-4)',
                  textAlign: 'left',
                  fontWeight: 'var(--museo-font-weight-bold)',
                  color: 'var(--museo-text-primary)',
                  fontSize: 'var(--museo-font-size-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>User</th>
                <th style={{ 
                  padding: 'var(--museo-space-4) var(--museo-space-3)', 
                  textAlign: 'left',
                  fontWeight: 'var(--museo-font-weight-bold)',
                  fontSize: 'var(--museo-font-size-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Email</th>
                <th style={{ 
                  padding: 'var(--museo-space-4) var(--museo-space-3)', 
                  textAlign: 'left',
                  fontWeight: 'var(--museo-font-weight-bold)',
                  fontSize: 'var(--museo-font-size-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Role</th>
                <th style={{ 
                  padding: 'var(--museo-space-4) var(--museo-space-3)', 
                  textAlign: 'left',
                  fontWeight: 'var(--museo-font-weight-bold)',
                  fontSize: 'var(--museo-font-size-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Status</th>
                <th style={{ 
                  padding: 'var(--museo-space-4) var(--museo-space-3)', 
                  textAlign: 'left',
                  fontWeight: 'var(--museo-font-weight-bold)',
                  fontSize: 'var(--museo-font-size-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} style={{
                  borderBottom: '1px solid var(--museo-border)',
                  transition: 'background var(--museo-transition-base)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--museo-bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}>
                  <td style={{ padding: 'var(--museo-space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--museo-space-3)' }}>
                      <img 
                        src={user.avatar || 'https://via.placeholder.com/40'} 
                        alt={user.username}
                        style={{ 
                          width: '40px', 
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--museo-border)'
                        }}
                      />
                      <div>
                        <p style={{ 
                          fontWeight: 'var(--museo-font-weight-medium)',
                          color: 'var(--museo-text-primary)',
                          marginBottom: '4px',
                          fontSize: 'var(--museo-font-size-sm)'
                        }}>
                          {user.firstName} {user.lastName}
                        </p>
                        <p style={{ 
                          color: 'var(--museo-text-muted)',
                          fontSize: 'var(--museo-font-size-xs)'
                        }}>
                          @{user.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={{ 
                    padding: 'var(--museo-space-4) var(--museo-space-3)',
                    color: 'var(--museo-text-secondary)',
                    fontSize: 'var(--museo-font-size-sm)'
                  }}>
                    {user.email}
                  </td>
                  <td style={{ padding: 'var(--museo-space-4) var(--museo-space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--museo-space-2)' }}>
                      <select 
                        className="museo-select"
                        value={pendingRoleChanges[user.id] || user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        style={{ 
                          minWidth: '120px',
                          fontSize: 'var(--museo-font-size-sm)',
                          padding: 'var(--museo-space-2) var(--museo-space-3)'
                        }}
                      >
                        <option value="user">User</option>
                        <option value="artist">Artist</option>
                      </select>
                      
                      {pendingRoleChanges[user.id] && pendingRoleChanges[user.id] !== user.role && (
                        <div style={{ display: 'flex', gap: 'var(--museo-space-1)' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => requestRoleChange(user.id)}
                            disabled={savingRole === user.id}
                            style={{ 
                              padding: 'var(--museo-space-1) var(--museo-space-2)',
                              fontSize: 'var(--museo-font-size-xs)'
                            }}
                          >
                            {savingRole === user.id ? '...' : '✓'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => cancelRoleChange(user.id)}
                            disabled={savingRole === user.id}
                            style={{ 
                              padding: 'var(--museo-space-1) var(--museo-space-2)',
                              fontSize: 'var(--museo-font-size-xs)'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--museo-space-4) var(--museo-space-3)' }}>
                    <span 
                      className={`museo-badge museo-badge--${user.isActive ? 'success' : 'error'}`}
                      onClick={() => handleStatusToggle(user.id)}
                      style={{ 
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--museo-space-4) var(--museo-space-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--museo-space-2)' }}>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                      >
                        View
                      </button>
                      <button className="btn btn-ghost btn-sm">
                        Message
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredUsers.length > 0 && pagination.totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'var(--museo-space-3)',
          marginTop: 'var(--museo-space-4)',
          padding: 'var(--museo-space-4)',
          borderTop: '1px solid var(--museo-border)'
        }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => loadUsers(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            ← Previous
          </button>
          
          <span style={{
            fontSize: 'var(--museo-font-size-sm)',
            color: 'var(--museo-text-secondary)'
          }}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
          </span>
          
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => loadUsers(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div 
          className="museo-modal-overlay" 
          onClick={() => setShowUserModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="museo-modal museo-modal--md"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--museo-bg-primary)',
              borderRadius: 'var(--museo-border-radius-lg)',
              padding: 0,
              maxWidth: '600px',
              width: '90%'
            }}
          >
            <div className="museo-modal__header" style={{
              padding: 'var(--museo-space-4)',
              borderBottom: '1px solid var(--museo-border)'
            }}>
              <h2 className="museo-heading">User Details</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowUserModal(false)}
                style={{ position: 'absolute', top: 'var(--museo-space-3)', right: 'var(--museo-space-3)' }}
              >
                ✕
              </button>
            </div>
            
            <div className="museo-modal__body" style={{ padding: 'var(--museo-space-4)' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 'var(--museo-space-4)'
              }}>
                <img 
                  className="museo-avatar museo-avatar--lg"
                  src={selectedUser.avatar}
                  alt={selectedUser.username}
                  style={{ width: '100px', height: '100px', marginBottom: 'var(--museo-space-3)' }}
                />
                <h3 className="museo-heading museo-heading--sm">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <p className="museo-text--muted">@{selectedUser.username}</p>
              </div>

              <div className="museo-info-list" style={{ 
                display: 'grid',
                gap: 'var(--museo-space-3)'
              }}>
                <div className="museo-info-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 'var(--museo-space-2) 0',
                  borderBottom: '1px solid var(--museo-border)'
                }}>
                  <span className="museo-label">Email</span>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="museo-info-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 'var(--museo-space-2) 0',
                  borderBottom: '1px solid var(--museo-border)'
                }}>
                  <span className="museo-label">Role</span>
                  <span className={`museo-badge museo-badge--${
                    selectedUser.role === 'admin' ? 'warning' : 
                    selectedUser.role === 'artist' ? 'success' : 'default'
                  }`}>
                    {selectedUser.role}
                  </span>
                </div>
                <div className="museo-info-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 'var(--museo-space-2) 0',
                  borderBottom: '1px solid var(--museo-border)'
                }}>
                  <span className="museo-label">Status</span>
                  <span className={`museo-badge museo-badge--${selectedUser.isActive ? 'success' : 'error'}`}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="museo-info-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 'var(--museo-space-2) 0',
                  borderBottom: '1px solid var(--museo-border)'
                }}>
                  <span className="museo-label">Joined</span>
                  <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
                {selectedUser.role === 'artist' && (
                  <div className="museo-info-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: 'var(--museo-space-2) 0',
                    borderBottom: '1px solid var(--museo-border)'
                  }}>
                    <span className="museo-label">Artworks</span>
                    <span>{selectedUser.artworksCount}</span>
                  </div>
                )}
                {selectedUser.eventsCount > 0 && (
                  <div className="museo-info-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: 'var(--museo-space-2) 0',
                    borderBottom: '1px solid var(--museo-border)'
                  }}>
                    <span className="museo-label">Events</span>
                    <span>{selectedUser.eventsCount}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="museo-modal__footer" style={{
              padding: 'var(--museo-space-4)',
              borderTop: '1px solid var(--museo-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--museo-space-3)'
            }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowUserModal(false)}
              >
                Close
              </button>
              <button className="btn btn-primary btn-sm">
                View Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      <ConfirmModal
        open={showRoleConfirmModal && roleChangeToConfirm}
        title="Confirm Role Change"
        message={
          roleChangeToConfirm 
            ? `Are you sure you want to change the role of ${roleChangeToConfirm.userName} from "${roleChangeToConfirm.currentRole}" to "${roleChangeToConfirm.newRole}"? This will update their permissions and access level.`
            : ''
        }
        confirmText="Confirm Change"
        cancelText="Cancel"
        onConfirm={confirmRoleChange}
        onCancel={() => {
          setShowRoleConfirmModal(false);
          setRoleChangeToConfirm(null);
        }}
      />
    </div>
  );
}
