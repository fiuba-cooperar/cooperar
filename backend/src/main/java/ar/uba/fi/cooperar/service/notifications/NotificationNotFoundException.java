package ar.uba.fi.cooperar.service.notifications;

public class NotificationNotFoundException extends RuntimeException {

    public NotificationNotFoundException() {
        super("The notification does not exist");
    }
}
