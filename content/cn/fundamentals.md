---
topic: cn.fundamentals
name: "Network fundamentals"
subject: cn
order: 1
prereqs: []
---

## cn.fundamentals.what-a-network-is
name: "What a network is"
importance: must
scope: "nodes, links, LAN, WAN, the internet"

### simple
A network is a set of devices, called nodes, joined by links so they can send each other data. It works like a road system: houses and junctions are the nodes, the roads are the links, and agreed traffic rules let everyone get where they are going. A small network covers one home or office, a big one spans cities, and the internet is millions of these networks joined together.

### interview
- A **network** is nodes connected by links that exchange data using agreed rules called **protocols**. **Hosts** (end systems: laptops, phones, servers) run applications; **routers and switches** forward data between them.
- A **link** is a physical or radio medium: copper, fiber, Wi-Fi, cellular. Each has a speed (bandwidth) and a delay.
- **LAN** (local area network): one building or campus, owned by one organization, fast and cheap per bit (Ethernet, Wi-Fi). **WAN** (wide area network): spans cities or countries over leased or provider links. Also heard: **PAN** (Bluetooth around one person) and **MAN** (a city).
- The **internet** is a network of networks: independent networks (ISPs, companies, universities), each an **autonomous system**, joined by routers that speak common protocols (IP everywhere, BGP between networks).
- The **edge** is hosts and access networks (home broadband, cellular); the **core** is the mesh of high-speed routers and links that carries traffic between them.
- Data moves as **packets**: chunks with headers carrying addresses, forwarded hop by hop.

### deep
#### Intuition

Two computers joined by one cable already form a network. Everything else in networking answers the questions that appear as the network grows: how do you name each machine (addresses), how do you find a path when there are many cables (routing), how do you share one cable fairly (medium access), and how do you cope when data gets lost (reliability)?

#### The pieces

| piece | what it is | examples |
|---|---|---|
| host | an end system that runs applications | laptop, phone, web server |
| link | a medium that carries bits between two or more nodes | Ethernet cable, fiber, Wi-Fi radio |
| switch | forwards frames between hosts on the same local network | the box in an office rack |
| router | forwards packets between different networks | your home router, ISP core routers |
| protocol | the rules for a conversation: message formats and what to do on each message | IP, TCP, HTTP |

#### LAN, WAN and the internet

A **LAN** is a network one organization owns in one place, such as a home, an office floor or a data center. Links are short, fast (1 to 100 Gbps) and cheap. A **WAN** connects LANs that are far apart, using links leased from carriers, so it is slower per dollar and has more delay.

The **internet** is not one network. It is tens of thousands of independently run networks, each an autonomous system with its own number, that agree to exchange traffic. Your home network connects to an access ISP, which connects to regional and global ISPs, content providers and exchange points. No one controls the whole thing; the shared protocols (IP for addressing and forwarding, BGP for routes between networks) make it one system.

#### Worked example: a message across the internet

Your laptop sends a chat message to a friend in another country:

1. The laptop hands the packet to the Wi-Fi access point (the LAN).
2. The home router forwards it to the ISP over the access link (cable, fiber or DSL).
3. ISP routers forward it across their backbone, then to another network at an exchange point.
4. More routers forward it hop by hop until it reaches the friend's ISP, their home router and their phone.

Each router looks only at the destination address and picks the next hop; none of them knows the whole path.

#### Code: the network interfaces of this machine

Every host joins a network through one or more **interfaces**, each with an address and a mask that says which addresses are on the same local network.

```cpp
#include <ifaddrs.h>
#include <arpa/inet.h>

int main() {
    ifaddrs* list = nullptr;
    if (getifaddrs(&list) != 0) return 1;
    for (ifaddrs* p = list; p; p = p->ifa_next) {
        if (!p->ifa_addr || p->ifa_addr->sa_family != AF_INET) continue;   // IPv4 only
        char ip[INET_ADDRSTRLEN], mask[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &((sockaddr_in*)p->ifa_addr)->sin_addr, ip, sizeof ip);
        inet_ntop(AF_INET, &((sockaddr_in*)p->ifa_netmask)->sin_addr, mask, sizeof mask);
        cout << p->ifa_name << "  " << ip << "  mask " << mask << "\n";
    }
    freeifaddrs(list);
}
```

On the cloud machine used to test it, it printed two lines: `lo 127.0.0.1 mask 255.0.0.0` (loopback, a virtual network inside the machine) and `eth0 192.0.2.2 mask 255.255.255.0` (its Ethernet interface). A laptop shows its Wi-Fi interface instead, such as `wlan0 192.168.1.23 mask 255.255.255.0`, its address on the home LAN.

#### Common mix-ups

- The internet and the web are different: the web (HTTP and browsers) is one application running on the internet, alongside email, video calls and games.
- A switch and a router are not the same box: switches work inside one LAN, routers join networks. Home "routers" contain both, plus a Wi-Fi access point.
- A bigger bandwidth does not shorten the distance: the delay across an ocean stays tens of milliseconds whatever the link speed.

Connects to: OSI model, TCP/IP model, hubs, switches and routers, IPv4 addressing, routing basics.

### questions
Q: What is the difference between a LAN and a WAN?
A: A LAN covers a small area such as a home, office or data center, is owned by one organization, and has fast, cheap links like Ethernet and Wi-Fi. A WAN connects networks across cities or countries over carrier links, with more delay and higher cost per bit. The internet is the largest WAN.

Q: What does it mean that the internet is a network of networks?
A: It is made of many independently run networks, such as ISPs, companies and universities, each an autonomous system. They connect to each other and exchange traffic using shared protocols: IP for addressing and forwarding, and BGP to exchange routes between networks. No single network or owner controls it.

Q: What is the difference between the network edge and the network core?
A: The edge is the hosts, meaning laptops, phones and servers that run applications, plus the access networks that connect them. The core is the mesh of high-speed routers and links that forwards packets between access networks. Applications run only at the edge.

Q: Is the internet the same thing as the web?
A: No. The internet is the global infrastructure that carries packets between hosts. The web is one application on top of it, built from HTTP, browsers and web servers. Email, DNS, video calls and online games also run over the internet without being the web.

## cn.fundamentals.osi-model
name: "OSI model"
importance: must
prereqs: [cn.fundamentals.what-a-network-is]
scope: "the seven layers and what each is responsible for"

### simple
The OSI model splits the job of sending data into seven layers, each doing one task and relying on the layer below it. Posting a letter works the same way: you write it, put it in an envelope with an address, the post office sorts it, and trucks carry it, and nobody needs to understand the whole chain. Each layer only talks to its matching layer on the other side, through the layers underneath.

### interview
- Seven layers, bottom to top: **1 Physical** (bits as signals), **2 Data link** (frames between neighbors, MAC addresses), **3 Network** (packets across networks, IP addresses, routing), **4 Transport** (process to process: ports, reliability; TCP, UDP), **5 Session** (opening and managing dialogues), **6 Presentation** (data format, encoding, compression, encryption), **7 Application** (services used by applications: HTTP, DNS, SMTP).
- Units: bits (1), **frames** (2), **packets** (3), **segments** for TCP or **datagrams** for UDP (4), data or messages (5 to 7).
- Devices: hubs and repeaters work at layer 1, switches at 2, routers at 3; firewalls and load balancers at 3 and 4, or at 7 when they read HTTP.
- Each layer adds its own header going down (encapsulation) and removes it going up; a layer on one host talks logically to the **same layer** on the other host.
- OSI is a **reference model** for teaching and troubleshooting; the internet actually runs on the TCP/IP model, where layers 5 to 7 collapse into the application.
- Mnemonic from layer 1 up: "Please Do Not Throw Sausage Pizza Away".

### deep
#### Intuition

Layering means each part of the system solves one problem and trusts the layer below for everything else. The web browser does not care whether bits travel over Wi-Fi or fiber; Ethernet does not care whether it carries a video or an email. Because each layer has a fixed interface, you can replace one (Wi-Fi instead of cable, HTTP/3 instead of HTTP/2) without touching the others.

#### The seven layers

| # | layer | responsibility | unit | examples |
|---|---|---|---|---|
| 7 | Application | network services for applications | message | HTTP, DNS, SMTP, FTP |
| 6 | Presentation | data representation: encoding, compression, encryption | message | character sets, JPEG, TLS (often placed here) |
| 5 | Session | starting, managing and ending dialogues between applications | message | RPC sessions, checkpoints in long transfers |
| 4 | Transport | process-to-process delivery: ports, reliability, flow and congestion control | segment or datagram | TCP, UDP |
| 3 | Network | host-to-host delivery across networks: logical addressing and routing | packet | IP, ICMP |
| 2 | Data link | node-to-node delivery on one link: framing, MAC addresses, error detection | frame | Ethernet, Wi-Fi |
| 1 | Physical | bits as electrical, light or radio signals; connectors, timing | bit | cables, fiber, radio, hubs |

The key split to remember: layer 2 moves data **one hop**, layer 3 moves it **end to end across hops**, and layer 4 delivers it to the right **process** on the end host.

#### Worked example: loading a page

| step | layer | what happens on your laptop |
|---|---|---|
| 1 | 7 | the browser builds an HTTP request `GET /news` |
| 2 | 6 | TLS encrypts the request |
| 3 | 5 | the browser reuses an open session to the server |
| 4 | 4 | TCP puts the bytes in a segment with source port 51000 and destination port 443 |
| 5 | 3 | IP wraps it in a packet from your IP address to the server's IP address |
| 6 | 2 | Ethernet or Wi-Fi wraps it in a frame addressed to your router's MAC address |
| 7 | 1 | the network card turns the frame into radio or electrical signals |

Each router on the way climbs only to layer 3: it reads the IP header, picks the next hop and builds a new layer 2 frame for the next link. At the server the stack is climbed back up to layer 7, and each layer strips the header its peer added.

#### How interviews use it

- "At which layer does X work?" Hub 1, switch 2, router 3, TCP 4, HTTP 7. An L4 load balancer routes by IP address and port; an L7 load balancer reads the HTTP request.
- **Troubleshooting bottom-up**: is the cable or Wi-Fi up (1)? Do we get frames from the router (2)? Can we ping the gateway and a remote IP address (3)? Is the port open (4)? Does the application answer (7)?
- **Where does TLS live?** It does not fit neatly: it runs on top of TCP and below HTTP, so people place it at layers 5 or 6. Saying "between transport and application" is the honest answer.

#### Pitfalls

- Treating OSI as how the internet is built: it is a vocabulary. Real protocols blur 5 and 6 into the application, and some sit between layers (ARP between 2 and 3, ICMP next to IP).
- Mixing up units: a TCP segment inside an IP packet inside an Ethernet frame, never the other way.
- Thinking a layer can read everything: a router at layer 3 does not need to parse HTTP, and with TLS it cannot.

Connects to: TCP/IP model, encapsulation, hubs, switches and routers, load balancers, HTTPS and TLS.

### questions
Q: Name the seven OSI layers and one responsibility of each.
A: Physical sends bits as signals; data link frames data and delivers it across one link using MAC addresses; network routes packets across networks using IP addresses; transport delivers data between processes using ports, with reliability in TCP; session manages dialogues; presentation handles encoding, compression and encryption; application provides services such as HTTP and DNS.

Q: What is the difference between the data link and the network layer?
A: The data link layer delivers frames between two directly connected nodes on one link, addressed by MAC address. The network layer delivers packets end to end across many links and networks, addressed by IP address, with routers choosing each next hop. A packet keeps its IP addresses along the way while the frame around it is rebuilt at every hop.

Q: Why is networking split into layers at all?
A: Each layer solves one problem behind a fixed interface, so layers can change independently: the same HTTP runs over Wi-Fi, fiber or cellular, and a new link technology needs no change to applications. Layering also makes the system easier to reason about and to troubleshoot one level at a time.

Q: At which layers do a hub, a switch and a router work?
A: A hub works at the physical layer: it repeats bits out of every port. A switch works at the data link layer: it reads destination MAC addresses and forwards frames only to the right port. A router works at the network layer: it reads destination IP addresses and forwards packets between networks.

Q: Where does TLS fit in the OSI model?
A: It runs above TCP and below the application protocol, providing encryption and authentication, so it is usually placed at the presentation or session layer. In practice it is simplest to say it sits between the transport and application layers, since the real internet follows the TCP/IP model.

## cn.fundamentals.tcp-ip-model
name: "TCP/IP model"
importance: must
prereqs: [cn.fundamentals.osi-model]
scope: "four layers and how they map to OSI"

### simple
The TCP/IP model is the four-layer design the internet actually runs on: link, internet, transport and application. It is the working version of the OSI model, the way a real kitchen merges several stations from a textbook layout into fewer, busier ones. Its middle layer, IP, is the one thing every device on the internet agrees on.

### interview
- Four layers: **Link** (network access; OSI 1 and 2: Ethernet, Wi-Fi, ARP), **Internet** (OSI 3: IP, ICMP), **Transport** (OSI 4: TCP, UDP), **Application** (OSI 5 to 7: HTTP, DNS, TLS, SSH).
- Many textbooks teach a **five-layer** hybrid: physical, link, network, transport, application.
- **Hourglass shape**: many link technologies below and many applications above, but one protocol in the middle, **IP**, the "narrow waist" everyone must speak.
- **End-to-end principle**: the core only forwards packets as best effort; reliability, ordering and security are done at the ends (TCP, TLS, applications).
- TCP/IP came from working code (ARPANET, BSD sockets); OSI came from a committee. OSI's vocabulary survived, TCP/IP's protocols won.
- In code, the **socket API** is the border between the application and transport layers: the program picks the transport and address family, and the kernel handles transport, internet and link.

### deep
#### Intuition

OSI describes seven jobs. The internet's designers grouped them by who does the work: the network card and driver (link), every router on the path (internet), the operating system at each end (transport), and the program you wrote (application). Presentation and session work never needed their own layers; applications and libraries like TLS do it.

#### The mapping

| TCP/IP layer | OSI layers | protocols | who implements it |
|---|---|---|---|
| Application | 7, 6, 5 | HTTP, DNS, SMTP, SSH, TLS | the application and its libraries |
| Transport | 4 | TCP, UDP, QUIC (over UDP) | the operating system kernel (QUIC: a library) |
| Internet | 3 | IPv4, IPv6, ICMP | kernels on hosts, every router |
| Link | 2, 1 | Ethernet, Wi-Fi, ARP, PPP | network card, driver, switches |

#### The narrow waist

```text
   HTTP  DNS  SMTP  SSH  video  games      many applications
          TCP        UDP        QUIC        a few transports
                      IP                    one internet protocol
   Ethernet  Wi-Fi  fiber  4G/5G  DSL       many link technologies
```

Because everything goes through IP, a new application works over every link, and a new link technology carries every application. The cost: changing IP itself is extremely hard, which is why moving from IPv4 to IPv6 has taken decades.

#### Worked example: the socket call chooses the layers

When a program creates a socket, it names the internet layer (the address family) and the transport (the socket type); the kernel fills in the protocol. The protocol number the kernel reports is the value it writes into every IP header's protocol field.

```cpp
#include <sys/socket.h>
#include <netinet/in.h>

int protocolOf(int family, int type) {
    int fd = socket(family, type, 0);                // 0: let the kernel pick the protocol
    if (fd < 0) return -1;
    int proto = -1;
    socklen_t len = sizeof proto;
    getsockopt(fd, SOL_SOCKET, SO_PROTOCOL, &proto, &len);
    close(fd);
    return proto;
}

int main() {
    cout << "IPv4 + stream   -> protocol " << protocolOf(AF_INET, SOCK_STREAM) << " (TCP)\n";
    cout << "IPv4 + datagram -> protocol " << protocolOf(AF_INET, SOCK_DGRAM) << " (UDP)\n";
}
```

It prints protocol 6 for the stream socket and 17 for the datagram socket. These are the numbers IP headers carry for TCP and UDP, and IPv6 uses the same ones. The program never builds a TCP or IP header itself; the layers below the socket do.

#### The end-to-end principle

The internet layer gives **best-effort** delivery: packets may be lost, duplicated, reordered or delayed, and nobody promises otherwise. Anything more is done at the ends:

- TCP adds ordering, retransmission and flow and congestion control.
- TLS adds encryption and authentication.
- Applications add retries, timeouts and their own acknowledgements when they need them.

Keeping the core simple is why the internet scaled, and why a new service needs no permission from the routers in between.

#### Pitfalls

- Saying "TCP/IP has five layers" without explaining: the official model has four; the five-layer version splits link into physical and link.
- Placing DNS in the transport layer because it uses UDP: DNS is an application protocol that uses UDP (and TCP) as its transport.
- Thinking routers run TCP for forwarding: routers work at the internet layer; TCP runs only on the end hosts (routers use TCP only for their own sessions, such as BGP).

Connects to: OSI model, encapsulation, TCP vs UDP, ports and sockets, socket programming basics.

### questions
Q: What are the layers of the TCP/IP model and how do they map to OSI?
A: Link covers OSI physical and data link, internet matches the network layer, transport matches the transport layer, and application covers session, presentation and application. Common protocols are Ethernet and Wi-Fi, IP and ICMP, TCP and UDP, and HTTP, DNS and TLS respectively.

Q: Why is IP called the narrow waist of the internet?
A: Every application and every link technology meets at one protocol, IP. New applications therefore run over every kind of link, and new links carry every application, without changes elsewhere. The flip side is that IP itself is very hard to change, as the slow IPv6 rollout shows.

Q: What is the end-to-end principle?
A: Functions like reliability, ordering and security should be implemented at the end hosts, not inside the network, because only the ends know what the application needs. The network core just forwards packets as best effort, which keeps routers simple and lets new applications appear without changing the network.

Q: Why did the TCP/IP model win over the OSI protocol suite?
A: TCP/IP was already running on real networks, with free implementations such as BSD sockets, while the OSI protocols were designed by committee and arrived late and complex. The OSI model survived as a teaching and troubleshooting vocabulary, which is why people still say layer 4 or layer 7.

## cn.fundamentals.encapsulation
name: "Encapsulation"
importance: must
prereqs: [cn.fundamentals.tcp-ip-model]
scope: "headers at each layer, PDUs (frame, packet, segment)"

### simple
Encapsulation means each layer wraps the data from the layer above in its own envelope, called a header, before passing it down. It is like a gift in a box, the box in a padded mailer, and the mailer in a shipping crate, each with its own label. The receiver unwraps them in the opposite order, and each layer reads only its own label.

### interview
- Going down the stack, each layer **prepends a header** (the link layer also appends a trailer): application data → TCP segment → IP packet → Ethernet frame → bits.
- **PDU** (protocol data unit) names: **message** or data (application), **segment** (TCP) or **datagram** (UDP), **packet** (IP), **frame** (link), **bits** (physical).
- Going up (**decapsulation**), each layer strips its header and uses one field to pick the next layer: **EtherType** (0x0800 means IPv4), IP **protocol** field (6 TCP, 17 UDP), destination **port** (the application's socket).
- Typical header sizes: Ethernet 14 bytes plus a 4-byte FCS trailer, IPv4 20 bytes (up to 60), IPv6 40, TCP 20 (up to 60), UDP 8.
- **MTU** (usually 1500 bytes on Ethernet) caps the IP packet, so the largest TCP payload is the **MSS**: 1500 − 20 − 20 = 1460 bytes.
- At each router the **frame is replaced** (new MAC addresses per hop) while the IP packet inside is kept (only TTL and checksum change, plus addresses under NAT).

### deep
#### Intuition

A layer does not know or care what is inside the data it carries. TCP treats the HTTP request as bytes; IP treats the TCP segment as bytes; Ethernet treats the IP packet as bytes. Each adds just the information its peer on the other side needs: ports for TCP, IP addresses and a time to live for IP, MAC addresses and a checksum for Ethernet.

#### The picture

```text
application                      [ HTTP request                          ]
transport              [TCP hdr ][ HTTP request                          ]   segment
internet      [IP hdr ][TCP hdr ][ HTTP request                          ]   packet
link  [Eth hdr][IP hdr ][TCP hdr ][ HTTP request                          ][FCS]  frame
physical      0110100101110... on the wire                                      bits
```

#### Code: wrapping and unwrapping a real request

The program below builds a frame the way the stack does, one header per layer, then walks back up reading only one field per layer to find the next.

```cpp
using Bytes = vector<uint8_t>;

void put16(Bytes& b, size_t at, uint16_t v) { b[at] = v >> 8; b[at + 1] = v & 0xff; }

Bytes wrap(const Bytes& inner, Bytes header, const Bytes& trailer = {}) {
    header.insert(header.end(), inner.begin(), inner.end());
    header.insert(header.end(), trailer.begin(), trailer.end());
    return header;
}

int main() {
    string msg = "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n";
    Bytes data(msg.begin(), msg.end());              // application message

    Bytes tcp(20, 0);                                // transport: TCP header + data = segment
    put16(tcp, 0, 51000);                            // source port
    put16(tcp, 2, 80);                               // destination port
    tcp[12] = 5 << 4;                                // header length: 5 words of 4 bytes
    Bytes segment = wrap(data, tcp);

    Bytes ip(20, 0);                                 // internet: IP header + segment = packet
    ip[0] = 0x45;                                    // version 4, header length 5 words
    put16(ip, 2, 20 + segment.size());               // total length
    ip[8] = 64;                                      // time to live
    ip[9] = 6;                                       // protocol 6: TCP
    Bytes packet = wrap(segment, ip);

    Bytes eth(14, 0);                                // link: Ethernet header + packet + FCS
    put16(eth, 12, 0x0800);                          // EtherType 0x0800: IPv4
    Bytes frame = wrap(packet, eth, Bytes(4, 0));    // 4-byte frame check sequence

    cout << "message " << data.size() << ", segment " << segment.size() << ", packet "
         << packet.size() << ", frame " << frame.size() << " bytes\n";

    // The receiver peels the layers off, one field per layer choosing the next.
    int etherType = frame[12] << 8 | frame[13];
    const uint8_t* ipHdr = &frame[14];
    const uint8_t* tcpHdr = ipHdr + (ipHdr[0] & 0x0f) * 4;
    int dstPort = tcpHdr[2] << 8 | tcpHdr[3];
    const uint8_t* body = tcpHdr + (tcpHdr[12] >> 4) * 4;
    string firstLine(body, body + 14);
    cout << hex << "EtherType 0x" << etherType << dec << " -> protocol " << int(ipHdr[9])
         << " -> port " << dstPort << " -> " << firstLine << "\n";
}
```

Output:

```text
message 37, segment 57, packet 77, frame 95 bytes
EtherType 0x800 -> protocol 6 -> port 80 -> GET / HTTP/1.1
```

A 37-byte request became a 95-byte frame: 58 bytes of headers and trailer, 61% overhead. On the wire, Ethernet also sends an 8-byte preamble and leaves a 12-byte gap, so tiny messages are expensive.

#### Worked example: a full-size segment

| layer | adds | running size |
|---|---|---|
| application data | 1460 bytes (one MSS) | 1460 |
| TCP header | 20 | 1480 |
| IP header | 20 | 1500 (exactly the MTU) |
| Ethernet header and FCS | 18 | 1518 |

Here headers are only about 4% of the frame. That is why bulk transfers use full-size segments, and why an extra header, such as a VPN tunnel's, forces a smaller MSS or fragmentation.

#### Pitfalls

- Mixing up the PDU names: frames contain packets, which contain segments.
- Assuming headers are fixed size: IPv4 and TCP headers grow with options, which is why both carry a header-length field.
- Forgetting the frame changes at every hop: MAC addresses are per link, IP addresses are end to end.

Connects to: OSI model, TCP/IP model, MAC addresses and Ethernet, IP fragmentation and MTU, ports and sockets.

### questions
Q: What is encapsulation in networking?
A: Each layer takes the data from the layer above and adds its own header, and the link layer also adds a trailer, before handing it down. The receiver reverses this: each layer removes its header and passes the rest up. A layer treats everything it carries as opaque bytes.

Q: Name the PDU at each layer.
A: The application layer sends messages, the transport layer segments for TCP or datagrams for UDP, the network layer packets, the data link layer frames, and the physical layer bits. A frame contains a packet, which contains a segment, which contains the application data.

Q: How does a receiving host know which protocol to hand the data to at each layer?
A: Each header carries a field naming the next layer: Ethernet's EtherType (0x0800 for IPv4, 0x86DD for IPv6), the IP protocol field (6 for TCP, 17 for UDP), and the transport destination port, which identifies the application's socket.

Q: What is the maximum TCP payload in one Ethernet frame, and why?
A: Usually 1460 bytes. The Ethernet MTU is 1500 bytes for the IP packet, and a basic IPv4 header and TCP header take 20 bytes each, leaving 1460 bytes, the MSS. Options or tunnels reduce it further.

Q: What changes about a packet as it crosses a router?
A: The router strips the incoming frame and builds a new one for the next link, with new source and destination MAC addresses. The IP packet inside keeps its addresses, but the router decrements its TTL and updates the header checksum; NAT devices also rewrite addresses and ports.

## cn.fundamentals.bandwidth-latency-and-throughput
name: "Bandwidth, latency and throughput"
importance: must
prereqs: [cn.fundamentals.what-a-network-is]
scope: "definitions and the difference"

### simple
Bandwidth is how much data a link can carry per second, latency is how long one bit takes to arrive, and throughput is how much data you actually get through. Think of a highway: the number of lanes is bandwidth, the drive time is latency, and the cars that actually arrive per hour is throughput. Adding lanes does not make the trip shorter.

### interview
- **Bandwidth**: the maximum rate of a link, in bits per second (100 Mbps). **Throughput**: the rate actually achieved end to end, at most the smallest bandwidth on the path (the **bottleneck**) and often less.
- **Latency**: the delay for data to get from sender to receiver. **RTT** (round-trip time) is there and back, which is what a request and response or a TCP handshake costs.
- Delay per hop = **transmission** ($L/R$: pushing $L$ bits at rate $R$) + **propagation** ($d/s$: distance over signal speed, about $2 \times 10^8$ m/s in fiber) + **queuing** (waiting in router buffers; grows with load) + **processing** (header checks, lookup).
- **Bandwidth-delay product** (bandwidth × RTT) is how much data must be in flight to keep the pipe full; a window smaller than that caps TCP at **window / RTT**.
- Small requests are **latency-bound** (a web page with many round trips); big downloads are **bandwidth-bound**. More bandwidth does not help a latency-bound workload.
- **Jitter** is variation in latency; it matters for calls and games more than the average.

### deep
#### Intuition

Picture a long pipe. Bandwidth is its width: how much water per second fits through. Latency is its length: how long a drop takes from one end to the other. Throughput is how much water you actually get, which can be less if the tap is slow or the pipe is not kept full. A wide pipe does not help if you pour one cup at a time and wait for each to arrive.

#### The four delays

| delay | formula | depends on | example |
|---|---|---|---|
| transmission | $L/R$ | packet size and link rate | 1500 bytes on 100 Mbps: 0.12 ms |
| propagation | $d/s$ | distance and medium | 3000 km of fiber: 15 ms |
| queuing | varies | load on the router | 0 when idle, many ms when congested |
| processing | small | router hardware | microseconds |

For long paths propagation dominates; for slow links or large packets transmission dominates; under load, queuing dominates and varies, which causes jitter.

#### Worked example

A 100 Mbps path across 3000 km of fiber:

```cpp
int main() {
    double bandwidth = 100e6;                        // 100 Mbps
    double distance = 3000e3;                        // 3000 km of fiber, in meters
    double speed = 2e8;                              // light in fiber, about 2/3 of c, in m/s
    double packetBits = 1500 * 8;

    double transmission = packetBits / bandwidth;    // pushing one packet onto the link
    double propagation = distance / speed;           // the first bit crossing the distance
    double rtt = 2 * propagation;                    // ignoring queuing and processing
    double bdpBytes = bandwidth * rtt / 8;           // data in flight to keep the pipe full
    double window = 64 * 1024;                       // a 64 KB receive window
    double capped = window * 8 / rtt;                // at most one window per round trip

    printf("transmission %.2f ms, propagation %.1f ms, RTT %.0f ms\n",
           transmission * 1e3, propagation * 1e3, rtt * 1e3);
    printf("bandwidth-delay product %.0f KB\n", bdpBytes / 1024);
    printf("a 64 KB window caps throughput at %.1f Mbps\n", capped / 1e6);
}
```

Output:

```text
transmission 0.12 ms, propagation 15.0 ms, RTT 30 ms
bandwidth-delay product 366 KB
a 64 KB window caps throughput at 17.5 Mbps
```

About 366 KB must be in flight to use the full 100 Mbps. With only 64 KB outstanding, the sender waits for acknowledgements most of the time, and throughput is 17.5 Mbps, less than a fifth of the bandwidth. This is why TCP has window scaling for fast, long paths.

#### Latency-bound vs bandwidth-bound

Loading a page that needs DNS, a TCP handshake, a TLS handshake and then the request costs about four round trips before the first byte of content. At 30 ms RTT that is 120 ms, whether the link is 10 Mbps or 1 Gbps. Downloading a 1 GB file, on the other hand, takes 80 s at 100 Mbps and 8 s at 1 Gbps, and the round trips hardly matter. Fixes differ: latency is cut by fewer round trips (connection reuse, TLS 1.3, HTTP/2), caching and CDNs near the user; throughput is raised by more bandwidth, bigger windows and parallel streams.

#### Units and pitfalls

- Link speeds are in **bits** per second, file sizes in **bytes**: 100 Mbps moves 12.5 MB per second at best.
- "Mega" in link speeds means $10^6$; in file sizes it is often $2^{20}$.
- Measured throughput is below bandwidth because of headers, acknowledgements, slow start, packet loss and competing traffic.
- The speed of light sets a floor: about 5 ms per 1000 km one way in fiber, so a New York to London round trip (about 5600 km each way) can never take less than about 56 ms.

Connects to: TCP flow control, TCP congestion control, CDNs, HTTP/1.1 vs HTTP/2 vs HTTP/3, circuit switching vs packet switching.

### questions
Q: What is the difference between bandwidth and throughput?
A: Bandwidth is the maximum rate a link can carry, a property of the link. Throughput is the rate actually achieved end to end for a transfer. Throughput is limited by the slowest link on the path, and further reduced by protocol overhead, windows, packet loss and competing traffic.

Q: What are the components of network delay?
A: Transmission delay, the packet size divided by the link rate; propagation delay, the distance divided by the signal speed; queuing delay in router buffers, which grows with load; and processing delay for header checks and lookups. Each hop adds all four.

Q: What is the bandwidth-delay product and why does it matter?
A: It is the bandwidth multiplied by the round-trip time: the amount of data that must be in flight to keep the link busy. If the sender's window is smaller, it runs out of permission to send before acknowledgements return, so throughput is capped at window divided by RTT.

Q: Why does doubling bandwidth barely speed up loading a small web page?
A: A small page is dominated by round trips: DNS lookup, TCP handshake, TLS handshake and request and response, each costing one RTT set by distance. Bandwidth only shortens the time to push the few bytes. Reducing round trips or moving servers closer helps far more.

Q: How long does a 1 GB download take on a 100 Mbps link at best?
A: 1 GB is 8 gigabits, and 8 gigabits divided by 100 megabits per second is 80 seconds. Real transfers take a bit longer because of header overhead, slow start and acknowledgements.

## cn.fundamentals.network-topologies
name: "Network topologies"
importance: important
scope: "bus, star, ring, mesh"

### simple
A topology is the shape of a network: how devices are wired to each other. Devices might share one long cable like houses on one street (bus), each connect to a center like spokes on a wheel (star), pass data around a circle (ring), or link to many others like a web (mesh). The shape decides what happens when a cable breaks and how many cables you need.

### interview
- **Bus**: every device taps one shared cable; cheap, but one break or one noisy device affects all, and only one can talk at a time (early Ethernet on coaxial cable).
- **Star**: every device connects to a central switch or hub; easy to add devices and isolate faults, but the center is a single point of failure. Modern Ethernet and Wi-Fi LANs are stars.
- **Ring**: each device connects to two neighbors and data travels around; predictable access (token ring), but one break stops the ring unless it is dual (FDDI, SONET rings).
- **Mesh**: devices connect to many others. **Full mesh** needs $n(n-1)/2$ links: very resilient, expensive. **Partial mesh** is what internet cores and data center fabrics use.
- **Tree** (hierarchical stars) and **hybrid** combine these; physical topology (the cables) can differ from logical topology (how data flows).

### deep
#### Comparing the shapes

| topology | links for n devices | one link fails | one node fails | where you see it |
|---|---|---|---|---|
| bus | one shared cable | cable break splits the network | usually fine | old coaxial Ethernet, some industrial buses |
| star | n (to the center) | only that device is cut off | center fails: everything down | office Ethernet, home Wi-Fi |
| ring | n | single ring: all traffic stops; dual ring: reroutes | ring broken unless bypassed | metro fiber rings, token ring |
| full mesh | n(n−1)/2 | traffic takes another link | only that node is lost | small backbones, cluster heartbeats |
| partial mesh | between n and n(n−1)/2 | usually survives | usually survives | internet core, data center fabrics |

For 10 devices, a full mesh needs 45 links; for 100 devices, 4950. That quadratic growth is why full meshes stay small and large networks use partial meshes and hierarchies.

#### Physical vs logical

A modern Ethernet LAN is physically a star (cables to a switch) and logically point to point. An old Ethernet hub was physically a star but logically a bus: it repeated every signal to every port, so all devices shared one collision domain. Wi-Fi is logically a shared bus (one radio channel) organized as a star around the access point.

#### In data centers

Large data centers use a **leaf-spine** (Clos) fabric: every leaf switch (top of rack) connects to every spine switch. Any two servers are at most leaf, spine, leaf apart, there are many equal-cost paths, and losing one spine only removes a fraction of capacity. It is a structured partial mesh.

Connects to: what a network is, hubs, switches and routers, circuit switching vs packet switching, CSMA/CD and CSMA/CA.

### questions
Q: What are the advantages and disadvantages of a star topology?
A: Each device has its own link to a central switch, so adding devices is easy and a broken cable affects only one device. The center is a single point of failure and a potential bottleneck, and the design needs more cable than a bus. It is the standard for modern LANs.

Q: How many links does a full mesh of n nodes need, and why is it rare?
A: n times n minus 1, divided by 2, because every pair of nodes gets its own link. The count grows quadratically, so large full meshes are too expensive in cables and ports. Real networks use partial meshes that keep several paths between important nodes.

Q: What is the difference between physical and logical topology?
A: Physical topology is how the cables are actually laid out; logical topology is how data flows between devices. A hub-based Ethernet was physically a star but logically a bus, because the hub repeated every signal to every port.

Q: Why is a ring topology fragile, and how is it usually protected?
A: In a single ring, data passes through every node in turn, so one broken link or failed node stops the whole ring. Real rings use two counter-rotating rings, so traffic can wrap around at the break, as in FDDI and SONET.

## cn.fundamentals.circuit-switching-vs-packet-switching
name: "Circuit switching vs packet switching"
importance: important
scope: "Circuit switching vs packet switching"

### simple
Circuit switching reserves a path and its capacity for the whole conversation, like booking a private train track from one city to another. Packet switching chops data into small packets that share the tracks with everyone else and are forwarded one hop at a time, like cars on public roads. The old phone network used circuits; the internet uses packets.

### interview
- **Circuit switching**: set up a dedicated path with reserved capacity (a time slot or frequency on every link) before talking, then tear it down. Guaranteed rate and constant delay, but capacity sits idle during silence. The classic telephone network.
- **Packet switching**: data is split into packets that carry addresses; each router **stores and forwards** them, and links are shared on demand (**statistical multiplexing**). Efficient for bursty traffic, but with variable delay, queuing and possible loss when buffers overflow. The internet.
- Store-and-forward: a router must receive a whole packet before sending it, so one packet of $L$ bits across $N$ links of rate $R$ takes $N \cdot L/R$, and $P$ such packets sent back to back take $(N + P - 1) \cdot L/R$.
- Packet switching supports many more users on the same link when they are idle most of the time.
- **Virtual circuits** (MPLS, ATM, older X.25) are a middle ground: packets follow a path set up in advance, identified by a label.

### deep
#### Worked example: sharing a 1 Mbps link

Each user needs 100 kbps while active and is active 10% of the time.

- **Circuit switching** must reserve 100 kbps per user, so the link supports exactly 10 users, idle or not.
- **Packet switching** can admit more. With 35 users, the link is overloaded only when more than 10 are active at once, and the number of active users follows a binomial distribution.

```cpp
int main() {
    int users = 35;
    double p = 0.1;                                  // each user is active 10% of the time
    double pk = pow(1 - p, users);                   // P(0 active)
    double atMost10 = 0;
    for (int k = 0; k <= 10; ++k) {
        atMost10 += pk;
        pk = pk * (users - k) / (k + 1) * p / (1 - p);   // P(k+1) from P(k)
    }
    printf("P(more than 10 of %d active) = %.4f\n", users, 1 - atMost10);
}
```

It prints 0.0004: with 35 users sharing the link by packets, demand exceeds capacity 0.04% of the time (and then packets briefly queue), while circuits would have turned away 25 of those users. That efficiency with bursty traffic is why data networks use packets.

#### Delay

Sending one file of $L$ bits over $N$ links of rate $R$:

- Circuit: setup time, then $L/R$ for the transmission (the circuit rate is often a fraction of the link, one time slot), plus propagation.
- Packet, one big packet: every router waits for the whole packet, so $N \cdot L/R$.
- Packet, split into $P$ pieces: routers forward the first piece while the next arrives, so $(N + P - 1) \cdot L/(P R)$, close to $L/R$ when $P$ is large. Splitting pipelines the hops, which is one reason packets are small.

#### Trade-offs

| | circuit switching | packet switching |
|---|---|---|
| setup | required before data | none |
| capacity | reserved, wasted when idle | shared on demand |
| delay | constant after setup | variable (queuing) |
| loss | none once set up | possible when buffers overflow |
| guarantees | fixed rate | best effort, unless QoS is added |
| failure of a link | call drops | packets reroute |

Modern phone calls now run over packets too (voice over IP, 4G and 5G voice), with jitter buffers and prioritization to hide variable delay.

Connects to: bandwidth, latency and throughput, routing basics, network topologies, TCP congestion control.

### questions
Q: What is the main difference between circuit switching and packet switching?
A: Circuit switching reserves a dedicated path and fixed capacity for the whole session before any data flows, giving guaranteed rate and constant delay. Packet switching splits data into addressed packets that share links on demand and are stored and forwarded by each router, which is more efficient but gives variable delay and possible loss.

Q: Why is packet switching better for internet traffic?
A: Internet traffic is bursty: users are idle most of the time. Reserving capacity per user wastes it during silence, while statistical multiplexing lets many users share a link and rarely exceed it together. Packet networks also reroute around failures without dropping every session.

Q: What is store-and-forward and how does it affect delay?
A: A router must receive an entire packet before forwarding it. One packet of L bits across N links of rate R therefore takes N times L over R, plus propagation. Splitting data into many smaller packets lets hops work in parallel, bringing the total close to a single transmission time.

Q: What is a virtual circuit?
A: A path set up in advance through the network, identified by a label that each switch uses to forward packets. It keeps packet switching's shared links but gives predictable routes and can reserve resources. MPLS in provider networks is the common modern example.
