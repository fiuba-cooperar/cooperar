package ar.uba.fi.cooperar.service.notifications;

/** A plain-text email to a single recipient. */
public record EmailMessage(String to, String subject, String body) {}
