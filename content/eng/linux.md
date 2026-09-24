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

## eng.linux.permissions
name: "Permissions"
importance: must
prereqs: [eng.linux.navigating-and-managing-files]
scope: "chmod, chown, users and groups"

## eng.linux.processes
name: "Processes"
importance: important
scope: "ps, top, kill, background jobs, signals"

## eng.linux.text-processing
name: "Text processing"
importance: important
prereqs: [eng.linux.navigating-and-managing-files]
scope: "grep, sed, awk basics, pipes and redirection"

## eng.linux.networking-commands
name: "Networking commands"
importance: important
scope: "curl, ping, netstat or ss, ssh"

## eng.linux.shell-scripting-basics-and-cron
name: "Shell scripting basics and cron"
importance: advanced
prereqs: [eng.linux.text-processing]
scope: "Shell scripting basics and cron"
