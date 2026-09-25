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

### simple
An IPv4 address is a 32-bit number, written as four numbers from 0 to 255 like 192.168.1.23, that tells the internet where a device is. It works like a postal address: the first part names the network, the way a city and street do, and the rest names the device on it, like a house number. Some ranges are private, like extension numbers inside an office, and only work within one local network.

### interview
- **32 bits**, dotted decimal, about 4.3 billion addresses. Each address has a **network part** and a **host part**; the prefix length or mask says where the split is.
- **Classes** (historical, replaced by CIDR in 1993): A `0.0.0.0`–`127.255.255.255` (/8 networks), B `128`–`191` (/16), C `192`–`223` (/24), D `224`–`239` multicast, E `240`–`255` reserved. Classes wasted space: a company needing 300 addresses got a class B of 65,536.
- **Private ranges** (RFC 1918), not routed on the internet and reusable everywhere behind NAT: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- Special: `127.0.0.0/8` loopback, `169.254.0.0/16` link-local (self-assigned when DHCP fails), `100.64.0.0/10` carrier-grade NAT, `0.0.0.0` "this host" or "any", `255.255.255.255` limited broadcast.
- **Public** addresses are globally unique and allocated through regional registries to ISPs and organizations. IPv4 space ran out around 2011 to 2019, which is why NAT is everywhere and IPv6 exists.
- In each subnet the first address (host bits all 0) is the **network address** and the last (all 1) the **broadcast address**; neither is given to a host.

### deep
#### Intuition

Routers cannot keep a route for each of billions of devices. So addresses are hierarchical: all hosts in one network share a prefix, and the internet only needs a route per prefix. The address `192.168.1.23/24` means "the first 24 bits (192.168.1) name the network, the last 8 bits (23) name the host".

#### Classes: why they existed and why they died

In the original design, the first bits of the address fixed the split:

| class | first bits | first byte | network / host bits | networks | hosts each |
|---|---|---|---|---|---|
| A | 0 | 0–127 | 8 / 24 | 128 | 16,777,214 |
| B | 10 | 128–191 | 16 / 16 | 16,384 | 65,534 |
| C | 110 | 192–223 | 24 / 8 | 2,097,152 | 254 |
| D | 1110 | 224–239 | multicast groups | | |
| E | 1111 | 240–255 | reserved | | |

Only three sizes were possible, so organizations took the next size up and wasted most of it, and routing tables grew with every class C network. **CIDR** (classless inter-domain routing) replaced classes with any prefix length, such as /22. Interviewers still ask about classes as history.

#### Code: what kind of address is this?

```cpp
string classify(const string& text) {
    in_addr a{};
    if (inet_pton(AF_INET, text.c_str(), &a) != 1) return "not an IPv4 address";
    uint32_t ip = ntohl(a.s_addr);
    auto in = [ip](const char* net, int len) {      // is ip inside net/len?
        in_addr n{};
        inet_pton(AF_INET, net, &n);
        uint32_t mask = len ? ~0u << (32 - len) : 0;
        return (ip & mask) == (ntohl(n.s_addr) & mask);
    };
    int first = ip >> 24;
    string cls = first < 128 ? "A" : first < 192 ? "B" : first < 224 ? "C"
               : first < 240 ? "D" : "E";
    string kind = in("10.0.0.0", 8) || in("172.16.0.0", 12) || in("192.168.0.0", 16) ? "private"
                : in("127.0.0.0", 8)    ? "loopback"
                : in("169.254.0.0", 16) ? "link-local"
                : in("100.64.0.0", 10)  ? "carrier-grade NAT"
                : in("224.0.0.0", 4)    ? "multicast"
                : in("240.0.0.0", 4)    ? "reserved"
                : in("192.0.2.0", 24) || in("198.51.100.0", 24) || in("203.0.113.0", 24)
                    ? "documentation" : "public";
    return "class " + cls + ", " + kind;
}

int main() {
    for (string s : {"10.1.2.3", "172.20.5.1", "172.32.0.1", "192.168.1.23", "127.0.0.1",
                     "169.254.10.20", "100.72.1.1", "224.0.0.251", "8.8.8.8", "203.0.113.9"})
        cout << left << setw(15) << s << classify(s) << "\n";
}
```

Output:

```text
10.1.2.3       class A, private
172.20.5.1     class B, private
172.32.0.1     class B, public
192.168.1.23   class C, private
127.0.0.1      class A, loopback
169.254.10.20  class B, link-local
100.72.1.1     class A, carrier-grade NAT
224.0.0.251    class D, multicast
8.8.8.8        class A, public
203.0.113.9    class C, documentation
```

Note `172.32.0.1`: the private block is `172.16.0.0/12`, which ends at `172.31.255.255`, a classic trick question. The documentation ranges are reserved for examples, which is why this subject uses them for public addresses.

#### Public vs private

A private address is only meaningful inside its own network: millions of homes use `192.168.1.0/24` at the same time. Packets from private addresses reach the internet through **NAT**, which swaps in a public address. Servers that must be reachable from anywhere need a public address, or a public address on a load balancer or NAT in front of them.

#### Pitfalls

- Using a class to reason about a subnet today: `10.1.2.0/24` is a /24, whatever its class.
- Giving a host the network or broadcast address of its subnet.
- Assuming `127.0.0.1` is the only loopback address: the whole `127.0.0.0/8` is.

Connects to: subnetting and CIDR, NAT, IPv6, DHCP, routing basics.

### questions
Q: What are the private IPv4 address ranges?
A: 10.0.0.0/8, 172.16.0.0/12 (172.16.0.0 to 172.31.255.255) and 192.168.0.0/16. They are not routed on the public internet, so any organization can reuse them internally and reach the internet through NAT.

Q: What were IPv4 address classes and why were they abandoned?
A: The leading bits fixed the network size: class A /8, class B /16, class C /24, with D for multicast and E reserved. Only three sizes were available, so organizations received far more addresses than needed and routing tables grew quickly. CIDR replaced classes with arbitrary prefix lengths in 1993.

Q: What is the difference between a public and a private IP address?
A: A public address is globally unique and routable on the internet, allocated through registries and ISPs. A private address is only unique within one organization's network and is dropped by internet routers, so hosts with private addresses reach the internet through NAT.

Q: What is 169.254.x.x and when do you see it?
A: It is the link-local range. A host assigns itself an address from it when it is set to use DHCP but gets no answer, so it can still talk to neighbors on the same link but not beyond. Seeing it usually means DHCP failed.

Q: Why can't a host use the first or last address of its subnet?
A: The first address, with all host bits 0, identifies the network itself, and the last, with all host bits 1, is the subnet's broadcast address. That is why a /24 has 256 addresses but 254 usable hosts.

## cn.network.subnetting-and-cidr
name: "Subnetting and CIDR"
importance: must
prereqs: [cn.network.ipv4-addressing]
scope: "subnet masks, calculating network, broadcast and host ranges"

### simple
Subnetting splits one block of addresses into smaller networks, and CIDR notation like /26 says how many leading bits are the network part. It is like dividing a street of houses into blocks, each with its own first and last number. With the prefix you can work out a network's first address, last address and how many devices fit.

### interview
- **CIDR notation** `a.b.c.d/p`: the first $p$ bits are the network prefix. The **subnet mask** has $p$ ones: /24 is `255.255.255.0`, /26 is `255.255.255.192`.
- **Network address** = IP AND mask. **Broadcast** = network OR (NOT mask). Usable hosts are between them: $2^{32-p} - 2$ (a /31 point-to-point link uses both addresses, and a /32 is one host).
- Splitting a /24 into four /26 subnets: 64 addresses each, 62 hosts, starting at .0, .64, .128, .192. Each extra prefix bit halves the block.
- **VLSM**: subnets of different sizes from one block, allocated largest first so they stay aligned.
- **Route aggregation (supernetting)**: four /24s `10.1.0.0` to `10.1.3.0` are one /22 route, which keeps internet routing tables smaller.
- Two hosts are on the same subnet exactly when (IP1 AND mask) equals (IP2 AND mask); otherwise traffic goes via the gateway.

### deep
#### Intuition

A prefix length draws a line through the 32 bits. Everything left of the line is shared by the whole subnet; everything right of it numbers the hosts. Moving the line right by one bit makes twice as many subnets, each half as big.

#### Worked example by hand: 192.168.10.77/26

1. /26 means 26 network bits, 6 host bits, so blocks of $2^6 = 64$ addresses. Mask `255.255.255.192`.
2. The last byte, 77, falls in the block that starts at the multiple of 64 below it: 64. In binary, 77 is `01001101`; ANDing with `11000000` gives `01000000` = 64.
3. Network `192.168.10.64`, broadcast `192.168.10.127` (64 + 63).
4. Hosts `192.168.10.65` to `192.168.10.126`: 62 usable addresses.

The shortcut: block size = 256 minus the interesting byte of the mask (256 − 192 = 64), then find the multiple of the block size.

#### Code: a subnet calculator

```cpp
string str(uint32_t ip) {
    return to_string(ip >> 24) + "." + to_string(ip >> 16 & 255) + "." +
           to_string(ip >> 8 & 255) + "." + to_string(ip & 255);
}

void describe(const string& cidr) {
    size_t slash = cidr.find('/');
    in_addr a{};
    inet_pton(AF_INET, cidr.substr(0, slash).c_str(), &a);
    int len = stoi(cidr.substr(slash + 1));          // assumes a prefix of 1 to 30
    uint32_t ip = ntohl(a.s_addr);
    uint32_t mask = ~0u << (32 - len);
    uint32_t network = ip & mask, broadcast = network | ~mask;
    cout << cidr << ": mask " << str(mask) << ", network " << str(network) << ", broadcast "
         << str(broadcast) << "\n    hosts " << str(network + 1) << " to " << str(broadcast - 1)
         << " (" << broadcast - network - 1 << ")\n";
}

int main() {
    describe("192.168.10.77/26");
    describe("10.20.30.40/20");
    describe("172.16.5.1/30");
}
```

Output:

```text
192.168.10.77/26: mask 255.255.255.192, network 192.168.10.64, broadcast 192.168.10.127
    hosts 192.168.10.65 to 192.168.10.126 (62)
10.20.30.40/20: mask 255.255.240.0, network 10.20.16.0, broadcast 10.20.31.255
    hosts 10.20.16.1 to 10.20.31.254 (4094)
172.16.5.1/30: mask 255.255.255.252, network 172.16.5.0, broadcast 172.16.5.3
    hosts 172.16.5.1 to 172.16.5.2 (2)
```

For the /20, the interesting byte is the third: block size 256 − 240 = 16, and 30 falls in the block starting at 16, so the network is `10.20.16.0` and the block runs to `10.20.31.255`.

#### Worked example: VLSM

Split `192.168.1.0/24` for departments of 100, 50 and 20 hosts plus two router-to-router links. Allocate the largest first:

| need | prefix | size | subnet | usable hosts |
|---|---|---|---|---|
| 100 hosts | /25 | 128 | 192.168.1.0/25 | .1 to .126 |
| 50 hosts | /26 | 64 | 192.168.1.128/26 | .129 to .190 |
| 20 hosts | /27 | 32 | 192.168.1.192/27 | .193 to .222 |
| link 1 | /30 | 4 | 192.168.1.224/30 | .225 to .226 |
| link 2 | /30 | 4 | 192.168.1.228/30 | .229 to .230 |

`192.168.1.232` to `.255` stays free for growth. Pick the smallest prefix whose $2^{32-p} - 2$ covers the need: 100 hosts need 7 host bits (126), so /25.

#### Aggregation

`10.1.0.0/24`, `10.1.1.0/24`, `10.1.2.0/24` and `10.1.3.0/24` share their first 22 bits, so a provider can announce the single route `10.1.0.0/22`. The blocks must be contiguous and aligned: `10.1.1.0` to `10.1.4.0` cannot be summarized as one /22.

#### Pitfalls

- Mask and prefix mismatch: `255.255.255.192` is /26, not /24.
- Forgetting the two reserved addresses when sizing (a /26 fits 62 hosts, not 64).
- Misaligned subnets: a /26 must start at a multiple of 64 in its last byte.

Connects to: IPv4 addressing, routing basics, NAT, DHCP, bitwise operators.

### questions
Q: Given 192.168.10.77/26, what are the network address, broadcast address and host range?
A: A /26 has blocks of 64, and 77 falls in the block starting at 64. The network is 192.168.10.64, the broadcast is 192.168.10.127, and the usable hosts are 192.168.10.65 to 192.168.10.126, 62 in all.

Q: How many usable hosts does a /27 subnet have?
A: A /27 leaves 5 host bits, so 32 addresses. Two are the network and broadcast addresses, leaving 30 usable hosts.

Q: How does a host decide whether a destination is on its own subnet?
A: It ANDs both its own address and the destination address with its subnet mask. If the results match, the destination is local and the host sends the frame directly after ARP; otherwise it sends the frame to its default gateway.

Q: What is CIDR and what problem did it solve?
A: Classless inter-domain routing lets a network prefix have any length, written as a slash and the number of prefix bits. It replaced fixed class sizes, so organizations get blocks close to their needs, and providers can aggregate many contiguous blocks into one route, slowing routing table growth.

Q: What is route aggregation?
A: Advertising several contiguous, aligned prefixes as one shorter prefix, such as four /24 networks as a single /22. It shrinks routing tables and hides internal changes from the rest of the internet.

## cn.network.nat
name: "NAT"
importance: must
prereqs: [cn.network.subnetting-and-cidr]
scope: "sharing one public IP, port translation"

### simple
NAT lets many devices with private addresses share one public IP address. The home router rewrites each outgoing packet so it looks as if it came from the router, notes which device it really belongs to, and rewrites the reply on the way back. It is like an office receptionist who sends all letters with the company's address and routes replies to the right desk using a reference number.

### interview
- **NAT** (network address translation) rewrites IP addresses in packets as they cross a router. Home routers do **NAPT** (port address translation, also called PAT or masquerading): many private hosts share one public IP, told apart by **port**.
- Outbound: (private IP, private port) → (public IP, new public port), recorded in a **translation table**. Inbound replies to that public port are rewritten back. The IP and TCP or UDP checksums are updated.
- **Unsolicited inbound** packets match no entry and are dropped, which makes NAT act like a basic firewall. To run a server behind NAT you configure **port forwarding** (a static entry).
- NAT breaks the **end-to-end** model: peer-to-peer apps (calls, games) need **NAT traversal**: STUN to learn the public address, **UDP hole punching**, and TURN relays as a fallback.
- Entries time out (UDP mappings often after 30 s to a few minutes), so long-lived idle connections send **keepalives**.
- **Carrier-grade NAT** (`100.64.0.0/10`) puts a second NAT at the ISP; NAT exists mostly because IPv4 ran out, and IPv6 makes it unnecessary.

### deep
#### Intuition

IPv4 does not have enough addresses for every device, so a home gets one public address and hides all its devices behind it. Outbound connections are easy: the router remembers who asked. Inbound connections are hard: when a packet arrives at the public address, the router cannot know which device should get it unless an outbound packet or a manual rule set that up.

#### Worked example: two devices, one public address

The router's public address is `198.51.100.4`. A laptop and a phone both open connections to a web server at `203.0.113.9:443`, and by coincidence both use source port 51000.

```cpp
using Endpoint = pair<string, int>;                     // IP address and port

struct Nat {
    string publicIp;
    int nextPort = 40000;
    map<Endpoint, int> outbound{};                     // private endpoint -> public port
    map<int, Endpoint> inbound{};                      // public port -> private endpoint

    Endpoint out(const Endpoint& from) {
        auto [it, added] = outbound.try_emplace(from, nextPort);
        if (added) inbound[nextPort++] = from;         // new flow: allocate a port
        return {publicIp, it->second};
    }
    optional<Endpoint> in(int publicPort) {
        auto it = inbound.find(publicPort);
        if (it == inbound.end()) return nullopt;       // nobody asked for this: drop
        return it->second;
    }
};

int main() {
    Nat nat{"198.51.100.4"};
    for (Endpoint e : {Endpoint{"192.168.1.23", 51000}, Endpoint{"192.168.1.40", 51000},
                       Endpoint{"192.168.1.23", 51000}}) {
        auto [ip, port] = nat.out(e);
        cout << e.first << ":" << e.second << " -> " << ip << ":" << port << "\n";
    }
    for (int port : {40001, 40005}) {
        auto to = nat.in(port);
        cout << "reply to :" << port << " -> "
             << (to ? to->first + ":" + to_string(to->second) : string("dropped")) << "\n";
    }
}
```

Output:

```text
192.168.1.23:51000 -> 198.51.100.4:40000
192.168.1.40:51000 -> 198.51.100.4:40001
192.168.1.23:51000 -> 198.51.100.4:40000
reply to :40001 -> 192.168.1.40:51000
reply to :40005 -> dropped
```

The server sees two connections from `198.51.100.4`, told apart by port. The third line reuses the existing entry, and the packet to port 40005 is dropped because no device asked for it. Real NATs key entries on the full flow (including the remote address and port), time them out, and often keep the original source port when it is free.

#### What gets rewritten

| direction | source | destination | also updated |
|---|---|---|---|
| outbound | private IP and port → public IP and port | unchanged | IP checksum, TCP or UDP checksum |
| inbound | unchanged | public IP and port → private IP and port | same checksums |

Protocols that write IP addresses inside their payload, such as FTP in active mode and SIP for calls, break unless the NAT has a helper that rewrites the payload too.

#### Getting through NAT

- **Port forwarding**: a static rule "public port 8080 goes to `192.168.1.50:80`", for servers at home.
- **STUN**: a client asks a public server "what address and port do you see me as?", learning its public endpoint.
- **Hole punching**: two peers behind NATs send UDP packets to each other's public endpoints at the same time; each NAT sees outbound traffic first and then lets the replies in. It fails on NATs that pick a different public port for each destination (symmetric NAT).
- **TURN**: when nothing else works, both peers relay traffic through a public server, at a bandwidth cost.

#### Pitfalls

- NAT is not a real firewall: it only drops unsolicited inbound traffic by accident of design, and it does nothing about outbound traffic or attacks over allowed connections.
- Logging and rate limiting by IP address at a server treat everyone behind one NAT (a whole office, or thousands of mobile users under carrier-grade NAT) as one client.
- Idle long-lived connections (chat, push notifications) die when the mapping times out unless they send keepalives.

Connects to: IPv4 addressing, IPv6, ports and sockets, firewalls, VPNs and proxies, WebSockets.

### questions
Q: How does NAT let many devices share one public IP address?
A: The router rewrites each outgoing packet's private source address and port to its public address and a port it chooses, and records the mapping in a table. When a reply arrives at that public port, it looks up the mapping and rewrites the destination back to the private device, updating checksums both ways.

Q: Why can't an outside host start a connection to a device behind NAT?
A: An unsolicited inbound packet arrives at the public address and a port with no entry in the translation table, so the router does not know which private device should receive it and drops it. Port forwarding adds a static entry, and NAT traversal techniques create an entry by sending outbound traffic first.

Q: What is UDP hole punching?
A: Two peers behind NATs learn each other's public address and port through a rendezvous server, then both send UDP packets to each other at about the same time. Each NAT sees an outbound packet first and creates a mapping, so the other peer's packets are then allowed in. It fails with symmetric NATs, where a relay such as TURN is needed.

Q: What are the downsides of NAT?
A: It breaks end-to-end connectivity, so servers and peer-to-peer apps behind NAT need forwarding or traversal tricks. Protocols that embed addresses in their payload need helpers. It adds state that times out, and many users share one address, which complicates logging, rate limiting and blocking.

Q: What is carrier-grade NAT?
A: A NAT run by the ISP, so customers get addresses from 100.64.0.0/10 that are themselves translated to a shared public address. Combined with the home router's NAT, traffic is translated twice. ISPs use it because they have run out of public IPv4 addresses.

## cn.network.ipv6
name: "IPv6"
importance: important
prereqs: [cn.network.ipv4-addressing]
scope: "why it exists, address format"

### simple
IPv6 is the newer version of the Internet Protocol, with addresses of 128 bits instead of 32, so there are enough for every device many times over. IPv4 is like a town that ran out of house numbers and made families share one, while IPv6 is a new numbering scheme so large that every house, room and lamp can have its own. The two run side by side while the internet slowly switches over.

### interview
- **Why**: IPv4's 4.3 billion addresses ran out; NAT is a workaround with real costs. IPv6 has $2^{128}$ addresses and restores end-to-end addressing.
- **Format**: eight groups of four hex digits, `2001:0db8:0000:0000:0000:ff00:0042:8329`. Drop leading zeros in each group and replace **one** run of all-zero groups with `::` → `2001:db8::ff00:42:8329`.
- Usual split: a /64 **network prefix** (routing and subnet) and a 64-bit **interface identifier**. Every LAN is a /64; homes often get a /56 or /48.
- Types: **global unicast** `2000::/3`, **link-local** `fe80::/10` (every interface has one), **unique local** `fc00::/7` (like private addresses), multicast `ff00::/8`, loopback `::1`. **No broadcast**: multicast replaces it.
- Header changes: fixed 40 bytes, no header checksum, **routers never fragment** (only the source does, with path MTU discovery; minimum MTU 1280), optional features in **extension headers**, a flow label.
- Hosts can configure themselves with **SLAAC** from router advertisements (or use DHCPv6); **Neighbor Discovery** replaces ARP. Transition: dual stack, tunnels, NAT64 and DNS64.

### deep
#### Writing addresses

```cpp
int main() {
    for (const char* s : {"2001:0db8:0000:0000:0000:ff00:0042:8329",
                          "fe80:0000:0000:0000:0202:b3ff:fe1e:8329",
                          "0000:0000:0000:0000:0000:0000:0000:0001",
                          "2001:0db8:0000:0000:0001:0000:0000:0001"}) {
        in6_addr a{};
        inet_pton(AF_INET6, s, &a);
        char text[INET6_ADDRSTRLEN];
        inet_ntop(AF_INET6, &a, text, sizeof text);           // the canonical short form
        printf("%s -> %s\n", s, text);
    }
}
```

Output:

```text
2001:0db8:0000:0000:0000:ff00:0042:8329 -> 2001:db8::ff00:42:8329
fe80:0000:0000:0000:0202:b3ff:fe1e:8329 -> fe80::202:b3ff:fe1e:8329
0000:0000:0000:0000:0000:0000:0000:0001 -> ::1
2001:0db8:0000:0000:0001:0000:0000:0001 -> 2001:db8::1:0:0:1
```

`::` may appear only once, or the address would be ambiguous. In the last address there are two runs of two zero groups; the canonical form compresses the first (the longest, or the first on a tie).

#### Where the interface identifier comes from

The link-local address above ends in `0202:b3ff:fe1e:8329`, built from the MAC `00:02:b3:1e:83:29` by the older **EUI-64** method: insert `ff:fe` in the middle and flip the universal/local bit (`00` becomes `02`). Because a MAC-based identifier follows a laptop from network to network, modern systems use **random, rotating** identifiers for outgoing connections instead.

#### IPv4 vs IPv6 headers

| | IPv4 | IPv6 |
|---|---|---|
| address size | 32 bits | 128 bits |
| header | 20 to 60 bytes, variable | 40 bytes fixed, options in extension headers |
| checksum | yes, recomputed each hop | none (link and transport layers check) |
| fragmentation | by sender or routers | by the sender only |
| TTL | time to live | hop limit (same meaning) |
| address resolution | ARP (broadcast) | Neighbor Discovery (multicast ICMPv6) |
| configuration | DHCP or manual | SLAAC, DHCPv6 or manual |

#### Transition

The two protocols are not compatible on the wire, so the internet runs both. **Dual stack** hosts have both kinds of addresses and prefer IPv6 when a name has an AAAA record (with Happy Eyeballs racing both). **Tunnels** carry IPv6 inside IPv4 across old networks. **NAT64 with DNS64** lets IPv6-only clients, common on mobile networks, reach IPv4-only servers.

Connects to: IPv4 addressing, NAT, ICMP, DHCP, ARP, IP fragmentation and MTU.

### questions
Q: Why was IPv6 created?
A: IPv4 has only about 4.3 billion addresses, and they have run out. NAT stretched them but breaks end-to-end connectivity. IPv6 uses 128-bit addresses, enough for every device to have globally unique addresses, and also simplifies the header and autoconfiguration.

Q: How do you shorten an IPv6 address?
A: Remove leading zeros in each 16-bit group, and replace one consecutive run of all-zero groups with a double colon. The double colon can be used only once, because otherwise it would be ambiguous how many zero groups each one stands for.

Q: What are the main differences between the IPv4 and IPv6 headers?
A: IPv6 addresses are 128 bits instead of 32, and the header is a fixed 40 bytes with options moved into extension headers. It has no header checksum, and routers never fragment packets; only the source does. TTL is renamed hop limit.

Q: Does IPv6 have broadcast, and how does it find neighbors?
A: No, IPv6 has no broadcast; it uses multicast groups instead. Neighbor Discovery, built on ICMPv6, finds neighbors' link-layer addresses and routers, replacing ARP, and stateless autoconfiguration lets hosts build their own addresses from router advertisements.

## cn.network.icmp
name: "ICMP"
importance: must
scope: "ping and traceroute"

### simple
ICMP is the internet's messaging service for errors and tests: routers and hosts use it to say things like "that destination is unreachable" or "this packet ran out of hops". Ping uses it to ask a machine "are you there?" and times the answer. It works like the post office returning a letter with a note explaining why it could not be delivered.

### interview
- **ICMP** (Internet Control Message Protocol) runs directly on IP (protocol number 1) and carries **error reports** and **diagnostics**; it has no ports.
- Key types: **echo request 8 / echo reply 0** (ping); **destination unreachable 3** (codes: network 0, host 1, protocol 2, **port 3**, **fragmentation needed 4**); **time exceeded 11** (TTL reached 0); redirect 5.
- **Ping** sends echo requests and measures round-trip time and loss. No reply does not prove the host is down: firewalls often drop ICMP.
- **Traceroute** sends probes with TTL 1, 2, 3 and so on; each router that decrements TTL to 0 returns **time exceeded**, revealing itself. Linux traceroute sends UDP to high ports (the destination answers **port unreachable**); Windows tracert sends echo requests.
- ICMP errors are never sent about other ICMP errors, and they quote the offending packet's IP header plus the first 8 bytes of its payload so the sender can match them.
- **Path MTU discovery** relies on "fragmentation needed" messages; blocking all ICMP causes connections that hang on large packets (PMTUD black holes).

### deep
#### Intuition

IP is best effort: packets can be dropped anywhere. ICMP is how the network tells the sender why, when it can. Nobody asks for most ICMP messages; they are side effects of forwarding: a router drops a packet whose TTL reached 0 and sends a "time exceeded" back to the source.

#### The message

```text
| type (1 byte) | code (1 byte) | checksum (2) | rest of header (4) | data ... |
```

For echo, the rest of the header holds an identifier and a sequence number, and the data is echoed back unchanged. For errors, the data is the start of the packet that caused the problem.

#### Code: a minimal ping

A raw socket lets a program build its own ICMP messages. It needs root or the `CAP_NET_RAW` capability (the system `ping` uses special unprivileged ICMP sockets instead).

```cpp
uint16_t checksum(const uint8_t* p, size_t len) {    // the Internet checksum
    uint32_t sum = 0;
    for (size_t i = 0; i + 1 < len; i += 2) sum += p[i] << 8 | p[i + 1];
    if (len & 1) sum += p[len - 1] << 8;
    while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
    return htons(~sum & 0xffff);
}

int main() {
    int fd = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
    if (fd < 0) { perror("socket (run as root)"); return 1; }
    sockaddr_in to{};
    to.sin_family = AF_INET;
    inet_pton(AF_INET, "127.0.0.1", &to.sin_addr);
    const uint16_t id = 0x1234;
    for (int seq = 1; seq <= 3; ++seq) {
        uint8_t pkt[16] = {};
        auto* req = reinterpret_cast<icmphdr*>(pkt);
        req->type = ICMP_ECHO;                         // 8: echo request
        req->un.echo.id = htons(id);
        req->un.echo.sequence = htons(seq);
        memcpy(pkt + 8, "atlas!!!", 8);                // data to be echoed back
        req->checksum = checksum(pkt, sizeof pkt);
        auto sent = chrono::steady_clock::now();
        sendto(fd, pkt, sizeof pkt, 0, reinterpret_cast<sockaddr*>(&to), sizeof to);
        for (;;) {
            uint8_t buf[512];
            if (recv(fd, buf, sizeof buf, 0) < 0) return 1;   // raw: IP header included
            auto* reply = reinterpret_cast<icmphdr*>(buf + (buf[0] & 0x0f) * 4);
            if (reply->type != ICMP_ECHOREPLY || reply->un.echo.id != htons(id)) continue;
            auto us = chrono::duration<double, micro>(chrono::steady_clock::now() - sent);
            printf("reply seq=%d ttl=%d time=%.0f us\n", ntohs(reply->un.echo.sequence),
                   buf[8], us.count());
            break;
        }
    }
    close(fd);
}
```

On loopback, one run printed `reply seq=1 ttl=64 time=24 us`, then 3 µs for the next two probes: the first pays one-time costs such as cold caches, and loopback traffic never leaves the machine. The reply carries TTL 64, the Linux default, since it crossed no routers; across the internet, ping times are milliseconds. The loop skips our own echo request, which a raw socket also sees on loopback, and any other program's replies (a different identifier).

#### Worked example: traceroute

| probe TTL | who answers | message | what you learn |
|---|---|---|---|
| 1 | home router 192.168.1.1 | time exceeded | hop 1 and its RTT |
| 2 | ISP router 198.51.100.1 | time exceeded | hop 2 |
| 3 | ISP core 198.51.100.77 | time exceeded | hop 3 |
| 4 | no answer | (`* * *`) | this router does not send ICMP; the probe still passed |
| 5 | destination 203.0.113.9 | port unreachable (UDP probe) or echo reply | reached; stop |

Each hop is usually probed three times. RTTs can go up and down along the path because routers answer ICMP slowly compared with forwarding, and return paths can differ.

#### Pitfalls

- Blocking all ICMP breaks path MTU discovery and makes problems harder to debug; allow at least "fragmentation needed" (and ICMPv6 "packet too big", which IPv6 cannot work without).
- A slow hop in traceroute does not mean a slow path if later hops are fast: that router just deprioritizes ICMP.
- ICMP floods and oversized pings were classic denial-of-service tools, so ICMP is rate limited.

Connects to: IPv4 addressing, IP fragmentation and MTU, routing basics, TCP vs UDP, common attacks.

### questions
Q: What is ICMP used for?
A: It carries error reports and diagnostic messages for IP: destination unreachable, time exceeded when a TTL reaches 0, fragmentation needed, and echo request and reply for ping. It runs directly over IP with protocol number 1 and has no ports.

Q: How does traceroute work?
A: It sends probes with TTL 1, then 2, then 3 and so on. Each router that decrements a probe's TTL to 0 drops it and returns an ICMP time exceeded message, revealing its address and the round-trip time. The destination finally answers with a port unreachable message for UDP probes, or an echo reply for ICMP probes.

Q: Ping to a server fails but the website loads. How is that possible?
A: Ping uses ICMP echo, and many servers or firewalls drop ICMP for security or rate reasons, while allowing TCP on ports 80 and 443. Ping failing only shows that echo requests are not answered, not that the host is down.

Q: Why is blocking all ICMP a bad idea?
A: Path MTU discovery depends on ICMP fragmentation-needed messages, or packet too big in IPv6. Without them, a sender never learns the path's MTU, so small packets work but large ones silently vanish, and connections hang after the handshake. Error messages also make debugging possible.

Q: What does an ICMP error message contain?
A: Its type and code, and the IP header plus at least the first 8 bytes of the packet that caused the error. Those bytes include the transport ports, so the sender's operating system can match the error to the right socket.

## cn.network.dhcp
name: "DHCP"
importance: must
prereqs: [cn.network.ipv4-addressing]
scope: "how a device gets an IP address"

### simple
DHCP is how a device gets its network settings automatically when it joins a network: its IP address, the router to use, and which name server to ask. The new device shouts "I need an address", a server offers one, the device accepts, and the server confirms. It is like checking into a hotel: you ask for a room, get offered one, accept it, and receive a key that works until checkout.

### interview
- **DHCP** (Dynamic Host Configuration Protocol) hands out IP configuration: address, subnet mask, **default gateway**, **DNS servers**, and a **lease time**. It runs over UDP (server port 67, client port 68).
- **DORA**: **Discover** (client broadcasts from `0.0.0.0` to `255.255.255.255`), **Offer** (server proposes an address), **Request** (client broadcasts which offer it takes, so other servers withdraw theirs), **Ack** (server confirms; the lease starts).
- **Leases** expire. At **T1** (50% of the lease) the client renews directly with its server; at **T2** (87.5%) it broadcasts to any server; at expiry it must stop using the address.
- A **relay agent** on a router forwards broadcasts to a central DHCP server on another subnet, adding which subnet the request came from.
- **Reservations** give a fixed address to a known MAC. **Conflict checks** (ARP or ping probes) avoid handing out an address someone already uses.
- Attacks: a **rogue DHCP server** hands out itself as the gateway (man in the middle); **starvation** exhausts the pool with fake MACs. Switch **DHCP snooping** allows server messages only from trusted ports.

### deep
#### Intuition

A device joining a network has no address and does not know who to ask, so it has to broadcast. DHCP turns that into a short conversation with a server that manages a pool of addresses, and makes the result temporary (a lease), so addresses from devices that leave return to the pool.

#### The exchange

```text
client (no address yet)                               DHCP server 192.168.1.1
  DISCOVER  src 0.0.0.0:68  -> dst 255.255.255.255:67   "I need an address; my MAC is aa:aa:..."
                            <- OFFER                  "192.168.1.23, mask /24, gateway .1,
                                                        DNS .1, lease 24 h"
  REQUEST   src 0.0.0.0:68  -> dst 255.255.255.255:67   "I take 192.168.1.23 from server .1"
                            <- ACK                    "confirmed, lease starts now"
```

The request is broadcast even though the client knows the server, so any other server that made an offer sees it was declined. Before using the address, many clients send an ARP probe to make sure nobody else has it.

#### Code: a server's pool and leases

```cpp
struct Lease { string mac; long expires; };

struct DhcpServer {
    uint32_t first, last;                                  // the pool, as host numbers
    long leaseTime;
    map<uint32_t, Lease> leases{};

    optional<uint32_t> offer(const string& mac, long now) {
        for (auto& [ip, l] : leases)
            if (l.mac == mac) return ip;                   // a known client gets its old address
        for (uint32_t ip = first; ip <= last; ++ip) {
            auto it = leases.find(ip);
            if (it == leases.end() || it->second.expires <= now) return ip;   // free or expired
        }
        return nullopt;                                    // pool exhausted
    }
    void ack(uint32_t ip, const string& mac, long now) { leases[ip] = {mac, now + leaseTime}; }
};

void join(DhcpServer& s, const string& mac, long now) {
    auto ip = s.offer(mac, now);
    if (ip) s.ack(*ip, mac, now);
    cout << "t=" << now << " " << mac << ": "
         << (ip ? "192.168.1." + to_string(*ip) : string("no address free")) << "\n";
}

int main() {
    DhcpServer s{100, 102, 3600};                          // .100 to .102, one-hour leases
    join(s, "laptop", 0);
    join(s, "phone", 0);
    join(s, "tv", 0);
    join(s, "guest", 10);                                  // pool full
    join(s, "laptop", 1800);                               // renewal at T1: same address
    join(s, "guest", 4000);                                // phone and tv never renewed
    cout << "T1 at " << s.leaseTime / 2 << " s, T2 at " << s.leaseTime * 7 / 8 << " s\n";
}
```

Output:

```text
t=0 laptop: 192.168.1.100
t=0 phone: 192.168.1.101
t=0 tv: 192.168.1.102
t=10 guest: no address free
t=1800 laptop: 192.168.1.100
t=4000 guest: 192.168.1.101
T1 at 1800 s, T2 at 3150 s
```

The laptop renewed halfway through its lease and kept its address; the phone and TV left without renewing, so their leases expired at 3600 s and the guest got the first free address. A real server also answers with a NAK when a client asks for an address it cannot have.

#### Across subnets

Broadcasts stop at routers, so a campus with 50 subnets would need 50 servers. Instead, each router runs a **relay agent**: it catches the broadcast, fills in the subnet it arrived on (the gateway address field), and unicasts it to the central server, which picks an address from that subnet's pool.

#### Pitfalls

- A client stuck with `169.254.x.x` got no answer: check the server, the relay, or the VLAN.
- Two DHCP servers on one LAN (someone plugged in a home router) hand out conflicting gateways; DHCP snooping stops it.
- Very long leases on busy guest networks exhaust the pool; very short ones create constant renewal traffic.

Connects to: IPv4 addressing, ARP, subnetting and CIDR, DNS, IPv6.

### questions
Q: Describe the DHCP process.
A: DORA: the client broadcasts a Discover, servers reply with an Offer of an address and settings, the client broadcasts a Request naming the offer it accepts, and the chosen server replies with an Ack that starts the lease. The client then uses the address, gateway and DNS servers it received.

Q: Why does the client broadcast its Request instead of sending it to the server?
A: It still has no confirmed address, and several servers may have made offers. Broadcasting the Request tells all of them which offer was accepted, so the others can return their offered addresses to their pools.

Q: What happens when a DHCP lease is about to expire?
A: At half the lease time the client asks its server directly to renew. If that fails, at 87.5 percent it broadcasts to any server. If the lease expires without renewal, it must stop using the address and start over with a Discover.

Q: How does DHCP work when the server is on a different subnet?
A: A relay agent, usually on the subnet's router, receives the client's broadcast, records the subnet it came from, and forwards it as unicast to the DHCP server. The server picks an address from that subnet's pool and replies through the relay.

Q: What is a rogue DHCP server and how is it prevented?
A: An unauthorized server that answers clients, often handing out its own address as gateway or DNS server so it can intercept traffic. Switches with DHCP snooping only accept server messages on trusted ports, blocking rogue servers.

## cn.network.routing-basics
name: "Routing basics"
importance: important
prereqs: [cn.network.subnetting-and-cidr]
scope: "routing tables, static vs dynamic routing"

### simple
A router decides where to send each packet by looking up the destination address in its routing table, a list of address ranges with the next router to hand them to. It is like a road sign at a junction: it does not show the whole route, just which way to go next. When several entries match, the most specific one wins, and a default route catches everything else.

### interview
- A **routing table** entry: destination **prefix**, **next hop** (or directly connected), outgoing **interface**, and a **metric**. See one with `ip route`.
- **Longest prefix match**: among all matching prefixes, the longest (most specific) wins: for `10.1.2.7`, `10.1.2.0/24` beats `10.1.0.0/16` beats `10.0.0.0/8` beats the **default route** `0.0.0.0/0`.
- **Static routing**: routes typed in by an administrator. Simple and predictable, no overhead, but no reaction to failures. Good for small networks and a host's default gateway.
- **Dynamic routing**: routers run protocols (RIP, OSPF, BGP) to learn routes and recompute them after failures. Needed at scale.
- **Control plane** (building the table with protocols) vs **data plane** (forwarding each packet by looking it up, in hardware at line rate).
- When several sources offer a route to the same prefix, routers prefer the most trusted source (administrative distance: connected, then static, then protocols), then the lowest metric. Each hop decrements TTL, so routing loops eventually drop packets.

### deep
#### A small routing table

| prefix | next hop | meaning |
|---|---|---|
| 0.0.0.0/0 | ISP router | default: everything else |
| 10.0.0.0/8 | core router | the company network |
| 10.1.0.0/16 | building B router | one building |
| 10.1.2.0/24 | directly connected, eth2 | the lab LAN |

#### Code: longest prefix match with a binary trie

Routers store prefixes in tries (in hardware, compressed tries or TCAM). Walk the destination's bits from the top, remembering the last node that held a route.

```cpp
struct RouteTrie {
    vector<array<int, 2>> child{{0, 0}};            // node 0 is the root; 0 also means none
    vector<string> hop{""};

    void add(const char* prefix, int len, const string& nextHop) {
        in_addr a{};
        inet_pton(AF_INET, prefix, &a);
        uint32_t bits = ntohl(a.s_addr);
        int node = 0;
        for (int i = 0; i < len; ++i) {
            int b = bits >> (31 - i) & 1;
            if (!child[node][b]) {
                child[node][b] = child.size();
                child.push_back({0, 0});
                hop.push_back("");
            }
            node = child[node][b];
        }
        hop[node] = nextHop;
    }

    string lookup(const char* dst) const {
        in_addr a{};
        inet_pton(AF_INET, dst, &a);
        uint32_t bits = ntohl(a.s_addr);
        int node = 0;
        string best = hop[0];                        // the default route, if any
        for (int i = 0; i < 32 && (node = child[node][bits >> (31 - i) & 1]); ++i)
            if (!hop[node].empty()) best = hop[node];   // a longer match
        return best;
    }
};

int main() {
    RouteTrie t;
    t.add("0.0.0.0", 0, "ISP router");
    t.add("10.0.0.0", 8, "core router");
    t.add("10.1.0.0", 16, "building B router");
    t.add("10.1.2.0", 24, "lab LAN, eth2");
    for (const char* d : {"10.1.2.7", "10.1.9.9", "10.200.0.1", "203.0.113.5"})
        cout << d << " -> " << t.lookup(d) << "\n";
}
```

Output:

```text
10.1.2.7 -> lab LAN, eth2
10.1.9.9 -> building B router
10.200.0.1 -> core router
203.0.113.5 -> ISP router
```

The lookup takes at most 32 steps whatever the table size; real routers compress the trie (several bits per step) to fit hundreds of thousands of internet prefixes.

#### Static vs dynamic

| | static | dynamic |
|---|---|---|
| set up by | an administrator | routing protocols |
| reacts to failures | no | yes, within seconds to minutes |
| overhead | none | protocol messages, CPU, memory |
| risk | stale routes after changes | misconfiguration spreads automatically |
| typical use | a host's default gateway, a small branch, a stub network | campus, data center, ISP, internet |

Most networks mix both: static default routes at the edges, dynamic protocols inside (OSPF) and between organizations (BGP).

#### Pitfalls

- A route to a prefix is useless if the next hop is not reachable through a connected network.
- A missing return route: packets arrive, replies have no way back, and the problem looks one-sided.
- Two routers pointing default routes at each other create a loop until TTLs expire.

Connects to: subnetting and CIDR, distance vector vs link state, BGP overview, trie structure, hubs, switches and routers.

### questions
Q: What is longest prefix match?
A: When several routing table entries match a destination address, the router uses the one with the longest prefix, the most specific network. For 10.1.2.7, a route for 10.1.2.0/24 wins over 10.1.0.0/16, which wins over the default route 0.0.0.0/0.

Q: What is the difference between static and dynamic routing?
A: Static routes are configured by hand and never change on their own, which is simple and predictable but does not adapt to failures. Dynamic routing uses protocols such as OSPF or BGP, through which routers exchange information and recompute routes automatically when links change, at the cost of protocol overhead.

Q: What is a default route?
A: The route for 0.0.0.0/0, which matches every destination with the shortest possible prefix, so it is used only when nothing more specific matches. Hosts and edge routers usually have one pointing at their gateway or ISP.

Q: What is the difference between the control plane and the data plane of a router?
A: The control plane builds the routing table by running routing protocols and applying configuration. The data plane forwards each arriving packet by looking up its destination in the resulting table, usually in specialized hardware at line rate.

## cn.network.distance-vector-vs-link-state
name: "Distance vector vs link state"
importance: important
prereqs: [cn.network.routing-basics]
scope: "RIP vs OSPF"

### simple
Routers learn routes in one of two ways. In distance vector routing, each router only tells its neighbors how far it is from every destination, like passing directions by word of mouth. In link state routing, every router gets a full map of the network and computes the best paths itself, like everyone holding the same street map.

### interview
- **Distance vector** (RIP): each router keeps a vector of distances to all destinations and periodically sends it to its **neighbors**; each updates with $D(x, y) = \min_v \{c(x, v) + D(v, y)\}$, the distributed **Bellman-Ford** equation.
- DV problems: slow convergence and **count to infinity** after a failure (routers keep believing each other's stale routes). Fixes: **split horizon**, **poison reverse**, a small infinity (RIP: 16 hops).
- **Link state** (OSPF, IS-IS): each router **floods** link-state advertisements describing its own links to **every** router; all build the same map and run **Dijkstra** to get shortest paths.
- LS converges faster and has no counting to infinity, but needs more memory and CPU and floods updates. OSPF scales with **areas** and uses link **cost** (often based on bandwidth).
- RIP: hop count metric, updates every 30 s, fine for small networks only. OSPF: the standard inside organizations. Between organizations the internet uses BGP (path vector).

### deep
#### Distance vector in rounds

Network: A–B cost 1, B–C cost 2, A–C cost 5, C–D cost 1. Each round, every router recomputes its distances from its neighbors' previous vectors.

```cpp
int main() {
    const int INF = 1e9, n = 4;
    vector<vector<int>> cost(n, vector<int>(n, INF));
    auto link = [&](int a, int b, int c) { cost[a][b] = cost[b][a] = c; };
    link(0, 1, 1); link(1, 2, 2); link(0, 2, 5); link(2, 3, 1);   // A B C D

    vector<vector<int>> d = cost;                    // round 0: only direct links are known
    for (int i = 0; i < n; ++i) d[i][i] = 0;
    for (int round = 1;; ++round) {
        auto next = d;
        for (int x = 0; x < n; ++x)
            for (int y = 0; y < n; ++y)
                for (int v = 0; v < n; ++v)          // v ranges over x's neighbors
                    if (cost[x][v] < INF && d[v][y] < INF)
                        next[x][y] = min(next[x][y], cost[x][v] + d[v][y]);
        if (next == d) {
            cout << "converged after " << round - 1 << " rounds\n";
            break;
        }
        d = next;
        cout << "round " << round << ", A's distances:";
        for (int y = 0; y < n; ++y) cout << " " << char('A' + y) << "=" << d[0][y];
        cout << "\n";
    }
}
```

Output:

```text
round 1, A's distances: A=0 B=1 C=3 D=6
round 2, A's distances: A=0 B=1 C=3 D=4
converged after 2 rounds
```

After round 1, A learns C costs 3 through B and D costs 6 through C's direct link. After round 2, it hears B's improved route to D (3) and settles on 4. Dijkstra on the full map gives the same answer (B 1, C 3, D 4) in one computation, which is what link state does.

#### Count to infinity

A line A–B–C with costs 1. B reaches C at 1, and A reaches C at 2 through B. Then the B–C link fails.

| after update | B's distance to C | A's distance to C |
|---|---|---|
| before failure | 1 (direct) | 2 (via B) |
| B notices | 3 (via A, which still says 2) | 2 |
| A hears B | 3 | 4 (via B) |
| B hears A | 5 | 4 |
| ... | counts up by 2 | ... until RIP's infinity, 16 |

B believes A's stale route, which actually went through B. **Split horizon** (never advertise a route back to the neighbor you learned it from) fixes this two-router loop; **poison reverse** advertises it back with distance infinity instead. Loops through three or more routers can still count up, which is one reason RIP caps paths at 15 hops.

#### Side by side

| | distance vector | link state |
|---|---|---|
| shares | its distance vector | its own links |
| with | neighbors only | every router (flooding) |
| algorithm | Bellman-Ford, distributed | Dijkstra, locally |
| view | "who is closest to what" | full topology |
| convergence | slow, can count to infinity | fast |
| cost | little memory and CPU | more memory, CPU, flooding |
| example | RIP | OSPF, IS-IS |

Connects to: routing basics, BGP overview, Dijkstra's algorithm, Bellman-Ford.

### questions
Q: What is the difference between distance vector and link state routing?
A: In distance vector, each router sends its table of distances to its neighbors and updates its own using the Bellman-Ford equation, without seeing the full topology. In link state, each router floods a description of its own links to all routers, so every router has the full map and runs Dijkstra itself. Link state converges faster but uses more memory and CPU.

Q: What is the count-to-infinity problem?
A: After a link fails, distance vector routers can keep learning stale routes from each other that actually loop back through themselves, so their distance to the lost destination grows slowly, one update at a time, until it reaches the protocol's infinity. Split horizon and poison reverse stop two-router loops.

Q: How does OSPF compute routes?
A: Each router floods link-state advertisements listing its links and their costs. Every router assembles the same link-state database, runs Dijkstra's shortest path algorithm with itself as the root, and installs the next hop for each destination. Areas limit how far flooding spreads in large networks.

Q: Why is RIP limited to small networks?
A: It uses hop count as its metric with 16 meaning unreachable, so no path may be longer than 15 hops. It sends full tables every 30 seconds and converges slowly after failures, which does not scale to large networks.

## cn.network.bgp-overview
name: "BGP overview"
importance: advanced
prereqs: [cn.network.distance-vector-vs-link-state]
scope: "routing between networks on the internet"

### simple
BGP is how the independent networks that make up the internet tell each other which addresses they can reach. Each network announces its address blocks to its neighbors, who pass the news on, adding their own name to the route. It is like airlines publishing which cities they fly to and through which partners, while each airline chooses routes by its own business deals, not only by distance.

### interview
- **BGP** (Border Gateway Protocol, version 4) is the routing protocol **between autonomous systems** (ASes), each a network under one administration with an AS number.
- It is a **path vector** protocol: a route carries the full **AS path**, so a router rejects any route that already contains its own AS, preventing loops.
- Routes are chosen by **policy** first, then path: highest **local preference** (business relationships: customer routes over peers over paid transit), then shortest AS path, then other tie-breakers.
- Runs over **TCP port 179** between configured neighbors. **eBGP** between ASes, **iBGP** to share outside routes inside an AS.
- Failures and mistakes spread globally: **route leaks** and **hijacks** (announcing someone else's prefix, or a more specific one, which wins by longest prefix match). **RPKI** signs which AS may originate a prefix.
- The global table holds roughly a million IPv4 prefixes, which is why aggregation matters.

### deep
#### Why not OSPF for the whole internet?

Inside one organization, everyone agrees on the goal: shortest paths. Between organizations, the goal is policy: an ISP carries traffic for paying customers but not for free between two of its providers. Networks also refuse to reveal their internal topology. BGP exchanges only reachability ("I can reach 203.0.113.0/24 through this AS path") and lets each AS apply its own rules.

#### Worked example

AS 64500 hears three routes to `203.0.113.0/24`:

| via | AS path | relationship | local preference |
|---|---|---|---|
| neighbor X | 64510 64520 | customer | 200 |
| neighbor Y | 64530 64520 | peer | 100 |
| neighbor Z | 64540 64520 | transit provider | 50 |

All paths have length 2, but even if the peer's path were shorter, the customer route wins on local preference: it earns money, while traffic to a provider costs money. If the route through X disappeared, the peer route would take over, and each change is announced onward.

#### Hijacks

In 2008, a provider accidentally announced a more specific /24 inside YouTube's address block to the internet. Longest prefix match made routers everywhere prefer it, and YouTube became unreachable for much of the world for about two hours. RPKI lets routers reject announcements from an AS not authorized to originate a prefix, but adoption is still growing, and it does not stop every kind of path manipulation.

Connects to: distance vector vs link state, routing basics, subnetting and CIDR, what a network is.

### questions
Q: What is BGP and where is it used?
A: The Border Gateway Protocol exchanges reachability information between autonomous systems, the independently run networks that form the internet. ISPs, cloud providers and large organizations use it to announce their address prefixes and learn routes to everyone else's.

Q: Why is BGP called a path vector protocol?
A: Each route carries the list of autonomous systems it passes through. Routers use the path to detect loops, by rejecting routes that contain their own AS number, and as one input to route selection, alongside policy.

Q: How does BGP choose between routes?
A: Policy comes first, typically expressed as local preference based on business relationships, such as preferring customer routes over peer routes over paid transit. Among equally preferred routes, a shorter AS path wins, followed by further tie-breakers.

Q: What is a BGP hijack?
A: An AS announces a prefix it does not own, or a more specific part of one, by mistake or on purpose. Other networks accept it, and longest prefix match can make it win, so traffic is diverted or dropped. Route origin validation with RPKI and route filters reduce the risk.

## cn.network.ip-fragmentation-and-mtu
name: "IP fragmentation and MTU"
importance: advanced
scope: "IP fragmentation and MTU"

### simple
Every link has a maximum size for one packet, called the MTU, which is 1500 bytes on typical Ethernet. When a packet is too big for the next link, it has to be cut into fragments that are put back together at the destination, or the sender has to learn to send smaller packets. It is like moving a long table through a narrow door: take it apart and reassemble it, or buy a smaller table.

### interview
- **MTU** (maximum transmission unit): the largest IP packet a link carries; 1500 bytes on Ethernet, larger on jumbo-frame links (9000), smaller inside tunnels and VPNs.
- **IPv4 fragmentation**: a router (or the sender) splits a too-big packet; each fragment has its own IP header and shares the **identification** value, with the **MF** (more fragments) flag and a **fragment offset** in 8-byte units. Only the **destination** reassembles.
- If the **DF** (don't fragment) bit is set, the router drops the packet and sends ICMP "fragmentation needed" with the next-hop MTU: this is **path MTU discovery**.
- Fragmentation is costly: losing one fragment loses the whole packet, reassembly uses memory (a denial-of-service target), and firewalls cannot see ports in later fragments. So TCP avoids it with the **MSS** and PMTUD.
- **IPv6**: routers never fragment; the source uses a fragment extension header, and every link must carry at least **1280** bytes.
- **MSS clamping** on routers lowers the TCP MSS in handshakes when a tunnel shrinks the MTU.

### deep
#### Worked example

A 4000-byte IPv4 packet (20-byte header, 3980 bytes of data) meets a link with MTU 1500.

```cpp
int main() {
    int total = 4000, header = 20, mtu = 1500;
    int data = total - header;                           // 3980 bytes to carry
    int perFragment = (mtu - header) / 8 * 8;            // 1480, a multiple of 8
    for (int offset = 0; offset < data; offset += perFragment) {
        int len = min(perFragment, data - offset);
        bool more = offset + len < data;
        printf("fragment %4d bytes (data %4d), offset field %3d, MF=%d\n",
               len + header, len, offset / 8, more);
    }
}
```

Output:

```text
fragment 1500 bytes (data 1480), offset field   0, MF=1
fragment 1500 bytes (data 1480), offset field 185, MF=1
fragment 1040 bytes (data 1020), offset field 370, MF=0
```

The offset field counts 8-byte units, so 1480 bytes is 185 units and every fragment except the last must carry a multiple of 8 bytes. The destination collects fragments with the same identification, orders them by offset, and knows it has the end when MF is 0.

#### Path MTU discovery

TCP sets DF on its packets. If a link on the path has a smaller MTU, the router there drops the packet and returns ICMP "fragmentation needed, next-hop MTU 1400". The sender lowers its segment size and resends. When a firewall blocks that ICMP message, the sender never learns, and large packets vanish: the handshake works, small requests work, and big responses hang. **Packetization-layer PMTUD** probes sizes without relying on ICMP, and routers clamp the MSS in SYN packets to sidestep the problem.

Connects to: encapsulation, ICMP, IPv6, TCP reliability, firewalls, VPNs and proxies.

### questions
Q: What is the MTU and what happens when a packet exceeds it?
A: The maximum transmission unit is the largest packet a link can carry, 1500 bytes on standard Ethernet. In IPv4 a router can fragment a larger packet unless its don't-fragment bit is set, in which case it drops it and sends an ICMP fragmentation needed message. In IPv6 routers always drop and report too-big packets.

Q: How are IPv4 fragments reassembled?
A: Only the destination reassembles. Fragments share the original packet's identification number, carry their position in the fragment offset field in 8-byte units, and all but the last have the more fragments flag set. If any fragment is lost, the whole packet is discarded after a timeout.

Q: What is path MTU discovery?
A: The sender sets the don't-fragment bit, and any router that cannot forward a packet because it is too big returns an ICMP message with its link's MTU. The sender reduces its packet size accordingly, finding the smallest MTU on the path without relying on fragmentation.

Q: Why is fragmentation avoided?
A: Losing any fragment wastes the whole packet, reassembly costs memory at the receiver and is a target for attacks, and firewalls and load balancers cannot see port numbers in non-first fragments. TCP therefore uses an MSS that fits the path MTU.
