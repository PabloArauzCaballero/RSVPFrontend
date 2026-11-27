/** Moderation (F7): public report, host notice and appeal, administrator queue and preview. */
export const moderationEnUS = {
  reasons: {
    SEXUAL_CONTENT: "Sexual content", VIOLENCE_OR_HATE: "Violence or hate", SCAM_OR_IMPERSONATION: "Scam or impersonation", COPYRIGHT: "Copyright",
    PERSONAL_DATA: "Personal data", SPAM: "Spam", OTHER: "Another reason"
  },
  report: {
    open: "Report this invitation", openMusic: "Report the music", openMusicDescribed: "Report the music of this invitation",
    titlePage: "Report this invitation", titleMusic: "Report the music",
    introPage: "Tell us what is wrong with this invitation. A moderator reviews every report. We do not ask for your details and we do not store your address.",
    introMusic: "Tell us what is wrong with the music of this invitation. Only the music is reviewed: the invitation and its photos stay visible meanwhile. We do not ask for your details and we do not store your address.",
    reasonPlaceholder: "Choose a reason", reason: "Reason", comment: "Comment", commentOptional: "optional", commentRequiredHint: "required with this reason", commentHelp: "Plain text, up to {{max}} characters.",
    counter: "{{count}} of {{max}}", send: "Send report", sending: "Sending…", cancel: "Cancel", close: "Close",
    doneTitle: "We received your report", doneBody: "Thank you for letting us know. A moderator will review it.",
    errors: {
      reasonRequired: "Choose a reason.", commentRequired: "With this reason, tell us what is wrong in the comment.", commentTooLong: "The comment can have up to {{max}} characters.",
      invalidText: "The comment has characters we cannot accept. Remove unusual symbols and try again.",
      notFound: "This invitation is no longer available, so there is nothing to report.", elementGone: "This invitation no longer has that music.",
      tooMany: "Too many reports were sent from your connection. Try again in {{minutes}} min.", tooManyLater: "Too many reports were sent from your connection. Try again later.",
      offline: "We could not send the report. Check your connection and try again. Your text is still here.", generic: "We could not send the report. Try again. Your text is still here."
    }
  },
  host: {
    title: "Moderation", intro: "Here you see what a moderator hid from your invitation, why, and how to fix it.", loadFailed: "We could not load the moderation of this invitation.",
    emptyTitle: "Nothing is hidden", emptyBody: "Your invitation shows in full. If a moderator hides something, you will see it here and we will email you.",
    hiddenBadge: "Hidden by moderation", historyTitle: "Earlier decisions", activeTitle: "Hidden now",
    scope: { PAGE: "The whole invitation", MUSIC: "Only the music", ELEMENT: "One element of the invitation" },
    effect: {
      PAGE: "For now nobody can see your invitation.", MUSIC: "Only the music is hidden. Your invitation and its photos still show, without that music.",
      ELEMENT: "That element is not shown to your guests. The rest of your invitation stays visible."
    },
    element: "Element: {{element}}", reason: "Reason: {{reason}}", guidance: "How to fix it: {{guidance}}", noGuidance: "The moderator left no guidance. You can ask support.",
    hiddenOn: "Hidden on {{when}}", restoredOn: "Restored on {{when}}",
    stillHidden: "Fixing the content and publishing again does not lift the hiding: only an administrator lifts it, by accepting your appeal or by restoring it.",
    restored: "This content shows again.",
    appeal: {
      cta: "Appeal this decision", title: "Appeal the decision", help: "You can appeal once per decision. Explain why you think it was a mistake. An administrator reviews it.",
      label: "Your message", counter: "{{count}} of {{max}}", send: "Send appeal", sending: "Sending…", cancel: "Cancel", sent: "We sent your appeal. An administrator will review it and we will email you.",
      status: { PENDING: "Appeal under review", ACCEPTED: "Appeal accepted", REJECTED: "Appeal rejected" },
      yours: "Your appeal: {{message}}", decisionNote: "Administrator's note: {{note}}", decidedOn: "Decided on {{when}}",
      rejectedFinal: "You cannot appeal this decision again.", unavailable: "This decision can no longer be appealed.",
      errors: {
        empty: "Write your message.", tooLong: "The message can have up to {{max}} characters.", used: "You already appealed this decision. Reload to see its status.", notActive: "This content is no longer hidden. Reload to see it.",
        readOnly: "Only the hosts of the invitation can appeal.", generic: "We could not send the appeal. Try again. Your message is still here."
      }
    },
    publish: { hiddenTitle: "Your invitation is hidden by moderation", hiddenBody: "Publishing it again does not show it. See the reason and how to appeal.", open: "See moderation" }
  },
  admin: {
    title: "Reports", intro: "Reports about public invitations. Open one to see the detail and look at hidden files.",
    statuses: { OPEN: "Open", DISMISSED: "Dismissed", ACTIONED: "Decided" }, state: { OPEN: "Open", DISMISSED: "Dismissed", ACTIONED: "Decided" },
    empty: "There are no {{status}} reports.", open: "Open report {{slug}}", back: "Back to reports",
    row: "{{slug}} · {{reason}} · {{when}}", target: { page: "The whole invitation", element: "Element {{kind}} {{id}}", music: "The music" },
    detailTitle: "Report of {{slug}}", comment: "Reporter's comment", noComment: "No comment.", reporter: "Reporter (anonymous reference): {{ref}}",
    counts: "{{open}} open reports from {{reporters}} different reporters for this invitation.", celebrationStatus: "Celebration status: {{status}}",
    takedowns: "Decisions about this invitation", noTakedowns: "Nothing was hidden yet.", takedownLine: "{{scope}} · {{when}} · {{state}}", active: "Hidden", lifted: "Restored",
    audit: "History", auditLine: "{{action}} · {{when}}",
    auditActions: { REPORT_RECEIVED: "Report received", REPORT_DISMISSED: "Report dismissed", ELEMENT_HIDDEN: "Element hidden", PAGE_HIDDEN: "Invitation hidden", APPEAL_FILED: "Appeal filed", APPEAL_ACCEPTED: "Appeal accepted", APPEAL_REJECTED: "Appeal rejected" },
    files: { title: "Hidden files", help: "Files that moderation hides do not show in the invitation. To decide, look at one with a link that works once.", none: "This invitation has no hidden files.", loadFailed: "We could not load the files of this invitation.", fileLine: "{{name}} · {{kind}}", photo: "Photo", music: "Music" },
    preview: {
      cta: "View hidden file", ctaNamed: "View the hidden file {{name}}", title: "Preview of a hidden file", loading: "Requesting the link…",
      notice: "This link works once and expires in 5 minutes. Do not copy or share it: the audit records who asked for it and when it was opened.",
      used: "The link was already used. To look at the file again, request another.", expired: "The link expired. Request another to look at the file.", brokenOrUsed: "The file could not be opened. The link works once: request another.",
      again: "Request another link", close: "Close preview", imageAlt: "File hidden by moderation: {{name}}", audioLabel: "Music hidden by moderation: {{name}}",
      errors: {
        notHidden: "This file shows normally, so there is nothing to preview.", notQuarantined: "The file is still moving to quarantine. Try again in a minute.",
        notFound: "The file no longer exists.", forbidden: "Only administrators can look at hidden files.", generic: "We could not request the link. Try again."
      }
    }
  }
} as const;
