# Forgot Password Implementation Guide

## Overview
Complete forgot password flow implemented using Supabase authentication with email-based password reset. All components use the Museo design system from the style folder for consistent, professional styling.

## Components Created

### 1. **ForgotPasswordModal.jsx**
Located: `frontend/src/pages/Auth/ForgotPasswordModal.jsx`

**Features:**
- Modal dialog for password reset request
- Two-step UI:
  - **Step 1**: Email input form
  - **Step 2**: Success confirmation message
- Uses Supabase `resetPasswordForEmail()` method
- Email validation and error handling
- Loading states during API calls

**Props:**
```jsx
<ForgotPasswordModal 
  isOpen={boolean}      // Controls modal visibility
  onClose={function}    // Callback when modal closes
/>
```

**Key Functions:**
- `handleSendReset()` - Sends password reset email via Supabase
- `handleClose()` - Resets state and closes modal

---

### 2. **ResetPassword.jsx**
Located: `frontend/src/pages/Auth/ResetPassword.jsx`

**Features:**
- Full-page password reset form
- Session validation (checks if user has valid reset link)
- Password strength validation (min 8 characters)
- Password confirmation matching
- Success/error messaging
- Auto-redirect to login on success

**Validation Rules:**
- Passwords must be at least 8 characters
- Passwords must match
- All fields required

**Key Functions:**
- `checkSession()` - Validates reset link on mount
- `handleResetPassword()` - Updates password via Supabase

---

### 3. **Updated Login.jsx**
Modified: `frontend/src/pages/Auth/Login.jsx`

**Changes:**
- Added `showForgotPassword` state
- Imported `ForgotPasswordModal`
- Made "Forgot your password?" link clickable
- Added hover effects to link
- Integrated modal component

---

## Flow Diagram

```
User clicks "Forgot your password?"
         ↓
ForgotPasswordModal opens
         ↓
User enters email address
         ↓
Click "Send Reset Link"
         ↓
Supabase sends email with reset link
         ↓
Success message shown (Step 2)
         ↓
User clicks link in email
         ↓
Redirected to /auth/reset-password
         ↓
ResetPassword page validates session
         ↓
User enters new password
         ↓
Click "Reset Password"
         ↓
Supabase updates password
         ↓
Redirect to login page
         ↓
User logs in with new password
```

---

## Routes Added

### In `App.jsx`:
```jsx
<Route path="/auth/reset-password" element={<ResetPassword />} />
```

This route is **public** (not protected) so users can access it from the email link.

---

## Supabase Configuration

### Email Settings Required:
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Ensure "Password reset" template is enabled
3. The reset link should point to: `{YOUR_DOMAIN}/auth/reset-password`

### Environment Variables:
Ensure your `.env` file has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Implementation Steps

### Step 1: Verify Supabase Email Configuration
- [ ] Go to Supabase Dashboard
- [ ] Navigate to Authentication → Email Templates
- [ ] Check "Password reset" template is enabled
- [ ] Verify reset link redirects to correct domain

### Step 2: Test Forgot Password Flow
1. Go to login page
2. Click "Forgot your password?"
3. Enter your email address
4. Click "Send Reset Link"
5. Check your email for reset link
6. Click link in email
7. Enter new password
8. Click "Reset Password"
9. Should redirect to login
10. Log in with new password

### Step 3: Handle Edge Cases
- **Expired Links**: ResetPassword.jsx checks session validity
- **Invalid Email**: Supabase returns error message
- **Password Mismatch**: Form validation catches this
- **Weak Password**: Minimum 8 characters enforced

---

## Security Considerations

✅ **Implemented:**
- Password reset links expire after 24 hours (Supabase default)
- Session validation before password update
- Password strength requirements (8+ characters)
- HTTPS required for production
- No sensitive data in URLs

⚠️ **Best Practices:**
- Monitor failed reset attempts
- Implement rate limiting (optional)
- Log password reset events
- Send confirmation email after reset

---

## Error Handling

### Common Errors & Solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid or expired reset link" | Link expired (>24hrs) | Request new reset link |
| "Email not found" | User doesn't exist | Check email spelling |
| "Passwords do not match" | Confirmation mismatch | Re-enter passwords carefully |
| "Password too weak" | <8 characters | Use at least 8 characters |

---

## Testing Checklist

- [ ] Modal opens when clicking "Forgot your password?"
- [ ] Email input validates
- [ ] Success message shows after sending
- [ ] Email received with reset link
- [ ] Reset link redirects to correct page
- [ ] Password validation works
- [ ] Password update succeeds
- [ ] Redirects to login after reset
- [ ] Can login with new password
- [ ] Old password no longer works

---

## Files Modified/Created

### Created:
- `frontend/src/pages/Auth/ForgotPasswordModal.jsx` (NEW)
- `frontend/src/pages/Auth/ResetPassword.jsx` (NEW)
- `frontend/src/styles/components/auth-pages.css` (NEW) - Design-system compatible CSS

### Modified:
- `frontend/src/pages/Auth/Login.jsx` - Added modal integration + style folder classes
- `frontend/src/App.jsx` - Added reset password route

## Design System Integration

All auth pages now use the **Museo design system** from the style folder:

### CSS Classes Used:
- **Layout**: `.auth-container`, `.auth-card`, `.auth-form-section`, `.auth-image-section`
- **Typography**: `.auth-title`, `.auth-subtitle`, `.auth-link`, `.auth-divider`
- **Forms**: `.auth-form`, `.auth-form-field` (with `.museo-label`, `.museo-input`)
- **Messages**: `.auth-message`, `.auth-message--error`, `.auth-message--success`
- **Modal**: `.forgot-password-modal`, `.forgot-password-modal-content`, `.forgot-password-modal-close`
- **Success State**: `.forgot-password-success`, `.forgot-password-success-icon`, `.forgot-password-success-title`

### Design System Variables:
All colors, spacing, and typography use CSS variables from `design-system.css`:
- **Colors**: `var(--museo-primary)`, `var(--museo-accent)`, `var(--museo-white)`, etc.
- **Spacing**: `var(--museo-space-*)` for consistent padding/margins
- **Typography**: `var(--museo-font-display)`, `var(--museo-text-*)`
- **Shadows**: `var(--museo-shadow-*)` for depth

### Responsive Design:
- **Desktop (>768px)**: 2-column layout (form + image)
- **Tablet (768px)**: Single column, image hidden
- **Mobile (<480px)**: Optimized form layout with smaller padding

## File Structure

```
frontend/src/
├── pages/Auth/
│   ├── Login.jsx (updated with style folder classes)
│   ├── ForgotPasswordModal.jsx (NEW - uses auth-pages.css)
│   └── ResetPassword.jsx (NEW - uses auth-pages.css)
├── styles/components/
│   └── auth-pages.css (NEW - design-system compatible)
└── App.jsx (updated with reset password route)
```

---

## Future Enhancements

1. **Rate Limiting**: Limit reset requests per email (e.g., 3 per hour)
2. **Confirmation Email**: Send email after successful password reset
3. **Security Questions**: Optional 2FA for password reset
4. **Password History**: Prevent reusing recent passwords
5. **Admin Dashboard**: View password reset attempts
6. **Custom Email Template**: Branded reset email

---

## Support

For issues:
1. Check Supabase logs for email delivery
2. Verify email template configuration
3. Test with different email providers
4. Check browser console for errors
5. Verify environment variables are set correctly
