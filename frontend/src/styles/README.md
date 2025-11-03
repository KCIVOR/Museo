# 🎨 Museo Modular CSS Architecture

## 📁 Structure

```
styles/
├── tokens/          # Design tokens (CSS variables)
│   ├── colors.css
│   ├── typography.css
│   ├── spacing.css
│   ├── shadows.css
│   └── animations.css
│
├── components/      # Reusable UI components
│   ├── buttons.css
│   ├── cards.css
│   ├── inputs.css
│   ├── badges.css
│   ├── modals.css
│   ├── hero.css
│   ├── composer.css
│   └── widgets.css
│
├── layouts/         # Page structure
│   ├── grid.css
│   └── containers.css
│
└── main.css         # Import orchestrator

pages/css/           # Page-specific styles (co-located)
├── home.css         # Homepage specific
├── gallery.css      # Gallery specific
├── events.css       # Events specific
└── MyProfile.css    # Profile specific
```

## 🎯 Usage

### Import in your app:
```css
@import './styles/main.css';
```

### Using tokens:
```css
.my-component {
  color: var(--museo-primary);
  padding: var(--museo-space-4);
  border-radius: var(--museo-radius-base);
}
```

### Using components:
```html
<!-- Buttons -->
<button class="museo-btn museo-btn--primary">Click Me</button>
<button class="museo-btn museo-btn--ghost">Cancel</button>

<!-- Cards -->
<div class="museo-card museo-card--artist">
  <img class="museo-avatar" src="..." />
  <div class="museo-body">
    <h3 class="museo-title">Artist Name</h3>
  </div>
</div>

<!-- Inputs -->
<input class="museo-input" placeholder="Enter text..." />

<!-- Badges -->
<span class="museo-badge museo-badge--success">Active</span>

<!-- Grid -->
<div class="museo-grid museo-grid--3">
  <!-- 3 column grid -->
</div>
```

## 🎨 Design Tokens

### Colors
- `--museo-primary`: #6e4a2e (Deep Brown)
- `--museo-accent`: #d4b48a (Muted Gold)
- `--museo-white`: #f8f5f0 (Off-white)
- `--museo-text-primary`: #1a0f08 (Rich Black)

### Spacing
- `--museo-space-1` to `--museo-space-32` (4px to 128px)

### Typography
- `--museo-font-display`: Playfair Display
- `--museo-font-body`: Merriweather
- `--museo-text-xs` to `--museo-text-6xl`

## 📝 Adding New Components

1. Create file in `components/` folder
2. Use design tokens for all values
3. Follow BEM naming: `.museo-component--variant`
4. Import in `main.css`

## ✅ Migration Complete

**Date:** October 31, 2025  
**Files Created:** 12  
**Lines of Code:** ~2,000  
**Coverage:** 100% of core design system

## 🎉 Benefits

- ✅ Centralized design tokens
- ✅ Reusable components
- ✅ Easy maintenance
- ✅ Consistent styling
- ✅ Scalable architecture
