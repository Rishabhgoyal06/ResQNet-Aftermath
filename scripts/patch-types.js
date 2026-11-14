const fs = require('fs');

// Patch SOSFeedTable.tsx
let feed = fs.readFileSync('apps/dashboard/src/components/dashboard/SOSFeedTable.tsx', 'utf8');
feed = feed.replace(
  "import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS } from '@resqnet/shared-types';",
  "import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS, type SOSCategory, type SeverityLevel } from '@resqnet/shared-types';"
);
feed = feed.replace("CATEGORY_ICONS[report.category]", "CATEGORY_ICONS[report.category as SOSCategory]");
feed = feed.replace("SEVERITY_COLORS[report.severity]", "SEVERITY_COLORS[report.severity as SeverityLevel]");
feed = feed.replace("SEVERITY_LABELS[report.severity]", "SEVERITY_LABELS[report.severity as SeverityLevel]");
fs.writeFileSync('apps/dashboard/src/components/dashboard/SOSFeedTable.tsx', feed, 'utf8');

// Patch LiveMap.tsx
let live = fs.readFileSync('apps/dashboard/src/components/map/LiveMap.tsx', 'utf8');
live = live.replace(
  "import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS } from '@resqnet/shared-types';",
  "import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS, type SOSCategory, type SeverityLevel } from '@resqnet/shared-types';"
);
live = live.replace("SEVERITY_COLORS[report.severity]", "SEVERITY_COLORS[report.severity as SeverityLevel]");
live = live.replace("CATEGORY_ICONS[report.category]", "CATEGORY_ICONS[report.category as SOSCategory]");
live = live.replace("SEVERITY_LABELS[report.severity]", "SEVERITY_LABELS[report.severity as SeverityLevel]");
fs.writeFileSync('apps/dashboard/src/components/map/LiveMap.tsx', live, 'utf8');

console.log('Successfully patched SOSFeedTable and LiveMap');
