# Canlıya geçiş: migration, ayarlar, manuel test

Bu dal (`privacy/beta-gdpr-readiness`) canlıya **otomatik uygulanmadı**. Canlı veritabanına yazma yapılmadı.

## 0. Sıra neden önemli

Yeni kod "fail-closed" çalışır:
- `privacy_settings` tablosu yoksa AI açılamaz ve edge function'lar AI isteklerini reddeder (403).
- `purge_user_data` yoksa hesap silme hata verir ve başarı mesajı göstermez.

Bu yüzden **önce migration, sonra kod**. Ters sırada yapılırsa aradaki sürede AI kullanılamaz ve hesap silme hata verir; veri kaybı olmaz.

## 1. Hazırlık

1. Lovable → projeyi aç → **More → Cloud → Overview → Advanced settings**: *Database location* değerini not al → `src/lib/legal.ts` içinde `databaseRegion`.
2. **More → Cloud → Database**: yedek/geri yükleme seçeneğini kontrol et; mümkünse migration öncesi yedek al veya **Advanced settings → export** ile dışa aktar. (Free planda hangi yedeklerin olduğu doğrulanamadı.)
3. Tercihen önce bir **test projesinde** dene: Lovable'da projeyi *Remix* et, Cloud'u aç, migration'ları uygula, iki sentetik test hesabıyla aşağıdaki manuel testleri yap. Canlı kullanıcılara dokunmadan doğrulamanın tek yolu bu.

## 2. Migration'ı uygula

Dosya: `supabase/migrations/20261020120000_privacy_hardening.sql` (idempotent; mevcut satırları silmez veya değiştirmez).

Seçenekler:
- Lovable sohbetine: *"Run the SQL migration in supabase/migrations/20261020120000_privacy_hardening.sql exactly as written."* (Lovable onay isteyecektir.)
- veya **More → Cloud → Database → SQL editor**: dosya içeriğini yapıştırıp çalıştır.

Doğrulama (SQL editor, salt-okunur):

```sql
select
  (select count(*) from pg_constraint where conname = 'cv_versions_user_id_fkey') as cv_versions_fk,
  (select count(*) from pg_trigger where tgname = 'jobs_cv_version_owner') as job_cv_trigger,
  (select to_regclass('public.privacy_settings') is not null) as privacy_settings,
  (select to_regclass('public.privacy_events') is not null) as privacy_events,
  (select has_function_privilege('authenticated', 'public.purge_user_data(uuid)', 'execute')) as purge_by_users_should_be_false,
  (select has_table_privilege('anon', 'public.jobs', 'select')) as anon_select_should_be_false,
  (select file_size_limit from storage.buckets where id = 'cvs') as cv_limit;
```

Beklenen: `1, 1, true, true, false, false, 10485760`.

Not: Mevcut 5 kullanıcı için AI başlangıçta **kapalı**. İlk AI kullanımında açıklama penceresi açılır ve kullanıcı AI'ı kendisi açar. Arkadaşlarına bunu önceden haber ver.

## 3. Kodu yayınla

1. Dalı incele, `main`'e birleştir, GitHub'a gönder (Lovable GitHub ile senkron).
2. **More → Cloud → Edge Functions**: `delete-account` ve `retention-cleanup` listede mi, diğer fonksiyonlar yeniden deploy edildi mi? (`_shared/` klasöründen import kullanılıyor; deploy hatası varsa loglarda görünür.)
3. Lovable'da **Publish / Update**.

## 4. Hesap ayarları (koddan yapılamaz)

| Ayar | Yol | Hedef |
|---|---|---|
| Ziyaretçi analitiği | Project settings → General → Publishing → **Visitor analytics** | Kapalı (yoksa TDDDG §25 için onay mekanizması gerekir). Sonra `legal.ts` → `lovableVisitorAnalytics: "disabled"` |
| AI app context (90 gün tam istek/yanıt) | **Cloud → AI** veya Project settings | Kapalı. Sonra `lovableAiAppContext: "disabled"` |
| Eğitim verisi opt-out | Workspace settings → data opt-out | **Free planda yok** (Business/Enterprise) |
| EU inference | Workspace settings → Security → Privacy & security | **Yalnızca Enterprise**; ayrıca Gemini metin modellerini kapsamıyor |
| E-posta onayı, şifre politikası | More → Cloud → Users → Auth settings | E-posta onayını açık tut, minimum uzunluğu ≥8 yap; varsa sızdırılmış parola korumasını aç |
| Google girişi | More → Cloud → Users → Auth settings → Google | Managed modda onay ekranı Lovable alan adını gösterir. Kendi alan adın görünsün istiyorsan kendi OAuth client'ını kur (yalnızca `openid email profile`) |
| `DISCOVER_JOBS_ENABLED` secret | Cloud → Secrets | **Ayarlama** (keşif özelliği betada kapalı kalsın) |
| Lovable olay/replay SDK'sı | Belgelenmiş ayar bulunamadı | Lovable desteğine sor: `/__l5e/events.js` ve rrweb replay yayınlanmış uygulamada etkin mi, kapatılabilir mi? |

## 5. Saklama süresi (karar senin)

Mekanizma hazır, süre bilinçli olarak **belirlenmedi**.

- **Öneri:** Hareketsiz hesaplar için 12 ay. İş arama dönemleri aylarca sürebilir ve kısa süre kullanıcıyı verisini kaybetme riskine sokar. Uzun süre ise gereksiz CV birikimi demek. Silmeden önce e-posta ile uyarı vermek iyi uygulamadır, ama bunun için e-posta gönderimi henüz yok.
- **Etkinleştirme (karar sonrası):**
  1. Cloud → Secrets:
     - `RETENTION_CRON_SECRET`: uzun rastgele değer
     - `RETENTION_INACTIVE_DAYS`: örn. `365`
     - `RETENTION_EXCLUDE_USER_IDS`: kendi hesabın
  2. Önce **dry run**: `POST https://jquzbeowvobfvyovvpfn.supabase.co/functions/v1/retention-cleanup`, başlık `x-cron-secret: …`, gövde `{}` → yalnızca aday sayısı döner.
  3. Silmeye izin vermek için `RETENTION_APPLY=true` ekle ve gövdede `{"apply": true}` gönder. Zamanlayıcı ayrıca kurulmalı (pg_cron/pg_net veya harici cron; Lovable Cloud'da hangisinin desteklendiği doğrulanmadı).
  4. `src/lib/legal.ts` → `inactiveAccountDeletionDays`.
- **Uyarı:** 2026-10-20 itibarıyla 5 canlı hesabın **tamamı** 90 günden uzun süredir hareketsiz görünüyor (son giriş zamanına göre). `RETENTION_EXCLUDE_USER_IDS` ayarlamadan apply çalıştırma.

## 6. `src/lib/legal.ts` alanlarını doldur

`operator.name`, `operator.postalAddress`, `databaseRegion`, `lovableDpaInPlace`, `lovableVisitorAnalytics`, `lovableAiAppContext`, `inactiveAccountDeletionDays`, `legalBasesReviewed`. Boş alan kaldıkça Privacy/Terms/Imprint sayfalarında "Draft — not final" bandı ve kırmızı `[MISSING: …]` işaretleri görünür. Bu bilinçli bir tasarım.

## 7. Manuel test (iki sentetik test hesabı; tercihen remix test projesinde)

Hesaplar: `test-a+onboard@<senin alan adın>` ve `test-b+onboard@…`. Gerçek CV kullanma: telefon/e-posta/link içeren sentetik bir CV.txt hazırla.

1. Çıkış yapmışken `/privacy`, `/terms`, `/imprint` açılıyor; `/auth` altında bağlantılar görünüyor.
2. A ile kayıt ol: e-posta onayı açıksa "check your inbox" mesajı görünmeli, sahte "signed in" görünmemeli.
3. A: iş ekle, sentetik CV yükle, CV sürümü oluştur. Ayarlar → Privacy & data: AI kapalı, logolar kapalı (kartlarda baş harfler görünür; Network sekmesinde logo isteği olmamalı).
4. A: herhangi bir AI aracına bas → açıklama penceresi açılmalı. Cancel → ağda AI isteği **olmamalı**. "Turn on AI and continue" → istek gitmeli. Supabase'de `privacy_events` içinde `ai_enabled` olayı oluşmalı.
5. A: sohbette "Share my CV" kapalıyken CV'ye dayalı soru sor → asistan CV'yi bilmemeli. Açınca bilmeli. Edge loglarında CV metni görünmemeli.
6. A'nın JWT'siyle (tarayıcı devtools → `localStorage` → `sb-…-auth-token` → `access_token`) B'nin bir job `id`'sine REST üzerinden `GET /rest/v1/jobs?id=eq.<B_id>` → boş dizi; `PATCH` → 0 satır; `GET /storage/v1/object/cvs/<B_id>/…` → 400/404.
7. Ayarlar → AI'ı kapat → bir AI aracına doğrudan istek at (ör. sohbet) → 403 `ai_disabled`.
8. "Download my data (JSON)": tüm tablolar dolu, `api_tokens` içinde `token_hash` yok, sohbetler yalnızca bu cihazdan.
9. Hesap silme: B'de "DELETE" yaz → başarı mesajı yalnızca sunucu onayından sonra görünmeli. Supabase'de B'nin `auth.users`, tüm `public.*` satırları ve `cvs/<B_id>/` klasörü silinmiş olmalı; A'ya dokunulmamış olmalı.
10. Kısmi hata: test projesinde `revoke execute on function public.purge_user_data(uuid) from service_role;` çalıştır → silme hatası görünmeli, hesap durmalı → `grant` ile geri ver → tekrar dene → başarılı.
11. CV: 11 MB'lık dosya ve `.exe` adlı dosya → reddedilmeli.
