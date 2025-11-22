# Password Reset - Backend Integration

## Overview
Password reset functionality has been moved to the backend with proper validation, error handling, and security measures.

## Backend Implementation

### 1. **authController.js** - Two New Endpoints

#### `requestPasswordReset()`
**Purpose:** Send password reset email to user

**Endpoint:** `POST /api/auth/request-password-reset`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "message": "Password reset link sent to your email. Check your inbox!",
  "success": true
}
```

**Response (Error):**
```json
{
  "message": "Failed to send reset email"
}
```

**Features:**
- Email validation
- Calls Supabase `resetPasswordForEmail()`
- Redirects to `/auth/reset-password` on email link click
- Logging for audit trail
- Error handling

---

#### `resetPassword()`
**Purpose:** Update user password after clicking email link

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Response (Success):**
```json
{
  "message": "Password reset successfully!",
  "success": true
}
```

**Response (Error):**
```json
{
  "message": "Passwords do not match"
}
```

**Validation:**
- Password length ≥ 8 characters
- Passwords match
- Valid session (access token in cookies)
- All fields required

---

### 2. **authRoutes.js** - Route Definitions

**Added Routes:**
```javascript
POST /api/auth/request-password-reset
POST /api/auth/reset-password
```

**Validation:**
- Email format validation
- Password strength validation (min 8 chars)
- Request body sanitization
- Unknown fields stripped

---

## Frontend Integration

### 1. **ForgotPasswordModal.jsx** - Updated

**Changes:**
- Replaced Supabase direct call with backend API
- Calls `POST /api/auth/request-password-reset`
- Passes email in request body
- Handles backend responses

**Code:**
```javascript
const response = await fetch(`${API}/auth/request-password-reset`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email })
});
```

---

### 2. **ResetPassword.jsx** - Updated

**Changes:**
- Replaced Supabase direct call with backend API
- Calls `POST /api/auth/reset-password`
- Passes password and confirmPassword in request body
- Sends access token via cookies

**Code:**
```javascript
const response = await fetch(`${API}/auth/reset-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ password, confirmPassword })
});
```

---

## Flow Diagram

```
User clicks "Forgot your password?"
    ↓
ForgotPasswordModal opens
    ↓
User enters email
    ↓
Frontend: POST /api/auth/request-password-reset
    ↓
Backend: requestPasswordReset()
    ├─ Validate email
    ├─ Call Supabase resetPasswordForEmail()
    ├─ Log attempt
    └─ Return success/error
    ↓
User receives email with reset link
    ↓
User clicks link in email
    ↓
Redirected to /auth/reset-password with session
    ↓
ResetPassword page loads
    ↓
User enters new password
    ↓
Frontend: POST /api/auth/reset-password
    ↓
Backend: resetPassword()
    ├─ Validate inputs
    ├─ Validate session (access token)
    ├─ Call Supabase updateUser()
    └─ Return success/error
    ↓
Password updated
    ↓
Redirect to login
    ↓
User logs in with new password
```

---

## Security Features

✅ **Backend Validation**
- Email format validation
- Password strength requirements (8+ chars)
- Password confirmation matching
- Session validation

✅ **Error Handling**
- Graceful error messages
- No sensitive data in responses
- Proper HTTP status codes

✅ **Logging**
- Password reset attempts logged
- Audit trail for security

✅ **Session Management**
- Access token validation
- Secure cookie handling

---

## Environment Variables

**Required in `.env`:**
```
VITE_API_BASE=http://localhost:3000/api
FRONTEND_URL=http://localhost:5173
```

**Backend uses:**
- `FRONTEND_URL` - For email redirect link
- Supabase credentials (already configured)

---

## Testing Checklist

- [ ] Click "Forgot your password?" on login page
- [ ] Enter email address
- [ ] Click "Send Reset Link"
- [ ] Check backend logs for success message
- [ ] Receive email with reset link
- [ ] Click link in email
- [ ] ResetPassword page loads
- [ ] Enter new password
- [ ] Confirm password matches
- [ ] Click "Reset Password"
- [ ] See success message
- [ ] Redirect to login
- [ ] Log in with new password
- [ ] Old password no longer works

---

## API Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/auth/request-password-reset` | Send reset email | No |
| POST | `/api/auth/reset-password` | Update password | Yes (session) |

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | "Email is required" | Missing email field |
| 400 | "Failed to send reset email" | Supabase error |
| 400 | "All fields are required" | Missing password fields |
| 400 | "Password must be at least 8 characters long" | Weak password |
| 400 | "Passwords do not match" | Confirmation mismatch |
| 401 | "Invalid or expired reset link" | No valid session |
| 500 | "An error occurred. Please try again." | Server error |

---

## Files Modified

### Backend:
- `backend/controllers/authController.js` - Added 2 new functions
- `backend/routes/authRoutes.js` - Added 2 new routes

### Frontend:
- `frontend/src/pages/Auth/ForgotPasswordModal.jsx` - Updated to use backend API
- `frontend/src/pages/Auth/ResetPassword.jsx` - Updated to use backend API

---

## Deployment Notes

1. **Backend must be running** before testing frontend
2. **Supabase email templates** must be configured
3. **FRONTEND_URL** environment variable must be set correctly
4. **Email service** must be enabled in Supabase

---

## Future Enhancements

1. **Rate Limiting** - Limit reset requests per email (3 per hour)
2. **Audit Logging** - Store attempts in database
3. **Email Customization** - Brand the reset email
4. **2FA** - Optional two-factor authentication
5. **Password History** - Prevent reusing recent passwords
6. **Admin Dashboard** - View password reset attempts
