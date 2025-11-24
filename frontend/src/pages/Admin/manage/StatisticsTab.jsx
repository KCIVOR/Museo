import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import MuseoLoadingBox from "../../../components/MuseoLoadingBox";

const API = import.meta.env.VITE_API_BASE;

// Museo color palette for charts
const COLORS = ['#d4b48a', '#6e4a2e', '#8b6f47', '#4CAF50', '#FF9800'];

export default function StatisticsTab() {
  const [statisticsData, setStatisticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [dateRange, setDateRange] = useState('month'); // 'month', 'year', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadStatistics = async () => {
    setLoading(true);
    try {
      let queryParams = '';
      
      if (dateRange === 'month') {
        const [year, month] = selectedMonth.split('-');
        const startDate = `${selectedMonth}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
        queryParams = `?startDate=${startDate}&endDate=${endDate}`;
      } else if (dateRange === 'year') {
        const year = new Date().getFullYear();
        queryParams = `?startDate=${year}-01-01&endDate=${year}-12-31`;
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        queryParams = `?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      // 'all' has no date params
      
      const response = await fetch(`${API}/visit-bookings/stats${queryParams}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load statistics');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setStatisticsData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load statistics');
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
      alert(`Error loading statistics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [selectedMonth, dateRange, customStartDate, customEndDate]);

  return (
    <div className="museo-section">
      {/* Date Range Controls */}
      <div style={{
        display: 'flex',
        gap: 'var(--museo-space-3)',
        marginBottom: 'var(--museo-space-4)',
        padding: 'var(--museo-space-3)',
        background: 'var(--museo-bg-secondary)',
        borderRadius: 'var(--museo-border-radius-lg)',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: 'var(--museo-space-2)', alignItems: 'center' }}>
          <label style={{ fontSize: 'var(--museo-font-size-sm)', fontWeight: 'var(--museo-font-weight-medium)' }}>
            Range:
          </label>
          <select
            className="museo-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{ minWidth: '120px' }}
          >
            <option value="month">Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {dateRange === 'month' && (
          <input
            type="month"
            className="museo-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            max={new Date().toISOString().slice(0, 7)}
            style={{ width: 'auto' }}
          />
        )}

        {dateRange === 'custom' && (
          <>
            <input
              type="date"
              className="museo-input"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={{ width: 'auto' }}
              placeholder="Start Date"
            />
            <span style={{ color: 'var(--museo-text-muted)' }}>to</span>
            <input
              type="date"
              className="museo-input"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={customStartDate}
              max={new Date().toISOString().split('T')[0]}
              style={{ width: 'auto' }}
              placeholder="End Date"
            />
          </>
        )}

        <button
          className="btn btn-primary btn-sm"
          onClick={loadStatistics}
          disabled={loading}
          style={{ marginLeft: 'auto' }}
        >
          Refresh
        </button>
      </div>

      {loading && <MuseoLoadingBox />}

      {!loading && statisticsData && (
        <>
          {/* Stats Cards - Single Line Responsive */}
          <div style={{ 
            display: 'flex',
            gap: 'var(--museo-space-3)',
            marginBottom: 'var(--museo-space-6)',
            overflowX: 'auto',
            paddingBottom: 'var(--museo-space-2)',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          }}>
            {/* Total Actual Visitors */}
            <div className="museo-card" style={{
              padding: 'var(--museo-space-3)',
              border: '2px solid var(--museo-accent)',
              borderRadius: 'var(--museo-border-radius-lg)',
              background: 'linear-gradient(135deg, var(--museo-bg-primary), rgba(212, 180, 138, 0.05))',
              position: 'relative',
              overflow: 'hidden',
              minWidth: '180px',
              flex: '1 1 0',
              width: '100%'
            }}>
              <div style={{ 
                position: 'absolute',
                top: '0',
                right: '0',
                width: '120px',
                height: '120px',
                background: 'rgba(212, 180, 138, 0.15)',
                borderRadius: '50%',
                transform: 'translate(30px, -30px)'
              }}/>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--museo-space-3)', position: 'relative' }}>
                <div style={{ 
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--museo-accent), var(--museo-primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: 'var(--museo-text-muted)',
                    marginBottom: 'var(--museo-space-2)',
                    fontWeight: 'var(--museo-font-weight-normal)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Total Actual Visitors
                  </h4>
                  <p style={{ 
                    fontSize: '36px',
                    fontWeight: 'var(--museo-font-weight-bold)',
                    color: 'var(--museo-primary)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>
                    {statisticsData.totalVisitors || 0}
                  </p>
                  <span style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: 'var(--museo-text-muted)'
                  }}>
                    {statisticsData.visitorsByStatus?.approved || 0} approved visitors
                  </span>
                </div>
              </div>
            </div>
            
            {/* Total Bookings */}
            <div className="museo-card" style={{
              padding: 'var(--museo-space-3)',
              border: '1px solid var(--museo-border)',
              borderRadius: 'var(--museo-border-radius-lg)',
              background: 'var(--museo-bg-primary)',
              position: 'relative',
              overflow: 'hidden',
              minWidth: '160px',
              flex: '1 1 0',
              width: '100%'
            }}>
              <div style={{ 
                position: 'absolute',
                top: '0',
                right: '0',
                width: '100px',
                height: '100px',
                background: 'rgba(212, 180, 138, 0.1)',
                borderRadius: '50%',
                transform: 'translate(20px, -20px)'
              }}/>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--museo-space-3)', position: 'relative' }}>
                <div style={{ 
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(212, 180, 138, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--museo-primary)" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: 'var(--museo-text-muted)',
                    marginBottom: 'var(--museo-space-2)',
                    fontWeight: 'var(--museo-font-weight-normal)'
                  }}>
                    Total Bookings
                  </h4>
                  <p style={{ 
                    fontSize: '28px',
                    fontWeight: 'var(--museo-font-weight-bold)',
                    color: 'var(--museo-text-primary)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>
                    {statisticsData.total}
                  </p>
                  <span style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: 'var(--museo-text-muted)'
                  }}>
                    {dateRange === 'month' ? `${selectedMonth}` : 
                     dateRange === 'year' ? 'This year' : 
                     dateRange === 'all' ? 'All time' : 'Custom range'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Requests */}
            <div className="museo-card" style={{
              padding: 'var(--museo-space-3)',
              border: '1px solid var(--museo-border)',
              borderRadius: 'var(--museo-border-radius-lg)',
              background: 'var(--museo-bg-primary)',
              position: 'relative',
              overflow: 'hidden',
              minWidth: '160px',
              flex: '1 1 0',
              width: '100%'
            }}>
              <div style={{ 
                position: 'absolute',
                top: '0',
                right: '0',
                width: '100px',
                height: '100px',
                background: 'rgba(255, 152, 0, 0.1)',
                borderRadius: '50%',
                transform: 'translate(20px, -20px)'
              }}/>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--museo-space-3)', position: 'relative' }}>
                <div style={{ 
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 152, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: 'var(--museo-text-muted)',
                    marginBottom: 'var(--museo-space-2)',
                    fontWeight: 'var(--museo-font-weight-normal)'
                  }}>
                    Pending Requests
                  </h4>
                  <p style={{ 
                    fontSize: '28px',
                    fontWeight: 'var(--museo-font-weight-bold)',
                    color: 'var(--museo-text-primary)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>
                    {statisticsData.pending}
                  </p>
                  <span style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: '#FF9800'
                  }}>
                    Awaiting approval
                  </span>
                </div>
              </div>
            </div>

            {/* Approved Requests */}
            <div className="museo-card" style={{
              padding: 'var(--museo-space-3)',
              border: '1px solid var(--museo-border)',
              borderRadius: 'var(--museo-border-radius-lg)',
              background: 'var(--museo-bg-primary)',
              position: 'relative',
              overflow: 'hidden',
              minWidth: '160px',
              flex: '1 1 0',
              width: '100%'
            }}>
              <div style={{ 
                position: 'absolute',
                top: '0',
                right: '0',
                width: '100px',
                height: '100px',
                background: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '50%',
                transform: 'translate(20px, -20px)'
              }}/>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--museo-space-3)', position: 'relative' }}>
                <div style={{ 
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: 'var(--museo-text-muted)',
                    marginBottom: 'var(--museo-space-2)',
                    fontWeight: 'var(--museo-font-weight-normal)'
                  }}>
                    Approved Requests
                  </h4>
                  <p style={{ 
                    fontSize: '28px',
                    fontWeight: 'var(--museo-font-weight-bold)',
                    color: 'var(--museo-text-primary)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>
                    {statisticsData.approved}
                  </p>
                  <span style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: '#4CAF50'
                  }}>
                    Confirmed visits
                  </span>
                </div>
              </div>
            </div>

            {/* Rejected Requests */}
            <div className="museo-card" style={{
              padding: 'var(--museo-space-3)',
              border: '1px solid var(--museo-border)',
              borderRadius: 'var(--museo-border-radius-lg)',
              background: 'var(--museo-bg-primary)',
              position: 'relative',
              overflow: 'hidden',
              minWidth: '160px',
              flex: '1 1 0',
              width: '100%'
            }}>
              <div style={{ 
                position: 'absolute',
                top: '0',
                right: '0',
                width: '100px',
                height: '100px',
                background: 'rgba(244, 67, 54, 0.1)',
                borderRadius: '50%',
                transform: 'translate(20px, -20px)'
              }}/>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--museo-space-3)', position: 'relative' }}>
                <div style={{ 
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(244, 67, 54, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: 'var(--museo-text-muted)',
                    marginBottom: 'var(--museo-space-2)',
                    fontWeight: 'var(--museo-font-weight-normal)'
                  }}>
                    Rejected Requests
                  </h4>
                  <p style={{ 
                    fontSize: '28px',
                    fontWeight: 'var(--museo-font-weight-bold)',
                    color: 'var(--museo-text-primary)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>
                    {statisticsData.rejected}
                  </p>
                  <span style={{ 
                    fontSize: 'var(--museo-font-size-sm)',
                    color: '#f44336'
                  }}>
                    Declined visits
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visitor Type Breakdown with Pie Chart */}
          {statisticsData.byVisitorType && (
            <div className="museo-card" style={{
              padding: 'var(--museo-space-5)',
              border: '1px solid var(--museo-border)',
              borderRadius: 'var(--museo-border-radius-lg)',
              background: 'var(--museo-bg-primary)',
              marginTop: 'var(--museo-space-5)'
            }}>
              <h3 style={{
                fontSize: 'var(--museo-font-size-lg)',
                fontWeight: 'var(--museo-font-weight-bold)',
                marginBottom: 'var(--museo-space-4)',
                color: 'var(--museo-text-primary)'
              }}>
                VISITOR TYPE BREAKDOWN
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--museo-space-6)',
                alignItems: 'center'
              }}>
                {/* Pie Chart */}
                <div style={{ width: '100%', height: '350px', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Individual', 
                            value: statisticsData.visitorsByType?.individual || statisticsData.byVisitorType.individual || 0,
                            bookings: statisticsData.byVisitorType.individual || 0
                          },
                          { 
                            name: 'School', 
                            value: statisticsData.visitorsByType?.school || statisticsData.byVisitorType.school || 0,
                            bookings: statisticsData.byVisitorType.school || 0
                          },
                          { 
                            name: 'Organization', 
                            value: statisticsData.visitorsByType?.organization || statisticsData.byVisitorType.organization || 0,
                            bookings: statisticsData.byVisitorType.organization || 0
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats Cards */}
                <div style={{
                  display: 'grid',
                  gap: 'var(--museo-space-3)'
                }}>
                  <div style={{
                    padding: 'var(--museo-space-4)',
                    background: 'var(--museo-bg-secondary)',
                    borderRadius: 'var(--museo-border-radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--museo-space-2)' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: COLORS[0]
                      }}/>
                      <p style={{
                        fontSize: 'var(--museo-font-size-sm)',
                        color: 'var(--museo-text-muted)'
                      }}>
                        Individual
                      </p>
                    </div>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 'var(--museo-font-weight-bold)',
                      color: 'var(--museo-text-primary)'
                    }}>
                      {statisticsData.visitorsByType?.individual || 0} <span style={{ fontSize: '14px', color: 'var(--museo-text-muted)' }}>visitors</span>
                    </p>
                  </div>
                  
                  <div style={{
                    padding: 'var(--museo-space-4)',
                    background: 'var(--museo-bg-secondary)',
                    borderRadius: 'var(--museo-border-radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--museo-space-2)' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: COLORS[1]
                      }}/>
                      <p style={{
                        fontSize: 'var(--museo-font-size-sm)',
                        color: 'var(--museo-text-muted)'
                      }}>
                        School
                      </p>
                    </div>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 'var(--museo-font-weight-bold)',
                      color: 'var(--museo-text-primary)'
                    }}>
                      {statisticsData.visitorsByType?.school || 0} <span style={{ fontSize: '14px', color: 'var(--museo-text-muted)' }}>visitors</span>
                    </p>
                  </div>
                  
                  <div style={{
                    padding: 'var(--museo-space-4)',
                    background: 'var(--museo-bg-secondary)',
                    borderRadius: 'var(--museo-border-radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--museo-space-2)' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: COLORS[2]
                      }}/>
                      <p style={{
                        fontSize: 'var(--museo-font-size-sm)',
                        color: 'var(--museo-text-muted)'
                      }}>
                        Organization
                      </p>
                    </div>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 'var(--museo-font-weight-bold)',
                      color: 'var(--museo-text-primary)'
                    }}>
                      {statisticsData.visitorsByType?.organization || 0} <span style={{ fontSize: '14px', color: 'var(--museo-text-muted)' }}>visitors</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
