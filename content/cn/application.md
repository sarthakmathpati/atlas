---
topic: cn.application
name: "Application layer"
subject: cn
order: 5
prereqs: [cn.transport]
---

## cn.application.dns
name: "DNS"
importance: must
scope: "resolution steps, recursive vs iterative, record types, caching and TTL"

## cn.application.http-basics
name: "HTTP basics"
importance: must
scope: "methods, status codes, headers, statelessness"

## cn.application.cookies-and-sessions
name: "Cookies and sessions"
importance: must
prereqs: [cn.application.http-basics]
scope: "keeping state over stateless HTTP"

## cn.application.http-1-1-vs-http-2-vs-http-3
name: "HTTP/1.1 vs HTTP/2 vs HTTP/3"
importance: must
prereqs: [cn.application.http-basics]
scope: "keep-alive, multiplexing, QUIC"

## cn.application.https-and-tls
name: "HTTPS and TLS"
importance: must
prereqs: [cn.application.http-basics]
scope: "TLS handshake, certificates, encryption in transit"

## cn.application.rest-principles
name: "REST principles"
importance: must
prereqs: [cn.application.http-basics]
scope: "resources, verbs, idempotency, statelessness"

## cn.application.websockets
name: "WebSockets"
importance: important
scope: "full-duplex connections"

## cn.application.email-protocols
name: "Email protocols"
importance: important
scope: "SMTP, POP3, IMAP"

## cn.application.ftp-and-ssh
name: "FTP and SSH"
importance: important
scope: "file transfer and secure shell"

## cn.application.what-happens-when-you-type-a-url
name: "What happens when you type a URL"
importance: must
prereqs: [cn.transport.tcp-three-way-handshake-and-four-way-teardown, cn.application.dns, cn.application.http-basics, cn.application.https-and-tls]
scope: "DNS, TCP, TLS, HTTP, rendering, end to end"
