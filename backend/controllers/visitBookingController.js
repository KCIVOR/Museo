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

    // Prepare data for insertion
    const bookingData = {
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
      remarks: remarks || null,
      status: 'pending',
      user_id: req.user?.id || null // If user is authenticated
    };

    // Insert into database
    const { data, error } = await supabase
      .from('visit_bookings')
      .insert(bookingData)
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
      .from('visit_bookings')
      .select('*', { count: 'exact' });

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by visitor type
    if (visitorType) {
      query = query.eq('visitor_type', visitorType);
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('preferred_date', startDate);
    }
    if (endDate) {
      query = query.lte('preferred_date', endDate);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by creation date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

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
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data
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
      .from('visit_bookings')
      .select('*')
      .eq('visitId', id)  // Fixed: use visitId instead of id
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has permission to view this booking
    if (req.user?.role !== 'admin' && data.user_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data
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

    // Prepare update data
    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
    if (preferredDate) updateData.preferred_date = preferredDate;
    if (preferredTime !== undefined) updateData.preferred_time = preferredTime;

    const { data, error } = await supabase
      .from('visit_bookings')
      .update(updateData)
      .eq('visitId', id)  // Fixed: use visitId instead of id
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

    // TODO: Send notification email/SMS if status changed
    // if (status) {
    //   await sendStatusUpdateNotification(data);
    // }

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data
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
      .from('visit_bookings')
      .delete()
      .eq('visitId', id);  // Fixed: use visitId instead of id

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
    
    // Build query with optional date filtering
    let query = supabase.from('visit_bookings').select('*');
    
    if (startDate && endDate) {
      query = query
        .gte('preferred_date', startDate)
        .lte('preferred_date', endDate);
    }
    
    const { data: bookings, error } = await query;
    
    if (error) throw error;
    
    // Calculate statistics
    const stats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      approved: bookings.filter(b => b.status === 'approved').length,
      rejected: bookings.filter(b => b.status === 'rejected').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
    
    // Calculate total number of actual visitors
    stats.totalVisitors = bookings.reduce((sum, booking) => {
      return sum + (booking.number_of_visitors || 0);
    }, 0);
    
    // Calculate visitors by status
    stats.visitorsByStatus = {
      approved: bookings
        .filter(b => b.status === 'approved')
        .reduce((sum, b) => sum + (b.number_of_visitors || 0), 0),
      pending: bookings
        .filter(b => b.status === 'pending')
        .reduce((sum, b) => sum + (b.number_of_visitors || 0), 0)
    };
    
    // Get bookings by visitor type
    stats.byVisitorType = {
      individual: bookings.filter(b => b.visitor_type === 'individual').length,
      school: bookings.filter(b => b.visitor_type === 'school').length,
      organization: bookings.filter(b => b.visitor_type === 'organization').length
    };
    
    // Calculate actual visitors by type
    stats.visitorsByType = {
      individual: bookings
        .filter(b => b.visitor_type === 'individual')
        .reduce((sum, b) => sum + (b.number_of_visitors || 0), 0),
      school: bookings
        .filter(b => b.visitor_type === 'school')
        .reduce((sum, b) => sum + (b.number_of_visitors || 0), 0),
      organization: bookings
        .filter(b => b.visitor_type === 'organization')
        .reduce((sum, b) => sum + (b.number_of_visitors || 0), 0)
    };

    // Get upcoming bookings (next 30 days)
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: upcoming, error: upcomingError } = await supabase
      .from('visit_bookings')
      .select('*')
      .gte('preferred_date', today)
      .lte('preferred_date', thirtyDaysLater)
      .in('status', ['pending', 'approved'])
      .order('preferred_date', { ascending: true });

    if (upcomingError) throw upcomingError;

    stats.upcomingVisits = upcoming.length;
    stats.upcomingBookings = upcoming;

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
