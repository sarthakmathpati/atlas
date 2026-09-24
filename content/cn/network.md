---
topic: cn.network
name: "Network layer"
subject: cn
order: 3
prereqs: [cn.data-link]
---

## cn.network.ipv4-addressing
name: "IPv4 addressing"
importance: must
scope: "address classes (history), public vs private addresses"

## cn.network.subnetting-and-cidr
name: "Subnetting and CIDR"
importance: must
prereqs: [cn.network.ipv4-addressing]
scope: "subnet masks, calculating network, broadcast and host ranges"

## cn.network.nat
name: "NAT"
importance: must
prereqs: [cn.network.subnetting-and-cidr]
scope: "sharing one public IP, port translation"

## cn.network.ipv6
name: "IPv6"
importance: important
prereqs: [cn.network.ipv4-addressing]
scope: "why it exists, address format"

## cn.network.icmp
name: "ICMP"
importance: must
scope: "ping and traceroute"

## cn.network.dhcp
name: "DHCP"
importance: must
prereqs: [cn.network.ipv4-addressing]
scope: "how a device gets an IP address"

## cn.network.routing-basics
name: "Routing basics"
importance: important
prereqs: [cn.network.subnetting-and-cidr]
scope: "routing tables, static vs dynamic routing"

## cn.network.distance-vector-vs-link-state
name: "Distance vector vs link state"
importance: important
prereqs: [cn.network.routing-basics]
scope: "RIP vs OSPF"

## cn.network.bgp-overview
name: "BGP overview"
importance: advanced
prereqs: [cn.network.distance-vector-vs-link-state]
scope: "routing between networks on the internet"

## cn.network.ip-fragmentation-and-mtu
name: "IP fragmentation and MTU"
importance: advanced
scope: "IP fragmentation and MTU"
