---
topic: eng.linux
name: "Linux and the shell"
subject: eng
order: 2
prereqs: []
---

## eng.linux.navigating-and-managing-files
name: "Navigating and managing files"
importance: must
scope: "ls, cd, cp, mv, rm, find"

### simple
A Linux file system is one big tree of folders that starts at `/`, and the shell always has a current folder that you are "standing in". You move around with `cd`, look around with `ls`, and copy, move and delete with `cp`, `mv` and `rm`. `find` searches the tree for files by name, type, size or age, like a librarian who can check every shelf at once.

### interview
- **Paths**: absolute paths start at `/`; relative ones start from the current directory. `.` is here, `..` is the parent, `~` is your home, `cd -` goes back to the previous directory.
- **`ls -la`**: `-l` shows type and permissions, links, owner, group, size and modification time; `-a` shows hidden files (names starting with a dot); `-h` prints sizes like 3.0K.
- **`cp src dst`** copies (`-r` for directories, `-p` to keep times and modes); **`mv`** moves or renames and keeps the file's metadata.
- **`rm`** deletes immediately (no recycle bin); a directory needs `rm -r`. Check the path first, especially with wildcards and variables.
- **`find DIR tests actions`**: `-name '*.cpp'` (quote the pattern), `-type f` or `d`, `-size +2k`, `-mtime -7` or `-newermt DATE`, and `-exec cmd {} +` to act on the matches.
- `mkdir -p a/b/c` makes parents as needed; `tree` prints the hierarchy.

### deep
#### Intuition

Everything is under one root, `/`: your home directory, system programs in `/usr/bin`, configuration in `/etc`, temporary files in `/tmp`, other disks mounted into the same tree. Commands take paths, and a path is either a full address from `/` or directions from where you stand. Most mistakes are about paths: running a command in the wrong directory or letting a wildcard match more than you meant.

#### A session

A small project in a scratch directory. The file dates were set with `touch -d` so they don't depend on when this ran, except where noted; the owner is `root` because the session ran as root.

```text
$ mkdir -p project/src project/docs
$ cd project
$ pwd
/work/project
$ ls
README.md
docs
src
$ ls -la
total 24
drwxr-xr-x 4 root root 4096 Sep  1 10:00 .
drwxr-xr-x 8 root root 4096 Sep 26 17:03 ..
-rw-r--r-- 1 root root   24 Sep  1 10:00 .env
-rw-r--r-- 1 root root   10 Sep  1 10:00 README.md
drwxr-xr-x 2 root root 4096 Sep  1 10:00 docs
drwxr-xr-x 2 root root 4096 Sep  1 10:00 src
$ ls -lh docs
total 4.0K
-rw-r--r-- 1 root root 3.0K Sep  1 10:00 diagram.png
```

`ls` wrote one name per line because its output went to a file for this recording; in a terminal it prints columns. `ls -la` shows the hidden `.env` and the two special entries: `.` (this directory) and `..` (the parent, whose date is the day of the recording). "total" counts disk blocks, which depends on the file system. The leading `d` or `-` is the file type, followed by the permission bits.

```text
$ cp src/main.cpp src/main.bak
$ mv src/main.bak old-main.cpp
$ mkdir archive
$ mv old-main.cpp archive/
$ cp -r src archive/src-copy
$ tree -a --noreport
.
├── .env
├── README.md
├── archive
│   ├── old-main.cpp
│   └── src-copy
│       ├── cart.h
│       └── main.cpp
├── docs
│   └── diagram.png
└── src
    ├── cart.h
    └── main.cpp
$ find . -name '*.cpp'
./src/main.cpp
./archive/src-copy/main.cpp
./archive/old-main.cpp
$ find . -type f -size +2k
./docs/diagram.png
$ find . -type f -newermt 2026-09-02
./src/cart.h
./archive/src-copy/cart.h
./archive/src-copy/main.cpp
./archive/old-main.cpp
$ find . -name '*.h' -exec wc -l {} +
 1 ./src/cart.h
 1 ./archive/src-copy/cart.h
 2 total
```

`mv` renamed and then moved the file; it is the same operation. `find` walks the whole tree below `.`: the pattern `'*.cpp'` is quoted so the shell passes it to `find` instead of expanding it itself. The `-newermt` search found `cart.h`, whose date was set to 3 September, and also every copy: `cp` gives copies the current time, so they count as new. Use `cp -p` to keep the original times. `-exec … {} +` runs one `wc` with all the matches.

```text
$ rm archive/old-main.cpp
$ rm archive
rm: cannot remove 'archive': Is a directory
$ rm -r archive
$ ls -A
.env
README.md
docs
src
$ cd src
$ cd ../docs
$ pwd
/work/project/docs
$ cd -
/work/project/src
$ cd
$ pwd
/work/home
```

`rm` refused a directory until `-r`, then removed it and everything inside without asking. `cd -` printed and returned to the previous directory, and a bare `cd` went home (here `HOME` was set to `/work/home`).

#### Pitfalls

- **`rm -rf $DIR/`** with an empty variable becomes `rm -rf /`. Quote variables, use `set -u` in scripts, and prefer `rm -ri` when unsure.
- **Unquoted wildcards**: `find . -name *.cpp` breaks if the current directory has a `.cpp` file, because the shell expands it first.
- **Spaces in names**: quote paths (`"my notes.txt"`); pipe `find -print0` into `xargs -0` for any name.
- **`cp -r a b`** puts `a` inside `b` if `b` already exists, and copies it as `b` if not.

Connects to: [permissions](#/concept/eng.linux.permissions), [text processing](#/concept/eng.linux.text-processing), [file concepts](#/concept/os.storage.file-concepts), [Linux essentials for interviews](#/concept/os.io.linux-essentials-for-interviews).

### questions
Q: What is the difference between an absolute and a relative path?
A: An absolute path starts at the root, such as /work/project/src, and means the same thing from anywhere. A relative path, such as ../docs, is resolved from the current directory, so its meaning depends on where you are.

Q: How do you see hidden files, and what makes a file hidden?
A: ls -a (or ls -la for details). A file is hidden only by convention: its name starts with a dot, like .env or .gitignore, and ls leaves such names out unless asked.

Q: How would you find every .cpp file changed in the last week and count its lines?
A: find . -name '*.cpp' -mtime -7 -exec wc -l {} +. Quote the pattern so the shell doesn't expand it, and use -exec with + so wc runs once with all the files.

Q: What is the difference between cp and mv?
A: cp creates a new file with the same contents (new modification time unless you use -p), leaving the original. mv renames or moves the existing file, keeping its data and metadata; within one file system it only changes directory entries.

Q: Why is rm -rf dangerous in scripts?
A: It deletes without asking and there is no recycle bin. If a variable in the path is empty or wrong, it can delete far more than intended; quote variables, use set -u and check paths before deleting.

## eng.linux.permissions
name: "Permissions"
importance: must
prereqs: [eng.linux.navigating-and-managing-files]
scope: "chmod, chown, users and groups"

### simple
Every file on Linux belongs to one user and one group, and it carries three small sets of permissions: what the owner may do, what members of the group may do, and what everyone else may do. Each set says whether you may read, write or execute. It works like keys to a building: the owner has one key, a team shares another, and visitors get whatever is left.

### interview
- **Three classes, three bits**: user (owner), group, others; read, write, execute. `-rw-r-----` is 640: the owner reads and writes, the group reads, others get nothing.
- **Octal**: r = 4, w = 2, x = 1 per class, so 755 is `rwxr-xr-x` and 600 is `rw-------`.
- **`chmod`** changes the bits (`chmod 640 f`, `chmod o+r f`, `chmod u+x script.sh`); **`chown user:group f`** changes the owner (root only); **`chgrp`** just the group.
- **Directories**: r lists names, w creates and deletes entries, x lets you enter and reach files inside. Deleting a file needs write permission on the **directory**, not the file.
- **Defaults** come from the `umask`: 022 turns 666 into 644 for new files and 777 into 755 for directories.
- **Special bits**: setuid (run as the file's owner, like `passwd`), setgid on a directory (new files inherit its group), sticky bit (in `/tmp`, only a file's owner can delete it). Root bypasses the ordinary checks.

### deep
#### Intuition

When a process opens a file, the kernel asks one question: which class is this process in? If its user is the owner, only the owner bits count; otherwise, if it is in the file's group, only the group bits; otherwise the "others" bits. Then it checks the one bit the operation needs. Users and groups are just numbers (uid and gid); names come from `/etc/passwd` and `/etc/group`.

#### A session

Run as root on a scratch machine, with two new users and a team group. Dates set with `touch -d` are fixed; the others (and the `/tmp` link count) are this machine's.

```text
$ useradd -m -u 1501 priya
$ useradd -m -u 1502 sam
$ groupadd -g 1600 devs
$ usermod -aG devs priya
$ id priya
uid=1501(priya) gid=1501(priya) groups=1501(priya),1600(devs)
$ id sam
uid=1502(sam) gid=1502(sam) groups=1502(sam)
$ umask
0022
$ touch report.txt
$ ls -l report.txt
-rw-r--r-- 1 root root 0 Sep  1 10:00 report.txt
$ chmod 640 report.txt
$ chown priya:devs report.txt
$ ls -l report.txt
-rw-r----- 1 priya devs 0 Sep  1 10:00 report.txt
$ su priya -c 'cat report.txt && echo priya can read'
priya can read
$ su sam -c 'cat report.txt'
cat: report.txt: Permission denied
$ chmod o+r report.txt
$ su sam -c 'cat report.txt && echo sam can read'
sam can read
$ su sam -c 'echo x >> report.txt'
sh: 1: cannot create report.txt: Permission denied
$ stat -c '%A %a %U:%G %n' report.txt
-rw-r--r-- 644 priya:devs report.txt
```

With 640, priya (the owner) could read, and sam (not in `devs`) fell into "others" with no rights at all. `o+r` gave others read but not write, so sam's append failed. `stat` shows the same bits in both forms: `-rw-r--r--` is 644.

#### Directories, setgid and scripts

```text
$ mkdir shared
$ chown root:devs shared
$ chmod 2770 shared
$ ls -ld shared
drwxrws--- 2 root devs 4096 Sep 26 17:05 shared
$ su priya -c 'touch shared/plan.txt'
$ ls -l shared
total 0
-rw-rw-r-- 1 priya devs 0 Sep 26 17:05 plan.txt
$ su priya -c umask
0002
$ su sam -c 'ls shared'
ls: cannot open directory 'shared': Permission denied
$ printf '#!/bin/sh\necho hello from a script\n' > hello.sh
$ ./hello.sh
bash: ./hello.sh: Permission denied
$ chmod u+x hello.sh
$ ./hello.sh
hello from a script
$ ls -ld /tmp
drwxrwxrwt 95 root root 4096 Sep 26 17:05 /tmp
```

`2770` is setgid (the 2) plus `rwxrwx---`, shown as `rws` in the group triplet. Because of setgid, priya's new file belongs to `devs` rather than to her own group, so the whole team can share it. Her file came out 664 because Ubuntu gives users whose primary group is their own private group a umask of 002 (root's is 022). Sam, outside the group, can't even list the directory. A script needs the execute bit before `./hello.sh` runs it, and `/tmp` shows the sticky bit as the final `t`: everyone may create files there, but only the owner can delete them.

#### Pitfalls

- **`chmod 777`** "fixes" access by giving everyone write access; grant the narrowest bits to the right group instead.
- **A private key or secrets file readable by others**: SSH refuses to use a private key that other users can read; keep it at 600.
- **Directory without x**: `r` alone lets you list names but not open any file inside.
- **Permission changes don't reach open files**: a process that already opened a file keeps its access.
- **Access control lists** (`setfacl`, `getfacl`) add per-user rules beyond the three classes; a `+` after the mode in `ls -l` means one is set.

Connects to: [navigating and managing files](#/concept/eng.linux.navigating-and-managing-files), [kernel mode vs user mode](#/concept/os.fundamentals.kernel-mode-vs-user-mode), [file concepts](#/concept/os.storage.file-concepts), [namespaces and cgroups](#/concept/os.virtualization.namespaces-and-cgroups).

### questions
Q: What does chmod 640 mean?
A: The owner can read and write (6 = 4 + 2), the group can read (4), and others have no permissions (0). ls -l shows it as -rw-r-----.

Q: What do read, write and execute mean on a directory?
A: Read lets you list the names in it, write lets you create, rename and delete entries, and execute lets you enter it and reach the files inside by name. You usually need x together with r or w for them to be useful.

Q: Why can you delete a file you can't write to?
A: Deleting removes a name from a directory, so it needs write and execute permission on the directory, not on the file. The sticky bit, as on /tmp, adds the rule that only the file's owner (or root) may delete it.

Q: What is the umask?
A: A mask of permission bits removed from new files and directories. With umask 022, files are created 644 and directories 755; with 002 the group also gets write access.

Q: What does the setgid bit on a directory do?
A: New files and subdirectories created inside inherit the directory's group instead of the creator's primary group. Combined with group write permission, it makes a shared team directory work.

## eng.linux.processes
name: "Processes"
importance: important
scope: "ps, top, kill, background jobs, signals"

### simple
Every program you run becomes a process with its own number, the PID, and a parent that started it. The shell can run programs in the foreground, where you wait for them, or in the background while you keep typing. Signals are short messages you send to a process, like tapping someone on the shoulder: "please stop", "pause", or, as a last resort, "stop right now".

### interview
- **`ps`** lists processes (`ps aux`, or `ps -o pid,ppid,stat,cmd` for chosen columns); **`top`** refreshes a live view with load average, CPU and memory.
- **Signals**: SIGINT (2, Ctrl-C), SIGTERM (15, the default of `kill`, asks politely), SIGKILL (9, can't be caught or ignored), SIGTSTP (Ctrl-Z, pause), SIGCONT (resume), SIGHUP (terminal closed; many daemons reload their configuration on it).
- **Job control**: `cmd &` runs in the background, `jobs` lists jobs, Ctrl-Z stops the foreground job, `bg` resumes it in the background, `fg` brings it back; `%1` names a job, `$!` is the last background PID.
- **Graceful shutdown**: handle SIGTERM, finish or save the current work, then exit; send SIGKILL only if that fails, since it skips all cleanup.
- **States** in `ps`: R running, S sleeping, D uninterruptible (usually disk), T stopped, Z zombie (exited, not yet reaped by its parent).
- To keep a job running after you log out, use `nohup` or `disown`, or better a service manager such as systemd.

### deep
#### Intuition

A process is a program plus its state: memory, open files, a PID and a parent PID. The shell creates processes with fork and exec (see [fork, exec and wait](#/concept/os.processes.fork-exec-and-wait)), and it is the parent of everything you start. Signals are the kernel's way to interrupt a process asynchronously: each has a default action (terminate, stop, ignore), and a program may install a handler for most of them.

#### A worker that shuts down cleanly

The handler only sets a flag; the main loop notices it, finishes its step and exits normally. Doing real work inside a signal handler is unsafe, because the signal can arrive in the middle of anything, even inside `printf`.

```cpp
// A worker that finishes its current step and exits cleanly on SIGTERM or SIGINT.
volatile sig_atomic_t stopSignal = 0;

int main() {
    struct sigaction sa {};
    sa.sa_handler = [](int sig) { stopSignal = sig; };  // only set a flag in a handler
    sigaction(SIGTERM, &sa, nullptr);
    sigaction(SIGINT, &sa, nullptr);
    printf("worker %d started\n", getpid());
    fflush(stdout);
    int steps = 0;
    while (!stopSignal) {
        usleep(100'000);  // one step of work
        ++steps;
    }
    printf("worker got signal %d (%s), saving and exiting\n", int(stopSignal),
           strsignal(stopSignal));
}
```

#### A recorded terminal session

This is exactly what a terminal showed, typed into an interactive shell. PIDs, times and memory figures are this machine's and will differ on yours.

```text
$ cd /work/proc
$ sleep 300 &
[1] 19739
$ jobs
[1]+  Running                 sleep 300 &
$ sleep 200
^Z
[2]+  Stopped                 sleep 200
$ jobs
[1]-  Running                 sleep 300 &
[2]+  Stopped                 sleep 200
$ bg %2
[2]+ sleep 200 &
$ kill %1 %2
$ jobs
[1]-  Terminated              sleep 300
[2]+  Terminated              sleep 200
$ ./worker &
[1] 19750
$ worker 19750 started

$ ps -o pid,ppid,stat,cmd -p $$,$!
  PID  PPID STAT CMD
19736 19735 S    bash --norc --noprofile -i
19750 19736 S    ./worker
$ kill -TERM $!
$ worker got signal 15 (Terminated), saving and exiting
./worker &
[2] 19761
[1]   Done                    ./worker
$ worker 19761 started

$ kill -KILL $!
$ jobs
[2]+  Killed                  ./worker
$ ./worker
worker 19768 started
^Cworker got signal 2 (Interrupt), saving and exiting
$ echo "exit status $?"
exit status 0
$ top -b -n 1 | head -5
top - 11:37:48 up  1:07,  0 user,  load average: 0.18, 0.51, 0.41
Tasks:  97 total,   1 running,  96 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st 
MiB Mem :  16095.7 total,  11752.7 free,    856.2 used,   3798.3 buff/cache     
MiB Swap:      0.0 total,      0.0 free,      0.0 used.  15239.5 avail Mem 
$ exit
exit
```

Reading it:

- `sleep 300 &` printed the job number and PID. Ctrl-Z (shown as `^Z`) stopped the foreground `sleep 200`, and `bg` resumed it in the background. `kill %1 %2` sent SIGTERM to both jobs, which don't handle it, so they died with "Terminated".
- A background job's output can appear right after the next prompt, as "worker … started" did; the program printed while the shell was already waiting for input.
- `ps` shows the worker's parent is the shell (PPID). STAT `S` means sleeping: the worker spends nearly all its time in `usleep`.
- SIGTERM and Ctrl-C (SIGINT) reached the handler, and the worker saved and exited with status 0. SIGKILL gave it no chance: the shell reported "Killed" and the cleanup line never appeared.
- In `top`, the load average is the number of runnable (and uninterruptible) tasks averaged over 1, 5 and 15 minutes; compare it with the number of CPUs.

#### Pitfalls

- **`kill -9` first**: it leaves temporary files, half-written data and held locks behind. Send SIGTERM, wait, then escalate.
- **Zombies** pile up when a parent never calls `wait`; they hold only a process-table entry, and killing the parent lets init adopt and reap them.
- **Background jobs and the terminal**: a background job that reads from the terminal is stopped; one that writes can clutter your prompt. Redirect its output to a file.

Connects to: [fork, exec and wait](#/concept/os.processes.fork-exec-and-wait), [zombie and orphan processes](#/concept/os.processes.zombie-and-orphan-processes), [process control block and states](#/concept/os.processes.process-control-block-and-states), [shell scripting basics and cron](#/concept/eng.linux.shell-scripting-basics-and-cron).

### questions
Q: What is the difference between SIGTERM and SIGKILL?
A: SIGTERM asks a process to stop and can be caught, so the program can clean up (flush data, release locks) before exiting; it is what kill sends by default. SIGKILL can't be caught or ignored: the kernel ends the process at once, with no cleanup.

Q: How do you move a running command to the background?
A: Press Ctrl-Z to stop it (SIGTSTP), then type bg to resume it in the background. jobs lists the shell's jobs, and fg brings one back to the foreground.

Q: What should a signal handler do?
A: As little as possible: typically set a flag of type volatile sig_atomic_t (or write to a pipe) and return. Most library functions, including printf and malloc, are not safe to call from a handler, so the main loop should notice the flag and do the real work.

Q: What does the load average in top mean?
A: The average number of tasks that were runnable or in uninterruptible sleep over the last 1, 5 and 15 minutes. Compared with the number of CPUs, it tells you whether the machine is keeping up: a load of 8 on 4 cores means tasks are waiting.

Q: What is a zombie process?
A: A process that has exited but whose parent hasn't collected its exit status with wait. It uses no memory or CPU, only a process-table entry; it disappears when the parent waits or when the parent dies and init reaps it.

## eng.linux.text-processing
name: "Text processing"
importance: important
prereqs: [eng.linux.navigating-and-managing-files]
scope: "grep, sed, awk basics, pipes and redirection"

### simple
Much of what you look at on a server is text: logs, configuration files, command output. Small tools each do one job with text, such as finding lines, editing them or adding up a column, and pipes connect them so one tool's output becomes the next one's input. It is like an assembly line where each station makes one small change.

### interview
- **`grep PATTERN file`** prints matching lines: `-c` counts, `-v` inverts, `-i` ignores case, `-E` extended regular expressions, `-o` only the match, `-r` searches a directory.
- **`sed`** edits streams: `s/old/new/` (add `g` for every match on a line), `-n '5,6p'` prints lines 5 and 6, `-i` edits a file in place.
- **`awk`** splits each line into fields `$1`, `$2`, …: `awk '$9 >= 400 {n++} END {print n}'` counts rows, and arrays group sums by key.
- **Pipes** `|` connect programs; the classic "top N" is `cut … | sort | uniq -c | sort -rn | head`.
- **Redirection**: `>` overwrites, `>>` appends, `2>` redirects errors, `2>&1` merges them into standard output, `< file` feeds input, `tee` writes to a file and passes the data on.
- A pipeline's exit status is its last command's unless `set -o pipefail` is on.

### deep
#### Intuition

Every program has three streams: standard input, standard output and standard error. Filters read lines from input and write lines to output, so they can be chained in any order. Pick the smallest tool that does the job: `grep` to select lines, `cut` or `awk` to select columns, `sed` to rewrite text, `sort` and `uniq` to group, `wc` to count.

#### A made-up access log

Twelve lines in the common log format (client address, identity, user, time, request, status, bytes); the addresses come from the ranges reserved for documentation. Fields split on spaces, so the status is `$9` and the size `$10`.

```text
$ wc -l access.log
12 access.log
$ head -2 access.log
203.0.113.7 - - [01/Sep/2026:10:00:01 +0530] "GET /api/items HTTP/1.1" 200 512
198.51.100.23 - - [01/Sep/2026:10:00:02 +0530] "GET /static/app.js HTTP/1.1" 200 20480
$ grep -c '" 200 ' access.log
5
$ grep -E '" 5[0-9]{2} ' access.log
192.0.2.44 - - [01/Sep/2026:10:00:20 +0530] "GET /api/items HTTP/1.1" 500 48
192.0.2.44 - - [01/Sep/2026:10:00:25 +0530] "GET /api/items HTTP/1.1" 503 48
$ grep -v ' /static/' access.log | grep -c GET
5
$ grep -oE '"(GET|POST|PUT|DELETE) ' access.log | sort | uniq -c
      1 "DELETE 
      7 "GET 
      3 "POST 
      1 "PUT 
$ cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -3
      5 203.0.113.7
      3 198.51.100.23
      3 192.0.2.44
$ awk '{print $9}' access.log | sort | uniq -c
      5 200
      1 201
      1 204
      1 304
      1 401
      1 404
      1 500
      1 503
$ awk '$9 >= 400 {bad++} END {printf "%d of %d requests failed\n", bad, NR}' access.log
4 of 12 requests failed
$ awk '{bytes[$1] += $10} END {for (ip in bytes) print bytes[ip], ip}' access.log | sort -rn
20768 198.51.100.23
844 203.0.113.7
594 192.0.2.44
0 203.0.113.9
```

`grep -c '" 200 '` anchors on the quote before the status, so a size of 200 bytes can't match by accident. The `uniq -c` idiom needs sorted input, because `uniq` only merges adjacent duplicates. `awk` keeps state across lines (`bad`, the `bytes` array) and prints in the `END` block; `NR` is the number of lines read. Its `for (ip in bytes)` loop visits keys in no particular order, hence the final `sort`.

#### Editing and redirecting

```text
$ sed -n '5,6p' access.log
203.0.113.7 - - [01/Sep/2026:10:00:12 +0530] "GET /api/orders/17 HTTP/1.1" 404 64
198.51.100.23 - - [01/Sep/2026:10:00:15 +0530] "POST /login HTTP/1.1" 401 32
$ sed -E 's/^([0-9]+\.[0-9]+\.[0-9]+)\.[0-9]+/\1.x/' access.log | head -2
203.0.113.x - - [01/Sep/2026:10:00:01 +0530] "GET /api/items HTTP/1.1" 200 512
198.51.100.x - - [01/Sep/2026:10:00:02 +0530] "GET /static/app.js HTTP/1.1" 200 20480
$ grep ' 500 ' access.log > errors.txt
$ grep ' 503 ' access.log >> errors.txt
$ wc -l errors.txt
2 errors.txt
$ grep x missing.log
grep: missing.log: No such file or directory
$ grep x missing.log 2> /dev/null; echo "exit status $?"
exit status 2
$ grep -c POST access.log | tee post-count.txt
3
$ cat post-count.txt
3
$ false | true; echo "status $?"
status 0
$ set -o pipefail; false | true; echo "status $?"
status 1
```

The `sed` substitution masks the last part of each address, a quick way to share a log without full client addresses. `>` created `errors.txt` and `>>` appended to it. `grep` exits with 0 when it finds a match, 1 when it doesn't and 2 on an error such as a missing file; `2> /dev/null` hid the message but not the status. `false | true` succeeded because only the last command's status counts; with `pipefail`, the failure shows.

#### Pitfalls

- **Quote patterns** in single quotes so the shell doesn't expand `*`, `$` or `!` first.
- **`sed -i` on the wrong file** has no undo; test without `-i`, or use `-i.bak` to keep a copy.
- **Reading and writing one file** in a pipeline (`sort f > f`) empties it, because the shell truncates `f` before `sort` reads it.
- **Fields shift** when a column can contain spaces; count from the end with `$(NF)` or split on a fixed character with `-F`.
- **Regular expression flavors differ**: basic (`grep`, `sed`) versus extended (`grep -E`, `sed -E`, `awk`); `{2}` and `|` need extended syntax or backslashes.

Connects to: [navigating and managing files](#/concept/eng.linux.navigating-and-managing-files), [shell scripting basics and cron](#/concept/eng.linux.shell-scripting-basics-and-cron), [observability](#/concept/sysd.building-blocks.observability), [debugging tools](#/concept/eng.testing.debugging-tools).

### questions
Q: How would you find the three client addresses that made the most requests in an access log?
A: cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -3. Cut takes the first field, sort groups identical addresses, uniq -c counts each group, and the numeric reverse sort puts the busiest first.

Q: What is the difference between > and >>, and what does 2>&1 do?
A: > truncates the file and writes to it, while >> appends. 2>&1 sends standard error to wherever standard output is currently going, so both end up in the same place; the order matters, as in cmd > log 2>&1.

Q: When would you use awk instead of grep?
A: When you need fields or arithmetic: filtering on a column's value, summing a column, or grouping by a key. grep only selects whole lines by pattern.

Q: Why does uniq need sorted input?
A: It only collapses adjacent identical lines. Sorting first brings equal lines together, so uniq -c counts each distinct line once.

Q: What is the exit status of a pipeline, and how can you make failures visible?
A: By default it is the status of the last command, so an earlier failure is hidden. set -o pipefail makes the pipeline fail if any command fails, which scripts should normally turn on.

## eng.linux.networking-commands
name: "Networking commands"
importance: important
scope: "curl, ping, netstat or ss, ssh"

### simple
A handful of commands answer most "is the network working?" questions. `ping` checks whether a machine answers at all, `ss` shows which programs are listening on which ports, `curl` talks to web servers so you can see exactly what they reply, and `ssh` opens a secure shell on another machine. Together they let you check each link in the chain, like testing each bulb in a string of lights.

### interview
- **`ip addr`** and **`ip route`** show your addresses and where packets go by default (`ifconfig` and `route` are the older tools).
- **`ping host`** sends ICMP echo requests and reports round-trip times and loss; a failed ping doesn't prove the host is down, because many networks drop ICMP.
- **`ss -tlnp`** (or the older `netstat -tlnp`) lists TCP (`t`) listening (`l`) sockets with numeric ports (`n`) and the owning process (`p`); `127.0.0.1:8080` accepts only local connections, `0.0.0.0:8080` all interfaces.
- **`curl`**: `-i` shows response headers, `-v` the whole exchange, `-d` sends a body (POST), `-X` sets the method, `-H` adds headers, `-w '%{http_code}'` prints chosen details, `--max-time` bounds the wait. Its exit status separates network errors (7: couldn't connect) from HTTP errors.
- **`ssh user@host cmd`** runs commands remotely over an encrypted connection; key pairs (`ssh-keygen`) replace passwords; `-L` forwards a local port through the connection.
- Debug layer by layer: name resolution (`dig`, `getent hosts`), reachability (`ping`), the port (`ss`, `nc -zv host port`), then the application (`curl -v`).

### deep
#### Intuition

A request to a service crosses several layers, and each command tests one: `ip` your own interface and route, `ping` basic reachability, `ss` whether anything listens on the port, `curl` what the application actually says. Start at the bottom and stop at the first thing that is wrong.

#### A recorded session

Run in a terminal on a scratch machine. Its address, `192.0.2.2`, and gateway, `192.0.2.1`, happen to lie in a range reserved for documentation. The HTTP server is the small notes backend from [client-server architecture](#/concept/eng.web.client-server-architecture), and a local SSH server listens on port 2222 with password logins turned off. Times, PIDs and the key are this machine's.

```text
$ ip -br addr show eth0
eth0             UP             192.0.2.2/24 
$ ip route
default via 192.0.2.1 dev eth0 
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown 
192.0.2.0/24 dev eth0 proto kernel scope link src 192.0.2.2 
$ ping -c 3 192.0.2.1
PING 192.0.2.1 (192.0.2.1) 56(84) bytes of data.
64 bytes from 192.0.2.1: icmp_seq=1 ttl=64 time=0.241 ms
64 bytes from 192.0.2.1: icmp_seq=2 ttl=64 time=0.204 ms
64 bytes from 192.0.2.1: icmp_seq=3 ttl=64 time=0.208 ms

--- 192.0.2.1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2053ms
rtt min/avg/max/mdev = 0.204/0.217/0.241/0.016 ms
$ cd /work/web
$ ./notes 2> /dev/null &
[1] 20344
$ ss -tlnp '( sport = :8080 or sport = :2222 )'
State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess                          
LISTEN 0      16         127.0.0.1:8080      0.0.0.0:*    users:(("notes",pid=20344,fd=3))
LISTEN 0      128        127.0.0.1:2222      0.0.0.0:*    users:(("sshd",pid=20236,fd=3)) 
$ curl -v -d 'check the oven' localhost:8080/notes
* Host localhost:8080 was resolved.
* IPv6: ::1
* IPv4: 127.0.0.1
*   Trying 127.0.0.1:8080...
* Connected to localhost (127.0.0.1) port 8080
> POST /notes HTTP/1.1
> Host: localhost:8080
> User-Agent: curl/8.5.0
> Accept: */*
> Content-Length: 14
> Content-Type: application/x-www-form-urlencoded
> 
< HTTP/1.1 201 Created
< Content-Type: application/json
< Content-Length: 33
< Connection: close
< 
{"id":1,"text":"check the oven"}
* Closing connection
$ curl -s -o /dev/null -w 'status %{http_code} in %{time_total} s\n' localhost:8080/notes
status 200 in 0.000433 s
$ curl -sS localhost:8081/notes; echo "exit status $?"
curl: (7) Failed to connect to localhost port 8081 after 0 ms: Couldn't connect to server
exit status 7
$ mkdir -m 700 -p ~/.ssh
$ ssh-keygen -t ed25519 -N '' -C asha@laptop -f ~/.ssh/id_ed25519 -q
$ cat ~/.ssh/id_ed25519.pub >> /home/priya/.ssh/authorized_keys
$ ssh -p 2222 -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=accept-new priya@localhost 'whoami; pwd'
Warning: Permanently added '[localhost]:2222' (ED25519) to the list of known hosts.
priya
/home/priya
$ ssh -f -N -L 9090:localhost:8080 -p 2222 -i ~/.ssh/id_ed25519 priya@localhost
$ curl -s localhost:9090/notes
[{"id":1,"text":"check the oven"}]
$ ss -tln '( sport = :9090 or sport = :8080 )'
State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
LISTEN 0      16         127.0.0.1:8080      0.0.0.0:*          
LISTEN 0      128        127.0.0.1:9090      0.0.0.0:*          
$ kill %%
$ exit
exit
```

#### Reading it

- The route table sends everything not on a local network to `192.0.2.1`, and ping shows it answering in about 0.2 ms, which is typical inside one data center.
- `ss` confirms two listeners bound to loopback only, with their PIDs; a service you can't reach from another machine is often bound to `127.0.0.1` by mistake.
- `curl -v` marks what it sent with `>` and what it received with `<`. Because of `-d`, it chose POST and a form content type by itself; send JSON with `-H 'Content-Type: application/json'`. Status 201 and the `Content-Length` header come straight from the server.
- A closed port fails fast with exit status 7 ("Couldn't connect"); a firewall that drops packets would instead hang until `--max-time`.
- The first SSH connection recorded the server's host key in `known_hosts`; after that, a changed key triggers a loud warning, since it can mean a man in the middle. Public-key login needed only the public half copied to the server.
- `ssh -L 9090:localhost:8080` made local port 9090 lead, through the encrypted connection, to port 8080 as seen from the server, and `ss` shows the new listener. That is how you reach a database or dashboard that listens only on a server's loopback address.

#### Pitfalls

- `curl` without `-f` exits 0 even for a 404 or 500; add `-f` (or check `%{http_code}`) in scripts.
- `ping localhost` working says nothing about the network outside the machine.
- Leaving `-k` (skip certificate checks) in a script turns off TLS's protection.
- Private keys must stay private: `chmod 600`, and never commit them.

Connects to: [ICMP](#/concept/cn.network.icmp), [ports and sockets](#/concept/cn.transport.ports-and-sockets), [FTP and SSH](#/concept/cn.application.ftp-and-ssh), [DNS](#/concept/cn.application.dns), [processes](#/concept/eng.linux.processes).

### questions
Q: How would you check whether a web service on a remote machine is working?
A: Go layer by layer: resolve the name (dig or getent hosts), check reachability (ping, keeping in mind ICMP may be blocked), check the port is open (nc -zv host port, or ss -tlnp on the machine itself), then make a real request with curl -v and read the status and headers.

Q: What does ss -tlnp show?
A: TCP sockets in the listening state, with numeric addresses and ports and the process that owns each one. It tells you whether a server is running, which port it uses and which interfaces it accepts connections on.

Q: What is the difference between binding to 127.0.0.1 and 0.0.0.0?
A: 127.0.0.1 is the loopback address, so only programs on the same machine can connect. 0.0.0.0 means every interface, so other machines can connect too, subject to firewalls.

Q: How does SSH key authentication work?
A: You keep a private key and put the matching public key in the server's authorized_keys file. When you connect, the server challenges the client to prove it holds the private key, by a signature, without the key ever leaving your machine.

Q: What does ssh -L 9090:localhost:8080 server do?
A: It opens port 9090 on your machine and forwards every connection to it, through the encrypted SSH session, to port 8080 as reached from the server. It lets you use a service that listens only on the server's loopback address.

## eng.linux.shell-scripting-basics-and-cron
name: "Shell scripting basics and cron"
importance: advanced
prereqs: [eng.linux.text-processing]
scope: "Shell scripting basics and cron"

### simple
A shell script is a text file of commands you would otherwise type by hand, saved so you can run them again with one word. Cron is a clock that runs such scripts on a schedule, such as every night at two, without anyone logged in. Together they automate chores like backups and cleanups, the way a timer switch turns the lights on while you are away.

### interview
- **Start with** `#!/usr/bin/env bash` and `set -euo pipefail`: stop on errors (`-e`), on unset variables (`-u`) and on failures inside pipelines.
- **Quote variables** (`"$file"`) so spaces and wildcards in values don't split or expand; `${1:?message}` stops with a message when an argument is missing.
- **Exit status**: 0 means success; `$?` holds the last status; `if`, `&&` and `||` branch on it. Scripts should exit non-zero on failure so callers and cron notice.
- **Command substitution** `$(cmd)` captures output; `$((…))` does arithmetic; `[[ … ]]` tests strings and files.
- **Cron** reads a crontab of lines `minute hour day-of-month month day-of-week command`; `crontab -e` edits yours, `crontab -l` lists it. `0 2 * * *` is 02:00 daily, `*/15 * * * *` every 15 minutes.
- **Cron runs with almost no environment** (a short `PATH` on many systems, no terminal, no `TZ`, your home directory as the working directory): use absolute paths, redirect output to a log, and escape `%` in crontab lines.

### deep
#### Intuition

A script is a program whose statements are commands, so programming habits apply: fail loudly, check inputs, use functions for repeated steps, and log what happened. Cron then removes you from the loop, which means nobody sees the terminal. Everything a scheduled job needs must be in the script or its log.

#### A backup script

```bash
#!/usr/bin/env bash
# Archive a directory into /work/backups and keep only the newest three archives.
set -euo pipefail

src=${1:?usage: backup.sh DIRECTORY}
dest=/work/backups
keep=3

if [[ ! -d $src ]]; then
  echo "not a directory: $src" >&2
  exit 1
fi

mkdir -p "$dest"
name=$(basename "$src")
archive="$dest/$name-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$archive" -C "$(dirname "$src")" "$name"
echo "$(date '+%F %T') saved $archive"

# Newest first; everything after the first $keep lines is old.
ls -1t "$dest/$name"-*.tar.gz | tail -n +$((keep + 1)) | while IFS= read -r old; do
  rm -- "$old"
  echo "removed $old"
done
```

`${1:?…}` makes a missing argument an error with a message. The final pipeline lists archives newest first and removes all but three. It reads names line by line, so it breaks only on names containing a newline, which these never do.

#### Running it by hand

A recorded terminal session; the timestamps are this machine's (in IST).

```text
$ cd /work/cron
$ ./backup.sh
./backup.sh: line 5: 1: usage: backup.sh DIRECTORY
$ echo "exit status $?"
exit status 1
$ ./backup.sh /no/such/dir
not a directory: /no/such/dir
$ echo "exit status $?"
exit status 1
$ ./backup.sh /work/project
2026-09-26 17:15:19 saved /work/backups/project-20260926-171519.tar.gz
$ ./backup.sh /work/project
2026-09-26 17:15:21 saved /work/backups/project-20260926-171521.tar.gz
$ ./backup.sh /work/project
2026-09-26 17:15:23 saved /work/backups/project-20260926-171523.tar.gz
$ ./backup.sh /work/project
2026-09-26 17:15:25 saved /work/backups/project-20260926-171525.tar.gz
removed /work/backups/project-20260926-171519.tar.gz
$ ls /work/backups
project-20260926-171521.tar.gz	project-20260926-171525.tar.gz
project-20260926-171523.tar.gz
$ tar -tzf "$(ls -1t /work/backups/*.tar.gz | head -1)"
project/
project/.env
project/src/
project/src/cart.h
project/src/main.cpp
project/README.md
project/docs/
project/docs/diagram.png
$ exit
exit
```

Both failures exited with status 1, so a caller can tell. After the fourth run, the oldest archive was removed, leaving three.

#### Scheduling it with cron

```text
$ service cron start
 * Starting periodic command scheduler cron
   ...done.
$ crontab -l
no crontab for root
$ crontab - <<'END'
> # m h dom mon dow  command
> * * * * * /work/cron/backup.sh /work/project >> /work/cron/cron.log 2>&1
> * * * * * env > /work/cron/cron-env.txt
> END
$ crontab -l
# m h dom mon dow  command
* * * * * /work/cron/backup.sh /work/project >> /work/cron/cron.log 2>&1
* * * * * env > /work/cron/cron-env.txt
$ date
Sat Sep 26 17:15:58 IST 2026
```

A few minutes later:

```text
$ date
Sat Sep 26 17:19:13 IST 2026
$ cat /work/cron/cron.log
2026-09-26 11:46:01 saved /work/backups/project-20260926-114601.tar.gz
2026-09-26 11:47:01 saved /work/backups/project-20260926-114701.tar.gz
2026-09-26 11:48:01 saved /work/backups/project-20260926-114801.tar.gz
2026-09-26 11:49:01 saved /work/backups/project-20260926-114901.tar.gz
removed /work/backups/project-20260926-114601.tar.gz
$ ls /work/backups
project-20260926-114701.tar.gz	project-20260926-114901.tar.gz
project-20260926-114801.tar.gz
$ cat /work/cron/cron-env.txt
HOME=/root
LOGNAME=root
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
LANG=C.UTF-8
SHELL=/bin/sh
PWD=/root
$ crontab -r
$ crontab -l
no crontab for root
```

The job ran once a minute and the rotation kept three archives. The times in `cron.log` are in UTC while the terminal above showed IST: the terminal had `TZ` set, but a cron job gets only what cron gives it. The second entry captured that environment: no `TERM`, no `TZ`, `/root` as home and working directory, `/bin/sh` as the shell. Ubuntu's cron reads `/etc/environment` through PAM, so `PATH` here is the system default; classic cron gives only `/usr/bin:/bin`, so write full paths either way. Anything a job prints is lost (or mailed) unless redirected, which is why the entry appends to `cron.log` with `2>&1`.

#### Pitfalls

- **Unquoted variables** split on spaces and expand wildcards: `rm $file` with `file="a b"` removes two files.
- **`cd` that fails** under `set -e` stops the script; without it, the next commands run in the wrong directory.
- **Overlapping runs**: a job slower than its interval starts again before finishing; guard it with `flock`.
- **Time zones**: cron uses the system's time zone, and jobs scheduled around daylight-saving changes can run twice or not at all.
- **`%` in a crontab line** is a newline unless escaped as `\%`, so `date +%F` there must be `date +\%F`.
- Beyond a page of logic, a script is often clearer as a small program with tests.

Connects to: [text processing](#/concept/eng.linux.text-processing), [processes](#/concept/eng.linux.processes), [permissions](#/concept/eng.linux.permissions), [CI/CD](#/concept/eng.devops.ci-cd).

### questions
Q: What does set -euo pipefail do at the top of a bash script?
A: -e exits when a command fails, -u treats unset variables as errors, and -o pipefail makes a pipeline fail if any command in it fails, not just the last. Together they stop a script at the first problem instead of carrying on with bad data.

Q: Why should you quote variables in shell scripts?
A: An unquoted variable is split on spaces and its wildcards are expanded, so a file name with a space becomes two arguments and a value like * becomes a list of files. Writing "$var" passes the value through unchanged.

Q: What does the crontab entry 30 2 * * 1-5 mean?
A: Run at 02:30 on every weekday, Monday to Friday. The five fields are minute, hour, day of month, month and day of week, and * means every value.

Q: Why does a script that works in your terminal fail under cron?
A: Cron runs it with a minimal environment: often a short PATH, no terminal, no shell startup files, none of your exported variables and a different working directory. Use absolute paths, set any variables the script needs, and redirect output to a log so you can see the error.

Q: How do you stop a cron job from running twice at the same time?
A: Take a lock at the start, for example by running it through flock -n /tmp/job.lock so a second copy exits immediately while the first holds the lock. Also make the job safe to rerun, since retries happen.
