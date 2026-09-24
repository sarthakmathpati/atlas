---
topic: os.storage
name: "Storage and file systems"
subject: os
order: 8
prereqs: [os.memory]
---

## os.storage.file-concepts
name: "File concepts"
importance: important
scope: "files, directories, metadata, permissions"

### simple
A file is a named container of data on disk, and a directory is a folder that maps names to files. The operating system also keeps a record card for every file with its size, owner, times and who may use it. It is like a library where each book has a catalogue card, and shelves are organised into sections and subsections.

### interview
- A **file** is a named sequence of bytes on storage; the OS provides operations: create, open, read, write, seek, close, truncate, delete, rename.
- **Metadata** (in Unix, the **inode**): type, size, owner and group, **permissions**, timestamps (**atime** access, **mtime** content modified, **ctime** inode changed, not creation), link count and the locations of data blocks. The **name** lives in the directory, not in the inode.
- **Directories** map names to inodes; structures evolved from single-level to tree to acyclic graphs with **links**. A **hard link** is another name for the same inode (same file, counted in the link count); a **symbolic link** is a small file containing a path (can cross file systems, can dangle).
- **Unix permissions**: read, write, execute for **user, group, others** (`rwxr-xr-x` = **755**; `rw-r--r--` = **644**). On directories, x means "may traverse" and r means "may list". Special bits: setuid, setgid, sticky (as on `/tmp`). ACLs extend this.
- **Open file state** has three layers: each process's **file descriptor table** → a system-wide **open file table** entry (current offset, mode) → the in-memory **inode**. After `fork`, parent and child share open file entries, so they share offsets.
- Deleting a file removes a name; the data is freed only when the link count and the number of open descriptors both reach zero.

### deep
#### Worked example: reading metadata

```cpp
#include <sys/stat.h>

string mode(mode_t m) {
    string s = S_ISDIR(m) ? "d" : "-";
    const char* rwx = "rwxrwxrwx";
    for (int i = 0; i < 9; ++i) s += (m & (0400 >> i)) ? rwx[i] : '-';   // user, group, others
    return s;
}

int main() {
    ofstream("demo.txt") << "hello\n";
    chmod("demo.txt", 0640);                       // rw- r-- ---
    struct stat st;
    if (stat("demo.txt", &st) != 0) return 1;
    printf("%s size=%lld links=%ld inode=%llu\n", mode(st.st_mode).c_str(),
           (long long)st.st_size, (long)st.st_nlink, (unsigned long long)st.st_ino);
    // -rw-r----- size=6 links=1 inode=...
    remove("demo.txt");
}
```

```python
import os
import stat

with open("demo.txt", "w") as f:
    f.write("hello\n")
os.chmod("demo.txt", 0o640)
os.link("demo.txt", "alias.txt")          # a hard link: a second name for the same inode
st = os.stat("demo.txt")
print(stat.filemode(st.st_mode), st.st_size, st.st_nlink,
      st.st_ino == os.stat("alias.txt").st_ino)       # -rw-r----- 6 2 True
os.remove("demo.txt")                     # the data survives: alias.txt still names it
print(open("alias.txt").read().strip())   # hello
os.remove("alias.txt")
```

#### Permissions in octal

| octal | bits | meaning |
|---|---|---|
| 7 | rwx | read, write, execute |
| 6 | rw- | read, write |
| 5 | r-x | read, execute |
| 4 | r-- | read only |
| 0 | --- | nothing |

`chmod 750 script.sh` gives the owner everything, the group read and execute, and others nothing. For a directory, `r` without `x` lets you list names but not open anything inside.

#### Hard link vs symbolic link

| | hard link | symbolic link |
|---|---|---|
| points to | an inode | a path name |
| across file systems | no | yes |
| to directories | no (to prevent cycles) | yes |
| if the original name is deleted | still works | dangles |

#### Pitfalls

- Believing `ctime` is creation time: it is the last inode change (Linux reports creation as `birth` time only on some file systems).
- Deleting a huge log file that a process still has open: the space is not freed until the process closes it.
- Forgetting that directory permissions, not file permissions, control whether a file can be deleted or renamed.

Connects to: file allocation methods, system calls, inter-process communication, journaling file systems.

### questions
Q: What metadata does a Unix file system store for a file?
A: In the inode: the file type, size, owner and group, permission bits, timestamps for last access, last content modification and last inode change, the number of hard links, and pointers to the data blocks. The file's name is stored in its directory entry, not in the inode.

Q: What is the difference between a hard link and a symbolic link?
A: A hard link is another directory entry pointing to the same inode, so both names are equally the file and the data stays until all links are removed. A symbolic link is a separate small file that stores a path; it can point across file systems and to directories, but breaks if the target is removed.

Q: What does the permission string rwxr-x--- mean, and what is it in octal?
A: The owner can read, write and execute; the group can read and execute; others have no access. In octal that is 750.

Q: What does the execute permission mean on a directory?
A: It allows traversing the directory: accessing files and subdirectories inside it by name. Read permission on a directory allows listing its entries, and write permission allows creating, deleting and renaming entries.

Q: If you delete a file that another process has open, what happens?
A: The directory entry is removed immediately, so the name disappears, but the inode and data blocks remain until the last open file descriptor is closed. Only then is the space freed.

## os.storage.file-allocation-methods
name: "File allocation methods"
importance: important
prereqs: [os.storage.file-concepts]
scope: "contiguous, linked, indexed (inodes)"

### simple
File allocation is how the file system decides which disk blocks hold each file's data. It can keep a file's blocks side by side, chain them together like a treasure hunt where each block says where the next one is, or keep an index listing every block. Each way trades speed, flexibility and wasted space differently.

### interview
- **Contiguous**: a file occupies consecutive blocks, recorded as (start, length). Excellent sequential and random access, but **external fragmentation** and files are hard to grow. Modern systems use **extents** (several contiguous runs) to keep the benefit.
- **Linked**: each block points to the next. No external fragmentation and easy growth, but **random access is O(n)**, pointers eat space, and one broken pointer loses the rest of the file. **FAT** keeps the chain in a table in memory, making random access much faster.
- **Indexed**: an **index block** lists the file's blocks, giving direct random access without external fragmentation; the cost is index overhead and a limit on file size, solved by multi-level indexes.
- **Unix inode** (ext2/ext3): **12 direct** pointers, then **single, double and triple indirect** blocks. With 4 KB blocks and 4-byte pointers (1,024 per block): 48 KB direct, 4 MB single, 4 GB double, 4 TB triple, so about 4 TB per file.
- Small files are fast (direct pointers), large files still work (indirect blocks), and random access needs at most a few extra block reads. **ext4, XFS and NTFS** use extents (often in a B-tree) instead of block lists.

### deep
#### Comparison

| method | sequential | random access | growth | fragmentation | example |
|---|---|---|---|---|---|
| contiguous | best | O(1) | hard | external | CD-ROM (ISO 9660), extents |
| linked | good | O(n) | easy | none external | original linked allocation |
| linked with a table | good | O(n) in memory | easy | none external | FAT, exFAT |
| indexed | good | O(1) (few lookups) | easy | none external, index overhead | Unix inode |

#### Worked example: which pointer holds a byte?

Inode with 12 direct pointers, 4 KB blocks, 4-byte pointers, so 1,024 pointers per indirect block.

| byte offset | block index = offset ÷ 4096 | reached through |
|---|---|---|
| 40,000 | 9 | direct pointer 9 |
| 200,000 | 48 | single indirect, entry 48 − 12 = 36 |
| 5,000,000 | 1220 | double indirect: 1220 − 12 − 1024 = 184, so first level 0, second level 184 |

Reading offset 5,000,000 cold needs the inode, the double-indirect block, one second-level block, then the data: three metadata reads before the data (fewer if cached).

```cpp
string locate(long long offset, long long block = 4096) {
    long long idx = offset / block, per = block / 4;              // pointers per indirect block
    if (idx < 12) return "direct " + to_string(idx);
    idx -= 12;
    if (idx < per) return "single indirect " + to_string(idx);
    idx -= per;
    if (idx < per * per) return "double indirect " + to_string(idx / per) + "/" + to_string(idx % per);
    idx -= per * per;
    return "triple indirect " + to_string(idx / (per * per)) + "/" + to_string(idx / per % per) + "/" +
           to_string(idx % per);
}

int main() {
    for (long long off : {40000LL, 200000LL, 5000000LL}) cout << off << ": " << locate(off) << "\n";
    // 40000: direct 9 / 200000: single indirect 36 / 5000000: double indirect 0/184
}
```

#### Maximum file size

$$12 \cdot 4\,\text{KB} + 1024 \cdot 4\,\text{KB} + 1024^2 \cdot 4\,\text{KB} + 1024^3 \cdot 4\,\text{KB} \approx 48\,\text{KB} + 4\,\text{MB} + 4\,\text{GB} + 4\,\text{TB}$$

(ext2 and ext3 cap files lower because of other on-disk fields; the pointer scheme itself allows about 4 TB.)

#### Linked allocation with FAT

```python
# FAT: fat[b] is the next block after b, or -1 at the end of the file.
fat = {5: 9, 9: 2, 2: 14, 14: -1}


def blocks_of(start):
    chain, b = [], start
    while b != -1:
        chain.append(b)
        b = fat[b]
    return chain


print(blocks_of(5))   # [5, 9, 2, 14]: reaching the 4th block means following 3 links
```

Because the FAT is cached in memory, following links costs memory lookups rather than disk reads, which made FAT practical despite linked allocation.

Connects to: file concepts, free space management, contiguous allocation, fragmentation, B-trees.

### questions
Q: Compare contiguous, linked and indexed file allocation.
A: Contiguous allocation stores a file in consecutive blocks, which gives fast sequential and random access but causes external fragmentation and makes growth hard. Linked allocation chains blocks with pointers, which avoids external fragmentation but makes random access slow and is fragile. Indexed allocation keeps a list of block pointers in an index block, giving fast random access and easy growth at the cost of index overhead.

Q: How does a Unix inode locate a file's data blocks?
A: It holds 12 direct pointers to the first data blocks, then a single indirect pointer to a block full of pointers, a double indirect pointer to a block of pointers to pointer blocks, and a triple indirect pointer one level deeper. Small files use only direct pointers; large files use the indirect levels.

Q: What is the maximum file size with 12 direct pointers, 4 KB blocks and 4-byte pointers?
A: Each indirect block holds 1,024 pointers. The total is 12 times 4 KB plus 1,024 times 4 KB plus 1,024 squared times 4 KB plus 1,024 cubed times 4 KB, which is about 48 KB plus 4 MB plus 4 GB plus 4 TB, roughly 4 TB.

Q: What is FAT and how does it improve linked allocation?
A: The File Allocation Table stores the next-block pointer for every disk block in a single table at the start of the volume instead of inside the data blocks. Caching that table in memory lets the system follow a file's chain quickly, making random access much cheaper than with pointers stored on disk in each block.

Q: What are extents and why do modern file systems use them?
A: An extent describes a run of contiguous blocks by its start and length. Storing a file as a few extents instead of one pointer per block shrinks metadata dramatically for large files and keeps sequential access fast, which is why ext4, XFS and NTFS use them.

## os.storage.free-space-management
name: "Free space management"
importance: important
prereqs: [os.storage.file-allocation-methods]
scope: "bitmaps, free lists"

### simple
Free space management is how the file system remembers which disk blocks are empty. One way is a long row of switches, one per block, that are on when the block is free; another is a chain linking all the empty blocks together. The file system checks this record whenever it needs room for new data.

### interview
- **Bitmap (bit vector)**: one bit per block (1 = free in the textbook convention; many file systems use 1 = used). Compact and makes finding **contiguous** free runs easy; finding a free block is a fast word scan (skip all-zero words, then find the first set bit).
- Size: a 1 TB disk with 4 KB blocks has $2^{28}$ blocks, so the bitmap is $2^{28}$ bits = **32 MB**; it must be cached to be fast and written back carefully.
- **Linked free list**: each free block points to the next. No extra space, but finding many blocks means reading each one, and contiguous runs are hard to find.
- **Grouping**: the first free block stores the addresses of n free blocks (the last of which stores the next n), so many free blocks are found with one read.
- **Counting (extents)**: store (start, count) runs of free blocks; very compact when free space is contiguous. XFS keeps free extents in B-trees, ZFS uses space maps (logs of allocations and frees).
- SSD angle: file systems send **TRIM/discard** so the drive also knows which blocks are free.

### deep
#### Worked example: a bitmap

Blocks 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 17, 18, 25, 26 and 27 are free (1 = free):

```text
block:  0 1 2 3 4 5 6 7 8 9 ...
bit:    0 0 1 1 1 1 0 0 1 1 1 1 1 1 0 0 0 1 1 0 0 0 0 0 0 1 1 1 ...
```

The first free block is found by skipping zero words and locating the lowest set bit; a run of 4 free blocks starting at 8 is found by scanning for four consecutive 1s.

#### Code: a bitmap allocator

```cpp
class BlockBitmap {
    vector<uint64_t> words;                          // bit i set = block i is free
public:
    explicit BlockBitmap(size_t blocks) : words((blocks + 63) / 64, ~0ULL) {}
    long allocate() {
        for (size_t w = 0; w < words.size(); ++w) {
            if (words[w] == 0) continue;             // 64 used blocks skipped at once
            int bit = __builtin_ctzll(words[w]);     // lowest set bit = first free block here
            words[w] &= ~(1ULL << bit);
            return long(w * 64 + bit);
        }
        return -1;                                   // disk full
    }
    void release(long b) { words[b / 64] |= 1ULL << (b % 64); }
};

int main() {
    BlockBitmap bm(1000);
    long a = bm.allocate(), b = bm.allocate(), c = bm.allocate();
    bm.release(b);
    cout << a << " " << b << " " << c << " " << bm.allocate() << "\n";   // 0 1 2 1
}
```

```python
def first_free_run(bitmap, n):
    """bitmap: list of 1 (free) / 0 (used); returns the first start of n consecutive free blocks."""
    run = 0
    for i, bit in enumerate(bitmap):
        run = run + 1 if bit else 0
        if run == n:
            return i - n + 1
    return None


bits = [0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1]
print(first_free_run(bits, 4), first_free_run(bits, 6), first_free_run(bits, 7))   # 2 8 None
```

#### Comparison

| method | space | find one free block | find a contiguous run |
|---|---|---|---|
| bitmap | 1 bit per block | fast word scan | easy |
| linked list | none (inside free blocks) | read the head | hard |
| grouping | none | one read gives n blocks | hard |
| counting or extents | one entry per run | fast | easy |

Connects to: file allocation methods, contiguous allocation, bit manipulation, journaling file systems.

### questions
Q: How does a bitmap track free disk blocks?
A: It keeps one bit per block, set or cleared to mean free or used. Finding a free block means scanning for a word that is not all used and locating the first free bit within it, and finding contiguous free space means looking for runs of free bits.

Q: How large is the free-space bitmap for a 1 TB disk with 4 KB blocks?
A: 1 TB divided by 4 KB is 2 to the power 28 blocks, so the bitmap needs 2 to the power 28 bits, which is 2 to the power 25 bytes or 32 MB.

Q: What are the trade-offs of a linked free list compared with a bitmap?
A: A linked list uses no extra space because the pointers live in the free blocks themselves, but allocating many blocks requires reading each one and contiguous free runs are hard to find. A bitmap costs a little space but makes both single-block and contiguous allocation fast when cached in memory.

Q: What are grouping and counting in free-space management?
A: Grouping stores the addresses of many free blocks in the first free block, so one read yields many free blocks. Counting stores runs of free blocks as a start address and a length, which is very compact when free space is mostly contiguous, as with extents.

## os.storage.disk-scheduling
name: "Disk scheduling"
importance: important
scope: "FCFS, SSTF, SCAN, C-SCAN, LOOK"

### simple
Disk scheduling decides the order in which to serve requests on a spinning hard drive, whose read head must physically move to each track. It is like an elevator in a tall building: stopping at floors in the order buttons were pressed wastes travel, so it sweeps up and down picking people up along the way. Good ordering means less head movement and faster answers.

### interview
- On a hard disk, **seek time** (moving the head between cylinders) dominates, followed by rotational latency. Schedulers reorder pending requests to reduce total head movement.
- **FCFS**: serve in arrival order. Fair, but lots of back-and-forth.
- **SSTF** (shortest seek time first): always go to the nearest request. Low average seek, but can **starve** far requests.
- **SCAN** (elevator): move in one direction serving requests, go to the **end** of the disk, then reverse. **LOOK**: like SCAN but turn around at the **last request** instead of the disk's end.
- **C-SCAN**: serve in one direction only, then **jump back** to the start and sweep again, giving more **uniform wait times**. **C-LOOK**: the same, jumping from the last request to the lowest pending one.
- Classic example: queue 98, 183, 37, 122, 14, 124, 65, 67 with the head at 53 on cylinders 0 to 199: **FCFS 640**, **SSTF 236**, **SCAN toward 0: 236**, **LOOK toward 0: 208**. SSDs have no seek, so Linux uses simple schedulers there (`none`, `mq-deadline`); BFQ and Kyber target fairness and latency.

### deep
#### Worked example

Requests: 98, 183, 37, 122, 14, 124, 65, 67. Head at 53, cylinders 0 to 199.

| algorithm | order served | total head movement |
|---|---|---|
| FCFS | 98, 183, 37, 122, 14, 124, 65, 67 | 640 |
| SSTF | 65, 67, 37, 14, 98, 122, 124, 183 | 236 |
| SCAN, moving toward 0 | 37, 14, (0), 65, 67, 98, 122, 124, 183 | 53 + 183 = 236 |
| LOOK, moving toward 0 | 37, 14, 65, 67, 98, 122, 124, 183 | 39 + 169 = 208 |
| SCAN, moving toward 199 | 65, …, 183, (199), 37, 14 | 146 + 185 = 331 |
| C-SCAN, toward 199 | 65, …, 183, (199), (0), 14, 37 | 146 + 199 + 37 = 382 (183 without the return jump) |
| C-LOOK, toward 199 | 65, …, 183, 14, 37 | 130 + 169 + 23 = 322 (153 without the jump) |

Textbooks differ on whether the C-SCAN and C-LOOK return jump counts as head movement; state your convention.

#### Code

```cpp
int movement(int head, const vector<int>& order) {
    int total = 0;
    for (int c : order) { total += abs(c - head); head = c; }
    return total;
}

vector<int> sstf(int head, vector<int> q) {
    vector<int> order;
    while (!q.empty()) {
        auto it = min_element(q.begin(), q.end(), [&](int a, int b) { return abs(a - head) < abs(b - head); });
        head = *it;
        order.push_back(head);
        q.erase(it);
    }
    return order;
}

vector<int> look(int head, vector<int> q, bool towardZero) {
    sort(q.begin(), q.end());
    vector<int> below, above;
    for (int c : q) (c < head ? below : above).push_back(c);
    reverse(below.begin(), below.end());          // nearest first when moving down
    vector<int> order = towardZero ? below : above;
    const vector<int>& rest = towardZero ? above : below;
    order.insert(order.end(), rest.begin(), rest.end());
    return order;
}

int main() {
    vector<int> q = {98, 183, 37, 122, 14, 124, 65, 67};
    cout << "FCFS " << movement(53, q) << "\n";                       // 640
    cout << "SSTF " << movement(53, sstf(53, q)) << "\n";             // 236
    cout << "LOOK " << movement(53, look(53, q, true)) << "\n";       // 208
    auto scan = look(53, q, true);
    scan.insert(scan.begin() + 2, 0);                                 // SCAN also travels to cylinder 0
    cout << "SCAN " << movement(53, scan) << "\n";                    // 236
}
```

#### Starvation and fairness

SSTF keeps serving requests near the head; a request at the far edge can wait indefinitely if new nearby requests keep arriving. SCAN bounds the wait to about two sweeps, and C-SCAN evens it out: with plain SCAN, cylinders in the middle are passed twice per round trip while those at the edges wait longer.

#### On modern hardware

The drive itself reorders requests (native command queuing), so the OS mostly merges adjacent requests and enforces deadlines. SSDs and NVMe have no moving head: request order barely matters for seek time, and the goals become low CPU overhead and fairness between processes.

Connects to: FCFS and SJF, round robin, I/O methods, file allocation methods.

### questions
Q: What is the goal of disk scheduling?
A: To reduce the time a hard disk spends seeking, moving its read head between cylinders, by choosing the order in which pending requests are served. Less total head movement means higher throughput and lower average response time, while the algorithm should still avoid starving any request.

Q: How do SCAN and LOOK differ?
A: Both move the head in one direction serving requests and then reverse. SCAN travels all the way to the end of the disk before reversing, while LOOK reverses as soon as there are no more requests in the current direction, which saves unnecessary movement.

Q: Why use C-SCAN instead of SCAN?
A: SCAN serves the middle cylinders twice per round trip and the edges only once, so waiting times are uneven. C-SCAN serves requests in only one direction and then jumps back to the beginning, treating the cylinders as a circle and giving more uniform waiting times.

Q: Why can SSTF cause starvation?
A: It always picks the request closest to the current head position. If new requests keep arriving near the head, a request far away can be postponed indefinitely.

Q: Does disk scheduling matter for SSDs?
A: Much less. SSDs have no mechanical head, so there is no seek time to minimize. Operating systems use minimal schedulers for them, focusing on merging requests, fairness and low CPU overhead rather than ordering by position.

## os.storage.raid-levels
name: "RAID levels"
importance: important
scope: "0, 1, 5, 10 trade-offs"

### simple
RAID combines several disks so they act like one, to make storage faster, safer or both. Splitting a file across disks is like several people carrying parts of a load at once, and mirroring is like keeping a photocopy of every page. Parity is a clever checksum that lets you rebuild any one lost disk from the others.

### interview
- **RAID 0 (striping)**: data split across N disks. Fast reads and writes, full capacity, **no redundancy**: any disk failure loses everything.
- **RAID 1 (mirroring)**: identical copies on two (or more) disks. Survives the loss of all but one copy, fast reads, **50% capacity** with two disks, writes go to every copy.
- **RAID 5 (striping with distributed parity)**: capacity of **N − 1** disks; survives **one** disk failure. Small writes pay a **write penalty** (read old data and parity, write new data and parity: 4 I/Os). Rebuilds are slow and stress the remaining disks, risky with large drives.
- **RAID 6**: two parity blocks, capacity N − 2, survives **two** failures.
- **RAID 10 (1+0)**: stripe across mirrored pairs. Capacity N / 2, excellent performance, fast rebuilds, survives one failure per mirror pair. A common choice for databases.
- Parity is **XOR**: parity = D1 ⊕ D2 ⊕ … ⊕ Dn, and any one missing block is the XOR of the others. **RAID is not a backup**: it does not protect against deletion, corruption or ransomware.

### deep
#### Comparison (N disks)

| level | usable capacity | tolerates | reads | small writes | typical use |
|---|---|---|---|---|---|
| 0 | N | 0 failures | fast | fast | scratch space, caches |
| 1 | 1 disk (of 2) | N − 1 failures | fast | normal | boot disks, small servers |
| 5 | N − 1 | 1 failure | fast | slow (4 I/Os each) | read-heavy storage |
| 6 | N − 2 | 2 failures | fast | slower (6 I/Os each) | large arrays |
| 10 | N / 2 | 1 per mirror pair | fast | fast | databases |

#### Worked example: RAID 5 parity

Three data disks and one parity block in a stripe (bytes shown in binary):

| disk | value |
|---|---|
| D1 | 1011 |
| D2 | 0110 |
| D3 | 1100 |
| parity = D1 ⊕ D2 ⊕ D3 | 0001 |

If D2 fails: D1 ⊕ D3 ⊕ parity = 1011 ⊕ 1100 ⊕ 0001 = 0110, which is D2.

```python
def parity(blocks):
    p = bytes(len(blocks[0]))
    for b in blocks:
        p = bytes(x ^ y for x, y in zip(p, b))
    return p


data = [b"RAID", b"five", b"demo"]
p = parity(data)
lost = 1
rebuilt = parity([b for i, b in enumerate(data) if i != lost] + [p])
print(rebuilt)   # b'five'
```

```cpp
int main() {
    vector<uint8_t> d = {0b1011, 0b0110, 0b1100};
    uint8_t p = d[0] ^ d[1] ^ d[2];                  // 0b0001
    uint8_t rebuilt = d[0] ^ d[2] ^ p;               // recover d[1]
    cout << int(p) << " " << int(rebuilt) << "\n";   // 1 6
}
```

#### The small-write penalty

Updating one block in RAID 5: new parity = old parity ⊕ old data ⊕ new data. That needs reading the old data and old parity, then writing the new data and new parity: 4 I/Os for one logical write. RAID 10 needs just 2 (one per mirror).

#### Rebuild risk

Rebuilding a failed disk in RAID 5 reads every block of every other disk. With large disks this takes many hours, and any second failure or unreadable sector during the rebuild loses data. That is why large arrays prefer RAID 6 or RAID 10.

Connects to: disk scheduling, bit manipulation, replication, backups.

### questions
Q: Compare RAID 0, 1, 5 and 10.
A: RAID 0 stripes data for speed and full capacity but has no redundancy. RAID 1 mirrors data for redundancy at half capacity. RAID 5 stripes data with distributed parity, giving N minus 1 capacity and tolerance of one failure, but slow small writes. RAID 10 stripes across mirrored pairs, giving high performance and fast rebuilds at half capacity.

Q: How does RAID 5 recover a failed disk?
A: Each stripe stores a parity block equal to the XOR of its data blocks. Because XOR can be inverted, any single missing block equals the XOR of all the remaining data blocks and the parity block, so the lost disk's contents can be recomputed stripe by stripe.

Q: What is the RAID 5 write penalty?
A: A small write must update both the data block and the parity block. The new parity is computed from the old parity, the old data and the new data, so each logical write needs two reads and two writes, four I/Os instead of one.

Q: Why is RAID not a backup?
A: RAID protects against disk hardware failure, but every change, including accidental deletion, software corruption or ransomware encryption, is immediately applied to all disks. A backup is a separate copy from an earlier point in time that such mistakes cannot touch.

## os.storage.journaling-file-systems
name: "Journaling file systems"
importance: advanced
prereqs: [os.storage.file-concepts]
scope: "crash consistency"

### simple
A journaling file system writes a note about what it is going to change before changing it, so a crash in the middle can be cleaned up quickly. It is like a shop assistant who writes "moving 5 boxes from shelf A to shelf B" in a logbook before starting: if they are interrupted, anyone can read the log and finish or undo the move. Without the log, you would have to check every shelf to find out what went wrong.

### interview
- **Crash consistency problem**: one logical change (appending a block) updates several on-disk structures (the free-space bitmap, the inode, the data block). A crash between writes leaves them inconsistent: leaked blocks, inodes pointing at garbage, or blocks used twice.
- Old solution: **fsck** scans the entire disk after a crash, which takes hours on large volumes.
- **Journaling (write-ahead logging)**: write the intended updates to a **journal** first, then a **commit** record, then apply them to their real locations (**checkpoint**), then free the journal space. After a crash, **replay** committed transactions and ignore uncommitted ones: recovery takes seconds.
- ext4 modes: **journal** (data and metadata logged: safest, slowest), **ordered** (default: only metadata logged, but data is written before the metadata commits), **writeback** (metadata only, no ordering: fastest, may expose stale data after a crash).
- Alternatives: **copy-on-write** file systems (ZFS, Btrfs) never overwrite live data and switch a root pointer atomically; **log-structured** file systems write everything sequentially.
- Applications still need `fsync` to make their own data durable, and write-to-temp-then-rename for atomic file replacement.

### deep
#### Worked example: appending one block

| step | journaled ext4 (ordered mode) |
|---|---|
| 1 | write the new data block to its final location |
| 2 | write a journal transaction: new bitmap, new inode |
| 3 | write the commit record (the transaction now counts) |
| 4 | checkpoint: write bitmap and inode to their home locations |
| 5 | mark the journal space free |

| crash after step | recovery |
|---|---|
| 1 | no commit: nothing replayed; the data block is unreferenced but the bitmap still says it is free, so nothing is inconsistent |
| 3 | commit present: replay writes the bitmap and inode |
| 4 | replay again: writes are idempotent, the result is the same |

```python
def recover(journal, disk):
    """Replay only transactions that have a commit record."""
    for tx in journal:
        if tx.get("committed"):
            disk.update(tx["writes"])    # idempotent: replaying twice gives the same result
    return disk


disk = {"bitmap": "old", "inode": "old"}
journal = [{"writes": {"bitmap": "new", "inode": "new"}, "committed": True},
           {"writes": {"inode": "newer"}, "committed": False}]           # crashed before commit
print(recover(journal, disk))    # {'bitmap': 'new', 'inode': 'new'}
```

Connects to: file concepts, logs and write-ahead logging, RAID levels, free space management.

### questions
Q: What problem does journaling solve?
A: Crash consistency. A single file operation updates several on-disk structures, and a crash between those writes leaves the file system inconsistent. Journaling records the updates in a log first, so after a crash the system replays or discards whole operations instead of scanning the entire disk with fsck.

Q: How does journaling recover after a crash?
A: It reads the journal and replays every transaction that has a commit record, writing its updates to their final locations, and ignores transactions without a commit record. Because replaying writes is idempotent, recovery is fast and safe even if it is interrupted.

Q: What are ext4's journaling modes?
A: Journal mode logs both data and metadata, which is safest but slowest. Ordered mode, the default, logs only metadata but writes data blocks before the metadata commits. Writeback mode logs only metadata with no ordering, which is fastest but can expose stale data after a crash.
