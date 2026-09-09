# CES Hub — Latest Frontend Deployment

Deploy this folder as the static frontend (GitHub Pages / web server).

Canonical inventory source: `Accessories Data` in the Stock spreadsheet.
The frontend inventory import schema is now 26 columns and includes:
`Add Stock`, `Lot Number`, `Add Stock Date`.

The existing UI/views and labels are preserved; only the Check Stock, Audit Log,
and inventory-data integration logic was updated in this latest release.

Proven-unused files removed from the frontend package:
- `modules/900-app-controller.js` (duplicate; runtime loads `js/modules/900-app-controller.js`)
- `data/CES_Inventory_Clean_V30.0.30.xlsx` (no runtime references)
