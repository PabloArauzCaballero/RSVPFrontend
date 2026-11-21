/**
 * B6 · DOne legal texts. DRAFT pending review by a lawyer in Bolivia (P6); not final until that review. Bracketed data is filled in by
 * the controller. Periods follow decision D-5 and are configurable. Bodies: paragraphs separated by a blank line; lines starting with
 * "- " are list items. The Spanish (es-BO) version prevails.
 */
export const legalEnUS = {
  version: "2026-11-21-borrador",
  draftBanner: "Draft pending legal review. This text is not final yet and may change.",
  updated: "Version {{version}}",
  contents: "On this page",
  links: { privacy: "Privacy policy", terms: "Terms of use" },
  privacy: {
    title: "Privacy policy",
    description: "What data DOne processes, why, for how long and how to exercise your rights.",
    lead: "DOne helps you create invitations and know who is coming. To do that it processes data about you and your guests. This page explains which data, why, and what you can do about it.",
    sections: {
      controller: { heading: "Who is responsible", body: "The controller is [Legal name of the controller], with its address at [Address], Bolivia, which operates DOne.\n\nFor any question about your data, write to [privacy e-mail]." },
      data: { heading: "What data we process", body: "About people who create an account:\n- Name, e-mail, password (stored only as an encrypted fingerprint) and the role you choose.\n- The celebrations you create: date, place, texts, photos and settings.\n\nAbout guests, entered by the host or by the guests themselves when they answer:\n- Name and contact (e-mail or phone).\n- Attendance answer and number of companions.\n- Dietary or health notes a guest chooses to write, and the message for the host.\n\nTechnical data: IP address and the security logs needed to protect the service. We do not sell data or use it for advertising." },
      purposes: { heading: "Why we use it", body: "- To create and publish your invitation and manage your account.\n- So your guests can answer and you can see an up-to-date list.\n- To send the messages the service needs (for example, resetting your password or a new answer).\n- To keep the service secure, prevent abuse and meet legal obligations." },
      basis: { heading: "On what basis", body: "We process your account data because we need it to provide the service you ask for, and with your consent, which you give by accepting these texts when you sign up.\n\nDOne processes guests' data on behalf of the host: the host decides whom to invite and must have those people's permission. When guests answer by themselves, they give us their consent in the form, and we record where that consent came from." },
      sharing: { heading: "Who we share it with", body: "- The host of the celebration and the people the host allows to manage it: they see the guests and their answers.\n- Infrastructure providers (servers, e-mail, storage), only to provide the service and under confidentiality.\n- Authorities, when a rule requires it.\n\nIf you ask a provider in the directory for a quote, we send them the data you write in that request." },
      retention: { heading: "How long we keep it", body: "- Your account and celebrations, while the account exists. If you delete it, we delete your celebrations, their guests, photos and history in all our services.\n- Celebrations that have ended are deleted 12 months after the event date.\n- Backups are kept for at most 90 days and then deleted.\n- Security logs are kept for the shortest time needed.\n\nThese are the periods we apply today; they may change after the legal review, and we will say so here." },
      rights: { heading: "Your rights", body: "You can ask to access, correct or delete your data, or withdraw your consent. You can delete your account completely from the app. A guest can ask to delete their answer from their personal link or by writing to us.\n\nTo exercise any right, write to [privacy e-mail]. We will answer within a reasonable time." },
      security: { heading: "How we protect it", body: "Connections are encrypted, and guests' contacts, names and notes are encrypted at rest. Access is limited to those who need it, and we do not record personal data in technical logs." },
      changes: { heading: "Changes", body: "If we change this policy we will publish the new version here with its date and, if the change is significant, let you know before it applies." }
    }
  },
  terms: {
    title: "Terms of use",
    description: "The rules for using DOne: your account, your celebrations and your guests' data.",
    lead: "By creating an account you accept these terms. Take your time: they are short.",
    sections: {
      service: { heading: "The service", body: "DOne lets you create online invitations, collect attendance answers, share a gift list and contact providers. The service is provided by [Legal name of the controller]." },
      account: { heading: "Your account", body: "- Use real data and a password only you know.\n- You are responsible for what is done with your account.\n- You can delete it whenever you want from the app." },
      guests: { heading: "Your guests' data", body: "When you add guests, you decide whom you invite. You commit to having those people's permission to use their name and contact, and to using their answers only to organise your celebration." },
      content: { heading: "Your content", body: "What you publish (texts, photos) remains yours. You allow us to show it to the people you invite and to store it while your account exists. Do not publish third-party content without permission, or illegal or offensive content." },
      acceptableUse: { heading: "Acceptable use", body: "Do not use DOne to send unsolicited messages, impersonate others, try to access other people's accounts or disrupt the service. We may suspend an account that does." },
      providers: { heading: "Providers", body: "Providers in the directory are independent. DOne makes contact easier, but the agreement, payment and service are between you and the provider." },
      liability: { heading: "Liability", body: "We work to keep DOne running, but there may be interruptions. We are liable as the applicable law provides; we are not liable for agreements between hosts, guests and providers." },
      termination: { heading: "End of the service", body: "You can stop using DOne and delete your account at any time. If we stop providing the service, we will tell you in advance so you can download what you need." },
      changes: { heading: "Changes and contact", body: "If we change these terms we will publish the new version with its date and ask you to accept it again when the change affects you. For any question write to [contact e-mail]. These terms are governed by the law of Bolivia." }
    }
  },
  consent: {
    accept: "I accept the Terms of use and the Privacy policy.",
    required: "To create your account you need to accept the terms and the privacy policy.",
    read: "Read the terms and the policy"
  }
} as const;
