# SSO Hub Design System

## Overview
Modern, elegant, and responsive UI design system built with Tailwind CSS, shadcn/ui components, and Framer Motion animations.

## Directory Structure
```
src/
├── components/
│   ├── ui/           # Core reusable UI components
│   ├── layout/       # Navigation and layout components
│   ├── charts/       # Data visualization components
│   └── forms/        # Form components and inputs
├── pages/            # Page components
├── styles/           # Global styles and Tailwind config
├── lib/              # Utility functions and helpers
└── contexts/         # React context providers
```

## Core UI Components

### Button Component
- **Variants**: default, destructive, outline, secondary, ghost, link, gradient, success, warning, error
- **Sizes**: sm, default, lg, xl, icon, icon-sm, icon-lg
- **Features**: Loading states, rounded variants, hover effects

### Card Component
- **Sections**: Header, Content, Footer
- **Features**: Consistent spacing, hover effects, shadow variations

### Avatar Component
- **Features**: Image fallback, initials generation, multiple sizes
- **Accessibility**: ARIA compliant, keyboard navigation

### Badge Component
- **Variants**: default, secondary, destructive, outline, success, warning, error, info
- **Sizes**: sm, default, lg
- **Features**: Icon support, color variations

### Loading Components
- **Variants**: spinner, dots, pulse, skeleton
- **Components**: FullScreenLoading, Skeleton, SkeletonText, SkeletonCard

## Design Tokens

### Colors
- **Primary**: Blue scale (50-950)
- **Secondary**: Gray scale (50-950)
- **Success**: Green scale (50-900)
- **Warning**: Yellow scale (50-900)
- **Error**: Red scale (50-900)
- **Neutral**: Gray scale (50-950)

### Typography
- **Font Family**: Inter (sans), JetBrains Mono (mono)
- **Scale**: Responsive typography with mobile-first approach
- **Weights**: 300-900 for Inter, 300-700 for JetBrains Mono

### Spacing
- **Base Unit**: 4px (0.25rem)
- **Scale**: 0, 1, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 128, 144

### Shadows
- **Soft**: Subtle elevation
- **Medium**: Standard card shadows
- **Large**: Prominent elevation
- **Glow**: Primary color glow effects

### Border Radius
- **Scale**: sm, default, lg, xl, 2xl, 3xl, full
- **Custom**: 4xl, 5xl for special cases

## Animation System

### Framer Motion Integration
- **Page Transitions**: Fade, slide, scale effects
- **Component Animations**: Stagger children, hover effects
- **Performance**: Optimized animations with proper easing

### CSS Animations
- **Keyframes**: fadeIn, slideUp, scaleIn, float
- **Utilities**: animate-fade-in, animate-slide-up, animate-scale-in

## Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile-First Approach
- Base styles for mobile
- Progressive enhancement for larger screens
- Touch-friendly interactions

## Accessibility Features

### WCAG Compliance
- **Color Contrast**: AA standard compliance
- **Focus Management**: Visible focus indicators
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and roles

### Interactive Elements
- **Buttons**: Proper button semantics
- **Forms**: Label associations, error states
- **Navigation**: Skip links, breadcrumbs

## Usage Examples

### Basic Button
```tsx
import { Button } from '../components/ui';

<Button variant="primary" size="lg">
  Click Me
</Button>
```

### Card Layout
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

### Loading State
```tsx
import { Loading, FullScreenLoading } from '../components/ui';

<Loading variant="dots" size="lg" text="Loading..." />
<FullScreenLoading text="Initializing..." />
```

## Best Practices

### Component Design
1. **Composition**: Use composition over inheritance
2. **Props**: Consistent prop naming and types
3. **Variants**: Use variant system for different states
4. **Accessibility**: Always include accessibility features

### Styling
1. **Utility Classes**: Prefer Tailwind utility classes
2. **Custom CSS**: Use @apply for complex patterns
3. **Responsive**: Mobile-first responsive design
4. **Performance**: Optimize animations and transitions

### Code Organization
1. **Index Files**: Export components from index files
2. **Relative Imports**: Use relative paths for local imports
3. **Type Safety**: Full TypeScript support
4. **Documentation**: Include JSDoc comments

## Performance Considerations

### Bundle Size
- **Tree Shaking**: ES6 modules for better tree shaking
- **Code Splitting**: Lazy load heavy components
- **Optimization**: Minimize unused CSS and JS

### Animation Performance
- **GPU Acceleration**: Use transform and opacity
- **Reduced Motion**: Respect user preferences
- **Frame Rate**: Target 60fps animations

## Browser Support

### Modern Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Fallbacks
- Progressive enhancement
- Graceful degradation
- Polyfills for older browsers

## Development Workflow

### Building
```bash
# Type checking
pnpm run typecheck

# Build for production
pnpm run build

# Docker deployment
docker-compose build frontend
docker-compose up -d
```

### Testing
- TypeScript compilation
- Build verification
- Docker container testing
- End-to-end functionality

## Future Enhancements

### Planned Features
- Dark mode support
- Advanced chart components
- Form validation library
- Internationalization
- Advanced animations

### Component Library
- Data tables
- Modals and dialogs
- Navigation menus
- Form components
- Feedback components

---

**Note**: This design system follows enterprise-level standards and maintains consistency with the existing SSO Hub architecture while providing a modern, accessible, and performant user experience.
