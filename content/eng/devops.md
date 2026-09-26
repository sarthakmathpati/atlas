---
topic: eng.devops
name: "Cloud and DevOps"
subject: eng
order: 5
prereqs: []
---

## eng.devops.docker-basics
name: "Docker basics"
importance: important
scope: "images, containers, Dockerfiles"

### simple
Docker packages a program together with everything it needs to run, such as libraries and settings, into an image. Running an image gives you a container: an isolated process that behaves the same on your laptop, a test server or the cloud. It is like shipping furniture fully assembled in a crate instead of sending the parts and hoping the other side has the same tools.

### interview
- **Image**: a read-only stack of layers built from a `Dockerfile`; **container**: a running (or stopped) instance of an image with its own writable layer, process tree, network and file system view.
- **Dockerfile basics**: `FROM` (base image), `RUN` (build steps), `COPY`, `WORKDIR`, `USER`, `EXPOSE` (documentation only), `CMD`/`ENTRYPOINT` (what runs). Each instruction adds a cached layer.
- **Cache order**: put rarely changing steps (installing packages) before often changing ones (copying source), so edits rebuild only the last layers.
- **Multi-stage builds**: compile in a big toolchain image, copy only the result into a small runtime image; run as a non-root user.
- **Running**: `docker run -d -p 8080:8080 -v data:/data --name app image:tag`, then `docker ps`, `logs`, `exec`, `stop`, `rm`. Containers are disposable; state belongs in volumes or external databases.
- **Not a VM**: containers share the host's kernel, isolated with namespaces and cgroups, so they start in milliseconds but are a weaker security boundary than virtual machines.

### deep
#### Intuition

"It works on my machine" usually means the other machine has a different library, compiler, configuration or file layout. An image freezes all of that. A container is then just a process the kernel isolates: its own view of files, processes and network, and limits on CPU and memory (see [namespaces and cgroups](#/concept/os.virtualization.namespaces-and-cgroups)).

#### An image for the notes server

The server from [client-server architecture](#/concept/eng.web.client-server-architecture), packaged in two stages:

```dockerfile
# Stage 1: compile with a full toolchain.
FROM ubuntu:24.04 AS build
RUN apt-get update && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY notes.cpp .
# In a container, loopback is the container's own: listen on every interface instead.
RUN sed -i 's/INADDR_LOOPBACK/INADDR_ANY/; s/127.0.0.1:8080/0.0.0.0:8080/' notes.cpp
RUN g++ -std=c++20 -O2 -static -o notes notes.cpp

# Stage 2: ship only the program.
FROM ubuntu:24.04
RUN useradd --system app && mkdir /data && chown app /data
COPY --from=build /src/notes /usr/local/bin/notes
USER app
WORKDIR /data
EXPOSE 8080
CMD ["notes"]
```

#### A real pitfall first

The first build of this file had no `sed` line. It built and ran, but the published port didn't answer:

```text
$ docker build -q -t notes:0.1 .
sha256:b3f9c61d68d20f739c1b5bb26546827c7ed970e35a8667a36fd56b1af6c5af22
$ docker run -d --name notes -p 8080:8080 notes:0.1
c10ed4802f5b29d0ab106317634014a57fb9d565dc962da6ee65fadb29021a2c
$ curl -sS localhost:8080/notes
curl: (56) Recv failure: Connection reset by peer
$ docker exec notes cat /proc/net/tcp
  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode                                                     
   0: 0100007F:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000   999        0 11892 1 000000000a5feece 100 0 0 10 0                     
$ docker rm -f notes
notes
```

Inside the container the server listened on `0100007F:1F90`, which is 127.0.0.1:8080 in the kernel's little-endian hex. That is the container's own loopback: Docker forwards the published port to the container's network interface, where nothing listens. Servers in containers must listen on all interfaces (0.0.0.0), which the `sed` line now arranges.

#### The working image

A recorded session with the fixed file. Image ids, container ids, dates and sizes are this machine's.

```text
$ docker build -q -t notes:1.0 .
sha256:72e0b6a5e5077448a3ba7942a3e152421aeb85876d2a7e5e8bc6ca9b66a95730
$ docker build -q --target build -t notes-build .
sha256:b8a25102c7a487e90c3065f9261a842397e939251d4558c0e718b59343cc5cd3
$ docker images 'notes*' --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}'
REPOSITORY:TAG       SIZE
notes:1.0            121MB
notes-build:latest   461MB
notes:0.1            121MB
$ docker run -d --name notes -p 8080:8080 -v notes-data:/data notes:1.0
a54bea9973e1d4fac8557cec4e2620a27d63fd871382ad63bf3a2df2428420f0
$ docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
NAMES     IMAGE       PORTS
notes     notes:1.0   0.0.0.0:8080->8080/tcp
$ curl -s -d 'shipped in a container' localhost:8080/notes
{"id":1,"text":"shipped in a container"}
$ docker exec notes id
uid=999(app) gid=999(app) groups=999(app)
$ docker exec notes ls -l /data
total 4
-rw-r--r-- 1 app app 25 Sep 26 13:46 notes.db
$ docker rm -f notes
notes
$ docker run -d --name notes -p 8080:8080 -v notes-data:/data notes:1.0
cf8dd877d266bdc28dbf0338b9af1429c3e007d448f8159c08c01d6aeb2efa87
$ curl -s localhost:8080/notes
[{"id":1,"text":"shipped in a container"}]
$ docker logs notes
listening on 0.0.0.0:8080, 1 notes loaded
GET /notes -> 200
$ docker rm -f notes
notes
$ docker history notes:1.0 --format 'table {{.CreatedBy}}\t{{.Size}}' | cut -c1-90
CREATED BY                                      SIZE
CMD ["notes"]                                   0B
EXPOSE [8080/tcp]                               0B
WORKDIR /data                                   4.1kB
USER app                                        0B
COPY /src/notes /usr/local/bin/notes # build…   2.77MB
RUN /bin/sh -c useradd --system app && mkdir…   45.1kB
/bin/sh -c #(nop)  CMD ["/bin/bash"]            0B
/bin/sh -c #(nop) ADD file:43d479b270bbaf479…   87.6MB
/bin/sh -c #(nop)  LABEL org.opencontainers.…   0B
/bin/sh -c #(nop)  ARG LAUNCHPAD_BUILD_ARCH     0B
/bin/sh -c #(nop)  ARG RELEASE                  0B
```

What it shows:

- **Multi-stage pays**: the build stage is 461 MB (compiler included); the shipped image is 121 MB, of which the program is 2.77 MB, statically linked so it needs no libraries from the runtime image.
- **Non-root**: `id` inside the container is the `app` user, so a bug in the server can't write system files in the container.
- **Volumes keep state**: the container was deleted and a new one started, and the note was still there, because `/data` is the named volume `notes-data`, not the container's own layer.
- **Layers**: `docker history` lists each instruction with the size it added; the base image's 87.6 MB layer is shared by every image built on it.

Docker Hub limits anonymous downloads; on this machine the limit was reached during the session, so both stages use the one base image that was already present.

#### Pitfalls

- Secrets in the image (`COPY .env`) stay in its layers even if a later step deletes them; pass them at run time.
- `latest` is just a tag, not "newest"; pin versions or digests in production.
- `EXPOSE` publishes nothing; `-p` does.

Connects to: [containers vs VMs](#/concept/os.virtualization.containers-vs-vms), [Kubernetes overview](#/concept/eng.devops.kubernetes-overview), [CI/CD](#/concept/eng.devops.ci-cd), [ports and sockets](#/concept/cn.transport.ports-and-sockets).

### questions
Q: What is the difference between an image and a container?
A: An image is a read-only template made of layers, built from a Dockerfile. A container is a running instance of an image with its own writable layer, processes and network; you can start many containers from one image.

Q: Why use a multi-stage Dockerfile?
A: The build needs compilers and headers that the running program doesn't. Building in one stage and copying only the result into a small runtime stage gives a much smaller image with fewer packages to patch and attack.

Q: Why must a server in a container listen on 0.0.0.0 rather than 127.0.0.1?
A: Each container has its own network namespace, so 127.0.0.1 inside it is the container's own loopback. Docker forwards published ports to the container's external interface, and a server bound only to loopback never sees those connections.

Q: Where should a containerized application keep its data?
A: Outside the container's writable layer: in a volume, a bind-mounted directory or an external service such as a database. Containers are meant to be replaced at any time, and their own layer disappears with them.

Q: How do you keep Docker builds fast?
A: Order instructions from least to most frequently changing so the layer cache is reused, copy dependency lists before source code, use a .dockerignore to keep the build context small, and use multi-stage builds so the final image stays small.

## eng.devops.ci-cd
name: "CI/CD"
importance: important
scope: "automated builds, tests and deployments"

### simple
Continuous integration means every change is built and tested automatically as soon as it is pushed, so problems show up within minutes instead of weeks. Continuous delivery goes further: every change that passes is packaged and ready to release, and continuous deployment releases it automatically. It is an assembly line with quality checks at each station, where a faulty part stops the line before it reaches a customer.

### interview
- **CI**: on every push and pull request, a server checks out the code, builds it and runs the tests; a red build blocks the merge. Keep it fast (minutes) so people wait for it.
- **Pipeline stages**: build, unit tests, static checks (lint, formatting, sanitizers), integration tests, package an artifact, deploy to staging, smoke tests, deploy to production. Later stages run only if earlier ones pass.
- **Build once, deploy many**: the same artifact (for example a container image tagged with the commit) moves through environments; only configuration differs.
- **Continuous delivery vs deployment**: delivery keeps every green build releasable with a manual approval; deployment releases automatically.
- **Safe releases**: rolling updates, blue-green (switch traffic between two environments), canary (a small share of traffic first, watch metrics), feature flags (ship code dark, turn it on later) and fast rollback.
- **Pipeline hygiene**: pipelines as code in the repository, secrets from the CI system's secret store (never in the repository), reproducible builds with pinned tool versions, and flaky tests fixed, not retried forever.

### deep
#### Intuition

Integration pain grows with the time between merges: two weeks of separate work means two weeks of conflicts and surprises. CI makes merging small and frequent and puts a machine, not memory, in charge of "did we run the tests?". CD applies the same idea to releasing: if every change goes through the same automated path, releasing becomes routine rather than an event.

#### A pipeline as code

A C++ project keeps its whole pipeline in one script, so developers run exactly what the CI server runs. It uses the test program from [unit, integration and end-to-end tests](#/concept/eng.testing.unit-integration-and-end-to-end-tests) as `shop.cpp`:

```bash
#!/usr/bin/env bash
# The pipeline: each step must pass before the next one runs.
set -euo pipefail
step() { echo "== $*"; }

step "build, with warnings as errors"
g++ -std=c++20 -O2 -Wall -Wextra -Werror -o shop shop.cpp

step "tests"
./shop

step "tests under AddressSanitizer and UBSan"
g++ -std=c++20 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=all \
    -o shop-asan shop.cpp
./shop-asan > /dev/null

step "package"
tar -czf "shop-$(git rev-parse --short HEAD).tar.gz" shop
ls shop-*.tar.gz
```

A hosted CI service calls it on every push to `main` and every pull request. For GitHub Actions the workflow file, `.github/workflows/ci.yml`, would be:

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build-and-test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v5
      - name: Build, test and package
        run: ./ci.sh
      - uses: actions/upload-artifact@v4
        with:
          name: shop
          path: shop-*.tar.gz
```

GitHub Actions can't run inside this scratch machine, so the workflow wasn't executed here. The script it calls was, in a small repository with fixed commit dates (timings are this machine's):

```text
$ ./ci.sh; echo "pipeline exit status $?"
== build, with warnings as errors
== tests
unit             5.3 us
integration     76.5 us
end to end    5415.8 us
8 passed, 0 failed
== tests under AddressSanitizer and UBSan
== package
shop-db7e8c1.tar.gz
pipeline exit status 0
$ sed -i 's/sum >= 1000/sum > 1000/' shop.cpp
$ git commit -qam "Tweak the coupon rule"
$ ./ci.sh; echo "pipeline exit status $?"
== build, with warnings as errors
== tests
FAIL line 60: the coupon takes 10% off
FAIL line 61: the coupon applies at exactly 10.00
unit            18.4 us
integration    107.1 us
FAIL line 76: the coupon works from the command line
end to end    8013.3 us
5 passed, 3 failed
pipeline exit status 1
```

The first run passed every stage and produced an artifact named after the commit, so any deployment can be traced to its source. The second commit changed one character of the coupon rule; the tests failed, `set -e` stopped the pipeline before packaging, and the non-zero status is what makes a CI service mark the commit red and block the pull request.

#### From artifact to production

- **Staging first**: deploy the artifact to an environment like production and run smoke tests against it.
- **Roll out gradually**: a canary sends, say, 5% of traffic to the new version while error rates and latency are compared with the old one; any regression rolls back automatically.
- **Keep releases reversible**: backward-compatible database migrations (add columns before using them, remove only after no code needs them) and feature flags let you roll back code without losing data.

Connects to: [collaboration workflow](#/concept/eng.git.collaboration-workflow), [Docker basics](#/concept/eng.devops.docker-basics), [topological sort](#/concept/dsa.graph-basics.topological-sort) (pipelines run dependent jobs in order), [SLAs, SLOs and SLIs](#/concept/sysd.reliability.slas-slos-and-slis).

### questions
Q: What is the difference between continuous integration, continuous delivery and continuous deployment?
A: Continuous integration builds and tests every change automatically as it is merged. Continuous delivery also packages every passing change so it can be released at any time, usually with a manual approval. Continuous deployment releases every passing change to production automatically.

Q: What stages would a CI pipeline for a C++ service have?
A: Build with warnings as errors, run unit tests, run static analysis and sanitizer builds, run integration tests, package an artifact such as a container image tagged with the commit, then deploy to staging and run smoke tests. Each stage runs only if the previous one passed.

Q: What is a canary deployment?
A: Releasing the new version to a small share of servers or users first, comparing its error rates and latency with the old version, and expanding only if it behaves. A regression affects few users and can be rolled back quickly.

Q: Why build the artifact once and promote it, instead of rebuilding for each environment?
A: Rebuilding can produce a different binary (new dependency versions, different flags), so what you tested would not be what you ship. Promoting one artifact through staging to production guarantees they are identical; only the configuration changes.

Q: How do you handle secrets in a CI/CD pipeline?
A: Store them in the CI system's secret store or a vault, inject them as environment variables only into the jobs that need them, mask them in logs, and never commit them to the repository or bake them into images.

## eng.devops.cloud-service-models
name: "Cloud service models"
importance: important
needsReview: true
scope: "IaaS, PaaS, SaaS; common AWS services map"

### simple
Cloud providers rent you computing at different levels of "done for you". With infrastructure as a service you rent virtual machines and manage everything on them; with platform as a service you hand over your code and the provider runs it; with software as a service you just use a finished application. It is like choosing between renting an empty flat, a furnished one, or a hotel room.

### interview
- **IaaS** (virtual machines, disks, networks): you manage the operating system, patches, runtime and application; most control, most work.
- **PaaS** (app platforms, managed databases): you manage the code and data; the provider runs servers, scaling and patching.
- **FaaS or serverless functions**: you upload functions that run per event and are billed per request and run time; nothing runs (or costs) while idle, at the price of cold starts and time limits.
- **SaaS** (email, office suites, CRM): you only configure and use the product.
- **Shared responsibility**: the provider secures the physical data centers, hardware and virtualization; you always secure your identities, permissions, data and configuration, plus the OS on IaaS.
- **Cost and resilience basics**: pay-as-you-go versus committed discounts versus spot capacity that can be taken back; data leaving the cloud (egress) is billed; spread across availability zones for failures and regions for disasters.

### deep
#### Intuition

Every service model draws a line: above it you manage, below it the provider does. Moving the line up (IaaS → PaaS → FaaS → SaaS) trades control for less work and faster starts. The right choice depends on how special your needs are: a stock web app fits a platform; a latency-critical trading engine may need tuned virtual machines or dedicated hardware.

| layer | IaaS | PaaS | FaaS | SaaS |
|---|---|---|---|---|
| application and data | you | you | you (functions) | provider (you configure) |
| runtime, scaling | you | provider | provider | provider |
| operating system, patches | you | provider | provider | provider |
| servers, network, buildings | provider | provider | provider | provider |

#### A general map of common services

Provider product names change often (Google's Cloud Functions became Cloud Run functions in 2024; Azure Active Directory became Microsoft Entra ID in 2023), so check each provider's current documentation before relying on a name.

| need | AWS | Google Cloud | Azure |
|---|---|---|---|
| virtual machines | EC2 | Compute Engine | Virtual Machines |
| object storage | S3 | Cloud Storage | Blob Storage |
| managed relational database | RDS, Aurora | Cloud SQL | Azure SQL Database |
| key-value and document store | DynamoDB | Firestore, Bigtable | Cosmos DB |
| managed cache | ElastiCache | Memorystore | Azure Cache for Redis |
| serverless functions | Lambda | Cloud Run functions | Azure Functions |
| managed Kubernetes | EKS | GKE | AKS |
| queues and pub/sub | SQS, SNS | Pub/Sub | Service Bus |
| content delivery | CloudFront | Cloud CDN | Front Door |
| DNS | Route 53 | Cloud DNS | Azure DNS |
| data warehouse | Redshift | BigQuery | Synapse Analytics, Fabric |
| identity and access | IAM | Cloud IAM | Entra ID |
| monitoring and logs | CloudWatch | Cloud Monitoring, Logging | Azure Monitor |

#### Always-on or per request?

Prices here are made up; real ones vary by provider, region, size and month, so treat only the shape as general. A small VM costs the same whether it is busy or idle, while functions cost per request:

```cpp
// Made-up prices, only to show the shape: a VM costs the same every hour; functions cost
// per request. Where do they cross?
int main() {
    const double vmPerHour = 0.05, hoursPerMonth = 730;  // one small always-on VM
    const double perMillionRequests = 2.0;               // functions: requests plus compute
    double vm = vmPerHour * hoursPerMonth;
    printf("%14s %12s %12s\n", "requests/s", "VM", "functions");
    for (double rps : {0.1, 1.0, 5.0, 10.0, 50.0}) {
        double millions = rps * 3600 * hoursPerMonth / 1e6;
        printf("%14.1f %12.2f %12.2f\n", rps, vm, millions * perMillionRequests);
    }
    double breakEven = vm / perMillionRequests * 1e6 / (3600 * hoursPerMonth);
    printf("break-even at %.2f requests per second (%.2f million a month)\n", breakEven,
           vm / perMillionRequests);
}
```

Output:

```text
    requests/s           VM    functions
           0.1        36.50         0.53
           1.0        36.50         5.26
           5.0        36.50        26.28
          10.0        36.50        52.56
          50.0        36.50       262.80
break-even at 6.94 requests per second (18.25 million a month)
```

Below about 7 requests a second on average, functions are cheaper because idle time is free; above it, the always-on machine wins, and the gap widens with traffic. Real decisions also weigh cold-start latency, execution time limits, operations work (patching the VM) and whether traffic comes in bursts.

Connects to: [Docker basics](#/concept/eng.devops.docker-basics), [Kubernetes overview](#/concept/eng.devops.kubernetes-overview), [serverless](#/concept/sysd.architecture.serverless), [object storage and blobs](#/concept/sysd.data.object-storage-and-blobs), [virtual machines and hypervisors](#/concept/os.virtualization.virtual-machines-and-hypervisors).

### questions
Q: What is the difference between IaaS, PaaS and SaaS?
A: IaaS rents virtual machines, storage and networks, and you manage everything from the operating system up. PaaS runs your code on a managed platform, so you manage only the application and data. SaaS is a finished application you use and configure.

Q: What is the shared responsibility model?
A: The provider is responsible for the security of the cloud: data centers, hardware, the network and virtualization. The customer is responsible for security in the cloud: identities and permissions, data, network rules and, on IaaS, the operating system and software.

Q: When are serverless functions a good fit, and when not?
A: They suit bursty or low, uneven traffic and event-driven work, since you pay nothing while idle and scaling is automatic. They fit poorly for steady high load, long-running or latency-critical work (cold starts, time limits) and workloads that need special hardware or tuning.

Q: What is the difference between an availability zone and a region?
A: A region is a geographic area with its own set of data centers; an availability zone is one or more isolated data centers within a region. Spreading across zones survives a data center failure; spreading across regions survives a regional outage at the cost of latency and data transfer.

Q: Name the AWS services you would use for a simple web application.
A: For example EC2 or a container service for the application, an Elastic Load Balancer in front, RDS for the relational database, S3 for files, CloudFront as the CDN, Route 53 for DNS and CloudWatch for monitoring. Names and options change, so confirm against current documentation.

## eng.devops.kubernetes-overview
name: "Kubernetes overview"
importance: advanced
prereqs: [eng.devops.docker-basics]
scope: "pods, services, deployments"

### simple
Kubernetes runs containers across a group of machines for you. You describe what you want, such as "three copies of this image, reachable under one name", and Kubernetes keeps making it true: it starts containers, restarts crashed ones, replaces machines that die and spreads traffic among the copies. It works like a thermostat, which keeps comparing the room with the setting and correcting the difference.

### interview
- **Cluster**: a control plane (API server, etcd as its database, scheduler, controllers) and worker nodes (kubelet, a container runtime, kube-proxy).
- **Pod**: the smallest unit, one or more containers sharing an IP address and volumes; pods are disposable and get new IPs when replaced.
- **Deployment**: declares a pod template and a replica count; it manages ReplicaSets to keep that many pods running and performs rolling updates and rollbacks.
- **Service**: a stable name and virtual IP that load-balances to the ready pods selected by labels (`ClusterIP` inside the cluster, `NodePort` or `LoadBalancer` from outside; Ingress or Gateway for HTTP routing).
- **Declarative and reconciled**: you `kubectl apply` desired state; controllers loop, comparing actual with desired and acting on the difference.
- **Health and resources**: readiness probes decide who gets traffic, liveness probes restart stuck containers; requests reserve CPU and memory for scheduling, limits cap them. Configuration comes from ConfigMaps and Secrets, durable data from persistent volumes.

### deep
#### Intuition

Docker answers "how do I run this container on one machine?". Kubernetes answers "how do I keep N copies running on many machines, update them without downtime and route traffic to the healthy ones?". Everything is an object in the API with a desired state, and controllers keep reality converging on it.

#### No cluster in this session

A real cluster couldn't run in this scratch machine. The attempt used kind (Kubernetes in Docker): its node container started, but inside it the container runtime couldn't start the control plane's containers (`runc create failed: unable to start container process: can't get final child's PID from pipe`), because this virtual machine doesn't support containers nested inside containers. So nothing below claims output from a cluster. What did run: the `kubectl` client, which can generate manifests offline, and kubeconform, which validates manifests against the published Kubernetes schemas.

```text
$ kubectl version --client
Client Version: v1.31.4
Kustomize Version: v5.4.2
$ kubectl create deployment notes --image=notes:1.0 --replicas=3 --port=8080 --dry-run=client -o yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: notes
  name: notes
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notes
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: notes
    spec:
      containers:
      - image: notes:1.0
        name: notes
        ports:
        - containerPort: 8080
        resources: {}
status: {}
```

That is the skeleton `kubectl create` writes. A fuller manifest for the notes server image from [Docker basics](#/concept/eng.devops.docker-basics), with probes, resources and a Service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notes
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notes
  strategy:
    rollingUpdate: {maxUnavailable: 0, maxSurge: 1}  # replace pods one at a time
  template:
    metadata:
      labels:
        app: notes
    spec:
      containers:
        - name: notes
          image: notes:1.0
          ports:
            - containerPort: 8080
          readinessProbe:            # receive traffic only once this succeeds
            httpGet: {path: /notes, port: 8080}
            periodSeconds: 5
          livenessProbe:             # restart the container if this keeps failing
            tcpSocket: {port: 8080}
            periodSeconds: 10
          resources:
            requests: {cpu: 100m, memory: 32Mi}
            limits: {memory: 64Mi}
---
apiVersion: v1
kind: Service
metadata:
  name: notes
spec:
  selector:
    app: notes                       # every ready pod with this label gets traffic
  ports:
    - port: 80
      targetPort: 8080
```

```text
$ kubeconform -summary -kubernetes-version 1.31.4 notes.yaml
Summary: 2 resources found in 1 file - Valid: 2, Invalid: 0, Errors: 0, Skipped: 0
$ sed 's/replicas: 3/replicas: three/' notes.yaml > broken.yaml
$ kubeconform -summary -kubernetes-version 1.31.4 broken.yaml | grep -oE 'Deployment notes is invalid|expected [a-z ]+, but got [a-z]+|Summary.*'
Deployment notes is invalid
expected integer or null, but got string
Summary: 2 resources found in 1 file - Valid: 1, Invalid: 1, Errors: 0, Skipped: 0
```

The schema check accepted both objects and rejected a replica count written as a word.

#### What `kubectl apply -f notes.yaml` would do

1. The API server validates both objects and stores them in etcd.
2. The Deployment controller creates a ReplicaSet, which creates three pods from the template.
3. The scheduler picks a node for each pod with room for its 100m CPU and 32 MiB requests.
4. Each node's kubelet pulls `notes:1.0` and starts the container; once `GET /notes` succeeds, the pod is marked ready.
5. The Service's endpoints list the ready pods' IPs, and traffic to `notes:80` inside the cluster is spread across them.
6. Changing the image to `notes:1.1` and applying again starts a rolling update: one new pod at a time (`maxSurge: 1`), and an old one is removed only after a new one is ready (`maxUnavailable: 0`).

#### A design problem it would expose

This server keeps notes in a file inside its own container. With three replicas, each pod would have its own `notes.db`, so a note saved through one pod would be missing from the others, and it would vanish when that pod is replaced. Kubernetes assumes [stateless services](#/concept/sysd.scalability.stateless-services): the notes belong in a shared database (or a StatefulSet with persistent volumes, for software designed for it).

Connects to: [Docker basics](#/concept/eng.devops.docker-basics), [containers vs VMs](#/concept/os.virtualization.containers-vs-vms), [load balancing](#/concept/sysd.scalability.load-balancing), [service mesh](#/concept/sysd.architecture.service-mesh), [autoscaling](#/concept/sysd.scalability.autoscaling).

### questions
Q: What is the difference between a pod, a deployment and a service?
A: A pod is one or more containers scheduled together with a shared IP. A deployment keeps a desired number of identical pods running and rolls out new versions. A service gives those pods one stable name and virtual IP and load-balances across the ready ones.

Q: What does declarative configuration mean in Kubernetes?
A: You describe the desired state, such as three replicas of an image, instead of issuing steps. Controllers continuously compare the actual state with it and act on differences, so crashed pods are replaced and lost nodes are compensated without anyone running commands.

Q: What is the difference between a readiness probe and a liveness probe?
A: A failing readiness probe removes the pod from service endpoints but leaves it running, for example while it warms up. A failing liveness probe makes the kubelet restart the container, for a process that is stuck.

Q: How does a rolling update avoid downtime?
A: New pods are started gradually and old ones removed only when new ones pass their readiness probes, within limits such as maxSurge and maxUnavailable. If the new version never becomes ready, the rollout stalls and can be rolled back.

Q: Why do stateful applications need special care in Kubernetes?
A: Pods are disposable and replicas are interchangeable, so local files are lost or diverge between copies. State belongs in external databases, or in StatefulSets with stable identities and persistent volumes for software built to run that way.
