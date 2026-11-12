# Hosted Supabase Auth: Soll-Konfiguration & Abgleichsliste (H-03)

**Stand:** 12.11.2026  
**Bezug:** Externes Audit 2026-11-11 (Befund H-03: „Lokale Auth-Konfiguration permissiv“), Auftrag 152  
**Ziel:** Definition der verbindlichen Soll-Konfiguration für die gehostete Supabase-Produktionsinstanz und Checkliste für den manuellen Abgleich durch den Projektinhaber (Marc Pönisch).

---

## 1. Kontext & Abgrenzung

In der lokalen Entwicklungsumgebung (`supabase/config.toml`) sind aus Gründen der Testbarkeit und Entwicklerergonomie permissive Einstellungen aktiv (z. B. `enable_confirmations = false`, `enable_signup = true`, `minimum_password_length = 6`, kein SMTP). Diese Werte sind für automatisierte E2E- und CI-Tests notwendig, dürfen aber **keinesfalls** in die gehostete Produktionsinstanz übertragen werden.

Die gehostete Supabase-Instanz muss nach dem Prinzip **Least Privilege** und **Fail-Closed** abgesichert sein. Änderungen an der gehosteten Instanz erfolgen nicht automatisiert durch CI oder Builder-Agenten, sondern manuell durch Marc im Supabase-Dashboard.

---

## 2. Verbindliche Soll-Werte für Produktion

### 2.1 Benutzer-Registrierung (Signups & Provider)
* **User Signups (`Enable Signups`):** `false` (Deaktiviert).
  * *Begründung:* LeadPilot ist ein geschlossenes Multi-Tenant-CRM. Neue Benutzer dürfen ausschließlich durch Administratoren per Einladung (`manage-members`-Workflow) aufgenommen werden. Öffentliche Selbstregistrierung öffnet Angriffsvektoren für Denial-of-Service und Datenmüll.
* **Anonymous Sign-ins:** `false` (Deaktiviert).
* **Manuelle Kontoverknüpfung (`Manual Linking`):** `false`.

### 2.2 E-Mail-Sicherheit & Bestätigungen
* **E-Mail-Bestätigung erforderlich (`Enable email confirmations`):** `true`.
  * *Begründung:* Stellt sicher, dass eingeladene Benutzer tatsächlich Zugriff auf das angegebene E-Mail-Postfach besitzen.
* **Double Confirm Changes (E-Mail-Änderung):** `true` (Bestätigung sowohl an alte als auch neue E-Mail-Adresse).
* **Sichere Passwortänderung (`Secure password change`):** `true` (Erfordert Reauthentifizierung oder kürzlichen Login).
* **OTP / Magic Link Gültigkeit:** Maximal 3.600 Sekunden (1 Stunde).
* **OTP Länge:** Mindestens 6 Zeichen (numerisch/alphanumerisch).

### 2.3 Passwort-Richtlinie (Password Policy)
* **Mindestlänge:** Mindestens `10` Zeichen (empfohlen: `12`).
* **Komplexitätsanforderungen:** Mindestens `lower_upper_letters_digits_symbols` (Groß-, Kleinbuchstaben, Ziffern und Sonderzeichen erforderlich).
* *Begründung:* Schutz vor Wörterbuch- und Credential-Stuffing-Angriffen.

### 2.4 URLs & Redirect Allowlist
* **Site URL:** Exakte Produktions-URL der Web-App (z. B. `https://leadpilot-dashboard-crm.netlify.app` bzw. Custom Domain).
* **Additional Redirect URLs:**
  * **Verbot:** Keine Wildcards (`*`), keine unsicheren Schemata (`http://`), keine lokalen Hosts (`localhost`, `127.0.0.1`).
  * **Erlaubt:** Ausschließlich exakt qualifizierte HTTPS-Redirect-Ziele (z. B. `https://leadpilot-dashboard-crm.netlify.app/**` nur falls Pfad-Präfixe nötig sind, bevorzugt exakte Pfade wie `https://leadpilot-dashboard-crm.netlify.app/auth/callback`).

### 2.5 Sitzungs- und Token-Management
* **JWT Expiry (Access Token):** `3600` Sekunden (1 Stunde).
* **Refresh Token Rotation:** `true` (Aktiv).
* **Refresh Token Reuse Interval:** Maximal `10` Sekunden (Erlaubt Toleranz bei parallelen Tab-Refreshes, verhindert Token-Hijacking).
* **Time-box Sessions:** Sitzungen sollten bei Inaktivität auslaufen.

### 2.6 Rate Limits & Schutz vor Brute-Force
* **Sign-in / Sign-up Requests:** Maximal 30 Anfragen pro 5 Minuten je IP-Adresse.
* **Token Verifications (OTP/Link):** Maximal 30 Anfragen pro 5 Minuten je IP-Adresse.
* **Token Refresh:** Maximal 150 Anfragen pro 5 Minuten je IP-Adresse.
* **E-Mail Sending Limit:** Begrenzt durch SMTP-Provider-Limits und Supabase-Rate-Limits zur Spam-Prävention.

---

## 3. Abgleichs-Checkliste für Marc (Supabase Dashboard)

Pfad im Supabase-Dashboard: **Project Settings → Authentication**

| Bereich | Einstellung | Soll-Wert (Produktion) | Status / Prüfung durch Marc |
|---|---|---|---|
| **General** | Enable Signups | **Deaktiviert (Off)** | [ ] Abgeglichen |
| **General** | Allow Anonymous Sign-ins | **Deaktiviert (Off)** | [ ] Abgeglichen |
| **Email Auth** | Enable Email provider | **Aktiviert (On)** | [ ] Abgeglichen |
| **Email Auth** | Confirm email | **Aktiviert (On)** | [ ] Abgeglichen |
| **Email Auth** | Secure password change | **Aktiviert (On)** | [ ] Abgeglichen |
| **Email Auth** | Secure email change (Double confirm) | **Aktiviert (On)** | [ ] Abgeglichen |
| **Password** | Minimum password length | **Mindestens 10** | [ ] Abgeglichen |
| **Password** | Password requirements | **Groß/Klein/Ziffer/Symbol** | [ ] Abgeglichen |
| **URL Configuration**| Site URL | `https://...` (Produktion) | [ ] Abgeglichen |
| **URL Configuration**| Redirect URLs | Keine `http://`, keine `localhost`, keine ungesicherten Wildcards | [ ] Abgeglichen |
| **Sessions** | JWT Expiry limit | `3600` Sekunden | [ ] Abgeglichen |
| **Sessions** | Refresh token rotation | **Aktiviert (On)** | [ ] Abgeglichen |
| **Sessions** | Reuse interval | `10` Sekunden | [ ] Abgeglichen |
| **Rate Limits** | Sign-ins / Email Rate Limits | Schutz aktiv (Standardwerte oder strenger) | [ ] Abgeglichen |

---

## 4. Offene Punkte & Handlungsempfehlungen für Marc

1. **Dashboard-Abgleich durchführen:** Bitte im gehosteten Supabase-Projekt prüfen, ob `Enable Signups` tatsächlich auf **Aus** steht. Wenn aktiviert, bitte sofort deaktivieren.
2. **Redirect Allowlist auditieren:** Prüfen, ob noch Test-URLs (`localhost`, temporäre Netlify-Vorschau-Wildcards) in der Redirect-Liste stehen, und auf die kanonische Produktions-Domain bereinigen.
3. **Passwort-Mindestanforderungen anheben:** Sicherstellen, dass Passwörter für neue Accounts (über Einladungsannahme) mindestens 10 Zeichen lang sein müssen und Komplexitätsanforderungen erfüllen.
4. **Bestandsnutzer prüfen:** Sicherstellen, dass außer den autorisierten Admins (`admin-a`, Marc, Devin-Smoke2) keine unautorisierten Konten in `auth.users` der Produktivinstanz vorhanden sind.
