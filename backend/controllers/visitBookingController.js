import supabase from '../database/db.js';

/**
 * Visit Booking Controller
 * Handles all visit booking operations
 */

// @desc    Submit a new visit booking
// @route   POST /api/visit-bookings
// @access  Public
export const createVisitBooking = async (req, res) => {
  try {
    const {
      visitorType,
      organizationName,
      howMany,
      classification,
      institutional,
      yearLevel,
      location,
      organizationDetails,
      contactName,
      contactEmail,
      contactPhone,
      preferredDate,
      preferredTime,
      purposeOfVisit,
      purposeOther,
      remarks
    } = req.body;

    // Validation
    if (!visitorType || !howMany || !location || !contactName || !contactEmail || !contactPhone || !preferredDate || !purposeOfVisit) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate visitor type
    if (!['individual', 'school', 'organization'].includes(visitorType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visitor type'
      });
    }

    // Validate number of visitors
    const numberOfVisitors = parseInt(howMany);
    if (isNaN(numberOfVisitors) || numberOfVisitors < 1) {
      return res.status(400).json({
        success: false,
        message: 'Number of visitors must be at least 1'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate date is not in the past
    const visitDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (visitDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Visit date cannot be in the past'
      });
    }

    // Prepare data for JSONB column
    const visitData = {
      visitor_type: visitorType,
      organization_name: visitorType !== 'individual' ? organizationName : null,
      number_of_visitors: numberOfVisitors,
      classification: visitorType === 'school' ? classification : null,
      year_level: visitorType === 'school' ? yearLevel : null,
      institutional_type: visitorType !== 'individual' ? institutional : null,
      location,
      organization_details: visitorType !== 'individual' ? organizationDetails : null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      preferred_date: preferredDate,
      preferred_time: preferredTime || null,
      purpose_of_visit: purposeOfVisit,
      purpose_other: purposeOfVisit === 'other' ? purposeOther : null,
      remarks: remarks || null
    };

    // Insert into unified request table
    const { data, error } = await supabase
      .from('request')
      .insert({
        userId: req.user?.id || null,
        requestType: 'visit_booking',
        status: 'pending',
        data: visitData
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit booking',
        error: error.message
      });
    }

    // TODO: Send confirmation email/SMS here
    // await sendBookingConfirmation(data);

    res.status(201).json({
      success: true,
      message: 'Visit booking submitted successfully! We will contact you within 24 hours.',
      data
    });

  } catch (error) {
    console.error('Error creating visit booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all visit bookings (Admin only)
// @route   GET /api/visit-bookings
// @access  Private/Admin
export const getAllVisitBookings = async (req, res) => {
  try {
    const { status, visitorType, startDate, endDate, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('request')
      .select('*', { count: 'exact' })
      .eq('requestType', 'visit_booking');

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by visitor type (now in JSONB data)
    if (visitorType) {
      query = query.filter('data->visitor_type', 'eq', visitorType);
    }

    // Filter by date range (now in JSONB data)
    if (startDate) {
      query = query.filter('data->preferred_date', 'gte', startDate);
    }
    if (endDate) {
      query = query.filter('data->preferred_date', 'lte', endDate);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by creation date (newest first)
    query = query.order('createdAt', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings',
        error: error.message
      });
    }

    // Transform data to match expected format
    const transformedData = data.map(item => ({
      visitId: item.requestId,
      user_id: item.userId,
      status: item.status,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      admin_notes: item.data.admin_notes || null,
      ...item.data  // Spread the JSONB data
    }));

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching visit bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single visit booking by ID
// @route   GET /api/visit-bookings/:id
// @access  Private/Admin or Owner
export const getVisitBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('request')
      .select('*')
      .eq('requestId', id)
      .eq('requestType', 'visit_booking')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has permission to view this booking
    if (req.user?.role !== 'admin' && data.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    // Transform data to match expected format
    const transformedData = {
      visitId: data.requestId,
      user_id: data.userId,
      status: data.status,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
      ...data.data  // Spread the JSONB data
    };

    res.status(200).json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching visit booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update visit booking status (Admin only)
// @route   PUT /api/visit-bookings/:id
// @access  Private/Admin
export const updateVisitBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, preferredDate, preferredTime } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Get existing data first
    const { data: existing, error: fetchError } = await supabase
      .from('request')
      .select('*')
      .eq('requestId', id)
      .eq('requestType', 'visit_booking')
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Prepare update data
    const updatedData = { ...existing.data };
    if (adminNotes !== undefined) updatedData.admin_notes = adminNotes;
    if (preferredDate) updatedData.preferred_date = preferredDate;
    if (preferredTime !== undefined) updatedData.preferred_time = preferredTime;

    const updateFields = {
      data: updatedData,
      updatedAt: new Date().toISOString()
    };
    if (status) updateFields.status = status;

    const { data, error } = await supabase
      .from('request')
      .update(updateFields)
      .eq('requestId', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update booking',
        error: error.message
      });
    }

    // Transform data to match expected format
    const transformedData = {
      visitId: data.requestId,
      user_id: data.userId,
      status: data.status,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
      ...data.data
    };

    // TODO: Send notification email/SMS if status changed
    // if (status) {
    //   await sendStatusUpdateNotification(transformedData);
    // }

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: transformedData
    });

  } catch (error) {
    console.error('Error updating visit booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete visit booking (Admin only)
// @route   DELETE /api/visit-bookings/:id
// @access  Private/Admin
export const deleteVisitBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('request')
      .delete()
      .eq('requestId', id)
      .eq('requestType', 'visit_booking');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete booking',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting visit booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get booking statistics (Admin only)
// @route   GET /api/visit-bookings/stats
// @access  Private/Admin
export const getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query from unified request table
    let query = supabase
      .from('request')
      .select('*')
      .eq('requestType', 'visit_booking');
    
    // Fetch all visit bookings first, then filter in JavaScript
    // (Supabase has limitations with JSONB date filtering)
    const { data: allRequests, error } = await query;
    
    if (error) throw error;
    
    // Apply date filtering in JavaScript
    let requests = allRequests || [];
    if (startDate && endDate) {
      requests = allRequests.filter(r => {
        const bookingDate = r.data?.preferred_date;
        if (!bookingDate) return false;
        return bookingDate >= startDate && bookingDate <= endDate;
      });
    }
    
    // Calculate statistics
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      completed: requests.filter(r => r.status === 'completed').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length
    };
    
    // Calculate total number of actual visitors
    stats.totalVisitors = requests.reduce((sum, request) => {
      return sum + (request.data?.number_of_visitors || 0);
    }, 0);
    
    // Calculate visitors by status
    stats.visitorsByStatus = {
      approved: requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.data?.number_of_visitors || 0), 0),
      pending: requests
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + (r.data?.number_of_visitors || 0), 0)
    };
    
    // Get bookings by visitor type
    stats.byVisitorType = {
      individual: requests.filter(r => r.data?.visitor_type === 'individual').length,
      school: requests.filter(r => r.data?.visitor_type === 'school').length,
      organization: requests.filter(r => r.data?.visitor_type === 'organization').length
    };
    
    // Calculate actual visitors by type
    stats.visitorsByType = {
      individual: requests
        .filter(r => r.data?.visitor_type === 'individual')
        .reduce((sum, r) => sum + (r.data?.number_of_visitors || 0), 0),
      school: requests
        .filter(r => r.data?.visitor_type === 'school')
        .reduce((sum, r) => sum + (r.data?.number_of_visitors || 0), 0),
      organization: requests
        .filter(r => r.data?.visitor_type === 'organization')
        .reduce((sum, r) => sum + (r.data?.number_of_visitors || 0), 0)
    };

    // Get upcoming bookings (next 30 days)
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: allUpcoming, error: upcomingError } = await supabase
      .from('request')
      .select('*')
      .eq('requestType', 'visit_booking')
      .in('status', ['pending', 'approved'])
      .order('createdAt', { ascending: true });

    if (upcomingError) throw upcomingError;

    // Filter upcoming bookings in JavaScript
    const upcomingRequests = (allUpcoming || []).filter(r => {
      const bookingDate = r.data?.preferred_date;
      if (!bookingDate) return false;
      return bookingDate >= today && bookingDate <= thirtyDaysLater;
    });

    stats.upcomingVisits = upcomingRequests.length;
    stats.upcomingBookings = upcomingRequests;

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's own bookings
// @route   GET /api/visit-bookings/my-bookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('visit_bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
