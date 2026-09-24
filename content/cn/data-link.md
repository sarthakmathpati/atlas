---
topic: cn.data-link
name: "Data link layer"
subject: cn
order: 2
prereqs: [cn.fundamentals]
---

## cn.data-link.framing-and-error-detection
name: "Framing and error detection"
importance: important
scope: "parity, checksums, CRC"

## cn.data-link.mac-addresses-and-ethernet
name: "MAC addresses and Ethernet"
importance: must
scope: "frames, broadcast"

## cn.data-link.hubs-switches-and-routers
name: "Hubs, switches and routers"
importance: must
prereqs: [cn.data-link.mac-addresses-and-ethernet]
scope: "which layer each works at and why"

## cn.data-link.arp
name: "ARP"
importance: must
prereqs: [cn.data-link.mac-addresses-and-ethernet]
scope: "mapping IP addresses to MAC addresses"

## cn.data-link.flow-control-protocols
name: "Flow control protocols"
importance: important
prereqs: [cn.data-link.framing-and-error-detection]
scope: "stop-and-wait, Go-Back-N, Selective Repeat"

## cn.data-link.csma-cd-and-csma-ca
name: "CSMA/CD and CSMA/CA"
importance: advanced
prereqs: [cn.data-link.mac-addresses-and-ethernet]
scope: "medium access control"

## cn.data-link.vlans
name: "VLANs"
importance: advanced
prereqs: [cn.data-link.hubs-switches-and-routers]
scope: "logical network separation"
