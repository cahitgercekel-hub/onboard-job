# Açık kalanlar (kodla tamamlanamayanlar)

Bu belge hukuki görüş değildir. Kod değişiklikleri, politika sayfaları ve geçen testler "GDPR uyumlu" anlamına gelmez.

## A. Senin tamamlaman gereken hesap/sözleşme bilgileri

1. **Adres** (ad girildi: Cahit Emre Gerçekel). Privacy (sorumlu) ve Impressum için tam ad ve ladungsfähige Anschrift. Posta kutusu olmaz. Ev adresini yayınlamak istemiyorsan Impressum adres servisleri gibi seçenekleri araştır. → `src/lib/legal.ts`
2. **Lovable DPA/AVV — yanıt geldi (2026-10-20, Lovable'ın AI destek ajanı yazdı):**
   - Free planda Art. 28 sözleşmesi **yok**. Yalnızca ToS ve Privacy Policy geçerli. DPA, Business'a geçince ToS üzerinden otomatik olarak uygulanıyor; imzalı ve isme özel kopya yalnızca Enterprise'ta.
   - AI: giriş noktası EU, model uç noktaları **ABD**. Alt işleyen listesinde Gemini için "Google Cloud Vertex — US" yazıyor.
   - Aktarım güvencesi: Lovable'ın kendi sağlayıcılarıyla yaptığı SCC'ler (Privacy Policy §12). DPF sertifikası yok.
   - Log ve yedek saklama süreleri yayımlanmıyor. Silme iki aşamalı: veri hemen erişilemez oluyor, yedeklerden kalıcı silme yayımlanmayan bir bekleme süresinden sonra yapılıyor. Storage yedeklenmiyor. Tek tek kayıt silme talebi yok.
   - Uygulama kullanıcılarının verisi model eğitiminde kullanılmıyor. Ancak **builder içeriği** (sizin prompt, kod ve dosyalarınız) Free'de 9 Eylül 2026'dan itibaren eğitimde kullanılabiliyor. Bu ayar 2026-10-20'de **kapatıldı** (Account Settings → Preferences → AI model training → "Use my Lovable content for model training": off; sayfa yenilenince de kapalı göründü).
   - Sonuç: açık beta için ya Business plan gerekiyor ya da DPA'sız işleme bir hukukçuyla değerlendirilmeli. Lovable'ın DPA'sı sayfasına göre yalnızca **Business ve Enterprise** planlarında kullanımın parçası (sayfa: lovable.dev/data-processing-agreement, son güncelleme 2025-11-06). Workspace'in **Free**. Yani şu an geçerli bir Art. 28 sözleşmesi yok gibi görünüyor. Seçenekler: Business'a geçmek veya Lovable'a (privacy@lovable.dev) Free/Pro için DPA'yı sormak. Yanıtı yazılı sakla.
3. **Alt işleyen listesi.** lovable.dev/subprocessors listeyi Trust Center'a (trust.lovable.dev/subprocessors) yönlendiriyor; içerik bu çalışmada okunamadı. AI Gateway'in hangi sağlayıcılara (Google, OpenAI, Anthropic) yönlendirdiğini ve bunların bölgelerini oradan doğrula.
4. ✅ **Veritabanı bölgesi:** Europe (Ireland) — arayüzde doğrulandı. Yedekler günlük, arayüzde ~14 gün listeleniyor.
5. **AI işleme konumu ve aktarım güvenceleri.** Lovable dokümanına göre varsayılan model uç noktaları EU dışında olabilir. "EU inference" yalnızca Enterprise'ta var ve Gemini metin modellerini içermiyor. Hangi transfer mekanizmasının (SCC, DPF) uygulandığı yazılı olarak Lovable'dan teyit edilmeli. **EU veritabanı bölgesi, AI isteklerinin EU'da işlendiğini kanıtlamaz.**
6. **Lovable ayarları.** ✅ Visitor analytics 2026-10-20'de kapatıldı; aynı gün yayındaki HTML'in artık `/~flock.js` ve `/__l5e` olay SDK'sını yüklemediği doğrulandı. ✅ AI app context kapalı (proje ayarlarında doğrulandı). Public remixing de kapalı.
7. **Saklama:** 12 ay (365 gün) seçildi. Zamanlayıcı ve secret'lar ayarlanana kadar sayfada "not running yet" uyarısı kalır (`go-live.md` §5).

## B. Hukuki inceleme gerektiren kararlar

1. **İşleme dayanakları.** Hesap, tracker ve CV için Art. 6(1)(b), AI için Art. 6(1)(a) onay, loglar için 6(1)(f) *önerildi*. Sayfalarda "proposed, pending legal review" olarak işaretli. Ücretsiz ve ticari olmayan bir betada 6(1)(b)'nin uygunluğu incelenmeli.
2. **AI + CV.** CV'ler özel nitelikli veri (Art. 9: sağlık, din, fotoğraf vb.) içerebilir. AI'a aktarım için açık rıza gerekip gerekmediği ve mevcut açıklama penceresinin bunu karşılayıp karşılamadığı incelenmeli. Ayrıca ABD'ye olası aktarımda TIA gerekip gerekmediği değerlendirilmeli.
3. **Impressum yükümlülüğü.** § 5 DDG "geschäftsmäßige, in der Regel gegen Entgelt angebotene digitale Dienste" için geçerli. Ücretsiz, ticari olmayan, ama portföyle bağlantılı ve ileride ücretli olması planlanan (MONETIZATION.md, Billing sayfası) bir beta için gerekip gerekmediği net değil. Temkinli yaklaşım: Impressum'u doldur. Sayfa hazır.
4. **Lovable olay SDK'sı ve analitik.** TDDDG § 25: `session-id` çerezi ve olası oturum kaydı "unbedingt erforderlich" sayılmaz. Kapatılamıyorsa onay mekanizması gerekir. Barındırıcının enjekte ettiği script'i uygulama kodu engelleyemez.
5. **Kullanım koşulları.** Sorumluluk ve uygulanacak hukuk maddesi bilinçli olarak boş bırakıldı (`[MISSING]`). Alman tüketici hukuku genel sorumluluk reddini sınırlar.
6. **DPIA (Art. 35).** CV'ler ve AI profilleme benzeri skorlama (fitness score) için gerekip gerekmediği.
7. **Yedekler ve loglardaki kopyalar.** Silme talebinde ne söyleneceği (metin şu an "sağlayıcı süresi dolunca" diyor).

## C. Dış kullanıcı davetinden önce kalan somut engeller

Durum (2026-10-20): **Yeni kayıtlar sunucuda kapatıldı** (Cloud → Users → Settings → Disable sign-up; `/auth/v1/settings` ile `disable_signup: true` doğrulandı). `main`'de kayıt sekmesi "closed beta" notu gösteriyor (commit `1fe180d`). Mevcut 5 hesap giriş yapabiliyor. Kayıtları açmadan önce aşağıdakiler ve **e-posta onayının açılması** gerekiyor (şu an `mailer_autoconfirm: true`).

1. `src/lib/legal.ts` boş alanları dolu değil → sayfalar "Draft — not final" gösteriyor.
2. Lovable ile DPA yok (Free plan; Lovable yalnızca Business'ta veriyor).
3. ~~Lovable visitor analytics ve olay/replay SDK'sı~~ → kapatıldı ve doğrulandı (2026-10-20). Yeniden yayınladıktan sonra tekrar kontrol et.
4. Migration canlıya uygulanmadı; yeni edge function'lar deploy edilmedi.
5. Manuel uçtan uca test (`go-live.md` §7) gerçek test hesaplarıyla yapılmadı.
6. Hukuki inceleme (B bölümü) yapılmadı.

## D. Bu çalışmada test edilemeyenler

- Edge function'ların gerçek Lovable Cloud üzerinde çalışması (deploy, `_shared/` import'u, `verify_jwt` davranışı). Yalnızca `deno check` ile tip denetimi yapıldı ve iş mantığı birim testleriyle doğrulandı.
- Gerçek Supabase Storage/Auth admin API'lerine karşı hesap silme. Sahte istemciyle test edildi; SQL kısmı PGlite'ta gerçek Postgres ile test edildi.
- Gerçek Supabase'deki RLS. PGlite'ta repo migration'ları + minimal Supabase taklidi ile test edildi. Canlıdaki politikalar salt-okunur sorguyla repo ile karşılaştırıldı ve aynı çıktı.
- Settings sayfasının oturum açık hâli. Test hesabı oluşturulmadığı için tarayıcıda görülmedi; derleme, tip denetimi ve birim testleri geçti.
- Lovable AI Gateway'in gerçekte hangi sağlayıcıya ve bölgeye gittiği.
- Retention-cleanup'ın zamanlayıcıyla çalışması.

## E. Ayrıca fark edilenler (gizlilik dışı / düşük öncelik)

- `discover-jobs` gerçek ilanlar değil, AI'ın uydurduğu ilanlar üretiyordu. Betada sunucuda kapatıldı.
- `has_role(uuid, app_role)` anon'a açık: bir kullanıcı UUID'si biliniyorsa admin olup olmadığı sorgulanabilir. Düşük risk; ileride fonksiyonu PostgREST'e açık olmayan bir şemaya taşı.
- `.env` git'te izleniyor (yalnızca publishable key ve URL; gizli anahtar yok).
- Canlıda `on_auth_user_created` tetikleyicisi yok; `profiles` tablosu boş (uygulama kullanmıyor).
- `20260428014558` migration'ı `jobs` tablosunu realtime yayınına ikinci kez ekliyor; repo migration'ları sıfırdan çalıştırılamaz.
- Billing sayfası fiyat ve "Upgrade Now" gösteriyor (satın alma yok); `?devplan=pro` ile Pro arayüzü yerel olarak açılabiliyor (sunucu tarafı kısıtlama yok).
