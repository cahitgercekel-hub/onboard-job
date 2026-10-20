# ONboard — Veri envanteri ve veri akışı

Durum: 2026-10-20, `privacy/beta-gdpr-readiness` dalı. Kaynak: güncel kod + canlı Lovable Cloud projesinde
**salt-okunur** şema sorguları (kullanıcı içeriği okunmadı) + canlı yayın sayfasının HTML'i.
"❓" = doğrulanamadı / hesaptan kontrol edilmeli.

## Altyapı (doğrulanan)

| Bileşen | Ne | Kanıt |
|---|---|---|
| Hosting | Lovable (yayın: `onboard-jobtrack.lovable.app`, Cloudflare arkasında) | HTTP başlıkları (`server: cloudflare`) |
| Backend | **Lovable Cloud** (Supabase altyapısı üzerinde; ayrı bir Supabase hesabı değil), proje ref `jquzbeowvobfvyovvpfn` | `supabase/config.toml`, Lovable MCP `get_database_status` |
| Veritabanı bölgesi | **Europe (Ireland)** — Lovable arayüzünde doğrulandı (2026-10-20); IP ipucu (AWS eu-west-1) ile tutarlı | Cloud → Database → Manage → Settings |
| AI | Lovable AI Gateway `ai.gateway.lovable.dev`; modeller `google/gemini-2.5-flash`, `google/gemini-3-flash-preview` | edge function kodu |
| AI işleme yeri | ❓ Lovable dokümanına göre EU dışı olabilir; "EU inference" yalnızca Enterprise ve Gemini metin modellerini kapsamıyor | docs.lovable.dev/features/eu-inference |
| Lovable planı | Workspace "Cahit's Lovable": **Free** | Lovable MCP `get_workspace` |
| Google girişi | Lovable managed OAuth, `scope=openid email profile`, redirect `oauth.lovable.app` | Canlı sitede yönlendirme URL'si gözlendi (giriş yapılmadı) |
| Canlı sürüm | Yayın commit'i `e57f7fba` = yerel `main` HEAD | yayın HTML'indeki `data-commit-sha` |

Canlı veritabanı (2026-10-20): 5 auth kullanıcısı (4 Google, 1 e-posta), 122 iş, 2 CV satırı, 1 CV dosyası,
2 CV sürümü, 0 API token, **0 profil satırı** (repo'daki `on_auth_user_created` tetikleyicisi canlıda yok).
Kayıtlı migration geçmişi repo ile birebir değil (yalnızca 4 kayıt) → canlı şema repo'dan "yeniden kurulamaz";
migration'lar elle/Lovable üzerinden uygulanmış.

## Veri türleri

| Veri | Amaç | Nerede saklanıyor | Kim erişebilir | Saklama | Silme (bu daldan sonra) |
|---|---|---|---|---|---|
| Hesap (e-posta, parola hash'i, görünen ad, giriş zamanları; Google: ad, e-posta, profil fotoğrafı URL'si) | Hesap | `auth.users` (Lovable Cloud) | Kullanıcı; servis rolü (edge functions); Lovable/Supabase operatörleri | Hesap silinene kadar | `delete-account` → `auth.admin.deleteUser` |
| İşler (şirket, rol, URL, durum, tarih, açıklama, **notlar**, ret nedeni, AI skoru) | Takip panosu | `public.jobs` | RLS: yalnızca sahibi; servis rolü | Kullanıcı silene kadar | "Delete all jobs" veya hesap silme |
| CV dosyası (PDF/DOCX/TXT) | CV'yi saklamak | Storage bucket `cvs` (private), yol `<user_id>/cv-*.ext` | RLS: klasör sahibi | Değiştirilene/silinene kadar | Kaldır, yeniden yükleme (eskisi silinir), hesap silme (klasör tamamen) |
| CV metni (tarayıcıda çıkarılır) | AI araçları, skill heatmap | `public.cv_baseline.cv_text` | RLS: sahibi | Aynı | Aynı |
| CV sürümleri (ad, not) | Başvuru-CV eşlemesi | `public.cv_versions` | RLS: sahibi | Aynı | Bu dalda `auth.users` FK + CASCADE eklendi (önceden yoktu → hesap silinince yetim kalırdı) |
| API token'ları | Tarayıcı eklentisiyle iş ekleme | `public.api_tokens` (yalnızca SHA-256 hash + 12 karakter önek) | RLS: sahibi | İptal edilene kadar | İptal / hesap silme |
| AI tercihi + geçmişi (yeni) | AI'ın açık/kapalı durumu ve kanıtı | `public.privacy_settings`, `public.privacy_events` | RLS: sahibi okur; olay geçmişini yalnızca sunucu yazar | Hesap silinene kadar | Hesap silme |
| AI sohbet geçmişi | Sohbet devamlılığı | **Yalnızca tarayıcı** `localStorage` `jat.chat.v1.<user>.<job>` | O cihaz | Silinene kadar | Ayarlar → "Delete AI chat history on this device"; hesap silmede o cihaz temizlenir. **Diğer cihazlardaki kopyalar silinemez.** |
| Tercihler (tema, dil, tarih biçimi, logo tercihi) | Arayüz | `localStorage` `jat.prefs.v1`, `jat.lang` | O cihaz | Süresiz | Hesap silme (o cihaz) |
| Oturum token'ı | Giriş | `localStorage` `sb-<ref>-auth-token` | O cihaz | Çıkışa kadar | Çıkış |
| Küçük UI durumları | Arayüz | `jat.premiumRail.collapsed`, `jat.cvscan.<tarih>`, `jat.devplan`, `jat.ai.ack.*`, `jat.chat.shareCv.*`, `sessionStorage jat.ghost.notified.v1` | O cihaz | Süresiz | Hesap silme (o cihaz) |
| Edge function / auth / DB / storage logları | İşletim, güvenlik | Lovable Cloud Logs (arayüzde ≤5 gün geriye göreli aralık) | Proje sahibi, Lovable | ❓ Sağlayıcıya bağlı | **Talep üzerine silinemez**; bu dalda loglardan CV/mesaj/hata gövdeleri çıkarıldı |
| AI istek kayıtları | Lovable debug | Lovable ("AI app context" açıkken tam istek+yanıt **90 gün**; her durumda özet) | Lovable, proje sahibi | 90 gün | ❓ Silme yolu yok; ayar kapatılmalı |
| Ziyaretçi analitiği | Lovable trafik istatistiği | Lovable'ın eklediği `/~flock.js` → `/~api/analytics` (Tinybird); `session-id` çerezi (30 dk), referrer, user agent, URL, saat dilimi | Lovable | ❓ | Lovable ayarından kapatılmalı |
| İstemci olay/hata SDK'sı | Lovable | Lovable'ın eklediği `/__l5e/events…js` (hata, web vitals; **rrweb oturum kaydı kodu içeriyor**, etkin olup olmadığı ❓) | Lovable | ❓ | Belgelenmiş kapatma ayarı bulunamadı |
| Cloudflare `__cf_bm` çerezi | Bot koruması | Tarayıcı (30 dk) | Cloudflare | 30 dk | — |
| Şirket logoları (artık isteğe bağlı) | Görsel | İstek: Brandfetch, logo.dev, Clearbit, Google favicon — şirket alan adı + kullanıcı IP'si | Bu servisler | ❓ | Varsayılan **kapalı** |
| Geri bildirim | İletişim | Artık `mailto:` (kullanıcının e-posta istemcisi) | Operatör | — | — |
| Yedekler | Felaket kurtarma | Lovable Cloud, günlük | Lovable | Gözlem: arayüzde 6–20 Ekim 2026 arası 12 yedek listeleniyor (~14 gün); resmî süre ❓ | Anında silme **vaat edilmiyor**; silinen hesap verisi yedeklerde ~14 gün kalabilir |

## Üçüncü taraf istekleri (koddan)

| İstek | Tetikleyen | Gönderilen içerik |
|---|---|---|
| `career-chat` → AI Gateway | Kullanıcı mesaj gönderir | Son 24 mesaj (her biri ≤6000 karakter), ekli iş: şirket/rol/açıklama/skor; CV **yalnızca "Share my CV" açıkken**, iletişim bilgileri ayıklanmış |
| `career-assistant` → AI Gateway | Kullanıcı aracı çalıştırır | Araç girdisi (alan başına ≤20.000 karakter). `cv`/`optimize_cv` için CV iletişim bilgileri ayıklanır. Mülakat aracı artık **notları göndermiyor** |
| `calculate-fitness` → AI Gateway | Kullanıcı "fitness" / toplu yeniden hesaplama | İş alanları + CV (ayıklanmış) |
| `discover-jobs` → AI Gateway | Arayüzde bağlı değil; sunucuda `DISCOVER_JOBS_ENABLED` olmadan **410** | — |
| `ingest-job` | API token ile dış istemci | Şirket, rol, URL (yalnızca http/https), açıklama, konum, çalışma modeli (uzunluk sınırlı) |
| Logo servisleri | Panoda iş kartı (yalnızca logo tercihi açıkken) | Şirket alan adı, IP |
| Google OAuth (Lovable üzerinden) | "Continue with Google" | `openid email profile` |

Tüm AI çağrıları kullanıcı eylemiyle başlıyor; Kanban/analitik AI olmadan çalışıyor (kod incelemesi).

## Bilinmeyenler (hesaptan doğrulanmalı)

- Lovable Cloud log ve yedek saklama süreleri.
- Lovable olay SDK'sında oturum kaydının (replay) etkin olup olmadığı.
- E-posta onayı (email confirmation) ve şifre politikası ayarları (Cloud → Users → Auth settings).
- `ingest-job` fonksiyonunun canlıda `verify_jwt` durumu (token tabanlı çalışabilmesi için kapalı olması gerekir; canlıda 0 token var, özellik kullanılmıyor).
- AI Gateway'in istekleri hangi sağlayıcı/bölgeye yönlendirdiği (Lovable dokümanı failover ile başka sağlayıcılara yönlendirebileceğini söylüyor).
