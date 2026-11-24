package ar.uba.fi.cooperar.service.notifications;

import ar.uba.fi.cooperar.domain.notifications.Notification;
import java.util.List;

/** A page of the notifications of an account, with how many it has unread in all. */
public record NotificationPage(List<Notification> items, int page, int size, long total, long unread) {}
