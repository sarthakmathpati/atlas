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

## cn.security.hashing-and-digital-signatures
name: "Hashing and digital signatures"
importance: must
prereqs: [cn.security.symmetric-vs-asymmetric-encryption]
scope: "integrity and authenticity"

## cn.security.certificates-and-certificate-authorities
name: "Certificates and certificate authorities"
importance: important
prereqs: [cn.security.hashing-and-digital-signatures]
scope: "chain of trust"

## cn.security.common-attacks
name: "Common attacks"
importance: must
scope: "man-in-the-middle, DDoS, XSS, CSRF, SQL injection"

## cn.security.firewalls-vpns-and-proxies
name: "Firewalls, VPNs and proxies"
importance: important
scope: "Firewalls, VPNs and proxies"

## cn.security.cors
name: "CORS"
importance: important
scope: "same-origin policy and how browsers relax it"

## cn.security.oauth-and-jwt-basics
name: "OAuth and JWT basics"
importance: important
prereqs: [cn.security.hashing-and-digital-signatures]
scope: "delegated authorization, tokens"
