import type { NativeIconRenderer } from "@rsvp/celebration-theme/native";
import { NavIcon } from "@rsvp/ui";

/**
 * The invitation's buttons (gifts, reply) draw the app's one icon set (DESIGN.md: icon + text), in the ink the renderer
 * chose for the button. Shared by the guest's invitation, the host preview and the admin preview so all three match.
 */
export const invitationIcon: NativeIconRenderer = (name, color) => <NavIcon name={name} color={color} size={20} />;
