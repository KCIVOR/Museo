import { useEffect, useMemo, useState } from "react";
import MuseoLoadingBox from "../../../components/MuseoLoadingBox";
import ConfirmModal from "../../Shared/ConfirmModal";
import ContentPreview from "../../../components/ContentPreview";
import MuseoModal, { MuseoModalBody, MuseoModalSection, MuseoModalActions } from "../../../components/MuseoModal.jsx";

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
      case "rejected":
        return "#868e96";
      default:
        return "#495057";
    }
  };

  // Use Museo badge variants from styles/components/badges.css
  const getStatusBadgeClass = (status) => {
    switch (String(status)) {
      case "open":
      case "triage":
      case "inProgress":
        return "museo-badge museo-badge--info";
      case "resolved":
        return "museo-badge museo-badge--success";
      case "rejected":
        return "museo-badge museo-badge--error";
      case "duplicate":
        return "museo-badge museo-badge--warning";
      default:
        return "museo-badge";
    }
  };

  const getTargetTypeLabel = (type) => {
    const labels = {
      artwork: "Artwork",
      post: "Post",
      user: "User",
      profile: "Profile",
      comment: "Comment",
      galleryPost: "Gallery Post",
      marketplace_item: "Marketplace Item",
      marketplaceItem: "Marketplace Item",
      order: "Order",
      orderItem: "Order Item",
      auction: "Auction",
      auctionItem: "Auction Item"
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
          className="museo-input"
          style={{ flex: 1, minWidth: "200px" }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="museo-dropdown"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
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
              className="museo-card"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                  <span className={getStatusBadgeClass(report.status)} style={{ textTransform: "uppercase" }}>
                    {report.status}
                  </span>
                  <span className="museo-badge museo-badge--primary">
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
                  {(report.reason || report.reasonSummary) && (
                    <p
                      style={{
                        margin: "0",
                        fontSize: "13px",
                        color: "var(--museo-text-muted)"
                      }}
                    >
                      Reason: {report.reason || report.reasonSummary}
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

              <div style={{ display: "flex", gap: "8px", marginLeft: "16px" }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSelectedReport(report);
                    setShowDetailModal(true);
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
        <MuseoModal
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Report Details"
          size="lg"
        >
          <MuseoModalBody>
            <MuseoModalSection>
              <ContentPreview targetType={selectedReport.targetType} targetId={selectedReport.targetId} />
            </MuseoModalSection>

            <MuseoModalSection>
              <div style={{ marginBottom: "16px" }}>
                <label className="museo-label">Report ID</label>
                <code style={{ fontSize: "13px", backgroundColor: "var(--museo-bg-secondary)", padding: "8px 12px", borderRadius: "4px", display: "block", wordBreak: "break-all" }}>
                  {selectedReport.reportId}
                </code>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="museo-label">Target Type</label>
                  <span className="museo-badge museo-badge--primary">{getTargetTypeLabel(selectedReport.targetType)}</span>
                </div>
                <div>
                  <label className="museo-label">Target ID</label>
                  <code style={{ fontSize: "13px", backgroundColor: "var(--museo-bg-secondary)", padding: "4px 8px", borderRadius: "4px", wordBreak: "break-all" }}>{selectedReport.targetId}</code>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="museo-label">Reason</label>
                <p style={{ margin: 0, fontSize: "14px", color: selectedReport.reason ? "var(--museo-text)" : "var(--museo-text-muted)" }}>
                  {selectedReport.reason || "No reason provided"}
                </p>
              </div>

              {selectedReport.details && (
                <div style={{ marginBottom: "16px" }}>
                  <label className="museo-label">Details</label>
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--museo-text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {selectedReport.details}
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="museo-label">Status</label>
                  <span className={getStatusBadgeClass(selectedReport.status)}>{selectedReport.status}</span>
                </div>
                <div>
                  <label className="museo-label">Reported By</label>
                  <code style={{ fontSize: "13px", backgroundColor: "var(--museo-bg-secondary)", padding: "4px 8px", borderRadius: "4px", wordBreak: "break-all" }}>{selectedReport.reporterUserId}</code>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="museo-label">Created At</label>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--museo-text-muted)" }}>
                    {new Date(selectedReport.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {selectedReport.updatedAt && (
                  <div>
                    <label className="museo-label">Updated At</label>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--museo-text-muted)" }}>
                      {new Date(selectedReport.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
              </div>
            </MuseoModalSection>
          </MuseoModalBody>
          <MuseoModalActions>
            {selectedReport.status !== "resolved" && selectedReport.status !== "rejected" && (
              <button
                className="btn btn-success"
                onClick={() => handleStatusChange(selectedReport.reportId, "resolved")}
                disabled={updatingStatus === selectedReport.reportId}
              >
                {updatingStatus === selectedReport.reportId ? "Updating..." : "Mark as Resolved"}
              </button>
            )}
            {selectedReport.status !== "rejected" && (
              <button
                className="btn btn-danger"
                onClick={() => handleStatusChange(selectedReport.reportId, "rejected")}
                disabled={updatingStatus === selectedReport.reportId}
              >
                {updatingStatus === selectedReport.reportId ? "Updating..." : "Reject"}
              </button>
            )}
          </MuseoModalActions>
        </MuseoModal>
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
