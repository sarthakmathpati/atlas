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

### simple
An IP address gets data to the right machine, and a port number gets it to the right program on that machine. It is like an apartment building: the street address finds the building, and the apartment number finds the person. A socket is one program's end of a conversation, named by its address and port.

### interview
- A **port** is a 16-bit number (0 to 65535) that identifies an application endpoint on a host. TCP and UDP have separate port spaces.
- **Well-known ports** (0 to 1023, binding needs privileges on Unix): 22 SSH, 25 SMTP, 53 DNS, 67/68 DHCP, 80 HTTP, 443 HTTPS. **Registered** 1024 to 49151 (3306 MySQL, 5432 PostgreSQL, 6379 Redis). **Ephemeral** ports for clients: 49152 to 65535 by the standard (Linux uses 32768 to 60999 by default).
- A **socket** is the operating system object for one endpoint; its address is (IP, port). A TCP **connection** is identified by the **5-tuple**: protocol, source IP, source port, destination IP, destination port.
- One server port serves many clients: the **listening socket** accepts connections, and each accepted connection gets its own socket sharing the server's port but with a different client address and port.
- **Demultiplexing**: the kernel delivers an arriving TCP segment to the socket matching its full 4-tuple (falling back to the listener for new connections); UDP only looks at the destination IP and port.
- A client making many short connections to one server can run out of ephemeral ports (each one stays in TIME_WAIT for a while); connection reuse avoids it.

### deep
#### Intuition

Many programs on one machine use the network at the same time: a browser with dozens of tabs, a chat app, a music stream. IP delivers packets to the machine; the transport layer then needs a second address to hand each packet to the right program. That is the port. A web server listens on port 443; your browser uses a different temporary port for each connection, so replies come back to the right tab.

#### Worked example: one server port, many connections

```cpp
string endpoint(const sockaddr_in& a) {
    char ip[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &a.sin_addr, ip, sizeof ip);
    return string(ip) + ":" + to_string(ntohs(a.sin_port));
}

string describe(int fd) {                            // this socket's local and remote ends
    sockaddr_in local{}, peer{};
    socklen_t len = sizeof local;
    getsockname(fd, reinterpret_cast<sockaddr*>(&local), &len);
    len = sizeof peer;
    getpeername(fd, reinterpret_cast<sockaddr*>(&peer), &len);
    return endpoint(local) + " <-> " + endpoint(peer);
}

int main() {
    int listener = socket(AF_INET, SOCK_STREAM, 0);
    int on = 1;
    setsockopt(listener, SOL_SOCKET, SO_REUSEADDR, &on, sizeof on);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(9000);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    if (bind(listener, reinterpret_cast<sockaddr*>(&addr), sizeof addr) < 0) return 1;
    listen(listener, 8);
    for (int i = 0; i < 2; ++i) {
        int client = socket(AF_INET, SOCK_STREAM, 0);
        connect(client, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
        int accepted = accept(listener, nullptr, nullptr);
        cout << "server socket " << describe(accepted) << "\n";
        close(accepted);
        close(client);
    }
    close(listener);
}
```

One run printed:

```text
server socket 127.0.0.1:9000 <-> 127.0.0.1:52614
server socket 127.0.0.1:9000 <-> 127.0.0.1:52628
```

Both accepted sockets use local port 9000; the kernel told them apart by the client's ephemeral port, which it picked and which changes on every run.

#### Common ports worth knowing

| port | protocol | port | protocol |
|---|---|---|---|
| 20, 21 | FTP data, control | 110 | POP3 |
| 22 | SSH | 143 | IMAP |
| 23 | Telnet | 443 | HTTPS, HTTP/3 over UDP |
| 25 | SMTP | 3306 | MySQL |
| 53 | DNS (UDP and TCP) | 5432 | PostgreSQL |
| 67, 68 | DHCP server, client | 6379 | Redis |
| 80 | HTTP | 8080 | common alternative HTTP |

#### How many connections can a server have?

A server's local IP and port are fixed, but each client IP and port pair makes a new 4-tuple, so the limit is not 65,535. It is file descriptors, memory and CPU; a single machine can hold millions of idle connections. The 65,535 limit bites the other way: one **client** IP talking to one server IP and port has only its ephemeral range of source ports, which is why proxies with heavy outbound traffic use several source IPs or keep connections alive.

#### Pitfalls

- "Address already in use" when restarting a server: old connections on the port are in TIME_WAIT; set `SO_REUSEADDR` on the listening socket.
- Binding to `127.0.0.1` makes a service reachable only from the same machine; `0.0.0.0` accepts on every interface.
- A port number is not a security boundary: anything can listen on any free non-privileged port, and scanners probe them all.

Connects to: TCP vs UDP, TCP states, NAT, inter-process communication, socket programming basics.

### questions
Q: What is the difference between a port and a socket?
A: A port is a 16-bit number that identifies an application endpoint on a host. A socket is the operating system object an application uses to communicate; it is bound to an IP address and port, and for a connected TCP socket also has a remote address and port. Many sockets can share one local port.

Q: How can a web server on port 443 handle thousands of clients at once?
A: Every TCP connection is identified by its 4-tuple of source IP, source port, destination IP and destination port. All connections share the server's IP and port, but each client has a different IP or source port, so each accepted connection gets its own socket and the kernel delivers segments by matching the full tuple.

Q: What are ephemeral ports?
A: Temporary source ports the operating system assigns to client sockets when they connect, from a range such as 49152 to 65535, or 32768 to 60999 on Linux. They identify the client end of a connection and are released after it closes, following any TIME_WAIT period.

Q: Name some well-known ports.
A: 22 for SSH, 25 for SMTP, 53 for DNS, 80 for HTTP, 443 for HTTPS, 110 for POP3 and 143 for IMAP. Ports below 1024 are well known and binding them usually needs administrator privileges.

Q: How does the kernel decide which socket receives an incoming TCP segment?
A: It looks for an established socket matching the segment's full 4-tuple. If none exists and the segment is a SYN, it goes to the listening socket for that destination IP and port. For UDP, the destination IP and port are usually enough.

## cn.transport.tcp-vs-udp
name: "TCP vs UDP"
importance: must
prereqs: [cn.transport.ports-and-sockets]
scope: "reliability, ordering, overhead, use cases"

### simple
TCP and UDP are the two main ways programs send data over the internet. TCP is like a phone call: it connects first, makes sure everything arrives in order, and repeats anything lost. UDP is like sending postcards: each one goes on its own, fast and cheap, but some may get lost or arrive out of order.

### interview
- **TCP**: connection-oriented (handshake), **reliable** (acknowledgements and retransmission), **ordered** byte stream, **flow control** (the receiver's window) and **congestion control** (the sender backs off when the network is overloaded). Header 20 to 60 bytes.
- **UDP**: connectionless, no delivery or ordering guarantees, no flow or congestion control, **message boundaries preserved** (one send is one datagram). Header 8 bytes: ports, length, checksum.
- TCP is a **byte stream**: two writes can arrive as one read, and one write as several; applications must frame their own messages. UDP delivers whole datagrams or nothing.
- Use **TCP** when every byte must arrive: web pages and APIs, file transfer, email, SSH, databases. Use **UDP** when late data is useless or the app wants control: voice and video calls, games, DNS lookups, DHCP, streaming telemetry, and as the base for **QUIC**.
- UDP has no handshake, so a request and reply can take one round trip (DNS), and it supports broadcast and multicast; TCP is always one to one.
- Reliability on top of UDP is possible (QUIC, game protocols) and lets apps choose which data to resend.

### deep
#### Side by side

| | TCP | UDP |
|---|---|---|
| connection | three-way handshake first | none |
| delivery | guaranteed or the connection fails | best effort |
| order | in order | any order |
| duplicates | removed | possible |
| data unit | byte stream | datagrams with boundaries |
| flow control | receive window | none |
| congestion control | yes | none (the app should add its own) |
| header | 20 bytes minimum | 8 bytes |
| one to many | no | broadcast and multicast |
| typical uses | HTTP/1.1 and HTTP/2, SSH, SMTP, databases | DNS, DHCP, calls, games, QUIC |

#### Worked example: streams vs messages

The same two sends, `hello` then `world`, over TCP and over UDP, with the receiver reading only after both arrived:

```cpp
int boundSocket(int type, sockaddr_in& addr) {       // bind to 127.0.0.1 on a free port
    int fd = socket(AF_INET, type, 0);
    addr = {};
    addr.sin_family = AF_INET;
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    bind(fd, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
    socklen_t len = sizeof addr;
    getsockname(fd, reinterpret_cast<sockaddr*>(&addr), &len);
    return fd;
}

int main() {
    sockaddr_in addr;
    char buf[64];

    int listener = boundSocket(SOCK_STREAM, addr);   // TCP
    listen(listener, 1);
    int client = socket(AF_INET, SOCK_STREAM, 0);
    connect(client, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
    int server = accept(listener, nullptr, nullptr);
    send(client, "hello", 5, 0);
    send(client, "world", 5, 0);
    usleep(50000);                                   // let both arrive
    ssize_t n = recv(server, buf, sizeof buf, 0);
    cout << "TCP read 1: " << string(buf, n) << "\n";

    int receiver = boundSocket(SOCK_DGRAM, addr);    // UDP
    int sender = socket(AF_INET, SOCK_DGRAM, 0);
    for (const char* msg : {"hello", "world"})
        sendto(sender, msg, 5, 0, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
    usleep(50000);
    for (int i = 1; i <= 2; ++i) {
        n = recv(receiver, buf, sizeof buf, 0);
        cout << "UDP read " << i << ": " << string(buf, n) << "\n";
    }
}
```

Output:

```text
TCP read 1: helloworld
UDP read 1: hello
UDP read 2: world
```

TCP returned both sends in one read: it only promises the bytes, in order, not where one write ended. Protocols over TCP therefore add framing: a length prefix, a delimiter such as HTTP/1.1's blank line after headers, or a fixed size. UDP returned exactly the two datagrams that were sent (on loopback nothing was lost; across a network either one could be).

#### Choosing

- **Correctness needs every byte** (a file, a bank transfer, an API response): TCP, or QUIC.
- **Freshness beats completeness** (a video frame, a player's position): UDP. Retransmitting a frame from 200 ms ago only delays the next one.
- **Tiny request and reply** (DNS): UDP avoids the handshake; DNS falls back to TCP for large answers.
- **Many receivers** (service discovery, market data feeds): UDP multicast.

A UDP application that sends as fast as it likes can overwhelm the network and other users' TCP flows, which is why real-time protocols add their own rate control.

#### Pitfalls

- Assuming one `send` equals one `recv` on TCP: a classic bug that only appears under load or over real networks.
- Assuming UDP is always faster: without congestion control it can cause loss for itself, and building reliability on top reinvents TCP.
- Large UDP datagrams are fragmented by IP, and losing one fragment loses the whole datagram.

Connects to: ports and sockets, TCP reliability, TCP congestion control, QUIC, DNS, head-of-line blocking.

### questions
Q: What are the main differences between TCP and UDP?
A: TCP is connection-oriented and provides a reliable, ordered byte stream with flow control and congestion control, at the cost of a handshake and a larger header. UDP is connectionless and sends independent datagrams with no guarantees of delivery or order and an 8-byte header, but keeps message boundaries and has less overhead and latency.

Q: Why do video calls and online games often use UDP?
A: Late data is useless to them: a retransmitted video frame or player position arriving after newer ones only adds delay. UDP lets the application skip lost data and keep going, and implement only the reliability it needs, such as resending key frames.

Q: What does it mean that TCP is a byte stream?
A: TCP delivers bytes in order but does not preserve the boundaries of the application's writes. Two sends may arrive in one read, or one send may be split across several reads. Applications must add their own framing, such as length prefixes or delimiters.

Q: Why does DNS use UDP?
A: A typical DNS query and answer each fit in one small packet, so UDP completes a lookup in one round trip without a handshake or connection state on the server. If a response is too large or truncated, the client retries over TCP, which is also used for zone transfers.

Q: Can you get reliable delivery over UDP?
A: Yes, the application or a library adds sequence numbers, acknowledgements and retransmission on top. QUIC does exactly this, adding encryption and multiplexed streams, and games often use custom protocols that resend only important messages.

## cn.transport.tcp-three-way-handshake-and-four-way-teardown
name: "TCP three-way handshake and four-way teardown"
importance: must
prereqs: [cn.transport.tcp-vs-udp]
scope: "SYN, SYN-ACK, ACK, FIN"

### simple
Before TCP sends data, the two sides shake hands in three steps: "can we talk?", "yes, can you hear me?", "yes". Each side also announces the number it will start counting its bytes from. Closing takes four steps, because each side says goodbye separately, like two people hanging up after both have said "that's all from me".

### interview
- **Handshake**: client sends **SYN** (seq = x, its initial sequence number); server replies **SYN-ACK** (seq = y, ack = x + 1); client sends **ACK** (ack = y + 1). Data can follow with the third packet. Costs **one RTT** before the client can send data.
- The handshake **synchronizes both initial sequence numbers** (each side's ISN must be acknowledged) and negotiates options: MSS, window scaling, SACK, timestamps. ISNs are **random** to resist spoofing and confusion with old connections.
- **Why not two?** With two, the server could not know the client got its ISN, and a delayed duplicate SYN from an old connection would open a bogus connection.
- **Teardown**: each direction closes separately: **FIN** → ACK, then the other side's **FIN** → ACK. The middle two often combine (FIN-ACK), making three packets. Between them the connection is **half-closed**: one side can still send.
- The side that closes first ends in **TIME_WAIT**. **RST** aborts a connection immediately (connection to a closed port, or an application aborting).
- **SYN flood**: attackers send SYNs and never finish, filling the queue of half-open connections; **SYN cookies** encode the state in the server's ISN so no memory is used until the final ACK.

### deep
#### Worked example: sequence numbers

SYN and FIN each consume one sequence number; data consumes one per byte; a pure ACK consumes none. Client ISN 1000, server ISN 5000; the client sends a 100-byte request and the server a 300-byte response.

| # | direction | flags | seq | ack | data |
|---|---|---|---|---|---|
| 1 | client → server | SYN | 1000 | | |
| 2 | server → client | SYN, ACK | 5000 | 1001 | |
| 3 | client → server | ACK | 1001 | 5001 | |
| 4 | client → server | ACK, PSH | 1001 | 5001 | 100 bytes |
| 5 | server → client | ACK, PSH | 5001 | 1101 | 300 bytes |
| 6 | client → server | ACK | 1101 | 5301 | |
| 7 | client → server | FIN, ACK | 1101 | 5301 | |
| 8 | server → client | ACK | 5301 | 1102 | |
| 9 | server → client | FIN, ACK | 5301 | 1102 | |
| 10 | client → server | ACK | 1102 | 5302 | |

The acknowledgement number is always the **next byte expected**. After packet 7 the client has nothing more to say, but it still receives until packet 9; after packet 10 the client waits in TIME_WAIT.

#### The kernel does the handshake

Applications never see SYNs. The server kernel completes handshakes on its own and queues finished connections; `accept` just takes the next one from the queue.

```cpp
int main() {
    int listener = socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    bind(listener, reinterpret_cast<sockaddr*>(&addr), sizeof addr);   // port 0: any free port
    socklen_t len = sizeof addr;
    getsockname(listener, reinterpret_cast<sockaddr*>(&addr), &len);
    listen(listener, 8);                             // 8: the queue of finished connections

    int client = socket(AF_INET, SOCK_STREAM, 0);
    auto start = chrono::steady_clock::now();
    int r = connect(client, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
    auto us = chrono::duration<double, micro>(chrono::steady_clock::now() - start).count();
    cout << "connect returned " << r << " after " << lround(us) << " us, before any accept\n";
    int server = accept(listener, nullptr, nullptr);  // takes the finished connection
    cout << "accept returned a socket: " << (server >= 0) << "\n";
}
```

On loopback, `connect` returned 0 after 140 to 320 µs in five runs on the test machine, although the server had not called `accept` yet: the SYN, SYN-ACK and ACK had already been exchanged by the kernel on both ends. Across a real network, `connect` takes one round trip, often tens of milliseconds.

#### Why three messages

Each side must learn the other's ISN **and** know its own ISN was received. That needs SYN (client ISN), SYN plus ACK (server ISN, confirms the client's), ACK (confirms the server's): the middle message does two jobs, so three suffice. With only two, a stale SYN from a crashed earlier connection could arrive, the server would answer and consider itself connected, and hold resources for a client that never asked.

#### Teardown and half-close

`shutdown(fd, SHUT_WR)` sends a FIN but keeps the socket open for reading, so a client can say "that is my whole request" and still read the response; the server sees `read` return 0 (end of stream). `close` gives up both directions. If data arrives for a socket that was closed, the kernel answers with RST.

#### Pitfalls

- Forgetting that SYN and FIN each take a sequence number when computing ACKs.
- Treating `connect` success as proof the server application is ready: the kernel accepted it into a queue.
- A full accept queue (a slow server) makes new SYNs time out and retry, which looks like the network is slow.

Connects to: TCP states, TCP reliability, TCP vs UDP, what happens when you type a URL, common attacks.

### questions
Q: Describe the TCP three-way handshake.
A: The client sends a SYN carrying its initial sequence number x. The server replies with a SYN-ACK carrying its own initial sequence number y and acknowledging x plus 1. The client sends an ACK for y plus 1. Both sides now know each other's starting sequence numbers and negotiated options, and data can flow.

Q: Why does TCP need three messages rather than two?
A: Both sides must learn the other's initial sequence number and confirm their own was received. Two messages would leave the server unsure the client got its sequence number, and a delayed duplicate SYN from an old connection could open a connection the client never wanted.

Q: Why does closing a TCP connection take four messages?
A: Each direction is closed independently: one side sends FIN, the other acknowledges it, and later, when it has finished sending, sends its own FIN, which is acknowledged too. The middle ACK and FIN are often combined, but in general the second side may keep sending after the first FIN.

Q: What is a SYN flood and how do SYN cookies help?
A: An attacker sends many SYNs, often from spoofed addresses, and never completes the handshake, filling the server's queue of half-open connections so real clients are refused. With SYN cookies, the server keeps no state for the SYN; it encodes the connection details in its initial sequence number and rebuilds them when a valid final ACK arrives.

Q: Why are initial sequence numbers random?
A: Predictable sequence numbers let an attacker inject forged segments into a connection or spoof one without seeing the replies. Random initial numbers also make it unlikely that segments from an old connection with the same ports fall inside the new connection's window.

## cn.transport.tcp-states
name: "TCP states"
importance: important
prereqs: [cn.transport.tcp-three-way-handshake-and-four-way-teardown]
scope: "TIME_WAIT and why it exists"

### simple
A TCP connection moves through named states as it opens, carries data and closes, such as LISTEN, ESTABLISHED and TIME_WAIT. TIME_WAIT is a short waiting period after closing, like staying on the line for a moment after saying goodbye in case the other person did not hear you. It also makes sure stray messages from the old call cannot leak into a new one.

### interview
- Opening: **CLOSED** → **LISTEN** (server) or **SYN_SENT** (client) → **SYN_RECEIVED** (server) → **ESTABLISHED**.
- Active close (sends the first FIN): **FIN_WAIT_1** → **FIN_WAIT_2** (its FIN acked) → **TIME_WAIT** (got the peer's FIN) → CLOSED. Passive close: **CLOSE_WAIT** (got a FIN; waiting for the application to close) → **LAST_ACK** → CLOSED. Both at once: CLOSING.
- **TIME_WAIT** lasts **2 × MSL** (maximum segment lifetime; Linux uses a fixed 60 s). Reasons: the final ACK may be lost, and the peer's resent FIN must be answered; and old duplicate segments must expire before the same 4-tuple is reused.
- Many TIME_WAIT sockets are normal on the side that closes first. They are a problem mostly for clients making many short connections to one server (ephemeral port exhaustion). Fixes: keep connections alive and reuse them, let the server close first when appropriate, or Linux's `tcp_tw_reuse` for outgoing connections.
- Many **CLOSE_WAIT** sockets mean an **application bug**: the peer closed but the program never called `close`.
- `SO_REUSEADDR` lets a restarted server bind its port while old connections sit in TIME_WAIT. Inspect states with `ss -tan`.

### deep
#### Watching the states

The program opens a connection on loopback, closes the client first, then the server, and after each step reads the kernel's connection table in `/proc/net/tcp` (what `ss -tan` shows).

```cpp
void show(const char* when, int clientPort) {
    static const map<int, string> names = {{1, "ESTABLISHED"}, {2, "SYN_SENT"},
        {3, "SYN_RECV"}, {4, "FIN_WAIT_1"}, {5, "FIN_WAIT_2"}, {6, "TIME_WAIT"},
        {7, "CLOSED"}, {8, "CLOSE_WAIT"}, {9, "LAST_ACK"}, {10, "LISTEN"}, {11, "CLOSING"}};
    usleep(20000);                                   // let the packets arrive
    ifstream table("/proc/net/tcp");
    string line, slot, local, remote, state;
    getline(table, line);                            // skip the header
    map<string, string> found;                       // role -> state
    while (getline(table, line)) {
        istringstream fields(line);
        fields >> slot >> local >> remote >> state;  // addresses look like 0100007F:2328
        int lport = stoi(local.substr(9), nullptr, 16);
        int rport = stoi(remote.substr(9), nullptr, 16);
        string who = lport == 9000 && rport == 0 ? "listener"
                   : lport == clientPort         ? "client"
                   : rport == clientPort         ? "server side" : "";
        if (!who.empty()) found[who] = names.at(stoi(state, nullptr, 16));
    }
    cout << left << setw(14) << when;
    for (string who : {"listener", "client", "server side"})
        if (found.count(who)) cout << "  " << who << " " << found[who];
    cout << "\n";
}

int main() {
    int listener = socket(AF_INET, SOCK_STREAM, 0);
    int on = 1;
    setsockopt(listener, SOL_SOCKET, SO_REUSEADDR, &on, sizeof on);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(9000);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    if (bind(listener, reinterpret_cast<sockaddr*>(&addr), sizeof addr) < 0) return 1;
    listen(listener, 8);
    int client = socket(AF_INET, SOCK_STREAM, 0);
    connect(client, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
    int server = accept(listener, nullptr, nullptr);
    sockaddr_in me{};
    socklen_t len = sizeof me;
    getsockname(client, reinterpret_cast<sockaddr*>(&me), &len);
    int clientPort = ntohs(me.sin_port);

    show("connected", clientPort);
    close(client);                                   // the client closes first
    show("client closed", clientPort);
    close(server);
    show("server closed", clientPort);
}
```

Output:

```text
connected       listener LISTEN  client ESTABLISHED  server side ESTABLISHED
client closed   listener LISTEN  client FIN_WAIT_2  server side CLOSE_WAIT
server closed   listener LISTEN  client TIME_WAIT
```

After the client's FIN was acknowledged, the client waits in FIN_WAIT_2 and the server side sits in CLOSE_WAIT until its application closes. Once it does, the server side is gone at once, while the client, which closed first, stays in TIME_WAIT. Run the program twice within a minute and the first run's TIME_WAIT entry is still in the table.

#### Why TIME_WAIT exists

1. **A lost final ACK.** If the client's last ACK is lost, the server resends its FIN. A client still in TIME_WAIT answers with the ACK again; a client that had already forgotten the connection would answer with RST, and the server would report an error on a connection that ended normally.
2. **Old duplicates.** A delayed segment from this connection could still be in the network. If a new connection with the same 4-tuple started immediately, that segment could land inside its window and corrupt data. Waiting twice the maximum segment lifetime lets such segments die.

#### When it hurts, and what to do

| symptom | cause | fix |
|---|---|---|
| server restart fails with "address in use" | old connections on the port | `SO_REUSEADDR` on the listener |
| client cannot open new connections, "cannot assign requested address" | thousands of short connections to one destination, ephemeral ports all in TIME_WAIT | reuse connections (keep-alive, pools); `tcp_tw_reuse` |
| CLOSE_WAIT count keeps growing | the application never closes sockets after the peer's FIN | fix the leak: always close |

Shortening TIME_WAIT by force, or using `SO_LINGER` with a zero timeout to send RST instead of FIN, removes the protection and should be a last resort.

Connects to: TCP three-way handshake and four-way teardown, ports and sockets, TCP reliability, load balancers.

### questions
Q: What is the TIME_WAIT state and why does it exist?
A: The side that closes a TCP connection first stays in TIME_WAIT for twice the maximum segment lifetime, 60 seconds on Linux, after sending the final ACK. It lets that side resend the ACK if the peer's FIN is retransmitted, and it lets old duplicate segments expire so they cannot be mistaken for data in a new connection with the same addresses and ports.

Q: A server has thousands of sockets in CLOSE_WAIT. What does that mean?
A: The peers closed their side, sending FIN, but the server application has not closed its sockets. CLOSE_WAIT only ends when the application calls close, so a growing count points to a bug, such as a missing close on an error path or a leaked connection.

Q: Which side of a connection ends up in TIME_WAIT?
A: The side that performs the active close, the one that sends the first FIN. If a client closes first, the client holds TIME_WAIT; if the server closes first, as some HTTP servers do, the server holds it.

Q: How do you avoid running out of ephemeral ports because of TIME_WAIT?
A: Reuse connections instead of opening a new one per request, using HTTP keep-alive and connection pools. Linux can also reuse TIME_WAIT sockets for new outgoing connections when timestamps make it safe, and more client IP addresses or a wider port range give more tuples.

## cn.transport.tcp-reliability
name: "TCP reliability"
importance: must
prereqs: [cn.transport.tcp-three-way-handshake-and-four-way-teardown]
scope: "sequence numbers, acknowledgements, retransmission"

### simple
TCP numbers every byte it sends, and the receiver keeps replying with the number of the next byte it expects. If the sender does not hear back in time, or hears the same reply several times, it knows something was lost and sends it again. It is like numbering the pages of a long fax so the receiver can say "I have everything up to page 7".

### interview
- **Sequence numbers** count bytes: each segment's seq is the number of its first byte. The receiver **reorders** out-of-order segments and **drops duplicates**.
- **Cumulative ACK**: the ack number is the next byte expected, confirming everything before it. **SACK** (selective acknowledgement option) also reports blocks received beyond a gap.
- **Retransmission timeout** (RTO): from smoothed RTT and its variation, $RTO = SRTT + 4 \cdot RTTVAR$, with a floor (1 s in the standard, 200 ms on Linux). Each timeout **doubles** the RTO (exponential backoff). **Karn's rule**: no RTT samples from retransmitted segments.
- **Fast retransmit**: three **duplicate ACKs** (the same ack number again and again because later segments arrived past a gap) trigger a resend without waiting for the timer.
- A **checksum** over the header, data and a pseudo-header with the IP addresses catches corruption; bad segments are dropped and later resent.
- Reliability means "delivered in order or the connection reports an error", not "delivered no matter what".

### deep
#### Intuition

The network can drop, duplicate, reorder or corrupt packets. TCP handles all four with two ideas: number everything (so the receiver can sort and de-duplicate) and acknowledge what arrived (so the sender knows what to resend). The hard part is deciding when something is lost rather than just late.

#### Worked example: a lost segment

The sender sends five 1000-byte segments starting at byte 1; the segment with bytes 1001 to 2000 is lost.

| arrives at receiver | seq | receiver buffer | ACK sent |
|---|---|---|---|
| segment 1 | 1 | 1–1000 in order | ack 1001 |
| segment 2 | (lost) | | |
| segment 3 | 2001 | holds 2001–3000, gap before it | ack 1001 (duplicate 1) |
| segment 4 | 3001 | holds 2001–4000 | ack 1001 (duplicate 2) |
| segment 5 | 4001 | holds 2001–5000 | ack 1001 (duplicate 3) |
| resent segment 2 | 1001 | 1–5000 complete | ack 5001 |

The third duplicate ACK tells the sender that later data is arriving, so segment 2 is probably lost rather than delayed: it **fast retransmits** at once instead of waiting for the timer. With SACK, the duplicate ACKs also say "I have 2001–5000", so the sender resends only the gap. The final ACK jumps to 5001, acknowledging everything at once.

#### Choosing the timeout

Too short, and TCP resends segments that were only delayed; too long, and it waits idly after a real loss. TCP measures RTT continuously and keeps a smoothed average and a variation estimate (RFC 6298, with $\alpha = 1/8$, $\beta = 1/4$):

```cpp
int main() {
    double srtt = 0, rttvar = 0;
    bool first = true;
    for (double r : {100.0, 120.0, 90.0, 300.0, 110.0}) {   // RTT samples in ms
        if (first) {
            srtt = r;
            rttvar = r / 2;
            first = false;
        } else {
            rttvar = 0.75 * rttvar + 0.25 * fabs(srtt - r);  // update the variation first
            srtt = 0.875 * srtt + 0.125 * r;
        }
        double rto = max(200.0, srtt + 4 * rttvar);          // Linux-style 200 ms floor
        printf("sample %3.0f ms: srtt %6.1f  rttvar %5.1f  rto %6.1f\n", r, srtt, rttvar, rto);
    }
}
```

Output:

```text
sample 100 ms: srtt  100.0  rttvar  50.0  rto  300.0
sample 120 ms: srtt  102.5  rttvar  42.5  rto  272.5
sample  90 ms: srtt  100.9  rttvar  35.0  rto  240.9
sample 300 ms: srtt  125.8  rttvar  76.0  rto  429.9
sample 110 ms: srtt  123.8  rttvar  61.0  rto  367.7
```

One slow sample (300 ms) barely moves the average but widens the variation, so the timeout jumps to protect against a network that has become unpredictable. As RTTs stabilize, the timeout comes back down.

#### What happens on timeout

The sender resends the oldest unacknowledged segment, doubles the RTO for the next try, and (for congestion control) shrinks its window to one segment. After enough failed retries (on Linux about 15, roughly 15 minutes), the connection is aborted and the application gets an error.

#### Pitfalls

- Believing TCP guarantees delivery: if the network stays down, the connection fails; the application must handle errors and retries.
- Measuring RTT on retransmitted segments: the ACK could belong to either copy, so Karn's rule ignores them.
- An ACK means the peer's **kernel** got the data, not that the application processed it: application-level acknowledgements are still needed for end-to-end guarantees.

Connects to: TCP flow control, TCP congestion control, flow control protocols, head-of-line blocking, framing and error detection.

### questions
Q: How does TCP detect and recover from lost segments?
A: Every byte has a sequence number and the receiver sends cumulative acknowledgements of the next byte it expects. If an acknowledgement does not arrive before the retransmission timeout, or three duplicate acknowledgements arrive, the sender retransmits the missing data. The receiver buffers out-of-order data and delivers it once the gap is filled.

Q: What is fast retransmit?
A: When the sender receives three duplicate ACKs for the same sequence number, it infers that a segment was lost while later ones arrived, and resends it immediately instead of waiting for the retransmission timer. This recovers from single losses much faster than a timeout.

Q: How does TCP compute its retransmission timeout?
A: It keeps a smoothed RTT and a smoothed mean deviation from RTT samples, and sets the timeout to the smoothed RTT plus four times the deviation, with a minimum. After a timeout it doubles the value, and it does not take samples from retransmitted segments, following Karn's rule.

Q: What are cumulative ACKs and SACK?
A: A cumulative ACK acknowledges all bytes up to a number, the next byte expected, so one ACK can confirm many segments, but it cannot describe data received after a gap. The SACK option adds ranges of data received beyond the gap, so the sender resends only what is actually missing.

Q: Does a TCP acknowledgement mean the receiving application processed the data?
A: No. It only means the receiver's TCP stack has the data in its buffer. The application may crash before reading it, so systems that need end-to-end guarantees use application-level acknowledgements.

## cn.transport.tcp-flow-control
name: "TCP flow control"
importance: must
prereqs: [cn.transport.tcp-reliability]
scope: "receiver window, sliding window"

### simple
Flow control stops a fast sender from overwhelming a slow receiver. The receiver keeps telling the sender how much free space is left in its buffer, and the sender never has more unacknowledged data in flight than that. It is like pouring water into a glass while someone drinks from it: you pour only as fast as there is room.

### interview
- Each ACK carries the **receive window** (rwnd): free space in the receiver's buffer, $rwnd = buffer - (lastByteReceived - lastByteRead)$.
- The sender keeps unacknowledged data $\le \min(rwnd, cwnd)$: flow control protects the **receiver**; congestion control (cwnd) protects the **network**.
- **Sliding window**: as ACKs arrive and the application reads, the window's left edge moves forward and new data may be sent.
- **Zero window**: the sender stops and, with a **persist timer**, sends small **window probes** so a lost window update cannot deadlock the connection.
- The header's window field is 16 bits (64 KB max); the **window scale** option (shift up to 14) allows windows of about 1 GB for high bandwidth-delay paths.
- **Silly window syndrome**: advertising and sending tiny windows wastes packets on headers; receivers wait until a meaningful amount frees up (an MSS or half the buffer), and senders use Nagle's algorithm.

### deep
#### Intuition

Data arrives into the receiver's kernel buffer and waits there until the application reads it. If the application is slow (busy CPU, a slow disk write), the buffer fills. Without flow control the kernel would have to drop arriving data, and the sender would waste bandwidth resending it. Advertising the free space lets the sender slow down to exactly the reader's pace.

#### Worked example: a slow reader

The receiver has a 4000-byte buffer and its application reads 500 bytes per tick. The sender wants to send 1000 bytes per tick.

```cpp
int main() {
    const int buffer = 4000, readPerTick = 500, wantPerTick = 1000;
    int queued = 0;                                  // received but not yet read
    int rwnd = buffer;                               // the window in the latest ACK
    long sent = 0;
    for (int tick = 1; tick <= 8; ++tick) {
        int send = min(wantPerTick, rwnd);           // never more than the advertised window
        queued += send;
        sent += send;
        queued -= min(readPerTick, queued);          // the application reads
        rwnd = buffer - queued;                      // advertised in the next ACK
        printf("tick %d: sent %4d, buffered %4d, window %4d\n", tick, send, queued, rwnd);
    }
    printf("average rate: %.0f bytes per tick\n", sent / 8.0);
}
```

Output:

```text
tick 1: sent 1000, buffered  500, window 3500
tick 2: sent 1000, buffered 1000, window 3000
tick 3: sent 1000, buffered 1500, window 2500
tick 4: sent 1000, buffered 2000, window 2000
tick 5: sent 1000, buffered 2500, window 1500
tick 6: sent 1000, buffered 3000, window 1000
tick 7: sent 1000, buffered 3500, window  500
tick 8: sent  500, buffered 3500, window  500
average rate: 938 bytes per tick
```

The buffer absorbs the difference at first; once it is nearly full, the window shrinks until the sender is held to the reader's 500 bytes per tick. Nothing was dropped. (The model ignores the one-RTT delay before a window update reaches the sender, which is why real receivers need spare buffer.)

#### Zero windows and probes

If the reader stops completely, the window reaches 0 and the sender stops. When the application finally reads, the receiver sends a window update, but that ACK could be lost, leaving both sides waiting forever. So the sender runs a **persist timer** and periodically sends a one-byte **window probe**, which forces the receiver to reply with its current window.

#### Window size and speed

A connection can send at most one window per round trip, so throughput $\le rwnd / RTT$. With the unscaled 64 KB maximum and a 100 ms RTT, that is about 5.2 Mbps no matter how fast the link is. Window scaling, negotiated in the SYN packets, multiplies the field by up to $2^{14}$, and operating systems auto-tune receive buffers to reach the bandwidth-delay product.

#### Seeing it in code

Back-pressure reaches the application: when the peer's window and the local send buffer are full, a blocking `send` waits, and a non-blocking one fails with `EAGAIN`. An event loop then waits for the socket to become writable instead of buffering without limit in memory.

#### Pitfalls

- Confusing flow control with congestion control: one tracks the receiver's buffer, the other the network's capacity; the sender obeys the smaller.
- Tiny socket buffers on long, fast paths cap throughput far below the link speed.
- Advertising a window and then shrinking it below data already allowed ("shrinking the window") is forbidden; receivers only stop growing it.

Connects to: TCP reliability, TCP congestion control, flow control protocols, bandwidth, latency and throughput, variable-size window.

### questions
Q: What is TCP flow control and how does it work?
A: It keeps a sender from overflowing the receiver's buffer. Every ACK advertises the receive window, the free space left in the receiver's buffer, and the sender keeps the amount of unacknowledged data at or below it, so the sending rate adapts to how fast the receiving application reads.

Q: What is the difference between flow control and congestion control?
A: Flow control protects the receiver: the receive window reflects its free buffer space. Congestion control protects the network: the congestion window is the sender's estimate of what the path can carry without loss. The sender may have at most the smaller of the two in flight.

Q: What happens when the receive window drops to zero?
A: The sender stops sending new data and starts a persist timer. It periodically sends a small window probe, which makes the receiver reply with its current window, so the connection resumes even if the window update announcing free space was lost.

Q: Why was the window scale option added?
A: The window field is only 16 bits, capping the window at 64 KB. Since throughput is at most one window per round trip, fast long-distance paths could not be filled; a 64 KB window over 100 ms gives about 5 Mbps. Window scaling shifts the value by up to 14 bits, allowing windows of about 1 GB.

## cn.transport.tcp-congestion-control
name: "TCP congestion control"
importance: must
prereqs: [cn.transport.tcp-flow-control]
scope: "slow start, congestion avoidance, AIMD, fast retransmit"

### simple
Congestion control makes each TCP sender guess how much the network can carry and back off when it gets overloaded. A sender starts slowly, speeds up quickly while everything gets through, then creeps up carefully, and cuts its speed sharply when packets are lost. It is like cars merging onto a busy highway: speed up while there is space, brake when traffic bunches up.

### interview
- The sender keeps a **congestion window** (cwnd); data in flight $\le \min(cwnd, rwnd)$. Loss is taken as the sign of congestion.
- **Slow start**: begin with a small cwnd (modern stacks use 10 segments) and add one segment per ACK, **doubling every RTT**, until cwnd reaches **ssthresh** or a loss happens.
- **Congestion avoidance**: above ssthresh, add about **one segment per RTT** (linear growth).
- **AIMD**: additive increase, multiplicative decrease. On **three duplicate ACKs** (Reno): **fast retransmit** the lost segment, set ssthresh = cwnd / 2 and continue from there (**fast recovery**). On a **timeout**: ssthresh = cwnd / 2, cwnd = 1 segment, slow start again. Tahoe also restarts from 1 on duplicate ACKs.
- AIMD makes competing flows converge to a **fair share** of the bottleneck.
- Modern algorithms: **CUBIC** (the default on Linux, Windows and macOS; cwnd grows as a cubic function of time since the last loss) and **BBR** (models bottleneck bandwidth and RTT instead of reacting to loss). **ECN** lets routers mark packets instead of dropping them.

### deep
#### Intuition

No sender knows the capacity of the path or how many others share it. TCP probes: it keeps raising its rate until something breaks (a packet is lost in an overflowing router queue), then backs off. Slow start finds the right order of magnitude fast; congestion avoidance fine-tunes gently; halving on loss drains the queues quickly.

#### Worked example: a Reno trace

cwnd is in segments, ssthresh starts at 16; three duplicate ACKs arrive in round 9 and a timeout happens in round 17.

```cpp
int main() {
    int cwnd = 1, ssthresh = 16;
    map<int, string> loss = {{9, "3 dup ACKs"}, {17, "timeout"}};
    string phase;                                    // the phase named on the current line
    for (int round = 1; round <= 22; ++round) {
        string now = cwnd < ssthresh ? "slow start" : "congestion avoidance";
        if (now != phase) {
            printf("%s%-21s", round > 1 ? "\n" : "", (now + ":").c_str());
            phase = now;
        }
        printf(" %d", cwnd);
        if (loss.count(round)) {
            ssthresh = max(cwnd / 2, 2);
            cwnd = loss[round] == "timeout" ? 1 : ssthresh;
            printf("  (%s, ssthresh %d)", loss[round].c_str(), ssthresh);
            phase = "";                              // start a new line after a loss
        } else if (cwnd < ssthresh) {
            cwnd = min(cwnd * 2, ssthresh);          // exponential growth
        } else {
            cwnd += 1;                               // additive increase
        }
    }
    printf("\n");
}
```

Output:

```text
slow start:           1 2 4 8
congestion avoidance: 16 17 18 19 20  (3 dup ACKs, ssthresh 10)
congestion avoidance: 10 11 12 13 14 15 16 17  (timeout, ssthresh 8)
slow start:           1 2 4
congestion avoidance: 8 9
```

Read it as the classic sawtooth: doubling up to 16, linear growth to 20, a halving to 10 after the duplicate ACKs (the network still delivers most packets, so a mild reaction), linear growth again, and a collapse to 1 after the timeout (nothing is getting through, so start over), then a fast climb back to the new ssthresh of 8.

#### Why halve and add one

With two flows sharing a link, additive increase moves both rates up equally, and multiplicative decrease cuts the larger one by more. Repeated over many cycles, the two rates converge toward equal shares, while the total hovers around capacity. Other combinations (such as additive decrease) do not converge to fairness.

#### Beyond Reno

| algorithm | growth | reacts to | notes |
|---|---|---|---|
| Tahoe | slow start, then linear | any loss: back to 1 | the first version |
| Reno and NewReno | same | duplicate ACKs: halve; timeout: back to 1 | fast recovery |
| CUBIC | cubic in time since the last loss, fast far from it, flat near it | loss | default in most operating systems; fills long fat pipes |
| BBR | paces at the estimated bottleneck bandwidth | measured bandwidth and minimum RTT | avoids filling buffers; used by large content providers |

Loss-based algorithms fill router buffers before they back off, adding queuing delay (bufferbloat). BBR and ECN try to keep queues short.

#### Pitfalls

- Slow start on every new connection is a real cost for short transfers; connection reuse keeps a warmed-up cwnd.
- Loss from a bad radio link is not congestion, but loss-based TCP backs off anyway, which hurts on Wi-Fi and cellular.
- A UDP application with no congestion control can starve TCP flows sharing the link.

Connects to: TCP flow control, TCP reliability, bandwidth, latency and throughput, QUIC, retries, timeouts and exponential backoff with jitter.

### questions
Q: Explain slow start and congestion avoidance.
A: Slow start begins with a small congestion window and increases it by one segment per ACK, doubling it every round trip, to find the available capacity quickly. Once the window reaches the slow start threshold, congestion avoidance takes over and grows it by about one segment per round trip, probing gently for more.

Q: How does TCP react to three duplicate ACKs versus a timeout?
A: Three duplicate ACKs mean later segments still arrive, so the network is only mildly congested: Reno retransmits the lost segment, halves the window and continues in congestion avoidance. A timeout means nothing is getting through: the threshold becomes half the window, the window drops to one segment and slow start begins again.

Q: What is AIMD and why is it used?
A: Additive increase, multiplicative decrease: grow the window by a constant each round trip and cut it by a factor, usually half, on loss. It lets flows probe for capacity gently while backing off fast, and it makes competing flows converge to fair shares of a bottleneck.

Q: What is the difference between the congestion window and the receive window?
A: The receive window is advertised by the receiver and reflects its free buffer space. The congestion window is kept by the sender and reflects its estimate of what the network path can carry. The sender may have at most the smaller of the two unacknowledged.

Q: How does BBR differ from loss-based congestion control?
A: Loss-based algorithms like Reno and CUBIC raise the rate until packets are dropped, which fills router buffers and adds delay. BBR estimates the bottleneck bandwidth and the minimum round-trip time and paces sending to match them, aiming for full throughput with short queues.

## cn.transport.head-of-line-blocking
name: "Head-of-line blocking"
importance: important
prereqs: [cn.transport.tcp-reliability]
scope: "in TCP and HTTP"

### simple
Head-of-line blocking happens when one slow or lost item at the front of a queue holds up everything behind it, even items that are ready. It is like a single checkout lane where one customer's price check stops the whole line. In networking it shows up in TCP, which must deliver bytes in order, and in older HTTP, which answers requests one at a time on a connection.

### interview
- **TCP-level**: TCP delivers a single ordered byte stream, so one lost segment stops delivery of all later data, even if it has arrived, until the retransmission fills the gap.
- **HTTP/1.1-level**: on one connection, responses come back in request order; a slow response blocks the ones behind it (pipelining had this problem and was rarely enabled). Browsers work around it with about **six connections per host**.
- **HTTP/2** multiplexes many streams over one TCP connection, removing HTTP-level blocking, but a single lost packet stalls **every** stream: TCP-level blocking gets worse with more streams on one connection.
- **HTTP/3 over QUIC** has independent streams over UDP: a loss only stalls the stream whose data was lost.
- The same idea appears elsewhere: a switch input queue blocked by a packet for a busy output, or a single-threaded queue behind one slow job.

### deep
#### Worked example: three streams, one lost packet

Six packets carry three streams, A, B and C, arriving one per millisecond; the packet with B's first piece is lost, and its retransmission arrives at t = 8.

```cpp
int main() {
    // packet order on the wire: A1 B1 C1 A2 B2 C2; B1 (arrival 2) is lost and resent at 8
    vector<pair<char, int>> packets = {{'A', 1}, {'B', 8}, {'C', 3}, {'A', 4}, {'B', 5}, {'C', 6}};
    map<char, int> oneStream, independent;           // when each stream's data is delivered
    int ordered = 0;                                 // TCP: nothing passes an earlier packet
    for (auto [stream, arrival] : packets) {
        ordered = max(ordered, arrival);
        oneStream[stream] = ordered;
        independent[stream] = max(independent[stream], arrival);   // QUIC: per-stream order
    }
    for (char s : {'A', 'B', 'C'})
        printf("stream %c complete: one TCP stream t=%d, independent streams t=%d\n", s,
               oneStream[s], independent[s]);
}
```

Output:

```text
stream A complete: one TCP stream t=8, independent streams t=4
stream B complete: one TCP stream t=8, independent streams t=8
stream C complete: one TCP stream t=8, independent streams t=6
```

Over a single TCP connection (HTTP/2), all three streams wait for B's retransmission. With independent streams (QUIC), only B waits; A and C finish on time.

#### The layers of the problem

| protocol | HTTP-level blocking | transport-level blocking |
|---|---|---|
| HTTP/1.1, one connection | yes: responses in order | yes |
| HTTP/1.1, six connections | reduced: six queues | per connection |
| HTTP/2 | no: multiplexed streams | yes: one loss stalls all streams |
| HTTP/3 (QUIC) | no | no: streams are independent |

On clean networks HTTP/2's single connection beats six HTTP/1.1 connections; on lossy mobile networks it can do worse, which motivated QUIC.

Connects to: TCP reliability, HTTP/1.1 vs HTTP/2 vs HTTP/3, QUIC, TCP vs UDP.

### questions
Q: What is head-of-line blocking in TCP?
A: TCP delivers bytes strictly in order, so if one segment is lost, everything that arrived after it waits in the receive buffer until the retransmission fills the gap. Unrelated data sharing the connection is delayed by one loss.

Q: Does HTTP/2 solve head-of-line blocking?
A: Only at the HTTP level. It multiplexes many streams on one connection so a slow response no longer blocks others, but all streams share one TCP byte stream, so a single lost packet still stalls every stream. HTTP/3 over QUIC removes the transport-level blocking.

Q: Why did browsers open several connections per host with HTTP/1.1?
A: HTTP/1.1 handles one request at a time per connection, since pipelining was unreliable and still returned responses in order. Opening about six parallel connections let a page load several resources at once and limited how much one slow response could block.

Q: How does QUIC avoid head-of-line blocking?
A: It runs independent streams over UDP and orders data only within each stream. A lost packet only delays the streams whose data it carried; other streams keep delivering data to the application.

## cn.transport.nagles-algorithm-and-delayed-acks
name: "Nagle's algorithm and delayed ACKs"
importance: advanced
prereqs: [cn.transport.tcp-flow-control]
scope: "Nagle's algorithm and delayed ACKs"

### simple
Nagle's algorithm makes TCP wait and bundle tiny writes into bigger packets instead of sending many small ones, and delayed ACKs make the receiver wait briefly before acknowledging, hoping to combine the ACK with a reply. Each saves packets on its own, like waiting to fill a delivery van. Together they can make both sides wait for each other, adding a noticeable pause.

### interview
- **Nagle's algorithm**: while any sent data is unacknowledged, hold new small writes and send them together when the ACK arrives or a full segment's worth builds up. It stops floods of tiny packets (one keystroke per packet with 40 bytes of headers).
- **Delayed ACK**: the receiver waits up to a timeout (about 40 ms minimum on Linux, commonly 200 ms elsewhere) or until a second full segment arrives before ACKing, so the ACK can ride on a response.
- **The bad interaction**: write, write, read. The first small write goes out; the second waits for its ACK (Nagle); the receiver will not respond until it has the whole request and delays its ACK. Nothing moves until the delayed ACK timer fires.
- Fixes: **send the whole message in one write** (build it in a buffer or use `writev`), set **TCP_NODELAY** for latency-sensitive small messages (RPC, games, trading), use **TCP_CORK** or `MSG_MORE` to batch intentionally, or **TCP_QUICKACK** on the receiver.
- Linux often ACKs right away when the application reads small pushed segments: a write-write-read loop over loopback on the test machine showed no stall. The stall still shows up with other stacks and read patterns, and it is why latency-sensitive code sets TCP_NODELAY.

### deep
#### The stall, step by step

A client sends a request as a 20-byte header write followed by a 100-byte body write, then waits for the response.

| time | client | server |
|---|---|---|
| 0 ms | sends header (nothing outstanding, so Nagle allows it) | receives header, waits for the body; delays its ACK |
| 0 ms | body is small and the header is unacknowledged: Nagle holds it | |
| 40 to 200 ms | | delayed ACK timer fires: ACK for the header |
| then | ACK arrives: body is sent | full request: sends the response |

Each side is being reasonable, yet the request is delayed by the whole delayed ACK timeout.

#### Fixing it in code

The cleanest fix is to hand TCP the whole message at once; `TCP_NODELAY` is right when the program deliberately sends small, independent messages.

```cpp
#include <sys/uio.h>
#include <netinet/tcp.h>

bool sendRequest(int fd, const string& header, const string& body) {
    iovec parts[2] = {{const_cast<char*>(header.data()), header.size()},
                      {const_cast<char*>(body.data()), body.size()}};
    ssize_t n = writev(fd, parts, 2);                 // one call: header and body leave together
    return n == ssize_t(header.size() + body.size());
}

void lowLatency(int fd) {
    int on = 1;
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &on, sizeof on);   // no Nagle on this socket
}
```

Disabling Nagle while still writing many tiny pieces produces many tiny packets, so batching writes is still the application's job.

Connects to: TCP flow control, TCP reliability, TCP vs UDP, socket programming basics.

### questions
Q: What does Nagle's algorithm do?
A: While there is unacknowledged data, TCP holds back new small writes and combines them into a larger segment, sent when the outstanding data is acknowledged or a full segment accumulates. It reduces the number of tiny packets, each of which carries 40 or more bytes of headers.

Q: What are delayed ACKs?
A: The receiver waits a short time, tens to hundreds of milliseconds, or until two full segments have arrived, before sending an acknowledgement, so the ACK can be combined with response data or cover several segments.

Q: Why can Nagle's algorithm and delayed ACKs together add latency?
A: If an application writes a request in two small pieces and then waits for a reply, Nagle holds the second piece until the first is acknowledged, while the receiver delays its ACK because it has no reply yet. Both wait until the delayed ACK timer fires.

Q: When should you set TCP_NODELAY?
A: When the application sends small, latency-sensitive messages that must go out immediately, such as RPC calls, interactive games or trading messages, and it already writes each message in one call. Otherwise, writing whole messages at once is the better fix.

## cn.transport.quic
name: "QUIC"
importance: advanced
prereqs: [cn.transport.tcp-vs-udp]
scope: "transport over UDP for HTTP/3"

### simple
QUIC is a newer transport protocol that runs on top of UDP and gives what TCP gives, reliable ordered delivery and congestion control, plus built-in encryption and several independent streams in one connection. It is like replacing one long single-file tunnel with a road of separate lanes that is secure from the start. HTTP/3 is HTTP carried over QUIC.

### interview
- **QUIC** runs over **UDP** and implements reliability, congestion control and flow control itself, usually in a **user-space library** rather than the kernel, so it can evolve quickly.
- **TLS 1.3 is built in**: the transport and crypto handshakes are combined, so a new connection takes **1 RTT** (TCP plus TLS 1.3 takes 2); resumed connections can send data in **0-RTT** (replayable, so only for safe, idempotent requests).
- **Independent streams**: a lost packet only stalls the streams it carried, removing TCP's head-of-line blocking for HTTP/3.
- **Connection IDs** instead of the IP and port 4-tuple, so a connection survives a network change (Wi-Fi to cellular): **connection migration**.
- Packet numbers, acknowledgements and all other transport control data are **encrypted**; only a few fields such as the connection ID stay visible. Middleboxes cannot come to depend on the details (ossification). Every packet number is new, so retransmissions are never ambiguous.
- Costs: more CPU than kernel TCP, some networks block or throttle UDP (browsers fall back to TCP), and load balancers must route by connection ID.

### deep
#### Round trips before the first request

| stack | handshake round trips | request goes out after |
|---|---|---|
| TCP + TLS 1.2 | 1 (TCP) + 2 (TLS) | 3 RTT |
| TCP + TLS 1.3 | 1 + 1 | 2 RTT |
| QUIC (new connection) | 1 (combined) | 1 RTT |
| QUIC resumption with 0-RTT | 0 | immediately, with the first packet |

At a 100 ms round trip on a mobile network, going from 2 RTT to 1 RTT saves 100 ms on every new connection.

#### Why build on UDP

A new transport protocol with its own IP protocol number would be dropped by many firewalls and NATs, and changing TCP needs kernel upgrades on billions of devices. UDP passes through almost everything, and a library shipped inside the browser or app can be updated with the app. Encrypting the transport headers keeps the protocol free to change later, because middleboxes cannot inspect (and therefore cannot depend on) its fields.

#### Connection migration

A TCP connection is its 4-tuple: when a phone moves from Wi-Fi to cellular, its IP address changes and every connection breaks. A QUIC connection is named by connection IDs chosen by the endpoints, so packets from the new address carrying a known ID continue the same connection after a quick path validation.

Connects to: TCP vs UDP, head-of-line blocking, HTTP/1.1 vs HTTP/2 vs HTTP/3, HTTPS and TLS, TCP congestion control.

### questions
Q: What is QUIC and why was it built on UDP?
A: QUIC is a transport protocol providing reliable, encrypted, multiplexed streams, used by HTTP/3. It runs over UDP because new IP protocols are blocked by many middleboxes and TCP changes need kernel updates everywhere, while UDP passes through nearly all networks and QUIC can ship as a library inside applications.

Q: How does QUIC reduce connection setup time?
A: It combines the transport handshake with the TLS 1.3 handshake, so a new connection is ready after one round trip instead of two for TCP plus TLS 1.3. When resuming a previous connection, a client can send data in its very first packet, called 0-RTT.

Q: What is connection migration in QUIC?
A: QUIC identifies connections by connection IDs rather than by IP addresses and ports. When a device changes networks and gets a new address, it keeps using the same connection ID, so the connection continues instead of breaking as a TCP connection would.

Q: What are the risks of 0-RTT data?
A: 0-RTT data can be captured and replayed by an attacker, because it is sent before the handshake proves freshness. Servers should accept only idempotent requests, such as simple GETs, in 0-RTT, or use replay protection.
