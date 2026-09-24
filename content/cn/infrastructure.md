---
topic: cn.infrastructure
name: "Network infrastructure"
subject: cn
order: 7
prereqs: [cn.application]
---

## cn.infrastructure.proxy-vs-reverse-proxy
name: "Proxy vs reverse proxy"
importance: must
scope: "forward proxies, reverse proxies, gateways"

## cn.infrastructure.load-balancers
name: "Load balancers"
importance: must
prereqs: [cn.infrastructure.proxy-vs-reverse-proxy]
scope: "L4 vs L7, algorithms"

## cn.infrastructure.cdns
name: "CDNs"
importance: must
prereqs: [cn.infrastructure.proxy-vs-reverse-proxy]
scope: "caching content near users"

## cn.infrastructure.socket-programming-basics
name: "Socket programming basics"
importance: advanced
scope: "bind, listen, accept, connect"
