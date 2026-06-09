# Stayon Mobile App - Design Plan

## 🎨 Design Philosophy
**Inspired by Airbnb | Uniquely Stayon**
- **Simple & Elegant**: Clean layouts with ample white space
- **Pleasant**: Soft colors, smooth animations, delightful interactions
- **Beautiful**: Typography-focused, elegant motion design
- **User-Friendly**: Intuitive navigation, clear hierarchy

---

## 📱 Screen Structure (Post-Splash)

### 1. **Authentication Flow**
#### A. Login/Signup Screen
- **Layout**: Centered card with subtle shadow
- **Style**: Minimalist with focus on the input
- **Colors**: 
  - Background: Pure white (#FFFFFF)
  - Primary action: Airbnb pink (#FF385C)
  - Text: Dark charcoal (#222222)
  - Borders: Light gray (#EBEBEB)
- **Typography**:
  - Title: 32px, SemiBold, Dark
  - Subtitle: 16px, Regular, Gray
  - Input labels: 15px, Medium
  - Button text: 16px, SemiBold, White
- **Animations**:
  - Fade-in on mount (500ms)
  - Scale-up input on focus (150ms)
  - Button ripple effect
  - Slide-in social buttons (staggered)

#### B. OTP Verification Screen
- **Layout**: Centered with large OTP boxes
- **Code Input**: 6 individual boxes with focus states
- **Animations**:
  - Box highlight on active
  - Success checkmark animation
  - Error shake animation

#### C. Account Creation Screen
- **Layout**: Form with smooth scroll
- **Inputs**: First name, surname, DOB, email
- **Date Picker**: Native modal style
- **Animations**: Field-by-field reveal

---

### 2. **Home Screen**
#### A. Search Bar (Top)
- **Style**: Rounded pill with shadow
- **Placeholder**: "Where are you going?"
- **Icon**: Search glass (left), filters (right)
- **Animation**: Expand on tap

#### B. Quick Filters
- **Layout**: Horizontal scroll chips
- **Items**: Homes, Experiences, Services
- **Style**: Subtle border, active state fill

#### C. Property Cards
- **Layout**: Vertical scroll, full-width cards
- **Components**:
  - Hero image (carousel)
  - Heart icon (wishlist)
  - Title, location, rating
  - Price per night
- **Animations**:
  - Card entrance (fade + slide up)
  - Image carousel swipe
  - Heart bounce on tap

---

### 3. **Navigation Pattern**
- **Type**: Bottom tab navigation
- **Tabs**: Explore, Wishlists, Trips, Messages, Profile
- **Style**: 
  - Icons: Line icons (inactive), Filled (active)
  - Active color: #FF385C
  - Inactive color: #717171
- **Animation**: Icon scale + color transition

---

## 🎭 Animation Guidelines

### Timing
- **Quick**: 150ms (micro-interactions)
- **Standard**: 300ms (transitions)
- **Slow**: 500ms (page loads)

### Easing
- **Enter**: easeOut (0.0, 0.0, 0.2, 1)
- **Exit**: easeIn (0.4, 0.0, 1, 1)
- **Both**: easeInOut (0.4, 0.0, 0.2, 1)

### Types
- **Fade**: opacity 0 → 1
- **Slide**: translateY 20px → 0
- **Scale**: scale 0.95 → 1
- **Spring**: For elastic effects

---

## 🎨 Color Usage

### Primary (#FF385C)
- Call-to-action buttons
- Active states
- Important text
- Progress indicators

### Secondary (#00A699)
- Success states
- Accent elements
- Category highlights

### Neutral Grays
- #222222: Primary text
- #717171: Secondary text
- #B0B0B0: Tertiary text
- #EBEBEB: Borders
- #F7F7F7: Backgrounds

---

## ✨ Unique Stayon Features

1. **Cursive Logo**: Keep the elegant Georgia italic font
2. **Purple Accents**: Subtle purple glow on splash (don't carry to other screens)
3. **Clean Minimalism**: Less is more - plenty of white space
4. **Smooth Transitions**: Every interaction feels buttery smooth
5. **Typography Focus**: Let the fonts do the talking

---

## 🚀 Implementation Priority

1. ✅ Splash Screen (DONE - Don't touch!)
2. 🎯 Login/Signup Screen (NOW)
3. 🎯 OTP Verification (NOW)
4. 🎯 Account Creation (NOW)
5. ⏳ Home Screen
6. ⏳ Property Details
7. ⏳ Other tabs

---

## 📐 Spacing System
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px

## 📏 Border Radius
- **sm**: 8px (inputs)
- **md**: 12px (cards)
- **lg**: 16px (modals)
- **xl**: 24px (special components)
- **full**: 999px (pills, circles)

---

**Design Philosophy**: Airbnb-inspired elegance meets Stayon's unique character. Simple, beautiful, pleasant, and memorable.
