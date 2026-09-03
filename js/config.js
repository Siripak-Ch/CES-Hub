// ============================================================
// config.js
// CES Hub GitHub Frontend Configuration
// Frontend only. Sheet IDs are checked through Apps Script health API.
// ============================================================

window.CES_CONFIG = {
  // IMPORTANT: After deploying Apps Script backend, paste the latest /exec URL here.
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbxvPz1GVmaM1JZS6-hP9pWAR9SN9OF61XnHhX_BafEHqD__jM7oAgtWT8gp8y-kSJ_idA/exec',
  // Optional extra /exec endpoints. The polyfill also accepts ?gasApiUrl=<url>
  // and persists that override, so a deployment URL can be corrected without
  // allowing every module to fail independently.
  GAS_API_URL_FALLBACKS: [],

  CSI_SURVEY_URL: 'https://survey.nhealth-asia.com/s/cm1hci0mw00jf45vmps2myg1g',

  APP_NAME: 'CES Hub',

  // LINE OA / LIFF client-side public configuration. No secrets belong here.
  LINE_OA: {
    ENABLED: true,
    OA_BASIC_ID: '@032jntyw',
    MESSAGING_CHANNEL_ID: '2007009771',
    LOGIN_CHANNEL_ID: '2009944147',
    LIFF_ID: '2009944147-iluulCQj',
    LIFF_SDK_URL: 'https://static.line-scdn.net/liff/edge/2/sdk.js',
    ENDPOINT_URL: 'https://siripak-ch.github.io/CES-Hub/'
  },

  DEBUG: false,
  RELEASE: 'CES-HUB-V30.0.30-INVENTORY-MEMO-WORKORDER',

  // External links are kept in one place. Config sheet values override these defaults at runtime.
  EXTERNAL_LINKS: {
    CONFIG_SHEET: 'https://docs.google.com/spreadsheets/d/1E5vHiYaWB0OApyoc4tp7MfuUo9xg_546uFLhiKqrtgM/edit?gid=1870451409#gid=1870451409',
    CES_EVALUATION_DATA: 'https://docs.google.com/spreadsheets/d/1gaTh8YFBWDX7cPFsdElzyMdGbbu6LZwYYe5I5VXrwVs/edit',
    SERVICE_CSI_CES_SUMMARY: 'https://survey.nhealth-asia.com/environments/cm5l2u5sl0008pv01is0nqdv5/surveys/cm1hci0mw00jf45vmps2myg1g/summary?referer=true',
    SERVICE_CSI_TES_SUMMARY: 'https://survey.nhealth-asia.com/environments/cm5l2u5sl0008pv01is0nqdv5/surveys/uyyoxtx5xogrpidf3gbmc6k2/summary',
    REPORT_CSI_SUMMARY: 'https://survey.nhealth-asia.com/environments/cm5l2u5sl0008pv01is0nqdv5/surveys/cmcu51nfa00e8s3010s2ukzvb/summary',
    REVENUE_DASHBOARD: 'https://nsmartplusdashboard.nhealth-asia.com/#/signin?externalRedirect=%2Ft%2FCustomerExperience%2Fviews%2FCES-HQFinancialPerformance%2FCES-HQ%3F%3Aiid%3D1%26&site=CustomerExperience',
    KPI_EHS_SHEET: 'https://docs.google.com/spreadsheets/d/1vNt7qUenxteIV3A0TnQ2QYf0esyOu3NvEjZG8zme5Gk/edit?usp=sharing',
    KPI_LAB_SHEET: 'https://docs.google.com/spreadsheets/d/1cdiwOpRZzU-MNLALEtcfpn-8HReLfz9tJkKhJzA0lKw/edit?usp=sharing',
    MEMO_WORKORDER_SOURCE: 'https://bdmsgroup.sharepoint.com/:x:/r/sites/Dataanalysis908/Shared%20Documents/Project/2025/Memo%20+%20Work%20Order/Memo%20Form+%20Work%20Order%20Form.xlsx?d=w6db9ac4eaff2441aacaddd1ed7fd3c37&csf=1&web=1&e=iQIzdW',
    JOB_RECORD_SOURCE: 'https://bdmsgroup-my.sharepoint.com/:x:/r/personal/nhbmecallab_bdms_co_th/Documents/33.%20Job%20Record%20Mobile%20Service/Job%20Record%20Mobile%20service%202025%20Rv.1.xlsx?d=w65bc2caadef04df99f0237be2438f710&csf=1&web=1&e=C8Y1ox',
    TRAINING_PLAN_2026: 'https://docs.google.com/spreadsheets/d/1qBR-KQ5cxVWw6iGWIxmYI9aXr3oTlhcu51JaQeBnxcw/edit?usp=sharing',
    VAN_BOOKING_FORM: 'https://forms.gle/Tra5UBHtbMWpXvhr7'
  },

  // AI CES V22.8: Gemini Online is the primary reasoning layer when configured; verified CES data is grounded first and local data is fallback only.
  AI_LOCAL: {
    ENABLED: true,
    KNOWLEDGE_SOURCE: 'BACKEND',
    CACHE_TTL_MINUTES: 120,
    MIN_SCORE: 18,
    MAX_RELATED: 3,
    LOG_QUESTIONS: true,
    SHOW_SOURCE: true,
    ENABLE_EVALUATION: true,
    EVALUATION_DELAY_MS: 90000,
    ONLINE_FALLBACK: true
  },

  SYNC_POLICY: {
    HOME_FIRST: true,
    LIVE_TTL_MS: { calendar:60000, car_booking:30000, van_booking:30000, stock_dashboard:60000, inventory:60000, check_stock:30000 },
    CACHE_SESSION_TABS: ['portal','management_overview','yearly','revenue','ot','service','report','memo_workorder','checkin','weekly','report_manage','kpi','team_information','team_plan','monthly_report','users','ces_evaluation','ces_ai_knowledge','setting','health']
  },

  PERFORMANCE: {
    MODULE_CACHE_TTL_MS: 600000,
    VEHICLE_CACHE_TTL_MS: 300000,
    PORTAL_CACHE_TTL_MS: 600000,
    PREVENT_DUPLICATE_LOADS: true
  },

  EXPECTED_SHEETS: {
    MAIN:  '1E5vHiYaWB0OApyoc4tp7MfuUo9xg_546uFLhiKqrtgM',
    KPI:   '1vNt7qUenxteIV3A0TnQ2QYf0esyOu3NvEjZG8zme5Gk',
    LAB_KPI: '1cdiwOpRZzU-MNLALEtcfpn-8HReLfz9tJkKhJzA0lKw',
    STOCK: '1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk'
  }
};
