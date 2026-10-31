# أسطورة الواحة — The Oasis Legend

لعبة مغامرة عربية ثلاثية الأبعاد تعمل على الجوال والحاسوب، مبنية باستخدام Three.js وVite.

## اللعب
- تحكم: عصا يسار الشاشة، سحب الكاميرا، زر التفاعل والقفز والركض.
- الكمبيوتر: WASD للحركة، Shift للركض، Space للقفز، E للتفاعل.
- المهمة: جمع خمس شظايا نور من القرية ثم الوصول إلى بوابة البرج القديمة.
- شخصيات ومحادثات وتحدي كسور اختياري، دورة ليل ونهار، خريطة مصغرة، حفظ محلي.

## تطوير
`npm install && npm run dev` ثم افتح رابط Vite. للنشر: `npm run build`.

## ملاحظات
أصول اللعبة والرسوم الهندسية والإضاءة منشأة داخل الكود، ولا تحتاج إلى خدمات مدفوعة أو مفاتيح API. محرّك Three.js بترخيص MIT.

## 2.0 — تغييرات اللعبة
- ست شخصيات rigged/animated، مع تحريك للمشي والوقوف وتفاعل مع أهل القرية.
- خامات وأصول طبيعية مرخّصة CC0 محفوظة محليًا داخل المشروع.
- توجيه نحو أقرب شظية نور بمسافة واتجاه وعلامة ثلاثية الأبعاد؛ تبدأ الأولى قرب اللاعب.
- كاميرا كتف مع تخفيف دخول الكاميرا في البيوت، خريطة اختيارية على الجوال، بيئة صحراوية أكثر تدرجًا.
- اختبار E2E يجمع الشظايا الخمس ويُكمل المهمة ويؤكد حفظها محليًا.
- بيانات حقوق الأصول: ART_LICENSES.md.


## 3.0 — Vertical slice art upgrade
- Real-proportioned, skinned human hero dressed in original procedurally tailored Saudi thobe, shemagh and agal; animation clips for walking and running and contact shadow.
- Detailed date palms optimized by geometry merging (three on mobile, five on desktop).
- PBR plaster and sand-toned masonry materials with tileable normal maps.
- Tuned third-person shoulder camera, visual waypoints, preserving existing quests and NPC interactions.
- The goal is a playable art vertical slice, not an AAA-fidelity release. Third-party asset origins and CC0 licenses: ART_LICENSES.md.
