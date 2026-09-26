// Design practice prompts (BUILD_SPEC.md 8.4, F26): one original prompt per concept in
// lld.classics and sysd.classics, scoped for a 45-minute interview, with 3 to 5 "must discuss"
// points used as the review rubric. Prompts are written for this app; none is copied.
import { slugifyConceptName } from "@/lib/slug";
import type { Difficulty, SeedProblem } from "@/lib/types";

interface DesignPrompt {
  name: string; // the concept name in lld.classics / sysd.classics
  difficulty: Difficulty;
  prompt: string;
  rubric: string[];
}

function make(kind: "lld" | "hld", p: DesignPrompt): SeedProblem {
  const topicId = kind === "lld" ? "lld.classics" : "sysd.classics";
  const slug = slugifyConceptName(p.name);
  return {
    id: `${kind}-${slug}`,
    source: kind === "lld" ? "design-lld" : "design-hld",
    title: p.name,
    difficulty: p.difficulty,
    topicId,
    conceptIds: [`${topicId}.${slug}`],
    prompt: p.prompt,
    rubric: p.rubric,
  };
}

const LLD: DesignPrompt[] = [
  {
    name: "Parking lot",
    difficulty: "medium",
    prompt:
      "Design the classes for a multi-floor parking lot that supports bikes, cars and trucks. Vehicles get a ticket on entry and pay on exit based on duration and vehicle type. Show how you'd add electric charging spots later.",
    rubric: [
      "Spot types and the strategy for assigning a spot to a vehicle",
      "Ticket and payment flow from entry to exit",
      "Pricing as a pluggable strategy",
      "Concurrency when two cars try to take the same spot",
      "Extensibility, such as adding charging spots without rewrites",
    ],
  },
  {
    name: "Elevator system",
    difficulty: "hard",
    prompt:
      "Design the classes for the elevators of a 20-floor office building with three cars. People press up or down on a floor and choose a destination inside the car. Decide which car answers each call, and show how that dispatch strategy could be swapped later. Keep doors, direction and maintenance mode consistent.",
    rubric: [
      "Modeling of cars, floors, and hall versus in-car requests",
      "Dispatch as a pluggable strategy (for example nearest car or sweep in one direction)",
      "Elevator state machine: idle, moving, doors open, maintenance",
      "Handling many requests arriving at once safely",
      "Extensions such as express cars or restricted floors",
    ],
  },
  {
    name: "Movie ticket booking",
    difficulty: "medium",
    prompt:
      "Design the classes for a movie ticket booking app covering cinemas, screens, shows and seats. A customer picks a show, selects seats, and has a few minutes to pay before the seats are released. Two customers must never book the same seat. Prices vary by seat type and show time.",
    rubric: [
      "Entities: cinema, screen, show, seat, booking, payment",
      "Temporary seat holds that expire",
      "Preventing double booking under concurrent requests",
      "Pricing rules by seat type and show time",
      "Booking lifecycle, cancellation and refunds",
    ],
  },
  {
    name: "Splitwise",
    difficulty: "medium",
    prompt:
      "Design the classes for an expense-sharing app where friends record shared expenses and see who owes whom. An expense can be split equally, by exact amounts or by percentages. Show each person's balance and a short list of payments that settles the whole group.",
    rubric: [
      "User, group, expense and split modeling",
      "Split types behind one interface, with validation that parts add up",
      "Updating balances when an expense is added or edited",
      "Simplifying debts into few payments (for example greedy matching of largest creditor and debtor)",
      "Handling money precisely (integer smallest units, rounding leftovers)",
    ],
  },
  {
    name: "Snake and ladder",
    difficulty: "easy",
    prompt:
      "Design a snake and ladder game for two to four players on a 100-cell board. Players take turns rolling a die, moving, and following snakes and ladders until someone lands exactly on 100. The board layout and the dice should be configurable, and the game should run from a simple command-line loop.",
    rubric: [
      "Board, cell and jump (snake or ladder) modeling",
      "Turn order and the game loop",
      "Dice behind an interface (one die, two dice, a fixed test die)",
      "Win condition and the rule for rolling past 100",
      "Validating a board configuration",
    ],
  },
  {
    name: "Tic-tac-toe and chess",
    difficulty: "medium",
    prompt:
      "Design a board game framework that runs tic-tac-toe on an n × n board and could later run chess. Players alternate moves, invalid moves are rejected, and the game detects a win or a draw. Explain which classes change and which stay the same when chess is added.",
    rubric: [
      "Board, piece, player and move abstractions",
      "Move validation per piece type through polymorphism",
      "Win detection in O(1) per move for tic-tac-toe (row, column and diagonal counters)",
      "Game state, turn handling and undo",
      "What chess adds (check, special moves) and how the design absorbs it",
    ],
  },
  {
    name: "LRU cache as a class design",
    difficulty: "medium",
    prompt:
      "Design an in-memory cache library with a fixed capacity that evicts the least recently used entry by default. Callers can get, put and remove keys in O(1). Make the eviction policy pluggable so LFU or FIFO can be added later, and make the cache safe to share between threads.",
    rubric: [
      "Cache interface with generic key and value types",
      "Hash map plus doubly linked list for O(1) operations",
      "Eviction policy as a strategy interface",
      "Thread safety and the cost of the chosen locking",
      "Optional extras: time-to-live and hit-rate metrics",
    ],
  },
  {
    name: "Rate limiter",
    difficulty: "medium",
    prompt:
      "Design a rate limiter library that an API server calls before handling each request. Limits are per user and per endpoint, such as 100 requests per minute. Support at least two algorithms, such as token bucket and sliding window, chosen by configuration.",
    rubric: [
      "A rate limiter interface with algorithms as strategies",
      "Token bucket details: capacity, refill rate, lazy refill on each call",
      "Sliding window log versus counter trade-offs",
      "Per-key state, and cleaning up keys that go quiet",
      "Atomic updates when many threads check the same key",
    ],
  },
  {
    name: "Logger framework",
    difficulty: "medium",
    prompt:
      "Design a logging library that applications use to write messages at levels such as DEBUG, INFO, WARN and ERROR. A message can go to several destinations at once, such as the console, a file or a remote service, each with its own minimum level and format. Logging must not noticeably slow the application down.",
    rubric: [
      "Log levels and filtering",
      "Destinations (appenders) and formatters behind interfaces",
      "Routing messages with chain of responsibility or observer",
      "Asynchronous writing with a buffer and what happens when it fills",
      "Configuration and how callers obtain a logger",
    ],
  },
  {
    name: "Vending machine",
    difficulty: "medium",
    prompt:
      "Design the classes for a vending machine that sells snacks paid for with coins and notes. A customer selects an item, inserts money, and receives the item and change, or cancels to get a refund. The machine must handle sold-out items and running short of change.",
    rubric: [
      "State pattern: idle, has money, dispensing, out of service",
      "Inventory and product modeling",
      "Payment and making change by denomination, including when change is impossible",
      "Cancel and refund flow",
      "Operator actions such as restocking and collecting cash",
    ],
  },
  {
    name: "ATM",
    difficulty: "medium",
    prompt:
      "Design the software for an ATM that supports balance inquiry, cash withdrawal and deposit after card and PIN checks. The ATM talks to the bank's servers and has a cash dispenser with a limited number of notes of each denomination. A failure in the middle of a withdrawal must never lose money.",
    rubric: [
      "ATM state machine: idle, card inserted, authenticated, in a transaction",
      "Transaction types as separate classes",
      "Dispensing notes by denomination (chain of responsibility)",
      "Bank communication failures, rollback and safe retries",
      "Security: PIN attempt limits, card retention, session timeout",
    ],
  },
  {
    name: "Library management",
    difficulty: "medium",
    prompt:
      "Design a library system where members search the catalog, borrow and return books, and reserve books that are checked out. Each book can have many physical copies. Members have borrowing limits and pay fines for late returns.",
    rubric: [
      "A book (title) versus its physical copies",
      "Member, loan and reservation entities",
      "Borrowing rules and limits",
      "Fine calculation as a replaceable rule",
      "Searching the catalog and notifying members when a reserved copy returns",
    ],
  },
  {
    name: "Hotel booking",
    difficulty: "medium",
    prompt:
      "Design a hotel reservation system for a chain with several room types. Guests search availability for a date range, book rooms, and cancel under a policy. A room must never be booked twice for overlapping dates.",
    rubric: [
      "Hotel, room, room type and reservation modeling",
      "Availability search over date ranges (interval overlap)",
      "Preventing double booking under concurrent requests",
      "Pricing by season and room type, and the cancellation policy",
      "Reservation and payment states",
    ],
  },
  {
    name: "Ride sharing",
    difficulty: "medium",
    prompt:
      "Design the core classes for a ride-sharing app. A rider requests a trip from a pickup point to a drop-off point, the system matches a nearby available driver, and the trip moves through its states until payment. Show how matching and fare calculation could change without touching the rest.",
    rubric: [
      "Rider, driver, vehicle and trip entities",
      "Trip state machine: requested, accepted, in progress, completed, cancelled",
      "Driver matching as a strategy",
      "Fare calculation as a strategy (base fare, distance, time, surge)",
      "Making sure one driver is never assigned to two trips",
    ],
  },
  {
    name: "Food delivery",
    difficulty: "medium",
    prompt:
      "Design the classes for a food delivery app with restaurants, menus, carts and orders. A customer orders from one restaurant, pays, and tracks the order until a delivery partner drops it off. Delivery partners are assigned automatically, and a restaurant may reject an order.",
    rubric: [
      "Restaurant, menu item, cart and order modeling",
      "Order state machine, including rejection and cancellation",
      "Delivery partner assignment strategy",
      "Payments and refunds",
      "Notifying the customer, restaurant and partner (observer)",
    ],
  },
  {
    name: "Notification service",
    difficulty: "medium",
    prompt:
      "Design a notification library that other services use to message users by email, SMS or push. Messages are built from templates with variables, respect each user's channel preferences, and are retried when a provider fails. Adding a new channel should not change existing code.",
    rubric: [
      "Channels and providers behind interfaces (strategy or factory)",
      "Templates and filling in variables",
      "User preferences and opt-outs",
      "Retries with backoff and a place for messages that keep failing",
      "Rate limits and avoiding duplicate sends",
    ],
  },
  {
    name: "Pub-sub message queue",
    difficulty: "medium",
    prompt:
      "Design an in-memory publish-subscribe queue. Publishers send messages to named topics, and each subscriber receives every message of the topics it follows, in order, at its own pace. A slow subscriber must not hold up the others.",
    rubric: [
      "Topic, message, subscriber and offset modeling",
      "Per-subscriber offsets so ordering holds at each subscriber's own pace",
      "Thread-safe publishing and consuming",
      "Retention and cleanup of messages everyone has read",
      "Delivery guarantees and acknowledgements",
    ],
  },
  {
    name: "In-memory key-value store",
    difficulty: "medium",
    prompt:
      "Design an in-memory key-value store that supports get, set and delete, with an optional time-to-live per key. It must also support transactions with begin, commit and rollback, including transactions nested inside other transactions. Keep it to a single process, and explain how the store stays correct when several threads use it at once.",
    rubric: [
      "Core storage and the public API",
      "Expiry: checking lazily on read versus cleaning up in the background",
      "Transactions as a stack of change logs",
      "Semantics of nested commit and rollback",
      "Thread safety",
    ],
  },
  {
    name: "File system",
    difficulty: "hard",
    prompt:
      "Design an in-memory file system with directories and files. Support creating, reading, writing, moving and deleting paths such as /home/user/notes.txt, and listing a directory. Include simple permissions for the owner and for everyone else.",
    rubric: [
      "Files and directories treated uniformly (composite pattern)",
      "Parsing and walking paths",
      "Edge cases: name clashes, moving a folder into itself, deleting non-empty folders",
      "Permission checks",
      "Sizes and metadata",
    ],
  },
  {
    name: "Online shopping cart and inventory",
    difficulty: "hard",
    prompt:
      "Design the cart, inventory and checkout parts of an online store. Customers add items to a cart, and stock is reserved during checkout so two customers can't both buy the last unit. Reservations that aren't paid for expire and return their stock.",
    rubric: [
      "Product, inventory, cart and order modeling",
      "Reserving stock with an expiry",
      "Preventing overselling under concurrent checkouts",
      "Discounts and coupons as rules",
      "Order and payment state transitions",
    ],
  },
  {
    name: "Meeting room scheduler",
    difficulty: "hard",
    prompt:
      "Design a meeting room booking system for an office. Employees book rooms by capacity and time, see conflicts, and create recurring meetings such as every Monday at 10:00. When the requested room is taken, the system suggests another one.",
    rubric: [
      "Room, meeting, booking and recurrence rule modeling",
      "Conflict detection as interval overlap, with a structure that stays fast",
      "Expanding recurring meetings and handling exceptions to them",
      "A strategy for suggesting another room",
      "Two people booking the same slot at the same moment",
    ],
  },
  {
    name: "Task scheduler",
    difficulty: "hard",
    prompt:
      "Design a task scheduler library that runs tasks after a delay, at a fixed time, or on a repeating schedule. Tasks run on a pool of worker threads, and callers can cancel scheduled tasks. Decide clearly what happens to runs that were missed while the process was paused.",
    rubric: [
      "Task and schedule types: one-off, fixed rate, fixed delay",
      "A priority queue ordered by next run time",
      "The dispatch loop and the worker thread pool",
      "Cancellation and handling a task that throws",
      "Clock issues: missed runs and drift",
    ],
  },
  {
    name: "Stack Overflow",
    difficulty: "hard",
    prompt:
      "Design the classes for a question-and-answer site. Users post questions with tags, answer them, comment, vote, and accept an answer. Reputation changes with votes, and some actions need a minimum reputation.",
    rubric: [
      "User, question, answer, comment, tag and vote modeling",
      "Voting rules and reputation updates",
      "Permissions that depend on reputation",
      "Searching by tags and keywords",
      "Moderation (closing, flagging) and badges as extensions",
    ],
  },
  {
    name: "Car rental and Amazon locker",
    difficulty: "hard",
    prompt:
      "Design two systems that share one idea: reserving a resource from a pool. A car rental service lets customers reserve a car type for dates and pick it up at a branch. A parcel locker assigns each delivery the smallest free locker that fits. Show which classes the two designs share.",
    rubric: [
      "Resource, reservation and slot modeling shared by both systems",
      "Assignment strategies: availability by car type and dates, smallest fitting locker",
      "Expiry and release: no-shows and parcels that are never collected",
      "Concurrency when assigning the last car or locker",
      "Fees and notifications",
    ],
  },
];

const HLD: DesignPrompt[] = [
  {
    name: "URL shortener",
    difficulty: "medium",
    prompt:
      "Design a service that turns long URLs into short links and redirects users, handling 100 million new links per month and 10 times more redirects.",
    rubric: [
      "ID generation and avoiding collisions",
      "Storage choice and a size estimate",
      "Caching for a read-heavy workload",
      "Keeping redirect latency low",
      "Collecting analytics without slowing redirects",
    ],
  },
  {
    name: "Rate limiter service",
    difficulty: "medium",
    prompt:
      "Design a rate-limiting service that protects a public API used by millions of clients. Limits are per API key and per endpoint, and must hold across dozens of API servers. Checking a limit should add only a few milliseconds to each request.",
    rubric: [
      "Algorithm choice: token bucket versus sliding window",
      "A shared counter store with atomic updates",
      "Where the limiter runs: gateway, service or sidecar",
      "What happens when the counter store is down (fail open or closed)",
      "Responses clients see (429 status, retry-after) and race conditions",
    ],
  },
  {
    name: "Pastebin",
    difficulty: "medium",
    prompt:
      "Design a service where users paste text, get a short link to share it, and can set an expiry and privacy level. Expect 10 million new pastes a month, far more reads, and pastes up to 1 MB. Cover how pastes are stored and served, and how expired pastes are cleaned up.",
    rubric: [
      "Generating keys for new pastes",
      "Content in object storage, metadata in a database",
      "Read path with caching and a CDN",
      "Expiry and cleanup jobs",
      "Capacity estimates for storage and traffic",
    ],
  },
  {
    name: "Key-value store",
    difficulty: "hard",
    prompt:
      "Design a distributed key-value store that holds more data than one machine can, stays available when machines fail, and serves reads and writes in a few milliseconds. Explain how a client finds the right node and what consistency it gets. Focus on partitioning, replication and what happens when a node fails.",
    rubric: [
      "Partitioning with consistent hashing and virtual nodes",
      "Replication and quorums (R + W > N)",
      "The consistency model and resolving conflicting versions",
      "Failure detection, hinted handoff and repairing replicas (Merkle trees)",
      "Storage engine: write-ahead log and LSM tree",
    ],
  },
  {
    name: "Web crawler",
    difficulty: "medium",
    prompt:
      "Design a web crawler that downloads a billion pages a month to build a search index. It must respect robots.txt, never overload any single website, avoid fetching the same page twice, and keep pages reasonably fresh. Focus on the order in which URLs are fetched, politeness toward each website, and deduplication.",
    rubric: [
      "URL frontier with priorities and per-host politeness queues",
      "Distributed fetchers and DNS caching",
      "Deduplicating URLs and page content (hashes, Bloom filters)",
      "robots.txt rules and crawler traps",
      "Storing pages and scheduling recrawls",
    ],
  },
  {
    name: "Notification system",
    difficulty: "medium",
    prompt:
      "Design a notification system that sends push, SMS and email for many product teams: about 50 million notifications a day, with spikes. Users set preferences, and some messages, like one-time passwords, must arrive within seconds. Explain how urgent messages avoid waiting behind large campaigns, and how failed sends are retried without duplicates.",
    rubric: [
      "An API in front of a queue per channel",
      "Priorities so urgent messages skip the line",
      "Preferences, templates and rate limits",
      "Retries against third-party providers without duplicates",
      "Tracking delivery status",
    ],
  },
  {
    name: "News feed",
    difficulty: "medium",
    prompt:
      "Design the home feed of a social network with 300 million daily users. Users follow others and see recent posts from the people they follow, ranked by relevance. Some accounts have millions of followers.",
    rubric: [
      "Fan-out on write versus on read, and a hybrid for very popular accounts",
      "Storing precomputed feeds in a cache",
      "The ranking step",
      "Pagination of an ever-changing feed",
      "Media storage and CDN",
    ],
  },
  {
    name: "Chat application",
    difficulty: "medium",
    prompt:
      "Design a messaging app with one-to-one and group chats for 50 million daily users. Messages arrive in real time, show sent, delivered and read receipts, and sync across each user's devices. Focus on how messages reach users who are online or offline, and how group chats fan out.",
    rubric: [
      "Persistent connections (WebSockets) and connection servers",
      "Routing and ordering messages within a conversation",
      "Storing messages and chat history",
      "Offline delivery, push notifications and multi-device sync",
      "Group fan-out and receipts in groups",
    ],
  },
  {
    name: "Photo sharing app",
    difficulty: "medium",
    prompt:
      "Design a photo-sharing app where users upload photos, follow each other, and scroll a feed of photos. Expect 100 million uploads a day and much heavier read traffic. Cover the upload path, how images are served, and how each user's feed is built.",
    rubric: [
      "Upload flow straight to object storage and a resizing pipeline",
      "Metadata storage",
      "Generating the feed",
      "Serving images through a CDN",
      "Capacity estimates",
    ],
  },
  {
    name: "Video streaming platform",
    difficulty: "medium",
    prompt:
      "Design a video platform where creators upload videos and viewers stream them on phones and TVs with smooth playback. Plan for millions of viewers at once across many countries. Cover what happens between an upload and the first playable stream, and how video reaches viewers far from your servers.",
    rubric: [
      "Upload and transcoding into several resolutions",
      "Adaptive bitrate streaming with short segments",
      "CDN distribution and edge caching",
      "Metadata and search, kept separate from video delivery",
      "Counting views at scale",
    ],
  },
  {
    name: "File storage and sync",
    difficulty: "medium",
    prompt:
      "Design a cloud drive where users edit files on several devices, changes sync within seconds, and large files upload reliably over flaky networks. Files can be several gigabytes, and two devices may change the same file while one of them is offline. Focus on uploads, the sync protocol and conflicts.",
    rubric: [
      "Chunking with content hashes for deduplication and resumable uploads",
      "A metadata service with file versions",
      "The sync protocol and change notifications",
      "Handling conflicting edits",
      "Storage cost",
    ],
  },
  {
    name: "Ride-hailing",
    difficulty: "medium",
    prompt:
      "Design the backend of a ride-hailing app for a large city. Drivers send their location every few seconds, riders request a ride, and the system matches a nearby driver within seconds and tracks the trip. Focus on finding nearby drivers quickly and making sure each trip gets exactly one driver.",
    rubric: [
      "Ingesting a high rate of location updates",
      "Geospatial indexing (geohash or quadtree) to find nearby drivers",
      "Matching and dispatch, including drivers who decline",
      "Trip state, with exactly one driver per trip",
      "Surge pricing and arrival estimates",
    ],
  },
  {
    name: "Typeahead autocomplete",
    difficulty: "medium",
    prompt:
      "Design the search-box autocomplete for a large website. As the user types, show the top 10 suggestions within about 100 milliseconds, based on what people search most. New trending searches should appear within an hour.",
    rubric: [
      "A trie with the top suggestions stored at each prefix",
      "Collecting and aggregating search logs (batch or streaming)",
      "Serving from memory, caching, and sharding by prefix",
      "Latency budget and client-side debouncing",
      "Refreshing suggestions and filtering unsafe ones",
    ],
  },
  {
    name: "E-commerce and flash sales",
    difficulty: "medium",
    prompt:
      "Design the ordering system of an online store that runs flash sales, where a million users try to buy 10,000 discounted units in the same second. The store must never sell more units than it has. Hold units for buyers while they pay, and keep the rest of the store usable during the rush.",
    rubric: [
      "Inventory counters with atomic decrements",
      "Queueing and throttling the incoming rush",
      "Reserving units while payment completes, with a timeout",
      "Preventing overselling and blocking bots",
      "Keeping the rest of the site healthy during the spike",
    ],
  },
  {
    name: "Ticket booking",
    difficulty: "medium",
    prompt:
      "Design a ticketing system for concerts where popular shows sell out in minutes. Users see a seat map, hold seats for a few minutes while paying, and must never receive a seat someone else bought. Plan for a rush of fans the moment sales open.",
    rubric: [
      "Seat inventory and holds with an expiry",
      "Locking versus optimistic concurrency for seats",
      "A virtual waiting room for spikes",
      "Payment integration and idempotency",
      "Consistency versus availability choices",
    ],
  },
  {
    name: "Payment system",
    difficulty: "medium",
    prompt:
      "Design the payment backend for an online marketplace that charges buyers through external payment providers and pays sellers later. No payment may be charged twice or lost, even when requests time out and are retried. Explain how money movements are recorded and checked against the providers' own reports.",
    rubric: [
      "Idempotency keys on every payment request",
      "A double-entry ledger",
      "The payment state machine and asynchronous provider callbacks",
      "Reconciliation against provider reports",
      "Retries, exactly-once effects, and security",
    ],
  },
  {
    name: "Leaderboard",
    difficulty: "medium",
    prompt:
      "Design a real-time leaderboard for a mobile game with 50 million players. Players see the global top 100 and their own rank, updated within seconds of a new score. Daily and weekly boards reset on schedule, alongside the all-time board.",
    rubric: [
      "Sorted sets for ranking",
      "Sharding scores and still answering a player's global rank",
      "Approximate ranks for players far from the top",
      "The write path and validating submitted scores",
      "Daily and weekly boards",
    ],
  },
  {
    name: "Distributed cache",
    difficulty: "medium",
    prompt:
      "Design a distributed in-memory cache used by many services, holding hundreds of gigabytes with sub-millisecond reads. Nodes can be added or can fail without most keys moving or disappearing. Explain how very popular keys are handled and how the cache stays consistent with the database behind it.",
    rubric: [
      "Consistent hashing and how clients route requests",
      "Eviction policies and memory limits",
      "Replication and failover",
      "Hot keys and cache stampedes",
      "Keeping the cache consistent with the database",
    ],
  },
  {
    name: "Distributed message queue",
    difficulty: "medium",
    prompt:
      "Design a distributed message queue that producers write to and many consumer groups read from. It must handle millions of messages per second, keep order within a partition, and keep data for several days. Explain what happens when a broker fails and how consumers keep track of their progress.",
    rubric: [
      "Topics and partitions stored as append-only logs",
      "Replication, leader election and acknowledgements",
      "Consumer groups and offsets",
      "Delivery guarantees (at-least-once, idempotent producers)",
      "Retention and log compaction",
    ],
  },
  {
    name: "Stock exchange matching engine",
    difficulty: "hard",
    prompt:
      "Design the matching engine of a stock exchange. Traders send limit orders, market orders and cancellations; the engine matches them by price-time priority and publishes trades and market data. Latency matters at the microsecond level and results must be deterministic.",
    rubric: [
      "Order book structures: price levels with first-in, first-out queues",
      "The matching algorithm and order types",
      "A single-threaded sequencer for determinism",
      "Low-latency techniques: in memory, no allocation on the hot path",
      "Recovery by replaying a journal, and publishing market data",
    ],
  },
  {
    name: "Collaborative document editing",
    difficulty: "hard",
    prompt:
      "Design a collaborative document editor where several people edit the same document at once and see each other's changes and cursors within a second. Edits made offline merge when the user reconnects. Explain how concurrent edits to the same sentence are merged, and how version history is kept.",
    rubric: [
      "Operational transforms versus CRDTs",
      "The real-time channel and presence",
      "Storage: snapshots plus an operation log",
      "Merging offline edits",
      "Permissions and version history",
    ],
  },
  {
    name: "Metrics and monitoring system",
    difficulty: "hard",
    prompt:
      "Design a monitoring system that collects metrics such as CPU usage and request latency from 100,000 servers every 10 seconds, stores them, draws dashboards and fires alerts. Dashboards should load in a few seconds even over a month of data. Explain how data is stored for the long term and how alert rules are evaluated.",
    rubric: [
      "Push versus pull collection and the ingestion pipeline",
      "Time-series storage, compression, downsampling and retention",
      "Queries and aggregation for dashboards",
      "Evaluating alert rules and notifying people",
      "Scale estimates and keeping the monitor itself available",
    ],
  },
];

export const DESIGN_PROBLEMS: readonly SeedProblem[] = [
  ...LLD.map((p) => make("lld", p)),
  ...HLD.map((p) => make("hld", p)),
];
