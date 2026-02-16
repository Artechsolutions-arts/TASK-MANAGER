# Enterprise Project Management Dashboard - Design Specification

## Document Overview
**Version:** 1.0  
**Date:** 2026-02-06  
**Status:** Production-Ready Specification  
**Target Platforms:** Web (Desktop Primary, Tablet Secondary)

---

## 1. Core Product Experience Analysis

### 1.1 Product Philosophy
The dashboard follows a **project-centric workflow** where:
- Projects are the primary organizational unit
- Boards (Kanban) provide execution views within projects
- Issues/Tasks are the atomic work units
- Navigation is contextual and hierarchical

### 1.2 Key User Flows
1. **Discovery → Execution**: Browse projects → Select project → View board → Manage tasks
2. **Quick Actions**: Search → Filter → Create → Assign → Track
3. **Context Switching**: Navigate between projects/boards while maintaining context

### 1.3 Design Principles
- **Clarity First**: Information hierarchy guides attention
- **Efficiency**: Common actions require ≤2 clicks
- **Consistency**: Reusable patterns across all views
- **Feedback**: Clear loading, success, and error states
- **Accessibility**: WCAG 2.1 AA compliance minimum

---

## 2. Global Application Layout

### 2.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Top Header (Fixed, 64px height)                        │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │ Main Content Area (Scrollable)               │
│ (Fixed,  │                                              │
│ 240px)   │                                              │
│          │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 2.2 Left Vertical Sidebar

**Dimensions:**
- Width: 240px (collapsed: 64px)
- Background: `#F7F8F9` (light gray)
- Border-right: 1px solid `#E3E5E7`
- Fixed position, full viewport height

**Navigation Items (Top Section):**
```
┌─────────────────────────┐
│ 🏠 Dashboard            │ ← Active state: Blue bg + white text
│ 📁 Projects             │
│ 📋 Board                │
│ 📦 Backlog              │
│ 📊 Reports              │
│ ⚙️  Settings            │
└─────────────────────────┘
```

**Specifications:**
- **Height per item**: 40px
- **Padding**: 12px horizontal, 8px vertical
- **Icon size**: 20px × 20px
- **Icon color**: `#6B7280` (default), `#2563EB` (active), `#FFFFFF` (active bg)
- **Font**: Inter, 14px, Medium (500)
- **Spacing**: 4px between icon and label
- **Hover state**: Light gray background `#F3F4F6`
- **Active state**: Blue background `#2563EB`, white text
- **Badge support**: Red dot (8px) for notifications (optional)

**Bottom Section (User Profile):**
```
┌─────────────────────────┐
│ [Avatar] John CEO       │
│      ↓                  │
│ Logout                  │
└─────────────────────────┘
```

### 2.3 Top Header

**Dimensions:**
- Height: 64px
- Background: `#FFFFFF`
- Border-bottom: 1px solid `#E3E5E7`
- Fixed position, full width

**Left Section (Breadcrumbs + Project Name):**
```
Projects > Demo Project > Board
```

**Specifications:**
- **Breadcrumb separator**: `/` or `>` (chevron icon)
- **Font**: Inter, 14px, Regular
- **Color**: `#6B7280` (inactive), `#111827` (active)
- **Project name**: 16px, Semibold (600), `#111827`
- **Max width**: 400px (truncate with ellipsis)

**Center Section (Search + Filters):**
```
[🔍 Search issues...]  [Filter ▼]  [View ▼]
```

**Specifications:**
- **Search input**: 320px width, 36px height
- **Placeholder**: "Search issues, projects, or people..."
- **Border**: 1px solid `#D1D5DB`, rounded 6px
- **Focus state**: Blue border `#2563EB`, shadow
- **Filter button**: 36px height, gray background
- **View selector**: Dropdown with "Board", "List", "Timeline"

**Right Section (Actions + User):**
```
[+ Create]  [🔔]  [Avatar]
```

**Specifications:**
- **Create button**: Primary blue `#2563EB`, white text, 36px height
- **Notification icon**: 20px, gray `#6B7280`, badge indicator
- **Avatar**: 32px × 32px circle, border 2px solid `#E3E5E7`

---

## 3. Projects Overview Screen

### 3.1 Page Header

```
Projects                                    [+ Create Project]
```

**Layout:**
- Left: Page title (32px, Bold, `#111827`)
- Right: Primary CTA button (blue, 40px height)

### 3.2 Project Cards Grid

**Grid System:**
- Columns: 3 (desktop), 2 (tablet), 1 (mobile)
- Gap: 24px
- Card dimensions: Auto-height, min 200px

**Card Structure:**
```
┌─────────────────────────────────────┐
│ [Icon]  Project Name          [•••] │ ← Menu
│         Project Type                 │
│                                     │
│         Description text...         │
│                                     │
│         [Status Badge]  [Progress]  │
│         4 issues • 2 active          │
└─────────────────────────────────────┘
```

**Card Specifications:**
- **Background**: `#FFFFFF`
- **Border**: 1px solid `#E3E5E7`
- **Border-radius**: 8px
- **Padding**: 20px
- **Shadow**: None (default), `0 4px 12px rgba(0,0,0,0.1)` (hover)
- **Hover**: Elevate shadow, cursor pointer

**Card Elements:**
1. **Icon**: 32px × 32px, left-aligned, project type indicator
2. **Project Name**: 18px, Semibold, `#111827`, truncate at 2 lines
3. **Project Type**: 12px, Regular, `#6B7280`, uppercase
4. **Description**: 14px, Regular, `#6B7280`, max 3 lines, ellipsis
5. **Status Badge**: Pill shape, colored background
   - Active: Green `#10B981`
   - In Progress: Blue `#2563EB`
   - On Hold: Yellow `#F59E0B`
   - Archived: Gray `#9CA3AF`
6. **Progress Bar**: 4px height, rounded, blue fill
7. **Metadata**: 12px, `#6B7280`, "X issues • Y active"

### 3.3 Create Project Modal

**Trigger**: Click "+ Create Project" button

**Modal Specifications:**
- **Width**: 560px
- **Max-height**: 80vh
- **Background**: `#FFFFFF`
- **Border-radius**: 12px
- **Shadow**: `0 20px 25px rgba(0,0,0,0.15)`
- **Backdrop**: `rgba(0,0,0,0.5)` overlay

**Content Structure:**
```
┌─────────────────────────────────────┐
│ Create Project                  [×]  │
│                                     │
│ Project Type:                       │
│ ○ Classic  ○ Next-gen               │
│                                     │
│ Project Name *                      │
│ [________________________]          │
│                                     │
│ Description                         │
│ [________________________]          │
│ [________________________]          │
│                                     │
│         [Cancel]  [Create]          │
└─────────────────────────────────────┘
```

**Form Fields:**
- **Project Type**: Radio buttons, visual cards
- **Project Name**: Required, text input, 100% width
- **Description**: Optional, textarea, 3 rows
- **Actions**: Cancel (secondary), Create (primary)

---

## 4. Board (Kanban) View Specification

### 4.1 Board Header

**Sticky Position**: Below top header, scrolls with content

```
Demo Project > Board              [Filter] [View Options]
```

**Actions Bar:**
- Left: Breadcrumb navigation
- Right: Filter dropdown, View options (column width, swimlanes)

### 4.2 Kanban Columns

**Layout:**
- Horizontal scroll container
- Columns: Equal width, min 280px, max 320px
- Gap: 16px between columns
- Container padding: 24px

**Column Structure:**
```
┌─────────────────────────────┐
│ To Do              (3)  [+]  │ ← Header
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ Issue Card              │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ Issue Card              │ │
│ └─────────────────────────┘ │
│                             │
│ [+ Add issue]               │ ← Footer
└─────────────────────────────┘
```

**Column Header Specifications:**
- **Height**: 48px
- **Background**: `#F7F8F9`
- **Border-radius**: 8px 8px 0 0
- **Padding**: 12px 16px
- **Font**: 14px, Semibold, `#111827`
- **Count badge**: 12px, Regular, `#6B7280`, "(X)"
- **Add button**: Icon-only, 24px, gray, right-aligned

**Column Body:**
- **Background**: `#FFFFFF`
- **Min-height**: 400px
- **Padding**: 8px
- **Gap between cards**: 8px
- **Scrollable**: Max-height 80vh, vertical scroll

**Column Footer:**
- **Add Issue Button**: Full width, 40px height
- **Background**: Transparent, border dashed `#D1D5DB`
- **Text**: "+ Add issue", 14px, `#6B7280`
- **Hover**: Solid border, light background

### 4.3 Column Types (Default Set)

1. **Backlog** (`#9CA3AF` - Gray)
2. **To Do** (`#6B7280` - Dark Gray)
3. **In Progress** (`#2563EB` - Blue)
4. **Code Review** (`#8B5CF6` - Purple)
5. **Done** (`#10B981` - Green)

**Customization:**
- Users can add/remove/reorder columns
- Column colors configurable
- Column limits: Min 2, Max 10

---

## 5. Issue/Task Card Design

### 5.1 Card Structure

```
┌─────────────────────────────────┐
│ PROJ-123  [High] [Bug]          │ ← Header
├─────────────────────────────────┤
│ Fix authentication bug          │ ← Title
│                                 │
│ Description preview text...     │ ← Description (optional)
│                                 │
│ [Label] [Label]                │ ← Labels
│                                 │
│ 👤 [Avatar] John • ⏱️ 2d       │ ← Footer
└─────────────────────────────────┘
```

### 5.2 Card Dimensions

- **Width**: 100% of column width (280-320px)
- **Min-height**: 120px
- **Padding**: 12px
- **Border-radius**: 6px
- **Border**: 1px solid `#E3E5E7`
- **Background**: `#FFFFFF`
- **Shadow**: `0 1px 3px rgba(0,0,0,0.1)`

### 5.3 Card Elements

**Header Row:**
- **Issue ID**: `PROJ-123`, 12px, Monospace, `#6B7280`
- **Priority Indicator**: Colored dot (8px circle)
  - Critical: `#DC2626` (Red)
  - High: `#F59E0B` (Orange)
  - Medium: `#3B82F6` (Blue)
  - Low: `#6B7280` (Gray)
- **Issue Type Icon**: 16px, colored
  - Bug: Red `#DC2626`
  - Story: Blue `#2563EB`
  - Task: Gray `#6B7280`
  - Epic: Purple `#8B5CF6`

**Title:**
- **Font**: 14px, Semibold (600), `#111827`
- **Line-height**: 1.4
- **Max lines**: 2 (ellipsis)
- **Hover**: Underline, cursor pointer

**Description (Optional):**
- **Font**: 12px, Regular, `#6B7280`
- **Max lines**: 2
- **Line-height**: 1.4

**Labels:**
- **Shape**: Pill, 4px height padding
- **Font**: 11px, Medium, uppercase
- **Colors**: Configurable (default palette)
- **Max visible**: 3 (+N more indicator)

**Footer:**
- **Assignee Avatar**: 20px circle, border 1px
- **Assignee Name**: 12px, `#6B7280`
- **Time Indicator**: 12px, `#9CA3AF`, relative time
- **Spacing**: 8px between elements

### 5.4 Card States

**Default:**
- White background, gray border
- Subtle shadow

**Hover:**
- Border color: `#2563EB`
- Shadow: `0 4px 12px rgba(0,0,0,0.15)`
- Cursor: grab (when draggable)

**Dragging:**
- Opacity: 0.5
- Shadow: `0 8px 24px rgba(0,0,0,0.2)`
- Transform: Rotate 2deg

**Selected:**
- Border: 2px solid `#2563EB`
- Background: `#EFF6FF`

**Loading:**
- Skeleton animation
- Gray background `#F3F4F6`
- Shimmer effect

---

## 6. Interaction Behaviors

### 6.1 Drag and Drop

**Drag Initiation:**
- Trigger: Mouse down + 5px movement OR touch start
- Visual feedback: Card opacity 0.5, cursor changes to "grabbing"
- Ghost preview follows cursor

**Drop Zones:**
- **Valid**: Column body (highlight with blue border)
- **Invalid**: Outside board (revert animation)

**Drop Animation:**
- Smooth transition: 200ms ease-out
- Card snaps to position
- Column reorders automatically

**Touch Support:**
- Long press (500ms) initiates drag
- Haptic feedback on mobile

### 6.2 Quick Filters

**Filter Bar (Above Board):**
```
[All] [Assigned to me] [Recent] [High Priority] [Clear]
```

**Filter Types:**
- **Assignee**: Multi-select dropdown
- **Priority**: Checkboxes
- **Labels**: Tag selector
- **Status**: Column checkboxes
- **Date Range**: Date picker

**Visual Feedback:**
- Active filters: Blue background, white text
- Filter count badge: Red dot with number
- Clear button: Gray text, appears when filters active

### 6.3 Search

**Search Behavior:**
- **Scope**: Issues, projects, people
- **Trigger**: Type 2+ characters
- **Debounce**: 300ms
- **Results**: Dropdown panel below search

**Search Results Panel:**
- Max height: 400px
- Sections: Issues, Projects, People
- Highlight: Matching text in bold
- Keyboard navigation: Arrow keys, Enter to select

### 6.4 Empty States

**Empty Column:**
```
┌─────────────────────────────┐
│                             │
│    [Illustration Icon]      │
│                             │
│    No issues in this column │
│                             │
│    [+ Add issue]            │
│                             │
└─────────────────────────────┘
```

**Empty Board:**
- Illustration: Empty board graphic
- Message: "This board is empty"
- CTA: "Create your first issue"

**Empty Search:**
- Message: "No results found"
- Suggestions: "Try different keywords" or "Clear filters"

### 6.5 Loading States

**Skeleton Loaders:**
- Animated gray rectangles
- Match content structure
- Shimmer effect (left to right)

**Progressive Loading:**
- Columns load independently
- Cards appear with fade-in animation
- Loading indicators per column

---

## 7. Visual System

### 7.1 Color Palette

**Primary Colors:**
- **Blue**: `#2563EB` (Primary actions, links, active states)
- **Blue Light**: `#3B82F6` (Hover states)
- **Blue Dark**: `#1E40AF` (Pressed states)

**Neutral Colors:**
- **Gray 900**: `#111827` (Headings, primary text)
- **Gray 700**: `#374151` (Secondary text)
- **Gray 500**: `#6B7280` (Tertiary text, icons)
- **Gray 300**: `#D1D5DB` (Borders, dividers)
- **Gray 100**: `#F3F4F6` (Backgrounds, hover)
- **Gray 50**: `#F9FAFB` (Page backgrounds)

**Semantic Colors:**
- **Success**: `#10B981` (Green) - Completed, success states
- **Warning**: `#F59E0B` (Orange) - Warnings, medium priority
- **Error**: `#DC2626` (Red) - Errors, critical priority
- **Info**: `#3B82F6` (Blue) - Information, in-progress

**Status Colors:**
- **Active**: `#10B981`
- **In Progress**: `#2563EB`
- **On Hold**: `#F59E0B`
- **Blocked**: `#DC2626`
- **Done**: `#10B981`

### 7.2 Typography

**Font Family:**
- **Primary**: Inter (system fallback: -apple-system, BlinkMacSystemFont, "Segoe UI")
- **Monospace**: "SF Mono", Monaco, "Courier New" (for IDs, code)

**Scale:**
- **H1**: 32px, Bold (700), Line-height 1.2
- **H2**: 24px, Semibold (600), Line-height 1.3
- **H3**: 18px, Semibold (600), Line-height 1.4
- **Body Large**: 16px, Regular (400), Line-height 1.5
- **Body**: 14px, Regular (400), Line-height 1.5
- **Body Small**: 12px, Regular (400), Line-height 1.4
- **Caption**: 11px, Regular (400), Line-height 1.3

**Usage:**
- **Page Titles**: H1
- **Section Headers**: H2
- **Card Titles**: H3
- **Body Text**: Body
- **Metadata**: Body Small
- **Labels**: Caption

### 7.3 Spacing System

**Base Unit**: 4px

**Scale:**
- **XS**: 4px
- **SM**: 8px
- **MD**: 12px
- **LG**: 16px
- **XL**: 24px
- **2XL**: 32px
- **3XL**: 48px

**Application:**
- **Card padding**: 12px (MD)
- **Column gap**: 16px (LG)
- **Section spacing**: 24px (XL)
- **Page padding**: 24px (XL)

### 7.4 Elevation (Shadows)

**Levels:**
- **0**: None (default cards)
- **1**: `0 1px 3px rgba(0,0,0,0.1)` (hover cards)
- **2**: `0 4px 12px rgba(0,0,0,0.15)` (modals, dropdowns)
- **3**: `0 8px 24px rgba(0,0,0,0.2)` (drag overlay)

### 7.5 Border Radius

- **Small**: 4px (badges, small elements)
- **Medium**: 6px (cards, inputs)
- **Large**: 8px (modals, containers)
- **XLarge**: 12px (large modals)

### 7.6 Grid System

**Breakpoints:**
- **Mobile**: < 768px (1 column)
- **Tablet**: 768px - 1024px (2 columns)
- **Desktop**: > 1024px (3+ columns)

**Container:**
- Max-width: 1440px
- Padding: 24px (responsive: 16px mobile)

---

## 8. Scalability & Enterprise Considerations

### 8.1 Responsive Behavior

**Mobile (< 768px):**
- Sidebar: Hidden, accessible via hamburger menu
- Board: Horizontal scroll, columns min-width 280px
- Cards: Full width, stacked layout
- Header: Condensed, icons only

**Tablet (768px - 1024px):**
- Sidebar: Collapsible, icon-only mode
- Board: 2-column project grid
- Cards: Standard size

**Desktop (> 1024px):**
- Full layout as specified
- Multi-column project grids
- Expanded sidebar

### 8.2 Accessibility

**WCAG 2.1 AA Compliance:**
- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI elements
- **Focus Indicators**: 2px blue outline, 2px offset
- **Keyboard Navigation**: Tab order logical, all interactive elements focusable
- **Screen Readers**: ARIA labels, roles, live regions for dynamic content
- **Font Size**: Minimum 12px, scalable up to 200%

**Keyboard Shortcuts:**
- **/**: Focus search
- **C**: Create issue
- **G + P**: Go to projects
- **G + B**: Go to board
- **Arrow keys**: Navigate cards (when focused)
- **Space**: Select/drag card
- **Esc**: Close modals, clear search

### 8.3 Performance

**Optimization Strategies:**
- **Virtual Scrolling**: For boards with 100+ issues
- **Lazy Loading**: Load columns on scroll
- **Debouncing**: Search, filters (300ms)
- **Memoization**: React components, computed values
- **Code Splitting**: Route-based, component-based

**Performance Targets:**
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Largest Contentful Paint**: < 2.5s

### 8.4 Extensibility

**Plugin Architecture:**
- Custom column types
- Custom card fields
- Custom filters
- Custom views

**Future Features (Placeholders):**
- **Reports**: Analytics dashboard, charts
- **Releases**: Version management, roadmaps
- **Integrations**: GitHub, Slack, email
- **Automation**: Rules engine, workflows
- **Templates**: Project templates, issue templates

**API Considerations:**
- RESTful endpoints
- WebSocket for real-time updates
- GraphQL for complex queries (optional)
- Rate limiting, pagination

### 8.5 Internationalization (i18n)

**Supported Languages:**
- English (default)
- Spanish
- French
- German
- Japanese

**Implementation:**
- All text in translation files
- Date/time formatting per locale
- RTL support (Arabic, Hebrew)

### 8.6 Data Management

**State Management:**
- React Query for server state
- Zustand/Redux for client state
- Optimistic updates for better UX

**Caching Strategy:**
- Projects: 5 minutes
- Issues: 2 minutes
- User data: 10 minutes
- Real-time updates via WebSocket

---

## 9. Component Library Structure

### 9.1 Core Components

```
components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Layout.tsx
├── projects/
│   ├── ProjectCard.tsx
│   ├── ProjectGrid.tsx
│   └── CreateProjectModal.tsx
├── board/
│   ├── KanbanBoard.tsx
│   ├── Column.tsx
│   ├── IssueCard.tsx
│   └── DragOverlay.tsx
├── issues/
│   ├── IssueCard.tsx
│   ├── IssueDetail.tsx
│   └── IssueForm.tsx
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   ├── Avatar.tsx
│   ├── Modal.tsx
│   ├── Dropdown.tsx
│   └── Skeleton.tsx
└── filters/
    ├── FilterBar.tsx
    ├── SearchInput.tsx
    └── ViewSelector.tsx
```

### 9.2 Component Specifications

**Button Component:**
- Variants: Primary, Secondary, Tertiary, Danger
- Sizes: Small (32px), Medium (40px), Large (48px)
- States: Default, Hover, Active, Disabled, Loading

**Input Component:**
- Types: Text, Textarea, Select, Date, Search
- States: Default, Focus, Error, Disabled
- Validation: Real-time feedback

**Badge Component:**
- Variants: Default, Success, Warning, Error, Info
- Sizes: Small, Medium
- Shapes: Pill, Rounded

**Modal Component:**
- Sizes: Small (400px), Medium (560px), Large (800px)
- Positions: Center, Top, Bottom
- Backdrop: Click to close option
- Keyboard: Esc to close

---

## 10. Implementation Checklist

### Phase 1: Foundation
- [ ] Set up design tokens (colors, typography, spacing)
- [ ] Create base UI components (Button, Input, Badge)
- [ ] Implement layout structure (Sidebar, Header)
- [ ] Set up routing and navigation

### Phase 2: Projects
- [ ] Build Projects overview page
- [ ] Create ProjectCard component
- [ ] Implement Create Project modal
- [ ] Add project detail page

### Phase 3: Board
- [ ] Build Kanban board component
- [ ] Implement drag-and-drop
- [ ] Create Column component
- [ ] Add column management (add/remove/reorder)

### Phase 4: Issues
- [ ] Build IssueCard component
- [ ] Implement issue detail view
- [ ] Add issue creation/editing
- [ ] Connect to backend API

### Phase 5: Polish
- [ ] Add loading states
- [ ] Implement empty states
- [ ] Add error handling
- [ ] Optimize performance
- [ ] Accessibility audit
- [ ] Responsive testing

---

## 11. Design Assets

### 11.1 Icons
- **Library**: Heroicons (Outline + Solid variants)
- **Size**: 20px default, 16px small, 24px large
- **Color**: Inherit from parent or use gray-500

### 11.2 Illustrations
- **Empty states**: Custom SVG illustrations
- **Onboarding**: Step-by-step guides
- **Error states**: Friendly error messages

### 11.3 Animations
- **Transitions**: 200ms ease-out (default)
- **Drag**: Smooth, 60fps
- **Loading**: Skeleton shimmer
- **Micro-interactions**: Button press, hover effects

---

## Conclusion

This specification provides a complete blueprint for implementing an enterprise-grade project management dashboard. All components, interactions, and visual elements are explicitly defined and ready for implementation.

**Next Steps:**
1. Review and approve specification
2. Create design mockups (Figma/Sketch)
3. Set up component library
4. Begin implementation following the checklist

**Maintenance:**
- Update specification as features evolve
- Document deviations and rationale
- Keep design tokens in sync with implementation

---

**Document Owner**: Product Design Team  
**Last Updated**: 2026-02-06  
**Version**: 1.0
