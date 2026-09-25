---
topic: cn.security
name: "Network security"
subject: cn
order: 6
prereqs: [cn.application]
---

## cn.security.symmetric-vs-asymmetric-encryption
name: "Symmetric vs asymmetric encryption"
importance: must
scope: "keys, speed, where each is used"

### simple
Symmetric encryption uses one secret key to lock and unlock data, like a house key shared by everyone who lives there. Asymmetric encryption uses a pair of keys: a public one anyone can use to lock, and a private one only the owner can use to unlock, like a mailbox slot anyone can drop letters into but only the owner can open. Real systems use the pair to agree on a shared key, then switch to the fast symmetric kind.

### interview
- **Symmetric**: the same key encrypts and decrypts. Very fast (gigabytes per second with hardware AES). Examples: **AES** (128 or 256-bit keys), **ChaCha20**. Used with authenticated modes (**AES-GCM**, ChaCha20-Poly1305) that also detect tampering. Problem: how do both sides get the key safely?
- **Asymmetric** (public-key): a **key pair**. Encrypt with the public key, decrypt with the private key; or **sign** with the private key and verify with the public key. Hundreds to thousands of times slower. Examples: **RSA** (2048 or 3072-bit), elliptic-curve cryptography (**ECDH**, **ECDSA**, **Ed25519**; a 256-bit curve key is about as strong as 3072-bit RSA).
- **Hybrid encryption**: asymmetric crypto (key exchange and signatures) sets up a shared secret, then symmetric crypto protects the data. TLS, SSH, PGP and messaging apps all work this way.
- Where each is used: symmetric for disk encryption, database fields, VPN and TLS traffic; asymmetric for key exchange, certificates, code signing, SSH login keys.
- Key management is the hard part: n people need $n(n-1)/2$ symmetric keys to talk pairwise, but only n key pairs.
- Never invent your own cipher; use vetted libraries and modern defaults.

### deep
#### Intuition

Symmetric encryption is a strong box with one kind of key: fast and simple, but you must somehow hand a copy of the key to the other person without anyone copying it. Asymmetric encryption solves the handover: you publish an open padlock (the public key) that anyone can snap shut on a box, while only your private key opens it. Padlocks are slow and awkward for big loads, so in practice you use one to send a key for the fast box.

#### Comparison

| | symmetric | asymmetric |
|---|---|---|
| keys | one shared secret | public and private pair |
| speed | very fast | slow (big-number math) |
| key sizes | 128 or 256 bits | RSA 2048 to 4096 bits; ECC 256 bits |
| main job | bulk data | key exchange, signatures |
| key distribution | hard: needs a secure channel | easy: publish the public key |
| examples | AES-GCM, ChaCha20-Poly1305 | RSA, ECDH, ECDSA, Ed25519 |

#### Worked example: toy RSA

Real keys use primes hundreds of digits long; small ones show the mechanics.

1. Pick primes $p = 61$, $q = 53$. Then $n = pq = 3233$ and $\varphi(n) = 60 \times 52 = 3120$.
2. Public exponent $e = 17$ (coprime with 3120). Private exponent $d = 2753$, because $17 \times 2753 = 46801 = 15 \times 3120 + 1$.
3. Public key $(n, e) = (3233, 17)$; private key $d = 2753$.

```cpp
uint64_t powMod(uint64_t base, uint64_t exp, uint64_t mod) {
    uint64_t result = 1;
    base %= mod;
    for (; exp; exp >>= 1, base = base * base % mod)
        if (exp & 1) result = result * base % mod;
    return result;
}

int main() {
    const uint64_t n = 3233, e = 17, d = 2753;
    uint64_t message = 65;
    uint64_t cipher = powMod(message, e, n);         // anyone can encrypt with the public key
    cout << "encrypt 65 -> " << cipher << ", decrypt -> " << powMod(cipher, d, n) << "\n";

    uint64_t digest = 1234;                          // stands in for a hash of a document
    uint64_t signature = powMod(digest, d, n);       // only the private key can sign
    cout << "signature " << signature << ", verify -> " << powMod(signature, e, n) << "\n";
}
```

Output:

```text
encrypt 65 -> 2790, decrypt -> 65
signature 1512, verify -> 1234
```

The same key pair runs in both directions: public-then-private for secrecy, private-then-public for signatures. Security rests on factoring: from 3233 you can find 61 and 53 instantly, but not from a 2048-bit $n$. Textbook RSA like this is insecure in practice; real systems add padding (OAEP for encryption, PSS for signatures).

#### Hybrid in TLS

1. The client and server run an ephemeral elliptic-curve Diffie-Hellman exchange (asymmetric) and derive the same secret.
2. The server signs the handshake with its certificate's private key (asymmetric), proving who it is.
3. Both derive AES-GCM or ChaCha20 keys from the secret, and all application data uses them (symmetric).

This gives the best of both: no pre-shared secret, authentication, and fast bulk encryption.

#### Pitfalls

- Encrypting large data directly with RSA: slow, size-limited, and unsafe without padding.
- Reusing a nonce with AES-GCM or ChaCha20 with the same key: it breaks confidentiality and integrity.
- Encryption without integrity: an attacker can flip bits in some modes without knowing the key, which is why authenticated encryption is the default.
- Hard-coding keys in source code or shipping private keys to clients.

Connects to: hashing and digital signatures, HTTPS and TLS, certificates and certificate authorities, FTP and SSH.

### questions
Q: What is the difference between symmetric and asymmetric encryption?
A: Symmetric encryption uses one shared secret key for both encryption and decryption and is very fast, but the key must be shared securely. Asymmetric encryption uses a public key and a private key: data encrypted with the public key can only be decrypted with the private key, and signatures made with the private key are verified with the public key. It is much slower but solves key distribution.

Q: Why do protocols like TLS use both kinds?
A: Asymmetric cryptography lets two parties who have never met agree on a secret and authenticate each other, but it is too slow for bulk data. So TLS uses asymmetric key exchange and signatures in the handshake, then encrypts the actual traffic with a fast symmetric cipher using keys derived from the shared secret.

Q: What makes RSA secure?
A: The public modulus is the product of two large secret primes. Encrypting uses the public exponent, but computing the private exponent requires knowing the primes, and factoring a 2048-bit modulus is infeasible with known classical algorithms. Proper padding such as OAEP or PSS is also needed; textbook RSA is insecure.

Q: Why are elliptic-curve keys much shorter than RSA keys?
A: The best known attacks on elliptic-curve discrete logarithms are much slower than the best factoring algorithms, so far fewer bits give the same security. A 256-bit elliptic-curve key is roughly as strong as a 3072-bit RSA key, making keys, signatures and computation smaller and faster.

Q: How many keys does a group of n people need for private pairwise communication?
A: With symmetric keys, every pair needs its own secret, so n times n minus 1, divided by 2 keys. With asymmetric cryptography each person needs only one key pair, n in total, which is why public-key cryptography scales for key distribution.

## cn.security.hashing-and-digital-signatures
name: "Hashing and digital signatures"
importance: must
prereqs: [cn.security.symmetric-vs-asymmetric-encryption]
scope: "integrity and authenticity"

### simple
A cryptographic hash turns any data into a short fixed-size fingerprint, and changing even one letter of the data gives a completely different fingerprint. A digital signature is that fingerprint locked with someone's private key, so anyone with their public key can check who signed it and that nothing changed since. It is like a wax seal on a letter: it shows who sent it and that nobody opened it on the way.

### interview
- A **cryptographic hash** (SHA-256, SHA-3, BLAKE2) maps any input to a fixed-size digest. Properties: deterministic, fast, **preimage resistant** (cannot find an input for a digest), **second-preimage** and **collision resistant** (cannot find two inputs with the same digest), **avalanche effect**. MD5 and SHA-1 have practical collisions: do not use them for security.
- A hash alone gives **integrity** only against accidents: an attacker can change the data and recompute the hash.
- **HMAC** (hash with a shared secret key) gives integrity plus authenticity between parties who share the key (API request signing, JWT HS256).
- **Digital signature**: sign the hash with the **private key**; anyone verifies with the **public key**. Gives **integrity**, **authenticity** and **non-repudiation** (only the key owner could have signed). RSA-PSS, ECDSA, Ed25519.
- **Passwords**: never store plain hashes; use a unique **salt** and a deliberately **slow** hash (bcrypt, scrypt, Argon2, PBKDF2) so guessing is expensive.
- Uses: certificates, software updates and code signing, Git commits, TLS handshakes, blockchain, file integrity checks, deduplication.

### deep
#### Intuition

A hash is a one-way blender: easy to blend a document into a fingerprint, impossible to get the document back or to craft another document with the same fingerprint. Signing the small fingerprint instead of the whole document is fast, and verifying it proves the whole document is unchanged.

#### Code: SHA-256 and the avalanche effect

SHA-256 is just bit operations repeated many times: pad the message, then mix each 512-bit block into eight 32-bit state words over 64 rounds.

```cpp
string sha256(const string& msg) {
    auto rotr = [](uint32_t x, int n) { return x >> n | x << (32 - n); };
    uint32_t k[64], h[8];
    for (int p = 2, i = 0; i < 64; ++p) {            // constants: fractional bits of the square
        bool prime = true;                           // and cube roots of the first 64 primes
        for (int d = 2; d * d <= p; ++d) prime = prime && p % d != 0;
        if (!prime) continue;
        if (i < 8) h[i] = uint32_t(fmodl(sqrtl(p), 1) * 4294967296.0L);
        k[i++] = uint32_t(fmodl(cbrtl(p), 1) * 4294967296.0L);
    }
    string m = msg + char(0x80);                     // padding: a 1 bit, zeros, the bit length
    while (m.size() % 64 != 56) m += char(0);
    for (int i = 7; i >= 0; --i) m += char(uint64_t(msg.size()) * 8 >> (i * 8));
    for (size_t off = 0; off < m.size(); off += 64) {
        uint32_t w[64], a[8];
        for (int i = 0; i < 16; ++i) {               // the block as 16 big-endian words
            w[i] = 0;
            for (int j = 0; j < 4; ++j) w[i] = w[i] << 8 | uint8_t(m[off + 4 * i + j]);
        }
        for (int i = 16; i < 64; ++i) {              // stretched to 64 words
            uint32_t s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >> 3);
            uint32_t s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16] + s0 + w[i - 7] + s1;
        }
        copy(h, h + 8, a);
        for (int i = 0; i < 64; ++i) {               // 64 rounds of mixing
            uint32_t ch = (a[4] & a[5]) ^ (~a[4] & a[6]);
            uint32_t maj = (a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]);
            uint32_t sum1 = rotr(a[4], 6) ^ rotr(a[4], 11) ^ rotr(a[4], 25);
            uint32_t sum0 = rotr(a[0], 2) ^ rotr(a[0], 13) ^ rotr(a[0], 22);
            uint32_t t1 = a[7] + sum1 + ch + k[i] + w[i], t2 = sum0 + maj;
            copy_backward(a, a + 7, a + 8);          // shift the state: b = a, c = b, ...
            a[4] += t1;
            a[0] = t1 + t2;
        }
        for (int i = 0; i < 8; ++i) h[i] += a[i];
    }
    char out[65];
    for (int i = 0; i < 8; ++i) snprintf(out + 8 * i, 9, "%08x", h[i]);
    return out;
}

int main() {
    for (string s : {"abc", "abd"}) cout << s << "  " << sha256(s) << "\n";
}
```

Output:

```text
abc  ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
abd  a52d159f262b2c6ddb724a61840befc36eb30c88877a4030b65cbe86298449c9
```

The first digest is the official test value for "abc". Changing the last letter from c to d flips three input bits (0x63 is 01100011, 0x64 is 01100100), yet the two digests share no visible pattern: that is the avalanche effect.

#### Signing and verifying

```text
sender:   digest = SHA-256(document)          receiver: digest' = SHA-256(document received)
          signature = Sign(private key, digest)          ok = Verify(public key, signature, digest')
          send document + signature
```

If one byte of the document changed, `digest'` differs and verification fails. If an attacker replaces the signature, they cannot produce a valid one without the private key. And the receiver needs the sender's genuine public key, which is what certificates provide.

#### Which tool for which job

| need | tool | key |
|---|---|---|
| detect accidental corruption | checksum, CRC, plain hash | none |
| integrity between two parties who share a secret | HMAC-SHA256 | shared secret |
| integrity and proof of who signed, verifiable by anyone | digital signature | private key signs, public key verifies |
| store passwords | salted slow hash (Argon2, bcrypt) | none (salt per user) |

#### Pitfalls

- Hashing is not encryption: there is no key and nothing to decrypt.
- Plain or unsalted password hashes fall to precomputed tables and fast GPU guessing.
- Building a MAC as `hash(secret + message)` allows length-extension attacks with SHA-256; use HMAC.
- Comparing MACs or signatures with an early-exit comparison leaks timing; use constant-time comparison.

Connects to: symmetric vs asymmetric encryption, certificates and certificate authorities, OAuth and JWT basics, framing and error detection.

### questions
Q: What properties must a cryptographic hash function have?
A: It must be deterministic and fast, produce a fixed-size output, and be preimage resistant so no input can be found for a given digest, second-preimage resistant so no other input with the same digest as a given input can be found, and collision resistant so no two inputs with the same digest can be found. Small input changes must change the output unpredictably.

Q: How does a digital signature work?
A: The signer hashes the message and transforms the hash with their private key to produce the signature. A verifier hashes the received message and checks the signature against that hash using the signer's public key. A valid check proves the message is unchanged and was signed by the private key's holder.

Q: What is the difference between a hash, an HMAC and a digital signature?
A: A plain hash detects changes but anyone can recompute it, so it gives no authenticity. An HMAC mixes in a shared secret key, so only parties with the key can produce or check it. A digital signature uses a private key to sign and a public key to verify, so anyone can check it and only the key owner can create it, which also gives non-repudiation.

Q: How should passwords be stored?
A: Never in plain text and never with a plain fast hash. Store a salted hash from a deliberately slow, memory-hard function such as Argon2, scrypt or bcrypt, with a unique random salt per user, so identical passwords hash differently and each guess costs attackers real time.

Q: Why are MD5 and SHA-1 considered broken?
A: Researchers can produce collisions, two different inputs with the same digest, in practical time, and SHA-1 collisions have been demonstrated on real documents. An attacker could get one document signed and swap in another with the same hash, so both are unsafe for signatures and certificates.

## cn.security.certificates-and-certificate-authorities
name: "Certificates and certificate authorities"
importance: important
prereqs: [cn.security.hashing-and-digital-signatures]
scope: "chain of trust"

### simple
A certificate is a digital ID card that binds a website's name to its public key, signed by an organization browsers trust, called a certificate authority. Your browser comes with a short list of trusted authorities, like a passport office everyone recognizes. When a site shows its certificate, the browser checks that a trusted authority vouched for it, directly or through a chain of other authorities.

### interview
- An **X.509 certificate** contains the **subject** (names it is valid for, in the Subject Alternative Name field), the subject's **public key**, the **issuer**, a **validity period**, extensions (usage, whether it is a CA) and the issuer's **signature** over all of it.
- **Chain of trust**: the server's **leaf** certificate is signed by an **intermediate CA**, which is signed by a **root CA**. Roots are self-signed and preinstalled in the operating system or browser **trust store**. Servers send the leaf and intermediates.
- **Validation**: every signature in the chain checks out, the chain ends at a trusted root, the name matches, dates are valid, CA constraints hold, and nothing is revoked.
- **Domain validation** (such as ACME with Let's Encrypt): the CA checks you control the domain by asking you to publish a token over HTTP or in DNS. OV and EV also check the organization.
- **Revocation**: CRLs, OCSP, OCSP stapling; in practice short-lived certificates (90 days or less) and **Certificate Transparency** logs, which let domain owners spot certificates issued for their names by mistake.
- Roots are kept offline; intermediates do the daily signing, so a compromised intermediate can be revoked without replacing roots everywhere.

### deep
#### Code: verifying a chain

Toy RSA keys stand in for real ones: the root CA uses $(n, e, d) = (3233, 17, 2753)$ and the intermediate CA $(2773, 17, 157)$. Each certificate's "to be signed" text is hashed (a toy hash, reduced below the issuer's $n$) and signed with the issuer's private key.

```cpp
uint64_t powMod(uint64_t b, uint64_t e, uint64_t m) {
    uint64_t r = 1;
    for (b %= m; e; e >>= 1, b = b * b % m)
        if (e & 1) r = r * b % m;
    return r;
}

struct Key { uint64_t n, e, d; };
struct Cert { string subject, issuer, publicKey; uint64_t signature; };

uint64_t toyHash(const string& s, uint64_t n) {       // real certificates use SHA-256
    uint64_t h = 0;
    for (unsigned char c : s) h = (h * 31 + c) % n;
    return h;
}
string tbs(const Cert& c) { return c.subject + "|" + c.issuer + "|" + c.publicKey; }
Cert issue(Cert c, const Key& issuerKey) {
    c.signature = powMod(toyHash(tbs(c), issuerKey.n), issuerKey.d, issuerKey.n);
    return c;
}

int main() {
    Key root{3233, 17, 2753}, inter{2773, 17, 157};
    map<string, Key> keyOf = {{"Root CA", root}, {"Intermediate CA", inter}};
    Cert rootCert = issue({"Root CA", "Root CA", "3233/17", 0}, root);        // self-signed
    Cert interCert = issue({"Intermediate CA", "Root CA", "2773/17", 0}, root);
    Cert leaf = issue({"shop.example.com", "Intermediate CA", "leaf key", 0}, inter);
    Cert forged = issue({"shop.example.com", "Intermediate CA", "attacker key", 0},
                        Key{3127, 17, 2129});        // signed with the attacker's own key
    set<string> trusted = {"Root CA"};

    auto verify = [&](vector<Cert> chain) {          // leaf first, root last
        for (size_t i = 0; i < chain.size(); ++i) {
            const Cert& c = chain[i];
            const Key& k = keyOf.at(c.issuer);       // the issuer's public key
            if (powMod(c.signature, k.e, k.n) != toyHash(tbs(c), k.n))
                return "bad signature on " + c.subject;
            if (i + 1 < chain.size() && chain[i + 1].subject != c.issuer)
                return string("chain is broken");
        }
        return trusted.count(chain.back().subject) ? string("trusted") : "unknown root";
    };
    cout << "real leaf:   " << verify({leaf, interCert, rootCert}) << "\n";
    cout << "forged leaf: " << verify({forged, interCert, rootCert}) << "\n";
    trusted.clear();                                  // a device that does not trust this root
    cout << "no trust:    " << verify({leaf, interCert, rootCert}) << "\n";
}
```

Output:

```text
real leaf:   trusted
forged leaf: bad signature on shop.example.com
no trust:    unknown root
```

The forged certificate claims the right name and the right issuer, but its signature was not made with the intermediate's private key, so checking it with the intermediate's public key fails. The attacker's toy key $(3127, 17, 2129)$ is a valid pair ($3127 = 53 \times 59$); it just is not the issuer's. Trust flows only from the roots on the device.

#### Getting a certificate

1. Generate a key pair on your server; the private key never leaves it.
2. Send the CA a certificate signing request with your public key and domain names.
3. Prove control of the domain (serve a token from the site or add a DNS TXT record).
4. The CA signs and returns the certificate; your server presents it with the intermediate.

Automated renewal (ACME) makes 90-day certificates painless, and short lifetimes limit the damage of a leaked key more reliably than revocation checks do.

Connects to: hashing and digital signatures, HTTPS and TLS, symmetric vs asymmetric encryption, common attacks.

### questions
Q: What does a TLS certificate contain?
A: The names it is valid for, the subject's public key, the issuing authority, the validity period, extensions such as allowed key usages and whether it may act as a CA, and the issuer's digital signature over all of these fields.

Q: What is a chain of trust?
A: The server's certificate is signed by an intermediate CA, whose certificate is signed by a root CA. Clients verify each signature with the next certificate's public key until they reach a root that is already in their trust store. Trusting the root lets them trust everything it vouches for, directly or through intermediates.

Q: Why do CAs use intermediate certificates instead of signing with the root directly?
A: Root keys are extremely valuable and hard to replace, since they are built into operating systems and browsers. Keeping them offline and signing daily certificates with intermediates limits exposure; if an intermediate is compromised it can be revoked and replaced without changing trust stores everywhere.

Q: How are compromised certificates revoked, and what are the weaknesses?
A: CAs publish revocation lists and answer OCSP queries, and servers can staple a fresh OCSP response to the handshake. Clients often skip or soft-fail these checks when they are unreachable, so the industry relies increasingly on short-lived certificates and Certificate Transparency logs.

## cn.security.common-attacks
name: "Common attacks"
importance: must
scope: "man-in-the-middle, DDoS, XSS, CSRF, SQL injection"

### simple
Most attacks on networked apps fall into a few families: listening in or tampering on the way, flooding a service until it falls over, or tricking an app into running the attacker's input as code or as a trusted request. They are like someone steaming open letters, a crowd blocking a shop's door, or a forged note slipped into a stack of real orders. Each has well-known defenses, and most come down to encrypting traffic and never trusting input.

### interview
- **Man-in-the-middle (MITM)**: the attacker relays and can read or change traffic (ARP spoofing, rogue Wi-Fi, DNS spoofing, BGP hijacks). Defense: TLS everywhere with proper certificate validation, **HSTS**, never clicking through certificate warnings.
- **DDoS**: many machines flood a target. Volumetric (bandwidth, often reflected and amplified through DNS or NTP), protocol (SYN floods), application layer (expensive requests). Defense: CDNs and anycast scrubbing, rate limiting, SYN cookies, caching, autoscaling, blocking at the edge.
- **XSS** (cross-site scripting): attacker-controlled script runs in other users' browsers on your site (stored, reflected or DOM-based), stealing sessions or acting as the user. Defense: **escape output** for its context, Content Security Policy, HttpOnly cookies, safe templating.
- **CSRF** (cross-site request forgery): another site makes the victim's browser send a state-changing request with their cookies. Defense: **SameSite** cookies, anti-CSRF tokens, checking Origin, no state changes on GET.
- **SQL injection**: input is concatenated into a query and changes its meaning. Defense: **parameterized queries** (prepared statements), least-privilege database accounts, input validation as a second layer.
- Common thread: treat all input as data, never as code, and encrypt and authenticate everything on the wire.

### deep
#### Man in the middle

The attacker gets on the path, for example with forged ARP replies on café Wi-Fi, and relays traffic between victim and server. Over plain HTTP they can read passwords and inject scripts. TLS defeats this: the attacker cannot present a valid certificate for the real domain, so the browser shows an error. The remaining gap is the very first plain HTTP request before a redirect to HTTPS, which **HSTS** closes by telling browsers to always use HTTPS for the domain.

#### DDoS

| kind | example | defense |
|---|---|---|
| volumetric | reflected DNS amplification: small spoofed queries, large answers aimed at the victim | absorb at a CDN or scrubbing network with huge capacity; anycast spreads load |
| protocol | SYN flood fills half-open connection tables | SYN cookies, connection limits at the edge |
| application | thousands of expensive search requests | rate limiting per client, caching, CAPTCHAs, autoscaling |

A single server cannot out-muscle a botnet; defense happens upstream, before traffic reaches it.

#### Injection: the same bug twice

```cpp
string htmlEscape(const string& s) {                 // for text placed inside HTML
    string out;
    for (char c : s) {
        switch (c) {
            case '<': out += "&lt;"; break;
            case '>': out += "&gt;"; break;
            case '&': out += "&amp;"; break;
            case '"': out += "&quot;"; break;
            case '\'': out += "&#39;"; break;
            default: out += c;
        }
    }
    return out;
}

int main() {
    string name = "x' OR '1'='1";                   // typed into a login form
    cout << "concatenated: SELECT * FROM users WHERE name = '" << name << "'\n";
    cout << "parameterized: SELECT * FROM users WHERE name = ?   [? = " << name << "]\n";

    string comment = "<script>fetch('/steal?c=' + document.cookie)</script>";
    cout << "escaped: " << htmlEscape(comment) << "\n";
}
```

Output:

```text
concatenated: SELECT * FROM users WHERE name = 'x' OR '1'='1'
parameterized: SELECT * FROM users WHERE name = ?   [? = x' OR '1'='1]
escaped: &lt;script&gt;fetch(&#39;/steal?c=&#39; + document.cookie)&lt;/script&gt;
```

In the concatenated query the quote ends the string and `OR '1'='1'` becomes SQL that is always true: the query returns every user. In the parameterized version the database receives the query shape and the value separately, so the value can never become SQL. The escaped comment displays as harmless text instead of running as a script that sends the visitor's cookies away. Both bugs have one root: data was mixed into code.

#### CSRF

A user is logged in to their bank. An attacker's page contains a hidden form that posts to the bank's transfer endpoint and submits itself. The browser attaches the bank's cookies, and the bank sees a genuine-looking request. Defenses: cookies with `SameSite=Lax` or `Strict` are not sent on such cross-site posts; a random anti-CSRF token embedded in the bank's own forms must accompany every state-changing request; the server can also check the `Origin` header. CORS does not stop CSRF: simple cross-origin requests, such as a form post, are still sent with cookies; CORS only decides whether the attacker's page may read the response.

#### Pitfalls

- Relying on input blacklists ("remove the word script"): attackers find encodings that slip through; escape on output and parameterize instead.
- Escaping for the wrong context: HTML text, attributes, URLs and JavaScript strings each need their own encoding.
- Assuming HTTPS stops XSS or SQL injection: it protects the wire, not the application.

Connects to: HTTPS and TLS, cookies and sessions, CORS, ARP, TCP three-way handshake and four-way teardown, firewalls, VPNs and proxies.

### questions
Q: How does SQL injection work and how do you prevent it?
A: When user input is concatenated into a SQL string, special characters such as quotes can end the intended value and add SQL of the attacker's choosing, for example making a condition always true or appending a DROP statement. Prevent it with parameterized queries, where the query and the values are sent separately, plus least-privilege database accounts and input validation.

Q: What is the difference between XSS and CSRF?
A: XSS injects the attacker's script into a trusted site so it runs in victims' browsers with that site's privileges, and it is prevented by escaping output and content security policy. CSRF makes the victim's browser send an authenticated request to a site from somewhere else, without running code on that site, and it is prevented with SameSite cookies and anti-CSRF tokens.

Q: How does HTTPS prevent man-in-the-middle attacks, and what gap does HSTS close?
A: TLS authenticates the server with a certificate for its domain, so an attacker in the middle cannot complete the handshake without triggering a certificate error, and the traffic is encrypted and integrity protected. HSTS makes the browser use HTTPS for the domain from the start, closing the window where a first plain HTTP request could be intercepted and downgraded.

Q: How do you defend a service against DDoS attacks?
A: Absorb and filter traffic before it reaches the servers using a CDN or scrubbing service with anycast, use SYN cookies and connection limits against protocol floods, and use rate limiting, caching and autoscaling against application-layer floods. Keeping origin servers hidden behind the edge network also helps.

Q: What is a reflection amplification attack?
A: The attacker sends small requests to open servers, such as DNS resolvers, with the victim's address spoofed as the source. The servers send much larger responses to the victim, multiplying the attacker's bandwidth. Blocking spoofed traffic at networks and closing open resolvers reduce it.

## cn.security.firewalls-vpns-and-proxies
name: "Firewalls, VPNs and proxies"
importance: important
scope: "Firewalls, VPNs and proxies"

### simple
A firewall is a gatekeeper that lets some network traffic through and blocks the rest based on rules. A VPN builds an encrypted tunnel so your traffic travels privately to another network, as if you were plugged in there. A proxy is a middleman that makes requests on your behalf, like an assistant who places calls for you.

### interview
- **Packet filter** (stateless): allow or deny by IP addresses, ports and protocol, one packet at a time. Fast, but must explicitly allow reply traffic.
- **Stateful firewall**: tracks connections, so replies to connections started from inside are allowed automatically and unsolicited inbound traffic is blocked. The default for hosts, routers and cloud security groups.
- **Application-layer firewall** or **WAF**: inspects HTTP (paths, headers, bodies) to block things like SQL injection patterns. Rules default to **deny**, opening only what is needed.
- **VPN**: an encrypted tunnel (IPsec, WireGuard, OpenVPN over TLS). **Remote access** VPNs connect a laptop to a company network; **site-to-site** VPNs join office networks over the internet. Hides traffic from the local network and ISP, not from the VPN provider or the destination.
- **Forward proxy**: sits in front of clients (company egress filtering, caching, anonymity); the server sees the proxy's address. A **reverse proxy** sits in front of servers.
- Modern practice adds **zero trust**: authenticate and authorize every request instead of trusting anything inside the network perimeter.

### deep
#### Code: a stateful firewall

```cpp
using Flow = tuple<string, int, string, int>;       // source IP, port, destination IP, port

struct Firewall {
    set<int> openPorts;                             // services we offer to the outside
    set<Flow> connections{};                        // flows started from inside

    void outbound(const Flow& f) { connections.insert(f); }
    bool inbound(const Flow& f) {
        auto [src, sport, dst, dport] = f;
        if (connections.count({dst, dport, src, sport})) return true;   // a reply
        return openPorts.count(dport) > 0;                              // a public service
    }
};

int main() {
    Firewall fw{{443}};
    fw.outbound({"10.0.0.5", 51000, "203.0.113.9", 443});   // a laptop browses the web
    vector<pair<string, Flow>> tests = {
        {"reply from the web server", {"203.0.113.9", 443, "10.0.0.5", 51000}},
        {"unsolicited SSH attempt  ", {"198.51.100.66", 4444, "10.0.0.5", 22}},
        {"visitor to our website   ", {"198.51.100.66", 50123, "10.0.0.80", 443}},
        {"fake reply, wrong port   ", {"203.0.113.9", 443, "10.0.0.5", 51001}},
    };
    for (auto& [what, flow] : tests)
        cout << what << " -> " << (fw.inbound(flow) ? "allow" : "block") << "\n";
}
```

Output:

```text
reply from the web server -> allow
unsolicited SSH attempt   -> block
visitor to our website    -> allow
fake reply, wrong port    -> block
```

The only rule opens port 443; everything else inbound must match a connection that started inside. A stateless filter would need a broad rule such as "allow all inbound from port 443", which the fake reply would pass.

#### VPN: what it does and does not hide

| observer | without a VPN sees | with a VPN sees |
|---|---|---|
| café Wi-Fi, your ISP | every destination IP, DNS queries (unless encrypted), traffic sizes | only encrypted traffic to the VPN server |
| the VPN provider | nothing | the same as your ISP did before |
| the website | your IP address | the VPN server's IP address |

HTTPS already hides the content of web traffic; a VPN additionally hides which sites you contact from the local network, or reaches private company networks.

#### Forward vs reverse proxy

A forward proxy acts for clients: a company routes all outbound web traffic through it to filter malware and log access. A reverse proxy acts for servers: clients talk to it thinking it is the site, and it spreads requests over backends, terminates TLS and caches (see proxy vs reverse proxy).

Connects to: NAT, proxy vs reverse proxy, common attacks, VLANs, HTTPS and TLS.

### questions
Q: What is the difference between a stateless and a stateful firewall?
A: A stateless packet filter judges each packet alone by its addresses, ports and protocol, so reply traffic needs its own broad rules. A stateful firewall tracks connections, automatically allows replies belonging to connections started from inside, and blocks unsolicited inbound packets that match no connection or open rule.

Q: What does a VPN protect, and what does it not?
A: It encrypts traffic between your device and the VPN server, hiding content and destinations from the local network and your ISP, and gives access to private networks. It does not hide your activity from the VPN provider or from the sites you visit when you log in, and it does not protect against malware or phishing.

Q: What is a web application firewall?
A: A firewall that understands HTTP and inspects requests for attack patterns such as SQL injection, cross-site scripting or abusive request rates, usually placed in front of web applications or at a CDN. It adds protection but does not replace fixing vulnerabilities in the application.

Q: What is the difference between a forward proxy and a VPN?
A: A forward proxy relays specific application traffic, usually HTTP, on behalf of clients and may filter or cache it, often without encryption between client and proxy. A VPN tunnels all IP traffic from the device through an encrypted connection, making the device behave as if it were on the remote network.

## cn.security.cors
name: "CORS"
importance: important
scope: "same-origin policy and how browsers relax it"

### simple
Browsers stop a web page from reading data from another website unless that site allows it; this rule is the same-origin policy. CORS is how a server says "pages from this other site may read my responses". It is like a receptionist who only hands documents to visitors on the approved list, so a page from a random site cannot quietly read your bank account data using your login.

### interview
- **Origin** = scheme + host + port. Page and resource share an origin only if all three match (`app.example.com` vs `api.example.com` differ; http vs https differ; port 443 vs 8443 differ).
- **Same-origin policy**: scripts may **send** many cross-origin requests but may **not read** the responses, unless the server allows it. It protects users' data on other sites from malicious pages running with the users' cookies.
- **CORS**: the server replies with `Access-Control-Allow-Origin` (a specific origin or `*`), plus `Access-Control-Allow-Credentials: true` to allow cookies (which forbids `*`).
- **Simple requests** (GET, HEAD, POST with form or plain text body, no custom headers) are sent directly. Others (PUT, DELETE, JSON bodies, custom headers like `Authorization`) first send a **preflight** `OPTIONS` with `Access-Control-Request-Method` and `-Headers`; the server answers with the allowed methods, headers and a `Max-Age` for caching.
- CORS is enforced **by browsers** for users' protection; curl and servers ignore it, so it is not an access control mechanism for your API. It also does not stop CSRF.
- Common errors: allowing `*` with credentials, reflecting any Origin back blindly, and forgetting to answer preflights.

### deep
#### Code: same origin and preflight decisions

```cpp
struct Origin {
    string scheme, host;
    int port;
    bool operator==(const Origin&) const = default;
};

Origin originOf(const string& url) {                 // scheme://host[:port]/...
    size_t s = url.find("://"), start = s + 3, end = url.find('/', start);
    string authority = url.substr(start, end - start);
    string scheme = url.substr(0, s);
    size_t colon = authority.find(':');
    int port = colon != string::npos ? stoi(authority.substr(colon + 1))
                                     : scheme == "https" ? 443 : 80;
    return {scheme, authority.substr(0, colon), port};
}

string check(const string& page, const string& method, const string& url, bool json) {
    if (originOf(page) == originOf(url)) return "same origin: no CORS needed";
    bool simple = (method == "GET" || method == "HEAD" || method == "POST") && !json;
    return simple ? "cross-origin, simple: sent, readable only if the server allows"
                  : "cross-origin: OPTIONS preflight first";
}

int main() {
    string page = "https://app.example.com/dashboard";
    cout << check(page, "GET", "https://app.example.com/api/me", false) << "\n";
    cout << check(page, "GET", "https://api.example.com/items", false) << "\n";
    cout << check(page, "PUT", "https://api.example.com/items/7", true) << "\n";
    cout << check(page, "POST", "https://api.example.com/items", true) << "\n";
    cout << check(page, "GET", "http://app.example.com/api/me", false) << "\n";
    cout << check(page, "GET", "https://app.example.com:8443/api/me", false) << "\n";
}
```

Output:

```text
same origin: no CORS needed
cross-origin, simple: sent, readable only if the server allows
cross-origin: OPTIONS preflight first
cross-origin: OPTIONS preflight first
cross-origin, simple: sent, readable only if the server allows
cross-origin, simple: sent, readable only if the server allows
```

A different subdomain, scheme or port each makes a request cross-origin. A JSON `POST` is not "simple" (its content type is not one of the form types), so it needs a preflight.

#### A preflight exchange

```text
OPTIONS /items/7 HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type, authorization

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, PUT, DELETE
Access-Control-Allow-Headers: content-type, authorization
Access-Control-Max-Age: 600
```

Only after this answer does the browser send the real `PUT`, and the real response must again carry `Access-Control-Allow-Origin`. `Max-Age` lets the browser skip the preflight for 10 minutes.

#### Why the rule exists

Without it, any page you visit could run a script that fetches your email or bank pages from other sites, with your cookies attached, and read the results. The same-origin policy blocks the reading; CORS lets a server open exactly the doors it chooses, such as its own front end on another subdomain.

Connects to: HTTP basics, cookies and sessions, common attacks, OAuth and JWT basics.

### questions
Q: What is the same-origin policy?
A: A browser rule that lets scripts read responses only from the same origin as the page, where the origin is the scheme, host and port together. Cross-origin requests can often still be sent, but their responses are hidden from the script unless the other server allows access with CORS.

Q: What is a CORS preflight request and when is it sent?
A: An OPTIONS request the browser sends before a cross-origin request that is not simple, such as a PUT or DELETE, a JSON body, or custom headers like Authorization. It asks the server whether that method and those headers are allowed from this origin; the browser sends the real request only if the answer permits it.

Q: Does CORS protect your API from unauthorized clients?
A: No. CORS is enforced by browsers to protect users; tools like curl and other servers ignore it entirely. APIs still need authentication and authorization on every request, and CORS only decides which web origins' scripts may read the responses in a browser.

Q: Why can't you use a wildcard origin with credentials?
A: Allowing any origin to make credentialed requests would let every website read the user's private data using their cookies, defeating the same-origin policy. Browsers therefore reject Access-Control-Allow-Origin set to a wildcard when credentials are included, and the server must name the specific allowed origin.

## cn.security.oauth-and-jwt-basics
name: "OAuth and JWT basics"
importance: important
prereqs: [cn.security.hashing-and-digital-signatures]
scope: "delegated authorization, tokens"

### simple
OAuth lets you give an app limited access to your account on another service without handing over your password, like giving a valet a car key that only starts the engine but cannot open the trunk. The service gives the app a token that says what it may do and for how long. A JWT is a common format for such tokens: a small signed note listing who you are and what you may do, which servers can check without looking anything up.

### interview
- **OAuth 2.0** is **delegated authorization**. Roles: resource owner (the user), client (the app), **authorization server** (issues tokens), resource server (the API).
- **Authorization code flow with PKCE** (the standard for web and mobile apps): redirect the user to the authorization server → the user logs in and consents to **scopes** → the server redirects back with a short-lived **code** → the client exchanges the code (plus its PKCE verifier) for an **access token** and often a **refresh token**.
- **Access tokens** are short-lived (minutes); **refresh tokens** get new ones without asking the user again. APIs check the token and its scopes on every call.
- **OpenID Connect** adds authentication on top: an **ID token** (a JWT) says who the user is ("Sign in with ..."). OAuth alone is about access, not identity.
- **JWT**: `header.payload.signature`, each part base64url-encoded. Claims such as `iss`, `sub`, `aud`, `exp`, `scope`. **Signed, not encrypted**: anyone can read the payload. HS256 uses a shared secret (HMAC); RS256 or ES256 use a private key to sign and a public key to verify.
- Verify properly: signature with the **expected algorithm** (reject `none`), `exp`, `aud`, `iss`. JWTs are hard to revoke, so keep them short-lived.

### deep
#### The authorization code flow

```text
1. app -> browser: redirect to the authorization server's /authorize with
   client_id, redirect_uri, scope=orders:read, state, code_challenge (PKCE)
2. user logs in at the authorization server and approves "read your orders"
3. authorization server -> browser: redirect to redirect_uri with ?code=...&state=...
4. app backend -> authorization server /token: code + code_verifier (+ client secret)
5. authorization server -> app: access_token (JWT, 15 min), refresh_token
6. app -> API: Authorization: Bearer <access_token>
```

The password is typed only at the authorization server. The code travels through the browser but is useless without the PKCE verifier that only the app knows, and the `state` value protects the redirect against CSRF.

#### Code: reading a JWT

```cpp
string base64UrlDecode(const string& s) {
    static const string alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    string out;
    int value = 0, bits = 0;
    for (char c : s) {
        size_t i = alphabet.find(c);
        if (i == string::npos) break;
        value = ((value << 6) | int(i)) & 0x3fff;   // keep only the bits not yet output
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out += char(value >> bits & 0xff);
        }
    }
    return out;
}

int main() {
    string token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
                   "eyJzdWIiOiI0MiIsIm5hbWUiOiJBc2hhIiwic2NvcGUiOiJvcmRlcnM6cmVh"
                   "ZCIsImV4cCI6MTc2NzIyNTYwMH0."
                   "yMJgpCRKuCpXAsiSYaCZ6X_gANoOrrO_z3_uJZ44ID0";
    size_t a = token.find('.'), b = token.find('.', a + 1);
    cout << "header:    " << base64UrlDecode(token.substr(0, a)) << "\n";
    cout << "payload:   " << base64UrlDecode(token.substr(a + 1, b - a - 1)) << "\n";
    cout << "signature: " << base64UrlDecode(token.substr(b + 1)).size() << " bytes\n";
}
```

Output:

```text
header:    {"alg":"HS256","typ":"JWT"}
payload:   {"sub":"42","name":"Asha","scope":"orders:read","exp":1767225600}
signature: 32 bytes
```

No key was needed to read the claims: a JWT is encoded, not encrypted, so never put secrets in it. The 32-byte signature is HMAC-SHA256 over the first two parts with the server's secret; changing any claim (say, the scope) without the secret produces a token whose signature no longer matches. `exp` is a Unix time, 1 January 2026 00:00 UTC here; a verifier rejects the token after that moment.

#### Sessions vs JWT access tokens

JWTs let many services verify a request locally, which suits microservices and third-party APIs. The price is revocation: a stolen token works until it expires. Hence short access-token lifetimes, refresh tokens stored and revocable on the server, and a deny list for emergencies.

Connects to: cookies and sessions, hashing and digital signatures, CORS, REST principles, authentication and authorization in systems.

### questions
Q: What problem does OAuth 2.0 solve?
A: It lets a user grant an application limited access to their data on another service without sharing their password. The authorization server issues the application a token with specific scopes and a lifetime, and the user can revoke the grant without changing their password.

Q: Describe the authorization code flow with PKCE.
A: The app redirects the user to the authorization server with its client id, requested scopes, a state value and a code challenge. After the user logs in and consents, the server redirects back with a one-time code. The app exchanges the code together with the code verifier for an access token and usually a refresh token, then calls the API with the access token.

Q: What is a JWT and is its content secret?
A: A JSON Web Token has three base64url-encoded parts: a header naming the algorithm, a payload of claims such as the subject, audience and expiry, and a signature over the first two. It is signed, not encrypted, so anyone holding it can read the claims; the signature only prevents undetected changes.

Q: What should a server check when it receives a JWT?
A: The signature, using the algorithm and key it expects rather than whatever the header claims, and never accepting none. It should also check the expiry and not-before times, the issuer, the audience, and the scopes or roles needed for the requested action.

Q: What is the difference between OAuth and OpenID Connect?
A: OAuth 2.0 is about authorization: giving an app an access token to call an API on the user's behalf. OpenID Connect builds on OAuth to provide authentication: it adds an ID token, a JWT describing who the user is and how they logged in, which is what sign-in with another account uses.
