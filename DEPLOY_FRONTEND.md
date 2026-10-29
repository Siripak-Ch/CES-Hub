# CES Hub — Latest Frontend Deployment

Deploy this folder as the static frontend (GitHub Pages / web server).

Canonical inventory source: `Accessories Data` in the Stock spreadsheet.
The inventory schema contains 28 columns. `Cost/ea` is column AA and
`Total Cost` is column AB. The dashboard reads AB; checkout calculates
selected quantity × AA.

The existing UI/views and labels are preserved; only the Check Stock, Audit Log,
and inventory-data integration logic was updated in this release.

Set `GAS_API_URL` in `js/config.js` to the `/exec` URL of the deployment.
The Web app must execute as the owner and allow access to all intended users.

Proven-unused files removed from the frontend package:
- `modules/900-app-controller.js` (duplicate; runtime loads `js/modules/900-app-controller.js`)
- `data/CES_Inventory_Clean_V30.0.30.xlsx` (no runtime references)
