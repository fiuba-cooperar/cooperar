package ar.uba.fi.cooperar.domain.notifications;

/** What a notification is about. The front words each one. */
public enum NotificationType {
    /** The observatory approved a registration request: the organization exists now. */
    REGISTRATION_APPROVED,
    /** The observatory rejected a registration request. */
    REGISTRATION_REJECTED,
    /** The observatory asked for changes in a registration request. */
    REGISTRATION_CHANGES_REQUESTED,
    /** A visitor sent an inquiry to an organization the account manages. */
    INQUIRY_RECEIVED
}
