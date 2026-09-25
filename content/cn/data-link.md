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

### simple
The data link layer cuts the stream of bits into frames with clear start and end markers, and adds a check value so the receiver can tell if noise flipped any bits. It is like a bank account number with a check digit: if one digit is mistyped, the check no longer fits and the mistake is caught. Frames that fail the check are thrown away.

### interview
- **Framing** marks where each frame starts and ends: a **length field**, **flag bytes with byte stuffing** (PPP uses 0x7E and escapes it inside the data), **flags with bit stuffing** (HDLC inserts a 0 after five 1s), or physical-layer markers (Ethernet's preamble and gaps).
- **Parity bit**: one extra bit makes the count of 1s even (or odd). Detects any odd number of flipped bits, misses any even number. Two-dimensional parity can also locate and fix a single-bit error.
- **Internet checksum** (IP, TCP, UDP headers): ones' complement sum of 16-bit words, inverted. Cheap in software but weak: it misses swapped words and many multi-bit errors.
- **CRC** (cyclic redundancy check; Ethernet's 32-bit FCS): the frame is treated as a binary polynomial and divided by a generator; the remainder is sent. A CRC with an $r$-bit remainder catches every burst error of length $r$ or less and all odd numbers of errors (with a suitable generator). Fast in hardware.
- Detection is not correction: links usually **drop** bad frames and leave recovery to higher layers (TCP retransmits). Error-correcting codes (Hamming, Reed-Solomon, LDPC) are used where resending is costly, such as Wi-Fi, disks and space links.

### deep
#### Framing

A link carries a continuous stream of bits, so the receiver needs to know where one frame ends and the next begins.

| method | how it works | used by |
|---|---|---|
| length field | a header says how many bytes follow | Ethernet's length or type field, many application protocols |
| byte stuffing | a flag byte marks both ends; a flag byte in the data is escaped | PPP (flag 0x7E, escape 0x7D) |
| bit stuffing | flag 01111110; the sender inserts a 0 after any five 1s in the data | HDLC |
| physical coding | special signals or silence mark frame boundaries | Ethernet preamble and interframe gap |

#### Worked example: CRC by hand

Data 101110, generator 1001 (degree 3, so 3 check bits). Append three zeros and divide using XOR, with no carries:

| step | bits | action |
|---|---|---|
| start | 101110000 | data plus three zeros |
| 1 | 001010000 | XOR 1001 at position 0 |
| 2 | 000011000 | XOR 1001 at position 2 |
| 3 | 000001010 | XOR 1001 at position 4 |
| 4 | 000000011 | XOR 1001 at position 5 |

The remainder is 011, so the sender transmits 101110011. The receiver divides what it gets by 1001; a remainder of 0 means no detected error.

#### Code: three checks

```cpp
bool evenParity(const string& s) {                   // true when the count of 1 bits is even
    int ones = 0;
    for (unsigned char c : s) ones += popcount(c);
    return ones % 2 == 0;
}

uint16_t internetChecksum(const vector<uint8_t>& b) {
    uint32_t sum = 0;
    for (size_t i = 0; i < b.size(); i += 2)        // add 16-bit words
        sum += b[i] << 8 | (i + 1 < b.size() ? b[i + 1] : 0);
    while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);   // fold the carries back in
    return ~sum & 0xffff;
}

uint32_t crc32(const string& s) {                    // Ethernet's CRC-32, bit by bit
    uint32_t crc = 0xffffffff;
    for (unsigned char c : s) {
        crc ^= c;
        for (int k = 0; k < 8; ++k) crc = (crc >> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return ~crc;
}

int main() {
    cout << boolalpha << "parity of \"A\" even: " << evenParity("A") << "\n";   // 0x41 has two 1s
    vector<uint8_t> words = {0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7};
    printf("internet checksum: 0x%04x\n", internetChecksum(words));
    printf("crc32(\"123456789\") = 0x%08x\n", crc32("123456789"));
    printf("crc32(\"123456788\") = 0x%08x\n", crc32("123456788"));   // one bit differs
}
```

Output:

```text
parity of "A" even: true
internet checksum: 0x220d
crc32("123456789") = 0xcbf43926
crc32("123456788") = 0xbcf309b0
```

`0xcbf43926` is the standard check value for CRC-32, and changing a single bit of the input changes the CRC completely.

#### Why CRC for links

- Hardware computes it at line rate with a shift register and a few XOR gates.
- Noise on wires and radio arrives in **bursts**, and a CRC catches every burst up to its width (32 bits for Ethernet) plus nearly all longer ones.
- The Internet checksum is kept in IP, TCP and UDP because it is easy in software and those layers expect the link to have already filtered most errors.

#### Pitfalls

- Error **detection** codes do not fix anything; the frame is dropped and someone else must resend it.
- A checksum is not a security measure: an attacker can change the data and recompute it. Integrity against attackers needs a MAC or signature.
- Parity misses two flipped bits in the same unit, a common pattern in bursts.

Connects to: MAC addresses and Ethernet, flow control protocols, TCP reliability, hashing and digital signatures.

### questions
Q: How does a single parity bit detect errors, and what does it miss?
A: The sender adds one bit so the total number of 1 bits is even. The receiver counts the 1s; an odd count means an error. Any odd number of flipped bits is caught, but any even number, such as two flipped bits, leaves the parity unchanged and goes unnoticed.

Q: Why do link layers use CRC rather than a simple checksum?
A: A CRC detects all burst errors up to its width and nearly all longer ones, and noise on physical links tends to come in bursts. It is also cheap to compute in hardware with a shift register. A simple sum misses errors such as swapped words or bits that change in compensating ways.

Q: What happens when an Ethernet frame fails its CRC check?
A: The receiving interface silently drops it. Ethernet does not retransmit; recovery is left to higher layers, typically TCP, which notices the missing data and resends it.

Q: What is byte stuffing?
A: A framing method where a special flag byte marks the start and end of each frame. If the flag byte appears inside the data, the sender inserts an escape byte before it, and the receiver removes the escapes, so the data can never be mistaken for a frame boundary. PPP works this way.

## cn.data-link.mac-addresses-and-ethernet
name: "MAC addresses and Ethernet"
importance: must
scope: "frames, broadcast"

### simple
A MAC address is the hardware name of a network card, and Ethernet is the set of rules for sending frames between cards on the same local network. It is like the name on an apartment's mailbox: it gets a letter to the right door inside one building, while the street address (the IP address) gets it to the building. A frame sent to the special all-ones address reaches every card on the network.

### interview
- A **MAC address** is 48 bits, written as six hex bytes (`3c:22:fb:12:ab:cd`). The first 3 bytes are usually the manufacturer's **OUI**; the rest identify the card.
- Two flag bits in the first byte: the lowest bit set means **multicast** (group) and clear means **unicast**; the next bit set means **locally administered** (such as the random MACs phones use for privacy).
- **Broadcast** address `ff:ff:ff:ff:ff:ff` goes to every device in the **broadcast domain** (the LAN or VLAN); ARP and DHCP rely on it.
- Ethernet frame: preamble and start delimiter (8 bytes), destination MAC (6), source MAC (6), **EtherType** (2; 0x0800 IPv4, 0x86DD IPv6, 0x0806 ARP), payload (46 to 1500), **FCS** CRC-32 (4). Frames are 64 to 1518 bytes (1522 with a VLAN tag).
- MAC addresses matter **only on the local link**: each router hop builds a new frame with new MACs, while the IP addresses stay the same end to end.
- MACs are flat (no hierarchy), which is why they cannot route the internet; IP addresses are hierarchical.

### deep
#### Intuition

On one local network, devices need a way to name each other that works before anything else is configured. The MAC address is burned into the card (or picked by the operating system) and is unique enough that two devices on a LAN never share one. Ethernet is the frame format and set of rules that carries data between these cards.

#### The frame

```text
| preamble+SFD | dest MAC | src MAC | EtherType | payload        | FCS |
|    8 bytes   |    6     |    6    |     2     | 46 to 1500     |  4  |
```

- The **destination comes first**, so a switch or card can start deciding what to do before the whole frame has arrived.
- **EtherType** says what the payload is. Values of 1536 (0x0600) or more are types; values of 1500 or less are the old length meaning.
- The payload is padded to at least 46 bytes, so the frame is at least 64 bytes. That minimum came from shared-cable Ethernet, where a sender had to still be transmitting when a collision from the far end came back.
- The **FCS** is a CRC-32 over the frame; a bad frame is dropped.

#### Code: reading a MAC address

```cpp
array<uint8_t, 6> parseMac(const string& text) {
    array<uint8_t, 6> mac{};
    unsigned b[6];
    if (sscanf(text.c_str(), "%x:%x:%x:%x:%x:%x", &b[0], &b[1], &b[2], &b[3], &b[4], &b[5]) != 6)
        throw invalid_argument("bad MAC " + text);
    for (int i = 0; i < 6; ++i) mac[i] = b[i];
    return mac;
}

string describe(const array<uint8_t, 6>& m) {
    bool broadcast = all_of(m.begin(), m.end(), [](uint8_t b) { return b == 0xff; });
    if (broadcast) return "broadcast";
    if (m[0] & 1) return "multicast, a group address";          // I/G bit set
    if (m[0] & 2) return "unicast, locally administered";       // U/L bit set: no maker prefix
    char oui[9];
    snprintf(oui, sizeof oui, "%02x:%02x:%02x", m[0], m[1], m[2]);
    return "unicast, globally unique, OUI " + string(oui);
}

int main() {
    for (string s : {"3c:22:fb:12:ab:cd", "ff:ff:ff:ff:ff:ff", "01:00:5e:00:00:fb",
                     "da:a1:19:5b:02:7e"})
        cout << s << "  " << describe(parseMac(s)) << "\n";
}
```

Output:

```text
3c:22:fb:12:ab:cd  unicast, globally unique, OUI 3c:22:fb
ff:ff:ff:ff:ff:ff  broadcast
01:00:5e:00:00:fb  multicast, a group address
da:a1:19:5b:02:7e  unicast, locally administered
```

The third address is an IPv4 multicast MAC: `01:00:5e` followed by the low bits of the group address, here mDNS's 224.0.0.251. The last one has the locally administered bit set: a randomized address of the kind phones use on Wi-Fi so they cannot be tracked across networks, so its first bytes name no manufacturer.

#### Worked example: MACs change, IPs do not

A laptop (IP 192.168.1.23) sends a packet to a server (IP 203.0.113.9) through its home router.

| link | source MAC | destination MAC | source IP | destination IP |
|---|---|---|---|---|
| laptop to home router | laptop | router's LAN port | 192.168.1.23 | 203.0.113.9 |
| home router to ISP | router's WAN port | ISP router | public IP (after NAT) | 203.0.113.9 |
| last router to server | last router | server | public IP | 203.0.113.9 |

The laptop learns the router's MAC with ARP, because the server is not on its local network. Each hop replaces the frame; NAT aside, the IP header travels unchanged except for TTL and checksum.

#### Broadcast and its limits

A broadcast frame is delivered to every device in the broadcast domain, and switches flood it out of every port. That is how ARP and DHCP find things without prior configuration, but broadcasts do not scale: every host must process them. Routers stop broadcasts, and VLANs split a switch into several broadcast domains.

#### Pitfalls

- MAC addresses are not a security boundary: they can be changed in software and spoofed.
- A destination MAC is never a remote server's: for anything off the local network, it is the default gateway's.
- Modern Ethernet is switched and full duplex, so collisions and CSMA/CD no longer happen, but the frame format stayed.

Connects to: ARP, hubs, switches and routers, VLANs, encapsulation, CSMA/CD and CSMA/CA.

### questions
Q: What is a MAC address and how is it structured?
A: A 48-bit identifier for a network interface, written as six hexadecimal bytes. The first three bytes are usually the manufacturer's organizationally unique identifier and the rest identify the card. Two bits in the first byte mark multicast versus unicast and locally administered versus globally unique addresses.

Q: What are the fields of an Ethernet frame?
A: A preamble and start delimiter for synchronization, the 6-byte destination MAC, the 6-byte source MAC, a 2-byte EtherType saying what the payload is, the payload of 46 to 1500 bytes, and a 4-byte frame check sequence, a CRC-32 over the frame.

Q: Why does the destination MAC address change at every hop while the destination IP address does not?
A: MAC addresses only identify interfaces on one local link, so each router strips the incoming frame and builds a new one addressed to the next hop's MAC. The IP address identifies the final destination across networks, so it stays the same end to end, apart from NAT rewriting.

Q: What is a broadcast domain?
A: The set of devices that receive a frame sent to the broadcast address ff:ff:ff:ff:ff:ff. Switches flood broadcasts to all ports, so a whole LAN or VLAN is one broadcast domain. Routers do not forward broadcasts, so they bound it.

Q: Why can't the internet route packets by MAC address?
A: MAC addresses are flat: their value says nothing about where the device is. Routing by them would require every router to know every device in the world. IP addresses are hierarchical, so routers can store one entry for a whole block of addresses.

## cn.data-link.hubs-switches-and-routers
name: "Hubs, switches and routers"
importance: must
prereqs: [cn.data-link.mac-addresses-and-ethernet]
scope: "which layer each works at and why"

### simple
A hub copies everything it hears to every port, a switch learns which device sits on which port and sends each frame only there, and a router connects separate networks and picks the next hop toward the destination. A hub is like shouting in a room, a switch like an office receptionist who knows every desk, and a router like a post office that forwards mail to other towns.

### interview
- **Hub (layer 1)**: repeats bits out of every port; all devices share one **collision domain** and bandwidth, half duplex. Obsolete.
- **Switch (layer 2)**: reads destination MACs; **learns** which MAC is on which port from source addresses; **forwards** known unicast to one port, **floods** unknown unicast and broadcasts, **filters** frames whose destination is on the incoming port. Every port is its own collision domain, full duplex; the whole switch is one **broadcast domain** (per VLAN).
- **Router (layer 3)**: reads destination IPs, looks up the **longest prefix match** in its routing table, decrements TTL, and sends the packet out in a new frame. Each router interface is a separate **broadcast domain**; routers join different IP networks.
- Why the layer matters: a switch cannot join two IP subnets, and a router stops broadcasts. A **layer 3 switch** does both in hardware.
- A home "router" is a router, a small switch, a Wi-Fi access point, a NAT box and a DHCP server in one case.
- Switches with loops need **Spanning Tree Protocol** to block redundant links, or broadcast storms follow.

### deep
#### Intuition

Each device answers the question "where should this go?" using the information from one layer. A hub does not ask the question at all. A switch answers it with MAC addresses, which only make sense inside one LAN. A router answers it with IP addresses, which are hierarchical and work across networks.

#### Side by side

| | hub | switch | router |
|---|---|---|---|
| layer | 1, physical | 2, data link | 3, network |
| decides by | nothing | destination MAC | destination IP (longest prefix) |
| table | none | MAC table, learned | routing table, configured or from routing protocols |
| unknown destination | everything is flooded | flood out of all other ports | drop (or send to default route) |
| broadcasts | repeated | flooded | not forwarded |
| collision domains | one for all ports | one per port | one per port |
| broadcast domains | one | one (per VLAN) | one per interface |

#### How a switch learns

When a frame arrives, the switch records "source MAC is reachable through this port" (with an aging timer, usually 300 s). Then it looks up the destination MAC: forward if known, flood if unknown or broadcast, drop if it is on the same port it came from.

```cpp
struct Switch {
    int ports;
    unordered_map<string, int> table{};                  // MAC -> port

    void receive(int in, const string& src, const string& dst) {
        table[src] = in;                                 // learn from the source address
        cout << src << " -> " << dst << " on port " << in << ": ";
        auto it = table.find(dst);
        if (dst != "ff" && it != table.end()) {
            if (it->second == in) cout << "same port, filter\n";
            else cout << "forward to port " << it->second << "\n";
            return;
        }
        cout << (dst == "ff" ? "broadcast" : "unknown") << ", flood to ports";
        for (int p = 1; p <= ports; ++p)
            if (p != in) cout << " " << p;
        cout << "\n";
    }
};

int main() {
    Switch sw{4};
    sw.receive(1, "A", "B");                             // B not learned yet
    sw.receive(2, "B", "A");                             // A was learned from frame 1
    sw.receive(1, "A", "B");                             // now both are known
    sw.receive(3, "C", "ff");                            // broadcast
    sw.receive(1, "D", "A");                             // D shares port 1 with A (a hub there)
}
```

Output:

```text
A -> B on port 1: unknown, flood to ports 2 3 4
B -> A on port 2: forward to port 1
A -> B on port 1: forward to port 2
C -> ff on port 3: broadcast, flood to ports 1 2 4
D -> A on port 1: same port, filter
```

After two frames, traffic between A and B no longer bothers C or D. With a hub, every frame would have gone everywhere.

#### What a router does to each packet

1. Checks the IP header checksum and decrements the TTL (drops the packet and sends an ICMP message if it hits 0).
2. Finds the longest prefix in its routing table that matches the destination IP address.
3. Uses ARP (or its neighbor cache) to learn the next hop's MAC address.
4. Builds a new frame on the outgoing interface and sends it.

The router never forwards broadcasts, which is what keeps a broadcast in one office from reaching the whole internet.

#### Pitfalls

- "A switch makes each port a separate broadcast domain": no, each port is a separate collision domain; broadcast domains are split by routers or VLANs.
- Two switches cabled in a loop without Spanning Tree forward a broadcast forever: frames have no TTL at layer 2.
- Devices on different subnets behind the same switch cannot talk directly; they need a router (or a layer 3 switch) between the subnets.

Connects to: MAC addresses and Ethernet, ARP, VLANs, routing basics, OSI model.

### questions
Q: What is the difference between a hub, a switch and a router?
A: A hub works at layer 1 and repeats every bit to all ports. A switch works at layer 2, learns which MAC address is on which port, and forwards frames only where they need to go. A router works at layer 3, forwards packets between different IP networks by looking up the destination address in its routing table, and does not forward broadcasts.

Q: How does a switch learn where devices are?
A: For every incoming frame, it records the source MAC address against the port it arrived on, with an aging timer. For the destination, it forwards to the learned port, or floods out of all other ports if the address is unknown or broadcast. Replies then teach it the other side.

Q: What are collision domains and broadcast domains, and which devices split them?
A: A collision domain is the set of devices whose transmissions can collide on a shared medium; a switch or router port starts a new one, while a hub does not. A broadcast domain is the set of devices that receive each other's broadcasts; only routers and VLANs split it.

Q: Why is Spanning Tree Protocol needed?
A: Redundant links between switches create loops, and Ethernet frames have no TTL, so a broadcast would circulate and multiply forever, a broadcast storm. Spanning Tree picks a loop-free tree of active links and blocks the rest, unblocking them if an active link fails.

Q: What is a layer 3 switch?
A: A switch that can also route between IP subnets or VLANs in hardware, at switching speed. It is common inside campuses and data centers, where most traffic moves between local subnets rather than out to a WAN.

## cn.data-link.arp
name: "ARP"
importance: must
prereqs: [cn.data-link.mac-addresses-and-ethernet]
scope: "mapping IP addresses to MAC addresses"

### simple
ARP is how a device finds the hardware address that belongs to an IP address on its local network. It shouts to everyone on the network, "who has 192.168.1.1?", and the owner answers with its MAC address. It is like calling out a name in a waiting room and letting the right person raise their hand, then remembering their face for next time.

### interview
- **Address Resolution Protocol** maps an IPv4 address to a MAC address **on the same link**; frames need a destination MAC, packets only give an IP.
- **Request** is broadcast ("who has 192.168.1.1? tell 192.168.1.23"); the **reply** is unicast back with the MAC. Both sides cache the result.
- The **ARP cache** keeps entries for seconds to minutes (Linux marks them stale after about 30 s without confirmation); view it with `ip neigh`.
- For a destination **outside the subnet**, the host ARPs for its **default gateway**, not for the remote host.
- **Gratuitous ARP**: a host announces its own IP-to-MAC mapping, to detect duplicate addresses or to move an IP address to a new machine during failover.
- ARP has **no authentication**: **ARP spoofing** lets an attacker claim the gateway's IP address and sit in the middle. IPv6 replaces ARP with **Neighbor Discovery** (ICMPv6 over multicast).

### deep
#### Intuition

IP gives every host a logical address, but Ethernet can only deliver a frame to a MAC address. ARP bridges the gap, one link at a time, and only when needed: the first packet to a neighbor triggers a lookup, and later packets use the cache.

#### The exchange

```text
laptop 192.168.1.23 (aa:aa:aa:aa:aa:aa)            router 192.168.1.1 (bb:bb:bb:bb:bb:bb)

  -> broadcast to ff:ff:ff:ff:ff:ff, EtherType 0x0806
     "who has 192.168.1.1? tell 192.168.1.23 at aa:aa:aa:aa:aa:aa"
                                    <- unicast to aa:aa:aa:aa:aa:aa
                                       "192.168.1.1 is at bb:bb:bb:bb:bb:bb"
```

The router also caches the laptop's mapping from the request, since it will probably need to reply. An ARP packet over Ethernet is 28 bytes: hardware and protocol types, the operation (1 request, 2 reply), and the sender's and target's MAC and IP addresses.

#### Deciding whom to ARP for

The key interview point is that a host ARPs for the destination only when it is on the same subnet. Otherwise the frame goes to the gateway.

```cpp
uint32_t ip(const char* s) {
    in_addr a{};
    inet_pton(AF_INET, s, &a);
    return ntohl(a.s_addr);
}

struct Host {
    uint32_t addr, mask, gateway;
    map<uint32_t, string> cache;                          // the ARP cache
    map<uint32_t, string> lan;                            // who would answer on this link

    string nextHopMac(uint32_t dst) {
        bool local = (dst & mask) == (addr & mask);       // same subnet?
        uint32_t target = local ? dst : gateway;
        in_addr t{htonl(target)};
        cout << (local ? "local, " : "remote, via gateway, ") << "ARP for " << inet_ntoa(t);
        if (auto it = cache.find(target); it != cache.end()) {
            cout << ": cache hit\n";
            return it->second;
        }
        cout << ": broadcast request, reply " << lan[target] << "\n";
        return cache[target] = lan[target];
    }
};

int main() {
    Host h{ip("192.168.1.23"), ip("255.255.255.0"), ip("192.168.1.1"), {}, {}};
    h.lan[ip("192.168.1.1")] = "bb:bb:bb:bb:bb:bb";
    h.lan[ip("192.168.1.40")] = "cc:cc:cc:cc:cc:cc";
    h.nextHopMac(ip("192.168.1.40"));                     // printer on the same LAN
    h.nextHopMac(ip("203.0.113.9"));                      // a web server far away
    h.nextHopMac(ip("198.51.100.7"));                     // another remote host
}
```

Output:

```text
local, ARP for 192.168.1.40: broadcast request, reply cc:cc:cc:cc:cc:cc
remote, via gateway, ARP for 192.168.1.1: broadcast request, reply bb:bb:bb:bb:bb:bb
remote, via gateway, ARP for 192.168.1.1: cache hit
```

Every remote destination uses the gateway's MAC, so one ARP entry serves the whole internet.

#### Gratuitous ARP and failover

When a backup server takes over a virtual IP address, it broadcasts a gratuitous ARP ("192.168.1.50 is at my MAC"). Switches and hosts update their tables immediately instead of waiting for old cache entries to expire. Hosts also send one at boot to check that nobody else uses their address.

#### ARP spoofing

Any host can send an unsolicited reply claiming to be the gateway. Victims update their caches and send their traffic to the attacker, who forwards it on: a man-in-the-middle position on the LAN. Defenses: switches with **Dynamic ARP Inspection** (checked against DHCP leases), static entries for critical hosts, and above all encryption (TLS), so intercepted traffic is useless.

#### Pitfalls

- ARP does not cross routers: each link does its own resolution.
- A wrong subnet mask makes a host ARP for remote addresses (no answer) or send local traffic to the gateway.
- After replacing a machine or network card, old ARP cache entries can send traffic to the old MAC until they expire.

Connects to: MAC addresses and Ethernet, subnetting and CIDR, DHCP, IPv6, common attacks.

### questions
Q: What does ARP do and why is it needed?
A: It finds the MAC address that belongs to an IPv4 address on the local network. Packets are addressed by IP, but Ethernet frames must carry a destination MAC, so before sending a frame to a neighbor, a host needs that mapping.

Q: Walk through an ARP exchange.
A: The sender broadcasts a request to ff:ff:ff:ff:ff:ff asking who has a given IP address, including its own IP and MAC. The owner of that IP replies directly to the sender with its MAC. Both cache the mapping for later packets.

Q: When a host sends a packet to a server on another network, whose MAC address does it ARP for?
A: Its default gateway's. The host sees that the destination is outside its subnet by comparing addresses under the subnet mask, so it sends the frame to the router, which forwards the packet onward and does its own ARP on the next link.

Q: What is gratuitous ARP used for?
A: A host broadcasts an ARP message announcing its own IP-to-MAC mapping without being asked. It is used to detect duplicate IP addresses at startup and to update everyone's caches quickly when an IP address moves to another machine during failover.

Q: What is ARP spoofing and how can it be mitigated?
A: An attacker sends forged ARP replies claiming another host's IP address, usually the gateway's, so victims send their traffic to the attacker. Mitigations include dynamic ARP inspection on switches, static ARP entries for critical hosts, and end-to-end encryption such as TLS so intercepted traffic cannot be read or altered.

## cn.data-link.flow-control-protocols
name: "Flow control protocols"
importance: important
prereqs: [cn.data-link.framing-and-error-detection]
scope: "stop-and-wait, Go-Back-N, Selective Repeat"

### simple
These protocols control how many frames a sender may send before hearing back, and how to recover lost ones. Stop-and-wait sends one and waits for a reply, like handing someone one plate at a time. Go-Back-N and Selective Repeat keep several frames in flight, like a conveyor belt, and differ in how much they resend after a loss.

### interview
- **Stop-and-wait**: send one frame, wait for its ACK, resend on timeout; a 1-bit sequence number tells a retransmission from a new frame. Simple, but utilization is tiny when the round trip is long: $U = \frac{T_{t}}{T_{t} + RTT}$.
- **Sliding window**: up to $W$ unacknowledged frames in flight, so $U = \min\left(1, \frac{W \cdot T_{t}}{T_{t} + RTT}\right)$.
- **Go-Back-N**: the receiver accepts only in-order frames and sends **cumulative ACKs**; on timeout the sender resends the lost frame **and everything after it**. With $k$-bit sequence numbers, $W \le 2^k - 1$.
- **Selective Repeat**: the receiver **buffers out-of-order** frames and ACKs each one; the sender resends **only** the lost frame. Needs a receive buffer and $W \le 2^{k-1}$ so old and new frames cannot be confused.
- GBN is simpler and fine on clean links; SR wastes less bandwidth when losses are common or the window is large. TCP mixes both: cumulative ACKs plus selective acknowledgements (SACK).

### deep
#### Why windows

On a long, fast link, stop-and-wait spends almost all its time waiting.

```cpp
int main() {
    double rate = 1e9;                               // 1 Gbps
    double frameBits = 1500 * 8;
    double rtt = 30e-3;                              // 30 ms round trip
    double tt = frameBits / rate;                    // 12 microseconds to send one frame
    for (int w : {1, 100, 2500, 5000}) {
        double u = min(1.0, w * tt / (tt + rtt));
        printf("window %4d: utilization %.4f%%\n", w, u * 100);
    }
}
```

Output:

```text
window    1: utilization 0.0400%
window  100: utilization 3.9984%
window 2500: utilization 99.9600%
window 5000: utilization 100.0000%
```

A window of about 2500 frames (the bandwidth-delay product divided by the frame size) is needed to keep this link busy.

#### Worked example: one lost frame

Window 4, frames 0 to 7, frame 2 lost once.

| | Go-Back-N | Selective Repeat |
|---|---|---|
| first sends | 0 1 2 3, then 4 and 5 as ACKs for 0 and 1 return | same |
| receiver on 3, 4, 5 | discards them (out of order), repeats ACK for 1 | buffers them, ACKs each |
| on frame 2's timeout | resends 2 3 4 5 | resends only 2 |
| then | 6 7 | 2 fills the gap; 2 to 5 are delivered; then 6 7 |
| total transmissions | 12 | 9 |

#### Why the window has a size limit

With 2-bit sequence numbers (0 to 3):

- **GBN with W = 4** fails: the sender sends 0 1 2 3; all four ACKs are lost; it resends 0. The receiver, now expecting the next frame numbered 0, accepts the old frame 0 as new. With W = 3 it would expect 3, so the duplicate 0 is rejected.
- **SR with W = 3** fails: the receiver accepts 0 1 2 and moves its window to 3 0 1. If the ACKs were lost and the sender resends the old 0, the receiver buffers it as a new 0. With W = 2 the windows cannot overlap that way.

Hence $W \le 2^k - 1$ for GBN and $W \le 2^{k-1}$ for SR.

#### Where these live today

Wired Ethernet does no retransmission at all. Wi-Fi uses stop-and-wait style per-frame ACKs at the link layer, and newer Wi-Fi acknowledges blocks of frames. The ideas matter most in **TCP**, which uses a byte-level sliding window, cumulative ACKs like GBN, selective acknowledgements like SR, and a receive window for flow control.

Connects to: framing and error detection, TCP reliability, TCP flow control, bandwidth, latency and throughput.

### questions
Q: Why is stop-and-wait inefficient on long links?
A: The sender transmits one frame and then sits idle for a full round trip waiting for the acknowledgement. When the round trip is much longer than the time to send a frame, the link is idle almost all the time; on a 1 Gbps link with a 30 ms round trip, utilization is about 0.04 percent.

Q: How do Go-Back-N and Selective Repeat differ when a frame is lost?
A: In Go-Back-N the receiver discards out-of-order frames and acknowledges cumulatively, so the sender resends the lost frame and every frame after it. In Selective Repeat the receiver buffers out-of-order frames and acknowledges each one, so the sender resends only the lost frame.

Q: What is the maximum window size for Go-Back-N and Selective Repeat with k-bit sequence numbers?
A: Go-Back-N allows at most 2^k minus 1 frames, and Selective Repeat at most 2^(k-1) frames, half the sequence space. Larger windows let a retransmitted old frame be mistaken for a new frame with the same number.

Q: When would you prefer Selective Repeat over Go-Back-N?
A: When losses are frequent or the window is large, since Go-Back-N resends a whole window for each loss. Selective Repeat costs receiver buffer space and more complex bookkeeping, so Go-Back-N is fine on clean links with small windows.

## cn.data-link.csma-cd-and-csma-ca
name: "CSMA/CD and CSMA/CA"
importance: advanced
prereqs: [cn.data-link.mac-addresses-and-ethernet]
scope: "medium access control"

### simple
When many devices share one cable or radio channel, they need rules so they do not all talk at once. Carrier sense means listening before speaking, like people in a meeting waiting for a pause. Classic Ethernet then detects collisions and retries after a random wait, while Wi-Fi tries to avoid collisions up front, because a radio cannot hear others while it is transmitting.

### interview
- **CSMA** (carrier sense multiple access): listen first, transmit only when the medium is idle. Collisions still happen because a signal takes time to travel.
- **CSMA/CD** (collision detection, classic shared Ethernet): keep listening while sending; on a collision, send a **jam** signal and back off. **Binary exponential backoff**: after the $n$th collision, wait $K$ slot times with $K$ random in $[0, 2^{\min(n,10)} - 1]$; give up after 16 attempts.
- The **minimum frame of 64 bytes** (512 bits, one slot time) makes sure a sender is still transmitting when a collision from the far end returns.
- **CSMA/CA** (collision avoidance, Wi-Fi): a radio cannot detect collisions while sending, and some stations cannot hear each other (the **hidden terminal** problem). So stations wait a gap plus a random backoff before sending, the receiver **ACKs** every frame, and optional **RTS/CTS** reserves the channel.
- Modern switched, full-duplex Ethernet has no shared medium, so CSMA/CD is effectively unused; CSMA/CA is still how Wi-Fi works.

### deep
#### Binary exponential backoff

Two stations that collide both pick a random wait. After the first collision each picks 0 or 1 slot: they collide again with probability 1/2. After the second, each picks from 0 to 3: probability 1/4, and so on. The expected number of rounds is exact to compute:

```cpp
int main() {
    double pStillColliding = 1, expectedRounds = 0;
    for (int n = 1; n <= 16; ++n) {                   // round n follows the nth collision
        expectedRounds += pStillColliding;            // round n happens if all earlier failed
        int choices = 1 << min(n, 10);                // K in [0, 2^min(n,10) - 1]
        pStillColliding *= 1.0 / choices;             // both pick the same K
    }
    printf("expected backoff rounds for two stations: %.4f\n", expectedRounds);
}
```

It prints 1.6416: two colliding stations usually sort themselves out in one or two rounds. With many stations the ranges grow until collisions become rare, which is how the scheme adapts to load without knowing it.

#### Why a minimum frame size

At 10 Mbps, 512 bits take 51.2 µs, the slot time, sized to cover a signal's round trip across the largest allowed network. If a frame were shorter, a sender could finish before the collision news came back and wrongly believe the frame got through. That is why Ethernet pads short payloads to 46 bytes.

#### Hidden terminals and RTS/CTS

```text
   A  ----  AP  ----  C        A and C both reach the access point,
   (A cannot hear C)           but not each other
```

A and C both sense an idle channel and transmit, colliding at the access point. With **RTS/CTS**, A sends a short Request To Send; the access point answers with Clear To Send, which C hears too, so C stays quiet for the stated duration (its network allocation vector). The cost is extra overhead, so RTS/CTS is used mostly for large frames.

#### Today

Switched Ethernet gives each device a dedicated, full-duplex link to a switch port, so there is nothing to collide with. Wi-Fi still shares the air, and newer Wi-Fi generations add scheduling (OFDMA) on top of CSMA/CA to cut contention in crowded places.

Connects to: MAC addresses and Ethernet, hubs, switches and routers, network topologies.

### questions
Q: How does CSMA/CD work?
A: A station listens and transmits only when the cable is idle, then keeps listening while sending. If it detects a collision, it sends a jam signal, stops, and waits a random backoff before retrying, with the backoff range doubling after each collision up to a limit.

Q: Why does Wi-Fi use CSMA/CA instead of CSMA/CD?
A: A radio cannot reliably hear other transmissions while it is sending, and some stations cannot hear each other at all, the hidden terminal problem. So Wi-Fi avoids collisions instead: stations wait a gap and a random backoff before sending, receivers acknowledge every frame, and RTS/CTS can reserve the channel.

Q: What is binary exponential backoff?
A: After the nth collision, a station waits a random number of slot times chosen from 0 to 2^n minus 1, with n capped at 10, and gives up after 16 attempts. Doubling the range spreads out retries as contention grows.

Q: Why does classic Ethernet have a 64-byte minimum frame size?
A: So a sender is still transmitting when news of a collision at the far end of the cable can return. The minimum frame of 512 bits matches the slot time, the worst-case round trip on a maximum-size shared segment.

## cn.data-link.vlans
name: "VLANs"
importance: advanced
prereqs: [cn.data-link.hubs-switches-and-routers]
scope: "logical network separation"

### simple
A VLAN splits one physical switch into several separate virtual networks, so devices on different VLANs cannot see each other's traffic even when plugged into the same box. It is like one office building where different companies rent floors: they share the elevator shafts, but each company's rooms are private. Traffic between VLANs has to go through a router, like visitors checking in at reception.

### interview
- A **VLAN** is a separate **broadcast domain** on shared switches: broadcasts, unknown unicasts and ARP stay inside it.
- **Access port**: belongs to one VLAN, frames are untagged (a normal PC). **Trunk port**: carries many VLANs between switches, each frame tagged.
- **802.1Q tag**: 4 bytes inserted after the source MAC: TPID 0x8100, 3-bit priority (PCP), 1-bit DEI, **12-bit VLAN ID** (1 to 4094 usable). The max frame grows to 1522 bytes.
- Traffic **between VLANs** needs routing: a router with one subinterface per VLAN ("router on a stick") or a layer 3 switch.
- Uses: separate staff, guests, phones and servers; limit broadcast size; apply security policies at the router between them.
- 4094 is too few for large clouds, so data centers use overlays such as **VXLAN** (a 24-bit ID, about 16 million segments, carried over UDP).

### deep
#### The 802.1Q tag

```text
| dest MAC | src MAC | 0x8100 | PCP(3) DEI(1) VID(12) | EtherType | payload | FCS |
                      \______ 4-byte tag __________/
```

```cpp
struct Tag { int pcp, dei, vid; };

array<uint8_t, 4> encode(Tag t) {
    uint16_t tci = t.pcp << 13 | t.dei << 12 | t.vid;          // tag control information
    return {0x81, 0x00, uint8_t(tci >> 8), uint8_t(tci & 0xff)};
}

Tag decode(const array<uint8_t, 4>& b) {
    int tci = b[2] << 8 | b[3];
    return {tci >> 13, tci >> 12 & 1, tci & 0xfff};
}

int main() {
    auto bytes = encode({5, 0, 20});                             // voice priority 5, VLAN 20
    printf("tag bytes: %02x %02x %02x %02x\n", bytes[0], bytes[1], bytes[2], bytes[3]);
    Tag t = decode(bytes);
    printf("pcp %d, dei %d, vlan %d\n", t.pcp, t.dei, t.vid);
}
```

Output:

```text
tag bytes: 81 00 a0 14
pcp 5, dei 0, vlan 20
```

#### Worked example

One 24-port switch: ports 1 to 10 in VLAN 10 (staff, 10.0.10.0/24), ports 11 to 20 in VLAN 20 (phones, 10.0.20.0/24), port 24 a trunk to the router.

- A staff laptop's ARP broadcast reaches only ports 1 to 10 and the trunk (tagged 10).
- A phone cannot reach a staff laptop at layer 2. Its packet goes to its gateway (the router's VLAN 20 subinterface), up the trunk tagged 20, is routed, and comes back down tagged 10. The router can apply firewall rules on the way.

#### Pitfalls

- **Native VLAN**: untagged frames on a trunk belong to the native VLAN. Mismatched native VLANs leak traffic between VLANs, and **double tagging** attacks abuse it; use an unused VLAN as native.
- Forgetting that a VLAN is also a separate IP subnet: hosts in different VLANs need a gateway.
- A trunk that does not allow a VLAN silently cuts that VLAN off beyond it.

Connects to: hubs, switches and routers, MAC addresses and Ethernet, subnetting and CIDR, firewalls, VPNs and proxies.

### questions
Q: What problem do VLANs solve?
A: They split one physical switched network into several isolated broadcast domains. Different groups, such as staff, guests and phones, can share switches while their broadcasts and layer 2 traffic stay separate, and traffic between groups must pass through a router where it can be filtered.

Q: What is the difference between an access port and a trunk port?
A: An access port belongs to a single VLAN and sends untagged frames, for end devices. A trunk port carries frames from many VLANs between switches or to a router, and marks each frame with an 802.1Q tag that names its VLAN.

Q: How do devices in two different VLANs communicate?
A: Through a layer 3 device. A router with a subinterface per VLAN on a trunk, or a layer 3 switch, acts as each VLAN's gateway and routes packets between the subnets.

Q: What is in an 802.1Q tag and how many VLANs can it address?
A: A 4-byte tag with the type 0x8100, a 3-bit priority, a 1-bit drop eligible indicator and a 12-bit VLAN id. The 12 bits give 4096 values, of which 0 and 4095 are reserved, leaving 4094 usable VLANs.
