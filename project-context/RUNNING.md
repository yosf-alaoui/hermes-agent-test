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

تم التحقق من صفحة المحادثة وملفات JavaScript/CSS، ومن إعداد النموذج عبر API المصادق، ومن اتصال WebSocket وتهيئة شاشة المحادثة المدمجة بالنموذج `my-agent:4b`. لم يُرسل طلب استدلال جديد أثناء فحص الويب؛ نتائج الرد الفعلي موثقة أدناه.

## الإعداد الحالي

- بيانات التشغيل مستقلة عن المستودع: `$HOME/.local/share/hermes-agent-test`، بصلاحيات جذر المجلد `700` وملف `.env` بصلاحيات `600`.
- `HERMES_HOME` يشير إلى ذلك المجلد، و`HERMES_RUNTIME_DIR` إلى `tools/` داخله. ملف التشغيل يحترم تجاوز هذين المتغيرين عند تحديدهما صراحة.
- Python المثبت عبر PM: `3.14.7`؛ بيئة التطبيق تحت `installs/` وتختارها آلية PM الحالية، دون تثبيت pip يدوي داخلها.
- Ollama الرسمي: `0.40.2`، تحت `local-model-runtime/ollama-v0.40.2`.
- النموذج: `my-agent:4b` مبني على `qwen3:4b-instruct`، حوالي 4B معاملات، GGUF بضغط `Q4_K_M`، حوالي 2.5GB لأوزان النموذج.
- التعريف القابل للتتبع في [Modelfile](../local-model/Modelfile). التخصيص هو اسم وإعدادات ورسالة نظام؛ الأوزان لم تُدرب أو تُضبط بعد.
- واجهة الاستدلال: `http://127.0.0.1:11434/v1`، provider هو `custom`؛ لا تحتاج إلى مفتاح API سحابي.
- السياق الفعلي: `65536`، مع `OLLAMA_NUM_PARALLEL=1` و`OLLAMA_MAX_LOADED_MODELS=1` وذاكرة KV من نوع `q4_0` وflash attention.
- الأدوات الأولية عبر `platform_toolsets.cli`: `memory`, `session_search`, `todo`. أدوات تنفيذ الطرفية وتصفح الويب ليست ضمن مجموعة التشغيل الأولية؛ توسيع القدرات يحتاج إلى ضبط الحماية والموارد أولًا.
- الإرسال الاختياري للإحصاءات معطل في `telemetry.shared_metrics`، وOllama يبدأ مع `OLLAMA_NO_CLOUD=1`.
- الجهاز: Intel i7-8750H و16GB RAM؛ Ollama هنا يعمل على CPU. عزل مجلد البيانات ليس حاوية أمان للنظام.
- سجل الخادم: `<HERMES_HOME>/logs/ollama-server.log`. الأوزان: `<HERMES_HOME>/models/`. هذه الملفات محلية ولا تُرفع إلى المستودع العام.

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
ollama pull qwen3:4b-instruct
ollama create my-agent:4b -f local-model/Modelfile
```

على جهاز آخر يتطلب ملف التشغيل نفس موضع نسخة Ollama المثبتة أو تعديل مسار النسخة الموثق. اضبط Hermes عبر أوامر `hermes config set` الموجودة أو الكاتب الذري `hermes_cli.config.atomic_config_write`:

```yaml
model:
  default: my-agent:4b
  provider: custom
  base_url: http://127.0.0.1:11434/v1
  context_length: 65536
  ollama_num_ctx: 65536
toolsets: [memory, session_search, todo]
platform_toolsets:
  cli: [memory, session_search, todo]
display:
  interface: cli
telemetry:
  shared_metrics:
    enabled: false
    send: false
```

لا تستبدل إعدادات سابقة دون قراءتها. انقل بياناتك الخاصة عبر نسخة احتياطية خاصة مع تحقق الاستعادة؛ لا تضعها في GitHub العام. لا توجد خدمة تشغيل عند بدء النظام؛ ملف التشغيل يبدأ الخادم عند الحاجة.

## بصمات النسخة المستخدمة

- ملف Ollama الرسمي `ollama-darwin.tgz` للإصدار `v0.40.2`: SHA-256 `e888b7637291ceb80b622c00ea067f62c86d9c50d419b3eb903032e4f1f8a4f6`.
- Manifest للقاعدة: `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`.
- طبقة الأوزان: `85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9`.
- Manifest للتعريف المحلي الحالي: `4cb5da3b9c23b7626996d2455bb2ef255cc55985c62fdae190b873bc2c8f10b6`.

وسم Ollama قد يتغير مستقبلًا؛ قارن البصمات عند إعادة التنزيل، ولا تفترض أن الوسم وحده يضمن نفس الأوزان. حفظ أو تحميل الأوزان الكبيرة يحتاج مخزنًا خاصًا منفصلًا عن Git.

المصادر: [متطلبات Ollama](https://docs.ollama.com/macos)، [قاعدة Qwen3 4B](https://ollama.com/library/qwen3:4b-instruct)، ودليل المزود المحلي في `website/docs/integrations/providers.md`.

## نتائج التحقق الأولي

نجح الرد عبر Hermes وحُفظت رسالتا جلسة الاختبار في SQLite، واجتاز فحص قاعدة التشغيل `PRAGMA quick_check`. اختبار Ollama القصير أنتج «جاهز» خلال 17.1 ثانية شاملة التحميل بسرعة توليد 8.99 رمز/ثانية، لكن جلسة Hermes الباردة الكاملة استغرقت نحو 274 ثانية بسبب معالجة تعليمات المساعد على CPU. لا يُعد هذا قياسًا عامًا لجودة النموذج أو جميع الأدوات.

أُنشئت نقطة استرجاع محلية بالأمر الأصلي `backup --quick` باسم `20261010-011745-first-local-4b` تحت `state-snapshots/`، مع التحقق من سلامة قاعدة snapshot ووجود جلسة الاختبار. هذه نسخة حالة محدودة على الجهاز نفسه، لا تشمل مهارات أو أوزانًا كاملة، ولا تحقق الحماية من فقد الجهاز. النسخ الخارجية والتشفير وتجربة الاستعادة ما زالت مطلوبة.
