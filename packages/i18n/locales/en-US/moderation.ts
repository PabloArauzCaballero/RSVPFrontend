/** Moderation (F7): public report and the administrator queue, detail and preview. */
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
  admin: {
    title: "Reports", intro: "Reports about public invitations. Open one to see the detail and look at hidden files.",
    statuses: { OPEN: "Open", DISMISSED: "Dismissed", ACTIONED: "Decided" }, state: { OPEN: "Open", DISMISSED: "Dismissed", ACTIONED: "Decided" },
    empty: "There are no {{status}} reports.", open: "Open report {{slug}}", back: "Back to reports",
    row: "{{target}} · {{reason}} · {{when}}", target: { page: "The whole invitation", music: "The music", kinds: { SECTION: "A section", BLOCK: "A block", IMAGE: "An image" } }, reference: "Internal reference: {{id}}",
    detailTitle: "Report of {{slug}}", comment: "Reporter's comment", noComment: "No comment.", reporter: "Reporter (anonymous reference): {{ref}}",
    counts: "Open reports for this invitation: {{open}}, from {{reporters}} distinct reporters.", celebrationStatus: "Celebration status: {{status}}",
    celebrationStatuses: { DRAFT: "draft", PUBLISHED: "published", ARCHIVED: "archived", unknown: "not recognised" },
    truncated: "Showing the {{count}} oldest reports. There may be newer ones that this screen does not show yet.",
    takedowns: "Decisions about this invitation", noTakedowns: "Nothing was hidden yet.", takedownLine: "{{scope}} · {{when}} · {{state}}", active: "Hidden", lifted: "Restored",
    audit: "History", auditLine: "{{action}} · {{when}}",
    auditActions: { REPORT_RECEIVED: "Report received", REPORT_DISMISSED: "Report dismissed", ELEMENT_HIDDEN: "Element hidden", PAGE_HIDDEN: "Invitation hidden", APPEAL_FILED: "Appeal filed", APPEAL_ACCEPTED: "Appeal accepted", APPEAL_REJECTED: "Appeal rejected", CONTENT_RESTORED: "Content restored", unknown: "Another action" },
    files: { title: "Hidden files", help: "Files that moderation hides do not show in the invitation. To decide, look at one with a link that works once.", none: "This invitation has no hidden files.", loadFailed: "We could not load the files of this invitation.", fileLine: "{{name}} · {{kind}}", photo: "Photo", music: "Music" },
    preview: {
      cta: "View hidden file", ctaNamed: "View the hidden file {{name}}", loading: "Requesting the link…",
      notice: "This link works once and expires in 5 minutes. Do not copy or share it: the audit records who asked for it and when it was opened.",
      brokenOrUsed: "The file could not be opened. The link works once: request another.",
      again: "Request another link", imageAlt: "File hidden by moderation: {{name}}", audioLabel: "Music hidden by moderation: {{name}}",
      errors: {
        notHidden: "This file shows normally, so there is nothing to preview.", notQuarantined: "The file is still moving to quarantine. Try again in a minute.",
        notFound: "The file no longer exists.", forbidden: "Only administrators can look at hidden files.", generic: "We could not request the link. Try again."
      }
    }
  }
} as const;
