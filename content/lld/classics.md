---
topic: lld.classics
name: "Classic LLD problems"
subject: lld
order: 2
prereqs: [lld.method]
---

## lld.classics.parking-lot
name: "Parking lot"
importance: must
prereqs: [lld.method.clarifying-requirements]
scope: "spots, vehicles, tickets, pricing strategies"

### simple
A parking lot design gives each arriving vehicle a suitable free spot and a ticket, then charges it on the way out. Think of an attendant with a clipboard: find a spot that fits, note the time, and at the exit work out the fee and free the spot. The interesting parts are choosing the spot, pricing the stay and never giving one spot to two cars.

### interview
- Entities: `ParkingLot` owns `Spot`s (grouped by floor) and open `Ticket`s; a vehicle is a value (plate and kind); spot sizes small, medium and large fit bikes, cars and trucks.
- **Spot assignment is a strategy** (`SpotPicker`): smallest fitting spot on the lowest floor by default; "keep large spots for trucks" or "nearest to the lift" are other implementations.
- **Pricing is a strategy** (`Pricing`): per started hour by vehicle kind; weekend or flat-rate rules are new classes.
- Flow: `enter` picks a spot, marks it taken and returns a ticket; at exit, `quote` gives the fee, payment happens outside the lot, then `release` frees the spot. An unknown or reused ticket is rejected.
- **Concurrency**: several gates call `enter` at once, so picking and taking a spot is one critical section under a mutex (or one lock per floor).
- Extensions: charging spots as a spot feature plus a picker that prefers them; reservations; floor displays as observers of spot changes.

### deep
#### Requirements (agreed)

Floors of small, medium and large spots; a vehicle gets the smallest free spot that fits and a ticket; the fee depends on duration and vehicle kind; several gates work at once; pricing will change. Out of scope: payment gateways, reservations, persistence.

#### Classes

```text
ParkingLot "1" *-- "*" Spot            each spot knows its floor and size
ParkingLot "1" *-- "*" Ticket          open tickets by id
Ticket --> Spot
ParkingLot --> SpotPicker     <<interface>>   SmallestFit ..|> SpotPicker
ParkingLot --> Pricing        <<interface>>   HourlyByKind ..|> Pricing
```

#### Code

```cpp
enum class Kind { Bike, Car, Truck };             // also the spot size each one needs
struct Spot { int floor, number; Kind size; bool free = true; };
struct Ticket { int id; string plate; Kind kind; Spot* spot; int inMinute; };

struct SpotPicker {                               // strategy: which spot a vehicle gets
    virtual ~SpotPicker() = default;
    virtual Spot* pick(vector<Spot>& spots, Kind k) const = 0;
};
struct SmallestFit : SpotPicker {                 // smallest fitting size, lowest floor
    Spot* pick(vector<Spot>& spots, Kind k) const override {
        Spot* best = nullptr;
        for (auto& s : spots)
            if (s.free && s.size >= k && (!best || s.size < best->size)) best = &s;
        return best;
    }
};

struct Pricing {                                  // strategy: the fee for a stay
    virtual ~Pricing() = default;
    virtual int fee(Kind k, int minutes) const = 0;
};
struct HourlyByKind : Pricing {                   // per started hour: 10, 30, 60 rupees
    int fee(Kind k, int minutes) const override {
        const int rate[] = {10, 30, 60};
        return rate[int(k)] * max(1, (minutes + 59) / 60);
    }
};

class ParkingLot {
    vector<Spot> spots;                           // never resized, so Spot* stays valid
    map<int, Ticket> open;
    unique_ptr<SpotPicker> picker;
    unique_ptr<Pricing> pricing;
    mutable mutex m;
    int nextId = 1;
public:
    ParkingLot(vector<Spot> s, unique_ptr<SpotPicker> p, unique_ptr<Pricing> pr)
        : spots(std::move(s)), picker(std::move(p)), pricing(std::move(pr)) {}
    optional<Ticket> enter(const string& plate, Kind k, int minute) {
        lock_guard lock(m);                       // pick and take as one step
        Spot* s = picker->pick(spots, k);
        if (!s) return nullopt;
        s->free = false;
        Ticket t{nextId++, plate, k, s, minute};
        open.emplace(t.id, t);
        return t;
    }
    optional<int> quote(int ticketId, int minute) const {
        lock_guard lock(m);
        auto it = open.find(ticketId);
        if (it == open.end()) return nullopt;
        return pricing->fee(it->second.kind, minute - it->second.inMinute);
    }
    bool release(int ticketId) {                  // after payment succeeded
        lock_guard lock(m);
        auto it = open.find(ticketId);
        if (it == open.end()) return false;
        it->second.spot->free = true;
        open.erase(it);
        return true;
    }
    int freeSpots() const {
        lock_guard lock(m);
        return count_if(spots.begin(), spots.end(), [](const Spot& s) { return s.free; });
    }
};

int main() {
    ParkingLot lot({{0, 1, Kind::Bike}, {0, 2, Kind::Car}, {1, 1, Kind::Car}, {1, 2, Kind::Truck}},
                   make_unique<SmallestFit>(), make_unique<HourlyByKind>());
    auto park = [&](const string& plate, Kind k) {
        auto t = lot.enter(plate, k, 0);
        cout << plate << ": ";
        if (t) cout << "ticket " << t->id << ", spot " << t->spot->floor << "-" << t->spot->number;
        else cout << "no spot";
        cout << "\n";
        return t;
    };
    park("bike-1", Kind::Bike);
    auto car = park("car-1", Kind::Car);
    park("car-2", Kind::Car);
    park("car-3", Kind::Car);
    park("truck-1", Kind::Truck);
    cout << "car-1 owes " << *lot.quote(car->id, 135) << " after 135 minutes\n";
    cout << boolalpha << "paid, released: " << lot.release(car->id) << "\n";
    cout << "same ticket again: " << lot.release(car->id) << "\n";

    vector<Spot> ten;
    for (int i = 1; i <= 10; ++i) ten.push_back({0, i, Kind::Car});
    ParkingLot busy(ten, make_unique<SmallestFit>(), make_unique<HourlyByKind>());
    atomic<int> issued = 0;
    {
        vector<jthread> gates;                    // 4 gates, 5 cars each, 10 spots
        for (int g = 0; g < 4; ++g)
            gates.emplace_back([&] {
                for (int i = 0; i < 5; ++i)
                    if (busy.enter("x", Kind::Car, 0)) ++issued;
            });
    }
    cout << "4 gates, 20 cars: " << issued << " tickets, " << busy.freeSpots() << " free\n";
}
```

Output:

```text
bike-1: ticket 1, spot 0-1
car-1: ticket 2, spot 0-2
car-2: ticket 3, spot 1-1
car-3: ticket 4, spot 1-2
truck-1: no spot
car-1 owes 90 after 135 minutes
paid, released: true
same ticket again: false
4 gates, 20 cars: 10 tickets, 0 free
```

`car-3` took the truck spot because it was the only one left that fits, so `truck-1` was turned away. Whether that is right is a business rule, and the design makes it a one-class change: a `KeepLargeForTrucks` picker. The gate run was repeated under ThreadSanitizer with no reports.

#### Interview checklist

- **Spot types and the strategy for assigning a spot to a vehicle**: sizes ordered so a spot fits a vehicle when `size >= kind`; `SmallestFit` behind the `SpotPicker` interface.
- **Ticket and payment flow from entry to exit**: `enter` returns a ticket; `quote` prices the stay; payment runs outside the lot's lock; `release` frees the spot and closes the ticket, so a reused ticket fails.
- **Pricing as a pluggable strategy**: `Pricing` with `HourlyByKind`; 135 minutes is 3 started hours at 30 = 90.
- **Concurrency when two cars try to take the same spot**: pick and take happen under one mutex; four gates never issue more tickets than spots. At larger scale, one lock per floor.
- **Extensibility, such as adding charging spots without rewrites**: give `Spot` a `charger` flag, add a `ChargerFirst` picker for electric vehicles and a [decorator](#/concept/oop.patterns-structural.decorator) over `Pricing` that adds the energy cost; `ParkingLot` does not change.

Connects to: [strategy](#/concept/oop.patterns-behavioral.strategy), [handling concurrency in LLD](#/concept/lld.method.handling-concurrency-in-lld), [machine coding round strategy](#/concept/lld.method.machine-coding-round-strategy).

### questions
Q: How would you assign a spot to an arriving vehicle?
A: Put the rule behind a SpotPicker interface. The default picks the smallest free spot that fits on the lowest floor, which saves large spots for large vehicles; other rules, such as reserving large spots for trucks or choosing the spot nearest the lift, become new implementations without touching the lot.

Q: How do you stop two entry gates from assigning the same spot?
A: Make choosing a free spot and marking it taken a single critical section, for example under one mutex for the lot or one per floor. Checking and taking in separate steps would let both gates see the spot free.

Q: How is the fee computed, and how would you add weekend pricing?
A: A Pricing strategy computes the fee from the vehicle kind and the duration, for example per started hour at a rate per kind. Weekend pricing is a new Pricing class chosen by configuration or by a composite that picks a rule by day, with no change to the lot.

Q: What happens at the exit gate?
A: The lot looks up the open ticket, quotes the fee, and the payment is taken outside the lot's lock. Only after payment succeeds is the ticket closed and the spot freed, so an unknown or already used ticket is rejected.

Q: How would you add electric charging spots?
A: Add a charger feature to spots, a picker that prefers charging spots for electric vehicles, and a pricing decorator that adds the energy cost. The lot class itself stays the same because it only depends on the two interfaces.

## lld.classics.elevator-system
name: "Elevator system"
importance: must
prereqs: [lld.method.clarifying-requirements]
scope: "requests, scheduling strategy, states"

### simple
An elevator system decides which car answers each button press and in what order each car visits its floors. It works like a team of taxi drivers sharing one dispatcher: calls come in from the floors, the dispatcher gives each call to the best car, and each car keeps a list of stops. The design has to stay consistent when many people press buttons at once.

### interview
- Two request kinds: **hall calls** (a floor and a direction, pressed outside) and **car calls** (a destination, pressed inside a car). Hall calls need dispatching; car calls go straight to that car.
- Each `Car` has a floor, a direction, a set of stops and a **state machine**: idle, moving, doors open, maintenance.
- Inside a car, the classic order is the **LOOK** sweep (the elevator algorithm): keep going in the current direction while stops remain ahead, then reverse. This avoids starving far floors.
- **Dispatch is a strategy**: nearest idle car, a car already heading toward the call in the requested direction, or a cost function with penalties; zoning and destination dispatch are other strategies.
- **Concurrency**: buttons are pressed from many threads while a controller advances cars; guard car state with one lock, or funnel every request through a queue to a single controller thread.
- Extensions: express cars that serve some floors only, restricted floors needing a card, maintenance mode, capacity limits, peak-hour strategies.

### deep
#### Requirements (agreed)

Floors 0 to 19, three cars, one of them express (lobby and floors 10 to 19); hall and car calls; a replaceable dispatch rule; maintenance mode. Each tick, a car moves one floor or opens or closes its doors.

#### Classes

```text
ElevatorSystem "1" *-- "3" Car
ElevatorSystem --> Dispatcher    <<interface>>   NearestSuitable ..|> Dispatcher
Car: floor, Dir, State, stops (set<int>), served floors
```

#### Code

```cpp
enum class Dir { Up, Down, None };
enum class State { Idle, Moving, DoorsOpen, Maintenance };

struct Car {
    int id, floor;
    set<int> served;                            // floors this car may stop at
    State state = State::Idle;
    Dir dir = Dir::None;
    set<int> stops;
    string step() {                             // one tick of the state machine
        if (state == State::Maintenance) return "";
        if (state == State::DoorsOpen) {        // doors close
            state = stops.empty() ? State::Idle : State::Moving;
            if (stops.empty()) dir = Dir::None;
            return "";
        }
        if (stops.empty()) return "";
        if (stops.count(floor)) {
            stops.erase(floor);
            state = State::DoorsOpen;
            return "car " + to_string(id) + " opens at " + to_string(floor);
        }
        bool above = stops.upper_bound(floor) != stops.end();
        bool below = *stops.begin() < floor;
        if (dir == Dir::Up && !above) dir = Dir::Down;        // LOOK: reverse only at the end
        else if (dir == Dir::Down && !below) dir = Dir::Up;
        else if (dir == Dir::None) dir = above ? Dir::Up : Dir::Down;
        floor += dir == Dir::Up ? 1 : -1;
        state = State::Moving;
        return "";
    }
};

struct Dispatcher {                             // strategy: which car answers a hall call
    virtual ~Dispatcher() = default;
    virtual Car* choose(vector<Car>& cars, int floor, Dir want) = 0;
};
struct NearestSuitable : Dispatcher {           // idle or already on the way; others pay
    Car* choose(vector<Car>& cars, int floor, Dir want) override {
        Car* best = nullptr;
        int bestCost = INT_MAX;
        for (auto& c : cars) {
            if (c.state == State::Maintenance || !c.served.count(floor)) continue;
            bool ahead = want == Dir::Up ? floor >= c.floor : floor <= c.floor;
            bool onTheWay = c.dir == want && ahead;
            int cost = abs(c.floor - floor) + (c.dir == Dir::None || onTheWay ? 0 : 40);
            if (cost < bestCost) bestCost = cost, best = &c;
        }
        return best;
    }
};

class ElevatorSystem {
    vector<Car> cars;
    unique_ptr<Dispatcher> dispatcher;
    mutex m;                                    // panels and the controller share car state
public:
    ElevatorSystem(vector<Car> c, unique_ptr<Dispatcher> d)
        : cars(std::move(c)), dispatcher(std::move(d)) {}
    int hallCall(int floor, Dir want) {         // returns the chosen car, or -1
        lock_guard lock(m);
        Car* c = dispatcher->choose(cars, floor, want);
        if (!c) return -1;
        c->stops.insert(floor);
        return c->id;
    }
    bool carCall(int carId, int floor) {
        lock_guard lock(m);
        Car& c = cars.at(carId);
        if (c.state == State::Maintenance || !c.served.count(floor)) return false;
        c.stops.insert(floor);
        return true;
    }
    void maintenance(int carId) {
        lock_guard lock(m);
        cars.at(carId).state = State::Maintenance;
        cars.at(carId).stops.clear();
    }
    void tick(int t) {
        lock_guard lock(m);
        for (auto& c : cars)
            if (string e = c.step(); !e.empty()) cout << "t=" << t << " " << e << "\n";
    }
};

int main() {
    set<int> all, express{0};
    for (int f = 0; f < 20; ++f) all.insert(f);
    for (int f = 10; f < 20; ++f) express.insert(f);
    ElevatorSystem sys({{0, 0, all}, {1, 8, all}, {2, 10, express}},
                       make_unique<NearestSuitable>());

    cout << "call at 5 going up -> car " << sys.hallCall(5, Dir::Up) << "\n";
    for (int t = 1; t <= 4; ++t) sys.tick(t);
    cout << boolalpha << "inside car 1, press 12: " << sys.carCall(1, 12) << "\n";
    cout << "inside car 2, press 5: " << sys.carCall(2, 5) << "\n";
    for (int t = 5; t <= 6; ++t) sys.tick(t);
    cout << "call at 15 going down -> car " << sys.hallCall(15, Dir::Down) << "\n";
    sys.maintenance(0);
    cout << "car 0 in maintenance; call at 2 going up -> car " << sys.hallCall(2, Dir::Up) << "\n";
    for (int t = 7; t <= 25; ++t) sys.tick(t);
}
```

Output:

```text
call at 5 going up -> car 1
t=4 car 1 opens at 5
inside car 1, press 12: true
inside car 2, press 5: false
call at 15 going down -> car 2
car 0 in maintenance; call at 2 going up -> car 1
t=12 car 2 opens at 15
t=13 car 1 opens at 12
t=25 car 1 opens at 2
```

The call at 15 goes to the express car (cost 5), not car 1, which is moving up and would cost 9 + 40. For the call at 2, car 0 is in maintenance and the express car skips floor 2, so car 1 takes it: it finishes its sweep at 12 (t=13), then reverses and reaches 2 at t=25.

#### Interview checklist

- **Modeling of cars, floors, and hall versus in-car requests**: `hallCall` goes through the dispatcher; `carCall` adds a stop to one car.
- **Dispatch as a pluggable strategy (for example nearest car or sweep in one direction)**: `Dispatcher` with `NearestSuitable`; each car sweeps with LOOK.
- **Elevator state machine: idle, moving, doors open, maintenance**: `Car::step`; maintenance cars get no calls. More states would justify the [state pattern](#/concept/oop.patterns-behavioral.state).
- **Handling many requests arriving at once safely**: every entry point takes the system mutex; the alternative is one controller thread reading requests from a queue ([producer-consumer](#/concept/conc.patterns.producer-consumer-in-code)).
- **Extensions such as express cars or restricted floors**: `served` floors per car; a card check filters `carCall`; peak-hour zoning is a new `Dispatcher`.

Connects to: [strategy](#/concept/oop.patterns-behavioral.strategy), [disk scheduling](#/concept/os.storage.disk-scheduling), [handling concurrency in LLD](#/concept/lld.method.handling-concurrency-in-lld).

### questions
Q: What is the difference between a hall call and a car call?
A: A hall call is pressed on a floor and carries a direction; the system must choose which car answers it. A car call is pressed inside a car and names a destination, so it simply becomes a stop for that car.

Q: In what order should one elevator car serve its stops?
A: Usually the LOOK or elevator algorithm: keep moving in the current direction while there are stops ahead, then reverse. Serving the nearest stop first instead can starve distant floors when new calls keep arriving nearby.

Q: How would you make the dispatch rule replaceable?
A: Define a Dispatcher interface that takes the cars and a hall call and returns a car, and inject the implementation. Nearest car, a cost function that favors cars already heading the right way, or zoning at peak hours are separate classes.

Q: What states does an elevator car have?
A: At least idle, moving, doors open and maintenance, with transitions such as idle to moving when a stop is added and moving to doors open on reaching a stop. Maintenance removes the car from dispatch until it is cleared.

Q: How do you keep the system consistent when many buttons are pressed at once?
A: Guard all car state with one lock taken by every call and by the controller's tick, or have a single controller thread own the cars and receive requests through a thread-safe queue. Either way, no request sees a car halfway through an update.

## lld.classics.movie-ticket-booking
name: "Movie ticket booking"
importance: must
prereqs: [lld.method.clarifying-requirements]
scope: "shows, seats, seat locking, payments"

### simple
A movie booking design lets people pick seats for a show and pay, while making sure no seat is ever sold twice. It works like a cloakroom tag: when you choose seats they are set aside in your name for a few minutes, and if you don't pay in time they go back on the shelf. The hard part is two people clicking the same seat at the same moment.

### interview
- Entities: `Cinema` owns `Screen`s, a screen owns its `Seat`s (with a type), a `Show` is a movie on a screen at a time, a `Booking` groups seats for one user, and a `Payment` records a charge or refund.
- **Seat holds**: selecting seats creates a booking in state held with an expiry (say 10 minutes); paying confirms it; an unpaid hold expires and frees its seats (lazily on the next request, or by a sweeper).
- **No double booking**: check every seat and mark them all as one critical section per show (a mutex per show, or a conditional update such as `UPDATE ... WHERE status = 'free'` in a database).
- **Pricing** is a strategy over seat type and show time (premium seats, morning discounts, weekend rates).
- **Lifecycle**: held, then confirmed, cancelled or expired; cancellation refunds by a policy that depends on how close the show is.
- Payment runs outside the lock; if a hold expired while the payment was in flight, the confirm fails and the charge is refunded.

### deep
#### Requirements (agreed)

Seats are held for 10 minutes, then paid; prices depend on seat type and show time; cancelling at least 24 hours ahead refunds in full, later refunds half.

#### Classes

```text
Cinema "1" *-- "*" Screen "1" *-- "*" Seat
Show --> Screen                     one lock per show
Show "1" *-- "*" Booking            held, confirmed, cancelled, expired
Show --> Pricing <<interface>>      StandardPricing ..|> Pricing
Booking ..> Payment                 a charge or a refund
```

#### Code

```cpp
enum class SeatType { Regular, Premium };
struct Seat { string id; SeatType type; };
struct Screen { string name; vector<Seat> seats; };
struct Cinema { string name; vector<Screen> screens; };

enum class Status { Held, Confirmed, Cancelled, Expired };
struct Booking { int id; string user; vector<string> seats; int amount, holdUntil; Status status; };
struct Payment { int bookingId, amount; string kind; };      // "charge" or "refund"

struct Pricing {
    virtual ~Pricing() = default;
    virtual int price(SeatType t, int startMinute) const = 0;
};
struct StandardPricing : Pricing {             // premium 300, regular 200, 20% off before noon
    int price(SeatType t, int start) const override {
        int base = t == SeatType::Premium ? 300 : 200;
        return (start / 60) % 24 < 12 ? base * 8 / 10 : base;
    }
};

class Show {
    mutex m;
    const Screen& screen;
    int start;                                 // minutes since day 0
    const Pricing& pricing;
    map<string, int> taken;                    // seat -> booking id (held or confirmed)
    map<int, Booking> bookings;
    int nextId = 1;
    void expireHolds(int now) {
        for (auto& [id, b] : bookings)
            if (b.status == Status::Held && now >= b.holdUntil) {
                b.status = Status::Expired;
                for (auto& s : b.seats) taken.erase(s);
            }
    }
    const Seat* seat(const string& id) const {
        for (auto& s : screen.seats) if (s.id == id) return &s;
        return nullptr;
    }
public:
    Show(const Screen& s, int start, const Pricing& p) : screen(s), start(start), pricing(p) {}
    optional<int> hold(const string& user, const vector<string>& ids, int now) {
        lock_guard lock(m);
        expireHolds(now);
        int amount = 0;
        for (auto& id : ids) {                 // validate all, then mark
            const Seat* s = seat(id);
            if (!s || taken.count(id)) return nullopt;
            amount += pricing.price(s->type, start);
        }
        int id = nextId++;
        for (auto& s : ids) taken[s] = id;
        bookings[id] = {id, user, ids, amount, now + 10, Status::Held};
        return id;
    }
    int amountOf(int id) { lock_guard lock(m); return bookings.at(id).amount; }
    optional<Payment> confirm(int id, int now) {  // called after the payment succeeded
        lock_guard lock(m);
        expireHolds(now);
        Booking& b = bookings.at(id);
        if (b.status != Status::Held) return nullopt;
        b.status = Status::Confirmed;
        return Payment{id, b.amount, "charge"};
    }
    optional<Payment> cancel(int id, int now) {
        lock_guard lock(m);
        Booking& b = bookings.at(id);
        if (b.status != Status::Confirmed || now >= start) return nullopt;
        b.status = Status::Cancelled;
        for (auto& s : b.seats) taken.erase(s);
        return Payment{id, start - now >= 24 * 60 ? b.amount : b.amount / 2, "refund"};
    }
};

int main() {
    Cinema central{"Central", {{"Audi 1", {{"A1", SeatType::Premium}, {"A2", SeatType::Premium},
                                           {"B1", SeatType::Regular}, {"B2", SeatType::Regular}}}}};
    StandardPricing pricing;
    int start = 2 * 1440 + 10 * 60;            // day 2 at 10:00, a morning show
    Show show(central.screens[0], start, pricing);

    auto asha = show.hold("asha", {"A1", "A2"}, 0);
    cout << "asha holds A1 A2: booking " << *asha << ", Rs " << show.amountOf(*asha) << "\n";
    auto ravi = show.hold("ravi", {"A2", "B1"}, 1);
    cout << "ravi holds A2 B1 at minute 1: " << (ravi ? "ok" : "refused") << "\n";
    ravi = show.hold("ravi", {"A2", "B1"}, 12);
    cout << "ravi at minute 12: booking " << *ravi << ", Rs " << show.amountOf(*ravi) << "\n";
    auto paid = show.confirm(*ravi, 13);
    cout << "ravi paid: " << paid->kind << " Rs " << paid->amount << "\n";
    cout << "asha paid at minute 13: "
         << (show.confirm(*asha, 13) ? "confirmed" : "hold expired, refund the charge") << "\n";

    atomic<int> winners = 0;
    latch go(6);
    {
        vector<jthread> users;
        for (int i = 0; i < 6; ++i)
            users.emplace_back([&, i] {
                go.arrive_and_wait();
                if (show.hold("user" + to_string(i), {"B2"}, 14)) ++winners;
            });
    }
    cout << "6 users hold B2 at once: " << winners << " succeeds\n";

    auto refund = show.cancel(*ravi, start - 10 * 60);
    cout << "ravi cancels 10 hours ahead: " << refund->kind << " Rs " << refund->amount << "\n";
}
```

Output:

```text
asha holds A1 A2: booking 1, Rs 480
ravi holds A2 B1 at minute 1: refused
ravi at minute 12: booking 2, Rs 400
ravi paid: charge Rs 400
asha paid at minute 13: hold expired, refund the charge
6 users hold B2 at once: 1 succeeds
ravi cancels 10 hours ahead: refund Rs 200
```

Asha's hold ran out at minute 10, so Ravi gets A2 (240, morning premium) and B1 (160). Asha's late payment cannot confirm seats that are no longer held, so it is refunded. Under ThreadSanitizer, the six-user race always had one winner.

#### Interview checklist

- **Entities: cinema, screen, show, seat, booking, payment**: as in the diagram.
- **Temporary seat holds that expire**: `holdUntil`, released lazily by `expireHolds` (or by a sweeper).
- **Preventing double booking under concurrent requests**: all seats validated and marked under the show's mutex; in a database, a conditional update.
- **Pricing rules by seat type and show time**: the `Pricing` [strategy](#/concept/oop.patterns-behavioral.strategy).
- **Booking lifecycle, cancellation and refunds**: `cancel` frees seats and refunds by how early it happens.

Connects to: [handling concurrency in LLD](#/concept/lld.method.handling-concurrency-in-lld), [designing APIs and methods](#/concept/lld.method.designing-apis-and-methods), [ticket booking at scale](#/concept/sysd.classics.ticket-booking).

### questions
Q: How do you make sure two customers never book the same seat?
A: Checking the seats and marking them held must be one atomic step: under a per-show mutex in memory, or with a conditional update such as setting a seat to held only where it is still free in a database, then checking how many rows changed. Validate all requested seats before marking any, so a request is all or nothing.

Q: How do temporary seat holds work?
A: Selecting seats creates a booking in a held state with an expiry time. Paying before the expiry confirms it; otherwise the hold expires and its seats become free, either lazily on the next request for that show or through a periodic sweeper.

Q: What if the payment succeeds after the hold has expired?
A: The confirm step must check that the booking is still held; if it expired, confirmation fails and the charge is refunded automatically. Never confirm seats the booking no longer holds, because someone else may have them by then.

Q: How would you model pricing that depends on seat type and show time?
A: A pricing strategy takes the seat type and the show's start time and returns a price, for example a premium surcharge and a morning discount. New rules such as weekend or demand-based pricing are new implementations chosen by configuration.

Q: Why should the payment call happen outside the booking lock?
A: Payment involves a network call that can take seconds, and holding the show's lock that long would block every other customer of the show. The hold already reserves the seats, so the lock is only needed briefly to create the hold and later to confirm it.

## lld.classics.splitwise
name: "Splitwise"
importance: must
prereqs: [lld.method.clarifying-requirements]
scope: "expenses, split types, balances, simplifying debts"

### simple
An expense-sharing app records who paid for what and works out who owes whom. It is like a shared notebook on a trip: each bill is written down with how it is split, and at the end the notebook tells everyone the few payments that settle all debts. The design must add up every paisa exactly and keep balances right when a bill is edited.

### interview
- Entities: `User`, `Group` (members, expenses, balances), `Expense` (payer, total, split rule), and the **split rule** behind one interface: equal, exact amounts, percentages (shares or ratios are more of the same).
- Each split rule **validates** that the parts add up (exact parts equal the total, percentages sum to 100) before anything changes.
- Keep a **net balance** per user: the payer gains the total, each participant loses their share. Balances always sum to zero.
- **Editing** an expense reverses its old effect and applies the new one, which is why expenses are stored, not just balances.
- **Simplifying debts**: repeatedly match the largest creditor with the largest debtor; at most n − 1 payments. Finding the true minimum is NP-hard in general, so the greedy result is the standard interview answer.
- **Money**: integer paise, never `double`; equal splits hand the leftover paise to the first few people so shares still add up.

### deep
#### Requirements (agreed)

Groups of users; an expense has a payer, a total and a split (equal, exact or percentage); invalid splits are rejected; expenses can be edited; show balances and a short list of settling payments.

#### Classes

```text
Group "1" *-- "*" Expense          expenses by id, plus net balance per user
Expense --> SplitRule <<interface>>
Equal ..|> SplitRule    Exact ..|> SplitRule    Percent ..|> SplitRule
```

#### Code

```cpp
using Paise = long long;
string rs(Paise p) {
    return to_string(p / 100) + "." + (p % 100 < 10 ? "0" : "") + to_string(p % 100);
}

struct SplitRule {                                   // shares must add up to the total
    virtual ~SplitRule() = default;
    virtual map<string, Paise> shares(Paise total) const = 0;
};
struct Equal : SplitRule {
    vector<string> people;
    explicit Equal(vector<string> p) : people(std::move(p)) {}
    map<string, Paise> shares(Paise total) const override {
        map<string, Paise> out;
        Paise n = people.size(), base = total / n, extra = total % n;
        for (Paise i = 0; i < n; ++i) out[people[i]] = base + (i < extra ? 1 : 0);
        return out;                                  // leftover paise go to the first few
    }
};
struct Exact : SplitRule {
    map<string, Paise> parts;
    explicit Exact(map<string, Paise> p) : parts(std::move(p)) {}
    map<string, Paise> shares(Paise total) const override {
        Paise sum = 0;
        for (auto& [who, v] : parts) sum += v;
        if (sum != total) throw invalid_argument("exact parts add up to " + rs(sum));
        return parts;
    }
};
struct Percent : SplitRule {
    map<string, int> basisPoints;                    // 100% = 10000
    explicit Percent(map<string, int> bp) : basisPoints(std::move(bp)) {}
    map<string, Paise> shares(Paise total) const override {
        int sum = 0;
        for (auto& [who, bp] : basisPoints) sum += bp;
        if (sum != 10000) throw invalid_argument("percentages must add up to 100");
        map<string, Paise> out;
        Paise given = 0;
        for (auto& [who, bp] : basisPoints) given += out[who] = total * bp / 10000;
        out.begin()->second += total - given;        // rounding leftover
        return out;
    }
};

struct Expense { string payer; Paise total; shared_ptr<SplitRule> rule; };

class Group {
    map<int, Expense> expenses;
    map<string, Paise> net;                          // positive: is owed money
    int nextId = 1;
    void apply(const Expense& e, int sign) {
        auto parts = e.rule->shares(e.total);        // throws before any change
        net[e.payer] += sign * e.total;
        for (auto& [who, share] : parts) net[who] -= sign * share;
    }
public:
    int add(const Expense& e) { apply(e, +1); expenses[nextId] = e; return nextId++; }
    void edit(int id, const Expense& e) {
        e.rule->shares(e.total);                     // validate the new version first
        apply(expenses.at(id), -1);
        apply(e, +1);
        expenses[id] = e;
    }
    const map<string, Paise>& balances() const { return net; }
    vector<string> settle() const {                  // largest debtor pays largest creditor
        priority_queue<pair<Paise, string>> owed, owes;
        for (auto& [who, v] : net) {
            if (v > 0) owed.push({v, who});
            if (v < 0) owes.push({-v, who});
        }
        vector<string> payments;
        while (!owed.empty()) {
            auto [c, creditor] = owed.top(); owed.pop();
            auto [d, debtor] = owes.top(); owes.pop();
            Paise x = min(c, d);
            payments.push_back(debtor + " pays " + creditor + " Rs " + rs(x));
            if (c > x) owed.push({c - x, creditor});
            if (d > x) owes.push({d - x, debtor});
        }
        return payments;
    }
};

int main() {
    Group trip;
    trip.add({"asha", 100000, make_shared<Equal>(vector<string>{"asha", "ravi", "meera"})});
    int taxi = trip.add({"ravi", 120000, make_shared<Exact>(map<string, Paise>{
                                             {"asha", 20000}, {"ravi", 40000}, {"meera", 60000}})});
    trip.add({"meera", 90000, make_shared<Percent>(map<string, int>{
                                  {"asha", 5000}, {"ravi", 2500}, {"meera", 2500}})});
    try {
        trip.add({"asha", 50000, make_shared<Exact>(map<string, Paise>{{"ravi", 30000}})});
    } catch (const invalid_argument& e) {
        cout << "rejected: " << e.what() << "\n";
    }
    trip.edit(taxi, {"ravi", 150000, make_shared<Equal>(vector<string>{"asha", "ravi", "meera"})});
    Paise sum = 0;
    for (auto& [who, v] : trip.balances()) {
        cout << who << " " << (v < 0 ? "owes " : "is owed ") << rs(llabs(v)) << "\n";
        sum += v;
    }
    cout << "balances sum to " << sum << "\n";
    for (auto& p : trip.settle()) cout << p << "\n";
}
```

Output:

```text
rejected: exact parts add up to 300.00
asha owes 283.34
meera owes 158.33
ravi is owed 441.67
balances sum to 0
asha pays ravi Rs 283.34
meera pays ravi Rs 158.33
```

The first expense, Rs 1000 split three ways, gives shares of 333.34, 333.33 and 333.33: the extra paisa goes to the first person, so the parts still add up. The rejected expense changed nothing, and editing the taxi replaced its old exact split with an equal one over the new total.

#### Interview checklist

- **User, group, expense and split modeling**: a `Group` stores expenses by id and net balances; users are names here, ids in a real system.
- **Split types behind one interface, with validation that parts add up**: `SplitRule` with `Equal`, `Exact` and `Percent`; `shares` throws before any balance changes.
- **Updating balances when an expense is added or edited**: `apply(e, +1)` on add; an edit applies the old expense with `-1`, then the new one.
- **Simplifying debts into few payments (for example greedy matching of largest creditor and debtor)**: `settle` uses two heaps; each payment clears at least one person, so there are at most n − 1.
- **Handling money precisely (integer smallest units, rounding leftovers)**: `Paise` is a 64-bit integer; equal and percentage splits hand out leftover paise explicitly.

Connects to: [strategy](#/concept/oop.patterns-behavioral.strategy), [designing APIs and methods](#/concept/lld.method.designing-apis-and-methods), [binary heap](#/concept/dsa.heaps.binary-heap).

### questions
Q: How would you model the different ways to split an expense?
A: Define a split rule interface that turns a total into a share per person, with implementations for equal, exact amounts and percentages. Each implementation validates its own input, such as parts adding up to the total, and new split types are new classes.

Q: How do you keep balances correct when an expense is edited?
A: Store each expense, and on edit reverse the effect of the old version on the balances before applying the new version. Validate the new version first so an invalid edit changes nothing.

Q: How do you settle a group's debts with few payments?
A: Compute each person's net balance, then repeatedly have the largest debtor pay the largest creditor the smaller of the two amounts. Every payment clears at least one person, so there are at most n minus 1 payments; finding the true minimum is NP-hard in general.

Q: How should an app like this store money?
A: As integers in the smallest unit, such as paise, never as floating point. When a total does not divide evenly, give the leftover paise to specific people so the shares still add up exactly.

Q: Why do all balances in a group always sum to zero?
A: Each expense adds the total to the payer and subtracts shares that add up to the same total from the participants. Any imbalance means a split rule or an edit leaked money, which makes the sum a useful check.

## lld.classics.snake-and-ladder
name: "Snake and ladder"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "board, dice, players, game loop"

### simple
Snake and ladder is a small game that interviewers use to see how you split a program into clean pieces: a board, dice, players and a game loop. Players take turns rolling, move forward, climb ladders and slide down snakes, and the first to land exactly on the last cell wins. A good design lets you swap the board or the dice without touching the game rules.

### interview
- Entities: `Board` (size and a map of **jumps**: start cell to end cell, where a snake goes down and a ladder goes up), `Player` (name and position), `Dice` (an interface), and `Game` (turn order and the loop).
- A snake and a ladder are the same thing in the model, a jump; a `map<int, int>` is enough, and a cell class is unnecessary unless cells gain more behavior.
- **Dice behind an interface**: one die, two dice, or a fixed sequence for tests; seed random dice so a game can be replayed.
- **Turn order**: a queue of players; pop the front, play, push back unless they won.
- **Rules to state**: a roll that would pass the last cell leaves the player where they are (exact landing to win); what happens on a 6 (extra turn) is a variant.
- **Validate the board** when it is built: jumps start and end on the board, none starts on the first or last cell, and no jump ends where another starts (no chains or loops).

### deep
#### Classes

```text
Game --> Board                  Board: size, jumps (start -> end)
Game --> Dice <<interface>>     RandomDice ..|> Dice     FixedDice ..|> Dice
Game "1" *-- "2..4" Player      a queue in turn order
```

#### Code

```cpp
struct Dice {
    virtual ~Dice() = default;
    virtual int roll() = 0;
};
struct RandomDice : Dice {                       // count dice, seeded for replays
    mt19937 rng;
    int count;
    RandomDice(unsigned seed, int count = 1) : rng(seed), count(count) {}
    int roll() override {
        int sum = 0;
        for (int i = 0; i < count; ++i) sum += 1 + int(rng() % 6);
        return sum;
    }
};
struct FixedDice : Dice {                        // for tests: replays a sequence
    vector<int> rolls;
    size_t next = 0;
    explicit FixedDice(vector<int> r) : rolls(std::move(r)) {}
    int roll() override { return rolls.at(next++ % rolls.size()); }
};

class Board {
    int size;
    map<int, int> jumps;                         // snakes go down, ladders go up
public:
    Board(int size, map<int, int> j) : size(size), jumps(std::move(j)) {
        for (auto [from, to] : jumps) {
            string where = to_string(from) + "->" + to_string(to);
            if (from <= 1 || from >= size)
                throw invalid_argument(where + " starts on the first or last cell");
            if (to < 1 || to > size || to == from)
                throw invalid_argument(where + " ends off the board");
            if (jumps.count(to))
                throw invalid_argument(where + " ends where another jump starts");
        }
    }
    int last() const { return size; }
    int land(int cell) const {
        auto it = jumps.find(cell);
        return it == jumps.end() ? cell : it->second;
    }
};

struct Player { string name; int pos = 0; };     // 0: not yet on the board

class Game {
    const Board& board;
    Dice& dice;
    deque<Player> turns;                         // the front player moves next
public:
    Game(const Board& b, Dice& d, const vector<string>& names) : board(b), dice(d) {
        for (auto& n : names) turns.push_back({n});
    }
    optional<string> playTurn(ostream& log) {   // returns the winner, if any
        Player p = turns.front();
        turns.pop_front();
        int r = dice.roll(), target = p.pos + r;
        log << p.name << " rolls " << r;
        if (target > board.last()) {
            log << ", needs an exact roll, stays at " << p.pos << "\n";
        } else {
            p.pos = board.land(target);
            log << ", moves to " << target;
            if (p.pos < target) log << ", snake down to " << p.pos;
            if (p.pos > target) log << ", ladder up to " << p.pos;
            log << "\n";
        }
        if (p.pos == board.last()) return p.name;
        turns.push_back(p);
        return nullopt;
    }
    pair<string, int> play(ostream& log) {      // winner and number of turns
        for (int turn = 1;; ++turn)
            if (auto w = playTurn(log)) return {*w, turn};
    }
};

int main() {
    Board small(20, {{3, 11}, {6, 17}, {14, 4}, {19, 8}});
    FixedDice scripted({3, 6, 3, 4, 2, 3});
    Game game(small, scripted, {"asha", "ravi"});
    auto [winner, turns] = game.play(cout);
    cout << winner << " wins after " << turns << " turns\n";

    for (map<int, int> bad : {map<int, int>{{20, 5}}, map<int, int>{{10, 14}, {14, 2}}}) {
        try {
            Board b(20, bad);
        } catch (const invalid_argument& e) {
            cout << "invalid board: " << e.what() << "\n";
        }
    }

    Board classic(100, {{4, 25}, {13, 46}, {33, 49}, {42, 63}, {50, 69}, {62, 81},
                        {74, 92}, {27, 5}, {40, 3}, {43, 18}, {54, 31}, {66, 45},
                        {76, 58}, {89, 53}, {99, 41}});
    RandomDice seeded(2026);
    ostringstream quiet;
    auto [w, n] = Game(classic, seeded, {"asha", "ravi", "meera", "kabir"}).play(quiet);
    cout << "seeded 100-cell game: " << w << " wins after " << n << " turns\n";
}
```

Output:

```text
asha rolls 3, moves to 3, ladder up to 11
ravi rolls 6, moves to 6, ladder up to 17
asha rolls 3, moves to 14, snake down to 4
ravi rolls 4, needs an exact roll, stays at 17
asha rolls 2, moves to 6, ladder up to 17
ravi rolls 3, moves to 20
ravi wins after 6 turns
invalid board: 20->5 starts on the first or last cell
invalid board: 10->14 ends where another jump starts
seeded 100-cell game: meera wins after 131 turns
```

The scripted dice make the rules visible in six turns: two ladders, a snake, a roll that overshoots and must be skipped, and an exact landing. The seeded game replays the same way every time, because `mt19937` produces the same numbers on every platform; `1 + rng() % 6` is used instead of `uniform_int_distribution`, whose output is allowed to differ between standard libraries (the bias of `% 6` on 32-bit numbers is about one in a billion).

#### Decisions worth saying out loud

- **Snakes and ladders are one concept.** A `Jump` class hierarchy would add nothing: both move a player from one cell to another, and the direction is visible in the numbers.
- **The game owns the turn order, not the players.** Players are plain data; a queue rotates them, and removing a finished player (for "play until everyone finishes") is a one-line change.
- **Output goes to an `ostream&`.** The demo prints to `cout`, tests to a string stream, and the seeded run to a stream nobody reads.
- **Rule variants are parameters or strategies**: an extra turn on a 6, three 6s in a row sending you back, or bouncing back from the last cell instead of staying.

#### Interview checklist

- **Board, cell and jump (snake or ladder) modeling**: `Board` with a size and a jump map; cells are numbers.
- **Turn order and the game loop**: a `deque<Player>` rotated by `playTurn`; `play` loops until a winner.
- **Dice behind an interface (one die, two dice, a fixed test die)**: `Dice` with `RandomDice(seed, count)` and `FixedDice`.
- **Win condition and the rule for rolling past 100**: a roll past the last cell leaves the player in place; landing exactly wins.
- **Validating a board configuration**: the constructor rejects jumps on the first or last cell, off the board, or chained into another jump.

Connects to: [identifying entities](#/concept/lld.method.identifying-entities), [extensibility and testing](#/concept/lld.method.extensibility-and-testing), [strategy](#/concept/oop.patterns-behavioral.strategy).

### questions
Q: How would you model snakes and ladders?
A: As one concept, a jump from a start cell to an end cell, stored in a map on the board. A snake is simply a jump that goes down and a ladder one that goes up, so no class hierarchy is needed.

Q: Why put the dice behind an interface?
A: So the game can use one die, two dice or a loaded die without changes, and so tests can inject a fixed sequence of rolls that makes every turn predictable. Seeding the random implementation also makes a whole game replayable.

Q: What should be validated when a board is created?
A: Jumps must start and end on the board, none may start on the first or last cell, a jump cannot end where it starts, and no jump should end on another jump's start, which would create chains or loops. Reject the configuration in the constructor so an invalid board never exists.

Q: How do you handle a roll that would take a player past the last cell?
A: State the rule explicitly: the common one is that the player stays where they are and must land exactly on the last cell to win. Bouncing back by the excess is another variant that could be a rule strategy.

Q: How would you manage turn order?
A: Keep the players in a queue: take the front player, play their turn, and push them to the back unless they won. Variants such as an extra turn on a six only change when the player is pushed back.

## lld.classics.tic-tac-toe-and-chess
name: "Tic-tac-toe and chess"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "board modeling, move validation, win detection"

### simple
This problem asks for a small board-game framework: tic-tac-toe first, with room to grow into chess. It is like building a game table that works for several games: the board, the turns and the rule check stay, while the pieces and their moves change. The interviewer watches how you check moves, detect a win, and keep chess from turning into one giant if-statement.

### interview
- Abstractions: `Board` (cells), `Piece` (owner, how it moves), `Player`, `Move` (from, to, plus what was captured, for undo), and a `Game` that validates moves, switches turns and reports the result.
- **Tic-tac-toe win check in O(1) per move**: keep a counter per row, per column and for the two diagonals; add +1 for X and −1 for O; a counter reaching ±n is a win. Scanning the board after every move costs O(n²).
- **Draw**: n² moves without a win. **Undo**: a stack of moves; reversing a move also reverses its counter updates.
- **Chess move validation through polymorphism**: each piece type implements `canMove(from, to, board)` (knight jumps, rook and bishop need a clear path); the board adds the shared rules (inside the board, not onto your own piece).
- **What chess adds**: check (a move is illegal if it leaves your king attacked, tested by trying it), special moves (castling, en passant, promotion) as move types, and history needed by those rules (has the king moved, last double pawn step), plus draws by repetition or the 50-move rule.
- Keep game rules out of pieces when they need the whole board or history, such as check and castling.

### deep
#### Classes

```text
TicTacToe: grid, rows[n], cols[n], diag, anti, history (stack of moves)
Piece <<abstract>>: owner, canMove(from, to, board)
Knight --|> Piece    Rook --|> Piece    Bishop --|> Piece    (Queen, King, Pawn ...)
ChessBoard "1" *-- "0..64" Piece      legal(from, to): shared rules, then the piece's rule
```

#### Code

```cpp
enum class Mark { None, X, O };
enum class Result { InProgress, XWins, OWins, Draw };

class TicTacToe {
    int n, moves = 0;
    vector<vector<Mark>> cells;
    vector<int> rows, cols;                      // +1 per X, -1 per O
    int diag = 0, anti = 0;
    Mark turn = Mark::X;
    Result result = Result::InProgress;
    vector<pair<int, int>> history;              // for undo
    void count(int r, int c, int d) {
        rows[r] += d;
        cols[c] += d;
        if (r == c) diag += d;
        if (r + c == n - 1) anti += d;
    }
public:
    explicit TicTacToe(int n) : n(n), cells(n, vector<Mark>(n)), rows(n), cols(n) {}
    string play(int r, int c) {                  // "" if accepted, else the reason
        if (result != Result::InProgress) return "the game is over";
        if (r < 0 || r >= n || c < 0 || c >= n) return "off the board";
        if (cells[r][c] != Mark::None) return "cell taken";
        int d = turn == Mark::X ? 1 : -1;
        cells[r][c] = turn;
        count(r, c, d);
        history.push_back({r, c});
        ++moves;
        if (abs(rows[r]) == n || abs(cols[c]) == n || abs(diag) == n || abs(anti) == n)
            result = turn == Mark::X ? Result::XWins : Result::OWins;
        else if (moves == n * n)
            result = Result::Draw;
        turn = turn == Mark::X ? Mark::O : Mark::X;
        return "";
    }
    bool undo() {
        if (history.empty()) return false;
        auto [r, c] = history.back();
        history.pop_back();
        turn = cells[r][c];                      // that player moves again
        count(r, c, turn == Mark::X ? -1 : 1);
        cells[r][c] = Mark::None;
        --moves;
        result = Result::InProgress;
        return true;
    }
    Result state() const { return result; }
};

struct Square { int file, rank; };               // 0 to 7 each; a1 is {0, 0}
class ChessBoard;

struct Piece {
    bool white;
    explicit Piece(bool w) : white(w) {}
    virtual ~Piece() = default;
    virtual bool canMove(Square from, Square to, const ChessBoard& b) const = 0;
};

class ChessBoard {
    array<array<unique_ptr<Piece>, 8>, 8> grid;
public:
    const Piece* at(Square s) const { return grid[s.rank][s.file].get(); }
    void put(Square s, unique_ptr<Piece> p) { grid[s.rank][s.file] = std::move(p); }
    bool pathClear(Square a, Square b) const {   // squares strictly between a and b
        int df = (b.file > a.file) - (b.file < a.file);
        int dr = (b.rank > a.rank) - (b.rank < a.rank);
        for (Square s{a.file + df, a.rank + dr}; s.file != b.file || s.rank != b.rank;
             s.file += df, s.rank += dr)
            if (at(s)) return false;
        return true;
    }
    bool legal(Square from, Square to) const {   // rules shared by every piece
        const Piece* p = at(from);
        if (!p || (from.file == to.file && from.rank == to.rank)) return false;
        if (const Piece* t = at(to); t && t->white == p->white) return false;
        return p->canMove(from, to, *this);      // then the piece's own rule
    }
};

struct Knight : Piece {
    using Piece::Piece;
    bool canMove(Square a, Square b, const ChessBoard&) const override {
        return abs(a.file - b.file) * abs(a.rank - b.rank) == 2;
    }
};
struct Rook : Piece {
    using Piece::Piece;
    bool canMove(Square a, Square b, const ChessBoard& bd) const override {
        return (a.file == b.file || a.rank == b.rank) && bd.pathClear(a, b);
    }
};
struct Bishop : Piece {
    using Piece::Piece;
    bool canMove(Square a, Square b, const ChessBoard& bd) const override {
        return abs(a.file - b.file) == abs(a.rank - b.rank) && bd.pathClear(a, b);
    }
};

int main() {
    TicTacToe t(3);
    const char* names[] = {"in progress", "X wins", "O wins", "draw"};
    vector<pair<int, int>> moves{{1, 1}, {0, 0}, {0, 0}, {3, 1}, {0, 2}, {1, 0}, {2, 0}, {2, 2}};
    for (auto [r, c] : moves) {
        string why = t.play(r, c);
        cout << "(" << r << "," << c << ") " << (why.empty() ? "ok" : why) << "\n";
    }
    cout << "state: " << names[int(t.state())] << "\n";
    t.undo();                                    // take back X's winning move
    t.play(2, 2);
    cout << "undo, X plays (2,2) instead: " << names[int(t.state())] << "\n";

    ChessBoard b;
    b.put({0, 0}, make_unique<Rook>(true));      // a1
    b.put({1, 0}, make_unique<Knight>(true));    // b1
    b.put({0, 3}, make_unique<Bishop>(false));   // a4, black
    b.put({2, 2}, make_unique<Bishop>(true));    // c3, white
    auto show = [&](const char* move, Square f, Square to) {
        cout << move << ": " << (b.legal(f, to) ? "legal" : "illegal") << "\n";
    };
    show("knight b1-c3 (own bishop there)", {1, 0}, {2, 2});
    show("knight b1-a3", {1, 0}, {0, 2});
    show("rook a1-a4 (captures)", {0, 0}, {0, 3});
    show("rook a1-a5 (jumps over a4)", {0, 0}, {0, 4});
    show("bishop c3-a5 (b4 empty)", {2, 2}, {0, 4});
    show("bishop c3-c5 (not diagonal)", {2, 2}, {2, 4});
}
```

Output:

```text
(1,1) ok
(0,0) ok
(0,0) cell taken
(3,1) off the board
(0,2) ok
(1,0) ok
(2,0) ok
(2,2) the game is over
state: X wins
undo, X plays (2,2) instead: in progress
knight b1-c3 (own bishop there): illegal
knight b1-a3: legal
rook a1-a4 (captures): legal
rook a1-a5 (jumps over a4): illegal
bishop c3-a5 (b4 empty): legal
bishop c3-c5 (not diagonal): illegal
```

X's attempts at a taken cell and at row 3 are refused without using up the turn. X then completes the anti-diagonal (0,2), (1,1), (2,0), and the next move is refused because the game is over. Undo takes back the winning move and its counter updates, so X can play elsewhere.

#### Win detection in O(1)

Each move touches one row counter, one column counter and at most two diagonal counters. A line is complete exactly when its counter reaches +n (all X) or −n (all O), because n cells each contributing ±1 can only sum to ±n if they agree. That turns an O(n²) board scan into O(1) work per move and O(n) memory, and undo simply subtracts what the move added.

#### Growing into chess

The shared shape stays: a board of cells, players alternating, a `legal` check before a move, a history for undo. What changes:

- **Pieces carry their movement** (polymorphism): adding a queen is one class combining the rook and bishop tests; the board and game don't change.
- **Rules that need the whole position live in the game, not in pieces.** Check: apply the move on a copy (or apply and undo), then test whether any enemy piece can reach your king. Castling needs "has the king or rook moved" and "are the squares attacked"; en passant needs the previous move. So the history stores full `Move` records (piece, from, to, captured piece, special kind), which also makes undo correct after captures, the [command](#/concept/oop.patterns-behavioral.command) pattern in practice.
- **Special moves as move types**: `Move{kind = Castle | EnPassant | Promotion}` with their own apply and undo steps.
- **Results**: checkmate and stalemate (no legal moves, in or out of check), and draws by repetition or the 50-move rule, need the move list and position hashes.

#### Interview checklist

- **Board, piece, player and move abstractions**: grid classes, `Piece` hierarchy, a move stack; players are the alternating `turn`.
- **Move validation per piece type through polymorphism**: `Piece::canMove` in `Knight`, `Rook`, `Bishop`; shared rules in `ChessBoard::legal`.
- **Win detection in O(1) per move for tic-tac-toe (row, column and diagonal counters)**: `rows`, `cols`, `diag`, `anti` and the ±n test.
- **Game state, turn handling and undo**: `Result`, `turn`, and `undo` that reverses the counters.
- **What chess adds (check, special moves) and how the design absorbs it**: game-level legality checks, full move records and move kinds, as above.

Connects to: [polymorphism](#/concept/oop.pillars.polymorphism), [command](#/concept/oop.patterns-behavioral.command), [open-closed principle](#/concept/oop.principles.open-closed-principle).

### questions
Q: How do you detect a tic-tac-toe win in constant time per move?
A: Keep a counter for each row and column and for both diagonals, adding one for X and subtracting one for O. After a move, check only the lines through that cell: a counter equal to plus or minus n means all n cells in that line belong to one player.

Q: How would you validate chess moves without a giant switch statement?
A: Give each piece type a canMove method for its movement pattern, such as the knight's L-shape or the rook's straight line with a clear path, and keep shared rules on the board, such as staying on the board and not capturing your own piece. A new piece type is then a new class.

Q: Why should check not be implemented inside the piece classes?
A: Whether a move leaves your king in check depends on the whole position, not on how one piece moves. The game tests it by applying the move tentatively and asking whether any enemy piece can reach the king, then undoing or rejecting the move.

Q: What must a move record store to support undo in chess?
A: The piece, the from and to squares, any captured piece, and the special kind such as castling, en passant or promotion, plus state that the move changed, such as castling rights. Undo then restores exactly the previous position.

Q: What stays the same when a tic-tac-toe framework grows into chess?
A: The board abstraction, alternating turns, validating a move before applying it, the result states and a history for undo. Pieces with their own movement rules and game-level rules such as check are what gets added.

## lld.classics.lru-cache-as-a-class-design
name: "LRU cache as a class design"
importance: must
prereqs: [lld.method.clarifying-requirements]
scope: "interfaces, eviction policy strategy"

### simple
This problem takes the classic least-recently-used cache and asks you to design it as a reusable library. It is like a small desk that fits a few books: when it is full and a new book arrives, the one you haven't opened for longest goes back to the shelf. The design question is how to make the "which book goes" rule swappable and the desk safe for many people at once.

### interview
- Public **interface** `Cache<K, V>`: `get`, `put`, `remove`, templated on key and value; callers never see how eviction works.
- **Storage**: a hash map from key to value; **policy bookkeeping**: a doubly linked list of keys plus a map from key to list iterator, so touching, removing and picking a victim are all O(1).
- **Eviction policy as a strategy** (`EvictionPolicy<K>`: `touched`, `removed`, `victim`): LRU moves a key to the back on every access, FIFO only on first insert, LFU keeps frequency buckets.
- **Thread safety**: an LRU `get` changes the order, so even reads write shared state; a single mutex is simple but serializes everything. Scale by sharding into N independent caches by key hash (approximate global LRU), or use cheaper policies such as CLOCK.
- Extras: **time-to-live** (store an expiry per entry, check lazily on `get`), **hit-rate metrics**, capacity 0, and values that are expensive to copy.
- The algorithm itself is the DSA problem ([LRU cache](#/concept/dsa.design-ds.lru-cache)); here the grading is on interfaces and trade-offs.

### deep
#### Requirements (agreed)

A generic in-memory cache with fixed capacity; O(1) `get`, `put`, `remove`; LRU by default, FIFO or others pluggable; safe to share between threads; hit rate reported.

#### Classes

```text
Cache<K,V> <<interface>>  <|..  BoundedCache<K,V>
BoundedCache *-- unordered_map<K,V>                  the values
BoundedCache *-- EvictionPolicy<K> <<interface>>     which key leaves
ListPolicy<K> ..|> EvictionPolicy<K>                 list + key -> iterator map
Lru --|> ListPolicy      Fifo --|> ListPolicy
```

#### Code

```cpp
template <class K, class V>
struct Cache {                                     // what callers depend on
    virtual ~Cache() = default;
    virtual optional<V> get(const K& k) = 0;
    virtual void put(const K& k, V v) = 0;
    virtual bool remove(const K& k) = 0;
};

template <class K>
struct EvictionPolicy {                            // strategy: which key leaves when full
    virtual ~EvictionPolicy() = default;
    virtual void touched(const K& k) = 0;          // on a hit or a put
    virtual void removed(const K& k) = 0;
    virtual K victim() = 0;
};

template <class K>
class ListPolicy : public EvictionPolicy<K> {      // O(1) bookkeeping shared by LRU and FIFO
protected:
    list<K> order;                                 // front = next victim
    unordered_map<K, typename list<K>::iterator> pos;
    void append(const K& k) { order.push_back(k); pos[k] = prev(order.end()); }
public:
    void removed(const K& k) override {
        if (auto it = pos.find(k); it != pos.end()) { order.erase(it->second); pos.erase(it); }
    }
    K victim() override { return order.front(); }
};
template <class K>
struct Lru : ListPolicy<K> {                       // every touch moves the key to the back
    void touched(const K& k) override { this->removed(k); this->append(k); }
};
template <class K>
struct Fifo : ListPolicy<K> {                      // only the first insert counts
    void touched(const K& k) override { if (!this->pos.count(k)) this->append(k); }
};

template <class K, class V>
class BoundedCache : public Cache<K, V> {
    size_t capacity;
    unordered_map<K, V> data;
    unique_ptr<EvictionPolicy<K>> policy;
    mutable mutex m;                               // get writes too (recency), so no shared lock
    size_t hits = 0, misses = 0;
public:
    BoundedCache(size_t cap, unique_ptr<EvictionPolicy<K>> p)
        : capacity(cap), policy(std::move(p)) {}
    optional<V> get(const K& k) override {
        lock_guard lock(m);
        auto it = data.find(k);
        if (it == data.end()) { ++misses; return nullopt; }
        ++hits;
        policy->touched(k);
        return it->second;
    }
    void put(const K& k, V v) override {
        lock_guard lock(m);
        if (capacity == 0) return;
        if (!data.count(k) && data.size() == capacity) {
            K old = policy->victim();
            policy->removed(old);
            data.erase(old);
        }
        data[k] = std::move(v);
        policy->touched(k);
    }
    bool remove(const K& k) override {
        lock_guard lock(m);
        policy->removed(k);
        return data.erase(k) > 0;
    }
    size_t size() const { lock_guard lock(m); return data.size(); }
    double hitRate() const { lock_guard lock(m); return hits ? double(hits) / (hits + misses) : 0; }
};

int main() {
    for (string name : {"LRU", "FIFO"}) {
        unique_ptr<EvictionPolicy<string>> p;
        if (name == "LRU") p = make_unique<Lru<string>>();
        else p = make_unique<Fifo<string>>();
        BoundedCache<string, int> cache(2, std::move(p));
        cache.put("a", 1);
        cache.put("b", 2);
        cache.get("a");                            // a is now the most recently used
        cache.put("c", 3);                         // full: one key must go
        cout << name << ": a " << (cache.get("a") ? "kept" : "evicted") << ", b "
             << (cache.get("b") ? "kept" : "evicted") << ", hit rate " << fixed
             << setprecision(2) << cache.hitRate() << "\n";
    }
    BoundedCache<int, int> shared(100, make_unique<Lru<int>>());
    {
        vector<jthread> threads;                   // 4 threads, 20000 mixed calls each
        for (int t = 0; t < 4; ++t)
            threads.emplace_back([&, t] {
                for (int i = 0; i < 20000; ++i) {
                    int key = (i * 7 + t) % 300;
                    if (!shared.get(key)) shared.put(key, i);
                }
            });
    }
    cout << "after 80000 calls from 4 threads: size " << shared.size() << " of 100\n";
}
```

Output:

```text
LRU: a kept, b evicted, hit rate 0.67
FIFO: a evicted, b kept, hit rate 0.67
after 80000 calls from 4 threads: size 100 of 100
```

The same `BoundedCache` gives different results with the two policies: LRU keeps `a` because it was just read, FIFO evicts it because it arrived first. The threaded run was repeated under ThreadSanitizer with no reports.

#### Trade-offs to discuss

Separating storage from the policy costs a second hash lookup per call (the textbook LRU keeps the value inside the list node), which buys pluggable policies. A single mutex is correct but every call, even `get`, waits for it; the usual fix is **sharding**: 16 caches chosen by `hash(key) % 16`, each with its own lock and policy, so eviction is LRU within a shard. For **time-to-live**, store an expiry next to each value, treat an expired entry as a miss on `get` and remove it; a periodic sweep bounds memory held by keys nobody reads.

#### Interview checklist

- **Cache interface with generic key and value types**: `Cache<K, V>`; callers never see the policy.
- **Hash map plus doubly linked list for O(1) operations**: `data` holds values; `ListPolicy` keeps a `std::list` and a key-to-iterator map.
- **Eviction policy as a strategy interface**: `EvictionPolicy<K>` with `Lru` and `Fifo`; LFU is another class.
- **Thread safety and the cost of the chosen locking**: one mutex, since LRU reads write; sharding reduces contention.
- **Optional extras: time-to-live and hit-rate metrics**: `hitRate()` above; TTL as described.

Connects to: [strategy](#/concept/oop.patterns-behavioral.strategy), [LFU cache](#/concept/dsa.design-ds.lfu-cache), [eviction policies](#/concept/sysd.caching.eviction-policies).

### questions
Q: How do you make the eviction policy of a cache pluggable?
A: Define an eviction policy interface with operations such as touched, removed and victim, and have the cache call it on every hit, insert and eviction. LRU, FIFO and LFU become separate implementations chosen when the cache is built, without changing the cache class.

Q: Why is a read-write lock not a good fit for an LRU cache?
A: An LRU get changes the recency order, so every read also writes shared state and needs exclusive access. A plain mutex or sharding into independently locked segments is the usual choice.

Q: How does sharding improve a thread-safe cache, and what does it cost?
A: Keys are split by hash across several independent caches, each with its own lock and policy, so threads touching different shards don't wait for each other. The cost is that eviction is only least recently used within a shard, not across the whole cache.

Q: How would you add time-to-live to the cache?
A: Store an expiry time with each value, treat an expired entry as a miss on get and remove it then, and run an occasional sweep so keys that are never read again don't hold memory forever. Inject the clock so expiry can be tested.

Q: What operations must be O(1) and how are they achieved?
A: Get, put and remove, including picking and removing the victim. A hash map finds values and list positions in O(1), and a doubly linked list moves or removes a key in O(1) given its iterator.

## lld.classics.rate-limiter
name: "Rate limiter"
importance: must
prereqs: [lld.method.clarifying-requirements]
scope: "token bucket, sliding window, per-user limits"

### simple
A rate limiter decides, for each incoming request, whether its sender has used up their allowance, such as 100 requests a minute. It is like a turnstile that only lets a few people through per minute and turns the rest away politely. As a library, it needs swappable counting methods and must stay correct when many threads ask about the same user at once.

### interview
- One interface, `allow(key, now)`, called before each request; the **key** combines user and endpoint (`"u42:/search"`), so limits apply per user and per endpoint.
- **Algorithms as strategies**, chosen by configuration: token bucket (allows bursts up to capacity, smooth refill), sliding window log (exact, stores every timestamp), sliding window counter (two counters, approximate, tiny memory), fixed window (simplest, bursts at window edges).
- **Token bucket**: capacity C, refill rate r; on each call, **lazily** add r × elapsed (capped at C), then take one token if available. No background timer.
- **Per-key state** lives in a hash map; keys that go quiet are evicted (a full bucket or an empty log carries no information).
- **Atomicity**: read, refill, compare and update must be one step per key: a mutex (or lock striping by key hash), or an atomic compare-and-swap loop. In a distributed setting, a Redis script does the same.
- Pass `now` in (or inject a clock) so tests are deterministic; return how long to wait so the server can send `429` with `Retry-After`.

### deep
#### Requirements (agreed)

A library the API server calls per request; limits per user and endpoint; token bucket and sliding window, chosen by configuration; thread safe; memory must not grow forever. The algorithms themselves are covered in [rate limiting algorithms](#/concept/sysd.reliability.rate-limiting-algorithms); here the focus is the class design.

#### Classes

```text
RateLimiter <<interface>>: allow(key, now), evictIdle(now)
TokenBucket ..|> RateLimiter          map: key -> {tokens, last}
SlidingWindowLog ..|> RateLimiter     map: key -> deque of timestamps
makeLimiter(config) ..> RateLimiter   factory
```

#### Code

```cpp
using Millis = long long;

struct RateLimiter {                                 // strategy interface
    virtual ~RateLimiter() = default;
    virtual bool allow(const string& key, Millis now) = 0;
    virtual size_t evictIdle(Millis now) = 0;        // returns keys dropped
};

class TokenBucket : public RateLimiter {
    struct Bucket { double tokens; Millis last; };
    double capacity, perMs;
    unordered_map<string, Bucket> buckets;
    mutex m;
    double refilled(const Bucket& b, Millis now) const {
        return min(capacity, b.tokens + (now - b.last) * perMs);
    }
public:
    TokenBucket(double cap, double perSecond) : capacity(cap), perMs(perSecond / 1000) {}
    bool allow(const string& key, Millis now) override {
        lock_guard lock(m);                          // refill, check and take as one step
        Bucket& b = buckets.try_emplace(key, Bucket{capacity, now}).first->second;
        b.tokens = refilled(b, now);                 // lazy refill, no timer thread
        b.last = now;
        if (b.tokens < 1) return false;
        b.tokens -= 1;
        return true;
    }
    size_t evictIdle(Millis now) override {          // a full bucket carries no information
        lock_guard lock(m);
        return erase_if(buckets, [&](auto& kv) { return refilled(kv.second, now) >= capacity; });
    }
};

class SlidingWindowLog : public RateLimiter {
    size_t limit;
    Millis window;
    unordered_map<string, deque<Millis>> logs;
    mutex m;
public:
    SlidingWindowLog(size_t limit, Millis window) : limit(limit), window(window) {}
    bool allow(const string& key, Millis now) override {
        lock_guard lock(m);
        auto& log = logs[key];
        while (!log.empty() && log.front() <= now - window) log.pop_front();
        if (log.size() >= limit) return false;
        log.push_back(now);
        return true;
    }
    size_t evictIdle(Millis now) override {
        lock_guard lock(m);
        return erase_if(logs, [&](auto& kv) {
            return kv.second.empty() || kv.second.back() <= now - window;
        });
    }
};

unique_ptr<RateLimiter> makeLimiter(const string& kind, int limit, Millis window) {
    if (kind == "token-bucket") return make_unique<TokenBucket>(limit, limit * 1000.0 / window);
    if (kind == "sliding-log") return make_unique<SlidingWindowLog>(limit, window);
    throw invalid_argument("unknown limiter " + kind);
}

int main() {
    for (string kind : {"token-bucket", "sliding-log"}) {
        auto limiter = makeLimiter(kind, 3, 1000);   // 3 requests per second
        string trace;
        for (Millis t : {0, 100, 200, 300, 400, 1000, 1100, 1350})
            trace += to_string(t) + (limiter->allow("u42:/search", t) ? "+ " : "- ");
        cout << kind << ": " << trace << "\n";
        cout << "  other key: " << (limiter->allow("u7:/search", 400) ? "allowed" : "denied")
             << "; idle keys dropped at 60 s: " << limiter->evictIdle(60000) << "\n";
    }
    auto shared = makeLimiter("token-bucket", 3, 1000);
    atomic<int> allowed = 0;
    {
        vector<jthread> threads;                     // 8 threads hit one key at the same instant
        for (int i = 0; i < 8; ++i)
            threads.emplace_back([&] {
                for (int j = 0; j < 100; ++j) allowed += shared->allow("hot", 5000);
            });
    }
    cout << "800 concurrent calls on one key: " << allowed << " allowed\n";
}
```

Output:

```text
token-bucket: 0+ 100+ 200+ 300- 400+ 1000+ 1100+ 1350+
  other key: allowed; idle keys dropped at 60 s: 2
sliding-log: 0+ 100+ 200+ 300- 400- 1000+ 1100+ 1350+
  other key: allowed; idle keys dropped at 60 s: 2
800 concurrent calls on one key: 3 allowed
```

Read the traces (`+` allowed, `-` denied) with a limit of 3 per second. Both pass the first burst of three. The token bucket refills continuously, one token per 333 ms: it had 0.9 tokens at 300 ms and 1.2 at 400 ms, so the request at 400 passes. The sliding log refuses it, because the requests from 0, 100 and 200 are still inside the last second; at 1000 the one from 0 has left. The log never allows more than 3 in any one-second span, while the bucket allows up to its capacity plus a second of refill (here 4 requests between 100 and 1000 ms).

#### Log versus counter

A **sliding window log** is exact but stores one timestamp per allowed request: 100 per minute times a million keys is 100 million entries. A **sliding window counter** stores two numbers per key (this window's count and the previous one's) and estimates the rolling count as $\text{prev} \times (1 - \frac{\text{elapsed}}{\text{window}}) + \text{current}$; it assumes requests in the previous window were evenly spread, so it can be off by a little, which is usually acceptable.

#### Interview checklist

- **A rate limiter interface with algorithms as strategies**: `RateLimiter` with `TokenBucket` and `SlidingWindowLog`, built by `makeLimiter` from configuration.
- **Token bucket details: capacity, refill rate, lazy refill on each call**: `refilled` adds tokens for the elapsed time, capped at capacity, only when the key is used.
- **Sliding window log versus counter trade-offs**: exactness against memory, as above.
- **Per-key state, and cleaning up keys that go quiet**: maps keyed by user and endpoint; `evictIdle` drops full buckets and empty logs.
- **Atomic updates when many threads check the same key**: the whole check runs under the lock, so 800 simultaneous calls allow exactly 3. For more throughput, stripe locks by key hash.

Connects to: [strategy](#/concept/oop.patterns-behavioral.strategy), [factory method](#/concept/oop.patterns-creational.factory-method), [rate limiter service](#/concept/sysd.classics.rate-limiter-service).

### questions
Q: How would you design a rate limiter library with several algorithms?
A: Expose one interface, such as allow for a key at a time, and implement token bucket, sliding window log and sliding window counter as strategies behind it. A factory builds the configured one, and callers never depend on a concrete algorithm.

Q: How does lazy refill work in a token bucket?
A: Each key stores its token count and the time of the last update. On each call, add the refill rate times the elapsed time, cap it at the capacity, then take a token if at least one is available; no timer thread is needed.

Q: What are the trade-offs between a sliding window log and a sliding window counter?
A: The log keeps a timestamp per allowed request, so it is exact but its memory grows with the limit and the number of keys. The counter keeps two counts per key and weights the previous window, so memory is tiny but the result is an estimate that assumes evenly spread requests.

Q: How do you keep a rate limiter correct when many threads check the same key?
A: The read, refill, comparison and update for a key must be one atomic step, using a mutex, lock striping by key hash, or a compare-and-swap loop. Otherwise two threads can both see the last token and both take it.

Q: How do you stop per-key state from growing forever?
A: Evict keys that carry no information: a token bucket that has refilled to capacity or a log whose timestamps are all outside the window behaves exactly like a new key. Run the cleanup periodically or piggyback it on calls.

## lld.classics.logger-framework
name: "Logger framework"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "levels, sinks, chain of responsibility"

### simple
A logging library lets any part of a program write messages such as "payment failed" with a severity level, and sends them to places like the screen or a file. It is like a newsroom desk: every report arrives with an urgency tag, and the desk forwards each one to the teams that asked for that kind of news. It must stay out of the way, so a slow destination never slows the program down.

### interview
- **Levels** (DEBUG < INFO < WARN < ERROR) with a threshold per logger and per destination; a disabled level returns before any formatting work.
- **Sinks** (appenders: console, file, network) and **formatters** (plain text, JSON) behind interfaces, combined freely: any sink with any formatter.
- **Routing**: named loggers form a hierarchy (`payments.card` → `payments` → root); a record goes to the logger's own sinks and then up to its parent's, a [chain of responsibility](#/concept/oop.patterns-behavioral.chain-of-responsibility). Fan-out to several sinks is [observer](#/concept/oop.patterns-behavioral.observer)-like.
- **Asynchronous writing**: an async sink puts records in a bounded queue drained by a worker thread; when the queue is full, choose a policy: drop and count (never slows the app), block (never loses logs), or drop low levels first.
- **Configuration**: levels per logger name from a config file; loggers come from a registry (`get("payments.card")`), created on first use and reused.
- Thread safety: many threads log at once; each sink serializes its own writes, and the worker writes outside the queue lock.

### deep
#### Classes

```text
LoggerRegistry "1" *-- "*" Logger          by dotted name; configure(levels)
Logger --> Logger (parent)                 records travel up the chain
Logger o-- "*" Sink <<interface>>          StreamSink, MemorySink, AsyncSink
StreamSink *-- Formatter <<interface>>     PlainFormatter, JsonFormatter
AsyncSink *-- Sink                         a decorator: queue + worker thread
```

#### Code

```cpp
enum class Level { Debug, Info, Warn, Error };
const char* levelName(Level l) {
    static const char* names[] = {"DEBUG", "INFO", "WARN", "ERROR"};
    return names[int(l)];
}
struct Record { Level level; string logger, message; int time; };

struct Formatter {
    virtual ~Formatter() = default;
    virtual string format(const Record& r) const = 0;
};
struct PlainFormatter : Formatter {
    string format(const Record& r) const override {
        return "[" + to_string(r.time) + "] " + levelName(r.level) + " " + r.logger + ": " +
               r.message;
    }
};
struct JsonFormatter : Formatter {
    string format(const Record& r) const override {
        return string("{\"level\":\"") + levelName(r.level) + "\",\"logger\":\"" + r.logger +
               "\",\"msg\":\"" + r.message + "\"}";
    }
};

struct Sink {                                    // a destination
    virtual ~Sink() = default;
    virtual void write(const Record& r) = 0;
};
class StreamSink : public Sink {
    ostream& out;
    unique_ptr<Formatter> formatter;
    Level min;
    mutex m;                                     // one line at a time
public:
    StreamSink(ostream& o, unique_ptr<Formatter> f, Level min)
        : out(o), formatter(std::move(f)), min(min) {}
    void write(const Record& r) override {
        if (r.level < min) return;
        lock_guard lock(m);
        out << formatter->format(r) << "\n";
    }
};

class Logger {
    string name;
    Logger* parent;
    optional<Level> level;                       // unset: inherit from the parent
    vector<shared_ptr<Sink>> sinks;
    int& clock;
public:
    Logger(string n, Logger* p, int& clock) : name(std::move(n)), parent(p), clock(clock) {}
    void setLevel(Level l) { level = l; }
    Level effectiveLevel() const {
        return level ? *level : parent ? parent->effectiveLevel() : Level::Info;
    }
    void addSink(shared_ptr<Sink> s) { sinks.push_back(std::move(s)); }
    void log(Level l, const string& msg) {
        if (l < effectiveLevel()) return;        // cheap early exit
        Record r{l, name, msg, ++clock};
        for (Logger* at = this; at; at = at->parent)   // chain: own sinks, then ancestors'
            for (auto& s : at->sinks) s->write(r);
    }
};

class LoggerRegistry {
    int clock = 0;                               // stands in for a real timestamp
    map<string, unique_ptr<Logger>> loggers;
public:
    LoggerRegistry() { loggers[""] = make_unique<Logger>("root", nullptr, clock); }
    Logger& root() { return *loggers[""]; }
    Logger& get(const string& name) {            // created on first use, parents first
        if (auto it = loggers.find(name); it != loggers.end()) return *it->second;
        auto dot = name.rfind('.');
        Logger& parent = dot == string::npos ? root() : get(name.substr(0, dot));
        return *(loggers[name] = make_unique<Logger>(name, &parent, clock));
    }
    void configure(const map<string, Level>& levels) {
        for (auto& [name, l] : levels) get(name).setLevel(l);
    }
};

class AsyncSink : public Sink {                  // decorator: callers never wait for I/O
    unique_ptr<Sink> inner;
    size_t capacity;
    deque<Record> queue;
    mutex m;
    condition_variable ready;
    bool stopping = false;
    size_t dropped = 0;
    jthread worker;                              // last member: starts after the others exist
    void run() {
        unique_lock lock(m);
        while (true) {
            ready.wait(lock, [&] { return stopping || !queue.empty(); });
            if (queue.empty()) return;           // stopping and drained
            Record r = std::move(queue.front());
            queue.pop_front();
            lock.unlock();
            inner->write(r);                     // slow write outside the lock
            lock.lock();
        }
    }
public:
    AsyncSink(unique_ptr<Sink> s, size_t cap)
        : inner(std::move(s)), capacity(cap), worker([this] { run(); }) {}
    void write(const Record& r) override {
        {
            lock_guard lock(m);
            if (queue.size() == capacity) { ++dropped; return; }   // policy: drop and count
            queue.push_back(r);
        }
        ready.notify_one();
    }
    size_t droppedCount() { lock_guard lock(m); return dropped; }
    ~AsyncSink() override {                      // flush what is queued, then join
        { lock_guard lock(m); stopping = true; }
        ready.notify_one();
    }
};

struct SlowSink : Sink {                         // a destination stuck on its first write
    vector<string>& out;
    latch started{1}, opened{1};
    bool first = true;
    explicit SlowSink(vector<string>& o) : out(o) {}
    void write(const Record& r) override {
        if (first) { first = false; started.count_down(); opened.wait(); }
        out.push_back(r.message);
    }
};

int main() {
    LoggerRegistry registry;
    registry.root().addSink(
        make_shared<StreamSink>(cout, make_unique<PlainFormatter>(), Level::Info));
    registry.get("payments").addSink(
        make_shared<StreamSink>(cout, make_unique<JsonFormatter>(), Level::Error));
    registry.configure({{"payments", Level::Debug}, {"search", Level::Warn}});

    Logger& card = registry.get("payments.card");
    card.log(Level::Debug, "token created");     // passes the logger, no sink wants DEBUG
    card.log(Level::Info, "charge accepted");
    card.log(Level::Error, "gateway timeout");
    registry.get("search").log(Level::Info, "query took 20 ms");     // below WARN
    registry.get("search.index").log(Level::Warn, "segment merge slow");

    vector<string> written;
    auto slow = make_unique<SlowSink>(written);
    SlowSink* gate = slow.get();
    {
        AsyncSink async(std::move(slow), 2);
        async.write({Level::Info, "app", "m1", 0});
        gate->started.wait();                    // the worker is now stuck writing m1
        for (string m : {"m2", "m3", "m4", "m5"}) async.write({Level::Info, "app", m, 0});
        cout << "queue of 2 while the sink is stuck: dropped " << async.droppedCount() << "\n";
        gate->opened.count_down();
    }                                            // destructor drains the queue and joins
    cout << "written:";
    for (auto& m : written) cout << " " << m;
    cout << "\n";
}
```

Output:

```text
[2] INFO payments.card: charge accepted
{"level":"ERROR","logger":"payments.card","msg":"gateway timeout"}
[3] ERROR payments.card: gateway timeout
[4] WARN search.index: segment merge slow
queue of 2 while the sink is stuck: dropped 2
written: m1 m2 m3
```

The DEBUG record passes the `payments.card` logger (its level is inherited from `payments`) but no sink wants DEBUG, so nothing prints. The ERROR record reaches both the JSON sink of `payments` and the root console, because records travel up the chain. `search.index` inherits WARN from `search`. In the async part, the worker is stuck on `m1`, `m2` and `m3` fill the queue, and `m4` and `m5` are dropped rather than blocking the caller; closing the sink drains the queue. This run was repeated under ThreadSanitizer with no reports.

#### Choosing the overflow policy

| policy | caller blocked? | logs lost? | good for |
|---|---|---|---|
| drop newest and count | never | yes, counted | latency-sensitive services |
| block until space | yes | no | audit logs, batch jobs |
| drop DEBUG and INFO first | rarely | low levels only | a mix of both |

Whatever the policy, report the drop count (as a log line or a metric) so silent loss is visible, and flush on shutdown so the last records before a crash are written.

#### Details worth mentioning

- **Cost when disabled**: `log(Level::Debug, expensiveString())` still builds the string; check `enabled(Level::Debug)` first or use a macro or lambda that formats lazily.
- **Getting a logger**: a registry passed in (or one process-wide instance, one of the few places a [singleton](#/concept/oop.patterns-creational.singleton) is common) returns the same `Logger` for a name. Configuration maps names to levels and sinks, often reloaded without a restart.
- **Structured logs**: key-value fields instead of free text make JSON output searchable.

#### Interview checklist

- **Log levels and filtering**: `Level`, a threshold per logger (inherited) and per sink.
- **Destinations (appenders) and formatters behind interfaces**: `Sink` and `Formatter`, combined in `StreamSink`.
- **Routing messages with chain of responsibility or observer**: records go to a logger's sinks, then up the parent chain.
- **Asynchronous writing with a buffer and what happens when it fills**: `AsyncSink` with a bounded queue, a worker and the drop-and-count policy.
- **Configuration and how callers obtain a logger**: `LoggerRegistry::get` and `configure`.

Connects to: [decorator](#/concept/oop.patterns-structural.decorator), [producer-consumer in code](#/concept/conc.patterns.producer-consumer-in-code), [observability](#/concept/sysd.building-blocks.observability).

### questions
Q: How would you structure the classes of a logging library?
A: Loggers with a name and level, sinks such as console, file and network behind one interface, and formatters behind another so any sink can use any format. A registry hands out loggers by name and applies configuration.

Q: How do records get routed to several destinations?
A: Each logger has its own sinks and a parent; a record goes to the logger's sinks and then up the chain to its ancestors' sinks, which is a chain of responsibility. Each sink applies its own minimum level, so the same record can reach a console and an error file.

Q: How do you keep logging from slowing the application down?
A: Return immediately for disabled levels before formatting, and write through an asynchronous sink: callers push records into a bounded queue and a worker thread does the slow I/O. The queue must have an explicit policy for when it fills up.

Q: What should happen when an asynchronous log buffer is full?
A: Either drop records and count the drops, which never delays callers, or block callers until there is space, which never loses records; a middle ground drops low-severity records first. The choice depends on whether latency or completeness matters more, and drops should always be reported.

Q: Why is a registry of named loggers useful?
A: It returns the same logger for the same name everywhere, builds the parent hierarchy from dotted names so levels and sinks can be set for a whole subsystem, and gives one place to apply configuration changes.

## lld.classics.vending-machine
name: "Vending machine"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "state pattern"

### simple
A vending machine takes money, lets you pick a snack, and gives you the snack and your change, or your money back if you cancel. What it may do depends on its situation: with no money inserted it ignores the buttons, and while it is dropping a snack it refuses new coins. That is why it is the textbook example of designing with states.

### interview
- **State pattern**: `Idle`, `HasMoney`, `Dispensing`, `OutOfService`; the machine forwards `insert`, `select`, `cancel` and `dispensed` to its current state object, which acts and chooses the next state. The basic pattern is covered in [state](#/concept/oop.patterns-behavioral.state); this design adds money and inventory.
- **Inventory**: slots by code, each with a product (name, price) and a count; a sold-out slot is refused without losing the customer's money.
- **Money**: count coins and notes by denomination; the customer's inserted money stays separate until a sale completes.
- **Making change** from limited coins: greedy largest-first can fail even when change exists (paying 8 from one 5 and four 2s), so search with backtracking; if no combination exists, refuse the sale and keep the customer in `HasMoney`.
- **Cancel** refunds exactly the inserted coins. **Operator actions** (restock, collect cash, maintenance) only make sense when idle or out of service.
- Validate everything before changing anything: stock, price, change; then take the money, remove the change and decrement stock together.

### deep
#### Classes

```text
VendingMachine *-- State <<interface>>   Idle, HasMoney, Dispensing, OutOfService ..|> State
VendingMachine *-- "*" Slot              code -> {Product, count}
VendingMachine: cash (denomination -> count), inserted (this customer's money)
```

#### Code

```cpp
using Coins = map<int, int>;                     // denomination in rupees -> count
int total(const Coins& c) {
    int t = 0;
    for (auto [d, n] : c) t += d * n;
    return t;
}
string show(const Coins& c) {
    string s;
    for (auto [d, n] : c)
        if (n > 0) s += (s.empty() ? "" : " ") + to_string(d) + "x" + to_string(n);
    return s.empty() ? "none" : s;
}
optional<Coins> makeChange(const Coins& available, int amount) {   // backtracking search
    vector<pair<int, int>> coins(available.rbegin(), available.rend());   // largest first
    Coins used;
    function<bool(size_t, int)> go = [&](size_t i, int left) {
        if (left == 0) return true;
        if (i == coins.size()) return false;
        auto [d, have] = coins[i];
        for (int k = min(have, left / d); k >= 0; --k) {
            used[d] = k;
            if (go(i + 1, left - k * d)) return true;
        }
        used.erase(d);
        return false;
    };
    if (!go(0, amount)) return nullopt;
    erase_if(used, [](auto& p) { return p.second == 0; });
    return used;
}

struct Product { string name; int price; };
struct Slot { Product product; int count; };
class VendingMachine;

struct State {                                   // defaults refuse; states override
    virtual ~State() = default;
    virtual string name() const = 0;
    virtual string insert(VendingMachine&, int) { return "not accepting money now"; }
    virtual string select(VendingMachine&, const string&) { return "insert money first"; }
    virtual string cancel(VendingMachine&) { return "nothing to cancel"; }
    virtual string dispensed(VendingMachine&) { return "not dispensing"; }
};

class VendingMachine {
    unique_ptr<State> state;
public:
    map<string, Slot> slots;
    Coins cash, inserted;                        // the machine's money; the customer's money
    VendingMachine(map<string, Slot> s, Coins c);
    void set(unique_ptr<State> s) { state = std::move(s); }
    string insert(int d) { return state->insert(*this, d); }
    string select(const string& code) { return state->select(*this, code); }
    string cancel() { return state->cancel(*this); }
    string dispensed() { return state->dispensed(*this); }
    string status() const { return state->name(); }
    int collectNotes() {                         // operator: take notes, keep coins for change
        int taken = 0;
        for (auto& [d, n] : cash) if (d >= 20) taken += d * n, n = 0;
        return taken;
    }
};

struct Dispensing : State {
    string name() const override { return "dispensing"; }
    string insert(VendingMachine&, int) override { return "please wait, dispensing"; }
    string dispensed(VendingMachine& m) override;
};
struct OutOfService : State {
    string name() const override { return "out of service"; }
    string insert(VendingMachine&, int d) override {
        return "out of service, " + to_string(d) + " returned";
    }
};
struct Idle : State {
    string name() const override { return "idle"; }
    string insert(VendingMachine& m, int d) override;
};
struct HasMoney : State {
    string name() const override { return "has money"; }
    string insert(VendingMachine& m, int d) override {
        ++m.inserted[d];
        return "credit " + to_string(total(m.inserted));
    }
    string cancel(VendingMachine& m) override {
        string refund = "refund " + show(m.inserted);
        m.inserted.clear();
        m.set(make_unique<Idle>());
        return refund;
    }
    string select(VendingMachine& m, const string& code) override {
        auto it = m.slots.find(code);
        if (it == m.slots.end()) return "no such item";
        Slot& slot = it->second;
        if (slot.count == 0) return slot.product.name + " sold out";
        int credit = total(m.inserted), price = slot.product.price;
        if (credit < price) return "insert " + to_string(price - credit) + " more";
        Coins pool = m.cash;                     // the customer's coins can be change too
        for (auto [d, n] : m.inserted) pool[d] += n;
        auto change = makeChange(pool, credit - price);
        if (!change)
            return "cannot make change of " + to_string(credit - price) +
                   ", cancel or pick another";
        m.cash = pool;                           // all checks passed: now change state
        for (auto [d, n] : *change) m.cash[d] -= n;
        m.inserted.clear();
        --slot.count;
        m.set(make_unique<Dispensing>());
        return "dispensing " + slot.product.name + ", change " + show(*change);
    }
};
string Idle::insert(VendingMachine& m, int d) {
    ++m.inserted[d];
    m.set(make_unique<HasMoney>());
    return "credit " + to_string(d);
}
string Dispensing::dispensed(VendingMachine& m) {
    m.set(make_unique<Idle>());
    return "ready";
}
VendingMachine::VendingMachine(map<string, Slot> s, Coins c)
    : state(make_unique<Idle>()), slots(std::move(s)), cash(std::move(c)) {}

int main() {
    VendingMachine m({{"A1", {{"chips", 15}, 1}}, {"B1", {{"juice", 12}, 5}}},
                     {{2, 4}, {5, 1}, {10, 1}});
    auto step = [&](const string& what, const string& result) {
        cout << what << ": " << result << "  [" << m.status() << "]\n";
    };
    step("select A1", m.select("A1"));
    step("insert 20", m.insert(20));
    step("select B1", m.select("B1"));
    step("insert 10", m.insert(10));
    step("motor done", m.dispensed());
    step("insert 20", m.insert(20));
    step("select B1", m.select("B1"));
    step("select A1", m.select("A1"));
    step("motor done", m.dispensed());
    step("insert 10", m.insert(10));
    step("select A1", m.select("A1"));
    step("cancel", m.cancel());
    m.slots.at("A1").count += 3;                 // operator: restock
    cout << "operator restocks A1, collects " << m.collectNotes() << ", keeps coins "
         << show(m.cash) << "\n";
    m.set(make_unique<OutOfService>());
    step("insert 10", m.insert(10));
}
```

Output:

```text
select A1: insert money first  [idle]
insert 20: credit 20  [has money]
select B1: dispensing juice, change 2x4  [dispensing]
insert 10: please wait, dispensing  [dispensing]
motor done: ready  [idle]
insert 20: credit 20  [has money]
select B1: cannot make change of 8, cancel or pick another  [has money]
select A1: dispensing chips, change 5x1  [dispensing]
motor done: ready  [idle]
insert 10: credit 10  [has money]
select A1: chips sold out  [has money]
cancel: refund 10x1  [idle]
operator restocks A1, collects 40, keeps coins 10x1
insert 10: out of service, 10 returned  [out of service]
```

The first sale needs 8 in change from four 2s, a 5 and a 10 (plus the customer's 20). Largest-first greedy would take the 5, then need 3 from 2s and fail; the search backs off the 5 and pays four 2s. The second customer's juice would need 8 again, from a 5, a 10 and notes, so the sale is refused while the credit stays; the chips need exactly the 5. Every refusal leaves stock and cash untouched, because `select` checks stock, credit and change before changing anything.

#### Interview checklist

- **State pattern: idle, has money, dispensing, out of service**: four `State` classes; defaults refuse, each state overrides only what it allows.
- **Inventory and product modeling**: `Slot` with a `Product` and a count, keyed by code; sold-out slots refuse the sale.
- **Payment and making change by denomination, including when change is impossible**: `Coins` by denomination, `makeChange` with backtracking, and a refused sale when no combination exists.
- **Cancel and refund flow**: `HasMoney::cancel` returns exactly the inserted coins and goes back to idle.
- **Operator actions such as restocking and collecting cash**: restock, `collectNotes` (keeping coins as a float for change) and switching to out of service.

Connects to: [state](#/concept/oop.patterns-behavioral.state), [unbounded knapsack](#/concept/dsa.dp-knapsack.unbounded-knapsack), [ATM](#/concept/lld.classics.atm).

### questions
Q: Why is the state pattern a good fit for a vending machine?
A: The same buttons mean different things depending on the situation: inserting a coin while idle starts a purchase, while dispensing it is refused, and while out of service it is returned. Putting each situation's rules in its own state class avoids a switch on the state in every method and makes adding a state local.

Q: How should the machine decide how to give change?
A: From the coins it actually holds, counted by denomination, including the customer's inserted coins. Greedy largest-first can fail with limited coins even when change exists, so search combinations with backtracking or dynamic programming, and refuse the sale if none works.

Q: What should happen when the machine cannot make change?
A: Refuse the sale before taking the money or the item, tell the customer, and stay in the has-money state so they can pick another item or cancel and get their exact coins back.

Q: Why keep the customer's inserted money separate from the machine's cash?
A: Until a sale completes, the inserted coins still belong to the customer and must be returned exactly on cancel. Only when all checks pass are they moved into the cash box and the change taken out.

Q: Which operator actions belong in the design?
A: Restocking slots, collecting cash while keeping enough coins for change, changing prices, and switching the machine out of service for maintenance, which refuses and returns any money inserted.

## lld.classics.atm
name: "ATM"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "states, cash dispenser, transactions"

### simple
An ATM design covers the machine's side of taking a card, checking the PIN, and letting the customer withdraw, deposit or check a balance by talking to the bank. It is like a bank teller who follows a strict script: no money moves until the customer is identified, and every step is recorded so a power cut in the middle never loses money. The tricky parts are counting out notes and recovering from failures.

### interview
- **State machine**: idle → card inserted → authenticated → in a transaction → back to authenticated or idle; every operation checks the current state first.
- **Transactions as classes** (`Withdrawal`, `Deposit`, `BalanceInquiry`) behind one interface, so a new type such as a PIN change or transfer is a new class ([command](#/concept/oop.patterns-behavioral.command)-like).
- **Dispensing notes**: a [chain of responsibility](#/concept/oop.patterns-behavioral.chain-of-responsibility) of note handlers (500, 200, 100), each taking what it can and passing the rest on; plan first, dispense only if the whole amount can be paid.
- **Bank failures**: every request carries a transaction id, so a retry after a timeout is **idempotent** (the bank does not debit twice); if the debit succeeded but the dispenser fails, send a **reversal**. Record each step in a local journal for reconciliation.
- **Security**: three wrong PINs retain the card, a session times out after inactivity, the PIN is verified by the bank and never stored, and limits apply per withdrawal and per day.
- Order of operations for a withdrawal: validate the amount, check that notes are available, debit the account, dispense, and reverse the debit if dispensing fails.

### deep
#### Classes

```text
Atm --> Bank <<interface>>          verifyPin, debit(txnId), credit, reverse, balance
Atm *-- NoteHandler (500) --> NoteHandler (200) --> NoteHandler (100)
Atm ..> Transaction <<interface>>   Withdrawal, Deposit, BalanceInquiry
Atm: state (Idle, CardInserted, Authenticated, InTransaction), pinTries, lastActivity
```

#### Code

```cpp
enum class Result { Ok, Declined, Timeout };

struct Bank {                                    // the ATM's view of the bank
    virtual ~Bank() = default;
    virtual bool verifyPin(const string& card, int pin) = 0;
    virtual Result debit(const string& card, int amount, const string& txnId) = 0;
    virtual void credit(const string& card, int amount) = 0;
    virtual void reverse(const string& txnId) = 0;
    virtual int balance(const string& card) = 0;
};

class FakeBank : public Bank {                   // idempotent by transaction id
    map<string, int> balances, pins;
    map<string, pair<string, int>> done;         // txnId -> (card, amount)
public:
    int loseNextReply = 0;                       // simulate: debit applied, reply lost
    FakeBank(map<string, int> b, map<string, int> p) : balances(std::move(b)), pins(std::move(p)) {}
    bool verifyPin(const string& card, int pin) override { return pins.at(card) == pin; }
    Result debit(const string& card, int amount, const string& txnId) override {
        if (!done.count(txnId)) {                // a retry with the same id changes nothing
            if (balances.at(card) < amount) return Result::Declined;
            balances[card] -= amount;
            done[txnId] = {card, amount};
        }
        if (loseNextReply > 0) { --loseNextReply; return Result::Timeout; }
        return Result::Ok;
    }
    void credit(const string& card, int amount) override { balances.at(card) += amount; }
    void reverse(const string& txnId) override {
        if (auto it = done.find(txnId); it != done.end()) {
            balances[it->second.first] += it->second.second;
            done.erase(it);
        }
    }
    int balance(const string& card) override { return balances.at(card); }
};

class NoteHandler {                              // chain of responsibility
    int note, count;
    NoteHandler* next;
public:
    NoteHandler(int note, int count, NoteHandler* next) : note(note), count(count), next(next) {}
    bool plan(int amount, map<int, int>& out) const {
        int take = min(count, amount / note);
        if (take) out[note] = take;
        amount -= take * note;
        return amount == 0 || (next && next->plan(amount, out));
    }
    void remove(const map<int, int>& notes) {
        if (auto it = notes.find(note); it != notes.end()) count -= it->second;
        if (next) next->remove(notes);
    }
};

enum class State { Idle, CardInserted, Authenticated, InTransaction };
struct Transaction;

class Atm {
    Bank& bank;
    NoteHandler n100{100, 5, nullptr}, n200{200, 5, &n100}, n500{500, 4, &n200};
    State state = State::Idle;
    string card;
    int pinTries = 0, lastActivity = 0, txnCounter = 0;
public:
    bool jamNext = false;                        // simulate a dispenser failure
    explicit Atm(Bank& b) : bank(b) {}
    string insertCard(const string& c, int now) {
        if (state != State::Idle) return "card slot busy";
        card = c;
        pinTries = 0;
        lastActivity = now;
        state = State::CardInserted;
        return "enter PIN";
    }
    string enterPin(int pin, int now) {
        if (state != State::CardInserted) return "no card";
        lastActivity = now;
        if (bank.verifyPin(card, pin)) { state = State::Authenticated; return "welcome"; }
        if (++pinTries == 3) { state = State::Idle; return "wrong PIN 3 times, card retained"; }
        int left = 3 - pinTries;
        return "wrong PIN, " + to_string(left) + (left == 1 ? " try" : " tries") + " left";
    }
    string tick(int now) {                       // called by a timer
        if (state == State::Authenticated && now - lastActivity > 30) {
            state = State::Idle;
            return "session timed out, card ejected";
        }
        return "";
    }
    // Used by the transaction classes.
    Bank& bankRef() { return bank; }
    const string& cardNo() const { return card; }
    string newTxnId() { return "atm7-" + to_string(++txnCounter); }
    bool planNotes(int amount, map<int, int>& notes) const { return n500.plan(amount, notes); }
    bool dispense(const map<int, int>& notes) {
        if (jamNext) { jamNext = false; return false; }
        n500.remove(notes);
        return true;
    }
    string run(Transaction& t, int now);
};

struct Transaction {
    virtual ~Transaction() = default;
    virtual string execute(Atm& atm) = 0;
};
string Atm::run(Transaction& t, int now) {
    if (state != State::Authenticated) return "not authenticated";
    state = State::InTransaction;
    string result = t.execute(*this);
    state = State::Authenticated;
    lastActivity = now;
    return result;
}

struct BalanceInquiry : Transaction {
    string execute(Atm& atm) override {
        return "balance " + to_string(atm.bankRef().balance(atm.cardNo()));
    }
};
struct Deposit : Transaction {
    int amount;
    explicit Deposit(int a) : amount(a) {}
    string execute(Atm& atm) override {
        atm.bankRef().credit(atm.cardNo(), amount);
        return "deposited " + to_string(amount);
    }
};
struct Withdrawal : Transaction {
    int amount;
    explicit Withdrawal(int a) : amount(a) {}
    string execute(Atm& atm) override {
        if (amount <= 0 || amount % 100) return "amount must be a multiple of 100";
        map<int, int> notes;
        if (!atm.planNotes(amount, notes)) return "cannot dispense " + to_string(amount);
        string id = atm.newTxnId();
        Bank& bank = atm.bankRef();
        Result r = bank.debit(atm.cardNo(), amount, id);
        if (r == Result::Timeout) r = bank.debit(atm.cardNo(), amount, id);  // same id: safe
        if (r == Result::Declined) return "declined";
        if (r == Result::Timeout) { bank.reverse(id); return "bank unavailable, nothing taken"; }
        if (!atm.dispense(notes)) { bank.reverse(id); return "dispenser fault, debit reversed"; }
        string s = "dispensed";
        for (auto it = notes.rbegin(); it != notes.rend(); ++it)
            s += " " + to_string(it->first) + "x" + to_string(it->second);
        return s;
    }
};

int main() {
    FakeBank bank({{"card-1", 3000}, {"card-2", 900}}, {{"card-1", 1234}, {"card-2", 4321}});
    Atm atm(bank);
    auto say = [](const string& s) { if (!s.empty()) cout << s << "\n"; };
    say(atm.insertCard("card-1", 0));
    say(atm.enterPin(1111, 1));
    say(atm.enterPin(1234, 2));
    BalanceInquiry inquiry;
    say(atm.run(inquiry, 3));
    bank.loseNextReply = 1;                      // the bank debits, but the reply is lost
    Withdrawal w2600(2600);
    say(atm.run(w2600, 4));
    say(atm.run(inquiry, 5));
    Withdrawal w50(50), w800(800), w500(500);
    say(atm.run(w50, 6));
    say(atm.run(w800, 7));
    Deposit d1000(1000);
    say(atm.run(d1000, 8));
    atm.jamNext = true;
    say(atm.run(w500, 9));
    say(atm.run(inquiry, 10));
    say(atm.tick(20));
    say(atm.tick(41));
    say(atm.run(inquiry, 42));
    say(atm.insertCard("card-2", 50));
    for (int pin : {1, 2, 3}) say(atm.enterPin(pin, 51));
}
```

Output:

```text
enter PIN
wrong PIN, 2 tries left
welcome
balance 3000
dispensed 500x4 200x3
balance 400
amount must be a multiple of 100
declined
deposited 1000
dispenser fault, debit reversed
balance 1400
session timed out, card ejected
not authenticated
enter PIN
wrong PIN, 2 tries left
wrong PIN, 1 try left
wrong PIN 3 times, card retained
```

Follow the withdrawal of 2600: the chain plans 500 × 4 and 200 × 3 before any money moves. The bank applies the debit but its reply is lost; the retry carries the same transaction id, so the bank recognizes it and the account is debited once (3000 − 2600 = 400). The next withdrawal of 800 can be paid in notes (200 × 2 and 100 × 4) but the bank declines it. When the dispenser jams on 500, the debit is reversed and the balance is unchanged. The fake bank here is in memory; with a real one, each step also goes to a local journal so that a crash between "debited" and "dispensed" is reconciled later.

#### Where greedy note-picking fails

Each handler takes as many notes as it can, which is fine for well-stocked machines but can fail with limited notes: 600 from one 500 and three 200s fails greedily (500, then 100 is impossible) although 200 × 3 works. Real machines keep enough small notes or run a small search, exactly like [making change in a vending machine](#/concept/lld.classics.vending-machine).

#### Interview checklist

- **ATM state machine: idle, card inserted, authenticated, in a transaction**: `State` and the checks at the top of each operation.
- **Transaction types as separate classes**: `Transaction` with `Withdrawal`, `Deposit` and `BalanceInquiry`, run by `Atm::run`.
- **Dispensing notes by denomination (chain of responsibility)**: `NoteHandler` 500 → 200 → 100, planned before any debit.
- **Bank communication failures, rollback and safe retries**: idempotent transaction ids for retries, reversals when dispensing fails or the bank stays unreachable.
- **Security: PIN attempt limits, card retention, session timeout**: three tries then retention, a 30-second inactivity timeout in `tick`; PINs are checked by the bank, never stored.

Connects to: [chain of responsibility](#/concept/oop.patterns-behavioral.chain-of-responsibility), [idempotency and exactly-once myths](#/concept/sysd.messaging.idempotency-and-exactly-once-myths), [vending machine](#/concept/lld.classics.vending-machine).

### questions
Q: What states does an ATM move through?
A: Idle, card inserted, authenticated, and in a transaction, returning to authenticated after each transaction and to idle when the card is ejected, retained or the session times out. Each operation first checks that the machine is in a state that allows it.

Q: How does a chain of responsibility dispense notes?
A: Handlers for each denomination are linked from largest to smallest; each takes as many of its notes as it can without exceeding the amount and passes the remainder on. The plan is checked first, and money is only debited and dispensed if the whole amount can be paid.

Q: What happens if the bank debits the account but the ATM never receives the reply?
A: The ATM retries with the same transaction id, and the bank treats the repeat as the same request, so the account is not debited twice. If the bank stays unreachable, the ATM sends a reversal for that id and dispenses nothing; the journal lets both sides reconcile later.

Q: What if the dispenser fails after the account was debited?
A: The ATM sends a reversal for that transaction id so the money returns to the account, records the event, and tells the customer nothing was taken. The order is always: plan the notes, debit, dispense, and reverse on failure.

Q: Which security rules belong in an ATM design?
A: A limited number of PIN attempts before the card is retained, a session timeout after inactivity, PIN verification done by the bank rather than stored in the ATM, and per-withdrawal and daily limits.

## lld.classics.library-management
name: "Library management"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "books, members, loans, fines"

### simple
A library system tracks books, the members who borrow them, and who is waiting for what. The key idea is that a book title like "Dune" and the physical copies on the shelf are different things: you search for titles but borrow copies. When a borrowed copy comes back and someone reserved that title, the library holds it for them and lets them know.

### interview
- **Title versus copy**: `Book` (ISBN, title, author) is what members search; `Copy` (id, ISBN, status) is what they borrow. Availability is per copy.
- Entities: `Member` (with a borrowing limit and unpaid fines), `Loan` (copy, member, due day), and a **reservation queue** per title.
- **Borrowing rules** checked before anything changes: under the member's limit, fines below a threshold, and a copy that is available or held for this member.
- **Fines as a replaceable rule**: a `FinePolicy` interface (per day, capped, grace period), chosen per member type; the clock is injected so rules are testable.
- **Returns and reservations**: a returned copy of a reserved title goes on hold for the first member in the queue, who is **notified** (observer); an uncollected hold expires and passes to the next member.
- **Search**: an inverted index from lowercase words in titles and authors to ISBNs, intersected for multi-word queries.

### deep
#### Classes

```text
Library "1" *-- "*" Book               by ISBN
Library "1" *-- "*" Copy               Copy --> Book (by ISBN); status: available, on loan, on hold
Library "1" *-- "*" Member             limit, fines owed
Library "1" *-- "*" Loan               Loan --> Copy, Loan --> Member, due day
Library *-- reservation queue per ISBN
Library --> FinePolicy <<interface>>   Library --> Notifier <<interface>>
```

The method articles built this domain step by step ([identifying entities](#/concept/lld.method.identifying-entities) found the book and copy split, [extensibility and testing](#/concept/lld.method.extensibility-and-testing) made the fine rule and the clock injectable); this design adds reservations, holds, notifications and search.

#### Code

```cpp
struct Book { string isbn, title, author; };
enum class CopyStatus { Available, OnLoan, OnHold };
struct Copy { int id; string isbn; CopyStatus status = CopyStatus::Available; int heldFor = 0; };
struct Member { int id; string name; int limit, loans = 0, finesOwed = 0; };
struct Loan { int copyId, memberId, dueDay; };

struct FinePolicy {
    virtual ~FinePolicy() = default;
    virtual int fine(int daysLate) const = 0;
};
struct PerDay : FinePolicy {
    int fine(int daysLate) const override { return 10 * daysLate; }
};
struct Notifier {                                // observer of holds
    virtual ~Notifier() = default;
    virtual void holdReady(const Member& m, const Book& b, int untilDay) = 0;
};
struct PrintNotifier : Notifier {
    void holdReady(const Member& m, const Book& b, int until) override {
        cout << "  notify " << m.name << ": " << b.title << " is held for you until day " << until
             << "\n";
    }
};

class Library {
    map<string, Book> books;
    map<int, Copy> copies;
    map<int, Member> members;
    map<int, Loan> loans;                        // by copy id
    map<string, deque<int>> waiting;             // ISBN -> member ids
    map<string, set<string>> index;              // word -> ISBNs
    const FinePolicy& fines;
    Notifier& notifier;
    static constexpr int kLoanDays = 14, kHoldDays = 3, kMaxFines = 50;
    static vector<string> words(const string& text) {
        vector<string> out;
        string w;
        for (char c : text + " ") {
            if (isalnum((unsigned char)c)) {
                w += char(tolower((unsigned char)c));
            } else if (!w.empty()) {
                out.push_back(w);
                w.clear();
            }
        }
        return out;
    }
public:
    Library(const FinePolicy& f, Notifier& n) : fines(f), notifier(n) {}
    void addBook(const Book& b, int count) {
        books[b.isbn] = b;
        for (auto& w : words(b.title + " " + b.author)) index[w].insert(b.isbn);
        for (int i = 0; i < count; ++i) {
            int id = int(copies.size()) + 1;
            copies[id] = {id, b.isbn};
        }
    }
    void join(const Member& m) { members[m.id] = m; }
    vector<string> search(const string& query) const {   // every word must match
        vector<string> ws = words(query);
        set<string> hits;
        for (size_t i = 0; i < ws.size(); ++i) {
            auto it = index.find(ws[i]);
            set<string> found = it == index.end() ? set<string>{} : it->second;
            if (i == 0) { hits = found; continue; }
            set<string> both;
            set_intersection(hits.begin(), hits.end(), found.begin(), found.end(),
                             inserter(both, both.end()));
            hits = both;
        }
        vector<string> titles;
        for (auto& isbn : hits) titles.push_back(books.at(isbn).title);
        return titles;
    }
    string borrow(int memberId, const string& isbn, int today) {
        Member& m = members.at(memberId);
        if (m.loans >= m.limit) return "limit of " + to_string(m.limit) + " reached";
        if (m.finesOwed > kMaxFines) return "unpaid fines of " + to_string(m.finesOwed);
        for (auto& [id, c] : copies) {
            bool mine = c.status == CopyStatus::OnHold && c.heldFor == memberId;
            if (c.isbn != isbn || !(c.status == CopyStatus::Available || mine)) continue;
            c.status = CopyStatus::OnLoan;
            ++m.loans;
            loans[id] = {id, memberId, today + kLoanDays};
            return "copy " + to_string(id) + ", due day " + to_string(today + kLoanDays);
        }
        return "no copy available";
    }
    string reserve(int memberId, const string& isbn) {
        auto& q = waiting[isbn];
        q.push_back(memberId);
        return "position " + to_string(q.size()) + " for " + books.at(isbn).title;
    }
    string giveBack(int copyId, int today) {
        Loan loan = loans.at(copyId);
        loans.erase(copyId);
        Member& m = members.at(loan.memberId);
        --m.loans;
        int fine = fines.fine(max(0, today - loan.dueDay));
        m.finesOwed += fine;
        Copy& c = copies.at(copyId);
        c.status = CopyStatus::Available;
        if (auto& q = waiting[c.isbn]; !q.empty()) {   // first in line gets a hold
            c.status = CopyStatus::OnHold;
            c.heldFor = q.front();
            q.pop_front();
            notifier.holdReady(members.at(c.heldFor), books.at(c.isbn), today + kHoldDays);
        }
        return "returned, fine " + to_string(fine);
    }
    void payFines(int memberId) { members.at(memberId).finesOwed = 0; }
};

int main() {
    PerDay perDay;
    PrintNotifier notifier;
    Library lib(perDay, notifier);
    lib.addBook({"isbn-1", "Dune", "Frank Herbert"}, 1);
    lib.addBook({"isbn-2", "Dune Messiah", "Frank Herbert"}, 1);
    lib.addBook({"isbn-3", "The Left Hand of Darkness", "Ursula K. Le Guin"}, 2);
    lib.join({1, "asha", 2});
    lib.join({2, "ravi", 1});
    lib.join({3, "meera", 2});
    auto say = [](const string& what, const string& result) {
        cout << what << ": " << result << "\n";
    };
    auto list = [](vector<string> v) {
        string s;
        for (auto& t : v) s += (s.empty() ? "" : ", ") + t;
        return s.empty() ? string("nothing") : s;
    };
    say("search 'dune'", list(lib.search("dune")));
    say("search 'herbert messiah'", list(lib.search("herbert messiah")));
    say("search 'darkness guin'", list(lib.search("Darkness Guin")));
    say("day 0, asha borrows Dune", lib.borrow(1, "isbn-1", 0));
    say("day 1, ravi borrows Dune", lib.borrow(2, "isbn-1", 1));
    say("ravi reserves", lib.reserve(2, "isbn-1"));
    say("meera reserves", lib.reserve(3, "isbn-1"));
    say("day 20, asha returns copy 1", lib.giveBack(1, 20));
    say("day 21, meera borrows Dune", lib.borrow(3, "isbn-1", 21));
    say("day 21, ravi borrows Dune", lib.borrow(2, "isbn-1", 21));
    say("day 21, ravi borrows Messiah", lib.borrow(2, "isbn-2", 21));
    say("day 21, asha borrows Messiah", lib.borrow(1, "isbn-2", 21));
    lib.payFines(1);
    say("asha pays, tries again", lib.borrow(1, "isbn-2", 21));
}
```

Output:

```text
search 'dune': Dune, Dune Messiah
search 'herbert messiah': Dune Messiah
search 'darkness guin': The Left Hand of Darkness
day 0, asha borrows Dune: copy 1, due day 14
day 1, ravi borrows Dune: no copy available
ravi reserves: position 1 for Dune
meera reserves: position 2 for Dune
  notify ravi: Dune is held for you until day 23
day 20, asha returns copy 1: returned, fine 60
day 21, meera borrows Dune: no copy available
day 21, ravi borrows Dune: copy 1, due day 35
day 21, ravi borrows Messiah: limit of 1 reached
day 21, asha borrows Messiah: unpaid fines of 60
asha pays, tries again: copy 2, due day 35
```

Asha's copy was due on day 14, so returning it on day 20 costs 6 × 10 = 60. Because Ravi and Meera were waiting, the copy goes on hold for Ravi (first in line), who is notified (the notice prints during the return, before its result); Meera cannot take it even though it is on the shelf. Ravi's limit is 1, so a second loan is refused, and Asha is blocked until the 60 in fines, above the threshold of 50, is paid.

#### Design notes

- **Holds expire**: a daily job (or a check on each borrow) finds holds older than 3 days, frees the copy and offers it to the next member in the queue, with another notification.
- **Member types**: students and staff differ in limit, loan length and fine rule; give `Member` a `MemberType` that supplies those values, or pass a `FinePolicy` per type.
- **Why an inverted index**: scanning every title is fine for a thousand books; for a big catalog, looking up each word's set of ISBNs and intersecting them is proportional to the matches, not the catalog.
- **Concurrency**: two members borrowing the last copy at once is the same check-then-act problem as [seat booking](#/concept/lld.method.handling-concurrency-in-lld); guard `borrow`, `giveBack` and `reserve` with a lock.

#### Interview checklist

- **A book (title) versus its physical copies**: `Book` by ISBN and `Copy` with its own status.
- **Member, loan and reservation entities**: `Member`, `Loan` by copy, and a queue of member ids per ISBN.
- **Borrowing rules and limits**: limit, fine threshold and hold ownership, all checked in `borrow` before any change.
- **Fine calculation as a replaceable rule**: `FinePolicy` with `PerDay`; capped or grace-period rules are more classes.
- **Searching the catalog and notifying members when a reserved copy returns**: the word index in `search`, and `Notifier::holdReady` called from `giveBack`.

Connects to: [observer](#/concept/oop.patterns-behavioral.observer), [strategy](#/concept/oop.patterns-behavioral.strategy), [search systems](#/concept/sysd.data.search-systems).

### questions
Q: Why model a book and its copies as separate classes?
A: Members search and reserve titles, but they borrow and return physical copies, each of which is on the shelf, on loan or on hold. Keeping only one class makes it impossible to say that one copy of a title is out while another is available.

Q: What should happen when a reserved book is returned?
A: The returned copy goes on hold for the first member in that title's reservation queue, who is notified with a pickup deadline. Other members cannot borrow it meanwhile, and if the hold expires the copy passes to the next member in line.

Q: How would you make fine calculation easy to change?
A: Put it behind a fine policy interface that takes the days late and returns an amount, with implementations such as per day, capped, or with a grace period, possibly chosen by member type. Inject the clock too, so the rules can be tested for any date.

Q: Which rules should be checked before a member borrows a copy?
A: That the member is under their borrowing limit, owes less than the allowed fine threshold, and that a copy is available or on hold for that member. All checks happen before any state changes, so a refusal leaves everything as it was.

Q: How would you search a large catalog by title and author?
A: Build an inverted index from each lowercase word in titles and authors to the set of matching ISBNs, and answer a multi-word query by intersecting the sets. The cost then depends on the number of matches rather than the size of the catalog.

## lld.classics.hotel-booking
name: "Hotel booking"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "rooms, availability, reservations"

### simple
A hotel booking system lets guests find rooms free for their dates, reserve one, pay, and cancel if plans change. It is like the paper calendar at a small hotel's front desk, one row per room: a booking blocks a stretch of days, and nobody may write over a stretch that is already taken. The design has to answer "what is free?" quickly and never give one room to two guests for the same night.

### interview
- Entities: `Hotel`, `Room` (number and `RoomType`), `Reservation` (guest, room, check-in and check-out days, amount, status), and a payment status on the reservation or a separate `Payment`.
- **Dates as half-open ranges** [check-in, check-out): a guest leaving on the 5th and another arriving on the 5th don't clash.
- **Availability**: two ranges overlap when `a.in < b.out && b.in < a.out`. Keep each room's bookings in an ordered map by check-in day, so one lookup around the requested range answers "is it free?" in O(log n).
- **No double booking**: search and insert must be one atomic step: a lock per room type or per hotel in memory, or a database constraint or conditional insert.
- **Pricing** as a strategy (per night, by room type and season), and a **cancellation policy** as another (free until two days before, then the first night is charged).
- **States**: pending → confirmed (paid) → checked in → checked out, or cancelled; payment unpaid → paid → partly or fully refunded.

### deep
#### Classes

```text
Hotel "1" *-- "*" Room                    Room: number, RoomType
Hotel "1" *-- "*" Reservation             guest, room, [in, out), amount, Status, PaymentStatus
Room *-- booked: map<in, out>             ordered by check-in day
Hotel --> Pricing <<interface>>           SeasonalPricing ..|> Pricing
Hotel --> CancellationPolicy <<interface>>  FreeUntilTwoDays ..|> CancellationPolicy
```

#### Code

```cpp
enum class RoomType { Single, Double, Suite };
enum class Status { Pending, Confirmed, CheckedIn, CheckedOut, Cancelled };
enum class Paid { No, Yes, Refunded };
struct Room { int number; RoomType type; map<int, int> booked; };   // in -> out, [in, out)
struct Reservation { int id; string guest; int room, in, out, amount; Status status; Paid paid; };

struct Pricing {
    virtual ~Pricing() = default;
    virtual int nightly(RoomType t, int day) const = 0;
};
struct SeasonalPricing : Pricing {               // days 100 to 199 are high season: +50%
    int nightly(RoomType t, int day) const override {
        const int base[] = {2000, 3000, 8000};
        return day >= 100 && day < 200 ? base[int(t)] * 3 / 2 : base[int(t)];
    }
};
struct CancellationPolicy {
    virtual ~CancellationPolicy() = default;
    virtual int penalty(const Reservation& r, int today, int firstNight) const = 0;
};
struct FreeUntilTwoDays : CancellationPolicy {
    int penalty(const Reservation& r, int today, int firstNight) const override {
        return r.in - today >= 2 ? 0 : firstNight;
    }
};

class Hotel {
    vector<Room> rooms;
    map<int, Reservation> reservations;
    const Pricing& pricing;
    const CancellationPolicy& cancellation;
    mutex m;
    int nextId = 1;
    static bool isFree(const Room& r, int in, int out) {
        auto it = r.booked.lower_bound(out);     // first booking starting at or after out
        return it == r.booked.begin() || prev(it)->second <= in;   // the one before must end by in
    }
public:
    Hotel(vector<Room> r, const Pricing& p, const CancellationPolicy& c)
        : rooms(std::move(r)), pricing(p), cancellation(c) {}
    vector<int> search(RoomType t, int in, int out) {
        lock_guard lock(m);
        vector<int> free;
        for (auto& r : rooms)
            if (r.type == t && isFree(r, in, out)) free.push_back(r.number);
        return free;
    }
    optional<int> book(const string& guest, RoomType t, int in, int out) {
        if (in >= out) throw invalid_argument("check-out must be after check-in");
        lock_guard lock(m);                      // search and insert as one step
        for (auto& r : rooms) {
            if (r.type != t || !isFree(r, in, out)) continue;
            r.booked[in] = out;
            int amount = 0;
            for (int d = in; d < out; ++d) amount += pricing.nightly(t, d);
            int id = nextId++;
            reservations[id] = {id, guest, r.number, in, out, amount, Status::Pending, Paid::No};
            return id;
        }
        return nullopt;
    }
    void pay(int id) {
        lock_guard lock(m);
        Reservation& r = reservations.at(id);
        if (r.status != Status::Pending)
            throw logic_error("only a pending reservation can be paid");
        r.status = Status::Confirmed;
        r.paid = Paid::Yes;
    }
    int cancel(int id, int today) {              // returns the refund
        lock_guard lock(m);
        Reservation& r = reservations.at(id);
        if (r.status != Status::Pending && r.status != Status::Confirmed)
            throw logic_error("too late to cancel");
        for (auto& room : rooms)
            if (room.number == r.room) room.booked.erase(r.in);
        int refund = 0;
        if (r.paid == Paid::Yes) {
            int firstNight = pricing.nightly(roomType(r.room), r.in);
            refund = r.amount - cancellation.penalty(r, today, firstNight);
            r.paid = Paid::Refunded;
        }
        r.status = Status::Cancelled;
        return refund;
    }
    RoomType roomType(int number) const {
        for (auto& r : rooms) if (r.number == number) return r.type;
        throw out_of_range("no such room");
    }
    const Reservation& get(int id) { lock_guard lock(m); return reservations.at(id); }
};

int main() {
    SeasonalPricing pricing;
    FreeUntilTwoDays policy;
    Hotel hotel({{101, RoomType::Double}, {102, RoomType::Double}, {501, RoomType::Suite}},
                pricing, policy);
    auto list = [](const vector<int>& v) {
        string s;
        for (int n : v) s += " " + to_string(n);
        return s.empty() ? string(" none") : s;
    };
    auto a = hotel.book("asha", RoomType::Double, 98, 102);    // 2 low + 2 high nights
    cout << "asha: room " << hotel.get(*a).room << ", Rs " << hotel.get(*a).amount << "\n";
    auto b = hotel.book("ravi", RoomType::Double, 100, 103);
    cout << "ravi: room " << hotel.get(*b).room << ", Rs " << hotel.get(*b).amount << "\n";
    auto freeDoubles = [&](int in, int out) {
        cout << "doubles free for days " << in << "-" << out << ":"
             << list(hotel.search(RoomType::Double, in, out)) << "\n";
    };
    freeDoubles(101, 102);
    freeDoubles(102, 104);
    hotel.pay(*a);
    hotel.pay(*b);
    cout << "asha cancels 5 days ahead, refund " << hotel.cancel(*a, 93) << "\n";
    cout << "ravi cancels 1 day ahead, refund " << hotel.cancel(*b, 99) << "\n";
    freeDoubles(98, 103);

    atomic<int> winners = 0;
    latch go(10);
    {
        vector<jthread> guests;                  // ten guests want the suite for days 150-152
        for (int g = 0; g < 10; ++g)
            guests.emplace_back([&, g] {
                go.arrive_and_wait();
                if (hotel.book("guest" + to_string(g), RoomType::Suite, 150, 152)) ++winners;
            });
    }
    cout << "10 guests race for one suite: " << winners << " booked\n";
}
```

Output:

```text
asha: room 101, Rs 15000
ravi: room 102, Rs 13500
doubles free for days 101-102: none
doubles free for days 102-104: 101
asha cancels 5 days ahead, refund 15000
ravi cancels 1 day ahead, refund 9000
doubles free for days 98-103: 101 102
10 guests race for one suite: 1 booked
```

Asha's four nights cost 3000 + 3000 + 4500 + 4500, since days 100 and 101 are high season. Ravi's stay overlaps Asha's, so Ravi gets the other double. For days 102 to 104, room 101 is free again: Asha leaves on day 102 and the ranges are half-open. Cancelling five days ahead refunds everything; one day ahead, the first night (4500) is kept. The ten-guest race ran repeatedly under ThreadSanitizer with exactly one booking each time.

#### The overlap check

Bookings of a room never overlap, so in a map ordered by check-in day, only one booking can clash with a request [in, out): the last one starting before `out`. `lower_bound(out)` finds the first booking starting at or after `out`; the one just before it is free of conflict only if it ends by `in`. That is O(log n) per room instead of scanning every booking, the same idea as [calendar booking designs](#/concept/dsa.intervals.calendar-booking-designs).

#### At larger scale

With a database, keep a row per room and night (or a range type with an exclusion constraint in PostgreSQL), and let a unique constraint or a conditional insert reject the second booking; the in-memory lock becomes the database's guarantee. For a chain, search per hotel and room type first, then pick a room, and hold it briefly while the guest pays, as in [movie ticket booking](#/concept/lld.classics.movie-ticket-booking).

#### Interview checklist

- **Hotel, room, room type and reservation modeling**: `Hotel` owns `Room`s and `Reservation`s; `RoomType` drives price and search.
- **Availability search over date ranges (interval overlap)**: half-open ranges and `isFree` with `lower_bound`.
- **Preventing double booking under concurrent requests**: `book` checks and inserts under one lock; ten racing guests produce one booking.
- **Pricing by season and room type, and the cancellation policy**: `SeasonalPricing` and `FreeUntilTwoDays` strategies.
- **Reservation and payment states**: `Status` (pending, confirmed, checked in, checked out, cancelled) and `Paid` (no, yes, refunded), with checks on each transition.

Connects to: [calendar booking designs](#/concept/dsa.intervals.calendar-booking-designs), [strategy](#/concept/oop.patterns-behavioral.strategy), [meeting room scheduler](#/concept/lld.classics.meeting-room-scheduler).

### questions
Q: How do you check whether a room is free for a date range?
A: Treat stays as half-open ranges from check-in to check-out; two stays overlap when each starts before the other ends. Keep each room's bookings in a map ordered by check-in day, and only the booking just before the requested check-out can clash, so the check is O(log n).

Q: Why use half-open date ranges?
A: A guest checking out on a day and another checking in the same day don't conflict, and half-open ranges express that naturally: a stay from day 98 to 102 and one from 102 to 104 don't overlap. It also makes the number of nights simply out minus in.

Q: How do you prevent two guests from booking the same room for overlapping nights?
A: Make the availability check and the insertion of the booking one atomic step, with a lock in memory or with a database constraint or conditional insert. Checking first and inserting later lets two requests both see the room free.

Q: How would you model seasonal pricing and cancellation rules?
A: As two strategies: a pricing policy that returns the price of a room type for a given night, summed over the stay, and a cancellation policy that returns the penalty given the reservation and the cancellation day. New seasons or rules become new implementations.

Q: What states does a reservation go through?
A: Pending until paid, then confirmed, checked in and checked out, or cancelled from pending or confirmed. Payment has its own states, unpaid, paid and refunded, and each transition checks the current state first.

## lld.classics.ride-sharing
name: "Ride sharing"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "riders, drivers, matching, trip states"

### simple
A ride-sharing app connects a rider who needs a trip with a nearby driver, then follows the trip from pickup to payment. It is like a taxi stand dispatcher who knows where every free car is: a request comes in, the dispatcher picks the best car, and that car is no longer free until the trip ends. The design must never send one driver to two riders at once.

### interview
- Entities: `Rider`, `Driver` (location, availability), `Vehicle` (type such as mini or sedan), and `Trip` (rider, driver, pickup, drop, state, fare).
- **Trip state machine**: requested → accepted → in progress → completed, with cancellation allowed from requested or accepted; every other transition is refused.
- **Matching as a strategy**: nearest available driver of the right vehicle type within a radius by default; alternatives weigh rating, heading, or batch-assign many requests at once.
- **Fare as a strategy**: base fare plus per kilometre plus per minute, times a surge multiplier set by demand; a flat airport fare is another class.
- **One driver, one trip**: choosing a driver and marking them unavailable happen in one critical section (or one conditional update), so two concurrent requests can't get the same driver.
- At scale, finding nearby drivers uses a spatial index (a grid or geohash cells) instead of scanning every driver.

### deep
#### Classes

```text
RideService "1" *-- "*" Driver       Driver *-- Vehicle; location, available
RideService "1" *-- "*" Trip         Trip --> Rider, Trip --> Driver; TripState
RideService --> Matcher <<interface>>       NearestAvailable ..|> Matcher
RideService --> FarePolicy <<interface>>    StandardFare ..|> FarePolicy
```

#### Code

```cpp
struct Point { double x, y; };                   // kilometres on a city grid
double km(Point a, Point b) { return hypot(a.x - b.x, a.y - b.y); }
enum class VehicleType { Mini, Sedan };
struct Vehicle { string plate; VehicleType type; };
struct Driver { int id; string name; Vehicle vehicle; Point at; bool available = true; };
struct Rider { int id; string name; };

enum class TripState { Requested, Accepted, InProgress, Completed, Cancelled };
const char* stateName(TripState s) {
    static const char* n[] = {"requested", "accepted", "in progress", "completed", "cancelled"};
    return n[int(s)];
}
struct Trip {
    int id, riderId, driverId;
    Point from, to;
    double surge;
    TripState state = TripState::Requested;
    int fare = 0;
    bool moveTo(TripState next) {                // the only allowed transitions
        static const map<TripState, set<TripState>> allowed = {
            {TripState::Requested, {TripState::Accepted, TripState::Cancelled}},
            {TripState::Accepted, {TripState::InProgress, TripState::Cancelled}},
            {TripState::InProgress, {TripState::Completed}},
        };
        auto it = allowed.find(state);
        if (it == allowed.end() || !it->second.count(next)) return false;
        state = next;
        return true;
    }
};

struct Matcher {
    virtual ~Matcher() = default;
    virtual Driver* match(vector<Driver>& drivers, Point pickup, VehicleType t) = 0;
};
struct NearestAvailable : Matcher {              // within 5 km, right vehicle type
    Driver* match(vector<Driver>& drivers, Point pickup, VehicleType t) override {
        Driver* best = nullptr;
        for (auto& d : drivers)
            if (d.available && d.vehicle.type == t && km(d.at, pickup) <= 5 &&
                (!best || km(d.at, pickup) < km(best->at, pickup)))
                best = &d;
        return best;
    }
};
struct FarePolicy {
    virtual ~FarePolicy() = default;
    virtual int fare(double distance, int minutes, double surge) const = 0;
};
struct StandardFare : FarePolicy {               // 50 base + 12 per km + 2 per minute
    int fare(double distance, int minutes, double surge) const override {
        return int(lround((50 + 12 * distance + 2 * minutes) * surge));
    }
};

class RideService {
    vector<Driver> drivers;
    map<int, Trip> trips;
    unique_ptr<Matcher> matcher;
    unique_ptr<FarePolicy> fares;
    mutex m;
    int nextId = 1;
    Driver& driver(int id) {
        for (auto& d : drivers) if (d.id == id) return d;
        throw out_of_range("no such driver");
    }
public:
    double surge = 1.0;                          // set by a demand monitor
    RideService(vector<Driver> d, unique_ptr<Matcher> mt, unique_ptr<FarePolicy> f)
        : drivers(std::move(d)), matcher(std::move(mt)), fares(std::move(f)) {}
    optional<int> request(int riderId, Point from, Point to, VehicleType t) {
        lock_guard lock(m);                      // match and reserve in one step
        Driver* d = matcher->match(drivers, from, t);
        if (!d) return nullopt;
        d->available = false;
        int id = nextId++;
        trips.emplace(id, Trip{id, riderId, d->id, from, to, surge});
        return id;
    }
    string advance(int tripId, TripState next, int minutes = 0) {
        lock_guard lock(m);
        Trip& t = trips.at(tripId);
        TripState before = t.state;
        if (!t.moveTo(next))
            return string("refused: ") + stateName(before) + " -> " + stateName(next);
        Driver& d = driver(t.driverId);
        if (next == TripState::Cancelled) d.available = true;
        if (next == TripState::Completed) {
            t.fare = fares->fare(km(t.from, t.to), minutes, t.surge);
            d.at = t.to;                         // the driver is free where the trip ended
            d.available = true;
        }
        return string(stateName(next)) + (t.fare ? ", fare " + to_string(t.fare) : "");
    }
    string driverName(int tripId) {
        lock_guard lock(m);
        return driver(trips.at(tripId).driverId).name;
    }
};

int main() {
    RideService app({{1, "dev", {"KA01", VehicleType::Mini}, {0, 0}},
                     {2, "lina", {"KA02", VehicleType::Sedan}, {1, 1}},
                     {3, "omar", {"KA03", VehicleType::Mini}, {3, 4}}},
                    make_unique<NearestAvailable>(), make_unique<StandardFare>());
    auto t1 = app.request(101, {1, 0}, {6, 0}, VehicleType::Mini);
    cout << "asha's trip " << *t1 << " -> " << app.driverName(*t1) << "\n";
    cout << "accept: " << app.advance(*t1, TripState::Accepted) << "\n";
    cout << "start: " << app.advance(*t1, TripState::InProgress) << "\n";
    auto t2 = app.request(102, {0, 0}, {2, 2}, VehicleType::Mini);
    cout << "ravi's trip " << *t2 << " -> " << app.driverName(*t2) << "\n";
    cout << "ravi cancels: " << app.advance(*t2, TripState::Cancelled) << "\n";
    cout << "start the cancelled trip: " << app.advance(*t2, TripState::InProgress) << "\n";
    cout << "asha arrives after 14 min: " << app.advance(*t1, TripState::Completed, 14) << "\n";
    app.surge = 1.5;
    auto t3 = app.request(103, {1, 2}, {7, 10}, VehicleType::Sedan);
    app.advance(*t3, TripState::Accepted);
    app.advance(*t3, TripState::InProgress);
    cout << "meera, sedan at 1.5x surge: " << app.advance(*t3, TripState::Completed, 20) << "\n";

    RideService rush({{1, "dev", {"KA01", VehicleType::Mini}, {0, 0}},
                      {2, "omar", {"KA03", VehicleType::Mini}, {1, 0}}},
                     make_unique<NearestAvailable>(), make_unique<StandardFare>());
    mutex seenLock;
    multiset<string> assigned;
    latch go(8);
    {
        vector<jthread> riders;                  // eight riders, two drivers, same instant
        for (int r = 0; r < 8; ++r)
            riders.emplace_back([&, r] {
                go.arrive_and_wait();
                if (auto t = rush.request(200 + r, {0, 0}, {1, 1}, VehicleType::Mini)) {
                    lock_guard lock(seenLock);
                    assigned.insert(rush.driverName(*t));
                }
            });
    }
    cout << "8 riders, 2 drivers: " << assigned.size() << " matched, dev " << assigned.count("dev")
         << ", omar " << assigned.count("omar") << "\n";
}
```

Output:

```text
asha's trip 1 -> dev
accept: accepted
start: in progress
ravi's trip 2 -> omar
ravi cancels: cancelled
start the cancelled trip: refused: cancelled -> in progress
asha arrives after 14 min: completed, fare 138
meera, sedan at 1.5x surge: completed, fare 315
8 riders, 2 drivers: 2 matched, dev 1, omar 1
```

Dev is 1 km from Asha's pickup and Omar about 4.5 km, so Dev gets the trip. While Dev drives, Ravi's request goes to Omar (exactly 5 km away, the edge of the radius), and cancelling frees Omar again. A cancelled trip cannot start. Asha's fare is 50 + 12 × 5 + 2 × 14 = 138; Meera's 10 km sedan ride at 1.5× surge is (50 + 120 + 40) × 1.5 = 315. In the rush, each driver is assigned exactly once. That run was repeated under ThreadSanitizer with no reports.

#### Finding nearby drivers at scale

Scanning every driver is fine for a demo but not for a city with 50,000 of them. Bucket drivers into grid cells (or geohash cells) keyed by location, update the cell when a driver reports a new position, and search the pickup's cell and its neighbours, widening the ring until enough candidates are found. The matcher interface stays the same; only its implementation changes, which is the point of the [strategy](#/concept/oop.patterns-behavioral.strategy). See [geospatial indexing](#/concept/sysd.building-blocks.geospatial-indexing).

#### Interview checklist

- **Rider, driver, vehicle and trip entities**: `Rider`, `Driver` with a `Vehicle`, `Trip` with ids, points, surge, state and fare.
- **Trip state machine: requested, accepted, in progress, completed, cancelled**: `Trip::moveTo` with an allowed-transitions table; refused transitions change nothing.
- **Driver matching as a strategy**: `Matcher` with `NearestAvailable`.
- **Fare calculation as a strategy (base fare, distance, time, surge)**: `FarePolicy` with `StandardFare`; surge is captured when the trip is requested.
- **Making sure one driver is never assigned to two trips**: matching and marking unavailable happen under one lock; the rush test assigns each driver once.

Connects to: [state](#/concept/oop.patterns-behavioral.state), [handling concurrency in LLD](#/concept/lld.method.handling-concurrency-in-lld), [ride-hailing at scale](#/concept/sysd.classics.ride-hailing).

### questions
Q: What states does a trip go through and how do you enforce them?
A: Requested, accepted, in progress and completed, with cancellation allowed from requested or accepted. A table of allowed transitions is checked on every change, so starting a cancelled trip or completing one that never started is refused.

Q: How do you make driver matching easy to change?
A: Put it behind a matcher interface that takes the available drivers, the pickup point and the vehicle type and returns a driver. Nearest driver, best rated within a radius, or batched assignment across many requests become separate implementations.

Q: How would you design fare calculation?
A: As a fare policy strategy that combines a base fare, a rate per kilometre and a rate per minute, multiplied by a surge factor captured when the trip is requested. Flat airport fares or subscriptions become new policies.

Q: How do you stop one driver from being assigned to two riders?
A: Choosing a driver and marking them unavailable must be one atomic step, under a lock in memory or as a conditional update in a database that only succeeds if the driver is still available. Otherwise two requests can pick the same nearest driver at the same moment.

Q: How do you find nearby drivers quickly in a big city?
A: Index drivers by location cell, such as a grid or geohash, update the cell as they move, and search the pickup's cell and its neighbours in widening rings. This avoids scanning every driver for each request.

## lld.classics.food-delivery
name: "Food delivery"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "restaurants, orders, delivery assignment"

### simple
A food delivery app lets a customer fill a cart from one restaurant, pay, and follow the order until a delivery partner hands it over. Three parties care about each order: the customer, the restaurant and the rider, and each wants to hear about different steps. The design is mostly an order that moves through clear states, with the right people told at each step.

### interview
- Entities: `Restaurant` with a `Menu` of items (price, availability), a `Cart` tied to **one restaurant**, an `Order` (lines, amount, state, partner), and `DeliveryPartner` (location, free or busy).
- **Order state machine**: placed → accepted or **rejected** → preparing → ready → picked up → delivered; the customer may **cancel** until pickup, with a refund that depends on how far the kitchen got.
- **Partner assignment as a strategy**: nearest free partner to the restaurant when it accepts (or when food is nearly ready); reserving the partner is atomic so one partner never gets two orders at once.
- **Payments**: charge when the order is placed through a gateway interface; refund in full on rejection or early cancellation, partly once cooking has started, not at all after pickup.
- **Notifications with observer**: the order service publishes events; the customer app, restaurant app and partner app subscribe and react to the ones they care about.
- Validate at the edges: items exist and are available, the cart is non-empty and single-restaurant, transitions are legal.

### deep
#### Classes

```text
Restaurant "1" *-- "*" MenuItem
Cart --> Restaurant                            one restaurant per cart
OrderService "1" *-- "*" Order                 Order: lines, amount, State, partner, refunded
OrderService "1" *-- "*" Partner
OrderService --> PartnerPicker <<interface>>   NearestFree ..|> PartnerPicker
OrderService --> PaymentGateway <<interface>>
OrderService o-- "*" OrderListener <<interface>>   CustomerApp, RestaurantApp, PartnerApp
```

#### Code

```cpp
struct Point { double x, y; };
struct MenuItem { string name; int price; bool available = true; };
struct Restaurant { string name; Point at; map<string, MenuItem> menu; };

class Cart {
    const Restaurant* restaurant = nullptr;
    map<string, int> qty;                        // item id -> quantity
public:
    string add(const Restaurant& r, const string& item, int n = 1) {
        if (restaurant && restaurant != &r) return "cart has items from " + restaurant->name;
        auto it = r.menu.find(item);
        if (it == r.menu.end() || !it->second.available) return item + " is not available";
        restaurant = &r;
        qty[item] += n;
        return "added " + to_string(n) + " " + it->second.name;
    }
    const Restaurant* from() const { return restaurant; }
    const map<string, int>& items() const { return qty; }
    int total() const {
        int t = 0;
        for (auto& [id, n] : qty) t += restaurant->menu.at(id).price * n;
        return t;
    }
};

enum class State { Placed, Accepted, Rejected, Preparing, Ready, PickedUp, Delivered, Cancelled };
const char* stateName(State s) {
    static const char* n[] = {"placed", "accepted", "rejected", "preparing", "ready",
                              "picked up", "delivered", "cancelled"};
    return n[int(s)];
}
struct Order {
    int id;
    string customer;
    const Restaurant* restaurant;
    int amount, refunded = 0, partner = -1;
    State state = State::Placed;
};

struct Partner { int id; string name; Point at; bool free = true; };
struct PartnerPicker {
    virtual ~PartnerPicker() = default;
    virtual Partner* pick(vector<Partner>& partners, Point restaurant) = 0;
};
struct NearestFree : PartnerPicker {
    Partner* pick(vector<Partner>& ps, Point r) override {
        Partner* best = nullptr;
        auto d = [&](const Partner& p) { return hypot(p.at.x - r.x, p.at.y - r.y); };
        for (auto& p : ps)
            if (p.free && (!best || d(p) < d(*best))) best = &p;
        return best;
    }
};
struct PaymentGateway {
    virtual ~PaymentGateway() = default;
    virtual bool charge(int orderId, int amount) = 0;
    virtual void refund(int orderId, int amount) = 0;
};
struct FakeGateway : PaymentGateway {
    bool charge(int, int) override { return true; }
    void refund(int id, int amount) override {
        cout << "  gateway: refund " << amount << " for order " << id << "\n";
    }
};
struct OrderListener {                           // observer
    virtual ~OrderListener() = default;
    virtual void onChange(const Order& o, const string& partnerName) = 0;
};
struct CustomerApp : OrderListener {             // hears every change
    void onChange(const Order& o, const string&) override {
        cout << "  [customer] order " << o.id << " " << stateName(o.state) << "\n";
    }
};
struct RestaurantApp : OrderListener {           // new orders and cancellations only
    void onChange(const Order& o, const string&) override {
        if (o.state == State::Placed || o.state == State::Cancelled)
            cout << "  [restaurant] order " << o.id << " " << stateName(o.state) << "\n";
    }
};
struct PartnerApp : OrderListener {              // assignment and pickup readiness
    void onChange(const Order& o, const string& partner) override {
        if (o.state == State::Accepted)
            cout << "  [partner " << partner << "] assigned order " << o.id << "\n";
        if (o.state == State::Ready)
            cout << "  [partner " << partner << "] order " << o.id << " is ready\n";
    }
};

class OrderService {
    map<int, Order> orders;
    vector<Partner> partners;
    unique_ptr<PartnerPicker> picker;
    PaymentGateway& gateway;
    vector<OrderListener*> listeners;
    mutex m;
    int nextId = 1;
    void publish(const Order& o) {
        string name = o.partner < 0 ? "" : partners[o.partner].name;
        for (auto* l : listeners) l->onChange(o, name);
    }
    bool allowed(State from, State to) const {
        static const map<State, set<State>> next = {
            {State::Placed, {State::Accepted, State::Rejected, State::Cancelled}},
            {State::Accepted, {State::Preparing, State::Cancelled}},
            {State::Preparing, {State::Ready, State::Cancelled}},
            {State::Ready, {State::PickedUp}},
            {State::PickedUp, {State::Delivered}},
        };
        auto it = next.find(from);
        return it != next.end() && it->second.count(to);
    }
public:
    OrderService(vector<Partner> p, unique_ptr<PartnerPicker> pk, PaymentGateway& g)
        : partners(std::move(p)), picker(std::move(pk)), gateway(g) {}
    void subscribe(OrderListener& l) { listeners.push_back(&l); }
    optional<int> place(const string& customer, const Cart& cart) {
        if (cart.items().empty()) return nullopt;
        lock_guard lock(m);
        int id = nextId++;
        if (!gateway.charge(id, cart.total())) return nullopt;
        Order& o = orders[id] = {id, customer, cart.from(), cart.total()};
        publish(o);
        return id;
    }
    string move(int id, State to) {
        lock_guard lock(m);
        Order& o = orders.at(id);
        if (!allowed(o.state, to))
            return string("refused: ") + stateName(o.state) + " -> " + stateName(to);
        if (to == State::Accepted) {             // reserve a partner as the kitchen accepts
            Partner* p = picker->pick(partners, o.restaurant->at);
            if (!p) return "no partner free, try again shortly";
            p->free = false;
            o.partner = p->id;
        }
        int refund = 0;                          // the refund rules
        if (to == State::Rejected) refund = o.amount;
        if (to == State::Cancelled) refund = o.state == State::Preparing ? o.amount / 2 : o.amount;
        if ((to == State::Delivered || to == State::Cancelled) && o.partner >= 0)
            partners[o.partner].free = true;
        o.state = to;
        if (refund) {
            gateway.refund(id, refund);
            o.refunded = refund;
        }
        publish(o);
        return "ok";
    }
};

int main() {
    Restaurant dosa{"Dosa Corner", {0, 0},
                    {{"d1", {"masala dosa", 120}}, {"c1", {"filter coffee", 40}}}};
    Restaurant pizza{"Pizza Place", {5, 5}, {{"p1", {"margherita", 300}}}};
    FakeGateway gateway;
    OrderService service({{0, "kiran", {1, 1}}, {1, "noor", {6, 5}}},
                         make_unique<NearestFree>(), gateway);
    CustomerApp customer;
    RestaurantApp kitchen;
    PartnerApp rider;
    for (OrderListener* l : initializer_list<OrderListener*>{&customer, &kitchen, &rider})
        service.subscribe(*l);

    Cart cart;
    cout << cart.add(dosa, "d1", 2) << "\n";
    cout << cart.add(dosa, "c1") << "\n";
    cout << cart.add(pizza, "p1") << "\n";
    cout << "asha places order, total " << cart.total() << "\n";
    int a = *service.place("asha", cart);
    for (State s : {State::Accepted, State::Preparing, State::Ready, State::PickedUp,
                    State::Delivered})
        service.move(a, s);

    Cart pizzaCart;
    pizzaCart.add(pizza, "p1");
    cout << "ravi orders a pizza\n";
    int r = *service.place("ravi", pizzaCart);
    service.move(r, State::Rejected);

    Cart late;
    late.add(dosa, "d1");
    cout << "meera orders, then cancels while it is cooking\n";
    int m = *service.place("meera", late);
    service.move(m, State::Accepted);
    service.move(m, State::Preparing);
    service.move(m, State::Cancelled);
    cout << "deliver a cancelled order: " << service.move(m, State::Delivered) << "\n";
}
```

Output:

```text
added 2 masala dosa
added 1 filter coffee
cart has items from Dosa Corner
asha places order, total 280
  [customer] order 1 placed
  [restaurant] order 1 placed
  [customer] order 1 accepted
  [partner kiran] assigned order 1
  [customer] order 1 preparing
  [customer] order 1 ready
  [partner kiran] order 1 is ready
  [customer] order 1 picked up
  [customer] order 1 delivered
ravi orders a pizza
  [customer] order 2 placed
  [restaurant] order 2 placed
  gateway: refund 300 for order 2
  [customer] order 2 rejected
meera orders, then cancels while it is cooking
  [customer] order 3 placed
  [restaurant] order 3 placed
  [customer] order 3 accepted
  [partner kiran] assigned order 3
  [customer] order 3 preparing
  gateway: refund 60 for order 3
  [customer] order 3 cancelled
  [restaurant] order 3 cancelled
deliver a cancelled order: refused: cancelled -> delivered
```

The pizza cannot join a cart that already holds dosas. Kiran (1.4 km from Dosa Corner) gets the first order; when the pizza order is rejected, no partner is involved and the customer is refunded in full. Meera's order was being cooked when it was cancelled, so half is refunded and Kiran is freed. Each app printed only what it subscribes to: the restaurant hears about new and cancelled orders, the partner about assignments and ready food.

#### Decisions worth explaining

- **When to assign a partner**: at acceptance (as here) keeps waiting time low but ties up a partner during cooking; assigning when food is nearly ready uses partners better. Either choice lives in one place, the transition to that state.
- **Refund rules** are a policy that could become a [strategy](#/concept/oop.patterns-behavioral.strategy) (restaurants may set their own); keeping them next to the transitions makes the money flow auditable.
- **Publishing under the lock** is fine here because listeners only print; with real network calls, copy the order, release the lock, then notify, or hand events to a queue.

#### Interview checklist

- **Restaurant, menu item, cart and order modeling**: `Restaurant` with `MenuItem`s, a single-restaurant `Cart`, and `Order` with amount, state, partner and refund.
- **Order state machine, including rejection and cancellation**: the `allowed` table; rejection only from placed, cancellation until the food is ready.
- **Delivery partner assignment strategy**: `PartnerPicker` with `NearestFree`, reserved atomically on acceptance and freed on delivery or cancellation.
- **Payments and refunds**: charge on placing through `PaymentGateway`; full refund on rejection or early cancellation, half while preparing.
- **Notifying the customer, restaurant and partner (observer)**: `OrderListener` with three apps that filter the events they need.

Connects to: [observer](#/concept/oop.patterns-behavioral.observer), [ride sharing](#/concept/lld.classics.ride-sharing), [state](#/concept/oop.patterns-behavioral.state).

### questions
Q: Why should a cart hold items from only one restaurant?
A: An order is prepared by one kitchen and carried by one partner in one trip, and prices, fees and availability belong to that restaurant. The cart rejects an item from another restaurant, or asks the customer to start a new cart.

Q: What does the order state machine look like?
A: Placed, then accepted or rejected by the restaurant, then preparing, ready, picked up and delivered. The customer can cancel from placed, accepted or preparing, and every change is checked against a table of allowed transitions.

Q: How would you handle refunds?
A: Tie them to transitions: a rejected order or one cancelled before cooking starts is refunded in full, one cancelled while preparing is partly refunded, and one already picked up cannot be cancelled. Refunds go through the same payment gateway interface as charges.

Q: How is a delivery partner assigned?
A: A partner picker strategy chooses, for example, the nearest free partner to the restaurant, and the service marks that partner busy in the same critical section so two orders can't take the same partner. The partner becomes free again on delivery or cancellation.

Q: How do the customer, restaurant and partner learn about changes?
A: The order service publishes each state change to subscribed listeners, such as the customer app, the restaurant app and the partner app, and each reacts only to the events it cares about. New channels are new listeners, with no change to the service.

## lld.classics.notification-service
name: "Notification service"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "channels, templates, retries"

### simple
A notification service is the one place in a company's code that sends emails, text messages and phone push alerts. Other teams hand it "send this template to this user", and it fills in the details, respects what the user agreed to receive, and keeps retrying when a provider hiccups. It is like a post office: senders drop letters in, and the post office handles addresses, stamps and redelivery.

### interview
- **Channels behind an interface** (`Channel::send`): email, SMS, push, each wrapping a provider; a **factory** builds them from configuration, so adding WhatsApp touches no existing class.
- **Templates** with placeholders (`Hi {{name}}, your code is {{code}}`); rendering fails loudly on a missing variable instead of sending "Hi {{name}}".
- **Preferences**: per user, which channels are allowed and which categories are opted out (marketing); transactional messages such as one-time passwords ignore marketing opt-outs.
- **Retries** with exponential backoff (1, 2, 4 seconds, plus jitter in production) for temporary failures; after the last attempt, the message goes to a **dead-letter** store for inspection and replay.
- **Duplicates**: callers pass an idempotency key; a key already sent is skipped, so a caller's retry never double-sends.
- **Rate limits** per user and channel (say 3 marketing messages an hour) protect users and provider quotas.

### deep
#### Classes

```text
Notifier --> Channel <<interface>>          FlakyChannel ..|> Channel (email, sms, push)
makeChannel(name) ..> Channel               factory from configuration
Notifier *-- templates (name -> text)
Notifier *-- preferences (user -> channels, opted-out categories)
Notifier *-- sentKeys (idempotency), recent sends (rate limit), deadLetters
Notifier --> Clock/Sleeper                  injected; the demo records waits instead of sleeping
```

#### Code

```cpp
struct Channel {
    virtual ~Channel() = default;
    virtual string name() const = 0;
    virtual bool send(const string& to, const string& text) = 0;   // false: temporary failure
};
class FlakyChannel : public Channel {            // a fake provider that fails the first n sends
    string channel;
    int failuresLeft;
public:
    FlakyChannel(string c, int failures) : channel(std::move(c)), failuresLeft(failures) {}
    string name() const override { return channel; }
    bool send(const string& to, const string& text) override {
        if (failuresLeft != 0) { --failuresLeft; return false; }
        cout << "  " << channel << " -> " << to << ": " << text << "\n";
        return true;
    }
};
unique_ptr<Channel> makeChannel(const string& name, int failures = 0) {   // factory
    if (name == "email" || name == "sms" || name == "push")
        return make_unique<FlakyChannel>(name, failures);
    throw invalid_argument("unknown channel " + name);
}

string render(const string& tmpl, const map<string, string>& vars) {
    string out;
    for (size_t i = 0; i < tmpl.size();) {
        size_t open = tmpl.find("{{", i);
        if (open == string::npos) { out += tmpl.substr(i); break; }
        size_t close = tmpl.find("}}", open);
        string key = tmpl.substr(open + 2, close - open - 2);
        auto it = vars.find(key);
        if (it == vars.end()) throw invalid_argument("missing variable " + key);
        out += tmpl.substr(i, open - i) + it->second;
        i = close + 2;
    }
    return out;
}

struct Prefs { set<string> channels, optedOut; };
struct Message {
    string user, category, templ, key;
    map<string, string> vars;
};

class Notifier {
    map<string, unique_ptr<Channel>> channels;
    map<string, string> templates;
    map<string, Prefs> prefs;
    map<string, string> address;                 // user -> contact, simplified
    set<string> sentKeys;
    map<string, deque<int>> recent;              // user:channel -> send times
    vector<string> deadLetters;
    static constexpr int kMaxAttempts = 4, kPerHour = 3;
public:
    int now = 0;                                 // seconds; injected clock
    vector<int> waits;                           // backoff delays, recorded instead of slept
    void addChannel(unique_ptr<Channel> c) {
        string n = c->name();
        channels[n] = std::move(c);
    }
    void addTemplate(const string& n, const string& t) { templates[n] = t; }
    void addUser(const string& u, const string& addr, Prefs p) {
        address[u] = addr;
        prefs[u] = std::move(p);
    }
    vector<string> notify(const Message& m) {    // one result line per channel
        const Prefs& p = prefs.at(m.user);
        string text = render(templates.at(m.templ), m.vars);   // throws before recording anything
        if (!m.key.empty() && !sentKeys.insert(m.key).second) return {"duplicate key, skipped"};
        if (p.optedOut.count(m.category)) return {"opted out of " + m.category};
        vector<string> results;
        for (auto& ch : p.channels) {
            auto& times = recent[m.user + ":" + ch];
            while (!times.empty() && times.front() <= now - 3600) times.pop_front();
            if (m.category == "marketing" && times.size() >= kPerHour) {
                results.push_back(ch + ": rate limited");
                continue;
            }
            bool ok = false;
            int attempt = 1;
            for (int delay = 1; attempt <= kMaxAttempts; ++attempt, delay *= 2) {
                if ((ok = channels.at(ch)->send(address.at(m.user), text))) break;
                if (attempt < kMaxAttempts) waits.push_back(delay);   // exponential backoff
            }
            if (ok) {
                times.push_back(now);
                results.push_back(ch + ": sent on attempt " + to_string(attempt));
            } else {
                deadLetters.push_back(ch + " " + m.user + " " + m.templ);
                results.push_back(ch + ": failed " + to_string(kMaxAttempts) +
                                  " times, dead-lettered");
            }
        }
        return results;
    }
    const vector<string>& dead() const { return deadLetters; }
};

int main() {
    Notifier n;
    n.addChannel(makeChannel("sms", 2));         // the SMS provider fails twice, then works
    n.addChannel(makeChannel("email"));
    n.addChannel(makeChannel("push", -1));       // push is down (fails forever)
    n.addTemplate("otp", "Your code is {{code}}");
    n.addTemplate("sale", "Hi {{name}}, {{item}} is 20% off today");
    n.addUser("asha", "asha@example.com", {{"email"}, {}});
    n.addUser("ravi", "+91-90000-00000", {{"sms", "push"}, {"marketing"}});
    auto show = [](const string& what, const vector<string>& rs) {
        cout << what << ":";
        for (auto& r : rs) cout << " [" << r << "]";
        cout << "\n";
    };
    Message otp{"ravi", "security", "otp", "otp-ravi-1", {{"code", "482913"}}};
    show("otp to ravi", n.notify(otp));
    cout << "  backoff waits:";
    for (int w : n.waits) cout << " " << w << "s";
    cout << "\n";
    show("same otp again", n.notify(otp));
    auto sale = [](const string& user, const string& name, const string& item) {
        return Message{user, "marketing", "sale", "", {{"name", name}, {"item", item}}};
    };
    show("sale to ravi", n.notify(sale("ravi", "Ravi", "tea")));
    for (int i = 1; i <= 4; ++i, n.now += 600)
        show("sale " + to_string(i) + " to asha", n.notify(sale("asha", "Asha", "tea")));
    n.now += 3600;
    show("an hour later", n.notify(sale("asha", "Asha", "jam")));
    try {
        n.notify({"asha", "marketing", "sale", "", {{"name", "Asha"}}});
    } catch (const invalid_argument& e) {
        cout << "template error: " << e.what() << "\n";
    }
    cout << "dead letters:";
    for (auto& d : n.dead()) cout << " [" << d << "]";
    cout << "\n";
}
```

Output:

```text
  sms -> +91-90000-00000: Your code is 482913
otp to ravi: [push: failed 4 times, dead-lettered] [sms: sent on attempt 3]
  backoff waits: 1s 2s 4s 1s 2s
same otp again: [duplicate key, skipped]
sale to ravi: [opted out of marketing]
  email -> asha@example.com: Hi Asha, tea is 20% off today
sale 1 to asha: [email: sent on attempt 1]
  email -> asha@example.com: Hi Asha, tea is 20% off today
sale 2 to asha: [email: sent on attempt 1]
  email -> asha@example.com: Hi Asha, tea is 20% off today
sale 3 to asha: [email: sent on attempt 1]
sale 4 to asha: [email: rate limited]
  email -> asha@example.com: Hi Asha, jam is 20% off today
an hour later: [email: sent on attempt 1]
template error: missing variable item
dead letters: [push ravi otp]
```

The one-time password goes to both of Ravi's channels (in name order): push is down and ends in the dead-letter store after four attempts, with waits of 1, 2 and 4 seconds; SMS fails twice and succeeds on the third attempt after waiting 1 and 2 seconds. Sending the same key again does nothing. Ravi opted out of marketing, so the sale is skipped, but the security message still went through. Asha's fourth sale message within an hour is rate limited; an hour later sends are allowed again.

#### Where each concern lives

| concern | mechanism | why here |
|---|---|---|
| new channel | a class plus one factory line | callers and `Notifier` unchanged ([open-closed](#/concept/oop.principles.open-closed-principle)) |
| duplicates | idempotency keys checked first | a caller retrying after a timeout must not double-send |
| provider outages | retries with backoff, then a dead-letter store | temporary errors heal; permanent ones need a human |
| user choice | preferences checked before rendering | transactional categories bypass marketing opt-outs |
| spam and cost | per user and channel rate limit | protects users and provider quotas |

In production the retries run asynchronously: `notify` writes the message to a queue and returns, and workers send, back off with jitter, and move exhausted messages to a dead-letter queue ([dead-letter queues](#/concept/sysd.messaging.dead-letter-queues-and-poison-messages)). The class boundaries stay the same.

#### Interview checklist

- **Channels and providers behind interfaces (strategy or factory)**: `Channel` with providers, built by `makeChannel`.
- **Templates and filling in variables**: `render` replaces `{{name}}` placeholders and rejects missing variables.
- **User preferences and opt-outs**: `Prefs` with channels and opted-out categories, checked before sending.
- **Retries with backoff and a place for messages that keep failing**: four attempts with 1, 2, 4 second waits, then `deadLetters`.
- **Rate limits and avoiding duplicate sends**: a sliding one-hour window per user and channel for marketing, and idempotency keys.

Connects to: [factory method](#/concept/oop.patterns-creational.factory-method), [retries, timeouts and exponential backoff with jitter](#/concept/sysd.messaging.retries-timeouts-and-exponential-backoff-with-jitter), [rate limiter](#/concept/lld.classics.rate-limiter).

### questions
Q: How would you add a new channel such as WhatsApp to a notification service?
A: Write a class that implements the channel interface around the new provider and register it in the factory that builds channels from configuration. The notifier, templates, preferences and callers don't change.

Q: How do you retry failed sends without overwhelming a provider?
A: Retry only temporary failures, a limited number of times, with exponential backoff and random jitter so many retries don't line up. After the last attempt, move the message to a dead-letter store where it can be inspected and replayed.

Q: How do you avoid sending the same notification twice?
A: Callers attach an idempotency key, such as the event id, and the service records keys it has already sent, skipping any repeat. This makes it safe for callers to retry when their request timed out.

Q: How should user preferences interact with message categories?
A: Each user chooses allowed channels and can opt out of categories like marketing. Transactional or security messages, such as one-time passwords, are still delivered, but only on channels the user allows.

Q: Why fail when a template variable is missing?
A: Sending "Hi {{name}}" to a customer looks broken and may leak internal details. Rendering should validate that every placeholder has a value and reject the message so the calling team fixes it.

## lld.classics.pub-sub-message-queue
name: "Pub-sub message queue"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "topics, subscribers, offsets"

### simple
A publish-subscribe queue lets some parts of a program post messages to named topics while other parts read them, without knowing about each other. Picture a notice board per topic where every message gets a number: each reader keeps a bookmark of the last number they finished, so a slow reader never holds up a fast one. Old notices come down once every reader has passed them.

### interview
- Model: a `Broker` of named `Topic`s; each topic is an **append-only log** of messages with increasing **offsets**; each subscriber has a **committed offset** (the next message it needs).
- **Per-subscriber offsets** give each subscriber the full stream in order at its own pace; nothing is copied per subscriber.
- **Acknowledgement**: `poll` returns messages from the committed offset without advancing it; `ack` advances it. A consumer that crashes before acking sees the same messages again: **at-least-once** delivery, so consumers must be idempotent. Acking before processing gives at-most-once.
- **Thread safety**: one mutex per topic guards the log and offsets; a condition variable lets `poll` wait for new messages instead of spinning.
- **Retention**: drop messages below the smallest committed offset (everyone has read them), or by age or size with a warning that slow subscribers may miss data.
- Extensions: consumer groups (subscribers sharing one offset and splitting partitions), partitions for parallelism, dead-letter topics for messages that keep failing.

### deep
#### Classes

```text
Broker "1" *-- "*" Topic                       by name
Topic *-- log: deque<Message>                  Message: offset, payload; base = offset of front
Topic *-- committed: subscriber -> next offset
Topic: mutex + condition_variable              publish, poll (blocking), ack, cleanup
```

#### Code

```cpp
struct Message { long long offset; string payload; };

class Topic {
    deque<Message> log;
    long long base = 0, next = 0;                // offset of log.front(), next offset to assign
    map<string, long long> committed;            // subscriber -> next offset it needs
    mutable mutex m;
    condition_variable arrived;
    void cleanup() {                             // drop what every subscriber has acknowledged
        long long low = next;
        for (auto& [sub, off] : committed) low = min(low, off);
        while (base < low) { log.pop_front(); ++base; }
    }
public:
    void subscribe(const string& sub, bool fromStart) {
        lock_guard lock(m);
        committed[sub] = fromStart ? base : next;
    }
    long long publish(string payload) {
        long long off;
        {
            lock_guard lock(m);
            off = next++;
            log.push_back({off, std::move(payload)});
        }
        arrived.notify_all();
        return off;
    }
    vector<Message> poll(const string& sub, size_t max, chrono::milliseconds wait) {
        unique_lock lock(m);
        long long from = committed.at(sub);
        arrived.wait_for(lock, wait, [&] { return from < next; });
        vector<Message> out;
        for (long long o = from; o < next && out.size() < max; ++o) out.push_back(log[o - base]);
        return out;                              // not yet acknowledged
    }
    void ack(const string& sub, long long offset) {
        lock_guard lock(m);
        committed.at(sub) = max(committed.at(sub), offset + 1);
        cleanup();
    }
    size_t retained() const { lock_guard lock(m); return log.size(); }
};

class Broker {
    map<string, Topic> topics;
    mutex m;
public:
    Topic& topic(const string& name) { lock_guard lock(m); return topics[name]; }
};

int main() {
    Broker broker;
    Topic& orders = broker.topic("orders");
    orders.subscribe("billing", true);
    orders.subscribe("email", true);
    for (int i = 0; i < 5; ++i) orders.publish("order-" + to_string(i));
    auto show = [](const string& who, const vector<Message>& ms) {
        cout << who << " got";
        for (auto& msg : ms) cout << " " << msg.offset << ":" << msg.payload;
        cout << "\n";
    };
    auto b = orders.poll("billing", 3, 0ms);
    show("billing", b);
    orders.ack("billing", b.back().offset);
    show("email", orders.poll("email", 2, 0ms));
    show("email after a crash, no ack", orders.poll("email", 2, 0ms));
    cout << "retained: " << orders.retained() << "\n";
    orders.ack("email", 4);
    cout << "email acks 4, retained: " << orders.retained() << " (billing still needs 3 and 4)\n";

    Topic& ticks = broker.topic("ticks");
    const int total = 2000;
    map<string, bool> inOrder;
    mutex resultLock;
    for (string sub : {"fast", "slow"}) ticks.subscribe(sub, true);
    {
        vector<jthread> threads;
        for (string sub : {"fast", "slow"})
            threads.emplace_back([&, sub] {
                long long expect = 0;
                bool ok = true;
                size_t batch = sub == "fast" ? 64 : 3;       // the slow one reads 3 at a time
                while (expect < total) {
                    auto ms = ticks.poll(sub, batch, 100ms);
                    for (auto& msg : ms) {
                        if (msg.offset != expect || msg.payload != "tick " + to_string(expect))
                            ok = false;
                        ++expect;
                    }
                    if (!ms.empty()) ticks.ack(sub, ms.back().offset);
                }
                lock_guard lock(resultLock);
                inOrder[sub] = ok;
            });
        threads.emplace_back([&] {
            for (int i = 0; i < total; ++i) ticks.publish("tick " + to_string(i));
        });
    }
    for (auto& [sub, ok] : inOrder)
        cout << sub << ": " << total << " messages, in order: " << boolalpha << ok << "\n";
    cout << "retained after both acked everything: " << ticks.retained() << "\n";
}
```

Output:

```text
billing got 0:order-0 1:order-1 2:order-2
email got 0:order-0 1:order-1
email after a crash, no ack got 0:order-0 1:order-1
retained: 5
email acks 4, retained: 2 (billing still needs 3 and 4)
fast: 2000 messages, in order: true
slow: 2000 messages, in order: true
retained after both acked everything: 0
```

Billing and email read the same five messages independently. Email polled twice without acknowledging, so it received offsets 0 and 1 again, which is at-least-once delivery. Nothing is deleted while email is at 0; once email acknowledges up to 4, messages 0 to 2 go, and 3 and 4 stay for billing. In the threaded part, a producer and two consumers at different speeds run at once, and both see all 2,000 messages in order. That part was repeated under ThreadSanitizer with no reports and the same output.

#### Delivery guarantees

| consumer does | guarantee | risk |
|---|---|---|
| ack, then process | at most once | a crash after the ack loses the message |
| process, then ack | at least once | a crash before the ack repeats it; make processing idempotent |
| process idempotently (dedupe by offset or message id), then ack | effectively once | needs a dedupe store or idempotent writes |

The broker cannot give exactly-once processing by itself; it gives at-least-once delivery, and the consumer makes repeats harmless ([idempotency and exactly-once myths](#/concept/sysd.messaging.idempotency-and-exactly-once-myths)).

#### Design choices

- **One log, many offsets** instead of one queue per subscriber: memory grows with messages, not messages × subscribers, and a new subscriber can replay from the start.
- **`poll` never advances**: acknowledgement is explicit, so the consumer decides when work is safely done.
- **Retention by minimum offset** keeps data until everyone is done; a subscriber that dies would pin the log forever, so real systems also cap retention by time or size and let such a subscriber fall behind.
- **Notify outside the lock** in `publish`, so woken consumers don't immediately block on the mutex.

#### Interview checklist

- **Topic, message, subscriber and offset modeling**: `Broker`, `Topic` with a log of `Message{offset, payload}`, and committed offsets per subscriber.
- **Per-subscriber offsets so ordering holds at each subscriber's own pace**: `committed` per subscriber; the fast and slow consumers both see every message in order.
- **Thread-safe publishing and consuming**: a mutex per topic and a condition variable for blocking `poll`.
- **Retention and cleanup of messages everyone has read**: `cleanup` drops everything below the minimum committed offset.
- **Delivery guarantees and acknowledgements**: `poll` plus explicit `ack` gives at-least-once; the table shows the alternatives.

Connects to: [observer](#/concept/oop.patterns-behavioral.observer), [producer-consumer in code](#/concept/conc.patterns.producer-consumer-in-code), [publish-subscribe and event-driven architecture](#/concept/sysd.messaging.publish-subscribe-and-event-driven-architecture).

### questions
Q: How can every subscriber get every message, in order, at its own pace?
A: Store each topic as one append-only log with increasing offsets, and keep a committed offset per subscriber. Each subscriber reads from its own offset and advances it when done, so fast and slow subscribers never block each other and no message is copied per subscriber.

Q: What is the difference between at-most-once and at-least-once delivery?
A: At-most-once acknowledges a message before processing it, so a crash can lose it but never repeats it. At-least-once processes first and acknowledges after, so a crash can cause a repeat but never a loss, which means consumers must handle duplicates.

Q: When can messages be deleted from a topic?
A: When every subscriber has acknowledged them, meaning they are below the smallest committed offset. Because a dead subscriber would keep everything forever, real systems also cap retention by age or size.

Q: How do you make polling efficient when there are no new messages?
A: Let consumers wait on a condition variable with a timeout, and have publishers notify it after appending. Consumers then sleep until a message arrives instead of spinning on the lock.

Q: How would you let several workers share the load of one subscriber?
A: Use a consumer group: the workers share one committed offset per partition, and each partition is assigned to one worker, so messages are split between them while order is kept within each partition.

## lld.classics.in-memory-key-value-store
name: "In-memory key-value store"
importance: important
prereqs: [lld.method.clarifying-requirements]
scope: "get, set, delete, TTL, transactions"

### simple
An in-memory key-value store is a big dictionary that lives in a program's memory: you set a value under a key, get it back, and delete it. Keys can be given an expiry time, like a parking meter that runs out. Transactions let you make several changes and then keep them all or undo them all, even with transactions inside transactions.

### interview
- **API**: `get(key)`, `set(key, value, ttl?)`, `del(key)`, plus `begin`, `commit` and `rollback`. Storage is a hash map from key to an entry (value and optional expiry time).
- **Expiry**: check lazily on every read (an expired key behaves as missing and is removed), plus a **background sweep** so keys nobody reads don't hold memory forever; Redis combines both, sweeping a random sample of keys that have an expiry.
- **Transactions as a stack of undo logs**: writes go straight to the map, and each open transaction records, the first time it touches a key, what that key held before (or that it was absent).
- **Nested semantics**: rolling back the innermost transaction restores only its keys; committing an inner transaction merges its undo log into its parent's (keeping the parent's older value when both touched a key), so a later outer rollback still undoes everything.
- **Thread safety**: one mutex around the map; read-modify-write operations (`update`, increment) must run under the lock as one step, not as a `get` followed by a `set`.
- With several clients, each needs its own transaction with isolation: hold the lock for the whole transaction (simple, serial) or buffer writes and validate at commit (optimistic).

### deep
#### Classes

```text
KvStore *-- data: unordered_map<key, Entry>        Entry: value, optional expiresAt
KvStore *-- txLogs: stack of map<key, optional<Entry>>   the "before" value per touched key
KvStore --> Clock <<interface>>                     FakeClock in the demo
```

#### Code

```cpp
struct Clock {
    virtual ~Clock() = default;
    virtual long long now() const = 0;           // seconds
};
struct FakeClock : Clock {
    long long t = 0;
    long long now() const override { return t; }
};

class KvStore {
    struct Entry { string value; optional<long long> expiresAt; };
    unordered_map<string, Entry> data;
    vector<map<string, optional<Entry>>> txLogs; // innermost transaction at the back
    const Clock& clock;
    mutable mutex m;
    bool expired(const Entry& e) const { return e.expiresAt && *e.expiresAt <= clock.now(); }
    void remember(const string& key) {           // first touch in this transaction only
        if (txLogs.empty() || txLogs.back().count(key)) return;
        auto it = data.find(key);
        txLogs.back()[key] = it == data.end() ? nullopt : optional<Entry>(it->second);
    }
    Entry* live(const string& key) {             // lazy expiry on access
        auto it = data.find(key);
        if (it == data.end()) return nullptr;
        if (expired(it->second)) { data.erase(it); return nullptr; }
        return &it->second;
    }
public:
    explicit KvStore(const Clock& c) : clock(c) {}
    optional<string> get(const string& key) {
        lock_guard lock(m);
        Entry* e = live(key);
        return e ? optional<string>(e->value) : nullopt;
    }
    void set(const string& key, string value, optional<long long> ttl = nullopt) {
        lock_guard lock(m);
        live(key);
        remember(key);
        data[key] = {std::move(value), ttl ? optional<long long>(clock.now() + *ttl) : nullopt};
    }
    bool del(const string& key) {
        lock_guard lock(m);
        if (!live(key)) return false;
        remember(key);
        data.erase(key);
        return true;
    }
    long long increment(const string& key) {     // read-modify-write as one step
        lock_guard lock(m);
        Entry* e = live(key);
        long long v = e ? stoll(e->value) + 1 : 1;
        remember(key);
        data[key] = {to_string(v), e ? e->expiresAt : nullopt};
        return v;
    }
    size_t sweep() {                             // background cleanup of expired keys
        lock_guard lock(m);
        return erase_if(data, [&](auto& kv) { return expired(kv.second); });
    }
    void begin() { lock_guard lock(m); txLogs.emplace_back(); }
    bool rollback() {
        lock_guard lock(m);
        if (txLogs.empty()) return false;
        for (auto& [key, before] : txLogs.back()) {
            if (before) data[key] = *before;
            else data.erase(key);
        }
        txLogs.pop_back();
        return true;
    }
    bool commit() {
        lock_guard lock(m);
        if (txLogs.empty()) return false;
        auto inner = std::move(txLogs.back());
        txLogs.pop_back();
        if (!txLogs.empty())                     // nested: the parent must still be able to undo
            for (auto& [key, before] : inner) txLogs.back().try_emplace(key, before);
        return true;
    }
};

int main() {
    FakeClock clock;
    KvStore kv(clock);
    auto show = [&](const string& key) {
        auto v = kv.get(key);
        return key + "=" + (v ? *v : string("(none)"));
    };
    kv.set("a", "1");
    kv.set("session", "s1", 10);                 // expires at t=10
    clock.t = 5;
    cout << "t=5: " << show("a") << " " << show("session") << "\n";
    clock.t = 10;
    cout << "t=10: " << show("session") << " (expired, removed on read)\n";
    for (string k : {"x", "y", "z"}) kv.set(k, "tmp", 1);
    clock.t = 20;
    cout << "sweep removed " << kv.sweep() << " expired keys nobody read\n";

    kv.begin();
    kv.set("a", "2");
    kv.begin();
    kv.set("a", "3");
    kv.set("b", "7");
    cout << "inside both: " << show("a") << " " << show("b") << "\n";
    kv.rollback();
    cout << "inner rollback: " << show("a") << " " << show("b") << "\n";
    kv.commit();
    cout << "outer commit: " << show("a") << "\n";

    kv.begin();
    kv.set("a", "5");
    kv.begin();
    kv.del("a");
    kv.commit();
    cout << "inner commit of a delete: " << show("a") << "\n";
    kv.rollback();
    cout << "outer rollback: " << show("a") << "\n";
    cout << boolalpha << "rollback with no transaction: " << kv.rollback() << "\n";

    {
        vector<jthread> threads;                 // 4 threads x 5000 increments
        for (int t = 0; t < 4; ++t)
            threads.emplace_back([&] { for (int i = 0; i < 5000; ++i) kv.increment("hits"); });
    }
    cout << "after concurrent increments: " << show("hits") << "\n";
}
```

Output:

```text
t=5: a=1 session=s1
t=10: session=(none) (expired, removed on read)
sweep removed 3 expired keys nobody read
inside both: a=3 b=7
inner rollback: a=2 b=(none)
outer commit: a=2
inner commit of a delete: a=(none)
outer rollback: a=2
rollback with no transaction: false
after concurrent increments: hits=20000
```

Follow `a` through the transactions. The inner rollback restores `a` to 2 (its value when the inner transaction first touched it) and removes `b` (absent before). In the second block, the inner transaction deletes `a` and commits: its undo record "a was 5" would be lost if simply discarded, but the parent already holds its own older record, "a was 2", so the outer rollback restores 2. That merge rule, keeping the parent's record when both have one, is the heart of nested transactions. The 20,000 increments from four threads all count, because each increment reads and writes under one lock; this run was repeated under ThreadSanitizer with no reports.

#### Lazy expiry versus sweeping

| approach | cost | weakness |
|---|---|---|
| lazy (on read) | nothing extra | keys that are never read again stay in memory |
| full sweep | O(n) per run, under the lock | pauses with many keys |
| sampled sweep (Redis style) | test 20 random keys with a TTL; repeat while over 25% were expired | memory held by expired keys stays bounded, not zero |

Using both, as here, is the usual answer. A min-heap of expiry times makes the sweep O(k log n) for k expired keys, at the cost of maintaining the heap on every write.

#### Interview checklist

- **Core storage and the public API**: `unordered_map<string, Entry>` with `get`, `set` (optional TTL), `del` and `increment`.
- **Expiry: checking lazily on read versus cleaning up in the background**: `live` removes expired keys on access; `sweep` clears the rest.
- **Transactions as a stack of change logs**: `txLogs`, one map of before-values per open transaction.
- **Semantics of nested commit and rollback**: rollback restores the innermost log; commit merges it into the parent, keeping the parent's older entries.
- **Thread safety**: one mutex; `increment` shows why read-modify-write must be atomic. Per-client isolation would need a lock held for the transaction or optimistic validation.

Connects to: [command](#/concept/oop.patterns-behavioral.command), [mutexes and lock guards](#/concept/conc.locks.mutexes-and-lock-guards), [key-value store at scale](#/concept/sysd.classics.key-value-store).

### questions
Q: How would you implement transactions in an in-memory key-value store?
A: Keep a stack of undo logs, one per open transaction. Writes go straight into the store, and the first time a transaction touches a key it records the key's previous value or its absence; rollback replays that log backwards into the store, and commit simply drops or merges it.

Q: What happens when a nested transaction commits and the outer one then rolls back?
A: The outer rollback must undo the inner changes too. So committing an inner transaction merges its undo records into its parent's log, keeping the parent's own record when both touched the same key, because that one holds the older value.

Q: Should expired keys be removed on read or in the background?
A: Both. Checking on read guarantees callers never see an expired value at no extra cost, and a periodic sweep, often over a random sample of keys with expiries, frees memory held by keys nobody reads again.

Q: Why is a get followed by a set not safe for a counter under concurrency?
A: Two threads can both read the same old value and both write old plus one, losing an increment. The read-modify-write must be one atomic operation under the store's lock, such as an increment or compare-and-set method.

Q: How would transactions work with several clients at once?
A: Each client needs its own transaction with isolation. The simplest option holds a store-wide lock for the whole transaction, which serializes clients; a more concurrent option buffers each transaction's writes privately and validates at commit that nothing it read has changed.

## lld.classics.file-system
name: "File system"
importance: advanced
prereqs: [lld.method.clarifying-requirements]
scope: "directories, files, paths, permissions"

### simple
An in-memory file system keeps folders and files in a tree, like the one you browse on your own computer, and lets you create, read, move and delete things by their path. Folders and files are treated alike where possible, the way a box can hold letters or smaller boxes. The design must also refuse the strange requests, such as moving a folder inside itself.

### interview
- **Composite pattern**: `Node` is the common base of `File` and `Directory`; a directory holds named child nodes, so size, listing and permission checks work uniformly on the tree.
- **Paths**: split on `/`, ignore empty parts and `.`, pop on `..` (never above the root), then walk from the root through `children` maps; each lookup is O(1) per level with a hash map, or ordered with `std::map` for sorted listings.
- **Edge cases**: creating a name that exists, moving onto an existing name, **moving a folder into its own subtree** (check that the destination is not the source or below it), deleting a non-empty folder without a recursive flag, deleting the root.
- **Permissions**: read and write bits for the owner and for everyone else; reading a file needs read on it, creating or deleting needs write on the parent folder, listing needs read on the folder; a superuser skips the checks.
- **Metadata**: owner, bits, modified time and size; a directory's size is the sum of its subtree, computed recursively (or cached and updated on every write for speed).
- Keep one error type with clear messages (`mkdir /a: already exists`), and validate everything before changing the tree.

### deep
#### Classes

```text
Node <<abstract>>: name, owner, ownerBits, otherBits, modified, parent, size()
File --|> Node                    data
Directory --|> Node               children: map<name, unique_ptr<Node>>   (composite)
Directory "1" *-- "*" Node
FileSystem *-- Directory (root)   resolve(path), mkdir, write, read, ls, mv, rm, chown
```

#### Code

```cpp
struct FsError : runtime_error { using runtime_error::runtime_error; };
enum Bits { R = 4, W = 2 };
struct Directory;

struct Node {                                    // composite: files and folders alike
    string name, owner;
    int ownerBits = R | W, otherBits = R;
    long long modified = 0;
    Directory* parent = nullptr;
    virtual ~Node() = default;
    virtual bool isDir() const = 0;
    virtual long long size() const = 0;
    bool can(const string& user, int bits) const {
        if (user == "root") return true;         // superuser
        int have = user == owner ? ownerBits : otherBits;
        return (have & bits) == bits;
    }
};
struct File : Node {
    string data;
    bool isDir() const override { return false; }
    long long size() const override { return data.size(); }
};
struct Directory : Node {
    map<string, unique_ptr<Node>> children;
    bool isDir() const override { return true; }
    long long size() const override {            // the whole subtree
        long long total = 0;
        for (auto& [n, c] : children) total += c->size();
        return total;
    }
};

class FileSystem {
    Directory root;
    long long clock = 0;
    static vector<string> parts(const string& path) {
        if (path.empty() || path[0] != '/') throw FsError(path + ": paths start with /");
        vector<string> out;
        stringstream ss(path);
        for (string p; getline(ss, p, '/');) {
            if (p.empty() || p == ".") continue;
            if (p == "..") { if (!out.empty()) out.pop_back(); }
            else out.push_back(p);
        }
        return out;
    }
    Node* find(const vector<string>& ps) {
        Node* at = &root;
        for (auto& p : ps) {
            auto* d = dynamic_cast<Directory*>(at);
            if (!d || !d->children.count(p)) return nullptr;
            at = d->children[p].get();
        }
        return at;
    }
    Node& need(const string& path) {
        Node* n = find(parts(path));
        if (!n) throw FsError(path + ": no such file or directory");
        return *n;
    }
    Directory& parentOf(const string& path, string& leaf) {
        auto ps = parts(path);
        if (ps.empty()) throw FsError("/: not allowed on the root");
        leaf = ps.back();
        ps.pop_back();
        auto* d = dynamic_cast<Directory*>(find(ps));
        if (!d) throw FsError(path + ": parent is not a directory");
        return *d;
    }
    static void check(const Node& n, const string& user, int bits, const string& what) {
        if (!n.can(user, bits)) throw FsError(what + ": permission denied");
    }
    template <class T>
    T& attach(Directory& dir, const string& name, const string& user) {
        auto node = make_unique<T>();
        node->name = name;
        node->owner = user;
        node->parent = &dir;
        node->modified = ++clock;
        T& ref = *node;
        dir.children[name] = std::move(node);
        dir.modified = clock;
        return ref;
    }
public:
    FileSystem() {
        root.name = "/";
        root.owner = "root";
    }
    void mkdir(const string& path, const string& user) {
        string leaf;
        Directory& dir = parentOf(path, leaf);
        check(dir, user, W, "mkdir " + path);
        if (dir.children.count(leaf)) throw FsError("mkdir " + path + ": already exists");
        attach<Directory>(dir, leaf, user);
    }
    void write(const string& path, const string& user, const string& text) {
        string leaf;
        Directory& dir = parentOf(path, leaf);
        auto it = dir.children.find(leaf);
        if (it == dir.children.end()) {          // create: needs write on the folder
            check(dir, user, W, "write " + path);
            attach<File>(dir, leaf, user).data = text;
            return;
        }
        auto* f = dynamic_cast<File*>(it->second.get());
        if (!f) throw FsError("write " + path + ": is a directory");
        check(*f, user, W, "write " + path);
        f->data = text;
        f->modified = ++clock;
    }
    string read(const string& path, const string& user) {
        auto* f = dynamic_cast<File*>(&need(path));
        if (!f) throw FsError("read " + path + ": is a directory");
        check(*f, user, R, "read " + path);
        return f->data;
    }
    string ls(const string& path, const string& user) {
        auto* d = dynamic_cast<Directory*>(&need(path));
        if (!d) return path;
        check(*d, user, R, "ls " + path);
        string out;
        for (auto& [n, c] : d->children)
            out += (out.empty() ? "" : " ") + n + (c->isDir() ? "/" : "");
        return out;
    }
    long long du(const string& path) { return need(path).size(); }
    void chown(const string& path, const string& user, const string& newOwner) {
        if (user != "root") throw FsError("chown " + path + ": permission denied");
        need(path).owner = newOwner;
    }
    void mv(const string& from, const string& to, const string& user) {
        string a, b;
        Directory& src = parentOf(from, a);
        Directory& dst = parentOf(to, b);
        if (!src.children.count(a)) throw FsError("mv " + from + ": no such file or directory");
        check(src, user, W, "mv " + from);
        check(dst, user, W, "mv " + to);
        if (dst.children.count(b)) throw FsError("mv " + to + ": already exists");
        Node* moving = src.children[a].get();
        for (Node* at = &dst; at; at = at->parent)   // is the destination inside the source?
            if (at == moving) throw FsError("mv " + from + ": cannot move a folder into itself");
        auto node = std::move(src.children[a]);
        src.children.erase(a);
        node->name = b;
        node->parent = &dst;
        node->modified = ++clock;
        dst.children[b] = std::move(node);
    }
    void rm(const string& path, const string& user, bool recursive = false) {
        string leaf;
        Directory& dir = parentOf(path, leaf);
        auto it = dir.children.find(leaf);
        if (it == dir.children.end()) throw FsError("rm " + path + ": no such file or directory");
        check(dir, user, W, "rm " + path);
        auto* d = dynamic_cast<Directory*>(it->second.get());
        if (d && !d->children.empty() && !recursive)
            throw FsError("rm " + path + ": directory not empty");
        dir.children.erase(it);
    }
};

int main() {
    FileSystem fs;
    auto run = [](const string& label, auto&& action) {
        try {
            string result = action();
            cout << label << ": " << result << "\n";
        } catch (const FsError& e) {
            cout << label << ": error, " << e.what() << "\n";
        }
    };
    fs.mkdir("/home", "root");
    fs.mkdir("/home/asha", "root");
    fs.chown("/home/asha", "root", "asha");
    const string home = "/home/asha";
    auto ok = [](auto&& f) { return [f] { f(); return string("ok"); }; };
    run("asha writes notes.txt", ok([&] { fs.write(home + "/notes.txt", "asha", "buy milk"); }));
    run("asha makes docs/plan.md", ok([&] {
        fs.mkdir(home + "/docs", "asha");
        fs.write(home + "/docs/plan.md", "asha", "1. design\n2. code\n");
    }));
    run("ls /home/asha", [&] { return fs.ls(home, "asha"); });
    run("size of /home/asha", [&] { return to_string(fs.du(home)) + " bytes"; });
    run("ravi reads notes.txt", [&] { return fs.read(home + "/notes.txt", "ravi"); });
    run("ravi writes notes.txt", ok([&] { fs.write(home + "/notes.txt", "ravi", "x"); }));
    run("ravi creates r.txt there", ok([&] { fs.write(home + "/r.txt", "ravi", "x"); }));
    run("mkdir docs again", ok([&] { fs.mkdir(home + "/docs", "asha"); }));
    run("mv docs into docs/old", ok([&] { fs.mv(home + "/docs", home + "/docs/old", "asha"); }));
    run("rm docs", ok([&] { fs.rm(home + "/docs", "asha"); }));
    run("mv notes.txt into docs",
        ok([&] { fs.mv(home + "/notes.txt", home + "/docs/notes.txt", "asha"); }));
    run("read via ..", [&] { return fs.read(home + "/docs/../docs/./notes.txt", "asha"); });
    run("rm -r docs", ok([&] { fs.rm(home + "/docs", "asha", true); }));
    run("ls /home/asha", [&] {
        string s = fs.ls(home, "asha");
        return s.empty() ? "(empty)" : s;
    });
    run("rm /", ok([&] { fs.rm("/", "root"); }));
}
```

Output:

```text
asha writes notes.txt: ok
asha makes docs/plan.md: ok
ls /home/asha: docs/ notes.txt
size of /home/asha: 26 bytes
ravi reads notes.txt: buy milk
ravi writes notes.txt: error, write /home/asha/notes.txt: permission denied
ravi creates r.txt there: error, write /home/asha/r.txt: permission denied
mkdir docs again: error, mkdir /home/asha/docs: already exists
mv docs into docs/old: error, mv /home/asha/docs: cannot move a folder into itself
rm docs: error, rm /home/asha/docs: directory not empty
mv notes.txt into docs: ok
read via ..: buy milk
rm -r docs: ok
ls /home/asha: (empty)
rm /: error, /: not allowed on the root
```

The size of `/home/asha` is the sum over its subtree: 8 bytes of notes plus 18 of the plan. Ravi may read Asha's file (everyone has read access) but neither change it nor create files in that folder. The move into `docs/old` is refused by walking up from the destination's folder: reaching `docs` itself means the destination is inside the thing being moved. The `..` in the last read is resolved while parsing, before walking the tree.

#### Decisions and variants

- **Uniform treatment**: `size`, `can` and the owner fields live on `Node`, so code that walks the tree (disk usage, search, permission audits) doesn't care which kind it meets; only operations that make sense for one kind (`read`, listing) check the type.
- **Execute bits and links**: real systems also need search (execute) permission on every folder along a path, and support hard and symbolic links; links turn the tree into a graph, so `mv` and `du` must avoid cycles.
- **Big folders**: `std::map` gives sorted listings; an `unordered_map` gives faster lookups. Cached directory sizes, updated up the parent chain on each write, make `du` O(1) at the cost of O(depth) writes.
- **Concurrency**: a single lock around the tree is the simple answer; a lock per directory needs a fixed order (for example root first, then by path) for operations like `mv` that touch two directories.

#### Interview checklist

- **Files and directories treated uniformly (composite pattern)**: `Node` with `File` and `Directory`; a directory owns child nodes.
- **Parsing and walking paths**: `parts` handles `.`, `..` and repeated slashes; `find` walks from the root.
- **Edge cases: name clashes, moving a folder into itself, deleting non-empty folders**: "already exists", the parent-chain check in `mv`, and "directory not empty" without the recursive flag (also refusing the root).
- **Permission checks**: owner and other read and write bits; write on the parent folder to create, move or delete; root skips checks.
- **Sizes and metadata**: owner, bits, modified time on every node; `size()` sums the subtree.

Connects to: [composite](#/concept/oop.patterns-structural.composite), [file concepts](#/concept/os.storage.file-concepts), [trie structure](#/concept/dsa.tries.trie-structure).

### questions
Q: How does the composite pattern help in a file system design?
A: Files and directories share a base node type with common fields and operations such as size, owner and permission checks, and a directory holds child nodes of either kind. Code that walks the tree, like disk usage, treats every node the same way and recursion handles any depth.

Q: How do you stop a folder from being moved into itself?
A: Before moving, walk up the parent chain from the destination folder; if you reach the folder being moved, the destination is inside it and the move must be refused. Without this check the subtree would be detached from the root and lost.

Q: How do you parse a path such as /a/./b/../c?
A: Split it on slashes, skip empty parts and single dots, and pop the previous part on double dots without going above the root; the result here is a then c. Then walk from the root through each directory's children.

Q: Which permission is needed to delete a file?
A: In this design, as in Unix, write permission on the folder that contains it, because deleting changes the folder's list of names. Reading a file needs read permission on the file itself, and listing a folder needs read permission on the folder.

Q: How would you make directory sizes fast to query?
A: Cache each directory's total size and, on every write, add the size change to each ancestor up to the root. Queries become O(1) and each write costs O(depth) instead of recomputing the whole subtree on demand.

## lld.classics.online-shopping-cart-and-inventory
name: "Online shopping cart and inventory"
importance: advanced
prereqs: [lld.method.clarifying-requirements]
scope: "cart, stock reservation, checkout"

### simple
This design covers the last steps of online shopping: the cart, holding stock while the customer pays, and turning the cart into an order. Holding stock is like a shop assistant putting an item behind the counter for you for fifteen minutes: nobody else can buy it meanwhile, and if you don't come back it returns to the shelf. The design must never sell more units than exist, even when many people check out at once.

### interview
- Entities: `Product` (SKU, price), `Inventory` (on hand and reserved per SKU), `Cart` (SKU to quantity), `Order` (lines, amounts, state, payment state) and `Reservation` (lines, expiry).
- **Reserve at checkout, not at add-to-cart**: carts are cheap and often abandoned; stock is held only when the customer starts paying, for a short time (say 15 minutes).
- **No overselling**: `available = onHand − reserved`; check every line and reserve them all as one atomic step (a lock around the inventory in memory, a conditional update such as `UPDATE ... SET reserved = reserved + q WHERE on_hand - reserved >= q` in a database).
- **Payment result**: success commits the reservation (on hand and reserved both drop); failure or expiry releases it (reserved drops). Expired reservations are released lazily on the next request or by a sweeper.
- **Discounts as rules** behind one interface (percentage coupons with a minimum, buy X get Y, bundle prices); state the stacking policy, such as promotions first, then at most one coupon, never below zero.
- **States**: order created → stock reserved → paid → shipped, or cancelled or expired; payment pending → captured or failed; refunds after capture.

### deep
#### Classes

```text
Cart *-- lines: SKU -> quantity                 Product: sku, name, price
Inventory *-- stock: SKU -> {onHand, reserved}
Inventory *-- reservations: id -> {lines, expiresAt}
Checkout --> Inventory, PaymentGateway <<interface>>, DiscountRule <<interface>>
PercentCoupon ..|> DiscountRule    BuyXGetYFree ..|> DiscountRule
Order: lines, subtotal, discount, total, OrderState, PaymentState, reservationId
```

#### Code

```cpp
struct Product { string sku, name; int price; };
using Lines = map<string, int>;                  // SKU -> quantity
using Catalog = map<string, Product>;

class Inventory {
    struct Stock { int onHand, reserved = 0; };
    struct Reservation { Lines lines; int expiresAt; };
    map<string, Stock> stock;
    map<int, Reservation> reservations;
    mutex m;
    int nextId = 1;
    void releaseLocked(int id) {
        for (auto& [sku, q] : reservations.at(id).lines) stock.at(sku).reserved -= q;
        reservations.erase(id);
    }
    void expireLocked(int now) {
        vector<int> old;
        for (auto& [id, r] : reservations) if (r.expiresAt <= now) old.push_back(id);
        for (int id : old) releaseLocked(id);
    }
public:
    void add(const string& sku, int units) { lock_guard lock(m); stock[sku].onHand += units; }
    optional<int> reserve(const Lines& lines, int now, int holdMinutes = 15) {
        lock_guard lock(m);
        expireLocked(now);
        for (auto& [sku, q] : lines) {           // all lines or none
            auto it = stock.find(sku);
            if (it == stock.end() || it->second.onHand - it->second.reserved < q) return nullopt;
        }
        for (auto& [sku, q] : lines) stock[sku].reserved += q;
        int id = nextId++;
        reservations[id] = {lines, now + holdMinutes};
        return id;
    }
    bool commit(int id, int now) {               // payment captured: stock leaves the shelf
        lock_guard lock(m);
        expireLocked(now);
        auto it = reservations.find(id);
        if (it == reservations.end()) return false;   // expired while paying
        for (auto& [sku, q] : it->second.lines) {
            stock[sku].onHand -= q;
            stock[sku].reserved -= q;
        }
        reservations.erase(it);
        return true;
    }
    void release(int id) {
        lock_guard lock(m);
        if (reservations.count(id)) releaseLocked(id);
    }
    int available(const string& sku, int now) {
        lock_guard lock(m);
        expireLocked(now);
        return stock.at(sku).onHand - stock.at(sku).reserved;
    }
};

struct DiscountRule {
    virtual ~DiscountRule() = default;
    virtual string name() const = 0;
    virtual int discount(const Lines& lines, const Catalog& catalog, int soFar) const = 0;
};
struct BuyXGetYFree : DiscountRule {             // a promotion
    string sku;
    int x, y;
    BuyXGetYFree(string s, int x, int y) : sku(std::move(s)), x(x), y(y) {}
    string name() const override {
        return "buy " + to_string(x) + " get " + to_string(y) + " " + sku;
    }
    int discount(const Lines& lines, const Catalog& catalog, int) const override {
        auto it = lines.find(sku);
        if (it == lines.end()) return 0;
        return it->second / (x + y) * y * catalog.at(sku).price;
    }
};
struct PercentCoupon : DiscountRule {            // a coupon on what is left after promotions
    string code;
    int percent, minimum;
    PercentCoupon(string c, int p, int min) : code(std::move(c)), percent(p), minimum(min) {}
    string name() const override { return "coupon " + code; }
    int discount(const Lines&, const Catalog&, int soFar) const override {
        return soFar >= minimum ? soFar * percent / 100 : 0;
    }
};

enum class OrderState { Reserved, Paid, PaymentFailed, Expired };
struct Order { int id, subtotal, discount, total, reservation; OrderState state; string note; };

struct PaymentGateway {
    virtual ~PaymentGateway() = default;
    virtual bool charge(int amount) = 0;
};
struct ScriptedGateway : PaymentGateway {        // answers from a script, for the demo
    deque<bool> answers;
    bool charge(int) override { bool ok = answers.front(); answers.pop_front(); return ok; }
};

class Checkout {
    const Catalog& catalog;
    Inventory& inventory;
    PaymentGateway& gateway;
    int nextOrder = 1;
public:
    Checkout(const Catalog& c, Inventory& i, PaymentGateway& g)
        : catalog(c), inventory(i), gateway(g) {}
    optional<Order> start(const Lines& cart, const vector<const DiscountRule*>& rules, int now) {
        auto res = inventory.reserve(cart, now);
        if (!res) return nullopt;
        int subtotal = 0;
        for (auto& [sku, q] : cart) subtotal += catalog.at(sku).price * q;
        int left = subtotal;                     // promotions first, then the coupon
        string note;
        for (auto* r : rules) {
            int d = min(left, r->discount(cart, catalog, left));
            if (d) note += " [" + r->name() + " -" + to_string(d) + "]";
            left -= d;
        }
        int id = nextOrder++;
        return Order{id, subtotal, subtotal - left, left, *res, OrderState::Reserved, note};
    }
    void pay(Order& o, int now) {
        if (!gateway.charge(o.total)) {
            inventory.release(o.reservation);
            o.state = OrderState::PaymentFailed;
        } else if (!inventory.commit(o.reservation, now)) {
            o.state = OrderState::Expired;       // hold ran out: refund the charge
        } else {
            o.state = OrderState::Paid;
        }
    }
};

int main() {
    Catalog catalog{{"tea", {"tea", "Assam tea", 250}},
                    {"mug", {"mug", "Mug", 400}},
                    {"bisc", {"bisc", "Biscuits", 50}}};
    Inventory inv;
    inv.add("tea", 5);
    inv.add("mug", 1);
    inv.add("bisc", 10);
    ScriptedGateway gateway;
    gateway.answers = {true, false, true, true};
    Checkout checkout(catalog, inv, gateway);
    const char* states[] = {"reserved", "paid", "payment failed", "expired, refund"};

    BuyXGetYFree promo("bisc", 2, 1);
    PercentCoupon save10("SAVE10", 10, 500);
    auto asha = checkout.start({{"tea", 2}, {"bisc", 3}}, {&promo, &save10}, 0);
    cout << "asha: subtotal " << asha->subtotal << asha->note << ", total " << asha->total << "\n";
    checkout.pay(*asha, 1);
    cout << "asha pays: " << states[int(asha->state)] << "\n";

    auto ravi = checkout.start({{"mug", 1}}, {}, 2);
    auto meera = checkout.start({{"mug", 1}}, {}, 3);
    cout << "ravi holds the last mug; meera's checkout: " << (meera ? "ok" : "out of stock")
         << "\n";
    checkout.pay(*ravi, 4);
    cout << "ravi pays: " << states[int(ravi->state)] << ", mugs available "
         << inv.available("mug", 4) << "\n";
    meera = checkout.start({{"mug", 1}}, {}, 5);
    checkout.pay(*meera, 6);
    cout << "meera retries and pays: " << states[int(meera->state)] << "\n";

    auto slow = checkout.start({{"tea", 3}}, {}, 10);
    cout << "kabir holds 3 tea, available now " << inv.available("tea", 10) << "\n";
    cout << "20 minutes later, available " << inv.available("tea", 30) << "\n";
    checkout.pay(*slow, 31);
    cout << "kabir pays late: " << states[int(slow->state)] << "\n";

    Inventory limited;
    limited.add("ltd", 3);
    atomic<int> sold = 0;
    latch go(20);
    {
        vector<jthread> buyers;                  // 20 buyers, 3 units, same instant
        for (int b = 0; b < 20; ++b)
            buyers.emplace_back([&] {
                go.arrive_and_wait();
                if (auto r = limited.reserve({{"ltd", 1}}, 0); r && limited.commit(*r, 0)) ++sold;
            });
    }
    cout << "20 concurrent buyers for 3 units: " << sold << " sold, " << limited.available("ltd", 0)
         << " left\n";
}
```

Output:

```text
asha: subtotal 650 [buy 2 get 1 bisc -50] [coupon SAVE10 -60], total 540
asha pays: paid
ravi holds the last mug; meera's checkout: out of stock
ravi pays: payment failed, mugs available 1
meera retries and pays: paid
kabir holds 3 tea, available now 0
20 minutes later, available 3
kabir pays late: expired, refund
20 concurrent buyers for 3 units: 3 sold, 0 left
```

Asha's biscuits are "buy 2 get 1": one of three is free (50 off), and the coupon then takes 10% of the remaining 600. Ravi's hold makes the last mug unavailable to Meera; when Ravi's payment fails, the hold is released and Meera's retry succeeds. Kabir's hold expired after 15 minutes, so the tea went back on the shelf; the late payment cannot commit and must be refunded. Twenty simultaneous buyers of three units sell exactly three, because checking availability and reserving happen under one lock. That run was repeated under ThreadSanitizer with no reports.

#### Why reserve instead of decrementing stock at once

Decrementing on add-to-cart would lock up stock in abandoned carts; decrementing only after payment would let two people pay for the last unit. A reservation with an expiry is the middle ground: short, released automatically, and committed only when money is captured. In a database the same logic is two columns and conditional updates, as discussed for [flash sales](#/concept/sysd.classics.e-commerce-and-flash-sales).

#### Interview checklist

- **Product, inventory, cart and order modeling**: `Product`, `Inventory` with on-hand and reserved counts, a cart as SKU lines, and `Order`.
- **Reserving stock with an expiry**: `reserve` with a 15-minute hold; `expireLocked` releases old holds on every call.
- **Preventing overselling under concurrent checkouts**: all lines checked and reserved under one lock; 20 buyers, 3 sold.
- **Discounts and coupons as rules**: `DiscountRule` with `BuyXGetYFree` and `PercentCoupon`, applied in order and never below zero.
- **Order and payment state transitions**: reserved, then paid, payment failed (release) or expired (refund).

Connects to: [handling concurrency in LLD](#/concept/lld.method.handling-concurrency-in-lld), [strategy](#/concept/oop.patterns-behavioral.strategy), [movie ticket booking](#/concept/lld.classics.movie-ticket-booking).

### questions
Q: When should stock be reserved in an online store?
A: At checkout, when the customer starts paying, and only for a short time such as 15 minutes. Reserving at add-to-cart ties up stock in abandoned carts, while decrementing only after payment lets two customers pay for the last unit.

Q: How do you prevent overselling when many customers check out at once?
A: Track on-hand and reserved counts and reserve every line of the order in one atomic step, only if on hand minus reserved covers each quantity. In memory that is a lock around the check and update; in a database, a conditional update that checks the row count.

Q: What happens to a reservation when payment fails or takes too long?
A: A failed payment releases the reservation immediately, and an unpaid reservation expires after its hold time and is released lazily or by a sweeper. If payment succeeds after expiry, the commit fails and the charge must be refunded.

Q: How would you model discounts and coupons?
A: As rules behind one interface that return a discount for the cart, such as buy X get Y free or a percentage coupon with a minimum order. A clear stacking policy applies them in order, for example promotions before coupons, and never lets the total go below zero.

Q: What states does an order pass through?
A: Stock reserved after checkout starts, then paid when the payment is captured and the reservation committed, then shipped and delivered. Alternatively payment failed, with the reservation released, or expired, with any late charge refunded.

## lld.classics.meeting-room-scheduler
name: "Meeting room scheduler"
importance: advanced
prereqs: [lld.method.clarifying-requirements]
scope: "bookings, conflicts, recurring meetings"

### simple
A meeting room scheduler lets people book a room for a time slot, see clashes, and set up meetings that repeat, like every Monday at ten. Each room has a calendar, and a new booking fits only if it doesn't overlap anything already written there. When your room is taken, a helpful scheduler suggests another one that is free and big enough.

### interview
- Entities: `Room` (name, capacity, its bookings), `Meeting` (title, organizer, attendee count, a **recurrence rule**), and a `Booking` (one occurrence of a meeting in a room).
- **Conflicts are interval overlaps**: half-open [start, end) intervals overlap when `a.start < b.end && b.start < a.end`. Keep each room's bookings in an ordered map by start time; checking a slot looks only at the booking just before its end, O(log n).
- **Recurring meetings**: a rule (weekly, a count or an end date) is expanded into concrete occurrences, then the whole series is checked and booked **all or nothing**. **Exceptions** (a skipped holiday, one moved instance) are stored with the rule and remove or replace single occurrences.
- **Suggesting another room** is a strategy: the smallest free room with enough capacity, or the nearest one, or one on the same floor.
- **Two people booking the same slot at once**: the conflict check and the insert run in one critical section (a lock per room or for the scheduler), or as a database insert guarded by an exclusion constraint.
- Open-ended recurrences ("every Monday forever") are expanded only for a window (say a year) and extended later.

### deep
#### Classes

```text
Scheduler "1" *-- "*" Room            Room: name, capacity, bookings: map<start, {end, meetingId}>
Scheduler "1" *-- "*" Meeting         Meeting: title, attendees, Weekly rule, room
Weekly: first start, duration, count, skipped occurrences     (the recurrence rule)
Scheduler --> RoomSuggester <<interface>>    SmallestFitting ..|> RoomSuggester
```

#### Code

```cpp
constexpr int kDay = 24 * 60;                    // times are minutes since day 0
string when(int t) {
    char buf[48];
    snprintf(buf, sizeof buf, "day %d %02d:%02d", t / kDay, t % kDay / 60, t % 60);
    return buf;
}
struct Slot { int start, end; };                 // [start, end)

struct Weekly {                                  // the recurrence rule
    int firstStart, minutes, count;
    set<int> skipped;                            // occurrence numbers cancelled as exceptions
    vector<Slot> occurrences() const {
        vector<Slot> out;
        for (int i = 0; i < count; ++i) {
            int start = firstStart + i * 7 * kDay;
            if (!skipped.count(i)) out.push_back({start, start + minutes});
        }
        return out;
    }
};

struct Room {
    string name;
    int capacity;
    map<int, pair<int, int>> bookings;           // start -> (end, meeting id)
    bool isFree(Slot s) const {
        auto it = bookings.lower_bound(s.end);   // first booking starting at or after s.end
        return it == bookings.begin() || prev(it)->second.first <= s.start;
    }
    bool isFree(const vector<Slot>& slots) const {
        return all_of(slots.begin(), slots.end(), [&](Slot s) { return isFree(s); });
    }
};

struct RoomSuggester {
    virtual ~RoomSuggester() = default;
    virtual const Room* suggest(const vector<Room>& rooms, const vector<Slot>& slots,
                                int people) = 0;
};
struct SmallestFitting : RoomSuggester {         // don't waste the big hall on six people
    const Room* suggest(const vector<Room>& rooms, const vector<Slot>& slots,
                        int people) override {
        const Room* best = nullptr;
        for (auto& r : rooms)
            if (r.capacity >= people && r.isFree(slots) && (!best || r.capacity < best->capacity))
                best = &r;
        return best;
    }
};

struct Meeting { int id; string title; int people; Weekly rule; string room; };

class Scheduler {
    vector<Room> rooms;
    map<int, Meeting> meetings;
    unique_ptr<RoomSuggester> suggester;
    mutex m;
    int nextId = 1;
    Room& room(const string& name) {
        for (auto& r : rooms) if (r.name == name) return r;
        throw out_of_range("no room " + name);
    }
public:
    Scheduler(vector<Room> r, unique_ptr<RoomSuggester> s)
        : rooms(std::move(r)), suggester(std::move(s)) {}
    string book(const string& title, int people, Weekly rule, const string& roomName) {
        lock_guard lock(m);                      // check and insert as one step
        auto slots = rule.occurrences();
        Room& r = room(roomName);
        if (r.capacity < people) return title + ": " + roomName + " is too small";
        if (!r.isFree(slots)) {
            const Room* alt = suggester->suggest(rooms, slots, people);
            return title + ": " + roomName + " is taken" +
                   (alt ? ", try " + alt->name : ", no room is free");
        }
        int id = nextId++;
        for (Slot s : slots) r.bookings[s.start] = {s.end, id};   // the whole series or nothing
        meetings[id] = {id, title, people, std::move(rule), roomName};
        return title + ": booked " + roomName + " x" + to_string(slots.size()) + " (id " +
               to_string(id) + ")";
    }
    string skip(int meetingId, int occurrence) { // an exception: cancel one instance
        lock_guard lock(m);
        Meeting& mt = meetings.at(meetingId);
        int start = mt.rule.firstStart + occurrence * 7 * kDay;
        mt.rule.skipped.insert(occurrence);
        room(mt.room).bookings.erase(start);
        return mt.title + " on " + when(start) + " cancelled";
    }
};

int main() {
    Scheduler cal({{"Focus", 4}, {"Lake", 8}, {"Hall", 30}}, make_unique<SmallestFitting>());
    int monday10 = 0 * kDay + 10 * 60;
    cout << cal.book("standup", 6, {monday10, 30, 4, {}}, "Lake") << "\n";
    Weekly review{14 * kDay + 10 * 60 + 15, 45, 1, {}};    // day 14, 10:15 to 11:00
    cout << cal.book("design review", 6, review, "Lake") << "\n";
    cout << cal.book("design review", 6, review, "Focus") << "\n";
    cout << cal.skip(1, 2) << "\n";                        // the third Monday is a holiday
    cout << cal.book("design review", 6, review, "Lake") << "\n";
    Weekly wednesdays{2 * kDay + 15 * 60, 60, 3, {1}};     // 3 Wednesdays, the second skipped
    cout << cal.book("1:1", 2, wednesdays, "Focus") << "\n";

    atomic<int> won = 0;
    latch go(2);
    {
        vector<jthread> people;                            // two people, same slot, same instant
        for (string who : {"asha", "ravi"})
            people.emplace_back([&, who] {
                go.arrive_and_wait();
                string r = cal.book(who + "'s sync", 3, {9 * kDay + 14 * 60, 60, 1, {}}, "Focus");
                if (r.find("booked") != string::npos) ++won;
            });
    }
    cout << "asha and ravi race for Focus on day 9: " << won << " booked\n";
}
```

Output:

```text
standup: booked Lake x4 (id 1)
design review: Lake is taken, try Hall
design review: Focus is too small
standup on day 14 10:00 cancelled
design review: booked Lake x1 (id 2)
1:1: booked Focus x2 (id 3)
asha and ravi race for Focus on day 9: 1 booked
```

The standup books four Mondays in Lake as one series. The review on day 14 overlaps the third standup, so Lake is refused, and the suggester offers Hall: Focus would be smaller, but it cannot hold six (asking for it directly is refused too). Once the third standup is cancelled as an exception, the review fits in Lake. The Wednesday series books only two occurrences because the second is skipped by its rule. In the race, exactly one of the two simultaneous bookings wins; this was repeated under ThreadSanitizer with no reports.

#### Keeping conflict checks fast

A room's bookings never overlap each other, so in a map ordered by start time only one booking can clash with a new slot: the last one starting before the slot's end. `lower_bound` finds it in O(log n), so booking a series of k occurrences costs O(k log n). This is the same structure as [calendar booking designs](#/concept/dsa.intervals.calendar-booking-designs); counting overlaps for "how many rooms do we need?" is a [sweep line](#/concept/dsa.intervals.sweep-line) problem instead.

#### Recurrence and exceptions

Store the rule, not just its expansion: the rule answers "which days?" for any window, and exceptions attach to it (a skipped occurrence number here; real calendars also store moved occurrences as overrides with their own time). Editing "this and following occurrences" splits the series into two rules at that date. Time zones and daylight saving matter in production: store the rule in the organizer's local time and convert each occurrence, so "10:00 every Monday" stays at 10:00 across clock changes.

#### Interview checklist

- **Room, meeting, booking and recurrence rule modeling**: `Room` with its bookings, `Meeting` with a `Weekly` rule, one booking per occurrence.
- **Conflict detection as interval overlap, with a structure that stays fast**: half-open slots and `Room::isFree` using `lower_bound`.
- **Expanding recurring meetings and handling exceptions to them**: `Weekly::occurrences` with `skipped`; `skip` cancels one instance and frees its slot.
- **A strategy for suggesting another room**: `RoomSuggester` with `SmallestFitting`.
- **Two people booking the same slot at the same moment**: `book` checks and inserts under one lock; the race produces one booking.

Connects to: [hotel booking](#/concept/lld.classics.hotel-booking), [strategy](#/concept/oop.patterns-behavioral.strategy), [sweep line](#/concept/dsa.intervals.sweep-line).

### questions
Q: How do you detect a booking conflict efficiently?
A: Treat bookings as half-open intervals and keep each room's bookings in a map ordered by start time. Since a room's bookings never overlap each other, only the booking just before the new slot's end can clash, so one lower_bound lookup answers the question in O(log n).

Q: How would you store a recurring meeting?
A: Store the recurrence rule, such as weekly on Monday at 10:00 for 10 weeks, plus a list of exceptions, and expand it into concrete occurrences for booking and display. Keeping the rule lets you edit the series and answer queries for any date range.

Q: How do you handle an exception to a recurring meeting, such as a holiday?
A: Record the exception on the rule, for example as a skipped occurrence or an override with a new time, and remove or move just that occurrence's booking. The rest of the series stays linked to the same meeting.

Q: How would you suggest another room when the requested one is taken?
A: Use a suggestion strategy that filters rooms with enough capacity that are free for every occurrence, then ranks them, for example smallest first so large rooms stay available, or nearest to the requested one. Other ranking rules become new strategies.

Q: What happens if two people book the same room and slot at the same moment?
A: Without care both could see it free and both insert. The conflict check and the insert must be one atomic step, using a lock around the room or scheduler in memory, or an exclusion constraint or conditional insert in a database.

## lld.classics.task-scheduler
name: "Task scheduler"
importance: advanced
prereqs: [lld.method.clarifying-requirements]
scope: "delayed and recurring jobs"

### simple
A task scheduler runs pieces of work later: once after a delay, at a fixed time, or again and again on a schedule, like an alarm clock that can hold many alarms. It keeps the alarms sorted by when they ring next, sleeps until the earliest one, and hands the work to a team of worker threads. It also has to decide what to do when it wakes up late and has missed some alarms.

### interview
- **Schedule types**: one-off (run once at time t), **fixed rate** (run at t, t + p, t + 2p, ..., measured from the planned start, so no drift) and **fixed delay** (run p after the previous run *finished*, so slow runs push later ones back).
- **Priority queue** (min-heap) of (next run time, task id); the earliest task is always on top, O(log n) to add or pop.
- **Dispatch loop**: one thread waits on a condition variable until the top task is due (or a new, earlier task arrives), pops every due task and submits it to a **worker thread pool**, so slow tasks never delay the dispatcher.
- **Cancellation**: a heap can't remove from the middle cheaply, so mark the task cancelled and skip it when it reaches the top (lazy deletion).
- **A task that throws**: catch it in the wrapper, record the failure, and apply a policy: keep the schedule, retry with backoff, or cancel after repeated failures. Never let the exception kill a worker thread.
- **Clock issues**: after a pause (sleep, GC, a busy machine), fixed-rate tasks have missed runs: run once and skip to the next future slot (coalesce), or catch up every run. Use a monotonic clock for delays, since wall-clock time can jump.

### deep
#### Classes

```text
Scheduler *-- tasks: id -> Task            Task: name, Kind (Once, FixedRate, FixedDelay), period,
Scheduler *-- due: min-heap of (time, id)        next run, cancelled, failures, function
Scheduler --> Clock <<interface>>          FakeClock (tests), SteadyClock (real)
Scheduler --> Executor <<interface>>       InlineExecutor (tests), ThreadPool (real)
Scheduler: runDue() = one step of the dispatch loop; loop() = the dispatcher thread
```

#### Code

```cpp
using Ms = long long;
struct Clock {
    virtual ~Clock() = default;
    virtual Ms now() const = 0;
};
struct FakeClock : Clock {
    Ms t = 0;
    Ms now() const override { return t; }
};
struct SteadyClock : Clock {                     // monotonic: never jumps backwards
    Ms now() const override {
        auto d = chrono::steady_clock::now().time_since_epoch();
        return chrono::duration_cast<chrono::milliseconds>(d).count();
    }
};

struct Executor {
    virtual ~Executor() = default;
    virtual void submit(function<void()> job) = 0;
};
struct InlineExecutor : Executor {               // runs jobs on the caller's thread (tests)
    void submit(function<void()> job) override { job(); }
};
class ThreadPool : public Executor {
    deque<function<void()>> jobs;
    mutex m;
    condition_variable ready;
    bool stopping = false;
    vector<jthread> workers;
public:
    explicit ThreadPool(int n) {
        for (int i = 0; i < n; ++i)
            workers.emplace_back([this] {
                for (;;) {
                    function<void()> job;
                    {
                        unique_lock lock(m);
                        ready.wait(lock, [&] { return stopping || !jobs.empty(); });
                        if (jobs.empty()) return;
                        job = std::move(jobs.front());
                        jobs.pop_front();
                    }
                    job();
                }
            });
    }
    void submit(function<void()> job) override {
        { lock_guard lock(m); jobs.push_back(std::move(job)); }
        ready.notify_one();
    }
    void shutdown() {                            // finish queued jobs, then join
        { lock_guard lock(m); stopping = true; }
        ready.notify_all();
        workers.clear();
    }
};

enum class Kind { Once, FixedRate, FixedDelay };
struct Task {
    int id;
    string name;
    Kind kind;
    Ms period, nextRun;
    function<void()> fn;
    bool cancelled = false;
    int failuresInARow = 0;
};

class Scheduler {
    const Clock& clock;
    Executor& executor;
    map<int, shared_ptr<Task>> tasks;
    priority_queue<pair<Ms, int>, vector<pair<Ms, int>>, greater<>> due;   // (time, id)
    mutex m;
    condition_variable changed;
    int nextId = 1;
    void run(const shared_ptr<Task>& t, Ms plannedFor) {
        bool failed = false;
        try {
            t->fn();
        } catch (const exception& e) {           // a failure never kills a worker
            failed = true;
            cout << "  " << t->name << " failed: " << e.what() << "\n";
        }
        lock_guard lock(m);
        t->failuresInARow = failed ? t->failuresInARow + 1 : 0;
        if (t->failuresInARow == 2) {            // policy: stop after two failures in a row
            t->cancelled = true;
            cout << "  " << t->name << " cancelled after 2 failures in a row\n";
        }
        if (t->cancelled || t->kind == Kind::Once) return;
        Ms now = clock.now(), next;
        if (t->kind == Kind::FixedDelay) {
            next = now + t->period;              // measured from the end of this run
        } else {
            next = plannedFor + t->period;       // measured from the plan: no drift
            if (next <= now)                     // missed runs: skip to the next future slot
                next = plannedFor + t->period * ((now - plannedFor) / t->period + 1);
        }
        t->nextRun = next;
        due.push({next, t->id});
        changed.notify_one();
    }
public:
    Scheduler(const Clock& c, Executor& e) : clock(c), executor(e) {}
    int schedule(string name, Kind kind, Ms firstRun, Ms period, function<void()> fn) {
        lock_guard lock(m);
        int id = nextId++;
        tasks[id] = make_shared<Task>(
            Task{id, std::move(name), kind, period, firstRun, std::move(fn)});
        due.push({firstRun, id});
        changed.notify_one();                    // it may be earlier than what the loop waits for
        return id;
    }
    void cancel(int id) {                        // lazy: skipped when it reaches the top
        lock_guard lock(m);
        tasks.at(id)->cancelled = true;
    }
    int runDue() {                               // one step of the dispatch loop
        vector<pair<shared_ptr<Task>, Ms>> ready;
        {
            lock_guard lock(m);
            Ms now = clock.now();
            while (!due.empty() && due.top().first <= now) {
                auto [at, id] = due.top();
                due.pop();
                if (!tasks[id]->cancelled) ready.push_back({tasks[id], at});
            }
        }
        for (auto& [t, at] : ready) executor.submit([this, t, at] { run(t, at); });
        return int(ready.size());
    }
    void loop(stop_token stop) {                 // the dispatcher thread
        while (!stop.stop_requested()) {
            {
                unique_lock lock(m);
                Ms wait = due.empty() ? 50 : max<Ms>(0, due.top().first - clock.now());
                changed.wait_for(lock, chrono::milliseconds(wait));
            }
            runDue();
        }
    }
};

int main() {
    FakeClock clock;                             // part 1: virtual time, tasks run inline
    InlineExecutor inlineRunner;
    Scheduler s(clock, inlineRunner);
    auto note = [&](const string& what) { cout << "t=" << clock.t << " " << what << "\n"; };
    s.schedule("report", Kind::Once, 5, 0, [&] { note("report (once)"); });
    s.schedule("heartbeat", Kind::FixedRate, 0, 10, [&] { note("heartbeat (every 10)"); });
    s.schedule("sync", Kind::FixedDelay, 0, 10, [&] {
        note("sync starts, takes 3");
        clock.t += 3;                            // the work takes time
    });
    s.schedule("flaky", Kind::FixedRate, 12, 10, [&] { throw runtime_error("disk full"); });
    int reminder = s.schedule("reminder", Kind::Once, 25, 0, [&] { note("reminder"); });
    for (Ms t = 0; t <= 30; ++t) {
        clock.t = max(clock.t, t);
        if (t == 20) s.cancel(reminder);
        s.runDue();
    }
    cout << "-- the process is paused from t=30 to t=75 --\n";
    clock.t = 75;
    s.runDue();
    for (Ms t = 76; t <= 80; ++t) {
        clock.t = max(clock.t, t);
        s.runDue();
    }

    ThreadPool pool(3);                          // part 2: real time and worker threads
    SteadyClock steady;
    Scheduler real(steady, pool);
    atomic<int> once = 0, repeats = 0, cancelledRuns = 0;
    Ms start = steady.now();
    for (int i = 0; i < 20; ++i)
        real.schedule("job", Kind::Once, start + i % 5 * 5, 0, [&] { ++once; });
    real.schedule("tick", Kind::FixedRate, start, 2, [&] { ++repeats; });
    int late = real.schedule("late", Kind::Once, start + 30, 0, [&] { ++cancelledRuns; });
    real.cancel(late);
    {
        jthread dispatcher([&](stop_token st) { real.loop(st); });
        this_thread::sleep_for(chrono::milliseconds(100));
    }                                            // stop the dispatcher first
    pool.shutdown();                             // then let workers finish
    cout << "real time: one-off jobs run " << once << " of 20, cancelled job runs "
         << cancelledRuns << "\n";
    cout << "fixed-rate tick ran more than 10 times: " << boolalpha << (repeats > 10) << "\n";
}
```

Output:

```text
t=0 heartbeat (every 10)
t=0 sync starts, takes 3
t=5 report (once)
t=10 heartbeat (every 10)
  flaky failed: disk full
t=13 sync starts, takes 3
t=20 heartbeat (every 10)
  flaky failed: disk full
  flaky cancelled after 2 failures in a row
t=26 sync starts, takes 3
t=30 heartbeat (every 10)
-- the process is paused from t=30 to t=75 --
t=75 sync starts, takes 3
t=78 heartbeat (every 10)
t=80 heartbeat (every 10)
real time: one-off jobs run 20 of 20, cancelled job runs 0
fixed-rate tick ran more than 10 times: true
```

Read part 1 against the three schedule types. The heartbeat runs at 0, 10, 20 and 30, on its plan. The sync task takes 3 units, so a fixed delay of 10 after each finish gives starts at 0, 13 and 26. The flaky task fails at 12 and 22 and is then cancelled by the two-failures policy; the reminder was cancelled at 20 and never runs. After the pause, both overdue tasks run once, in the order they were due: sync at 75 (busy until 78, since the inline runner is a single worker), then the heartbeat at 78. The heartbeat skips its missed slots (40 to 70) and lines up again at 80, while sync, which only cares about delays, is next due 10 after it finished, at 88. Part 2 uses real threads: the dispatcher sleeps until the next due time and three workers run the jobs; it was repeated under ThreadSanitizer with no reports.

#### Missed runs and drift

| policy | after a pause from 30 to 75, heartbeat every 10 | use when |
|---|---|---|
| coalesce (this design) | one late run, next at 80 | the latest state matters (heartbeats, cache refresh) |
| catch up | runs for 40, 50, 60 and 70, back to back | every run matters (billing periods) |
| fixed delay | one late run, next 10 after it finishes | spacing between runs matters |

Computing the next fixed-rate run as "planned time + period" rather than "now + period" is what prevents **drift**: small delays in each run would otherwise add up, and a job meant to run at every hour on the hour would slowly slide.

#### Interview checklist

- **Task and schedule types: one-off, fixed rate, fixed delay**: `Kind` and the next-run rule in `run`.
- **A priority queue ordered by next run time**: `due`, a min-heap of (time, id).
- **The dispatch loop and the worker thread pool**: `loop` waits on `changed` until the top is due and `runDue` submits to the `Executor`; `ThreadPool` runs jobs on workers.
- **Cancellation and handling a task that throws**: lazy cancellation skipped at the top of the heap; exceptions caught per run, with a two-failures policy.
- **Clock issues: missed runs and drift**: coalescing missed fixed-rate runs, planned-time arithmetic against drift, a monotonic clock, and an injected clock for tests.

Connects to: [thread pools](#/concept/conc.patterns.thread-pools), [scheduling with heaps](#/concept/dsa.heaps.scheduling-with-heaps), [condition variables](#/concept/conc.locks.condition-variables).

### questions
Q: What is the difference between fixed-rate and fixed-delay scheduling?
A: Fixed rate plans runs at the start time plus multiples of the period, regardless of how long each run takes, so the schedule does not drift. Fixed delay waits the period after the previous run finishes, so a slow run pushes every later run back.

Q: Why use a priority queue in a task scheduler?
A: The dispatcher always needs the task with the earliest next run time, and a min-heap gives it in O(1) with O(log n) inserts and removals. The dispatcher can then sleep exactly until that time instead of scanning all tasks.

Q: How do you cancel a task that is already in the heap?
A: Mark it cancelled in a map by id and leave it in the heap; when it reaches the top, the dispatcher sees the flag and discards it. This lazy deletion avoids an expensive search inside the heap.

Q: What should happen when a scheduled task throws an exception?
A: The wrapper that runs it catches the exception, records the failure and applies a policy, such as keeping the schedule, retrying with backoff, or cancelling after repeated failures. The exception must never escape into the worker thread, which would terminate the program or silently stop the pool.

Q: What should a scheduler do about runs it missed while the process was paused?
A: Choose and document a policy: coalesce by running once and moving to the next future slot, which suits heartbeats and refreshes, or catch up by running every missed occurrence, which suits jobs where each period matters. Measure delays with a monotonic clock so wall-clock jumps don't cause false misses.

## lld.classics.stack-overflow
name: "Stack Overflow"
importance: advanced
prereqs: [lld.method.clarifying-requirements]
scope: "questions, answers, votes, reputation"

### simple
A question-and-answer site lets people ask questions with tags, answer them, comment, and vote, with the asker accepting the answer that helped. Votes turn into reputation points, and reputation unlocks privileges, the way a library trusts regular members with more books. The design is mostly about keeping votes, reputation and permissions consistent.

### interview
- Entities: `User` (reputation), `Question` (title, body, tags, answers, accepted answer, closed), `Answer`, `Comment`, `Tag`, and `Vote` (one per user per post, changeable). Questions and answers share a `Post` base (author, body, score, votes, comments).
- **Voting rules**: one vote per user per post; no voting on your own posts; changing a vote first reverses the old one's effect. Each vote changes the post's score and the author's reputation (and a downvote on an answer costs the voter a little).
- **Reputation events** in one place (a rules table): upvote, downvote, accept; so tuning the numbers never touches the voting code.
- **Permissions by reputation**: a threshold per action (upvote, comment on others' posts, downvote, close), checked before the action.
- **Search**: an index from tag to question ids and from title words to question ids; intersect for "tag cpp and word vector"; rank by score or recency.
- **Extensions**: moderation (flags hide a post after a threshold, close votes, duplicates), badges awarded by listeners on events ([observer](#/concept/oop.patterns-behavioral.observer)), bounties, edit history.

### deep
#### Classes

```text
Post <<abstract>>: id, author, body, score, votes (user -> +1/-1), comments, flags
Question --|> Post        title, tags, answers, accepted, closed
Answer --|> Post          question
Site *-- users, questions, answers; tag index, word index
Site --> Rules            reputation per event, thresholds per privilege
Site o-- "*" SiteListener <<interface>>     Badges ..|> SiteListener
```

#### Code

```cpp
struct Comment { int author; string text; };
struct Post {
    int id, author;
    string body;
    int score = 0;
    map<int, int> votes;                         // voter -> +1 or -1
    vector<Comment> comments;
    set<int> flaggedBy;
    virtual ~Post() = default;
    virtual bool isAnswer() const = 0;
    bool hidden() const { return flaggedBy.size() >= 3; }
};
struct Answer : Post { int question; bool isAnswer() const override { return true; } };
struct Question : Post {
    string title;
    set<string> tags;
    vector<int> answers;
    int accepted = 0;
    string closedAs;
    bool isAnswer() const override { return false; }
};
struct User { int id; string name; int rep; };

struct Rules {                                   // tunable numbers, kept out of the logic
    int upvoted = 10, downvoted = -2, downvoteCost = -1, accepted = 15, accepter = 2;
    map<string, int> needs = {{"upvote", 15}, {"comment", 50}, {"downvote", 125}, {"close", 3000}};
};

struct SiteListener {                            // observer: badges, notifications, audits
    virtual ~SiteListener() = default;
    virtual void onAccepted(const User& answerer) = 0;
};
struct Badges : SiteListener {
    set<int> firstAccepted;
    void onAccepted(const User& u) override {
        if (firstAccepted.insert(u.id).second)
            cout << "  badge: " << u.name << " earns First accepted answer\n";
    }
};

class Site {
    Rules rules;
    map<int, User> users;
    map<int, unique_ptr<Post>> posts;
    map<string, set<int>> byTag, byWord;
    vector<SiteListener*> listeners;
    int nextId = 1;
    static vector<string> words(const string& s) {
        vector<string> out;
        string w;
        for (char c : s + " ") {
            if (isalnum((unsigned char)c) || c == '+') w += char(tolower((unsigned char)c));
            else if (!w.empty()) { out.push_back(w); w.clear(); }
        }
        return out;
    }
    void addRep(int user, int delta) { users.at(user).rep = max(1, users.at(user).rep + delta); }
    string denied(const User& u, const string& action) const {
        int need = rules.needs.at(action);
        if (u.rep >= need) return "";
        return u.name + " needs " + to_string(need) + " reputation to " + action;
    }
public:
    void join(User u) { users[u.id] = u; }
    void listen(SiteListener& l) { listeners.push_back(&l); }
    int rep(int user) const { return users.at(user).rep; }
    int ask(int author, const string& title, const string& body, set<string> tags) {
        auto q = make_unique<Question>();
        q->id = nextId++;
        q->author = author;
        q->body = body;
        q->title = title;
        q->tags = tags;
        for (auto& t : tags) byTag[t].insert(q->id);
        for (auto& w : words(title)) byWord[w].insert(q->id);
        int id = q->id;
        posts[id] = std::move(q);
        return id;
    }
    int answer(int author, int question, const string& body) {
        auto& q = dynamic_cast<Question&>(*posts.at(question));
        if (!q.closedAs.empty()) throw runtime_error("question is closed");
        auto a = make_unique<Answer>();
        a->id = nextId++;
        a->author = author;
        a->body = body;
        a->question = question;
        q.answers.push_back(a->id);
        int id = a->id;
        posts[id] = std::move(a);
        return id;
    }
    string vote(int voter, int postId, int value) {   // +1, -1, or 0 to remove
        Post& p = *posts.at(postId);
        const User& u = users.at(voter);
        if (p.author == voter) return u.name + " cannot vote on their own post";
        if (value == 1) if (auto d = denied(u, "upvote"); !d.empty()) return d;
        if (value == -1) if (auto d = denied(u, "downvote"); !d.empty()) return d;
        auto apply = [&](int v, int sign) {       // one vote's effect, or its reversal
            p.score += sign * v;
            addRep(p.author, sign * (v > 0 ? rules.upvoted : rules.downvoted));
            if (v < 0 && p.isAnswer()) addRep(voter, sign * rules.downvoteCost);
        };
        if (auto it = p.votes.find(voter); it != p.votes.end()) {
            apply(it->second, -1);                // changing a vote undoes the old one first
            p.votes.erase(it);
        }
        if (value != 0) {
            apply(value, +1);
            p.votes[voter] = value;
        }
        return "ok";
    }
    string accept(int asker, int answerId) {
        auto& a = dynamic_cast<Answer&>(*posts.at(answerId));
        auto& q = dynamic_cast<Question&>(*posts.at(a.question));
        if (q.author != asker) return "only the asker can accept";
        if (q.accepted) return "an answer is already accepted";
        q.accepted = answerId;
        addRep(a.author, rules.accepted);
        addRep(asker, rules.accepter);
        for (auto* l : listeners) l->onAccepted(users.at(a.author));
        return "ok";
    }
    string comment(int author, int postId, const string& text) {
        Post& p = *posts.at(postId);
        if (p.author != author)                   // your own posts are always open to you
            if (auto d = denied(users.at(author), "comment"); !d.empty()) return d;
        p.comments.push_back({author, text});
        return "ok";
    }
    string close(int moderator, int questionId, const string& reason) {
        if (auto d = denied(users.at(moderator), "close"); !d.empty()) return d;
        dynamic_cast<Question&>(*posts.at(questionId)).closedAs = reason;
        return "ok";
    }
    void flag(int user, int postId) { posts.at(postId)->flaggedBy.insert(user); }
    vector<string> search(const set<string>& tags, const string& text) const {
        optional<set<int>> hits;
        auto keep = [&](const set<int>& ids) {
            if (!hits) { hits = ids; return; }
            set<int> both;
            set_intersection(hits->begin(), hits->end(), ids.begin(), ids.end(),
                             inserter(both, both.end()));
            hits = both;
        };
        for (auto& t : tags) keep(byTag.count(t) ? byTag.at(t) : set<int>{});
        for (auto& w : words(text)) keep(byWord.count(w) ? byWord.at(w) : set<int>{});
        vector<string> out;
        for (int id : hits.value_or(set<int>{})) {
            auto& q = dynamic_cast<const Question&>(*posts.at(id));
            string closed = q.closedAs.empty() ? "" : " [closed: " + q.closedAs + "]";
            if (!q.hidden()) out.push_back(q.title + closed);
        }
        return out;
    }
};

int main() {
    Site site;
    Badges badges;
    site.listen(badges);
    enum { asha = 1, ravi, meera, kabir };
    site.join({asha, "asha", 1});
    site.join({ravi, "ravi", 200});
    site.join({meera, "meera", 20});
    site.join({kabir, "kabir", 3500});
    auto say = [](const string& what, const string& r) { cout << what << ": " << r << "\n"; };

    int q = site.ask(asha, "How do I reverse a vector in C++?", "...", {"c++", "stl"});
    int a1 = site.answer(meera, q, "Use std::reverse(v.begin(), v.end()).");
    int a2 = site.answer(ravi, q, "std::reverse, or build from rbegin() and rend().");
    say("asha upvotes ravi's answer", site.vote(asha, a2, +1));
    say("meera upvotes ravi's answer", site.vote(meera, a2, +1));
    say("ravi downvotes meera's answer", site.vote(ravi, a1, -1));
    say("ravi changes it to an upvote", site.vote(ravi, a1, +1));
    say("meera upvotes own answer", site.vote(meera, a1, +1));
    say("asha accepts ravi's answer", site.accept(asha, a2));
    say("asha comments on own question", site.comment(asha, q, "Thanks, both work."));
    say("meera comments on ravi's answer", site.comment(meera, a2, "Nice."));
    int dup = site.ask(meera, "Reverse a vector in C++", "...", {"c++"});
    say("meera closes the duplicate", site.close(meera, dup, "duplicate"));
    say("kabir closes the duplicate", site.close(kabir, dup, "duplicate"));
    for (auto& r : site.search({"c++"}, "vector")) cout << "search [c++] vector: " << r << "\n";
    for (int flagger : {ravi, kabir, asha}) site.flag(flagger, dup);
    cout << "after three flags, search finds " << site.search({"c++"}, "vector").size() << "\n";
    cout << "reputation: asha " << site.rep(asha) << ", ravi " << site.rep(ravi) << ", meera "
         << site.rep(meera) << "\n";
}
```

Output:

```text
asha upvotes ravi's answer: asha needs 15 reputation to upvote
meera upvotes ravi's answer: ok
ravi downvotes meera's answer: ok
ravi changes it to an upvote: ok
meera upvotes own answer: meera cannot vote on their own post
  badge: ravi earns First accepted answer
asha accepts ravi's answer: ok
asha comments on own question: ok
meera comments on ravi's answer: meera needs 50 reputation to comment
meera closes the duplicate: meera needs 3000 reputation to close
kabir closes the duplicate: ok
search [c++] vector: How do I reverse a vector in C++?
search [c++] vector: Reverse a vector in C++ [closed: duplicate]
after three flags, search finds 1
reputation: asha 3, ravi 225, meera 30
```

Follow the reputation. Ravi starts at 200: an upvote on the answer (+10), the downvote on Meera's answer (−1, its cost to the voter), undone when the vote changes (+1), and acceptance (+15) end at 225. Meera starts at 20: the downvote (−2), its reversal (+2) and the upvote (+10) end at 30, still below the 50 needed to comment on others' posts. Asha gains 2 for accepting. The duplicate is closed only by the user with the privilege, and once three users flag it, it drops out of search.

#### Where the rules live

All numbers sit in `Rules`: reputation per event and the threshold per privilege. The real site uses similar ideas with its own, occasionally changed values, which is exactly why they belong in data rather than in `if` statements. Votes are stored per user, so changing or removing a vote can reverse its exact effect, and a nightly job can recompute reputation from the vote history if the rules change.

#### Extensions

- **Badges** are listeners on events (accepted answer, score reached 10, 100 days active); new badges are new listeners, and the site code doesn't change.
- **Moderation**: flags from different users hide a post at a threshold and queue it for review; close votes from several users with the privilege close a question; a duplicate links to its original.
- **Scale**: counters (score, reputation) are updated in the same transaction as the vote row; search moves to a search engine fed by events; a feed of "hot" questions is a ranking job.

#### Interview checklist

- **User, question, answer, comment, tag and vote modeling**: `Post` base with `Question` and `Answer`, comments on posts, tags on questions, votes as voter-to-value maps.
- **Voting rules and reputation updates**: one vote per user per post, no self-votes, reversal before change, reputation from `Rules`.
- **Permissions that depend on reputation**: `Rules::needs` and `denied` before upvote, downvote, comment and close.
- **Searching by tags and keywords**: tag and title-word indexes intersected in `search`.
- **Moderation (closing, flagging) and badges as extensions**: `close`, flags that hide a post, and a `Badges` listener.

Connects to: [observer](#/concept/oop.patterns-behavioral.observer), [identifying entities](#/concept/lld.method.identifying-entities), [search systems](#/concept/sysd.data.search-systems).

### questions
Q: How would you model questions, answers and comments?
A: A post base class holds what both share, such as author, body, score, votes and comments, and question and answer derive from it: a question adds a title, tags, its answers, an accepted answer and a closed state; an answer refers to its question. Comments are small records attached to any post.

Q: How do you handle a user changing their vote?
A: Store votes per user per post, and when a vote changes, reverse the old vote's effect on the score and on reputation before applying the new one. This keeps scores and reputation exactly consistent with the stored votes.

Q: How would you implement privileges that depend on reputation?
A: Keep a table of thresholds per action, such as upvoting, commenting on others' posts, downvoting and closing, and check the user's reputation against it before performing the action. Keeping the numbers in data makes them easy to tune.

Q: How would you search questions by tag and keyword?
A: Maintain an index from each tag to question ids and from each title word to question ids, intersect the sets for all requested tags and words, and rank the results by score or recency. At scale this moves to a dedicated search engine.

Q: How would badges fit into the design without cluttering the core?
A: Publish events such as an answer being accepted or a post reaching a score, and let badge listeners subscribe and award badges when their conditions are met. Adding a badge means adding a listener, not changing the voting or answering code.

## lld.classics.car-rental-and-amazon-locker
name: "Car rental and Amazon locker"
importance: advanced
prereqs: [lld.method.clarifying-requirements]
scope: "reservations and slot assignment"

### simple
A car rental desk and a parcel locker wall look different but solve the same problem: hand out one item from a pool for a stretch of time, then take it back. A rental gives a customer a car of the chosen type for some days; a locker gives a parcel the smallest box it fits in until someone collects it. Both must release items people never come for, and never give one item to two people.

### interview
- **Shared core**: a pool of resources (cars, lockers), each with a calendar of reservations; a `Reservation` has a resource, a time slot, a holder, a status and a deadline. Only the resource type and the assignment rule differ.
- **Assignment strategies**: cars are chosen by type and free dates (any free car of the requested type, perhaps the least used); lockers by **smallest free size that fits**, so big lockers stay free for big parcels.
- **Expiry**: a car not picked up by the deadline is a **no-show** (release the car, charge a fee); a parcel not collected within a few days goes **back to the sender** (release the locker, notify).
- **Concurrency**: choosing a free resource and recording the reservation happen in one critical section, so two customers can't both get the last car or locker.
- **Fees and notifications**: rental price per day by type, a no-show fee, late-return fees; pickup codes and reminders for lockers; notifications through one interface.
- Generic code (a template over the resource type) or a common interface lets both systems share reservation, expiry and locking logic.

### deep
#### Classes

```text
ReservationBook<R, Need> *-- resources: vector<R>, a calendar per resource, reservations
ReservationBook --> Assigner<R, Need> <<interface>>    choose(free resources, need)
ReservationBook --> Notifier <<interface>>
Car rental:  R = Car {plate, type, daily rate}, Need = type,  FirstOfType ..|> Assigner
Lockers:     R = Locker {id, size},             Need = size,  SmallestFit ..|> Assigner
Reservation: resource, [start, end), holder, Status (reserved, in use, done, expired), deadline
```

#### Code

```cpp
struct Slot { int start, end; };                 // days, [start, end)
enum class Status { Reserved, InUse, Done, Expired };
struct Reservation { int id, resource; Slot slot; string holder; Status status; int deadline; };

struct Notifier {
    virtual ~Notifier() = default;
    virtual void send(const string& to, const string& message) = 0;
};
struct PrintNotifier : Notifier {
    void send(const string& to, const string& m) override {
        cout << "  notify " << to << ": " << m << "\n";
    }
};

template <class R, class Need>
struct Assigner {                                // strategy: which free resource to use
    virtual ~Assigner() = default;
    virtual optional<size_t> choose(const vector<R>& all, const vector<size_t>& free,
                                    const Need& need) const = 0;
};

template <class R, class Need>
class ReservationBook {                          // shared by car rental and lockers
    vector<R> resources;
    vector<map<int, int>> calendars;             // per resource: start -> end
    map<int, Reservation> reservations;
    unique_ptr<Assigner<R, Need>> assigner;
    mutable mutex m;
    int nextId = 1;
    bool isFree(size_t r, Slot s) const {
        auto it = calendars[r].lower_bound(s.end);
        return it == calendars[r].begin() || prev(it)->second <= s.start;
    }
    void release(Reservation& r, Status why) {
        calendars[r.resource].erase(r.slot.start);
        r.status = why;
    }
public:
    ReservationBook(vector<R> rs, unique_ptr<Assigner<R, Need>> a)
        : resources(std::move(rs)), calendars(resources.size()), assigner(std::move(a)) {}
    optional<int> reserve(const Need& need, Slot slot, const string& holder, int deadline) {
        lock_guard lock(m);                      // find, choose and record as one step
        vector<size_t> free;
        for (size_t i = 0; i < resources.size(); ++i)
            if (isFree(i, slot)) free.push_back(i);
        auto pick = assigner->choose(resources, free, need);
        if (!pick) return nullopt;
        int id = nextId++;
        calendars[*pick][slot.start] = slot.end;
        reservations[id] = {id, int(*pick), slot, holder, Status::Reserved, deadline};
        return id;
    }
    bool begin(int id) {                         // the car is picked up
        lock_guard lock(m);
        auto& r = reservations.at(id);
        if (r.status != Status::Reserved) return false;
        r.status = Status::InUse;
        return true;
    }
    bool finish(int id) {                        // the car is returned or the parcel collected
        lock_guard lock(m);
        auto& r = reservations.at(id);
        if (r.status != Status::Reserved && r.status != Status::InUse) return false;
        release(r, Status::Done);
        return true;
    }
    vector<Reservation> expire(int today) {      // no-shows and uncollected parcels
        lock_guard lock(m);
        vector<Reservation> gone;
        for (auto& [id, r] : reservations)
            if (r.status == Status::Reserved && r.deadline <= today) {
                release(r, Status::Expired);
                gone.push_back(r);
            }
        return gone;
    }
    Reservation get(int id) const { lock_guard lock(m); return reservations.at(id); }
    const R& resource(int index) const { return resources.at(index); }
};

// Car rental: any free car of the requested type.
struct Car { string plate, type; int dailyRate; };
struct FirstOfType : Assigner<Car, string> {
    optional<size_t> choose(const vector<Car>& all, const vector<size_t>& free,
                            const string& type) const override {
        for (size_t i : free) if (all[i].type == type) return i;
        return nullopt;
    }
};

// Parcel lockers: the smallest free locker the parcel fits in.
enum class Size { Small, Medium, Large };
struct Locker { string id; Size size; };
struct SmallestFit : Assigner<Locker, Size> {
    optional<size_t> choose(const vector<Locker>& all, const vector<size_t>& free,
                            const Size& parcel) const override {
        optional<size_t> best;
        for (size_t i : free)
            if (all[i].size >= parcel && (!best || all[i].size < all[*best].size)) best = i;
        return best;
    }
};

int main() {
    PrintNotifier notify;
    ReservationBook<Car, string> cars({{"KA01", "compact", 1500}, {"KA02", "compact", 1500},
                                       {"KA03", "suv", 3000}},
                                      make_unique<FirstOfType>());
    auto rent = [&](const string& who, const string& type, Slot s) {
        auto id = cars.reserve(type, s, who, s.start + 1);   // pick up within a day
        cout << who << ", " << type << ", days " << s.start << "-" << s.end << ": ";
        if (!id) { cout << "none free\n"; return id; }
        auto& car = cars.resource(cars.get(*id).resource);
        cout << car.plate << ", Rs " << car.dailyRate * (s.end - s.start) << "\n";
        return id;
    };
    auto asha = rent("asha", "compact", {10, 13});
    auto ravi = rent("ravi", "compact", {12, 14});
    rent("meera", "compact", {12, 13});
    auto kabir = rent("kabir", "suv", {20, 22});
    cars.begin(*asha);                           // picked up
    cars.begin(*ravi);
    for (auto& r : cars.expire(21)) {
        int fee = cars.resource(r.resource).dailyRate;
        string plate = cars.resource(r.resource).plate;
        notify.send(r.holder, "no-show, " + plate + " released, fee Rs " + to_string(fee));
    }
    auto state = [&](int id) {
        const char* names[] = {"reserved", "in use", "done", "expired"};
        return names[int(cars.get(id).status)];
    };
    cout << "kabir's booking: " << state(*kabir) << ", asha's: " << state(*asha) << "\n";
    rent("meera", "suv", {20, 22});

    ReservationBook<Locker, Size> lockers({{"L1", Size::Small}, {"L2", Size::Medium},
                                           {"L3", Size::Large}, {"L4", Size::Small}},
                                          make_unique<SmallestFit>());
    const char* sizes[] = {"small", "medium", "large"};
    map<int, int> codeToBooking;
    map<string, int> codeOf;
    auto deliver = [&](const string& who, Size s, int day) {
        auto id = lockers.reserve(s, {day, day + 3}, who, day + 3);   // 3 days to collect
        cout << sizes[int(s)] << " parcel for " << who << " -> ";
        if (!id) { cout << "no locker fits\n"; return; }
        int code = 1000 + *id * 7919 % 9000;     // a pickup code (random in production)
        codeToBooking[code] = *id;
        codeOf[who] = code;
        auto& l = lockers.resource(lockers.get(*id).resource);
        cout << l.id << " (" << sizes[int(l.size)] << ")\n";
        notify.send(who, "your parcel is in " + l.id + ", code " + to_string(code));
    };
    deliver("asha", Size::Small, 1);
    deliver("ravi", Size::Medium, 1);
    deliver("meera", Size::Small, 1);
    deliver("kabir", Size::Small, 2);
    deliver("dev", Size::Medium, 2);
    auto collect = [&](int code) {
        auto it = codeToBooking.find(code);
        bool ok = it != codeToBooking.end() && lockers.finish(it->second);
        cout << "code " << code << ": " << (ok ? "opened" : "refused") << "\n";
    };
    collect(1234);
    collect(codeOf["asha"]);
    collect(codeOf["asha"]);
    for (auto& r : lockers.expire(4)) notify.send(r.holder, "not collected, returned to sender");

    ReservationBook<Car, string> lastCar({{"KA09", "suv", 3000}}, make_unique<FirstOfType>());
    atomic<int> won = 0;
    latch go(10);
    {
        vector<jthread> customers;               // ten customers, one SUV, same dates
        for (int c = 0; c < 10; ++c)
            customers.emplace_back([&] {
                go.arrive_and_wait();
                if (lastCar.reserve("suv", {30, 31}, "c", 31)) ++won;
            });
    }
    cout << "10 customers race for the last SUV: " << won << " booked\n";
}
```

Output:

```text
asha, compact, days 10-13: KA01, Rs 4500
ravi, compact, days 12-14: KA02, Rs 3000
meera, compact, days 12-13: none free
kabir, suv, days 20-22: KA03, Rs 6000
  notify kabir: no-show, KA03 released, fee Rs 3000
kabir's booking: expired, asha's: in use
meera, suv, days 20-22: KA03, Rs 6000
small parcel for asha -> L1 (small)
  notify asha: your parcel is in L1, code 8919
medium parcel for ravi -> L2 (medium)
  notify ravi: your parcel is in L2, code 7838
small parcel for meera -> L4 (small)
  notify meera: your parcel is in L4, code 6757
small parcel for kabir -> L3 (large)
  notify kabir: your parcel is in L3, code 5676
medium parcel for dev -> no locker fits
code 1234: refused
code 8919: opened
code 8919: refused
  notify ravi: not collected, returned to sender
  notify meera: not collected, returned to sender
10 customers race for the last SUV: 1 booked
```

The cars show assignment by type and dates: Ravi's overlapping dates get the second compact, and Meera's day 12 finds both compacts busy. Kabir never picked up the SUV by day 21, so it is released with a one-day fee and Meera can have it. The lockers show smallest-fit: small parcels take the small lockers, Kabir's small parcel moves up to the large locker once the small and medium ones are full, and Dev's medium parcel finds nothing that fits. A wrong code and a second use of Asha's code are refused. The parcels delivered on day 1 and never collected are returned on day 4. The last-car race ran repeatedly under ThreadSanitizer with exactly one booking each time.

#### What is shared and what is not

| concern | shared (`ReservationBook`) | per system |
|---|---|---|
| calendars and overlap checks | yes | |
| atomic choose-and-record | yes | |
| expiry of unused reservations | yes (deadline) | what the deadline means: pickup by day 1 of the rental, collection within 3 days |
| which resource to give | interface | `FirstOfType`, `SmallestFit` |
| money | | daily rate and no-show fee; lockers are free to the recipient |
| notifications | `Notifier` interface | the messages |

This is the [strategy](#/concept/oop.patterns-behavioral.strategy) pattern combined with generic code: templates share the algorithm while the resource type and the rule vary. A class hierarchy with a `Resource` base would work too; the template keeps each system's types precise.

#### Interview checklist

- **Resource, reservation and slot modeling shared by both systems**: `ReservationBook<R, Need>` with per-resource calendars and `Reservation` records.
- **Assignment strategies: availability by car type and dates, smallest fitting locker**: `FirstOfType` and `SmallestFit` behind `Assigner`.
- **Expiry and release: no-shows and parcels that are never collected**: `expire(today)` releases reservations past their deadline; callers charge the no-show fee or return the parcel.
- **Concurrency when assigning the last car or locker**: `reserve` finds, chooses and records under one lock; ten customers, one SUV, one booking.
- **Fees and notifications**: rental price per day, a no-show fee, and pickup codes and return notices through `Notifier`.

Connects to: [hotel booking](#/concept/lld.classics.hotel-booking), [parking lot](#/concept/lld.classics.parking-lot), [templates](#/concept/lang.cpp-modern.templates).

### questions
Q: What do car rental and parcel lockers have in common as designs?
A: Both assign a resource from a pool for a time slot, check availability, expire reservations that are never used and must avoid giving one resource to two people. A shared reservation core handles calendars, expiry and locking, while the resource type and the assignment rule differ.

Q: How should a parcel locker choose a locker for a parcel?
A: Pick the smallest free locker that the parcel fits in, so larger lockers stay free for larger parcels. If no fitting locker is free, the delivery is refused or queued rather than forced into a wrong size.

Q: What happens when a customer never picks up a rental car?
A: The reservation has a pickup deadline; once it passes, the car is released for others, the reservation is marked expired, and a no-show fee is charged and notified according to policy.

Q: How do you prevent two customers from getting the last available car?
A: Finding free cars, choosing one and recording the reservation must be one atomic step, under a lock in memory or with a conditional insert or constraint in a database, so the second request sees the car as taken.

Q: How would you handle parcels that are never collected?
A: Give each locker reservation a collection deadline, for example three days; a periodic expiry job releases lockers whose parcels were not collected, marks them for return to sender and notifies the recipient and the merchant.
