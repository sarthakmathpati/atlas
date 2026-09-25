---
topic: os.virtualization
name: "Virtualization and containers"
subject: os
order: 10
prereqs: [os.processes]
---

## os.virtualization.virtual-machines-and-hypervisors
name: "Virtual machines and hypervisors"
importance: important
scope: "type 1 vs type 2"

### simple
A virtual machine is a whole pretend computer running as software on a real one, with its own operating system inside. The hypervisor is the landlord that splits one real building into several apartments, each believing it has its own walls, plumbing and front door. Type 1 hypervisors run directly on the hardware, while type 2 hypervisors run as an app on top of a normal operating system.

### interview
- A **virtual machine** emulates a full computer (CPU, memory, disks, network card) so a complete **guest OS** runs unmodified on a **host**.
- The **hypervisor** (virtual machine monitor) multiplexes the hardware among VMs and isolates them.
- **Type 1 (bare metal)**: runs directly on hardware; used in data centres and clouds. Examples: VMware ESXi, Xen, Microsoft Hyper-V, and **KVM** (a Linux kernel module that turns Linux itself into a type 1 hypervisor).
- **Type 2 (hosted)**: an application on a host OS; convenient on desktops, with more overhead. Examples: VirtualBox, VMware Workstation, Parallels.
- Techniques: **trap-and-emulate** (privileged guest instructions trap to the hypervisor), **binary translation** (rewrite problem instructions on the fly), **paravirtualization** (the guest knows it is virtualized and calls the hypervisor directly; virtio drivers), and **hardware-assisted virtualization** (Intel VT-x, AMD-V, with nested page tables EPT/NPT for fast memory translation).
- Benefits: strong isolation, running different OSes, consolidation, snapshots and **live migration** between hosts. Costs: each VM carries a full OS (memory, boot time of seconds to minutes) and some overhead, especially for I/O.

### deep
#### Type 1 vs type 2

```text
   Type 1 (bare metal)         Type 2 (hosted)
+-------+-------+-------+      +-------+-------+
| app   | app   | app   |      | app   | app   |
| guest | guest | guest |      | guest | guest |
|  OS   |  OS   |  OS   |      |  OS   |  OS   | +-----+
+-------+-------+-------+      +-------+-------+ |host |
|      hypervisor       |      |  hypervisor   | |apps |
+-----------------------+      +---------------+-+-----+
|       hardware        |      |        host OS        |
+-----------------------+      +-----------------------+
                               |       hardware        |
                               +-----------------------+
```

| | type 1 | type 2 |
|---|---|---|
| runs on | hardware | a host operating system |
| performance | near native | extra host layer |
| typical use | servers, clouds | developer laptops, testing |
| examples | ESXi, Xen, Hyper-V, KVM | VirtualBox, VMware Workstation, Parallels |

#### How the guest kernel is kept in check

A guest kernel expects to run privileged instructions (loading page tables, disabling interrupts). It must not really do so, or it could take over the machine.

| technique | how | trade-off |
|---|---|---|
| trap-and-emulate | run the guest kernel with reduced privilege; privileged instructions trap and the hypervisor emulates them | classic x86 had instructions that did not trap, so it was not enough alone |
| binary translation | scan guest kernel code and rewrite problem instructions | worked on old x86 (early VMware), complex |
| paravirtualization | modify the guest to call the hypervisor (hypercalls), use virtio devices | fast, but needs guest cooperation |
| hardware assist | VT-x or AMD-V add a guest mode with its own ring 0; EPT or NPT translate guest-physical to host-physical in hardware | the modern default |

#### Worked example: memory translation in a VM

Without nested paging, a guest virtual address needs two translations: guest virtual → guest physical (the guest's page tables) → host physical (the hypervisor's mapping). Hypervisors used to keep "shadow page tables" combining both. With EPT/NPT, the hardware walks both levels itself; a TLB miss becomes more expensive (up to 24 memory references for 4-level tables on each side), which is why VMs benefit so much from huge pages.

#### Code: are we in a VM?

```cpp
#include <fstream>

int main() {
    ifstream cpuinfo("/proc/cpuinfo");
    string line;
    while (getline(cpuinfo, line) && line.rfind("flags", 0) != 0) {}
    istringstream flags(line);
    bool guest = false;
    for (string f; flags >> f;) guest = guest || f == "hypervisor";   // CPUID's hypervisor bit
    cout << (guest ? "running under a hypervisor" : "no hypervisor flag") << "\n";
}
```

Connects to: containers vs VMs, kernel mode vs user mode, multi-level and inverted page tables, TLB.

### questions
Q: What is the difference between a type 1 and a type 2 hypervisor?
A: A type 1 hypervisor runs directly on the hardware and manages guest VMs itself, giving near-native performance; examples are ESXi, Xen, Hyper-V and KVM. A type 2 hypervisor runs as an application on a host operating system, which is convenient on desktops but adds overhead; examples are VirtualBox and VMware Workstation.

Q: What is paravirtualization?
A: A technique where the guest operating system is modified or uses special drivers so it knows it is virtualized and communicates with the hypervisor through explicit calls, instead of having privileged instructions trapped and emulated. It reduces overhead, especially for I/O, as with virtio devices.

Q: How does hardware-assisted virtualization work?
A: CPU extensions such as Intel VT-x and AMD-V add a special guest mode, so a guest kernel can run in its own ring 0 while sensitive operations cause controlled exits to the hypervisor. Nested page tables, EPT or NPT, let the hardware translate guest addresses to host physical addresses without shadow page tables.

Q: What are the benefits of virtual machines?
A: Strong isolation between workloads, the ability to run different operating systems on one machine, server consolidation, snapshots for backup and testing, and live migration of running VMs between physical hosts for maintenance and load balancing.

## os.virtualization.containers-vs-vms
name: "Containers vs VMs"
importance: important
prereqs: [os.virtualization.virtual-machines-and-hypervisors]
scope: "shared kernel, isolation trade-offs"

### simple
A container packages an application with everything it needs and runs it as an isolated group of processes that share the host's operating system kernel. If a virtual machine is a separate house with its own foundations and plumbing, a container is an apartment in one building: private rooms, but shared pipes underneath. Containers start in moments and use little memory, but their walls are thinner.

### interview
- **Containers** virtualize the **operating system**: processes on the host kernel isolated by **namespaces** (what they can see), limited by **cgroups** (what they can use), and hardened with **seccomp**, **capabilities** and LSMs such as AppArmor or SELinux.
- **VMs** virtualize the **hardware**: each has its own kernel on a hypervisor.
- Containers are **lightweight**: images of megabytes, start in milliseconds to seconds, near-native performance, high density. VMs carry a full OS (gigabytes), boot in seconds to minutes and need more memory.
- **Isolation**: VMs are stronger; a container escape through a kernel bug compromises the host because the kernel is **shared**. Multi-tenant platforms often run containers inside VMs, or use sandboxes such as **gVisor** or micro-VMs such as **Firecracker** and **Kata Containers**.
- Containers must use the **host's kernel**: Linux containers need a Linux kernel (Docker Desktop on macOS and Windows runs a small Linux VM).
- Typical choice: containers for packaging and deploying services (with Kubernetes for orchestration); VMs for strong tenant isolation, different OSes or kernel-level customization.

### deep
#### Side by side

| | container | virtual machine |
|---|---|---|
| virtualizes | the OS (process isolation) | the hardware |
| kernel | shared with the host | its own |
| image size | megabytes (app plus libraries) | gigabytes (full OS) |
| start time | milliseconds to seconds | seconds to minutes |
| overhead | near zero for CPU and memory | small CPU overhead, more memory per instance |
| isolation | namespaces, cgroups, seccomp | hardware-enforced by the hypervisor |
| different OS than the host | no (same kernel type) | yes |
| typical tools | Docker, containerd, Podman, Kubernetes | KVM, ESXi, Hyper-V, VirtualBox |

#### Worked example: packing a server

A 64 GB host runs a small web service that needs 300 MB of memory.

| approach | per instance | instances that fit (roughly) |
|---|---|---|
| VMs, each with a 1 GB guest OS | about 1.3 GB | about 45 |
| containers | about 300 MB | about 200 |

The container count ignores safety margins, but the difference is real: containers do not pay for a kernel and OS services per instance. The price is the shared kernel: one kernel bug affects every container.

#### What a container really is

```cpp
#include <fstream>
#include <sys/utsname.h>

int main() {
    // Inside a container these show isolated values; on a plain host they show the host's.
    char ns[64] = {};
    readlink("/proc/self/ns/pid", ns, sizeof ns - 1);
    utsname u{};
    uname(&u);                                       // the hostname comes from the UTS namespace
    string cgroup;
    getline(ifstream("/proc/self/cgroup"), cgroup);  // the control group limiting this process
    cout << "pid namespace: " << ns << "\n";      // e.g. pid:[4026531836]
    cout << "hostname: " << u.nodename << "\ncgroup: " << cgroup << "\n";
}
```

There is no "container" object in the Linux kernel: a container is ordinary processes started with their own namespaces and placed in a cgroup, plus a root file system from an image (layered with overlayfs).

#### Choosing

- Microservices, CI jobs, reproducible developer environments: containers.
- Untrusted multi-tenant code, a different OS, custom kernels, or compliance-driven isolation: VMs or micro-VMs.
- Most clouds combine them: Kubernetes nodes are VMs running many containers.

Connects to: virtual machines and hypervisors, namespaces and cgroups, threads vs processes, microservices.

### questions
Q: What is the key difference between a container and a virtual machine?
A: A container shares the host's operating system kernel and isolates processes with namespaces and cgroups, while a virtual machine runs its own complete operating system with its own kernel on a hypervisor. Containers are lighter and faster to start; VMs offer stronger isolation.

Q: Why are containers less isolated than virtual machines?
A: All containers on a host share one kernel, so a kernel vulnerability or misconfiguration can let a process escape into the host or other containers. A VM's guest kernel is separated from the host by the hypervisor and hardware virtualization, a much smaller and stronger boundary.

Q: Can you run a Windows container on a Linux host?
A: Not natively, because containers use the host's kernel and a Windows container needs a Windows kernel. Tools that appear to do so, such as Docker Desktop running Linux containers on macOS, actually run a lightweight VM with the needed kernel.

Q: When would you choose a VM over a container?
A: When you need strong isolation between untrusted tenants, a different operating system or kernel version than the host, kernel modules or custom kernel settings, or compliance rules that require hardware-level separation.

## os.virtualization.namespaces-and-cgroups
name: "Namespaces and cgroups"
importance: advanced
prereqs: [os.virtualization.containers-vs-vms]
scope: "how containers isolate processes"

### simple
Namespaces and cgroups are the two Linux features that turn ordinary processes into containers. Namespaces decide what a process can see, like blinders that show it only its own files, network and process list. Cgroups decide how much it can use, like a meter that caps its share of CPU and memory.

### interview
- **Namespaces** give a process its own view of a global resource: **pid** (its own process ids, starting at 1), **net** (interfaces, routes, ports), **mnt** (mount points and root file system), **uts** (hostname), **ipc** (System V IPC and POSIX queues), **user** (its own user ids; root inside, unprivileged outside), **cgroup** and **time**.
- **Cgroups** (control groups, v2 is the current unified hierarchy) **limit and account** for resources of a group of processes: `cpu.max` (CPU bandwidth), `memory.max` (a hard limit that triggers the OOM killer inside the group), `io.max`, `pids.max`.
- Created through `clone`/`unshare` flags (`CLONE_NEWPID`, `CLONE_NEWNET`, …) and entered with `setns`; command-line tools: `unshare`, `nsenter`, `ip netns`, `systemd-run`.
- A container runtime (runc, crun) combines namespaces + cgroups + a root file system (overlayfs layers) + **seccomp** filters + dropped **capabilities**.
- PID namespace detail: the container's first process is **PID 1** inside and inherits init's duties (reaping zombies, handling signals).
- Interview line: "namespaces isolate, cgroups limit."

### deep
#### The building blocks

| mechanism | controls | example effect |
|---|---|---|
| pid namespace | which processes are visible | `ps` inside shows only the container's processes, starting at PID 1 |
| net namespace | network stack | its own `eth0`, IP address and port 80 |
| mnt namespace | mounts | its own root file system from the image |
| uts namespace | host name | `hostname` returns the container's name |
| user namespace | user ids | root inside maps to an unprivileged user outside |
| cgroup `cpu.max` | CPU time | "200000 1000000" = at most 0.2 CPU |
| cgroup `memory.max` | memory | exceeding it triggers the OOM killer in that group only |
| cgroup `pids.max` | process count | stops fork bombs |

#### Worked example: building a "container" by hand

```text
# New pid, mount, uts and net namespaces; a fresh /proc so ps sees only the new namespace.
sudo unshare --pid --fork --mount-proc --uts --net bash
hostname demo                  # changes only this namespace's host name
ps aux                         # PID 1 is bash; the host's processes are invisible
ip link                        # only a loopback interface, and it is down

# Limit it with a cgroup (v2), from the host:
sudo mkdir /sys/fs/cgroup/demo
echo "50000 100000" | sudo tee /sys/fs/cgroup/demo/cpu.max     # 50% of one CPU
echo 256M | sudo tee /sys/fs/cgroup/demo/memory.max
echo <pid-of-that-bash> | sudo tee /sys/fs/cgroup/demo/cgroup.procs
```

Add a root file system from an image with a mount namespace and `pivot_root`, drop capabilities and apply a seccomp filter, and you have most of what Docker does.

```cpp
int main() {
    for (string ns : {"pid", "net", "mnt", "uts", "user"}) {
        char target[64] = {};
        readlink(("/proc/self/ns/" + ns).c_str(), target, sizeof target - 1);
        cout << ns << " " << target << "\n";         // the same inode number = the same namespace
    }
}
```

Connects to: containers vs VMs, fork, exec and wait, zombie and orphan processes, Linux essentials for interviews.

### questions
Q: What is the difference between namespaces and cgroups?
A: Namespaces isolate what a process can see: its own process ids, network stack, mounts, host name, IPC objects and user ids. Cgroups limit and account for what a group of processes can use: CPU time, memory, disk I/O and the number of processes. Containers combine both.

Q: Name the main Linux namespaces.
A: pid for process ids, net for network interfaces and ports, mnt for mount points, uts for the host name, ipc for inter-process communication objects, user for user and group ids, plus cgroup and time namespaces.

Q: What happens when a container exceeds its cgroup memory limit?
A: The kernel first tries to reclaim memory within the group, and if it cannot, the OOM killer terminates a process inside that cgroup. Other containers and the host are unaffected, which is how one misbehaving container is prevented from exhausting the machine's memory.
