# 🎨 Museo Theme System Guide

## 🚀 Quick Theme Changes

Your entire website theme is controlled by **7 main variables** in `src/design-system.css`. Change these to instantly update ALL pages:

```css
:root {
  /* === MAIN THEME COLORS === */
  --museo-primary-bg: #1e293b;      /* Main dark background */
  --museo-secondary-bg: #334155;    /* Secondary dark background */
  --museo-card-bg: rgba(30, 41, 59, 0.8);  /* Card backgrounds */
  --museo-accent-color: #14b8a6;    /* Teal accent - buttons, links, highlights */
  --museo-text-light: #f1f5f9;      /* Primary light text */
  --museo-text-muted: #e2e8f0;      /* Secondary light text */
  --museo-border-color: rgba(20, 184, 166, 0.2);  /* Border color */
}
```

## 🎯 Easy Theme Variations

### 🌙 **Current: Dark Museum Theme**
```css
--museo-primary-bg: #1e293b;        /* Dark slate */
--museo-secondary-bg: #334155;      /* Medium slate */
--museo-accent-color: #14b8a6;      /* Sophisticated teal */
```

### ☀️ **Light Museum Theme**
```css
--museo-primary-bg: #f8fafc;        /* Light gray */
--museo-secondary-bg: #f1f5f9;      /* Soft white */
--museo-accent-color: #0f766e;      /* Dark teal */
--museo-text-light: #1e293b;        /* Dark text */
--museo-text-muted: #475569;        /* Medium text */
```

### 🌿 **Nature Museum Theme**
```css
--museo-primary-bg: #14532d;        /* Forest green */
--museo-secondary-bg: #166534;      /* Medium green */
--museo-accent-color: #fbbf24;      /* Golden yellow */
```

### 🎭 **Royal Museum Theme**
```css
--museo-primary-bg: #312e81;        /* Deep purple */
--museo-secondary-bg: #4338ca;      /* Medium purple */
--museo-accent-color: #f59e0b;      /* Royal gold */
```

### 🔥 **Modern Art Theme**
```css
--museo-primary-bg: #7c2d12;        /* Deep red */
--museo-secondary-bg: #dc2626;      /* Bright red */
--museo-accent-color: #fbbf24;      /* Vibrant yellow */
```

## 📁 **Files That Control The Theme**

1. **`src/design-system.css`** - Main theme configuration
2. **`src/index.css`** - Global overrides that apply to ALL components
3. **`components/Layout.css`** - Layout-specific styling
4. **`components/Navbar.css`** - Navigation styling
5. **`components/Sidepanel.css`** - Sidebar styling

## 🛠️ **How It Works**

The theme system uses:
- **CSS Custom Properties (variables)** for easy changes
- **Global selectors with !important** to override all existing styles
- **Automatic inheritance** so new components get the theme automatically

## ✨ **Adding New Components**

New components will automatically inherit the dark theme because of the global selectors in `index.css`. If you need custom styling, use the theme variables:

```css
.my-new-component {
  background: var(--museo-card-bg);
  color: var(--museo-text-light);
  border: 1px solid var(--museo-border-color);
}

.my-button {
  background: var(--museo-accent-color);
  color: white;
}
```

## 🎨 **Customization Tips**

1. **Change accent color** for different moods (teal, purple, gold, etc.)
2. **Adjust background darkness** by changing the primary/secondary bg colors
3. **Modify text contrast** by updating text-light and text-muted
4. **Update borders** to match your accent color

## 🚀 **Quick Test**

To test theme changes:
1. Edit the variables in `src/design-system.css`
2. Save the file
3. Refresh your browser
4. ALL pages should update instantly!

---

**Current Theme**: Modern Dark Museum with Sophisticated Teal Accents 🏛️✨
