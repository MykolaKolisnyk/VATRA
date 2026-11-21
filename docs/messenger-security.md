# VATRA Messenger — security boundaries (beta)

## Architecture
- UI: messenger.html, assets/css/messenger.css, assets/js/messenger.js.
- Crypto: assets/js/messenger-crypto.js with browser Web Crypto and local encrypted key backups.
- Database: supabase/migrations/20261121113300_private_messenger_ciphertext_and_scoped_deletion.sql.
- The older direct_messages.body stored plaintext. Do not label it E2EE or automatically import plaintext as encrypted.
- Only ciphertext, public keys, sender/recipient IDs, timestamps and deletion markers are stored on Supabase. No passphrases, decrypted message bodies or private keys are sent there.
- Shared-post drafts cross pages only via short-lived same-tab sessionStorage, removed on first Messenger load; plaintext is never included in URLs, browser history, Referer or API query parameters.

## Key protection and portability
1. The first browser creates a P-256 ECDH identity. Private JWK is immediately encrypted with AES-256-GCM using a key derived from a passphrase (PBKDF2-SHA-256, 600000 iterations, random salt and nonce).
2. IndexedDB keeps only the encrypted private backup. After unlocking, a non-extractable CryptoKey is held in active tab memory.
3. Download and keep the encrypted JSON backup securely. It is required for other browsers and recovery from device loss; the passphrase alone does not recreate the key.
4. First-use peer keys are pinned by SHA-256 fingerprint. On change, sending stops until the user verifies and explicitly accepts the new fingerprint by another channel.
5. On signout the in-memory key is discarded. Do not place decrypted content or passphrases in localStorage.

## Realistic limits
- Each message uses P-256 ECDH, HKDF-SHA-256 and AES-256-GCM with fresh salt and nonce plus authenticated message identifiers and participant IDs.
- THIS IS NOT SIGNAL PROTOCOL, DOUBLE RATCHET, PQXDH, post-quantum encryption or independently audited cryptography. It lacks forward secrecy: a stolen long-term key may reveal recorded ciphertext.
- Compromised devices, browser extensions, the code-serving origin, a spoofed first-contact key, screenshots and exported data are outside its confidentiality promise.
- Routing metadata (participants and time) is visible to the service. Never advertise absolute security or claim no hacker can ever read messages.
- Before general release, arrange independent security review and real multi-device testing.

## Deletion
- Delete for me sets deleted_for_sender_at or deleted_for_recipient_at; RLS excludes the deleted row only for that member. The peer can still read it.
- Delete for everyone can be done only by the sender through the checked SQL function. The server clears ciphertext, salt, nonce and public-key snapshots. A tombstone triggers subscriber updates.
- Previously exported copies, backups, screenshots or content already stored on compromised devices cannot be remotely erased.
- Authenticated clients have SELECT and INSERT only. Untrusted direct UPDATE/DELETE is revoked.

## Calls — requirements, not a shipped capability
Implement audio/video calling using WebRTC DTLS-SRTP, authenticated RLS-protected signaling (invite/answer/ICE), STUN and an operational TURN relay with abuse control, permissions for microphone/camera, reconnect, privacy rules, ringing and call state across devices. Browser DTLS-SRTP protects transport but user/device identity verification must still be designed. Never show functional call buttons before real calling has been tested.

## Release gate
- Apply the additive migration to the correct Supabase project before shipping the frontend.
- Test two authenticated accounts, two browsers and an unauthenticated third party for RLS and key behavior.
- Test backup export/import, wrong passphrase, key-change warnings, separate deletion scopes, realtime delivery and no plaintext in API/network traces.
- Run current CI, bilingual and mobile UI tests. PR #240 was merged into main on 2026-11-21, but this does not establish cryptographic security or release readiness: keep Messenger explicitly labeled beta and do not claim Signal/Double Ratchet-grade protection until independent review and real multi-account testing are complete.
