import db from '../database/db.js';

// POST /api/reports
export async function createReport(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { targetType, targetId, reason, details } = req.body;

    // Insert with reporter from auth
    const { data, error } = await db
      .from('reports')
      .insert([
        {
          targetType,
          targetId,
          reason: reason || null,
          details: details || null,
          reporterUserId: userId,
          status: 'open'
        }
      ])
      .select()
      .single();

    if (error) {
      // Unique constraint friendly message
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('ux_reports_open_per_reporter_target')) {
        return res.status(409).json({
          success: false,
          error: 'You already have an open report for this item'
        });
      }
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('createReport error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// GET /api/reports (admin)
export async function listReports(req, res) {
  try {
    const { status, targetType, targetId, reporterUserId, page, limit } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    let query = db
      .from('reports')
      .select('*')
      .order('createdAt', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status) query = query.eq('status', status);
    if (targetType) query = query.eq('targetType', targetType);
    if (targetId) query = query.eq('targetId', targetId);
    if (reporterUserId) query = query.eq('reporterUserId', reporterUserId);

    const { data, error } = await query;
    if (error) return res.status(400).json({ success: false, error: error.message });

    res.json({
      success: true,
      data,
      pagination: { page: pageNum, limit: limitNum, count: data?.length || 0, hasMore: (data?.length || 0) === limitNum }
    });
  } catch (err) {
    console.error('listReports error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// GET /api/reports/:reportId (admin)
export async function getReportById(req, res) {
  try {
    const { reportId } = req.params;
    const { data, error } = await db
      .from('reports')
      .select('*')
      .eq('reportId', reportId)
      .single();

    if (error) return res.status(404).json({ success: false, error: 'Report not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('getReportById error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// PATCH /api/reports/:reportId (admin)
export async function updateReport(req, res) {
  try {
    const { reportId } = req.params;
    const { status, reason, details } = req.body || {};

    const update = { updatedAt: new Date().toISOString() };
    if (status !== undefined) update.status = status;
    if (reason !== undefined) update.reason = reason;
    if (details !== undefined) update.details = details;

    const { data, error } = await db
      .from('reports')
      .update(update)
      .eq('reportId', reportId)
      .select()
      .single();

    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, data });
  } catch (err) {
    console.error('updateReport error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export default {
  createReport,
  listReports,
  getReportById,
  updateReport
};
