import { useState } from "react";
import RequestsTab from "../Admin/manage/RequestsTab";
import StatisticsTab from "../Admin/manage/StatisticsTab";
import UsersTab from "../Admin/manage/UsersTab";
import AdminReturnsTab from "../Admin/manage/AdminReturnsTab";
import "../../styles/main.css";

export default function ManagePage() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'returns', 'statistics', 'users'

  return (
    <div className={`museo-page ${activeTab === 'requests' ? 'museo-tab--active' : ''}`}>
      <div className="museo-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header with Tabs */}
        <header className="museo-header" style={{ marginBottom: 'var(--museo-space-6)' }}>
          <h1 className="museo-heading">
            Admin Management
          </h1>
          
          {/* Tab Navigation */}
          <nav className="museo-tabs" style={{ 
            display: 'flex',
            gap: '0',
            borderBottom: '2px solid var(--museo-border)',
            marginBottom: '0'
          }}>
            <button
              className={`museo-tab ${activeTab === 'requests' ? 'museo-tab--active' : ''}`}
              onClick={() => setActiveTab('requests')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--museo-space-3) var(--museo-space-4)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'requests' ? '3px solid var(--museo-primary)' : '3px solid transparent',
                color: activeTab === 'requests' ? 'var(--museo-primary)' : 'var(--museo-text-muted)',
                fontWeight: 'var(--museo-font-weight-medium)',
                fontSize: 'var(--museo-font-size-base)',
                cursor: 'pointer',
                transition: 'all var(--museo-transition-base)',
                marginBottom: '-2px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Requests
            </button>

            <button
              className={`museo-tab ${activeTab === 'returns' ? 'museo-tab--active' : ''}`}
              onClick={() => setActiveTab('returns')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--museo-space-3) var(--museo-space-4)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'returns' ? '3px solid var(--museo-primary)' : '3px solid transparent',
                color: activeTab === 'returns' ? 'var(--museo-primary)' : 'var(--museo-text-muted)',
                fontWeight: 'var(--museo-font-weight-medium)',
                fontSize: 'var(--museo-font-size-base)',
                cursor: 'pointer',
                transition: 'all var(--museo-transition-base)',
                marginBottom: '-2px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <polyline points="8 3 4 7 8 11"/>
                <path d="M4 7h9a4 4 0 1 1 0 8H6"/>
              </svg>
              Returns
            </button>
            
            <button
              className={`museo-tab ${activeTab === 'statistics' ? 'museo-tab--active' : ''}`}
              onClick={() => setActiveTab('statistics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--museo-space-3) var(--museo-space-4)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'statistics' ? '3px solid var(--museo-primary)' : '3px solid transparent',
                color: activeTab === 'statistics' ? 'var(--museo-primary)' : 'var(--museo-text-muted)',
                fontWeight: 'var(--museo-font-weight-medium)',
                fontSize: 'var(--museo-font-size-base)',
                cursor: 'pointer',
                transition: 'all var(--museo-transition-base)',
                marginBottom: '-2px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              Statistics
            </button>
            
            <button
              className={`museo-tab ${activeTab === 'users' ? 'museo-tab--active' : ''}`}
              onClick={() => setActiveTab('users')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--museo-space-3) var(--museo-space-4)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'users' ? '3px solid var(--museo-primary)' : '3px solid transparent',
                color: activeTab === 'users' ? 'var(--museo-primary)' : 'var(--museo-text-muted)',
                fontWeight: 'var(--museo-font-weight-medium)',
                fontSize: 'var(--museo-font-size-base)',
                cursor: 'pointer',
                transition: 'all var(--museo-transition-base)',
                marginBottom: '-2px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Manage Users
            </button>
          </nav>
        </header>

        {/* Tab Content */}
        <div className="museo-tab-content">
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'returns' && <AdminReturnsTab />}
          {activeTab === 'statistics' && <StatisticsTab />}
          {activeTab === 'users' && <UsersTab />}
        </div>
      </div>
    </div>
  );
}
