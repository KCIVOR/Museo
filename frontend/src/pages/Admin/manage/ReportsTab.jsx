import { useEffect, useMemo, useState } from "react";
import MuseoLoadingBox from "../../../components/MuseoLoadingBox";
import ConfirmModal from "../../Shared/ConfirmModal";
import ContentPreview from "../../../components/ContentPreview";

const API = import.meta.env.VITE_API_BASE;

export default function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { reportId, newStatus }
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const loadReports = async (page = 1, status = "all") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page,
        limit: 20
      });

      if (status !== "all") {
        params.append("status", status);
      }

      const response = await fetch(`${API}/reports?${params.toString()}`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Failed to load reports (${response.status})`);
      }

      const data = await response.json();

      if (data.success) {
        setReports(data.data || []);
        setPagination(data.pagination || {});
      } else {
        throw new Error(data.error || "Failed to load reports");
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(1, statusFilter);
  }, [statusFilter]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const term = searchQuery.toLowerCase();
    return reports.filter(
      (report) =>
        report.targetId?.toLowerCase().includes(term) ||
        report.reason?.toLowerCase().includes(term) ||
        report.targetType?.toLowerCase().includes(term)
    );
  }, [reports, searchQuery]);

  const handleStatusChange = async (reportId, newStatus) => {
    setPendingAction({ reportId, newStatus });
    setConfirmOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingAction) return;

    setUpdatingStatus(pendingAction.reportId);
    try {
      const response = await fetch(
        `${API}/reports/${pendingAction.reportId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: pendingAction.newStatus })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update report status");
      }

      const data = await response.json();
      if (data.success) {
        // Update the report in the list
        setReports(
          reports.map((r) =>
            r.reportId === pendingAction.reportId
              ? { ...r, status: pendingAction.newStatus }
              : r
          )
        );

        // Update selected report if it's open
        if (selectedReport?.reportId === pendingAction.reportId) {
          setSelectedReport({
            ...selectedReport,
            status: pendingAction.newStatus
          });
        }
      } else {
        throw new Error(data.error || "Failed to update report");
      }
    } catch (err) {
      console.error("Error updating report:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingStatus(null);
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "open":
        return "#ff6b6b";
      case "resolved":
        return "#51cf66";
      case "dismissed":
        return "#868e96";
      default:
        return "#495057";
    }
  };

  const getTargetTypeLabel = (type) => {
    const labels = {
      artwork: "Artwork",
      post: "Post",
      user: "User",
      comment: "Comment",
      marketplace_item: "Marketplace Item"
    };
    return labels[type] || type;
  };

  return (
    <div className="reports-tab">
      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#ffe0e0",
            color: "#c92a2a",
            borderRadius: "6px",
            marginBottom: "16px"
          }}
        >
          {error}
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <input
          type="text"
          placeholder="Search by target ID, reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "8px 12px",
            border: "1px solid var(--museo-border)",
            borderRadius: "6px",
            fontSize: "14px",
            fontFamily: "inherit"
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--museo-border)",
            borderRadius: "6px",
            fontSize: "14px",
            fontFamily: "inherit",
            backgroundColor: "white",
            cursor: "pointer"
          }}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Reports List */}
      {loading ? (
        <MuseoLoadingBox />
      ) : filteredReports.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "var(--museo-text-muted)"
          }}
        >
          <p>No reports found</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "12px"
          }}
        >
          {filteredReports.map((report) => (
            <div
              key={report.reportId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                border: "1px solid var(--museo-border)",
                borderRadius: "8px",
                backgroundColor: "var(--museo-bg-secondary)",
                transition: "all var(--museo-transition-base)",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--museo-bg-hover)";
                e.currentTarget.style.borderColor = "var(--museo-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--museo-bg-secondary)";
                e.currentTarget.style.borderColor = "var(--museo-border)";
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    marginBottom: "8px"
                  }}
                >
                  <span
                    style={{
                      backgroundColor: getStatusBadgeColor(report.status),
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      textTransform: "capitalize"
                    }}
                  >
                    {report.status}
                  </span>
                  <span
                    style={{
                      backgroundColor: "var(--museo-bg-tertiary)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {getTargetTypeLabel(report.targetType)}
                  </span>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <p
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "var(--museo-text)"
                    }}
                  >
                    Target ID: <code style={{ fontSize: "12px" }}>{report.targetId}</code>
                  </p>
                  {report.reason && (
                    <p
                      style={{
                        margin: "0",
                        fontSize: "13px",
                        color: "var(--museo-text-muted)"
                      }}
                    >
                      Reason: {report.reason}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--museo-text-muted)"
                  }}
                >
                  Reported on{" "}
                  {new Date(report.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginLeft: "16px"
                }}
              >
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setShowDetailModal(true);
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--museo-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all var(--museo-transition-base)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.hasMore && (
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button
            onClick={() => loadReports(pagination.page + 1, statusFilter)}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--museo-primary)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            Load More
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px"
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
                Report Details
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--museo-text-muted)"
                }}
              >
                ×
              </button>
            </div>

            {/* Reported Content Preview */}
            <ContentPreview 
              targetType={selectedReport.targetType} 
              targetId={selectedReport.targetId} 
            />

            {/* Report Info */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--museo-text-muted)",
                    marginBottom: "4px",
                    textTransform: "uppercase"
                  }}
                >
                  Report ID
                </label>
                <code
                  style={{
                    fontSize: "13px",
                    backgroundColor: "var(--museo-bg-secondary)",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    display: "block",
                    wordBreak: "break-all"
                  }}
                >
                  {selectedReport.reportId}
                </code>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px"
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--museo-text-muted)",
                      marginBottom: "4px",
                      textTransform: "uppercase"
                    }}
                  >
                    Target Type
                  </label>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                  >
                    {getTargetTypeLabel(selectedReport.targetType)}
                  </p>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--museo-text-muted)",
                      marginBottom: "4px",
                      textTransform: "uppercase"
                    }}
                  >
                    Target ID
                  </label>
                  <code
                    style={{
                      fontSize: "13px",
                      backgroundColor: "var(--museo-bg-secondary)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      wordBreak: "break-all"
                    }}
                  >
                    {selectedReport.targetId}
                  </code>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--museo-text-muted)",
                    marginBottom: "4px",
                    textTransform: "uppercase"
                  }}
                >
                  Reason
                </label>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: selectedReport.reason
                      ? "var(--museo-text)"
                      : "var(--museo-text-muted)"
                  }}
                >
                  {selectedReport.reason || "No reason provided"}
                </p>
              </div>

              {selectedReport.details && (
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--museo-text-muted)",
                      marginBottom: "4px",
                      textTransform: "uppercase"
                    }}
                  >
                    Details
                  </label>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "var(--museo-text)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}
                  >
                    {selectedReport.details}
                  </p>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px"
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--museo-text-muted)",
                      marginBottom: "4px",
                      textTransform: "uppercase"
                    }}
                  >
                    Status
                  </label>
                  <span
                    style={{
                      display: "inline-block",
                      backgroundColor: getStatusBadgeColor(selectedReport.status),
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: "600",
                      textTransform: "capitalize"
                    }}
                  >
                    {selectedReport.status}
                  </span>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--museo-text-muted)",
                      marginBottom: "4px",
                      textTransform: "uppercase"
                    }}
                  >
                    Reported By
                  </label>
                  <code
                    style={{
                      fontSize: "13px",
                      backgroundColor: "var(--museo-bg-secondary)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      wordBreak: "break-all"
                    }}
                  >
                    {selectedReport.reporterUserId}
                  </code>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px"
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--museo-text-muted)",
                      marginBottom: "4px",
                      textTransform: "uppercase"
                    }}
                  >
                    Created At
                  </label>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--museo-text-muted)"
                    }}
                  >
                    {new Date(selectedReport.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      }
                    )}
                  </p>
                </div>

                {selectedReport.updatedAt && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--museo-text-muted)",
                        marginBottom: "4px",
                        textTransform: "uppercase"
                      }}
                    >
                      Updated At
                    </label>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        color: "var(--museo-text-muted)"
                      }}
                    >
                      {new Date(selectedReport.updatedAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        }
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Change Actions */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                borderTop: "1px solid var(--museo-border)",
                paddingTop: "24px"
              }}
            >
              {selectedReport.status !== "resolved" && selectedReport.status !== "dismissed" && (
                <button
                  onClick={() =>
                    handleStatusChange(selectedReport.reportId, "resolved")
                  }
                  disabled={updatingStatus === selectedReport.reportId}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    backgroundColor: "#51cf66",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor:
                      updatingStatus === selectedReport.reportId
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      updatingStatus === selectedReport.reportId ? 0.6 : 1
                  }}
                >
                  {updatingStatus === selectedReport.reportId
                    ? "Updating..."
                    : "Mark as Resolved"}
                </button>
              )}

              {selectedReport.status !== "dismissed" && (
                <button
                  onClick={() =>
                    handleStatusChange(selectedReport.reportId, "dismissed")
                  }
                  disabled={updatingStatus === selectedReport.reportId}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    backgroundColor: "#868e96",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor:
                      updatingStatus === selectedReport.reportId
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      updatingStatus === selectedReport.reportId ? 0.6 : 1
                  }}
                >
                  {updatingStatus === selectedReport.reportId
                    ? "Updating..."
                    : "Dismiss"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Update Report Status"
        message={`Are you sure you want to mark this report as ${pendingAction?.newStatus}?`}
        onConfirm={confirmStatusChange}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingAction(null);
        }}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
}
