# 🎨 Custom Watermark Text Feature

## Overview

Artists can now customize their watermark text when uploading artwork, giving them full control over copyright notices while maintaining smart defaults.

---

## ✨ Features

### **Smart Defaults**
- ✅ Default format: `© Username 2025 • Museo`
- ✅ Automatically uses artist's username
- ✅ Current year included
- ✅ Museo branding

### **Custom Text**
- ✅ Optional custom watermark text
- ✅ Any text format supported
- ✅ Appears when watermark is enabled
- ✅ Falls back to default if empty

---

## 🎯 User Experience

### **Upload Flow:**

1. **Enable watermark** (checked by default)
2. **Optional: Enter custom text**
   - Leave blank → Uses default: `© Your Name 2025 • Museo`
   - Enter text → Uses custom: `© My Studio 2025` or any format
3. **Upload artwork**

### **UI Design:**

```
☑ 🔒 Protect with watermark
   Add watermark to protect your artwork from unauthorized use

   Custom watermark text (optional)
   [© Your Name 2025 • Museo                    ]
   Leave blank to use default format with your username
```

---

## 💡 Use Cases

### **Default Watermark (Most Users)**
```
© John Artist 2025 • Museo
```
**When:** User leaves custom text blank  
**Best for:** Individual artists, simple protection

### **Studio/Gallery Branding**
```
© Museo Art Gallery 2025
```
**When:** User enters custom text  
**Best for:** Galleries, studios, organizations

### **Copyright Notice**
```
Copyright © 2025 John Artist. All Rights Reserved.
```
**When:** User needs formal legal notice  
**Best for:** Professional artists, commissioned work

### **Minimal Watermark**
```
© J.A.
```
**When:** User wants subtle protection  
**Best for:** Portfolio pieces, social media

### **International Artists**
```
© 约翰·艺术家 2025
```
**When:** Non-English watermarks needed  
**Best for:** International artists, multilingual galleries

---

## 🔧 Technical Implementation

### **Frontend (UploadArt.jsx)**

**State:**
```javascript
const [watermarkText, setWatermarkText] = useState("");
```

**UI:**
```jsx
{applyWatermark && (
  <div style={{ marginTop: '12px', paddingLeft: '32px' }}>
    <label className="museo-label">
      Custom watermark text (optional)
    </label>
    <input
      type="text"
      value={watermarkText}
      onChange={(e) => setWatermarkText(e.target.value)}
      className="museo-input"
      placeholder={`© Your Name ${new Date().getFullYear()} • Museo`}
    />
    <small>Leave blank to use default format with your username</small>
  </div>
)}
```

**Submit:**
```javascript
if (watermarkText.trim()) {
  fd.append("watermarkText", watermarkText.trim());
}
```

### **Backend (profileController.js)**

**Extract custom text:**
```javascript
const { 
  watermarkText = "" // Custom watermark text (optional)
} = req.body || {};
```

**Apply watermark:**
```javascript
if (watermarkText && watermarkText.trim()) {
  // Use custom text
  console.log(`📝 Using custom watermark: "${watermarkText}"`);
  imageBuffer = await addTextWatermark(imageBuffer, {
    text: watermarkText.trim(),
    position: 'bottom-right',
    opacity: 0.6
  });
} else {
  // Use default user watermark
  console.log(`👤 Using default user watermark for: ${displayName}`);
  imageBuffer = await addUserWatermark(imageBuffer, {
    username: displayName,
    userId: userId,
    date: new Date().getFullYear()
  });
}
```

---

## 📊 Examples

### **Example 1: Default (No Custom Text)**
**Input:** *(empty)*  
**Output:** `© John Artist 2025 • Museo`

### **Example 2: Studio Name**
**Input:** `© Museo Art Studio 2025`  
**Output:** `© Museo Art Studio 2025`

### **Example 3: Formal Copyright**
**Input:** `Copyright © 2025 John Artist. All Rights Reserved.`  
**Output:** `Copyright © 2025 John Artist. All Rights Reserved.`

### **Example 4: Minimal**
**Input:** `© J.A.`  
**Output:** `© J.A.`

### **Example 5: Website**
**Input:** `© John Artist • www.johnartist.com`  
**Output:** `© John Artist • www.johnartist.com`

### **Example 6: Multiple Languages**
**Input:** `© 约翰·艺术家 2025`  
**Output:** `© 约翰·艺术家 2025`

---

## 🎨 Best Practices

### **Recommended Formats:**

✅ **Good:**
- `© Your Name 2025`
- `© Studio Name 2025`
- `Copyright © 2025 Name`
- `© Name • Website.com`

❌ **Avoid:**
- Very long text (gets cut off)
- Special characters that don't render well
- All caps (looks aggressive)
- Multiple lines (not supported)

### **Tips:**

1. **Keep it concise** - 30 characters or less
2. **Include year** - Shows when created
3. **Add copyright symbol** - © (legal protection)
4. **Consider branding** - Studio/gallery name
5. **Test visibility** - Preview before uploading

---

## 🚀 Future Enhancements

### **Planned Features:**

- [ ] **Watermark preview** - See before upload
- [ ] **Position selector** - Choose placement
- [ ] **Opacity slider** - Adjust visibility
- [ ] **Style presets** - Quick templates
- [ ] **Save preferences** - Remember settings
- [ ] **Multi-line support** - Complex watermarks
- [ ] **Font selection** - Typography options
- [ ] **Color picker** - Custom colors

---

## 🔒 Security

✅ **Input validation** - Text is trimmed and sanitized  
✅ **Server-side processing** - Cannot be bypassed  
✅ **XSS protection** - Special characters handled safely  
✅ **Length limits** - Prevents abuse  

---

## 📝 API Reference

### **POST /api/profile/uploadArt**

**New Parameter:**
```javascript
{
  watermarkText: string (optional)
  // If empty/null: Uses default "© Username 2025 • Museo"
  // If provided: Uses custom text exactly as entered
}
```

**Example Request:**
```javascript
const formData = new FormData();
formData.append('images', file);
formData.append('title', 'My Artwork');
formData.append('applyWatermark', 'true');
formData.append('watermarkText', '© My Studio 2025'); // Optional
```

---

## ✅ Testing

### **Test Cases:**

1. **Default watermark** - Leave text empty
2. **Custom text** - Enter "© Test Studio 2025"
3. **Special characters** - Enter "© Café d'Art"
4. **Long text** - Enter 50+ characters
5. **Empty spaces** - Enter "   " (should use default)
6. **Unicode** - Enter "© 艺术家 2025"

---

## 🎯 User Benefits

✅ **Flexibility** - Artists control their branding  
✅ **Simplicity** - Smart defaults for quick uploads  
✅ **Professional** - Custom copyright notices  
✅ **International** - Support for all languages  
✅ **Consistent** - Same position and style  

---

**Last Updated:** 2025-01-05  
**Version:** 1.1.0  
**Status:** ✅ Implemented
