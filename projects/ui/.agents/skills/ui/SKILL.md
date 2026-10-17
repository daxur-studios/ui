---
name: ui
description: UI component library and styling primitives for Daxur Studios applications with @daxur-studios/ui. Use when adding UI components, layout widgets, tokens, or styling primitives to Daxur applications.
---

# @daxur-studios/ui

UI component library and styling primitives for Daxur Studios applications and design systems.

## 1. When to apply

- Adding reusable UI components, widgets, or layout primitives to a Daxur Studios application.
- Integrating UI design tokens and CSS custom properties (`--ui-*`).
- Composing accessible, responsive UI elements adhering to Daxur design standards.

## 2. Install and peers

Peer dependencies (declared **optional** to preserve framework flexibility):

```json
{
  "@angular/core": "^20.0.0",
  "@angular/cdk": "^20.0.0",
  "@angular/common": "^20.3.0"
}
```

Runtime dependencies:
- `tslib` (`^2.3.0`)

## 3. Public entry points

| Import | Depends on | Provides |
| --- | --- | --- |
| `@daxur-studios/ui` | Core TS | Library version (`UI_LIB_VERSION`), core styling tokens, utilities |

*(Secondary entry points such as `@daxur-studios/ui/angular` or component-specific sub-entrypoints will be registered as architectural paths are finalized).*

## 4. API reference

### Core (`@daxur-studios/ui`)

- `UI_LIB_VERSION: string` — the current version string of the `@daxur-studios/ui` package.

## 5. Examples

```typescript
import { UI_LIB_VERSION } from '@daxur-studios/ui';

console.log('UI Library initialized at version:', UI_LIB_VERSION);
```

## 6. Troubleshooting

- **Missing styles or un-themed components**: Verify that the consuming application imports standard theme variables or defines `--ui-*` / `--mat-sys-*` tokens.
- **Peer dependency warnings**: Peer dependencies are optional; install `@angular/core` and `@angular/cdk` only when using Angular-specific UI wrappers.

## 7. Version notes

- `0.0.1`: Initial workspace scaffolding, packaging pipeline, and agent skill bundle.
