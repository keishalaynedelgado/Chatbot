---
name: Synthetica UI
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#464553'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#777584'
  outline-variant: '#c8c4d5'
  surface-tint: '#544fc0'
  primary: '#1f108e'
  on-primary: '#ffffff'
  primary-container: '#3730a3'
  on-primary-container: '#a9a7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#511c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#752c00'
  on-tertiary-container: '#fe9562'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3b35a7'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb694'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7a3003'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  mono-streaming:
    fontFamily: jetbrainsMono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 800px
  bubble-padding: 1rem 1.25rem
  stack-gap: 1.5rem
  section-margin: 2rem
  edge-margin-mobile: 1rem
  edge-margin-desktop: 2rem
---

## Brand & Style

The design system focuses on a **Minimalist** and **Modern Corporate** aesthetic, specifically tailored for AI-driven interactions. The brand personality is professional yet approachable, aiming to reduce the cognitive load often associated with customer support.

The interface prioritizes clarity through heavy whitespace, high-quality typography, and subtle transitions. Drawing inspiration from top-tier AI labs, the design utilizes a "clean slate" approach where the content is the hero, and the UI provides a quiet, reliable framework. The emotional response should be one of competence, speed, and helpfulness.

## Colors

The palette is anchored by a **Deep Indigo** primary color, signaling trust and technological sophistication. 

- **Primary:** Deep Indigo (#3730A3) used for user message bubbles, primary actions, and brand touchpoints.
- **Secondary/Accent:** Indigo (#6366F1) used for hover states and highlighting active features.
- **Neutral/Text:** Soft Slate Grays (#475569) provide a lower-contrast reading experience that reduces eye strain compared to pure black.
- **Surface Strategy:** The system uses a high-contrast white background for the main chat area, with a very light gray (#F1F5F9) for AI-generated response bubbles to distinguish them from the pure white canvas.

## Typography

The design system utilizes **Inter** for all UI elements to ensure maximum legibility and a contemporary, systematic feel. 

For technical or AI-streaming states (such as code blocks or raw data output), **JetBrains Mono** is introduced to provide a clear visual distinction. Line heights are kept generous (1.5x - 1.6x) to facilitate comfortable reading of long-form AI explanations. Headlines use a slightly tighter letter spacing to maintain a modern, "tucked-in" appearance.

## Layout & Spacing

This design system follows a **Fixed Grid** approach for the chat container to maintain focus, centering the conversation in an 800px max-width column. 

- **Messaging Rhythm:** We use a "stack" philosophy where message groups are separated by 1.5rem, while internal message components (like timestamps or labels) are closer (0.5rem).
- **Responsive Adaptations:** On mobile, the container spans the full width with 1rem side margins. On desktop, the central column is flanked by ample whitespace to minimize distractions.
- **Generous Gutters:** Chat bubbles utilize internal padding of 1rem (vertical) and 1.25rem (horizontal) to create a relaxed, airy feel.

## Elevation & Depth

To maintain a clean, minimalist profile, this design system avoids heavy shadows. 

- **Tonal Layers:** Depth is primarily communicated through subtle background shifts (e.g., using a pure white background with an off-white message bubble).
- **Surface Elevation:** Only the input area and floating action buttons utilize a very soft, high-diffusion shadow (0px 4px 20px rgba(0, 0, 0, 0.05)) to suggest they sit above the conversation scroll.
- **Borders:** Low-contrast outlines (1px solid #E2E8F0) are used for inputs and cards to define structure without adding visual noise.

## Shapes

The shape language is defined by high-radius curves to project friendliness and safety.

- **Message Bubbles:** Use a 1.5rem (2xl) corner radius. To improve directionality, the corner of the bubble closest to the user/AI avatar may have a reduced radius (0.5rem).
- **Interactive Elements:** Buttons and input fields use a consistent 0.75rem (xl) radius, balancing the extremely round bubbles with a more structured "tool" feel.
- **Container Elements:** Large modal windows or side panels adopt the 1rem (lg) radius.

## Components

### Chat Bubbles
- **User Bubble:** Primary color background, white text. Aligned to the right.
- **AI Bubble:** Soft Slate off-white background (#F1F5F9), Slate-800 text. Aligned to the left.
- **Avatar:** 32px circular avatars or simple icon identifiers.

### Input Bar
- A floating or docked horizontal bar with a text-area that auto-expands. 
- Features a subtle "ghost" placeholder and a Primary color "Send" icon button.

### Streaming States
- **The Cursor:** A vertical bar or pulsing dot in the Primary color that follows the text as it is "typed" by the AI.
- **Skeleton Loads:** Used for rich media (images/cards) during generation, using a subtle pulse animation on a #F1F5F9 background.

### Error Handling
- **Inline Errors:** Small text below the input field in a soft crimson, utilizing a "Retry" ghost button.
- **System Errors:** A full-width banner at the top of the chat window with a light amber or red background and 14px centered text.

### Feedback Actions
- Small, low-opacity icons (Thumbs Up, Thumbs Down, Copy) that appear on hover or tap below an AI message to allow for reinforcement learning.