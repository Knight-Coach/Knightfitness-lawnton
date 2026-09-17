# Working in this repo

## Watching pull requests

**Don't poll a PR that's only waiting on a human.** GitHub webhooks already
wake the session for comments, reviews, CI results, pushes, ready-for-review
and merges, and in practice they arrive within seconds. A scheduled check-in
on top of that finds nothing, every time, and costs Claude usage for no
information.

Once a PR is green, mergeable, and has no open thread needing a reply, **stop
scheduling check-ins and end the turn.** The webhook is the wake signal.

Keep a check-in scheduled only while something is genuinely in flight and
could change without a webhook firing:

- CI is mid-run, or a check has been pending an unreasonably long time
- there's a merge conflict still to resolve
- a fix was pushed and hasn't been confirmed landed
- a blocker was reported and is still unresolved

Cancel it as soon as that condition clears. Never re-arm a check-in merely
because the PR is still open.

**Don't send "no change" messages.** If a check does run and nothing has
moved, stay silent. Only speak up when something actually happened or
something is needed from Mark.

Act immediately on webhook events as normal — this section is about polling,
not about responsiveness.

### When you do read PR state

`pull_request_read` returns the full PR description even when `fields` omits
`body`, so repeated state checks are much heavier than they look. One more
reason to check on a signal rather than on a timer.
