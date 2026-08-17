// CES AI Local fallback knowledge V4. Used only when backend/cache is unavailable.
window.CES_AI_DEFAULT_KNOWLEDGE = [
  {
    "id": "KB-GENERAL-001",
    "category": "General",
    "title": "CES Hub คืออะไร",
    "questionPatterns": [
      "CES Hub คืออะไร",
      "ระบบนี้ใช้ทำอะไร",
      "ในเว็บมีอะไรบ้าง"
    ],
    "keywords": [
      "ces hub",
      "ระบบ",
      "ภาพรวม",
      "เมนู"
    ],
    "answer": "CES Hub เป็นศูนย์รวมการทำงานของทีม CES เช่น Portal, Management Overview, Calendar, Check-in, Car/Van Booking, Weekly Report, KPI, Report Management และระบบ Stock เมนูที่มองเห็นจะขึ้นอยู่กับ Role และ Permission ของผู้ใช้",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 98.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-GENERAL-002",
    "category": "General",
    "title": "วิธีเปิดเมนูใน CES Hub",
    "questionPatterns": [
      "เปิดเมนูอย่างไร",
      "ไปหน้าอื่นยังไง",
      "เปลี่ยนหน้าอย่างไร",
      "หาเมนูไม่เจอ"
    ],
    "keywords": [
      "sidebar",
      "เมนู",
      "เปิดหน้า",
      "navigation",
      "นำทาง"
    ],
    "answer": "ใช้เมนูด้านซ้ายเพื่อเปิดโมดูลที่ต้องการ หรือพิมพ์ชื่อเมนูใน CES Local Assistant แล้วกดปุ่ม “เปิดหน้า…” ใต้คำตอบ บนหน้าจอขนาดเล็กให้กดไอคอนเมนูเพื่อเปิด Sidebar ก่อน",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 86.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-LOGIN-001",
    "category": "Account",
    "title": "วิธีเข้าสู่ระบบ",
    "questionPatterns": [
      "เข้าสู่ระบบอย่างไร",
      "login ยังไง",
      "ใช้รหัสอะไรเข้า",
      "รหัสพนักงานเข้าไม่ได้"
    ],
    "keywords": [
      "login",
      "เข้าสู่ระบบ",
      "employee id",
      "รหัสพนักงาน"
    ],
    "answer": "กรอกรหัสพนักงานในหน้า Login แล้วกด “Login / Check ID” หากใช้อุปกรณ์ส่วนตัวสามารถเลือก Remember this device ได้ หากระบบไม่พบรหัส ให้ตรวจสอบตัวเลขอีกครั้งหรือส่ง Request Access",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 96.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-LOGIN-002",
    "category": "Account",
    "title": "วิธีขอสิทธิ์ใช้งาน",
    "questionPatterns": [
      "ขอสิทธิ์ใช้งานอย่างไร",
      "ยังไม่มีบัญชี",
      "request access",
      "สมัครใช้งาน CES Hub"
    ],
    "keywords": [
      "request access",
      "สมัคร",
      "ขอสิทธิ์",
      "pending",
      "อนุมัติบัญชี"
    ],
    "answer": "ที่หน้า Login กด “Request Access Now” แล้วกรอก Employee ID, ชื่อไทย, ชื่ออังกฤษ, Email, Team และ Position จากนั้นส่งคำขอและรอ Admin อนุมัติ เมื่ออนุมัติแล้วจึงเข้าสู่ระบบด้วยรหัสพนักงานได้",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 90.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-PROFILE-001",
    "category": "Account",
    "title": "แก้ไขข้อมูลโปรไฟล์",
    "questionPatterns": [
      "แก้ชื่ออย่างไร",
      "แก้อีเมลอย่างไร",
      "แก้โปรไฟล์",
      "ข้อมูลส่วนตัวผิด"
    ],
    "keywords": [
      "profile",
      "โปรไฟล์",
      "ชื่อ",
      "email",
      "อีเมล"
    ],
    "answer": "กดโปรไฟล์ผู้ใช้บริเวณ Header แล้วเปิด My Profile Settings สามารถแก้ชื่อไทย ชื่ออังกฤษ และ Email ได้ ส่วน Team, Position, Role และข้อมูลบริษัทเป็นข้อมูลที่ควบคุมโดย Admin",
    "targetTab": "team_information",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 78.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-PERM-001",
    "category": "Account",
    "title": "มองไม่เห็นเมนูหรือไม่มีสิทธิ์",
    "questionPatterns": [
      "ทำไมไม่เห็นเมนู",
      "เมนูหาย",
      "ไม่มีสิทธิ์เข้า",
      "permission denied",
      "เปิดหน้าไม่ได้"
    ],
    "keywords": [
      "permission",
      "role",
      "สิทธิ์",
      "เมนูหาย",
      "admin"
    ],
    "answer": "เมนูใน CES Hub แสดงตาม Role และ Role Permissions หากไม่เห็นเมนูที่จำเป็น ให้แจ้ง Admin ตรวจสอบ Role ของบัญชีและการตั้งค่า Permissions ใน User Management",
    "targetTab": "users",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 96.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-REFRESH-001",
    "category": "Troubleshooting",
    "title": "ข้อมูลไม่อัปเดตหรือหน้าโหลดค้าง",
    "questionPatterns": [
      "ข้อมูลไม่อัปเดต",
      "ข้อมูลไม่อัพเดท",
      "หน้าโหลดค้าง",
      "sync ไม่เสร็จ",
      "ข้อมูลเก่า"
    ],
    "keywords": [
      "refresh",
      "sync",
      "cache",
      "โหลดใหม่",
      "ข้อมูลไม่อัปเดต"
    ],
    "answer": "กด Refresh หรือ Sync Data ภายในโมดูลก่อน หากยังไม่เปลี่ยนให้กด Ctrl+Shift+R เพื่อโหลดเว็บใหม่แบบไม่ใช้ Cache แล้ว Login ใหม่อีกครั้ง หากยังผิดปกติให้เปิด System Health เพื่อตรวจ Backend/API",
    "targetTab": "health",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 95.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-PORTAL-001",
    "category": "Portal",
    "title": "วิธีใช้ CES Hub Portal",
    "questionPatterns": [
      "portal ใช้อย่างไร",
      "หน้า portal มีอะไร",
      "หน้าแรกใช้ทำอะไร"
    ],
    "keywords": [
      "portal",
      "applications",
      "recently visited",
      "broadcast"
    ],
    "answer": "CES Hub Portal เป็นหน้าเริ่มต้นสำหรับเปิด Management Overview, Master Calendar และ Applications & Services รวมถึงดู Broadcast, Event, Top Active Users และ Recently Visited สามารถกดการ์ดเพื่อเปิดระบบที่เกี่ยวข้องได้ทันที",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 84.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-HOME-001",
    "category": "Management Overview",
    "title": "ดูภาพรวมผลการดำเนินงาน",
    "questionPatterns": [
      "ดู management overview",
      "ดู dashboard ภาพรวม",
      "ดูผลงานรวม",
      "ดู CSI revenue job"
    ],
    "keywords": [
      "management overview",
      "dashboard",
      "revenue",
      "csi",
      "job",
      "ot"
    ],
    "answer": "เข้า Management Overview แล้วเลือกทีมและช่วง Yearly หรือ Monthly ระบบจะแสดง Quality & Satisfaction, Revenue, Job & Capacity, OT, Check-in และ Weekly Updates ตามข้อมูลที่โหลดล่าสุด",
    "targetTab": "home",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 90.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-HOME-002",
    "category": "Management Overview",
    "title": "วิธีเปลี่ยนทีมและช่วงเวลาใน Dashboard",
    "questionPatterns": [
      "เปลี่ยนทีมใน dashboard",
      "ดูเฉพาะทีม",
      "เลือกปีเดือนอย่างไร"
    ],
    "keywords": [
      "filter",
      "ทีม",
      "yearly",
      "monthly",
      "all"
    ],
    "answer": "ใช้ตัวเลือก All, MED, LAB, EHS, ENV หรือ TES และเลือก Yearly/Monthly ด้านบนของ Management Overview กราฟและ KPI จะเปลี่ยนตาม Filter ที่เลือก",
    "targetTab": "home",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 72.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CALENDAR-001",
    "category": "Calendar",
    "title": "วิธีดู Master Calendar",
    "questionPatterns": [
      "ดูตารางงานอย่างไร",
      "calendar ใช้อย่างไร",
      "ดูแผนงานทีม",
      "งาน onsite อยู่ไหน"
    ],
    "keywords": [
      "calendar",
      "ปฏิทิน",
      "ตารางงาน",
      "แผนงาน",
      "onsite"
    ],
    "answer": "เข้า Master Calendar เลือกช่วงวันที่และทีม เช่น MED, LAB, EHS, ENV หรือ TES จากนั้นดูรายการในปฏิทินหรือ Job List Details กดรายการงานเพื่อดูรายละเอียดเพิ่มเติม",
    "targetTab": "calendar",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 96.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CALENDAR-002",
    "category": "Calendar",
    "title": "นำเข้าแผนงาน MED หรือ TES",
    "questionPatterns": [
      "import med อย่างไร",
      "import tes plan",
      "นำเข้าแผนงาน",
      "อัปโหลด calendar"
    ],
    "keywords": [
      "import med",
      "import tes",
      "นำเข้า",
      "plan tracker"
    ],
    "answer": "ใน Master Calendar ใช้ปุ่ม Import MED หรือ Import TES Plan ตามประเภทไฟล์ ตรวจสอบรูปแบบข้อมูลก่อนนำเข้า และ Refresh หลังระบบประมวลผลเสร็จ การนำเข้าควรทำโดยผู้มีสิทธิ์ตามที่ระบบกำหนด",
    "targetTab": "calendar",
    "allowedRoles": [
      "ADMIN",
      "SUPERVISOR"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 76.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CHECKIN-001",
    "category": "Check-in",
    "title": "วิธี Check-in หน้างาน",
    "questionPatterns": [
      "วิธี check-in",
      "เช็กอินอย่างไร",
      "เช็คอินยังไง",
      "เริ่มงาน onsite"
    ],
    "keywords": [
      "checkin",
      "check-in",
      "เช็กอิน",
      "gps",
      "location",
      "confirm in"
    ],
    "answer": "เข้า Check-in / GPS เลือกวันที่และงานใน Daily Jobs กด Check In อนุญาต Location และรอให้ระบบพบพิกัด ตรวจสอบงานและสถานที่ แนบ Evidence Photo เมื่อจำเป็น แล้วกด Confirm IN",
    "targetTab": "checkin",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CHECKIN-002",
    "category": "Check-in",
    "title": "GPS ไม่ทำงานหรือไม่พบตำแหน่ง",
    "questionPatterns": [
      "gps ไม่ทำงาน",
      "หา location ไม่เจอ",
      "อนุญาตตำแหน่งอย่างไร",
      "checkin ไม่ได้เพราะ gps"
    ],
    "keywords": [
      "gps",
      "location",
      "ตำแหน่ง",
      "permission",
      "accuracy"
    ],
    "answer": "เปิด Location/GPS ของอุปกรณ์ อนุญาตตำแหน่งให้ Browser และปิดโหมดประหยัดพลังงาน จากนั้นกด Refresh GPS และอยู่ในพื้นที่สัญญาณชัด หากเคยกด Block ให้เปิด Site Settings ของ Browser แล้วเปลี่ยน Location เป็น Allow",
    "targetTab": "checkin",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 98.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CHECKIN-003",
    "category": "Check-in",
    "title": "วิธี Check-out",
    "questionPatterns": [
      "วิธี check-out",
      "ออกงานอย่างไร",
      "confirm out",
      "เช็กเอาท์"
    ],
    "keywords": [
      "checkout",
      "check-out",
      "out",
      "จบงาน"
    ],
    "answer": "ต้อง Check-in งานนั้นก่อน จึงจะกด OUT ได้ เมื่อทำงานเสร็จให้กด OUT ใน Daily Jobs รอ GPS ตรวจสอบตำแหน่ง แนบหลักฐานถ้าจำเป็น แล้วกด Confirm OUT หลังบันทึกสามารถอัปเดต Weekly Report ต่อได้",
    "targetTab": "checkin",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 94.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CHECKIN-004",
    "category": "Check-in",
    "title": "Manual Overwrite และแก้ตำแหน่ง",
    "questionPatterns": [
      "manual overwrite คืออะไร",
      "แก้ location checkin",
      "แก้พิกัด checkin"
    ],
    "keywords": [
      "manual overwrite",
      "edit location",
      "แก้ตำแหน่ง",
      "admin checkin"
    ],
    "answer": "Manual Overwrite และ Edit Location ใช้เมื่อข้อมูลตำแหน่งหรือรายการ Check-in ต้องแก้ไขเป็นกรณีพิเศษ ควรใช้โดย Admin หรือผู้มีสิทธิ์ พร้อมระบุเหตุผลและหลักฐานให้ตรวจสอบย้อนหลังได้",
    "targetTab": "checkin",
    "allowedRoles": [
      "ADMIN",
      "SUPERVISOR"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 70.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CAR-001",
    "category": "Car Booking",
    "title": "วิธีส่งคำขอ Car Booking",
    "questionPatterns": [
      "วิธีจองรถยนต์",
      "car booking ทำอย่างไร",
      "ส่งคำขอใช้รถ",
      "จองรถ onsite"
    ],
    "keywords": [
      "car booking",
      "จองรถ",
      "request",
      "onsite work"
    ],
    "answer": "เข้า Car Booking แท็บ Request ตรวจสอบข้อมูลผู้ขอ เลือก Onsite Work จาก Master Calendar กรอกวันที่ เวลา Destination, Purpose และผู้โดยสาร จากนั้นแนบ Memo เลือก Approve By และกด Submit Request โดยยังไม่ต้องกรอก KM; Actual Total (km) กรอกตอนคืนรถ",
    "targetTab": "car_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CAR-002",
    "category": "Car Booking",
    "title": "เอกสารและข้อมูลที่ต้องใช้จองรถ",
    "questionPatterns": [
      "จองรถต้องแนบอะไร",
      "car booking ใช้เอกสารอะไร",
      "ต้องมี memo ไหม",
      "ข้อมูลที่ต้องกรอกจองรถ"
    ],
    "keywords": [
      "memo",
      "approve by",
      "estimated km",
      "destination",
      "เอกสารจองรถ"
    ],
    "answer": "ข้อมูลสำคัญของ Car Booking ได้แก่ งานจาก Master Calendar, Start Date, Planned Return Date, เวลา, Destination, Purpose, Memo File และผู้อนุมัติ Approve By โดยไม่ต้องกรอก Estimated KM; Actual Total (km) กรอกตอนคืนรถ ควรตรวจสอบ Email และเบอร์ติดต่อให้ถูกต้องก่อนส่ง",
    "targetTab": "car_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 98.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CAR-003",
    "category": "Car Booking",
    "title": "วิธีคืนรถและปิดรายการ",
    "questionPatterns": [
      "คืนรถอย่างไร",
      "car return",
      "ปิดงานจองรถ",
      "ส่งรูปคืนรถ"
    ],
    "keywords": [
      "return",
      "คืนรถ",
      "actual km",
      "electric bill",
      "receipt",
      "return picture"
    ],
    "answer": "เข้า Car Booking แท็บ Return เลือกรายการที่ต้องคืน กรอก Return Date/Time, Actual Total (km), Electric Bill แนบ Bill/Receipt Photo และ Car Return Pictures ใส่ Return Note แล้วกด Confirm Return",
    "targetTab": "car_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 96.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CAR-004",
    "category": "Car Booking",
    "title": "ตรวจสอบรถว่างและสถานะคำขอ",
    "questionPatterns": [
      "ดูรถว่างตรงไหน",
      "เช็กสถานะจองรถ",
      "car availability",
      "คำขอรถอยู่ไหน"
    ],
    "keywords": [
      "availability",
      "สถานะคำขอ",
      "booking requests",
      "รถว่าง"
    ],
    "answer": "ดูส่วน Car Booking Availability เพื่อเช็กช่วงเวลาที่มีรายการจอง และดู Car Booking Requests สำหรับสถานะคำขอ หากข้อมูลยังไม่เปลี่ยนให้กด Refresh หรือ Clear Filter แล้วเลือกช่วงใหม่",
    "targetTab": "car_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 82.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-VAN-001",
    "category": "Van Booking",
    "title": "วิธีดูตาราง Van Booking",
    "questionPatterns": [
      "ดู van booking อย่างไร",
      "รถตู้ว่างวันไหน",
      "ดูตารางรถตู้",
      "van calendar"
    ],
    "keywords": [
      "van booking",
      "รถตู้",
      "calendar",
      "available dates"
    ],
    "answer": "เข้า Van Booking เลือก Year, Month และ Team จากนั้นดู Van Booking Calendar, Van Job List Details และ Available Dates กด Today เพื่อกลับมาวันปัจจุบัน",
    "targetTab": "van_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 92.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-VAN-002",
    "category": "Van Booking",
    "title": "ข้อมูล Van Booking ไม่ตรง Calendar",
    "questionPatterns": [
      "van booking ไม่ sync",
      "รถตู้ไม่ขึ้น",
      "งานรถตู้หาย",
      "เปลี่ยน filter แล้วข้อมูลไม่เปลี่ยน"
    ],
    "keywords": [
      "van",
      "sync",
      "filter",
      "calendar",
      "resync"
    ],
    "answer": "เปลี่ยน Year, Month หรือ Team แล้วรอระบบโหลดข้อมูลใหม่ หากรายการยังไม่ตรง ให้กลับไปตรวจงานใน Master Calendar แล้ว Refresh หน้า Van Booking อีกครั้ง เพราะข้อมูลรถตู้ใช้แผนงานที่เชื่อมจาก Calendar",
    "targetTab": "van_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 86.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-WEEKLY-001",
    "category": "Weekly Report",
    "title": "วิธีเพิ่ม Weekly Report",
    "questionPatterns": [
      "วิธีทำ weekly report",
      "เพิ่มรายงานประจำสัปดาห์",
      "กรอก weekly อย่างไร"
    ],
    "keywords": [
      "weekly report",
      "new form",
      "add to queue",
      "work order"
    ],
    "answer": "เข้า Weekly Report เลือก Form View และกด New Form เลือกทีม/Sub Team, Job Type, กรอก Details, Work Order, ความคืบหน้า Device/Report, Note, Incident, Overall Status และ Team Members แล้วกด Add to Queue",
    "targetTab": "weekly",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-WEEKLY-002",
    "category": "Weekly Report",
    "title": "วิธีส่ง Weekly Report หลายรายการ",
    "questionPatterns": [
      "submit weekly หลายรายการ",
      "ส่งรายงานทั้งหมด",
      "queue อยู่ไหน"
    ],
    "keywords": [
      "queue",
      "submit all reports",
      "ส่งทั้งหมด",
      "sync data"
    ],
    "answer": "หลังเพิ่มแต่ละงานด้วย Add to Queue ให้ตรวจรายการในคิว แล้วกด Submit All Reports ระบบจะส่งทุกรายการพร้อมกัน เมื่อเสร็จให้กด Sync Data เพื่อตรวจว่ารายการปรากฏใน Dashboard",
    "targetTab": "weekly",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 90.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-WEEKLY-003",
    "category": "Weekly Report",
    "title": "Quick Close และอัปเดตงานค้าง",
    "questionPatterns": [
      "quick close job คืออะไร",
      "ปิดงาน weekly เร็ว",
      "อัปเดต pending jobs"
    ],
    "keywords": [
      "quick close",
      "pending jobs",
      "overall status",
      "finish"
    ],
    "answer": "ใน Weekly Dashboard ใช้ Quick Close Job หรือ Quick Update Pending Jobs เพื่ออัปเดตงานที่เลือกเป็นชุด ตรวจสอบรายการและสถานะให้ถูกต้องก่อนยืนยัน โดยเฉพาะงานที่ยังมี Incident หรือ Report ค้าง",
    "targetTab": "weekly",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 72.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-KPI-001",
    "category": "KPI",
    "title": "วิธีดู KPI Tracking",
    "questionPatterns": [
      "ดู kpi อย่างไร",
      "kpi tracking ใช้อย่างไร",
      "ดูงานค้าง KPI"
    ],
    "keywords": [
      "kpi tracking",
      "performance summary",
      "workflow",
      "status"
    ],
    "answer": "เข้า KPI Tracking เลือกทีม MED, LAB หรือ EHS และใช้ Filter/Status Summary เพื่อดูรายการงาน กดแถวงานเพื่อเปิด Workflow Details & Action และตรวจสถานะในแต่ละขั้นตอน",
    "targetTab": "kpi",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 94.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-KPI-002",
    "category": "KPI",
    "title": "วิธีอัปเดตสถานะ KPI",
    "questionPatterns": [
      "อัปเดตสถานะ kpi",
      "เปลี่ยน status งาน",
      "save status KPI"
    ],
    "keywords": [
      "select next status",
      "strict flow",
      "save status",
      "workflow"
    ],
    "answer": "เลือกงานใน KPI Tracking ตรวจ Current Status แล้วเลือก Select Next Status ตาม Strict Flow จากนั้นกด “บันทึกการอัปเดตสถานะ” ระบบจะไม่อนุญาตให้ข้ามลำดับ Workflow ที่กำหนด",
    "targetTab": "kpi",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 92.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-KPI-003",
    "category": "KPI",
    "title": "แจ้งเตือนงาน KPI ล่าช้า",
    "questionPatterns": [
      "แจ้งเตือน kpi late",
      "notify manager",
      "งาน KPI ล่าช้า"
    ],
    "keywords": [
      "late kpi",
      "notify manager",
      "notification",
      "ล่าช้า"
    ],
    "answer": "ใช้ส่วน Late KPI Notification เลือกรายการที่ต้องติดตาม ตรวจสอบผู้รับและรายละเอียด แล้วกด Notify Manager เฉพาะกรณีที่ข้อมูลสถานะและวันครบกำหนดถูกต้อง",
    "targetTab": "kpi",
    "allowedRoles": [
      "ADMIN",
      "SUPERVISOR"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 74.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-REPORT-MANAGE-001",
    "category": "Report Management",
    "title": "วิธีสร้างและ Export Report",
    "questionPatterns": [
      "สร้าง report อย่างไร",
      "generate export report",
      "report management ใช้อย่างไร"
    ],
    "keywords": [
      "report management",
      "generate",
      "export report",
      "add row"
    ],
    "answer": "เข้า Report Management ตรวจข้อมูล Name, Employee ID, Team, Cost Center และ Signature กด ADD ROW เพื่อเพิ่มรายละเอียด จากนั้นกด GENERATE & EXPORT REPORT เพื่อตรวจและดาวน์โหลดเอกสาร",
    "targetTab": "report_manage",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 92.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-REPORT-MANAGE-002",
    "category": "Report Management",
    "title": "วิธีส่ง Report ให้ Manager",
    "questionPatterns": [
      "ส่ง report ให้ manager",
      "send to manager now",
      "ready to submit"
    ],
    "keywords": [
      "send manager",
      "ready to submit",
      "signature",
      "submit report"
    ],
    "answer": "ตรวจข้อมูลและไฟล์ที่ Generate แล้ว เลือก Ready to Submit ตามเงื่อนไขของงาน จากนั้นกด SEND TO MANAGER NOW และตรวจผลใน Operation Log หากส่งไม่สำเร็จให้ตรวจ Email/การตั้งค่า Admin และลองใหม่",
    "targetTab": "report_manage",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 86.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-SERVICE-CSI-001",
    "category": "Service CSI",
    "title": "วิธีดู Service CSI",
    "questionPatterns": [
      "ดู service csi",
      "คะแนนบริการอยู่ไหน",
      "ดู customer feedback service"
    ],
    "keywords": [
      "service csi",
      "score",
      "customer feedback",
      "memo mapping"
    ],
    "answer": "เข้า Service CSI เลือกทีมและช่วงเวลาที่ต้องการ ระบบจะแสดง Monthly Trend, Service Share, Customer List, Score Analysis, Growth และ Customer Feedback ใช้ Memo Mapping เมื่อต้องเชื่อม Memo กับรายการบริการ",
    "targetTab": "service",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 86.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-REPORT-CSI-001",
    "category": "Report CSI",
    "title": "วิธีดู Report CSI และ Incident",
    "questionPatterns": [
      "ดู report csi",
      "ดู incident tracker",
      "customer feedback report"
    ],
    "keywords": [
      "report csi",
      "incident",
      "root cause",
      "solution",
      "feedback"
    ],
    "answer": "เข้า Report CSI เลือกทีม ปี และเดือน จากนั้นดู Monthly Trend, Service Share, Customer List และ Customer Feedback รายการที่ต้องดำเนินการสามารถเปิด Incident Tracker แล้วบันทึก Root Cause และ Solution",
    "targetTab": "report",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 86.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-REVENUE-001",
    "category": "Revenue",
    "title": "วิธีดูและแก้ Revenue",
    "questionPatterns": [
      "ดู revenue อย่างไร",
      "แก้ revenue target",
      "แก้ยอด actual"
    ],
    "keywords": [
      "revenue dashboard",
      "target",
      "actual",
      "edit all"
    ],
    "answer": "เข้า Revenue Dashboard เพื่อดู Yearly Trend และ Breakdown ตามทีม หากมีสิทธิ์แก้ไข ให้กด Edit All หรือเลือกเดือน กรอก Target Amount และ Actual Amount แล้ว Save Changes ตรวจตัวเลขก่อนบันทึกทุกครั้ง",
    "targetTab": "revenue",
    "allowedRoles": [
      "ADMIN",
      "SUPERVISOR"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 80.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-YEARLY-001",
    "category": "Job Dashboard",
    "title": "วิธีดู Job Dashboard",
    "questionPatterns": [
      "ดูจำนวนงานรายปี",
      "job dashboard ใช้อย่างไร",
      "ดู job trend"
    ],
    "keywords": [
      "job dashboard",
      "yearly",
      "job trend",
      "service share",
      "export data"
    ],
    "answer": "เข้า Job Dashboard เพื่อดู Job trend vs Target, Service Share และ Monthly Detailed Records เลือกตัวกรองที่ต้องการ และกด Export Data เมื่อต้องการนำข้อมูลออกไปวิเคราะห์ต่อ",
    "targetTab": "yearly",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 82.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-OT-001",
    "category": "OT",
    "title": "วิธีดู OT Dashboard",
    "questionPatterns": [
      "ดู ot อย่างไร",
      "ot dashboard ใช้อย่างไร",
      "ดูชั่วโมง OT"
    ],
    "keywords": [
      "ot dashboard",
      "overtime",
      "staff performance",
      "fiscal year"
    ],
    "answer": "เข้า OT Dashboard เลือกทีม Fiscal Year และ Monthly Period ระบบจะแสดงภาพรวม OT และ Staff Performance Summary ตามข้อมูล Check-in/Check-out ที่ระบบรวบรวม",
    "targetTab": "ot",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 82.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-INVENTORY-001",
    "category": "Inventory",
    "title": "วิธีค้นหาอุปกรณ์ใน Inventory",
    "questionPatterns": [
      "ค้นหาอุปกรณ์ใน inventory",
      "หา serial number",
      "ดูรายการ equipment",
      "อุปกรณ์อยู่ไหน"
    ],
    "keywords": [
      "inventory",
      "equipment",
      "serial",
      "asset",
      "ค้นหาอุปกรณ์"
    ],
    "answer": "เข้า Inventory เลือก Equipment แล้วใช้ช่องค้นหาด้วย Serial Number, Asset Number, Model หรือชื่ออุปกรณ์ ตรวจ Status และ Location ก่อนทำรายการ Check-Out",
    "targetTab": "inventory",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 98.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-INVENTORY-002",
    "category": "Inventory",
    "title": "วิธี Check-Out อุปกรณ์",
    "questionPatterns": [
      "ยืมอุปกรณ์อย่างไร",
      "checkout equipment",
      "ตะกร้า checkout"
    ],
    "keywords": [
      "check-out",
      "checkout",
      "ตะกร้า",
      "ยืมอุปกรณ์"
    ],
    "answer": "ใน Inventory เลือกอุปกรณ์ที่สถานะพร้อมใช้งาน เพิ่มลง “ตะกร้า Check-Out” ตรวจรายการ ผู้รับ และข้อมูลที่เกี่ยวข้อง แล้วกด “ยืนยัน Check-Out” ห้ามเลือกอุปกรณ์ที่กำลังยืม รอสอบเทียบ หรือชำรุด",
    "targetTab": "inventory",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 94.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-INVENTORY-003",
    "category": "Inventory",
    "title": "วิธีจัดการ Accessories",
    "questionPatterns": [
      "ดู accessories",
      "เบิก accessory",
      "ของสิ้นเปลืองอยู่ไหน"
    ],
    "keywords": [
      "accessories",
      "accessory",
      "เบิก",
      "stock accessory"
    ],
    "answer": "เข้า Inventory แล้วเลือก Accessories เพื่อดูจำนวนคงเหลือ หรือใช้ Check Stock > เบิก Accessories สำหรับส่งคำขอเบิกตามขั้นตอนอนุมัติ ตรวจจำนวนและหน่วยก่อนยืนยัน",
    "targetTab": "inventory",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 84.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-STOCK-CHECK-001",
    "category": "Check Stock",
    "title": "ขั้นตอนสถานะอุปกรณ์ใน Check Stock",
    "questionPatterns": [
      "check stock ใช้อย่างไร",
      "สถานะอุปกรณ์เปลี่ยนยังไง",
      "scan cal pm",
      "return check in"
    ],
    "keywords": [
      "check stock",
      "scan",
      "cal pm",
      "ready",
      "เช่ายืม",
      "รอสอบเทียบ"
    ],
    "answer": "Check Stock มี Flow หลัก: Return / Check-In เปลี่ยนจากเช่ายืมเป็นรอสอบเทียบ, Scan CAL/PM เปลี่ยนจากรอสอบเทียบเป็นพร้อมส่ง และ Check-Out เปลี่ยนจากพร้อมส่งเป็นเช่ายืม ควรสแกนและตรวจรายการให้ตรงฐานข้อมูลก่อนยืนยัน",
    "targetTab": "check_stock",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-STOCK-CHECK-002",
    "category": "Check Stock",
    "title": "สแกนอุปกรณ์แล้วไม่ตรงฐานข้อมูล",
    "questionPatterns": [
      "พบรายการไม่ตรงฐานข้อมูล",
      "สแกนแล้วไม่พบ",
      "serial ไม่ตรง",
      "ป้ายอ่านไม่ได้"
    ],
    "keywords": [
      "ไม่ตรงฐานข้อมูล",
      "scan error",
      "serial",
      "ocr",
      "ป้าย"
    ],
    "answer": "ตรวจ Serial/Asset บนป้ายและลองค้นหาด้วยตนเอง หากถ่ายรูปให้ภาพชัด แสงเพียงพอ และเห็นข้อความครบ หากยังไม่พบ ห้ามสร้างรายการซ้ำเอง ให้แจ้ง Admin ตรวจฐานข้อมูล Inventory",
    "targetTab": "check_stock",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 96.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-STOCK-CHECK-003",
    "category": "Check Stock",
    "title": "วิธีขอเบิก Accessories",
    "questionPatterns": [
      "เบิก accessories อย่างไร",
      "ขออนุมัติ accessory",
      "เบิกของใน check stock"
    ],
    "keywords": [
      "เบิก accessories",
      "ขออนุมัติ",
      "accessory request"
    ],
    "answer": "เข้า Check Stock กด “เบิก Accessories” เลือกรายการและจำนวน ตรวจผู้ขอและเหตุผล แล้วกด “ขออนุมัติ” ติดตามผลจาก Activity Log และอย่าเบิกเกินจำนวนคงเหลือ",
    "targetTab": "check_stock",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 88.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-STOCK-DASH-001",
    "category": "Stock Dashboard",
    "title": "วิธีดู Infusion Pump Dashboard",
    "questionPatterns": [
      "ดู infusion pump dashboard",
      "ดู stock summary",
      "ดูสัญญา rental"
    ],
    "keywords": [
      "infusion pump",
      "stock dashboard",
      "contract",
      "status share",
      "location"
    ],
    "answer": "เข้า Infusion Pump Dashboard เพื่อดู Status Share, Model × Status, Brand Share, Top Location และ Rental Contract Summary ใช้ตัวกรองเพื่อลดรายการ และกด Export Contract เมื่อต้องการส่งออกข้อมูลสัญญา",
    "targetTab": "stock_dashboard",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 84.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-TEAM-001",
    "category": "Team Information",
    "title": "ดูข้อมูลทีมและพนักงาน",
    "questionPatterns": [
      "ดูข้อมูลทีม",
      "ใครอยู่ทีมไหน",
      "team information"
    ],
    "keywords": [
      "team information",
      "ทีม",
      "พนักงาน",
      "position"
    ],
    "answer": "เข้า Team Information เพื่อดูสมาชิก ชื่อ ตำแหน่ง และข้อมูลทีม ข้อมูลนี้โหลดจาก Staff Data และเปลี่ยนไม่บ่อย หากพบข้อมูลผิดให้ Admin แก้ไขจากสิทธิ์ที่กำหนด",
    "targetTab": "team_information",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 80.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-USERS-001",
    "category": "User Management",
    "title": "อนุมัติและแก้ไขผู้ใช้",
    "questionPatterns": [
      "อนุมัติ user อย่างไร",
      "แก้ role ผู้ใช้",
      "pending approvals",
      "แก้ทีมพนักงาน"
    ],
    "keywords": [
      "user management",
      "approve",
      "pending",
      "role",
      "permissions"
    ],
    "answer": "Admin เข้า User Management ตรวจ Pending Approvals ก่อนอนุมัติ จาก Active Staff สามารถแก้ Team, Position, System Role และข้อมูลบริษัทได้ หลังแก้ให้ Save Changes และตรวจว่าผู้ใช้ Login ใหม่แล้วเห็นเมนูถูกต้อง",
    "targetTab": "users",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 94.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-USERS-002",
    "category": "User Management",
    "title": "ตั้งค่า Role Permissions",
    "questionPatterns": [
      "ตั้ง permission อย่างไร",
      "กำหนดเมนูตาม role",
      "role permissions"
    ],
    "keywords": [
      "role permissions",
      "permission",
      "save configuration"
    ],
    "answer": "Admin เข้า User Management > Permissions เลือกเมนูที่แต่ละ Role เข้าถึงได้ แล้วกด Save Configuration ผู้ใช้ที่กำลังเปิดระบบควร Logout/Login หรือ Refresh เพื่อรับสิทธิ์ล่าสุด",
    "targetTab": "users",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 92.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-SETTING-001",
    "category": "Setting",
    "title": "ตั้งค่าระบบ CES Hub",
    "questionPatterns": [
      "setting มีอะไร",
      "ตั้งค่า announcement",
      "ตั้ง team capacity",
      "ตั้ง calendar id"
    ],
    "keywords": [
      "setting",
      "announcement",
      "capacity",
      "calendar id",
      "line token",
      "target"
    ],
    "answer": "หน้า Setting ใช้ตั้ง Announcement, Admin Email, Promedguide URL, Team Capacity, Team Colors, Calendar IDs, CSI/SLA Targets, Revenue Targets, KPI Drive Links และ LINE Notification Tokens กด Save Changes หลังตรวจทุกค่า",
    "targetTab": "setting",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 86.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-HEALTH-001",
    "category": "System Health",
    "title": "ตรวจสอบระบบเมื่อ API มีปัญหา",
    "questionPatterns": [
      "เช็ก system health",
      "backend มีปัญหา",
      "api error",
      "run e2e"
    ],
    "keywords": [
      "system health",
      "api e2e",
      "function inventory",
      "error"
    ],
    "answer": "Admin เข้า System Health Check แล้วกด Run API E2E ตรวจ Infrastructure & Services, Function End-to-End Results, Frontend Deployment และ Recent API Errors หาก Fail ให้บันทึกชื่อ Function และข้อความ Error ก่อนแก้ไขหรือ Deploy Backend ใหม่",
    "targetTab": "health",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 92.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-001",
    "category": "CES AI",
    "title": "CES Local Assistant ทำงานอย่างไร",
    "questionPatterns": [
      "ai นี้ทำงานอย่างไร",
      "ใช้ chat bot ยังไง",
      "ระบบส่งข้อมูลออกไหม",
      "local ai คืออะไร"
    ],
    "keywords": [
      "local ai",
      "chatbot",
      "knowledge base",
      "privacy",
      "offline"
    ],
    "answer": "CES Local Assistant ค้นหาคำตอบจากฐาน AI_Knowledge ที่จัดเก็บใน Google Sheet แล้วประมวลผลการจับคู่ใน Browser ไม่มีการส่งคำถามไป OpenAI หรือ Gemini Admin สามารถเพิ่มคำตอบและดูคำถามที่ตอบไม่ได้จากหน้า Training",
    "targetTab": "setting",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-002",
    "category": "CES AI",
    "title": "วิธีสอนคำตอบใหม่ให้ CES AI",
    "questionPatterns": [
      "train ai อย่างไร",
      "เพิ่มคำตอบ chatbot",
      "สอน ai",
      "แก้คำตอบ ai"
    ],
    "keywords": [
      "train knowledge",
      "เพิ่มคำตอบ",
      "admin pin",
      "unanswered"
    ],
    "answer": "Admin เปิด Setting > CES AI Local Knowledge > Train Knowledge กรอก Admin PIN แล้วเพิ่ม Title, รูปแบบคำถาม, Keywords, คำตอบ และ Target Tab หรือเลือกคำถามจากรายการ Unanswered แล้วกด Save จากนั้น Refresh Knowledge",
    "targetTab": "setting",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V4-001",
    "category": "CES AI",
    "title": "สรุปข้อมูลในหน้าปัจจุบัน",
    "questionPatterns": [
      "สรุปหน้านี้",
      "สรุปข้อมูลที่เห็น",
      "ขอสรุปเป็นตาราง",
      "current page summary"
    ],
    "keywords": [
      "สรุปหน้านี้",
      "table",
      "summary",
      "ข้อมูลปัจจุบัน",
      "csv"
    ],
    "answer": "พิมพ์ “สรุปหน้านี้” ใน CES Local Assistant ระบบจะอ่านข้อความและ KPI ที่แสดงอยู่ในหน้าปัจจุบัน แล้วสรุปเป็นข้อความหรือตารางได้ หากมีตารางจะแสดงปุ่มดาวน์โหลด CSV โดยไม่เรียก AI ภายนอก",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V4-002",
    "category": "CES AI",
    "title": "ดาวน์โหลดข้อมูลจากคำตอบเป็น CSV",
    "questionPatterns": [
      "ดาวน์โหลดข้อมูล",
      "export คำตอบ",
      "ขอเป็นไฟล์",
      "ส่งออก csv"
    ],
    "keywords": [
      "download",
      "csv",
      "export",
      "file",
      "ตาราง"
    ],
    "answer": "เมื่อคำตอบมีตาราง ระบบจะแสดงปุ่ม “ดาวน์โหลด CSV” ใต้คำตอบ ไฟล์สร้างใน Browser จากข้อมูลที่แสดงอยู่และไม่มีการส่งข้อมูลออกไปยังบริการภายนอก",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 96.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V4-003",
    "category": "CES AI",
    "title": "แบบประเมินการใช้งาน CES AI",
    "questionPatterns": [
      "ประเมิน ai",
      "ให้ดาว",
      "feedback chatbot",
      "แนะนำการพัฒนา"
    ],
    "keywords": [
      "rating",
      "ดาว",
      "feedback",
      "ความสะดวก",
      "ความเร็ว",
      "ความครบ"
    ],
    "answer": "หลังได้รับคำตอบ กด “ประเมินการใช้งาน” แล้วให้คะแนน 1–5 ดาวใน 3 ด้าน ได้แก่ ความสะดวก ความรวดเร็ว และความครบของข้อมูล พร้อมพิมพ์ข้อเสนอแนะเพิ่มเติมได้",
    "targetTab": "setting",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 94.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-PERF-V4-001",
    "category": "Troubleshooting",
    "title": "ทำไมหน้าเว็บ Sync หลายครั้ง",
    "questionPatterns": [
      "เปิดหน้าแล้ว sync หลายรอบ",
      "resync บ่อย",
      "โหลดข้อมูลซ้ำ",
      "หน้าเว็บช้า"
    ],
    "keywords": [
      "sync",
      "resync",
      "cache",
      "โหลดซ้ำ",
      "performance"
    ],
    "answer": "ระบบ V19 ใช้ Progressive Boot, Module Cache และป้องกันคำขอซ้ำระหว่างโหลด หน้าเดิมที่เปิดซ้ำภายในช่วง Cache จะใช้ข้อมูลที่มีอยู่ก่อน หากต้องการข้อมูลล่าสุดจริงให้กดปุ่ม Refresh หรือ Resync ของโมดูลนั้น",
    "targetTab": "health",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 94.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-LANG-V4-001",
    "category": "General",
    "title": "เปลี่ยนภาษาไทยและอังกฤษ",
    "questionPatterns": [
      "เปลี่ยนภาษา",
      "th eng",
      "english",
      "ภาษาไทย",
      "language switch"
    ],
    "keywords": [
      "TH",
      "EN",
      "language",
      "ภาษา"
    ],
    "answer": "กดปุ่ม TH/EN บริเวณ Header เพื่อสลับภาษาของเมนูหลัก หน้า Home, Car Booking และหน้าต่าง CES Assistant ระบบจะจำภาษาที่เลือกไว้ในอุปกรณ์นี้",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 92.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CAR-V4-001",
    "category": "Car Booking",
    "title": "Regular Car Fee คำนวณอย่างไร",
    "questionPatterns": [
      "regular car fee คืออะไร",
      "ค่ารถ 5 บาทต่อกิโล",
      "ค่าใช้รถคำนวณยังไง"
    ],
    "keywords": [
      "regular car fee",
      "5 baht km",
      "ค่าใช้รถ",
      "ระยะทาง"
    ],
    "answer": "Regular Car Fee คำนวณจากระยะทางที่นับใน Usage × 5 บาทต่อกิโลเมตร ส่วน Van Booking แสดงอัตราอ้างอิง 2,200 บาทต่อวัน โดยยอดจริงให้ยึดข้อมูลการใช้งานและเงื่อนไขที่องค์กรกำหนด",
    "targetTab": "car_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 98.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CAR-V4-002",
    "category": "Car Booking",
    "title": "สรุปข้อมูล Car Booking ปัจจุบัน",
    "questionPatterns": [
      "สรุป car booking",
      "รถใช้กี่วัน",
      "ระยะทางรวมเท่าไหร่",
      "ค่ารถเท่าไหร่"
    ],
    "keywords": [
      "car booking summary",
      "total km",
      "days of use",
      "utilization",
      "fee"
    ],
    "answer": "เปิดหน้า Car Booking เลือก Year, Month และ Team แล้วพิมพ์ “สรุปหน้านี้” ระบบจะรวบรวม Total KM, Days of Use, Total Jobs, Electric Bill, Regular Car Fee และ Day Utilization จากการ์ดที่กำลังแสดง",
    "targetTab": "car_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-SYS-V19-001",
    "category": "Troubleshooting",
    "title": "Function not allowed or not found แก้อย่างไร",
    "questionPatterns": [
      "function not allowed",
      "function not found",
      "api ใช้ไม่ได้",
      "backend function missing"
    ],
    "keywords": [
      "function not allowed",
      "api bridge",
      "allowlist",
      "deployment"
    ],
    "answer": "ข้อความนี้หมายถึง Frontend เรียกฟังก์ชันที่ Web App เวอร์ชันปัจจุบันยังไม่เปิดใช้งาน ให้ตรวจว่าอัปโหลด API_LIFF_Bridge.js และไฟล์ Backend ที่เกี่ยวข้องครบ จากนั้น Deploy > Manage deployments > Edit > New version > Deploy แล้วกด Ctrl+Shift+R",
    "targetTab": "health",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-SYS-V19-002",
    "category": "Troubleshooting",
    "title": "ตรวจสอบเวอร์ชัน Backend ที่ Deploy",
    "questionPatterns": [
      "backend version อะไร",
      "deploy ถูกหรือยัง",
      "เช็ก backend handshake"
    ],
    "keywords": [
      "backend handshake",
      "version",
      "deployment",
      "v19"
    ],
    "answer": "เปิด System Health หรือเรียก getCesBackendHandshakeLatest เพื่อตรวจ release, bridgeVersion และรายการฟังก์ชันสำคัญ หาก allReady เป็น false ให้คัดลอกไฟล์ Backend V19 ให้ครบและ Deploy เป็น New version",
    "targetTab": "health",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 98.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-PORTAL-V19-001",
    "category": "Portal",
    "title": "Portal data unavailable แก้อย่างไร",
    "questionPatterns": [
      "portal data unavailable",
      "หน้า home ไม่มีข้อมูล",
      "getPortalDashboard error"
    ],
    "keywords": [
      "portal unavailable",
      "getPortalDashboard",
      "home",
      "api"
    ],
    "answer": "กด Retry หรือ Refresh Portal ก่อน ระบบ V19 จะใช้ข้อมูล Cache ล่าสุดระหว่างรอ Backend หากยังขึ้น Function not allowed ให้ Deploy API_LIFF_Bridge.js และ Portal.js เวอร์ชัน V19 ใหม่",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-PERF-V19-001",
    "category": "Performance",
    "title": "Starting System ใช้เวลานาน",
    "questionPatterns": [
      "starting system นาน",
      "เปิดเว็บช้า",
      "splash ค้าง",
      "boot ช้า"
    ],
    "keywords": [
      "starting system",
      "progressive boot",
      "splash",
      "โหลดช้า"
    ],
    "answer": "ระบบ V19 แสดง Login และ Home จาก Core Module ก่อน แล้วโหลดโมดูลอื่นในพื้นหลัง หากยังช้าให้กด Ctrl+Shift+R หนึ่งครั้ง ตรวจอินเทอร์เน็ต และเปิด System Health ดูไฟล์ที่โหลดไม่สำเร็จ",
    "targetTab": "health",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 98.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-PERF-V19-002",
    "category": "Performance",
    "title": "หน้า Login Checking นาน",
    "questionPatterns": [
      "checking นาน",
      "login ช้า",
      "ตรวจรหัสพนักงานนาน"
    ],
    "keywords": [
      "login cache",
      "staff data",
      "checking",
      "employee id"
    ],
    "answer": "ระบบ V19 Cache รายชื่อพนักงานระยะสั้นเพื่อลดเวลา Login หากเป็นการเข้าใช้ครั้งแรกหลัง Cache หมดอาจช้ากว่าปกติเล็กน้อย หากเกินประมาณ 30 วินาทีให้ตรวจ Backend deployment และ Staff_Data",
    "targetTab": "health",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 96.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V19-001",
    "category": "CES AI",
    "title": "Admin PIN สำหรับ AI Training",
    "questionPatterns": [
      "pin ai คืออะไร",
      "admin pin",
      "pin 1234",
      "เข้า training ไม่ได้"
    ],
    "keywords": [
      "admin pin",
      "1234",
      "training",
      "script properties"
    ],
    "answer": "CES AI Training ใช้สิทธิ์ ADMIN จาก Staff_Data โดยตรง ไม่ใช้ PIN แยก หากเข้าไม่ได้ให้ตรวจ Role=ADMIN, Status=ACTIVE และ Deploy Backend รุ่นล่าสุด",
    "targetTab": "setting",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V19-002",
    "category": "CES AI",
    "title": "Starter Knowledge ไม่ครบ",
    "questionPatterns": [
      "starter knowledge ไม่ครบ",
      "คำถามเริ่มต้นหาย",
      "seed data",
      "repair knowledge"
    ],
    "keywords": [
      "starter",
      "seed",
      "repair",
      "knowledge count",
      "72"
    ],
    "answer": "V19 มี Starter Knowledge 72 หัวข้อ ระบบจะตรวจ ID ที่ขาดและเติมให้อัตโนมัติ เปิดหน้า Training แล้วกด Starter Data หรือ Run setupCesHubLatest เพื่อ Repair โดยไม่เขียนทับรายการที่ Admin แก้ไขแล้ว",
    "targetTab": "setting",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V19-003",
    "category": "CES AI",
    "title": "แบบประเมินคำตอบไม่แสดง",
    "questionPatterns": [
      "แบบประเมินไม่ขึ้น",
      "rating ไม่แสดง",
      "ให้ดาวไม่ได้"
    ],
    "keywords": [
      "evaluation",
      "rating",
      "stars",
      "feedback"
    ],
    "answer": "หลังคำตอบที่จับคู่ได้ ระบบ V19 จะแสดงแบบประเมิน 3 หัวข้อทันที หาก Backend ชั่วคราวไม่พร้อม ระบบจะเก็บผลประเมินไว้ใน Browser และส่งซ้ำเมื่อเชื่อมต่อได้",
    "targetTab": "setting",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 98.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V19-004",
    "category": "CES AI",
    "title": "ขอสรุปเป็นข้อความ ตาราง หรือไฟล์",
    "questionPatterns": [
      "สรุปเป็นตาราง",
      "ขอเป็นไฟล์",
      "ดาวน์โหลด csv",
      "สรุปข้อมูลหน้า"
    ],
    "keywords": [
      "summary",
      "table",
      "csv",
      "file",
      "current page"
    ],
    "answer": "พิมพ์ “สรุปหน้านี้” เพื่อให้ CES Assistant อ่าน KPI และข้อความที่กำลังแสดง หากพบข้อมูลแบบคู่ชื่อ–ค่า ระบบจะแสดงเป็นตารางและมีปุ่มดาวน์โหลด CSV",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V19-005",
    "category": "CES AI",
    "title": "CES Assistant ดึงข้อมูลสดได้แค่ไหน",
    "questionPatterns": [
      "ai ดูข้อมูลจริงได้ไหม",
      "ดึงข้อมูล realtime",
      "ถามยอดล่าสุด"
    ],
    "keywords": [
      "live data",
      "realtime",
      "current page",
      "local assistant"
    ],
    "answer": "Local Assistant ตอบจาก Knowledge Base และสรุปข้อมูลที่แสดงบนหน้าปัจจุบันได้ แต่จะไม่เดาข้อมูลที่ยังไม่ถูกโหลด หากต้องการยอดล่าสุดให้เปิดโมดูล กด Refresh แล้วถาม “สรุปหน้านี้”",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 96.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-AI-V19-006",
    "category": "CES AI",
    "title": "ใช้งาน CES Assistant ตอน Backend มีปัญหา",
    "questionPatterns": [
      "ai offline",
      "backend ล่มยังถามได้ไหม",
      "offline cache"
    ],
    "keywords": [
      "offline",
      "fallback",
      "browser cache",
      "default knowledge"
    ],
    "answer": "หาก Backend ชั่วคราวไม่พร้อม CES Assistant จะรวม Default Knowledge กับ Cache ใน Browser จึงยังตอบคู่มือพื้นฐานได้ การเพิ่มคำตอบใหม่และบันทึกผลประเมินจะรอจน Backend กลับมา",
    "targetTab": "setting",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 94.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-MULTI-V19-001",
    "category": "Performance",
    "title": "รองรับผู้ใช้พร้อมกันหลายคน",
    "questionPatterns": [
      "ใช้พร้อมกัน 20 คน",
      "50 users",
      "concurrent users",
      "ระบบไหวไหม"
    ],
    "keywords": [
      "concurrency",
      "multi user",
      "cache",
      "lock",
      "20 50"
    ],
    "answer": "V19 ลดคำขอซ้ำ ใช้ Cache และ Lock สำหรับงานเขียน รองรับการใช้งานกระจายตัวประมาณ 20–50 คนได้ดีกว่าเดิม แต่ความเร็วจริงขึ้นกับ Apps Script quota, ขนาด Sheet และจำนวนผู้ใช้ที่กดงานหนักพร้อมกัน",
    "targetTab": "health",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 92.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CACHE-V19-001",
    "category": "Troubleshooting",
    "title": "เมื่อไรควรกด Refresh หรือ Hard Refresh",
    "questionPatterns": [
      "refresh ต่างจาก ctrl shift r",
      "cache เก่า",
      "อัปเดตโค้ดไม่ขึ้น"
    ],
    "keywords": [
      "refresh",
      "hard refresh",
      "ctrl shift r",
      "cache"
    ],
    "answer": "ปุ่ม Refresh ในโมดูลใช้โหลดข้อมูลล่าสุด ส่วน Ctrl+Shift+R ใช้โหลดไฟล์ Frontend ใหม่โดยข้าม Browser Cache ควรใช้หลัง Deploy Frontend หรือเมื่อหน้าจอยังเป็นเวอร์ชันเก่า",
    "targetTab": "health",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 90.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-CAR-V19-001",
    "category": "Car Booking",
    "title": "ล้างแบบฟอร์ม Car Booking",
    "questionPatterns": [
      "clear form",
      "ล้างฟอร์มจองรถ",
      "กรอกใหม่"
    ],
    "keywords": [
      "clear",
      "reset",
      "car booking form"
    ],
    "answer": "กดปุ่ม Clear Form ในส่วน Request เพื่อคืนค่าฟอร์มเป็นค่าเริ่มต้น ระบบจะไม่ลบรายการจองที่ส่งไปแล้ว หากต้องการยกเลิกรายการให้ใช้คำสั่ง Cancel ตามสิทธิ์",
    "targetTab": "car_booking",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 90.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-PORTAL-V19-002",
    "category": "Portal",
    "title": "รีเฟรชข้อมูล Portal",
    "questionPatterns": [
      "refresh portal",
      "home ไม่อัปเดต",
      "online users ไม่เปลี่ยน"
    ],
    "keywords": [
      "portal refresh",
      "cache",
      "online users",
      "events"
    ],
    "answer": "กดปุ่ม Refresh บน Home เพื่อขอข้อมูลใหม่ ระบบจะแสดง Cache ล่าสุดก่อนเพื่อลดเวลารอ และอัปเดต Event, CSI, Online Users และ Recently Visited เมื่อ Backend ตอบกลับ",
    "targetTab": "portal",
    "allowedRoles": [],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 92.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  },
  {
    "id": "KB-DEPLOY-V19-001",
    "category": "Deployment",
    "title": "ลำดับ Deploy Frontend และ Backend",
    "questionPatterns": [
      "deploy อะไรก่อน",
      "วิธีติดตั้ง v19",
      "อัปเดตระบบอย่างไร"
    ],
    "keywords": [
      "deploy backend first",
      "frontend",
      "new version",
      "github pages"
    ],
    "answer": "ให้อัปโหลด Backend V19 และ Deploy Web App เป็น New version ก่อน จากนั้นตรวจ getCesBackendHandshakeLatest แล้วจึง Push Frontend V19 ไป GitHub Pages สุดท้ายกด Ctrl+Shift+R และ Run Smoke Test",
    "targetTab": "health",
    "allowedRoles": [
      "ADMIN"
    ],
    "allowedTeams": [],
    "status": "ACTIVE",
    "priority": 100.0,
    "version": 1,
    "notes": "Starter knowledge V19"
  }
];
