// ── TEMİZLİK PLANI ──
// ============ TEMİZLİK PLANI ============
const TP_DATA = [{"isim": "Sevim BEŞLİ", "ekip": "", "mahalle": "Türkmen", "sonGidilme": "2024-01-01", "not_": "27.10.2025 EŞİ EVİ TEMİZLEDİĞİNİ SÖYLEMESİ ÜZERİNE024 İTİBARİ İLE DURDURULDU, KENDİSİ ARAYACAK", "durum": "PASİF"}, {"isim": "Erengül DÖKMEN", "ekip": "", "mahalle": "Karaova", "sonGidilme": "2024-09-20", "not_": "22.11 İstanbul'da kışın yok", "durum": "PASİF"}, {"isim": "Levent ÖZBEN", "ekip": "", "mahalle": "Camikebir", "sonGidilme": "2024-10-16", "not_": "18.12 arayacak", "durum": "PASİF"}, {"isim": "Sacide Çeliker", "ekip": "", "mahalle": "Türkmen", "sonGidilme": "2024-11-19", "not_": "07.01 bursaya gidiyor arayacak22.05 BURSADA", "durum": "PASİF"}, {"isim": "Hakkı Bayram", "ekip": "Nihal", "mahalle": "Değirmendere", "sonGidilme": "2024-12-06", "not_": "YALOVA", "durum": "PASİF"}, {"isim": "Ali Akın", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-01-16", "not_": "02.05 TLF ACMIYOR, KENDİSİ ARAYANA KADAR PASIF", "durum": "PASİF"}, {"isim": "Adem Ergün", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2025-01-22", "not_": "29.04 AKÇAYDA, 10.06 AÇMADI, 11.06 AÇMADI, 04.08 ŞEHİR DIŞI, DÖNENE KADAR PASIF", "durum": "PASİF"}, {"isim": "Gülşen AKKAYA", "ekip": "Gülin", "mahalle": "Hacıfeyzullah", "sonGidilme": "2025-01-23", "not_": "29.04 TLF AÇMADI, 10.06 AÇMADI, 11.06 AÇMADI, 25.06.2025 TELEFON AÇMADIĞI İÇİN PASIF", "durum": "PASİF"}, {"isim": "Asuman Çağlar", "ekip": "", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-02-11", "not_": "GELİNİ YANINDA 02.05 DE", "durum": "PASİF"}, {"isim": "Sinem BALKAN", "ekip": "", "mahalle": "Hacıfeyzullah", "sonGidilme": "2025-02-24", "not_": "08.05 şehir dışında arayacak", "durum": "PASİF"}, {"isim": "HAFİZE EYİLER", "ekip": "Gülin", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-04-28", "not_": "ARAYINCA GİDİLECEK ( 01.09.2025 )", "durum": "AKTİF"}, {"isim": "Gülyüz Çavuşoğlu", "ekip": "Hava", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-05-30", "not_": "30.07.2025 MÜSAİT DEĞİL 11.09 .2025 TEL CEVAP VERMEDİ", "durum": "AKTİF"}, {"isim": "Gülşen ALKAN", "ekip": "Gülin", "mahalle": "Karaova", "sonGidilme": "2025-06-18", "not_": "ULAŞILAMIYOR, ARARSA EKLENECEK", "durum": "AKTİF"}, {"isim": "Necdet AKMAN", "ekip": "Hava", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-06-19", "not_": "07.08.2025 KIZI YANINDA", "durum": "AKTİF"}, {"isim": "Cevdet BOŞDURMAZ", "ekip": "Nihal", "mahalle": "Yavansu", "sonGidilme": "2025-06-25", "not_": "22.08 HASTANEDE", "durum": "AKTİF"}, {"isim": "Topgül Doğan", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2025-07-04", "not_": "13.09.2025 ist. Gidecek dönünce arayacak", "durum": "AKTİF"}, {"isim": "Ratibe DURGUT", "ekip": "Nihal", "mahalle": "Camiatik", "sonGidilme": "2025-07-09", "not_": "31.10.2025 TAŞINDI", "durum": "AKTİF"}, {"isim": "Hüseyin ALPAY", "ekip": "Hava", "mahalle": "Davutlar", "sonGidilme": "2025-07-21", "not_": "16.01.2026 TELEFON CEVAP VERMEDİ.", "durum": "AKTİF"}, {"isim": "Hatice SÜREK", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-08-07", "not_": "02.10 TEL. CEVAP VERMİYOR 25.11 tel cevap vermiyor", "durum": "AKTİF"}, {"isim": "Nazime Güngör", "ekip": "Hava", "mahalle": "Camiatik", "sonGidilme": "2025-08-11", "not_": "23.09 HASTANE ARAYACAK", "durum": "AKTİF"}, {"isim": "Gülcan BEYGÖRÜŞ", "ekip": "Gülin", "mahalle": "Cumhuriyet", "sonGidilme": "2025-08-15", "not_": "05.02 hasta Burdur'da", "durum": "AKTİF"}, {"isim": "Fatma TAPŞİK", "ekip": "Gülin", "mahalle": "Değirmendere", "sonGidilme": "2025-08-19", "not_": "04.08 MÜSAİT DEĞİL,", "durum": "AKTİF"}, {"isim": "Necmiye TOPÇUOĞLU", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2025-08-22", "not_": "21.10 İZMİR'DE ARAYACAK", "durum": "AKTİF"}, {"isim": "Mehmet Saim İLGÜN", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2025-08-25", "not_": "16.10 antepte arayacak 22.12 AB", "durum": "AKTİF"}, {"isim": "Osman KART", "ekip": "Nihal", "mahalle": "Hacıfeyzullah", "sonGidilme": "2025-08-27", "not_": "", "durum": "AKTİF"}, {"isim": "Nuray Alkan", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-09-01", "not_": "ankara'da arayacak,", "durum": "AKTİF"}, {"isim": "Şefika ŞENOL", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2025-09-01", "not_": "19.11 TEL CEVAP VERMİYOR", "durum": "AKTİF"}, {"isim": "Ali GÜLTEKİN", "ekip": "Hava", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-09-09", "not_": "07.11 BAŞKA ZAMAN", "durum": "AKTİF"}, {"isim": "Esma KARAMANDERESİ", "ekip": "Hava", "mahalle": "Camiatik", "sonGidilme": "2025-10-08", "not_": "19.11 BİR AY SONRA", "durum": "AKTİF"}, {"isim": "Sevim Karaoğlu", "ekip": "Gülin", "mahalle": "Türkmen", "sonGidilme": "2025-10-08", "not_": "İSTANBUL'DA, GELİNCE ARAYACAK", "durum": "AKTİF"}, {"isim": "Çetin Coşkun", "ekip": "Nihal", "mahalle": "Davutlar", "sonGidilme": "2025-10-09", "not_": "ARAYACAK", "durum": "AKTİF"}, {"isim": "Şehriban YANAR", "ekip": "Nihal", "mahalle": "Cumhuriyet", "sonGidilme": "2025-08-25", "not_": "20.10.AÇMADI 13.11 OĞLU TEMİZLİK YAPIYOR.", "durum": "PASİF"}, {"isim": "Feda Tekin", "ekip": "Gülin", "mahalle": "Davutlar", "sonGidilme": "2025-10-13", "not_": "16.01.2026 TELEFON CEVAP VERMEDİ.", "durum": "AKTİF"}, {"isim": "Yalçın İKİZEK", "ekip": "Hava", "mahalle": "Ege", "sonGidilme": "2025-10-15", "not_": "", "durum": "AKTİF"}, {"isim": "Abbas İSİMBAY", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2025-10-22", "not_": "08.12 HASTANEDE ARAYACAK", "durum": "AKTİF"}, {"isim": "Aişe KARELİ", "ekip": "Gülin", "mahalle": "Karaova", "sonGidilme": "2025-10-31", "not_": "", "durum": "AKTİF"}, {"isim": "Fikriye Hasbay", "ekip": "Nihal", "mahalle": "Değirmendere", "sonGidilme": "2025-11-03", "not_": "14.10 İSTANBUL'DA", "durum": "AKTİF"}, {"isim": "Şazan Dinek", "ekip": "Gülin", "mahalle": "İkiçeşmelik", "sonGidilme": "2025-11-05", "not_": "30.10 badana yaptıracak daha sonra", "durum": "AKTİF"}, {"isim": "Nihat Özkan", "ekip": "Nihal", "mahalle": "Kadıkalesi", "sonGidilme": "2025-11-12", "not_": "", "durum": "AKTİF"}, {"isim": "Şerafettin KAHRAMAN", "ekip": "Gülin", "mahalle": "Davutlar", "sonGidilme": "2025-11-14", "not_": "12.01. TEL CEVAP VERMEDİ.", "durum": "AKTİF"}, {"isim": "Ayla ÇALIŞKAN", "ekip": "Hava", "mahalle": "Hacıfeyzullah", "sonGidilme": "2025-11-25", "not_": "23.10 HASTANEDE ÇIKINCA ARAYACAK 20.01 HASTANEDE ÇIKINCA ARAYACAK", "durum": "AKTİF"}, {"isim": "Mustafa İNCEOĞLU", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2025-11-26", "not_": "01.09.2025 AÇMADI  06.02.2026 AÇMIYOR.", "durum": "AKTİF"}, {"isim": "Nurhayat Yanal", "ekip": "Nihal", "mahalle": "Soğucak", "sonGidilme": "2025-11-26", "not_": "", "durum": "AKTİF"}, {"isim": "Doğan Atlay", "ekip": "Hava", "mahalle": "Camiatik", "sonGidilme": "2025-11-27", "not_": "26.08 EYLÜLDE ARANACAK", "durum": "AKTİF"}, {"isim": "Mükerrem PINARBAŞI", "ekip": "Nihal", "mahalle": "Cumhuriyet", "sonGidilme": "2025-11-27", "not_": "25.02 G,D,LDİ PERSONELİ GERİ CEVİRDİ.", "durum": "İPTAL"}, {"isim": "Gönül YAVEŞ", "ekip": "Hava", "mahalle": "Değirmendere", "sonGidilme": "2025-12-02", "not_": "", "durum": "AKTİF"}, {"isim": "Belgin AĞIR", "ekip": "Hava", "mahalle": "Değirmendere", "sonGidilme": "2025-12-03", "not_": "26.02 ŞEHİR DIŞI ARAYACAK", "durum": "AKTİF"}, {"isim": "İlhan TOKKAN", "ekip": "Hava", "mahalle": "Güzelçamlı", "sonGidilme": "2025-12-05", "not_": "21.01 TEL CEVAP VERMİYOR", "durum": "AKTİF"}, {"isim": "Nazım BAYRAK", "ekip": "Gülin", "mahalle": "Değirmendere", "sonGidilme": "2025-12-10", "not_": "05.12 açmadı", "durum": "AKTİF"}, {"isim": "Dereh ÜNGÜR", "ekip": "Hava", "mahalle": "Davutlar", "sonGidilme": "2025-12-12", "not_": "04.09 AÇMADI", "durum": "AKTİF"}, {"isim": "Fatma BAŞAR", "ekip": "Nihal", "mahalle": "Davutlar", "sonGidilme": "2025-12-12", "not_": "16.01.2026 HASTANEDE", "durum": "AKTİF"}, {"isim": "Remziye Arıcı", "ekip": "Gülin", "mahalle": "Hacıfeyzullah", "sonGidilme": "2025-12-15", "not_": "26.08 misafir var, 10.09 açmadı 16.01.2026 HASTANEDE ARAYACAK", "durum": "AKTİF"}, {"isim": "Sevim ACAR", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2025-12-16", "not_": "", "durum": "AKTİF"}, {"isim": "Nazegül ÇAMALAN", "ekip": "Gülin", "mahalle": "Davutlar", "sonGidilme": "2025-12-17", "not_": "16.01.2026 İSTEMİYOR.", "durum": "AKTİF"}, {"isim": "Yeter AVCI", "ekip": "Hava", "mahalle": "Dağ", "sonGidilme": "2025-12-17", "not_": "", "durum": "AKTİF"}, {"isim": "Ayşe Şeker", "ekip": "Gülin", "mahalle": "Davutlar", "sonGidilme": "2025-12-22", "not_": "", "durum": "AKTİF"}, {"isim": "Ayten ŞENCAN", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2025-12-22", "not_": "02.10BİR AY SONRA", "durum": "AKTİF"}, {"isim": "Halil ÖDEN", "ekip": "Nihal", "mahalle": "Değirmendere", "sonGidilme": "2025-12-22", "not_": "", "durum": "AKTİF"}, {"isim": "Aynur ŞEVKAN", "ekip": "Gülin", "mahalle": "Hacıfeyzullah", "sonGidilme": "2025-12-23", "not_": "", "durum": "AKTİF"}, {"isim": "Gülfem SELÇUK", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2025-12-23", "not_": "", "durum": "AKTİF"}, {"isim": "Güllü TOPAL", "ekip": "Nihal", "mahalle": "İkiçeşmelik", "sonGidilme": "2025-12-23", "not_": "", "durum": "AKTİF"}, {"isim": "Ayla ÖZSABUNCU", "ekip": "Hava", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-12-24", "not_": "", "durum": "AKTİF"}, {"isim": "Mübeccel TAŞÇI", "ekip": "Hava", "mahalle": "Davutlar", "sonGidilme": "2025-12-24", "not_": "", "durum": "AKTİF"}, {"isim": "Mükerrem Öztürk", "ekip": "Nihal", "mahalle": "Davutlar", "sonGidilme": "2025-12-25", "not_": "", "durum": "AKTİF"}, {"isim": "Necla İRASLAN", "ekip": "Hava", "mahalle": "Değirmendere", "sonGidilme": "2025-12-25", "not_": "", "durum": "AKTİF"}, {"isim": "Satıa ULAŞAN", "ekip": "Nihal", "mahalle": "Güzelçamlı", "sonGidilme": "2025-12-26", "not_": "", "durum": "AKTİF"}, {"isim": "Sultan Sucu", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2025-12-26", "not_": "", "durum": "AKTİF"}, {"isim": "Kibare Talayhan", "ekip": "Nihal", "mahalle": "İkiçeşmelik", "sonGidilme": "2025-12-29", "not_": "", "durum": "AKTİF"}, {"isim": "Mustafa Başer", "ekip": "Gülin", "mahalle": "Ege", "sonGidilme": "2025-12-29", "not_": "", "durum": "AKTİF"}, {"isim": "Seyfi Yılmaz", "ekip": "Gülin", "mahalle": "Ege", "sonGidilme": "2025-12-29", "not_": "", "durum": "AKTİF"}, {"isim": "Ayşe BALCI", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-12-30", "not_": "", "durum": "AKTİF"}, {"isim": "Fatma YILDIZ", "ekip": "Gülin", "mahalle": "Camiatik", "sonGidilme": "2025-12-30", "not_": "", "durum": "AKTİF"}, {"isim": "Zeynep Fırat", "ekip": "Hava", "mahalle": "İkiçeşmelik", "sonGidilme": "2025-12-30", "not_": "20.10 MÜSAİT DEĞİL", "durum": "AKTİF"}, {"isim": "Hayriye ARIN", "ekip": "Hava", "mahalle": "Dağ", "sonGidilme": "2025-12-31", "not_": "", "durum": "AKTİF"}, {"isim": "Seyfettin MARŞ", "ekip": "Gülin", "mahalle": "Cumhuriyet", "sonGidilme": "2025-12-31", "not_": "06,02 AÇMADI", "durum": "AKTİF"}, {"isim": "Sultan Türkeç", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2025-12-31", "not_": "", "durum": "AKTİF"}, {"isim": "Şehriban ÇALIŞANDEMİR", "ekip": "Hava", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-12-31", "not_": "", "durum": "AKTİF"}, {"isim": "İbrahim Tünay", "ekip": "Gülin", "mahalle": "Türkmen", "sonGidilme": "2026-01-02", "not_": "", "durum": "AKTİF"}, {"isim": "Mehmet ATILGAN", "ekip": "Nihal", "mahalle": "Cumhuriyet", "sonGidilme": "2026-01-02", "not_": "", "durum": "AKTİF"}, {"isim": "Zeliha ÇAKICI", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2026-01-02", "not_": "", "durum": "AKTİF"}, {"isim": "Ali İnan SEVERDİ", "ekip": "Nihal", "mahalle": "İkiçeşmelik", "sonGidilme": "2026-01-05", "not_": "", "durum": "AKTİF"}, {"isim": "Ayşe Yılmaz", "ekip": "Gülin", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-01-05", "not_": "", "durum": "AKTİF"}, {"isim": "Nail ERDEM", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2026-01-05", "not_": "", "durum": "AKTİF"}, {"isim": "Resmiye Çiloğlu", "ekip": "Gülin", "mahalle": "Türkmen", "sonGidilme": "2026-01-05", "not_": "", "durum": "AKTİF"}, {"isim": "Kemal Timocin", "ekip": "Gülin", "mahalle": "Ege", "sonGidilme": "2026-01-06", "not_": "15 EYLÜL'DE GİDİLECEK", "durum": "AKTİF"}, {"isim": "Sabriye BAKER", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-01-06", "not_": "26.08 TELEFON AÇMADI", "durum": "AKTİF"}, {"isim": "Saniye ALTIN", "ekip": "Nihal", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-06", "not_": "04.09 AÇMADI, 09.09 İSTEMEDİ", "durum": "AKTİF"}, {"isim": "Semahat Şimşek", "ekip": "Gülin", "mahalle": "Türkmen", "sonGidilme": "2026-01-06", "not_": "", "durum": "AKTİF"}, {"isim": "Asuman ÇAĞLAR", "ekip": "Nihal", "mahalle": "İkiçeşmelik", "sonGidilme": "2026-01-07", "not_": "", "durum": "AKTİF"}, {"isim": "Birsen Barışık", "ekip": "Gülin", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-01-07", "not_": "27.08 HASTANEDE, GELİNCE ARAYACAK", "durum": "AKTİF"}, {"isim": "Leyla Kördemirci", "ekip": "Nihal", "mahalle": "Değirmendere", "sonGidilme": "2026-01-07", "not_": "18.08 evi taşıyor arayacak, 26.08 KENDİSİ ARAYACAK", "durum": "AKTİF"}, {"isim": "Sabriye Özer", "ekip": "Gülin", "mahalle": "Davutlar", "sonGidilme": "2026-01-07", "not_": "", "durum": "AKTİF"}, {"isim": "Selahattin AKBAŞ", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-08", "not_": "", "durum": "AKTİF"}, {"isim": "Yücel Dur", "ekip": "Hava", "mahalle": "Değirmendere", "sonGidilme": "2026-01-08", "not_": "", "durum": "AKTİF"}, {"isim": "Hafize Evren", "ekip": "Gülin", "mahalle": "İkiçeşmelik", "sonGidilme": "2026-01-09", "not_": "", "durum": "AKTİF"}, {"isim": "Kamil MANTAŞ", "ekip": "Hava", "mahalle": "Davutlar", "sonGidilme": "2026-01-09", "not_": "", "durum": "AKTİF"}, {"isim": "Ayşe TIĞRAKLI", "ekip": "Gülin", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-01-12", "not_": "30.12 KIZININ YANINDA YILBAŞINDAN SONRA", "durum": "AKTİF"}, {"isim": "Kadriye ÖRS", "ekip": "Gülin", "mahalle": "Türkmen", "sonGidilme": "2026-01-12", "not_": "", "durum": "AKTİF"}, {"isim": "Kiraz KAYA", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2026-01-12", "not_": "", "durum": "AKTİF"}, {"isim": "Rebiş İÇ", "ekip": "Hava", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-12", "not_": "", "durum": "AKTİF"}, {"isim": "Saynure AŞICI", "ekip": "Hava", "mahalle": "Cumhuriyet", "sonGidilme": "2026-01-12", "not_": "", "durum": "AKTİF"}, {"isim": "Tülin Zühal Eser", "ekip": "Nihal", "mahalle": "Yavansu", "sonGidilme": "2026-01-12", "not_": "", "durum": "AKTİF"}, {"isim": "Macide IŞIK", "ekip": "Gülin", "mahalle": "İkiçeşmelik", "sonGidilme": "2026-01-13", "not_": "", "durum": "AKTİF"}, {"isim": "Muteber EVREN", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2026-01-13", "not_": "", "durum": "AKTİF"}, {"isim": "Nurşen HAYTA", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-01-13", "not_": "", "durum": "AKTİF"}, {"isim": "Nurten KINAY", "ekip": "Hava", "mahalle": "Cumhuriyet", "sonGidilme": "2026-01-13", "not_": "01.12 haftaya", "durum": "AKTİF"}, {"isim": "Ulviye BALCI", "ekip": "Gülin", "mahalle": "Camiatik", "sonGidilme": "2026-01-13", "not_": "", "durum": "AKTİF"}, {"isim": "Vildan ELDER", "ekip": "Nihal", "mahalle": "Camiatik", "sonGidilme": "2026-01-13", "not_": "", "durum": "AKTİF"}, {"isim": "Emine Yıldırım", "ekip": "Hava", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-01-14", "not_": "09.10 KIZININ YANINDA 11.12 Batman'da arayacak", "durum": "AKTİF"}, {"isim": "Huriye GÜNDEŞ", "ekip": "Hava", "mahalle": "Alacamescit", "sonGidilme": "2026-01-14", "not_": "", "durum": "AKTİF"}, {"isim": "Mehmet BAZKARA", "ekip": "Nihal", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-14", "not_": "", "durum": "AKTİF"}, {"isim": "Muteber SALLI", "ekip": "Gülin", "mahalle": "İkiçeşmelik", "sonGidilme": "2026-01-14", "not_": "", "durum": "AKTİF"}, {"isim": "Nermin Akdeniz", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-14", "not_": "", "durum": "AKTİF"}, {"isim": "SÜREYYA KULA", "ekip": "Nihal", "mahalle": "Cumhuriyet", "sonGidilme": "2026-01-14", "not_": "beklesin", "durum": "AKTİF"}, {"isim": "Feriha İPLİKÇİ", "ekip": "Gülin", "mahalle": "Türkmen", "sonGidilme": "2026-01-15", "not_": "", "durum": "AKTİF"}, {"isim": "Gönül İSTANKÖYLÜ", "ekip": "Nihal", "mahalle": "Camiatik", "sonGidilme": "2026-01-15", "not_": "", "durum": "AKTİF"}, {"isim": "Halil Akdemir", "ekip": "Hava", "mahalle": "Alacamescit", "sonGidilme": "2026-01-15", "not_": "29.08 ÖDEMİŞTE DÖNÜNCE ARAYACAK", "durum": "AKTİF"}, {"isim": "Murat SÜMER", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-15", "not_": "", "durum": "AKTİF"}, {"isim": "Semra PARALI", "ekip": "Hava", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-01-15", "not_": "", "durum": "AKTİF"}, {"isim": "Ayhan BAHÇEVAN", "ekip": "Gülin", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-01-16", "not_": "10.09 İSTEMEDİ 16.01.2026 TELEFON AÇMIYOR.", "durum": "AKTİF"}, {"isim": "Cevdet KARAGÖZ", "ekip": "Gülin", "mahalle": "İkiçeşmelik", "sonGidilme": "2026-01-16", "not_": "", "durum": "AKTİF"}, {"isim": "Ganime Sultan ÇELİKEL", "ekip": "Hava", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-16", "not_": "", "durum": "AKTİF"}, {"isim": "Hatice Alabaş", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2026-01-16", "not_": "", "durum": "AKTİF"}, {"isim": "Naile DEMİRBULAK", "ekip": "Hava", "mahalle": "Bayraklıdede", "sonGidilme": "2026-01-16", "not_": "", "durum": "AKTİF"}, {"isim": "Ayten ORHAN", "ekip": "Hava", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-01-19", "not_": "", "durum": "AKTİF"}, {"isim": "Emine GÖÇEN", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2026-01-19", "not_": "", "durum": "AKTİF"}, {"isim": "Ethem Davran", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-01-19", "not_": "", "durum": "AKTİF"}, {"isim": "Nazife Kırımtay", "ekip": "Gülin", "mahalle": "İkiçeşmelik", "sonGidilme": "2026-01-19", "not_": "22.10 DOLAPLARI BOŞALTTI ARIZA VAR 16.01.2026 İSTEMİYOR.", "durum": "AKTİF"}, {"isim": "Aynur ÜNVER", "ekip": "Gülin", "mahalle": "Camiatik", "sonGidilme": "2026-01-20", "not_": "", "durum": "AKTİF"}, {"isim": "İnayet ATAM", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-01-20", "not_": "", "durum": "AKTİF"}, {"isim": "Mehmet Muhammet B.", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2026-01-20", "not_": "", "durum": "AKTİF"}, {"isim": "Zeynep AKDUMAN", "ekip": "Hava", "mahalle": "Ege", "sonGidilme": "2026-01-20", "not_": "", "durum": "AKTİF"}, {"isim": "Ayten ERDEM", "ekip": "Gülin", "mahalle": "Karaova", "sonGidilme": "2026-01-21", "not_": "", "durum": "AKTİF"}, {"isim": "İslim Çerçi", "ekip": "Gülin", "mahalle": "Türkmen", "sonGidilme": "2026-01-21", "not_": "", "durum": "AKTİF"}, {"isim": "Mevlude PEHLİVAN", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2026-01-21", "not_": "", "durum": "AKTİF"}, {"isim": "Saadet Çiğdem Turhal", "ekip": "Nihal", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-01-21", "not_": "BEKLESİN", "durum": "AKTİF"}, {"isim": "Ayten ZENCİR", "ekip": "Gülin", "mahalle": "Bayraklıdede", "sonGidilme": "2026-01-22", "not_": "", "durum": "AKTİF"}, {"isim": "Ummuhan KARA", "ekip": "Nihal", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-22", "not_": "24.12 Aydın'da arayacak", "durum": "AKTİF"}, {"isim": "FİKRİYE BİRCAN", "ekip": "Gülin", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-01-26", "not_": "30.07.2025 TLF AÇMADI, ARAYINCA GİDİLECEK ( 02.09.2025 )", "durum": "AKTİF"}, {"isim": "Emine ERSOY", "ekip": "Nihal", "mahalle": "Camiatik", "sonGidilme": "2026-01-27", "not_": "", "durum": "AKTİF"}, {"isim": "Zülfiye TURHAN", "ekip": "Gülin", "mahalle": "Türkmen", "sonGidilme": "2026-01-27", "not_": "10.09 İSTEMEDİ 16.01.2026 MOBİLYACI GELECEK İSTEMEDİ.", "durum": "AKTİF"}, {"isim": "Aynur ONURSAL", "ekip": "Nihal", "mahalle": "Camiatik", "sonGidilme": "2026-01-28", "not_": "", "durum": "AKTİF"}, {"isim": "Güler ÜTKÜR", "ekip": "Gülin", "mahalle": "Alacamescit", "sonGidilme": "2026-01-28", "not_": "", "durum": "AKTİF"}, {"isim": "Remziye AYDOĞAN", "ekip": "Nihal", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-01-28", "not_": "", "durum": "AKTİF"}, {"isim": "Antiga Soyusinmez", "ekip": "Hava", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-30", "not_": "", "durum": "AKTİF"}, {"isim": "Asiye BAŞ", "ekip": "Gülin", "mahalle": "Soğucak", "sonGidilme": "2026-01-30", "not_": "12.08 ANKARADA AMELİYAT OLACAK, ARAYINCA GİDİLECEK ( 02.09.2025 )", "durum": "AKTİF"}, {"isim": "İskender Sürmeli", "ekip": "Hava", "mahalle": "Güzelçamlı", "sonGidilme": "2026-01-30", "not_": "", "durum": "AKTİF"}, {"isim": "Nurdan Elçin", "ekip": "Nihal", "mahalle": "Karaova", "sonGidilme": "2026-01-30", "not_": "", "durum": "AKTİF"}, {"isim": "Fadime SEZGİN", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2026-02-03", "not_": "", "durum": "AKTİF"}, {"isim": "Gülşen AKKOÇ", "ekip": "Gülin", "mahalle": "Cumhuriyet", "sonGidilme": "2026-02-03", "not_": "", "durum": "AKTİF"}, {"isim": "İnci Anıl", "ekip": "Nihal", "mahalle": "Camiatik", "sonGidilme": "2026-02-03", "not_": "", "durum": "AKTİF"}, {"isim": "Gürkan ÇİLEKÇİLER", "ekip": "Gülin", "mahalle": "Ege", "sonGidilme": "2026-02-04", "not_": "24.09.2025 HASTAHANEDE HAFTAYA İSTİYOR", "durum": "AKTİF"}, {"isim": "Mustafa YILDIRIM", "ekip": "Nihal", "mahalle": "Değirmendere", "sonGidilme": "2026-02-04", "not_": "", "durum": "AKTİF"}, {"isim": "Döndü SARP", "ekip": "Gülin", "mahalle": "Ege", "sonGidilme": "2026-02-05", "not_": "", "durum": "AKTİF"}, {"isim": "Semra AYBAZ", "ekip": "Gülin", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-02-05", "not_": "", "durum": "AKTİF"}, {"isim": "Fatma UZBİÇER", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2026-02-06", "not_": "", "durum": "AKTİF"}, {"isim": "Murat İPEK", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2026-02-06", "not_": "", "durum": "AKTİF"}, {"isim": "Emine Çetinkaya", "ekip": "Hava", "mahalle": "Ege", "sonGidilme": "2026-02-11", "not_": "", "durum": "AKTİF"}, {"isim": "Şaban Yüce", "ekip": "Nihal", "mahalle": "Cumhuriyet", "sonGidilme": "2026-02-11", "not_": "", "durum": "AKTİF"}, {"isim": "Yüksel SEMETAY", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2026-02-11", "not_": "07.01 arayacak", "durum": "AKTİF"}, {"isim": "Hatice YILDIRIM", "ekip": "Gülin", "mahalle": "Alacamescit", "sonGidilme": "2026-02-12", "not_": "29.07 KIZI VARMIŞ KENDİSİ HASTAHANEDE, 09.2025 cevap vermedi, ARAYINCA GİDİLECEK ( 01.09.2025 )", "durum": "AKTİF"}, {"isim": "Mustafa Caber", "ekip": "Nihal", "mahalle": "Değirmendere", "sonGidilme": "2026-02-12", "not_": "06,02 AÇMADI", "durum": "AKTİF"}, {"isim": "Safiye Özdündar", "ekip": "Gülin", "mahalle": "Güzelçamlı", "sonGidilme": "2026-02-12", "not_": "", "durum": "AKTİF"}, {"isim": "Sıdıka BİLİR", "ekip": "Hava", "mahalle": "Cumhuriyet", "sonGidilme": "2026-02-12", "not_": "07.11 HARFİYAT VAR BİR AY SONRA", "durum": "AKTİF"}, {"isim": "Ahmet EZER", "ekip": "Gülin", "mahalle": "Camiatik", "sonGidilme": "2026-02-16", "not_": "", "durum": "AKTİF"}, {"isim": "Muhsine YÖRÜK", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2026-02-16", "not_": "15.12 hasta arayacak", "durum": "AKTİF"}, {"isim": "Piran TÜRKYENER", "ekip": "Nihal", "mahalle": "Türkmen", "sonGidilme": "2026-02-20", "not_": "", "durum": "AKTİF"}, {"isim": "Fadıl AYDOĞAN", "ekip": "Nihal", "mahalle": "Karaova", "sonGidilme": "2026-02-24", "not_": "", "durum": "AKTİF"}, {"isim": "Güner KARAMAN", "ekip": "Hava", "mahalle": "Güzelçamlı", "sonGidilme": "2026-02-24", "not_": "", "durum": "AKTİF"}, {"isim": "Mehmet Cem ERDEM", "ekip": "Hava", "mahalle": "Karaova", "sonGidilme": "2026-02-24", "not_": "", "durum": "AKTİF"}, {"isim": "Naciye Kudret HÜFTECİ", "ekip": "Hava", "mahalle": "Güzelçamlı", "sonGidilme": "2026-02-24", "not_": "", "durum": "AKTİF"}, {"isim": "Ecmel TUNCER", "ekip": "Hava", "mahalle": "Camiatik", "sonGidilme": "2026-02-25", "not_": "26.11  02.12 ulaşılamıyor", "durum": "AKTİF"}, {"isim": "Habibe İNCEOĞLU", "ekip": "Hava", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-02-25", "not_": "", "durum": "AKTİF"}, {"isim": "Neziha Sezginer", "ekip": "Gülin", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-02-25", "not_": "16.01 ÇANAKKALEDE", "durum": "AKTİF"}, {"isim": "Nursen ŞENGÜL", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-02-25", "not_": "16.09 ANKARADA HAFTAYA ARAYACAK", "durum": "AKTİF"}, {"isim": "Nazife AKKUŞ", "ekip": "Hava", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-02-26", "not_": "", "durum": "AKTİF"}, {"isim": "Sevinç GÜNDÜZ", "ekip": "Nihal", "mahalle": "Güzelçamlı", "sonGidilme": "2026-02-26", "not_": "", "durum": "AKTİF"}, {"isim": "Ayten ÇAĞIL", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-02-27", "not_": "", "durum": "AKTİF"}, {"isim": "Yaşar IŞIK ÖZLER", "ekip": "Gülin", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-02-27", "not_": "", "durum": "AKTİF"}, {"isim": "Erol ÖZER", "ekip": "Gülin", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-03-02", "not_": "06.02.2026 ARANDI .AÇMADI.", "durum": "AKTİF"}, {"isim": "Birol ERDOĞAN", "ekip": "Hava", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-03-03", "not_": "19.01 ŞEHİR DIŞINDA HAFTAYA", "durum": "AKTİF"}, {"isim": "Gülsevim Kuramaz", "ekip": "Gülin", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-03-03", "not_": "", "durum": "AKTİF"}, {"isim": "Gülay Yetik", "ekip": "Hava", "mahalle": "Cumhuriyet", "sonGidilme": "2026-03-04", "not_": "23.01 KIZI VAR 15 GÜN SONRA", "durum": "AKTİF"}, {"isim": "İkbal DÜZBASTI", "ekip": "Nihal", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-03-04", "not_": "", "durum": "AKTİF"}, {"isim": "Kadriye HACIOĞLU", "ekip": "Gülin", "mahalle": "Cumhuriyet", "sonGidilme": "2026-03-04", "not_": "31.07.2025 EVDE YOK, 04.08 AÇMADI", "durum": "AKTİF"}, {"isim": "Seval Boya", "ekip": "Hava", "mahalle": "Kadınlar Denizi", "sonGidilme": "2026-03-04", "not_": "", "durum": "AKTİF"}, {"isim": "İdris ÇEVİRMEN", "ekip": "Nihal", "mahalle": "Hacıfeyzullah", "sonGidilme": "2026-03-05", "not_": "", "durum": "AKTİF"}, {"isim": "İsmet USLU", "ekip": "Nihal", "mahalle": "Yavansu", "sonGidilme": "2026-03-05", "not_": "", "durum": "AKTİF"}, {"isim": "Ramazan ZOPA", "ekip": "Hava", "mahalle": "Güzelçamlı", "sonGidilme": "2025-04-25", "not_": "ARAYINCA GİDİLECEK ( 01.09.2025 )", "durum": "BEKLEME LİSTESİ"}, {"isim": "Nusret ENGİZ", "ekip": "Nihal", "mahalle": "Değirmendere", "sonGidilme": "2025-05-23", "not_": "ARAYINCA GİDİLECEK ( 03.09.2025 )", "durum": "BEKLEME LİSTESİ"}, {"isim": "Mahinur YEŞİLBAŞ", "ekip": "Gülin", "mahalle": "Ege", "sonGidilme": "2025-05-27", "not_": "ARAYINCA GİDİLECEK ( 01.09.2025 )", "durum": "BEKLEME LİSTESİ"}, {"isim": "Fatma Nilgün ÖZÜPEK", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-06-03", "not_": "ARAYINCA GİDİLECEK ( 01.09.2025 )", "durum": "BEKLEME LİSTESİ"}, {"isim": "Remziye KARDEŞLER", "ekip": "Nihal", "mahalle": "Kadınlar Denizi", "sonGidilme": "2025-10-14", "not_": "24.11.ANKARA'DA  ARAYACAK", "durum": "BEKLEME LİSTESİ"}, {"isim": "Özgül MALGAZ", "ekip": "Nihal", "mahalle": "Davutlar", "sonGidilme": "2025-10-06", "not_": "BEKLESİN 60 GÜN  16.01.2026 KIŞ BOYU İSTEMİYOR.KENDİSİ HABER VERECEK", "durum": "BEKLEME LİSTESİ"}, {"isim": "Hatice Yüksel Özerkan", "ekip": "Hava", "mahalle": "Hacıfeyzullah", "sonGidilme": "2025-12-11", "not_": "BAKIMEVİNE YERLEŞTİ", "durum": "İPTAL"}, {"isim": "Satı ÇAMALAN", "ekip": "Nihal", "mahalle": "Davutlar", "sonGidilme": "2025-12-17", "not_": "16.01.2026 EVE GİDİLDİ  EVE  ALMADI.", "durum": "İPTAL"}, {"isim": "Kamile BÜYÜKDAĞLI", "ekip": "Hava", "mahalle": "Davutlar", "sonGidilme": "2026-03-05", "not_": "16.10.2025 şehir dışı arayacak 31.10 AÇMADI", "durum": "AKTİF"}, {"isim": "Medine Onay", "ekip": "Hava", "mahalle": "İkiçeşmelik", "sonGidilme": "2026-03-05", "not_": "", "durum": "AKTİF"}, {"isim": "Seniha SÖNMEZ", "ekip": "Hava", "mahalle": "Türkmen", "sonGidilme": "2026-03-06", "not_": "sENİHA sÖNMEZ'İN İZMİR'DE OLDUĞU EVDE OĞLU VE SEVGİLİSİNİN OLMASI NEDENİYLE SENİHA", "durum": ""}];
let tpSortDir = 'asc'; // asc = en eski önce

function tpRender() {
  const seciliDurumlar = [...document.querySelectorAll('.tp-dur-cb:checked')].map(cb=>cb.value);
  const ekipF  = document.getElementById('tp-ekip').value;
  const renkF  = document.getElementById('tp-renk').value;
  const araF   = document.getElementById('tp-ara').value.trim().toUpperCase();
  const today  = new Date(); today.setHours(0,0,0,0);

  let rows = TP_DATA.map((r, i) => {
    let gun = null;
    if(r.sonGidilme) {
      const d = new Date(r.sonGidilme); d.setHours(0,0,0,0);
      gun = Math.floor((today - d) / 86400000);
    }
    return {...r, gun, _origIdx: i};
  });

  // Filtrele
  if(seciliDurumlar.length) rows = rows.filter(r=>seciliDurumlar.includes(r.durum));
  if(ekipF)  rows = rows.filter(r=>r.ekip===ekipF);
  if(araF)   rows = rows.filter(r=>r.isim.toUpperCase().includes(araF));
  if(renkF) {
    rows = rows.filter(r=>{
      if(r.gun===null) return renkF==='siyah';
      if(renkF==='siyah')   return r.gun>90;
      if(renkF==='kirmizi') return r.gun>=61 && r.gun<=90;
      if(renkF==='sari')    return r.gun>=45 && r.gun<=60;
      if(renkF==='yesil')   return r.gun>=0 && r.gun<=44;
    });
  }

  // Personel filtresi
  if(window._tpPersonelFiltre) {
    if(window._tpPersonelFiltre === 'Atanmamış') {
      rows = rows.filter(r=>!(r.ekip||'').trim());
    } else {
      rows = rows.filter(r=>(r.ekip||'').trim()===window._tpPersonelFiltre);
    }
  }

  // Sırala
  rows.sort((a,b) => {
    const ga = a.gun ?? 99999;
    const gb = b.gun ?? 99999;
    return tpSortDir === 'asc' ? gb - ga : ga - gb;
  });

  document.getElementById('tp-count').textContent = rows.length + ' kayıt';

  // Personel stats bar (tıklanabilir, Kadın Banyo gibi)
  const statsBar = document.getElementById('tp-personel-stats-bar');
  if(statsBar && typeof tpRenderPersonelStats === 'function') {
    tpRenderPersonelStats(window._tpPersonelFiltre || '');
  } else if(statsBar) {
    // Fallback: klasik ekip sayıları
    const ekipSayar = {};
    TP_DATA.filter(r=>r.durum==='AKTİF').forEach(r => {
      const e = r.ekip || '—';
      ekipSayar[e] = (ekipSayar[e]||0) + 1;
    });
    const EKIP_RENK = {'Gülin':'#C2185B','Hava':'#1565C0','Nihal':'#2E7D32','Tüm Ekip':'#7c3aed'};
    statsBar.innerHTML = Object.entries(ekipSayar).sort((a,b)=>b[1]-a[1]).map(([ekip, sayi]) => {
      const renk = EKIP_RENK[ekip] || '#64748b';
      return `<div style="display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid ${renk}33;border-radius:12px;padding:10px 16px;min-width:120px">
        <div style="width:36px;height:36px;border-radius:50%;background:${renk};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:14px;flex-shrink:0">${ekip.charAt(0)}</div>
        <div><div style="font-weight:800;font-size:13px;color:#1e293b">${ekip}</div><div style="font-size:20px;font-weight:900;color:${renk}">${sayi} <span style="font-size:11px;font-weight:600;color:#64748b">ev</span></div></div>
      </div>`;
    }).join('');
  }

  const EKIP_RENK = {'Gülin':'#C2185B','Hava':'#1565C0','Nihal':'#2E7D32','Tüm Ekip':'#7c3aed'};
  const tbody = document.getElementById('tp-tbody');
  tbody.innerHTML = rows.map(r => {
    let bg = '', dot = '';
    if(r.gun===null)    { bg='rgba(0,0,0,0.07)';    dot='⚫'; }
    else if(r.gun>90)   { bg='rgba(0,0,0,0.07)';    dot='⚫'; }
    else if(r.gun>=61)  { bg='rgba(239,68,68,0.08)'; dot='🔴'; }
    else if(r.gun>=45)  { bg='rgba(251,191,36,0.12)';dot='🟡'; }
    else                { bg='rgba(34,197,94,0.10)'; dot='🟢'; }

    const tarihStr = r.sonGidilme ? r.sonGidilme.split('-').reverse().join('.') : '—';
    const gunStr   = r.gun !== null ? `${r.gun} gün` : '—';
    const durumColor = r.durum==='AKTİF'?'#16a34a':r.durum==='PASİF'?'#64748b':'#ef4444';
    const ekipRenk = EKIP_RENK[r.ekip] || '#94a3b8';
    const ekipBadge = r.ekip
      ? `<span style="background:${ekipRenk}18;color:${ekipRenk};border:1px solid ${ekipRenk}55;border-radius:8px;padding:2px 8px;font-size:11px;font-weight:800">${r.ekip}</span>`
      : `<span style="color:#94a3b8;font-size:11px">—</span>`;

    const origIdx = r._origIdx;
    return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
      <td style="padding:8px 8px;font-weight:700"><span style="cursor:pointer;color:#1A237E;text-decoration:underline dotted" onclick="openVatandasCard('${r.isim.replace(/'/g,"\\'")}')">${dot} ${r.isim}</span></td>
      <td style="padding:8px 8px;color:var(--text-soft)">${r.mahalle}</td>
      <td style="padding:8px 8px">${ekipBadge}</td>
      <td style="padding:8px 8px;white-space:nowrap">${tarihStr}</td>
      <td style="padding:8px 8px;text-align:center;font-weight:800;font-size:14px">${gunStr}</td>
      <td style="padding:8px 8px;font-size:12px;color:var(--text-soft);max-width:220px">${r.not_||'—'}</td>
      <td style="padding:8px 8px;text-align:center;font-size:11px;font-weight:800;color:${durumColor}">${r.durum}</td>
      <td style="padding:8px 8px;text-align:center">
        <div style="display:flex;gap:4px;justify-content:center">
          <button onclick="tpPersonelAta(${origIdx})" title="Ekip Ata"
            style="background:#E65100;color:#fff;border:none;border-radius:7px;padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer">👤</button>
          <button onclick="tpEdit(${origIdx})"
            style="background:var(--primary);color:#fff;border:none;border-radius:7px;padding:4px 10px;font-size:12px;cursor:pointer">✏️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function tpSort() {
  tpSortDir = tpSortDir === 'asc' ? 'desc' : 'asc';
  document.getElementById('tp-sort-btn').textContent = tpSortDir==='asc' ? '⬆ En Eski Önce' : '⬇ En Yeni Önce';
  tpRender();
}

let tpEditIdx = null;
function tpEdit(idx) {
  tpEditIdx = idx;
  const r = TP_DATA[idx];
  document.getElementById('tpe-isim').value    = r.isim;
  document.getElementById('tpe-ekip').value    = r.ekip||'';
  document.getElementById('tpe-tarih').value   = r.sonGidilme||'';
  document.getElementById('tpe-durum').value   = r.durum||'AKTİF';
  document.getElementById('tpe-not').value     = r.not_||'';
  // populate mahalle
  const mahSel = document.getElementById('tpe-mahalle');
  const mahalleler = ['ALACAMESCİT','BAYRAKLIDEDE','CAMİATİK','CAMİKEBİR','CUMHURİYET','DAVUTLAR','DAĞ','DEĞİRMENDERE','EGE','GÜZELÇAMLI','HACIFEYZULLAH','KADINLAR DENİZİ','KARAOVA','SOĞUCAK','TÜRKMEN','YAVANSU','İKİÇEŞMELİK'];
  mahSel.innerHTML = mahalleler.map(m=>`<option value="${m}" ${m===r.mahalle?'selected':''}>${m}</option>`).join('');
  if(!mahalleler.includes(r.mahalle) && r.mahalle) mahSel.innerHTML += `<option value="${r.mahalle}" selected>${r.mahalle}</option>`;
  document.getElementById('tp-modal').style.display = 'flex';
}

function tpCloseModal() {
  document.getElementById('tp-modal').style.display = 'none';
  tpEditIdx = null;
}

async function tpFirestoreYukle() {
  try {
    const snap = await firebase.firestore().collection("temizlik_plan").get();
    TP_DATA.length = 0;
    snap.forEach(d => TP_DATA.push({ _fbId: d.id, ...d.data() }));
    TP_DATA.sort((a,b) => (a.sonGidilme||'').localeCompare(b.sonGidilme||''));
    TP_DATA.forEach(tp => {
      let rec = allData.find(r => r['HİZMET']==='TEMİZLİK' && r.ISIM_SOYISIM && r.ISIM_SOYISIM.toUpperCase()===tp.isim.toUpperCase());
      if (!rec) {
        rec = { ISIM_SOYISIM: tp.isim, MAHALLE: (tp.mahalle||'').toString().trim().toUpperCase(), AY: tpAyBul(tp.sonGidilme), 'HİZMET': 'TEMİZLİK', DURUM: tp.durum||'AKTİF', BANYO1:'', BANYO2:'', BANYO3:'', BANYO4:'', BANYO5:'', NOT1: tp.not_||'', _tpRef: true };
        allData.push(rec);
      }
      rec._tpFbId = tp._fbId;
      rec._tpRef = true;
      rec.MAHALLE = (tp.mahalle || rec.MAHALLE || '').toString().trim().toUpperCase();
      rec.DURUM = tp.durum || rec.DURUM || 'AKTİF';
      rec.NOT1 = tp.not_ || rec.NOT1 || '';
      rec.AY = tpAyBul(tp.sonGidilme) || rec.AY || '';
      if (tp.sonGidilme) rec.BANYO1 = tp.sonGidilme;
    });
  } catch(e) {
    console.error('Temizlik yüklenemedi:', e);
  }
  tpRender();
                           }

async function tpSaveEdit() {
  if(tpEditIdx === null) return;
  const r = TP_DATA[tpEditIdx];
  r.ekip       = document.getElementById('tpe-ekip').value;
  r.mahalle    = document.getElementById('tpe-mahalle').value;
  r.sonGidilme = document.getElementById('tpe-tarih').value;
  r.durum      = document.getElementById('tpe-durum').value;
  r.not_       = document.getElementById('tpe-not').value.trim();
  tpCloseModal();
  tpRender(); refreshAll();
  if(r._fbId) {
    try {
      await firebase.firestore().collection("temizlik_plan").doc(r._fbId).set(r, { merge: true });
      showToast('✅ Kayıt güncellendi ve kaydedildi');
    } catch(e) {
      showToast('⚠️ Yerel güncellendi ama Firestore\'a yazılamadı');
    }
  } else {
    showToast('✅ Kayıt güncellendi');
  }
}

const PAGE_TITLES = {dashboard:'Ana Sayfa',gunluk:'Günlük Liste',vatandaslar:'Vatandaşlar',mahalle:'Mahalle Raporu','gunluk-kayit':'Günlük Hizmet Kaydı','yeni-vatandas':'Yeni Vatandaş Kaydı',durum:'Durum Güncelle',export:'Veri Al','kisi-bilgi':'Vatandaş Adres - Telefon',takvim:'📆 Ziyaret Takvimi',plan:'🤖 Akıllı Planlama',yedekler:'💾 Yedekleme', 'ayarlar':'⚙️ Ayarlar',
};
function navTo(id, el) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('page-title').textContent = PAGE_TITLES[id]||id;
  if(id==='mahalle') renderMahalle();
  if(id==='export') { renderExpStats(); expPreview(); }
  if(id==='araclar') { arInitMahalleler(); taInit(); }
  if(id==='islem-log') renderIslemLog();
  if(id==='adres-guncelle') adresRender();
  if(id==='temizlik-plan') tpFirestoreYukle();
  if(id==='kisi-bilgi') kbYukle();
  if(id==='takvim') renderTakvim();
  if(id==='sayi-ver') svRender();
  if(id==='plan') renderPlan();
  if(id==='yedekler') yedekSayfaYukle();
  if(id==='ayarlar') { if(typeof ayarlarPersonelRender==='function') ayarlarPersonelRender(); }
  // Mobil: menüyü kapat
  mobMenuKapat();
  // Alt nav aktif öğeyi güncelle
  const mbnMap = {
    dashboard:'mbn-dashboard', gunluk:'mbn-gunluk',
    'gunluk-kayit':'mbn-gunluk-kayit', vatandaslar:'mbn-vatandaslar'
  };
  if(mbnMap[id]) {
    document.querySelectorAll('.mbn-item').forEach(b=>b.classList.remove('active'));
    document.getElementById(mbnMap[id])?.classList.add('active');
  }
}

function quickFilter(hizmet, el) {
  vatHizmet = hizmet;
  vatAy = '';
  vatPage = 1;
  navTo('vatandaslar', null);
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('page-title').textContent = 'Vatandaşlar';
  // sync tab
  document.querySelectorAll('.htab').forEach(t=>{
    t.className = 'htab';
    if(t.dataset.hizmet===hizmet) t.classList.add('active-'+HIZMET_COLORS[hizmet]);
    else if(!hizmet && t.dataset.hizmet==='') t.classList.add('active-all');
  });
  filterVat();
}

