# Suchit Nagar Nigam (MCL) — Design System & Color Palette

This document defines the official design system, visual guidelines, typography, and color palette for the **Suchit Nagar Nigam — Municipal Corporation Ludhiana (MCL)** Media Intelligence & Dispatch System. All new screens and components (including authentication interfaces) must strictly adhere to these color definitions and aesthetic principles.

---

## 🎨 1. Core Color Palette

The color scheme reflects official government dignity, modern clarity, and high-visibility status signaling.

### A. Primary Brand & Header Colors
| Token / Name | Hex Code | Tailwind / Custom Class | Usage & Guidelines |
| :--- | :--- | :--- | :--- |
| **Deep Government Navy** | `#0A2540` | `bg-[#0A2540]`, `text-[#0A2540]` | Official header sub-banners, primary portal brand titles, administrative ribbons. |
| **Sidebar Dark Slate** | `#1E293B` | `bg-sidebarBg`, `slate-800` | Sidebar navigation backdrop, top metadata bar, primary dark text. |
| **Primary Navy** | `#1E3A8A` | `bg-primaryBlue-navy`, `blue-900` | Scrollbar thumb, deep structural headers, table headers. |
| **Primary Blue** | `#2563EB` | `bg-primaryBlue`, `blue-600` | Primary action buttons, CTA elements, interactive highlights. |
| **Primary Blue Hover** | `#1D4ED8` | `bg-primaryBlue-hover`, `blue-700` | Hover states for primary buttons and links. |
| **Primary Blue Muted** | `#EFF6FF` | `bg-primaryBlue-muted`, `blue-50` | Active selection backgrounds, subtle alert card fills. |
| **Sidebar Active Item** | `#EEF2FF` | `bg-sidebarActiveBg`, `indigo-50` | Active navigation menu item backdrop in sidebar. |

---

### B. Base Surfaces & Neutral Canvas
| Token / Name | Hex Code | Tailwind / Custom Class | Usage & Guidelines |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#F8FAFC` | `bg-background`, `slate-50` | Main window backdrop, body background color. |
| **Card / Surface White** | `#FFFFFF` | `bg-cardBg`, `white` | Content cards, data tables, modals, input container fills. |
| **Border Slate** | `#E2E8F0` | `border-borderSlate`, `slate-200` | Standard component borders, table dividers, input borders. |
| **Border Dark** | `#334155` | `border-slate-700` | Sidebar borders, dark accessibility bar dividers. |
| **Text Primary** | `#1E293B` | `text-textPrimary`, `slate-800` | Main text headings, form labels, high-contrast body text. |
| **Text Secondary** | `#64748B` | `text-textSecondary`, `slate-500` | Sub-titles, captions, placeholder text, field descriptors. |
| **Text Light / Muted** | `#94A3B8` | `text-slate-400` | Auxiliary text on dark backgrounds (sidebar / accessibility bar). |

---

### C. Government Tri-Color & Emblem Accents
| Token / Name | Hex Code | Tailwind Class | Usage & Guidelines |
| :--- | :--- | :--- | :--- |
| **National Saffron** | `#FF671F` | `bg-[#FF671F]`, `text-[#FF671F]` | Top tri-color bar (saffron), top sub-heading badges. |
| **National White** | `#FFFFFF` | `bg-[#FFFFFF]` | Top tri-color bar (center stripe). |
| **National Indian Green** | `#046A38` | `bg-[#046A38]`, `text-[#046A38]` | Top tri-color bar (green), official seal sub-labels, live pulse icons. |
| **Government Amber / Gold**| `#F59E0B` / `#D97706` | `bg-amber-500`, `text-amber-600` | "SECURE" badges, version pill text, MCL emblem highlights. |

---

### D. Severity & Status Palette
| Priority Level | Background Hex | Text / Border Hex | Usage Context |
| :--- | :--- | :--- | :--- |
| **Critical / Urgent** | `#FEE2E2` (`red-100`) | `#DC2626` (`red-600`) | High severity media alerts, critical flags, system errors. |
| **Medium / Pending** | `#FEF3C7` (`amber-100`) | `#D97706` (`amber-600`) | Pending officer dispatch, review needed, moderate priority. |
| **Low / Resolved** | `#DCFCE7` (`green-100`) | `#16A34A` (`green-600`) | Resolved complaints, verified officer actions, success notifications. |

---

## 📐 2. Layout & Aesthetic Guidelines

1. **Header Structure**: Every official page includes the top tri-color strip (`#FF671F` / `#FFFFFF` / `#046A38`), accessibility bar (`#0F172A`), and administrative office banner (`#0A2540`).
2. **Glassmorphism & Shadows**: Cards use subtle backdrop blurs (`backdrop-blur-md`), clean 1px borders (`border-slate-200`), and soft shadows (`shadow-sm` or `shadow-md`).
3. **Buttons & Inputs**: Form inputs feature explicit rounded borders (`rounded-xl` / `rounded-lg`), slate focus rings (`focus:ring-2 focus:ring-blue-500`), and smooth hover state transitions (`transition-all duration-200`).
4. **Access Control Notice**: Since access is strictly provisioned by the Administrator (no public self-registration), login screens feature an official authority notice card styled with slate borders and amber/blue icon callouts.

---

## 🔐 3. Authentication Design Specification

### Design Intent & Workflow
- **No Self-Registration**: Registration is omitted by design. Accounts are created and managed by the Municipal Corporation Ludhiana system administrator.
- **Login Credentials**: Officers & Staff log in using either their **Officer Code / Official Email** and **Secure Password**.
- **Role Selection / Badge**: Visual badge indicating "Internal Officer Portal" with official security verification seal (`SECURE v2.1`).
- **Color Adherence**: Uses `#0A2540` (Navy), `#1E293B` (Dark Slate), `#2563EB` (Primary Blue), `#F8FAFC` (Canvas), and `#FF671F` (Saffron accent).
