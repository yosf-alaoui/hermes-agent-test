# تشغيل المشروع محليًا

## بدء المحادثة على هذا الجهاز

انقر مرتين على `start-hermes.command` في جذر المشروع، أو من المجلد شغّل:

```bash
./start-hermes.command
```

الملف يختار بيئة Hermes المثبتة بواسطة PM ويبدأ خادم Ollama إذا لم يكن يعمل، ثم يفتح واجهة الطرفية. لا يستخدم وضع تجاوز الموافقات. يمكن تمرير أوامر Hermes إليه، مثل:

```bash
./start-hermes.command --version
./start-hermes.command sessions list
./start-hermes.command config get model.default
```

## بدء واجهة الويب

انقر مرتين على [start-web.command](../start-web.command)، أو شغّل من جذر المشروع:

```bash
./start-web.command
```

المحادثة في [http://127.0.0.1:9119/chat](http://127.0.0.1:9119/chat). يستخدم الملف بيئة التشغيل ومجلد البيانات والنموذج المحلي نفسيهما، ويبدأ dashboard الأصلي على عنوان الجهاز المحلي فقط. تُبنى ملفات الواجهة عند الحاجة باستخدام أدوات المشروع. إذا كانت الواجهة تعمل، يعيد أمر التشغيل فتحها عبر آلية Hermes الأصلية؛ تم التحقق من ذلك.

إغلاق صفحة المتصفح لا يوقف الخادم؛ لا توجد خدمة بدء تلقائي عند تسجيل الدخول. سجل التشغيل الحالي في `<HERMES_HOME>/logs/dashboard-server.log`. رموز مصادقة الواجهة مؤقتة وخاصة، ولا تُحفظ في GitHub.

تم التحقق من صفحة المحادثة وملفات JavaScript/CSS، ومن إعداد النموذج عبر API المصادق، ومن اتصال WebSocket وتهيئة شاشة المحادثة المدمجة بالنموذج الحالي `my-agent:qwen3.5-4b` بعد الترقية. نجح أيضًا رد فعلي عبر Hermes؛ النتائج موثقة أدناه.

## مظهر الواجهة

السمة المحلية المختارة `clean-white` بخلفية بيضاء وخط نظام وحدود خفيفة، وتشمل مساحة المحادثة. تعريفها في `web/src/themes/presets.ts`، ومسجلة في قائمة سمات الخادم. بعد تنزيل التحديث على جهاز آخر:

```bash
./start-hermes.command config set dashboard.theme clean-white
./start-hermes.command config set dashboard.font system-sans
```

أعد تشغيل dashboard بعد تحديث الكود وأعد تحميل الصفحة. يمكنك تغيير السمة من إعدادات الواجهة؛ الاختيار محفوظ في مجلد البيانات الخاص.

## الكتابة بالعربية

أصبح العرض الافتراضي واجهة محادثة مباشرة شبيهة بـChatGPT، بخط Noto Sans Arabic مدمج واتجاه عربي تلقائي وصندوق كتابة مستقل. Enter يرسل، وShift+Enter يضيف سطرًا؛ زر + يرفق الملفات والصور، وزر الإيقاف يوقف الطلب. الأدوات والتفكير في أقسام قابلة للطي، والكود والجداول يظهران بتنسيق مناسب. من خيارات المحادثة يمكن فتح عرض الطرفية للأوامر المتقدمة أو إدارة النموذج والجلسات. عرض الطرفية يحتفظ بإصلاح العربية السابق وحدود المؤشر فيه. أعد تحميل الصفحة بعد تحديث الكود. مرجع الواجهة الجديدة [الجلسة 011](chats/2026-10-10-011.md).

## الإعداد الحالي

- بيانات التشغيل مستقلة عن المستودع: `$HOME/.local/share/hermes-agent-test`، بصلاحيات جذر المجلد `700` وملف `.env` بصلاحيات `600`.
- `HERMES_HOME` يشير إلى ذلك المجلد، و`HERMES_RUNTIME_DIR` إلى `tools/` داخله. ملف التشغيل يحترم تجاوز هذين المتغيرين عند تحديدهما صراحة.
- Python المثبت عبر PM: `3.14.7`؛ بيئة التطبيق تحت `installs/` وتختارها آلية PM الحالية، دون تثبيت pip يدوي داخلها.
- Ollama الرسمي: `0.40.2`، تحت `local-model-runtime/ollama-v0.40.2`.
- النموذج الحالي: `my-agent:qwen3.5-4b` مبني على `qwen3.5:4b`، بحجم معلن 4.2B، GGUF بضغط `Q4_K_M`. طبقة الأوزان حوالي 2.65GB وملف دعم الصور حوالي 0.68GB؛ النموذج المحمّل بسياق 65536 استهلك نحو 4.09GB على CPU.
- التعريف الحالي في [Modelfile.qwen35](../local-model/Modelfile.qwen35). التعريف السابق `my-agent:4b` محفوظ في [Modelfile](../local-model/Modelfile) وأوزانه باقية للرجوع إليه. التخصيص هو اسم وإعدادات ورسالة نظام؛ الأوزان لم تُدرب أو تُضبط بعد.
- واجهة الاستدلال: `http://127.0.0.1:11434/v1`، الاختيار `custom:local-project` ويُحل داخليًا إلى `custom`؛ لا يحتاج مفتاح API سحابي. يمرر الإعداد `temperature: 0.2` و`presence_penalty: 0` لتقليل عشوائية توليد الأوامر، دون تغيير الأوزان أو تعريف Ollama.
- التفكير المطوّل معطل حاليًا عبر `agent.reasoning_effort: none` لتقليل زمن الرد؛ يمكن إعادة تقييمه لاحقًا.
- السياق الفعلي: `65536`، مع `OLLAMA_NUM_PARALLEL=1` و`OLLAMA_MAX_LOADED_MODELS=1` وذاكرة KV من نوع `q4_0` وflash attention.
- الأدوات الحالية عبر `platform_toolsets.cli`: `memory`, `session_search`, `todo`, `terminal`, `file`, `skills`. أُضيفت أدوات التطوير بطلب المستخدم في الجلسة 010؛ لا يزال تصفح الويب العام خارج المجموعة. يمكن الوصول إلى GitHub وتنزيل الملفات عبر `gh` وGit في الطرفية.
- الإرسال الاختياري للإحصاءات معطل في `telemetry.shared_metrics`، وOllama يبدأ مع `OLLAMA_NO_CLOUD=1`.
- الجهاز: Intel i7-8750H و16GB RAM؛ Ollama هنا يعمل على CPU. عزل مجلد البيانات ليس حاوية أمان للنظام.
- سجل الخادم: `<HERMES_HOME>/logs/ollama-server.log`. الأوزان: `<HERMES_HOME>/models/`. هذه الملفات محلية ولا تُرفع إلى المستودع العام.

## الدارجة وأدوات تطوير GitHub

الشخصية الحالية `project-assistant` تجمع [تعليمات الدارجة](../local-model/darija-system.txt) و[تعليمات التطوير](../local-model/development-system.txt). هي تعليمات وقت الاستدلال وليست تدريبًا للأوزان. اختبار النموذج دون هذه التعليمات أعطى تعابير غير مغربية، وتحسن جواب قصير مع الأمثلة، لكن ظهرت أيضًا تعابير ضعيفة في سؤال آخر؛ لا يوجد تقييم شامل يثبت إتقان الدارجة.

افتح **New chat** من واجهة الويب لتحميل الأدوات والشخصية الجديدة. لتغيير أسلوب محادثة قديمة دون حذفها، استعمل `/personality project-assistant`؛ هذا يغيّر الأسلوب، ولا يضيف الأدوات التي لم تكن موجودة عند بدء المحادثة. الجلسات السابقة وذاكرتها باقية.

تستخدم أداة `terminal` المحلية مصادقة GitHub CLI الموجودة في keyring، ولا تنسخ رمزًا إلى `.env`. على هذا الجهاز يوجد CLI في `$HOME/.local/bin/gh`؛ إذا لم يكن `gh` في PATH استخدم المسار المذكور. مهارة `github` المدمجة متاحة عبر `skill_view`. نجحت قراءة المستودع وتنزيل ملف عام منه والتحقق من مطابقته عبر أداة الطرفية نفسها.

لإعادة تطبيق الإعداد على تثبيت آخر بعد مصادقة `gh`، من جذر المشروع:

```bash
./start-hermes.command config set agent.personalities.project-assistant "$(cat local-model/darija-system.txt local-model/development-system.txt)"
./start-hermes.command config set display.personality project-assistant
./start-hermes.command config set toolsets '[memory, session_search, todo, terminal, file, skills]'
./start-hermes.command config set platform_toolsets.cli '[memory, session_search, todo, terminal, file, skills]'
./start-hermes.command config set approvals.mode manual
./start-hermes.command config set approvals.single_query_mode deny
./start-hermes.command config set approvals.unattended_mode deny
./start-hermes.command config set approvals.cron_mode deny
./start-hermes.command config set security.protected_instruction_files true
```

الوصول محلي بصلاحيات حساب الجهاز، وليس sandbox أو تقييدًا تقنيًا لمستودع واحد؛ صلاحيات مصادقة GitHub القائمة أوسع من المستودع المقصود. قواعد العمل تحصر المهمة في المستودع المعتمد، لكنها لا تستبدل العزل. لا يعطل الإعداد موافقات الأوامر الحساسة أو حماية ملفات التعليمات، ولا يشغّل تنزيلًا أو تطويرًا ذاتيًا مستمرًا في الخلفية. مراجعة المصادر وتثبيت الإصدارات والتحقق من السكربتات مطلوبة قبل تشغيل أدوات خارجية.

قبل التغيير حُفظت نسخة `config.yaml` فقط في snapshot محلي ينتهي اسمه بـ`before-developer-tools`، بصلاحيات مجلد `700`، خارج GitHub. ليست نسخة احتياطية كاملة للبيانات.

اختبار Hermes الكامل بالإعداد الأول واجه انتهاء مهلة 900 ثانية قبل أول جزء من الرد، بسياق 13395 رمزًا، ثم أنتج أمرين خاطئين. لم تُعطل الموافقات لتشغيلهما؛ أوقفت جلسة الاختبار المحددة. بعد اختصار تعليمات التطوير وإضافة مثال CLI صحيح وضبط التوليد، نجح اختبار محدود عبر Ollama وأداة Hermes الأصلية: استدعى النموذج `terminal` بالأمر الصحيح، وأعادت الأداة ADMIN، ثم عرض النموذج النتيجة الصحيحة. استغرقت جولتا النموذج 71.6 و7.4 ثانية؛ هذا اختبار بسياق أصغر وأداة واحدة، وليس إعادة تحقق كاملة لمسار الواجهة بكل أدواتها.

ضُبطت مهلة انعدام أجزاء الرد لهذا النموذج المحلي فقط إلى 1800 ثانية ومهلة الطلب إلى 1900 عبر `providers.custom.models`. هذا يسمح ببداية باردة بطيئة بدل قطعها عند 15 دقيقة؛ لا يجعل التنفيذ أسرع. جودة العمل البرمجي العام والأوامر خارج الاختبار المحدود تحتاج تقييمًا مستقلًا.

## تثبيت جديد أو الانتقال إلى جهاز آخر

الكود وحده لا يحتوي بيئة التشغيل أو الأوزان أو الجلسات. أعد تهيئة PM وفق دليل المشروع مع مجلد البيانات الخاص قبل التشغيل:

```bash
export HERMES_HOME="$HOME/.local/share/hermes-agent-test"
export HERMES_RUNTIME_DIR="$HERMES_HOME/tools"
python3 -m pm.cli install --without agent-browser --without cua-driver
```

المكوّنان المستبعدان أدوات اختيارية للمتصفح والتحكم بالجهاز. يمكن إضافتهما لاحقًا باستخدام PM. في تثبيت macOS الحالي، استخدمت حزمة CA من certifi أثناء أول تهيئة بسبب غياب مسار الشهادات في Python المضيف؛ لم يُعطل التحقق من TLS. بعد التهيئة يستخدم PM مخزن شهادات النظام.

ثبت Ollama الرسمي المناسب للجهاز، وتحقق من بصمة الإصدار، ثم شغله محليًا بالمجلد والسياق المذكورين، ونزل القاعدة وأنشئ التعريف:

```bash
ollama pull qwen3.5:4b
ollama create my-agent:qwen3.5-4b -f local-model/Modelfile.qwen35
```

على جهاز آخر يتطلب ملف التشغيل نفس موضع نسخة Ollama المثبتة أو تعديل مسار النسخة الموثق. اضبط Hermes عبر أوامر `hermes config set` الموجودة أو الكاتب الذري `hermes_cli.config.atomic_config_write`:

```yaml
model:
  default: my-agent:qwen3.5-4b
  provider: custom:local-project
  base_url: http://127.0.0.1:11434/v1
  context_length: 65536
  ollama_num_ctx: 65536
custom_providers:
  - name: local-project
    base_url: http://127.0.0.1:11434/v1
    model: my-agent:qwen3.5-4b
    extra_body:
      temperature: 0.2
      presence_penalty: 0
providers:
  custom:
    models:
      "my-agent:qwen3.5-4b":
        stale_timeout_seconds: 1800
        timeout_seconds: 1900
agent:
  reasoning_effort: none
toolsets: [memory, session_search, todo, terminal, file, skills]
platform_toolsets:
  cli: [memory, session_search, todo, terminal, file, skills]
display:
  interface: cli
telemetry:
  shared_metrics:
    enabled: false
    send: false
```

لا تستبدل إعدادات سابقة دون قراءتها. انقل بياناتك الخاصة عبر نسخة احتياطية خاصة مع تحقق الاستعادة؛ لا تضعها في GitHub العام. لا توجد خدمة تشغيل عند بدء النظام؛ ملف التشغيل يبدأ الخادم عند الحاجة.

## بصمات النسخ المستخدمة

- ملف Ollama الرسمي `ollama-darwin.tgz` للإصدار `v0.40.2`: SHA-256 `e888b7637291ceb80b622c00ea067f62c86d9c50d419b3eb903032e4f1f8a4f6`.
- Manifest للقاعدة السابقة Qwen3: `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`.
- طبقة الأوزان السابقة Qwen3: `85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9`.
- Manifest للتعريف المحلي السابق `my-agent:4b`: `4cb5da3b9c23b7626996d2455bb2ef255cc55985c62fdae190b873bc2c8f10b6`.

- Manifest لقاعدة Qwen3.5 الحالية: `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04`.
- طبقة أوزان Qwen3.5: `a9d0a3e1d8c91732a3812becd31f8d4a8ff57414903f226306069f0437e2ac50`.
- ملف دعم الصور: `e56a899b1540860385465756dd308c84417410b94dbc1c380adffd20a921ca60`.
- Manifest للتعريف الحالي `my-agent:qwen3.5-4b`: `eb0b8da6d512646a553a591f952d82c2f68ee13e3eb052703fe7e28f657eb2f9`.

وسم Ollama قد يتغير مستقبلًا؛ قارن البصمات عند إعادة التنزيل، ولا تفترض أن الوسم وحده يضمن نفس الأوزان. حفظ أو تحميل الأوزان الكبيرة يحتاج مخزنًا خاصًا منفصلًا عن Git.

المصادر: [متطلبات Ollama](https://docs.ollama.com/macos)، [قاعدة Qwen3 4B](https://ollama.com/library/qwen3:4b-instruct)، ودليل المزود المحلي في `website/docs/integrations/providers.md`.

## نتائج التحقق الأولي — Qwen3 السابق

نجح الرد عبر Hermes وحُفظت رسالتا جلسة الاختبار في SQLite، واجتاز فحص قاعدة التشغيل `PRAGMA quick_check`. اختبار Ollama القصير أنتج «جاهز» خلال 17.1 ثانية شاملة التحميل بسرعة توليد 8.99 رمز/ثانية، لكن جلسة Hermes الباردة الكاملة استغرقت نحو 274 ثانية بسبب معالجة تعليمات المساعد على CPU. لا يُعد هذا قياسًا عامًا لجودة النموذج أو جميع الأدوات.

أُنشئت نقطة استرجاع محلية بالأمر الأصلي `backup --quick` باسم `20261010-011745-first-local-4b` تحت `state-snapshots/`، مع التحقق من سلامة قاعدة snapshot ووجود جلسة الاختبار. هذه نسخة حالة محدودة على الجهاز نفسه، لا تشمل مهارات أو أوزانًا كاملة، ولا تحقق الحماية من فقد الجهاز. النسخ الخارجية والتشفير وتجربة الاستعادة ما زالت مطلوبة.

## نتائج ترقية Qwen3.5 وطريقة الرجوع

نجح رد «جاهز» من Ollama ثم من Hermes بالنموذج الجديد مع التفكير معطلًا. حُفظت رسالتا جلسة Hermes `20261009_214657_34cc47`، واجتازت قاعدة التشغيل `PRAGMA quick_check`. أظهرت سجلات المحرك نحو 266 ثانية لمعالجة 4114 رمزًا في بداية جلسة Hermes، والتوليد نحو 5 رموز/ثانية في رد قصير جدًا؛ هذه قياسات محدودة وليست مقارنة جودة أو أداء شاملة. اختبار Ollama الأول شمل انتظار طلب سابق فلا يُستخدم للمقارنة.

نقطة الاسترجاع قبل الترقية: `20261010-014356-before-qwen35`، مع التحقق من قاعدة snapshot. لم تُمس الذاكرة أو المهارات أو الجلسات عند تغيير النموذج. لإعادة اختيار النموذج السابق دون استعادة قاعدة قديمة أو فقد رسائل أحدث:

```bash
./start-hermes.command config set model.default my-agent:4b
```

افتح محادثة جديدة أو أعد تحميل صفحة الويب ليقرأ التشغيل الجديد الإعداد؛ المحادثات المفتوحة قد تحتفظ باختيار النموذج السابق. لا تستعد snapshot لمجرد تغيير النموذج، لأنها قد تعيد حالة الجلسات إلى وقت أقدم.

يدعم النموذج وفق Ollama النص والصور والأدوات والتفكير، لكن اختبارات هذه المرحلة اقتصرت على الرد النصي وبدء واجهة المحادثة. لم يبدأ تدريب الأوزان، ولم يُثبت تفوق الجودة على بيانات المستخدم. المصادر: [بطاقة Qwen الرسمية](https://huggingface.co/Qwen/Qwen3.5-4B)، [نسخة Ollama](https://ollama.com/library/qwen3.5:4b).
