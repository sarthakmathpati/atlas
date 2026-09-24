---
topic: cn.transport
name: "Transport layer"
subject: cn
order: 4
prereqs: [cn.network]
---

## cn.transport.ports-and-sockets
name: "Ports and sockets"
importance: must
scope: "identifying processes, well-known ports"

## cn.transport.tcp-vs-udp
name: "TCP vs UDP"
importance: must
prereqs: [cn.transport.ports-and-sockets]
scope: "reliability, ordering, overhead, use cases"

## cn.transport.tcp-three-way-handshake-and-four-way-teardown
name: "TCP three-way handshake and four-way teardown"
importance: must
prereqs: [cn.transport.tcp-vs-udp]
scope: "SYN, SYN-ACK, ACK, FIN"

## cn.transport.tcp-states
name: "TCP states"
importance: important
prereqs: [cn.transport.tcp-three-way-handshake-and-four-way-teardown]
scope: "TIME_WAIT and why it exists"

## cn.transport.tcp-reliability
name: "TCP reliability"
importance: must
prereqs: [cn.transport.tcp-three-way-handshake-and-four-way-teardown]
scope: "sequence numbers, acknowledgements, retransmission"

## cn.transport.tcp-flow-control
name: "TCP flow control"
importance: must
prereqs: [cn.transport.tcp-reliability]
scope: "receiver window, sliding window"

## cn.transport.tcp-congestion-control
name: "TCP congestion control"
importance: must
prereqs: [cn.transport.tcp-flow-control]
scope: "slow start, congestion avoidance, AIMD, fast retransmit"

## cn.transport.head-of-line-blocking
name: "Head-of-line blocking"
importance: important
prereqs: [cn.transport.tcp-reliability]
scope: "in TCP and HTTP"

## cn.transport.nagles-algorithm-and-delayed-acks
name: "Nagle's algorithm and delayed ACKs"
importance: advanced
prereqs: [cn.transport.tcp-flow-control]
scope: "Nagle's algorithm and delayed ACKs"

## cn.transport.quic
name: "QUIC"
importance: advanced
prereqs: [cn.transport.tcp-vs-udp]
scope: "transport over UDP for HTTP/3"
